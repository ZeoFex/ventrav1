import { NextResponse } from "next/server";
import { requireUserAuthFromContext } from "@/server/auth/api-request-auth";
import { getActiveBranchIdFromContext } from "@/server/auth/get-branch-id";
import { getAverageOrderValueData } from "@/server/pos/pos-service";

/**
 * GET /api/sales/average-order-value
 * Returns computed AOV analytics: current average and category breakdown.
 */
export async function GET() {
    try {
        const auth = await requireUserAuthFromContext();
        if (auth instanceof NextResponse) return auth;
        const { payload } = auth;
        const branchId = await getActiveBranchIdFromContext();
        const aovData = await getAverageOrderValueData(payload.bid, branchId);

        return NextResponse.json(aovData, {
            headers: { "Cache-Control": "no-store" },
        });
    } catch (error) {
        console.error("GET /api/sales/average-order-value failed:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
