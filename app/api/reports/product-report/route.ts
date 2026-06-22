import { NextResponse } from "next/server";
import { requireUserAuth } from "@/server/auth/api-request-auth";
import { getActiveBranchIdFromContext } from "@/server/auth/get-branch-id";
import {
    getProductReport,
    type ProductReportActivityFilter,
    type ReportPeriodType,
} from "@/server/reports/product-report-service";

const VALID_PERIODS: ReportPeriodType[] = ["all", "daily", "weekly", "monthly", "custom"];
const VALID_ACTIVITY: ProductReportActivityFilter[] = ["all", "sold", "added", "activity"];

/**
 * GET /api/reports/product-report?period=daily|weekly|monthly|custom&referenceDate=YYYY-MM-DD&from=&to=&categoryId=
 * Returns catalog rows with sold + restocked counts for the selected Accra-timezone period.
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const periodParam = (searchParams.get("period") || "all").toLowerCase();
        const period = VALID_PERIODS.includes(periodParam as ReportPeriodType)
            ? (periodParam as ReportPeriodType)
            : "all";
        const referenceDate = searchParams.get("referenceDate");
        const from = searchParams.get("from");
        const to = searchParams.get("to");
        const categoryId = searchParams.get("categoryId");
        const activityParam = (searchParams.get("activity") || "all").toLowerCase();
        const activity = VALID_ACTIVITY.includes(activityParam as ProductReportActivityFilter)
            ? (activityParam as ProductReportActivityFilter)
            : "all";

        const auth = await requireUserAuth(request);
        if (auth instanceof NextResponse) return auth;
        const { payload } = auth;
        const branchId = await getActiveBranchIdFromContext();

        const report = await getProductReport(
            payload.bid,
            branchId,
            period,
            referenceDate,
            from,
            to,
            categoryId,
            activity,
        );

        return NextResponse.json(report, {
            headers: { "Cache-Control": "no-store" },
        });
    } catch (error) {
        console.error("GET /api/reports/product-report failed:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
