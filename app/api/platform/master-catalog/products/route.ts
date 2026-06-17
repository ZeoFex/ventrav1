import { type NextRequest, NextResponse } from "next/server";
import {
    createMasterProduct,
    listMasterProducts,
} from "@/server/catalog/master-catalog-service";
import {
    badRequest,
    gatePlatform,
    parsePagination,
} from "@/server/catalog/platform-route-utils";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    const gate = await gatePlatform(req);
    if (!gate.ok) return gate.response;

    const { searchParams } = new URL(req.url);
    const { limit, offset } = parsePagination(searchParams);

    const result = await listMasterProducts({
        limit,
        offset,
        shopType: searchParams.get("shopType") ?? undefined,
        categoryName: searchParams.get("category") ?? undefined,
        q: searchParams.get("q") ?? undefined,
        sort: (searchParams.get("sort") as "name" | "updated" | "created") ?? "name",
        order: (searchParams.get("order") as "asc" | "desc") ?? "asc",
    });

    return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
    const gate = await gatePlatform(req);
    if (!gate.ok) return gate.response;

    const body = await req.json();
    if (!body?.name || typeof body.name !== "string") {
        return badRequest("name is required");
    }
    if (!body?.shopType || typeof body.shopType !== "string") {
        return badRequest("shopType is required");
    }

    try {
        const row = await createMasterProduct({
            name: body.name,
            shopType: body.shopType,
            categoryName: body.categoryName ?? body.category ?? null,
            description: body.description ?? null,
            imageSrc: body.imageSrc ?? null,
            unit: body.unit ?? null,
            sku: body.sku ?? null,
            sourceProductId: body.sourceProductId ?? null,
            sourceBusinessId: body.sourceBusinessId ?? null,
        });
        return NextResponse.json(row, { status: 201 });
    } catch (e) {
        console.error("[POST master-catalog/products]", e);
        return NextResponse.json({ error: "Failed to create product" }, { status: 500 });
    }
}
