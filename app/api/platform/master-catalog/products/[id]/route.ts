import { type NextRequest, NextResponse } from "next/server";
import {
    deleteMasterProduct,
    getMasterProductById,
    updateMasterProduct,
} from "@/server/catalog/master-catalog-service";
import { gatePlatform } from "@/server/catalog/platform-route-utils";

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
    return NextResponse.json(row);
}

export async function DELETE(req: NextRequest, { params }: Ctx) {
    const gate = await gatePlatform(req);
    if (!gate.ok) return gate.response;

    const { id } = await params;
    const ok = await deleteMasterProduct(id);
    if (!ok) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
}
