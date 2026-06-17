import { type NextRequest, NextResponse } from "next/server";
import { listCatalogShops } from "@/server/catalog/master-catalog-service";
import {
    gatePlatform,
    parsePagination,
} from "@/server/catalog/platform-route-utils";

export const dynamic = "force-dynamic";

/** GET — all VentraPOS shop names with product counts. Query: `q` (shop name search). */
export async function GET(req: NextRequest) {
    const gate = await gatePlatform(req);
    if (!gate.ok) return gate.response;

    const { searchParams } = new URL(req.url);
    const { limit, offset } = parsePagination(searchParams);

    const result = await listCatalogShops({
        q: searchParams.get("q") ?? undefined,
        plan: (searchParams.get("plan") as "starter" | "growth" | "pro" | null) ?? undefined,
        status: (searchParams.get("status") as "active" | "suspended" | "deactivated" | null) ?? undefined,
        subscriptionStatus:
            (searchParams.get("subscriptionStatus") as "active" | "past_due" | "canceled" | null) ??
            undefined,
        sort: (searchParams.get("sort") as "name" | "created" | "period_end" | null) ?? undefined,
        order: (searchParams.get("order") as "asc" | "desc" | null) ?? undefined,
        limit,
        offset,
    });

    return NextResponse.json(result);
}
