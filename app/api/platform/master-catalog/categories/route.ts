import { type NextRequest, NextResponse } from "next/server";
import {
    createMasterCategory,
    listMasterCategories,
} from "@/server/catalog/master-catalog-service";
import {
    badRequest,
    gatePlatform,
} from "@/server/catalog/platform-route-utils";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    const gate = await gatePlatform(req);
    if (!gate.ok) return gate.response;

    const shopType = new URL(req.url).searchParams.get("shopType") ?? undefined;
    const items = await listMasterCategories(shopType);
    return NextResponse.json({ items, total: items.length });
}

export async function POST(req: NextRequest) {
    const gate = await gatePlatform(req);
    if (!gate.ok) return gate.response;

    const body = await req.json();
    if (!body?.shopType) return badRequest("shopType is required");
    if (!body?.name) return badRequest("name is required");

    const row = await createMasterCategory({
        shopType: body.shopType,
        name: body.name,
        description: body.description ?? null,
    });

    if (!row) {
        return NextResponse.json({ error: "Failed to create category" }, { status: 500 });
    }
    return NextResponse.json(row, { status: 201 });
}
