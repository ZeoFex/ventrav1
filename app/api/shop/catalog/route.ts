import { NextResponse } from "next/server";
import { listShopCatalog } from "@/server/shop/shop-catalog";

export async function GET() {
    try {
        const catalog = await listShopCatalog();
        return NextResponse.json(catalog, {
            headers: { "Cache-Control": "no-store" },
        });
    } catch (error) {
        console.error("GET /api/shop/catalog failed:", error);
        return NextResponse.json({ error: "Could not load the shop" }, { status: 500 });
    }
}
