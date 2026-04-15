import { NextResponse } from "next/server";
import { getPublicReceiptVerification } from "@/server/receipt/public-receipt-verify";

/**
 * Public: verify a sale by UUID (same ID encoded in receipt QR).
 * No authentication — the opaque UUID is the capability to view this receipt summary.
 */
export async function GET(
    _req: Request,
    context: { params: Promise<{ saleId: string }> },
) {
    const { saleId } = await context.params;
    const data = await getPublicReceiptVerification(saleId);
    if (!data) {
        return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
    }
    return NextResponse.json(data);
}
