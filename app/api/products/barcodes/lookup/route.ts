import { NextResponse } from "next/server";
import { requireUserAuthFromContext } from "@/server/auth/api-request-auth";
import { getActiveBranchIdFromContext } from "@/server/auth/get-branch-id";
import { lookupBarcodeLabel } from "@/server/products/barcode-label-service";

export async function GET(request: Request) {
    try {
        const auth = await requireUserAuthFromContext();
        if (auth instanceof NextResponse) return auth;
        const { payload } = auth;

        const { searchParams } = new URL(request.url);
        const sku = searchParams.get("sku")?.trim();
        if (!sku) {
            return NextResponse.json({ error: "SKU required" }, { status: 400 });
        }

        const branchId = await getActiveBranchIdFromContext();
        const label = await lookupBarcodeLabel(payload.bid, sku, branchId);

        if (!label) {
            return NextResponse.json({
                found: false,
                message: "No Ventra barcode label found for this code.",
            });
        }

        return NextResponse.json({
            found: true,
            data: {
                name: label.labelName,
                description: label.labelDescription,
                imageUrl: label.imageSrc,
                sku: label.sku,
                productId: label.productId,
            },
        });
    } catch (error) {
        console.error("GET /api/products/barcodes/lookup failed:", error);
        return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
    }
}
