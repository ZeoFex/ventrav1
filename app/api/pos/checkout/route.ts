import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/server/auth/token-service";
import { COOKIE_NAMES } from "@/server/config/auth-config";
import { completeCheckout, type CheckoutInput } from "@/server/pos/pos-service";
import { getActiveBranchId } from "@/server/auth/get-branch-id";

/**
 * POST /api/pos/checkout
 * Processes a POS transaction: deducts stock + records the sale.
 * Branch is auto-read from cookie — employees cannot switch branches at POS.
 */
export async function POST(req: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get(COOKIE_NAMES.ACCESS)?.value;

        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const payload = await verifyAccessToken(token);
        const branchId = getActiveBranchId(cookieStore);
        const body = await req.json() as CheckoutInput;

        if (!body.lines || !Array.isArray(body.lines) || body.lines.length === 0) {
            return NextResponse.json({ error: "Empty or invalid cart" }, { status: 400 });
        }

        const result = await completeCheckout(payload.bid, body, branchId, payload.sub);

        return NextResponse.json({ success: true, saleId: result.saleId });
    } catch (error) {
        console.error("POST /api/pos/checkout failed:", error);
        return NextResponse.json({ error: "Checkout failed" }, { status: 500 });
    }
}
