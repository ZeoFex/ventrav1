import { NextResponse } from "next/server";
import { requireUserAuthFromContext } from "@/server/auth/api-request-auth";
import { getActiveBranchIdFromContext } from "@/server/auth/get-branch-id";
import { getFinanceOverview } from "@/server/finance/finance-service";

export async function GET() {
    try {
        const auth = await requireUserAuthFromContext();
        if (auth instanceof NextResponse) return auth;
        const { payload } = auth;
        const branchId = await getActiveBranchIdFromContext();

        const overview = await getFinanceOverview(payload.bid, branchId);
        return NextResponse.json(overview);
    } catch (error) {
        console.error("GET /api/finance/overview failed:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
