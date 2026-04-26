import { type NextRequest, NextResponse } from "next/server";
import { parsePlatformListRequest } from "@/server/platform/platform-list";
import { getPlatformStatsCounts } from "@/server/platform/stats-snapshot";

export const dynamic = "force-dynamic";

/**
 * Cross-tenant row counts for dashboards. Optional `businessId` filters where applicable.
 */
export async function GET(req: NextRequest) {
    const g = parsePlatformListRequest(req);
    if (!g.ok) {
        return g.response;
    }
    const { businessId } = g.params;
    const data = await getPlatformStatsCounts(businessId);
    return NextResponse.json(data);
}
