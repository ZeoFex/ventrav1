import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { parsePlatformListRequest } from "@/server/platform/platform-list";
import { listStorefrontProducts } from "@/server/platform/platform-storefront";

export const dynamic = "force-dynamic";

const uuidParam = z.string().uuid();

/**
 * GET /api/platform/storefront/products
 * Admin-only marketplace catalog: live shop products with prices and images.
 */
export async function GET(req: NextRequest) {
    const g = await parsePlatformListRequest(req);
    if (!g.ok) return g.response;

    const { searchParams } = new URL(req.url);
    const shopId = searchParams.get("shopId")?.trim() || "";
    const shopType = searchParams.get("shopType")?.trim() || "";
    const category = searchParams.get("category")?.trim() || "";
    const q = searchParams.get("q")?.trim() || "";

    try {
        const result = await listStorefrontProducts({
            limit: Math.min(g.params.limit, 48),
            offset: g.params.offset,
            q: q || undefined,
            shopId: shopId && uuidParam.safeParse(shopId).success ? shopId : undefined,
            shopType: shopType || undefined,
            category: category || undefined,
        });
        return NextResponse.json(result);
    } catch (err) {
        console.error("[storefront/products]", err);
        return NextResponse.json(
            { error: err instanceof Error ? err.message : "Failed to load storefront" },
            { status: 500 },
        );
    }
}
