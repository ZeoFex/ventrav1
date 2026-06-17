import { type NextRequest, NextResponse } from "next/server";
import { getCatalogHierarchy } from "@/server/catalog/master-catalog-service";
import { gatePlatform } from "@/server/catalog/platform-route-utils";

export const dynamic = "force-dynamic";

/** GET — Shop Type → Category → Products tree with counts. */
export async function GET(req: NextRequest) {
    const gate = await gatePlatform(req);
    if (!gate.ok) return gate.response;

    const { searchParams } = new URL(req.url);
    const hierarchy = await getCatalogHierarchy({
        shopType: searchParams.get("shopType") ?? undefined,
        q: searchParams.get("q") ?? undefined,
        limitPerCategory: Math.min(
            500,
            Math.max(1, parseInt(searchParams.get("limitPerCategory") ?? "200", 10) || 200)
        ),
    });

    return NextResponse.json({ hierarchy });
}
