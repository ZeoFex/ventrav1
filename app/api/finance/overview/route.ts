import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/server/auth/token-service";
import { COOKIE_NAMES } from "@/server/config/auth-config";
import { getFinanceOverview } from "@/server/finance/finance-service";
import { getActiveBranchId } from "@/server/auth/get-branch-id";

export async function GET() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get(COOKIE_NAMES.ACCESS)?.value;

        if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const payload = await verifyAccessToken(token);
        const branchId = getActiveBranchId(cookieStore);

        const overview = await getFinanceOverview(payload.bid, branchId);
        return NextResponse.json(overview);
    } catch (error) {
        console.error("GET /api/finance/overview failed:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
