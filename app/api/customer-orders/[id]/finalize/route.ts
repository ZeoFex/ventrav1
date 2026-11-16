import { NextResponse } from "next/server";
import { requireUserAuth } from "@/server/auth/api-request-auth";
import { getActiveBranchIdFromContext } from "@/server/auth/get-branch-id";
import { finalizeCustomerOrder } from "@/server/customer-orders/customer-order-service";
import { logShopActivity } from "@/server/platform/shop-activity-log";

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
        void logShopActivity({
            req,
            userId: payload.sub,
            businessId: payload.bid,
            action: "shop.customer_order.finalized",
            resource: "customer_order",
            resourceId: orderId,
            detail: "Order collected as a sale",
            metadata: { saleId: result.saleId },
        });
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
