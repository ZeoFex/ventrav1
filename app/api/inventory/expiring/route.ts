import { NextRequest, NextResponse } from "next/server";
import { requireUserAuthFromContext } from "@/server/auth/api-request-auth";
import { getActiveBranchIdFromContext } from "@/server/auth/get-branch-id";
import { getExpiringInventory } from "@/server/inventory/expiring-service";

const DEFAULT_DAYS = 14;

export async function GET(req: NextRequest) {
    try {
        const auth = await requireUserAuthFromContext();
        if (auth instanceof NextResponse) return auth;
        const { payload } = auth;

        const daysParam = req.nextUrl.searchParams.get("days");
        const parsed = daysParam ? parseInt(daysParam, 10) : DEFAULT_DAYS;
        const days = Number.isFinite(parsed) ? parsed : DEFAULT_DAYS;

        const branchId = await getActiveBranchIdFromContext();
        const items = await getExpiringInventory(payload.bid, days, branchId);

        return NextResponse.json({
            days,
            count: items.length,
            items,
        });
    } catch (error) {
        console.error("GET /api/inventory/expiring Error", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
