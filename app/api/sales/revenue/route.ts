import { NextResponse } from "next/server";
import { requireUserAuth } from "@/server/auth/api-request-auth";
import { getActiveBranchIdFromContext } from "@/server/auth/get-branch-id";
import { getRevenueDetails } from "@/server/pos/pos-service";

/**
 * GET /api/sales/revenue
 * Returns computed sales revenue detailed metrics.
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const periodParam = searchParams.get("period");
        const periodDays = periodParam ? parseInt(periodParam, 10) : 7;

        const auth = await requireUserAuth(request);
        if (auth instanceof NextResponse) return auth;
        const { payload } = auth;
        const branchId = await getActiveBranchIdFromContext();
        const details = await getRevenueDetails(payload.bid, periodDays, branchId);

        return NextResponse.json(details, {
            headers: { "Cache-Control": "no-store" },
        });
    } catch (error) {
        console.error("GET /api/sales/revenue failed:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
