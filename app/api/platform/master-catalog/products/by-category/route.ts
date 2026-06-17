import { type NextRequest, NextResponse } from "next/server";
import { listMasterProducts } from "@/server/catalog/master-catalog-service";
import {
    badRequest,
    gatePlatform,
    parsePagination,
} from "@/server/catalog/platform-route-utils";

export const dynamic = "force-dynamic";

/** GET — products filtered by shop type + category name. */
export async function GET(req: NextRequest) {
    const gate = await gatePlatform(req);
    if (!gate.ok) return gate.response;

    const { searchParams } = new URL(req.url);
    const shopType = searchParams.get("shopType");
    const category = searchParams.get("category");
    if (!shopType) return badRequest("shopType is required");
    if (!category) return badRequest("category is required");

    const { limit, offset } = parsePagination(searchParams);
    const result = await listMasterProducts({
        limit,
        offset,
        shopType,
        categoryName: category,
        q: searchParams.get("q") ?? undefined,
        sort: (searchParams.get("sort") as "name" | "updated" | "created") ?? "name",
        order: (searchParams.get("order") as "asc" | "desc") ?? "asc",
    });

    return NextResponse.json(result);
}
