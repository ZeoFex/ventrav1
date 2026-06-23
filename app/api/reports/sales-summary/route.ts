import { NextResponse } from "next/server";
import { requireUserAuth } from "@/server/auth/api-request-auth";
import { getActiveBranchIdFromContext } from "@/server/auth/get-branch-id";
import { getSalesSummaryReport } from "@/server/pos/pos-service";
import { resolveSalesOverviewPeriod } from "@/server/reports/product-analytics-service";

/**
 * GET /api/reports/sales-summary
 * Query: period=7|30|90 OR from=YYYY-MM-DD&to=YYYY-MM-DD (Accra calendar days)
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const fromKey = searchParams.get("from");
        const toKey = searchParams.get("to");
        const periodParam = searchParams.get("period");

        const auth = await requireUserAuth(request);
        if (auth instanceof NextResponse) return auth;
        const { payload } = auth;
        const branchId = await getActiveBranchIdFromContext();

        let report;
        if (fromKey && toKey) {
            resolveSalesOverviewPeriod(fromKey, toKey);
            report = await getSalesSummaryReport(payload.bid, branchId, { fromKey, toKey });
        } else {
            const periodDays = periodParam ? parseInt(periodParam, 10) : 30;
            report = await getSalesSummaryReport(payload.bid, branchId, { periodDays });
        }

        return NextResponse.json(report, {
            headers: { "Cache-Control": "no-store" },
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Internal Server Error";
        const status = message.includes("Invalid date range") || message.includes("cannot exceed") ? 400 : 500;
        if (status === 500) {
            console.error("GET /api/reports/sales-summary failed:", error);
        }
        return NextResponse.json({ error: message }, { status });
    }
}
