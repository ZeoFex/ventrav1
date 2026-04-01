import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/server/auth/token-service";
import { COOKIE_NAMES } from "@/server/config/auth-config";
import { getDashboardHomeData } from "@/server/pos/pos-service";
import { getActiveBranchId } from "@/server/auth/get-branch-id";

/**
 * GET /api/dashboard/home
 * Returns computed home dashboard data: KPIs + Recent Activity.
 */
export async function GET() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get(COOKIE_NAMES.ACCESS)?.value;

        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const payload = await verifyAccessToken(token);
        const branchId = getActiveBranchId(cookieStore);
        const data = await getDashboardHomeData(payload.bid, branchId);

        return NextResponse.json(data, {
            headers: { "Cache-Control": "no-store" },
        });
    } catch (error) {
        console.error("GET /api/dashboard/home failed:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
