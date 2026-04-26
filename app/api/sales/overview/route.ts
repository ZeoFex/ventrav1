import { NextResponse } from "next/server";
import { requireUserAuthFromContext } from "@/server/auth/api-request-auth";
import { getActiveBranchIdFromContext } from "@/server/auth/get-branch-id";
import { getSalesOverview } from "@/server/pos/pos-service";

/**
 * GET /api/sales/overview
 * Returns computed sales analytics: metrics, chart data, top products.
 */
export async function GET() {
    try {
        const auth = await requireUserAuthFromContext();
        if (auth instanceof NextResponse) return auth;
        const { payload } = auth;
        const branchId = await getActiveBranchIdFromContext();
        const overview = await getSalesOverview(payload.bid, branchId);

        return NextResponse.json(overview, {
            headers: { "Cache-Control": "no-store" },
        });
    } catch (error) {
        console.error("GET /api/sales/overview failed:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
