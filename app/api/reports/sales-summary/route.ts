import { NextResponse } from "next/server";
import { requireUserAuth } from "@/server/auth/api-request-auth";
import { getActiveBranchIdFromContext } from "@/server/auth/get-branch-id";
import { getSalesSummaryReport } from "@/server/pos/pos-service";

/**
 * GET /api/reports/sales-summary
 * Returns fully aggregated KPI metrics and trend arrays for the Sales Summary page.
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const periodParam = searchParams.get("period");
        const periodDays = periodParam ? parseInt(periodParam, 10) : 30;

        const auth = await requireUserAuth(request);
        if (auth instanceof NextResponse) return auth;
        const { payload } = auth;
        const branchId = await getActiveBranchIdFromContext();
        const report = await getSalesSummaryReport(payload.bid, periodDays, branchId);

        return NextResponse.json(report, {
            headers: { "Cache-Control": "no-store" },
        });
    } catch (error) {
        console.error("GET /api/reports/sales-summary failed:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
