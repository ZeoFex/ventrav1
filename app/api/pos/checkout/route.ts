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
    } catch (error: unknown) {
        console.error("POST /api/pos/checkout failed:", error);
        const msg = error instanceof Error ? error.message : "Checkout failed";
        const clientError =
            msg.includes("Customer required") ||
            msg.includes("exceed") ||
            msg.includes("Invalid") ||
            msg.includes("positive") ||
            msg.includes("Payments");
        return NextResponse.json(
            { error: msg },
            { status: clientError ? 400 : 500 },
        );
    }
}
