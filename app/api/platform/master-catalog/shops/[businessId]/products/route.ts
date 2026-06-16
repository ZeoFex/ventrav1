import { type NextRequest, NextResponse } from "next/server";
import { listShopProducts } from "@/server/catalog/master-catalog-service";
import { addProductToShopAndMasterCatalog } from "@/server/catalog/platform-shop-product-service";
import {
    badRequest,
    gatePlatform,
    parsePagination,
} from "@/server/catalog/platform-route-utils";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ businessId: string }> };

/** GET — all products for one shop (images, barcodes, categories). */
export async function GET(req: NextRequest, { params }: Ctx) {
    const gate = await gatePlatform(req);
    if (!gate.ok) return gate.response;

    const { businessId } = await params;
    if (!businessId) return badRequest("businessId is required");

    const { searchParams } = new URL(req.url);
    const { limit, offset } = parsePagination(searchParams);

    const result = await listShopProducts(businessId, {
        limit,
        offset,
        q: searchParams.get("q") ?? undefined,
        sort: (searchParams.get("sort") as "name" | "updated" | "created") ?? "name",
        order: (searchParams.get("order") as "asc" | "desc") ?? "asc",
    });

    if (!result.shop) {
        return NextResponse.json({ error: "Shop not found" }, { status: 404 });
    }

    return NextResponse.json(result);
}

/** POST — add product to shop inventory + master catalog (platform admin). */
export async function POST(req: NextRequest, { params }: Ctx) {
    const gate = await gatePlatform(req);
    if (!gate.ok) return gate.response;

    const { businessId } = await params;
    if (!businessId) return badRequest("businessId is required");

    let body: Record<string, unknown>;
    try {
        body = await req.json();
    } catch {
        return badRequest("Invalid JSON body");
    }

    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) return badRequest("name is required");

    const priceGhs =
        typeof body.priceGhs === "string" || typeof body.priceGhs === "number"
            ? String(body.priceGhs)
            : "0";

    try {
        const result = await addProductToShopAndMasterCatalog(businessId, {
            name,
            sku: typeof body.sku === "string" ? body.sku : null,
            barcode: typeof body.barcode === "string" ? body.barcode : null,
            description: typeof body.description === "string" ? body.description : null,
            imageSrc: typeof body.imageSrc === "string" ? body.imageSrc : null,
            priceGhs,
            costPriceGhs:
                typeof body.costPriceGhs === "string" ? body.costPriceGhs : null,
            stock: typeof body.stock === "number" ? body.stock : Number(body.stock) || 0,
            unit: typeof body.unit === "string" ? body.unit : "piece",
            categoryName:
                typeof body.categoryName === "string" ? body.categoryName : null,
        });
        return NextResponse.json({ success: true, ...result }, { status: 201 });
    } catch (e) {
        const message = e instanceof Error ? e.message : "Failed to add product";
        return NextResponse.json({ error: message }, { status: 400 });
    }
}
