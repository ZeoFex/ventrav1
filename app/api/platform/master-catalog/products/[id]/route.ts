import { type NextRequest, NextResponse } from "next/server";
import {
    deleteMasterProduct,
    getMasterProductById,
    updateMasterProduct,
} from "@/server/catalog/master-catalog-service";
import { gatePlatform } from "@/server/catalog/platform-route-utils";
import { logPlatformActivity } from "@/server/platform/platform-activity-log";
import { PLATFORM_ACTIONS } from "@/server/platform/platform-activity-labels";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Ctx) {
    const gate = await gatePlatform(req);
    if (!gate.ok) return gate.response;

    const { id } = await params;
    const row = await getMasterProductById(id);
    if (!row) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(row);
}

export async function PUT(req: NextRequest, { params }: Ctx) {
    const gate = await gatePlatform(req);
    if (!gate.ok) return gate.response;

    const { id } = await params;
    const body = await req.json();

    const row = await updateMasterProduct(id, {
        name: body.name,
        shopType: body.shopType,
        categoryName: body.categoryName ?? body.category,
        description: body.description,
        imageSrc: body.imageSrc,
        unit: body.unit,
        sku: body.sku,
        barcode: body.barcode,
        sourceBusinessName: body.sourceBusinessName,
        sourceProductId: body.sourceProductId,
        sourceBusinessId: body.sourceBusinessId,
    });

    if (!row) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    await logPlatformActivity(req, {
        action: PLATFORM_ACTIONS.CATALOG_PRODUCT_UPDATED,
        resource: "product",
        resourceId: id,
        metadata: { productName: row.name, shopType: row.shopType },
    });
    return NextResponse.json(row);
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
    const gate = await gatePlatform(req);
    if (!gate.ok) return gate.response;

    const { id } = await params;
    const existing = await getMasterProductById(id);
    const ok = await deleteMasterProduct(id);
    if (!ok) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    await logPlatformActivity(req, {
        action: PLATFORM_ACTIONS.CATALOG_PRODUCT_DELETED,
        resource: "product",
        resourceId: id,
        metadata: { productName: existing?.name ?? null },
    });
    return NextResponse.json({ success: true });
}
