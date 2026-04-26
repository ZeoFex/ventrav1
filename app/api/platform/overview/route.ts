import { type NextRequest, NextResponse } from "next/server";
import { parsePlatformListRequest } from "@/server/platform/platform-list";
import { getPlatformStatsCounts } from "@/server/platform/stats-snapshot";
import { getPlatformBillingSummary } from "@/server/platform/billing-snapshot";

export const dynamic = "force-dynamic";

/**
 * One round-trip: table counts + billing aggregates for a superadmin dashboard.
 * Optional `?businessId=` scopes both payloads where each module supports it.
 */
export async function GET(req: NextRequest) {
    const g = parsePlatformListRequest(req);
    if (!g.ok) {
        return g.response;
    }
    const { businessId } = g.params;
    const [stats, billing] = await Promise.all([
        getPlatformStatsCounts(businessId),
        getPlatformBillingSummary(businessId),
    ]);
    return NextResponse.json({
        generatedAt: new Date().toISOString(),
        filter: businessId ? { businessId } : null,
        counts: stats.counts,
        billing,
    });
}
