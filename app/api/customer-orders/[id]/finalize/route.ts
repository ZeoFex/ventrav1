import { NextResponse } from "next/server";
import { requireUserAuth } from "@/server/auth/api-request-auth";
import { getActiveBranchIdFromContext } from "@/server/auth/get-branch-id";
import { finalizeCustomerOrder } from "@/server/customer-orders/customer-order-service";

export async function POST(
    req: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const auth = await requireUserAuth(req);
        if (auth instanceof NextResponse) return auth;
        const { payload } = auth;
        const branchId = await getActiveBranchIdFromContext();
        const { id: orderId } = await params;

        const result = await finalizeCustomerOrder(
            payload.bid,
            branchId,
            payload.sub ?? null,
            orderId,
        );
        return NextResponse.json({ success: true, saleId: result.saleId });
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : "Finalize failed";
        const client =
            msg.includes("paid") ||
            msg.includes("balance") ||
            msg.includes("not found") ||
            msg.includes("mismatch");
        console.error("POST /api/customer-orders/.../finalize failed:", error);
        return NextResponse.json({ error: msg }, { status: client ? 400 : 500 });
    }
}
