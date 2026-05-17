import { NextResponse } from "next/server";
import { requireUserAuth } from "@/server/auth/api-request-auth";
import { getCustomerOrderDetail } from "@/server/customer-orders/customer-order-service";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const auth = await requireUserAuth(req);
        if (auth instanceof NextResponse) return auth;
        const { payload } = auth;
        const { id } = await params;
        const detail = await getCustomerOrderDetail(payload.bid, id);
        if (!detail) {
            return NextResponse.json({ error: "Order not found" }, { status: 404 });
        }
        return NextResponse.json(detail);
    } catch (e) {
        console.error("GET /api/customer-orders/[id] failed:", e);
        return NextResponse.json({ error: "Failed to load order" }, { status: 500 });
    }
}
