import { type NextRequest, NextResponse } from "next/server";
import { getShopTypesWithCounts } from "@/server/catalog/master-catalog-service";
import { gatePlatform } from "@/server/catalog/platform-route-utils";

export const dynamic = "force-dynamic";

/** GET — all shop types with product counts (canonical + DB-discovered). */
export async function GET(req: NextRequest) {
    const gate = await gatePlatform(req);
    if (!gate.ok) return gate.response;

    const items = await getShopTypesWithCounts();
    return NextResponse.json({ items, total: items.length });
}
