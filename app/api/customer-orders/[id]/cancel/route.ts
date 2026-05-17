import { NextResponse } from "next/server";
import { requireUserAuth } from "@/server/auth/api-request-auth";
import { getActiveBranchIdFromContext } from "@/server/auth/get-branch-id";
import { cancelCustomerOrder } from "@/server/customer-orders/customer-order-service";

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

        await cancelCustomerOrder(payload.bid, branchId, orderId);
        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : "Cancel failed";
        const client = msg.includes("not found") || msg.includes("cannot");
        console.error("POST /api/customer-orders/.../cancel failed:", error);
        return NextResponse.json({ error: msg }, { status: client ? 400 : 500 });
    }
}
