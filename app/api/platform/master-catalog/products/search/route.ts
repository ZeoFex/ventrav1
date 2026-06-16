import { type NextRequest, NextResponse } from "next/server";
import { searchMasterProducts } from "@/server/catalog/master-catalog-service";
import { gatePlatform } from "@/server/catalog/platform-route-utils";

export const dynamic = "force-dynamic";

/** GET — fast global product search / suggestions. */
export async function GET(req: NextRequest) {
    const gate = await gatePlatform(req);
    if (!gate.ok) return gate.response;

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") ?? "";
    const limit = Math.min(
        50,
        Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10) || 20)
    );

    const items = await searchMasterProducts(q, limit);
    return NextResponse.json({ items, total: items.length, q });
}
