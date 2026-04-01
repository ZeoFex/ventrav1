import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/server/auth/token-service";
import { COOKIE_NAMES } from "@/server/config/auth-config";
import { getRevenueDetails } from "@/server/pos/pos-service";
import { getActiveBranchId } from "@/server/auth/get-branch-id";

/**
 * GET /api/sales/revenue
 * Returns computed sales revenue detailed metrics.
 */
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const periodParam = searchParams.get("period");
        const periodDays = periodParam ? parseInt(periodParam, 10) : 7;

        const cookieStore = await cookies();
        const token = cookieStore.get(COOKIE_NAMES.ACCESS)?.value;

        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const payload = await verifyAccessToken(token);
        const branchId = getActiveBranchId(cookieStore);
        const details = await getRevenueDetails(payload.bid, periodDays, branchId);

        return NextResponse.json(details, {
            headers: { "Cache-Control": "no-store" },
        });
    } catch (error) {
        console.error("GET /api/sales/revenue failed:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
