import { NextResponse } from "next/server";
import { requireUserAuth } from "@/server/auth/api-request-auth";
import { deleteBarcodeLabel } from "@/server/products/barcode-label-service";

export async function DELETE(
    req: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const auth = await requireUserAuth(req);
        if (auth instanceof NextResponse) return auth;
        const { payload } = auth;
        const { id } = await params;

        const deleted = await deleteBarcodeLabel(id, payload.bid);
        if (!deleted) {
            return NextResponse.json({ error: "Barcode label not found" }, { status: 404 });
        }

        return NextResponse.json({ message: "Deleted" });
    } catch (error) {
        console.error("DELETE /api/products/barcodes/[id] failed:", error);
        return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
    }
}
