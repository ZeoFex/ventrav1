import { NextResponse } from "next/server";
import { requireUserAuthFromContext } from "@/server/auth/api-request-auth";
import { getActiveBranchIdFromContext } from "@/server/auth/get-branch-id";
import { getSalesOverview } from "@/server/pos/pos-service";
import { resolveSalesOverviewPeriod } from "@/server/reports/product-analytics-service";

/**
 * GET /api/sales/overview?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Returns computed sales analytics: metrics, chart data, top products, daily breakdown.
 */
export async function GET(request: Request) {
    try {
        const auth = await requireUserAuthFromContext();
        if (auth instanceof NextResponse) return auth;
        const { payload } = auth;
        const branchId = await getActiveBranchIdFromContext();

        const { searchParams } = new URL(request.url);
        const fromKey = searchParams.get("from");
        const toKey = searchParams.get("to");

        try {
            if (fromKey || toKey) {
                resolveSalesOverviewPeriod(fromKey, toKey);
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Invalid date range";
            return NextResponse.json({ error: msg }, { status: 400 });
        }

        const overview = await getSalesOverview(payload.bid, branchId, {
            fromKey,
            toKey,
        });

        return NextResponse.json(overview, {
            headers: { "Cache-Control": "no-store" },
        });
    } catch (error) {
        console.error("GET /api/sales/overview failed:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
