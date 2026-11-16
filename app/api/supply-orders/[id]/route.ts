import { NextResponse } from "next/server";
import { hasMinRole, requireUserAuthFromContext } from "@/server/auth/api-request-auth";
import { deleteSupplyOrder, getSupplyOrderDetail } from "@/server/suppliers/supply-service";

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const auth = await requireUserAuthFromContext();
        if (auth instanceof NextResponse) return auth;
        const { payload } = auth;
        if (!hasMinRole(payload, "manager")) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        const { id } = await params;
        const detail = await getSupplyOrderDetail(payload.bid, id);
        if (!detail) return NextResponse.json({ error: "Not found" }, { status: 404 });
        return NextResponse.json(detail);
    } catch (e) {
        console.error("GET /api/supply-orders/[id]", e);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function DELETE(
    _req: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const auth = await requireUserAuthFromContext();
        if (auth instanceof NextResponse) return auth;
        const { payload } = auth;
        if (!hasMinRole(payload, "manager")) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        const { id } = await params;
        const ok = await deleteSupplyOrder(payload.bid, id);
        if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
        return NextResponse.json({ success: true });
    } catch (e) {
        console.error("DELETE /api/supply-orders/[id]", e);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
