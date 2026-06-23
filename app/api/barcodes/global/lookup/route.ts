import { NextResponse } from "next/server";
import { requireUserAuthFromContext } from "@/server/auth/api-request-auth";
import { lookupGlobalBarcode } from "@/server/products/global-barcode-catalog-service";

export async function GET(req: Request) {
    try {
        const auth = await requireUserAuthFromContext();
        if (auth instanceof NextResponse) return auth;

        const barcode = new URL(req.url).searchParams.get("barcode")?.trim();
        if (!barcode) {
            return NextResponse.json({ error: "barcode query required" }, { status: 400 });
        }

        const entry = await lookupGlobalBarcode(barcode);
        if (!entry) {
            return NextResponse.json({ found: false, barcode }, { status: 404 });
        }

        return NextResponse.json({
            found: true,
            barcode: entry.barcode,
            productName: entry.productName,
            description: entry.description,
            imageSrc: entry.imageSrc,
            unit: entry.unit,
            sourceBusinessName: entry.sourceBusinessName,
            updatedAt: entry.updatedAt,
        });
    } catch (error) {
        console.error("GET /api/barcodes/global/lookup failed:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
