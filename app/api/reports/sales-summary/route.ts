import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/server/auth/token-service";
import { COOKIE_NAMES } from "@/server/config/auth-config";
import { getSalesSummaryReport } from "@/server/pos/pos-service";
import { getActiveBranchId } from "@/server/auth/get-branch-id";

/**
 * GET /api/reports/sales-summary
 * Returns fully aggregated KPI metrics and trend arrays for the Sales Summary page.
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const periodParam = searchParams.get("period");
        const periodDays = periodParam ? parseInt(periodParam, 10) : 30;

        const cookieStore = await cookies();
        const token = cookieStore.get(COOKIE_NAMES.ACCESS)?.value;

        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const payload = await verifyAccessToken(token);
        const branchId = getActiveBranchId(cookieStore);
        const report = await getSalesSummaryReport(payload.bid, periodDays, branchId);

        return NextResponse.json(report, {
            headers: { "Cache-Control": "no-store" },
        });
    } catch (error) {
        console.error("GET /api/reports/sales-summary failed:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
