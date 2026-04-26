import { NextResponse } from "next/server";
import { requireUserAuth } from "@/server/auth/api-request-auth";
import { getActiveBranchIdFromContext } from "@/server/auth/get-branch-id";
import { completeCheckout, type CheckoutInput } from "@/server/pos/pos-service";

/**
 * POST /api/pos/checkout
 * Processes a POS transaction: deducts stock + records the sale.
 * Branch is auto-read from cookie — employees cannot switch branches at POS.
 */
export async function POST(req: Request) {
    try {
        const auth = await requireUserAuth(req);
        if (auth instanceof NextResponse) return auth;
        const { payload } = auth;
        const branchId = await getActiveBranchIdFromContext();
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
