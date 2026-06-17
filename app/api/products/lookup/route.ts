import { NextResponse } from "next/server";
import { lookupBarcodeFromWeb } from "@/server/products/barcode-lookup-service";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const barcode = searchParams.get("barcode");

    if (!barcode) {
        return NextResponse.json({ error: "Barcode required" }, { status: 400 });
    }

    try {
        const result = await lookupBarcodeFromWeb(barcode);

        if (!result.found) {
            return NextResponse.json({
                found: false,
                message: "Product not found in public barcode databases.",
                sources: result.sources,
            });
        }

        return NextResponse.json({
            found: true,
            data: {
                name: result.name,
                description: result.description ?? "",
                brand: result.brand ?? "",
                category: result.category ?? "",
                imageUrl: result.imageUrl,
                barcode: result.barcode,
                unit: result.unit,
            },
            sources: result.sources,
        });
    } catch (error) {
        console.error("Barcode lookup error:", error);
        return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
    }
}
