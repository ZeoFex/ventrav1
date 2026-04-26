import { NextResponse } from "next/server";
import { requireUserAuthFromContext } from "@/server/auth/api-request-auth";
import { getActiveBranchIdFromContext } from "@/server/auth/get-branch-id";
import { getDashboardHomeData } from "@/server/pos/pos-service";

/**
 * GET /api/dashboard/home
 * Returns computed home dashboard data: KPIs + Recent Activity.
 */
export async function GET() {
    try {
        const auth = await requireUserAuthFromContext();
        if (auth instanceof NextResponse) return auth;
        const { payload } = auth;
        const branchId = await getActiveBranchIdFromContext();
        const data = await getDashboardHomeData(payload.bid, branchId);

        return NextResponse.json(data, {
            headers: { "Cache-Control": "no-store" },
        });
    } catch (error) {
        console.error("GET /api/dashboard/home failed:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
