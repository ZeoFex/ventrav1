import { type NextRequest, NextResponse } from "next/server";
import { lookupBarcodeForCatalog } from "@/server/catalog/catalog-barcode-lookup";
import { badRequest, gatePlatform } from "@/server/catalog/platform-route-utils";

export const dynamic = "force-dynamic";

/**
 * GET — master catalog first, then multi-API web lookup (name + image prioritized).
 */
export async function GET(req: NextRequest) {
    const gate = await gatePlatform(req);
    if (!gate.ok) return gate.response;

    const barcode = new URL(req.url).searchParams.get("barcode")?.trim();
    if (!barcode) return badRequest("barcode is required");

    const result = await lookupBarcodeForCatalog(barcode);
    return NextResponse.json(result);
}
