import { type NextRequest, NextResponse } from "next/server";
import { parsePlatformListRequest } from "@/server/platform/platform-list";
import { getPlatformBillingSummary } from "@/server/platform/billing-snapshot";

export const dynamic = "force-dynamic";

/**
 * Cross-tenant billing snapshot: plan / subscription / account status mix, Paystack handoffs, referral payouts.
 * Optional `businessId` scopes business- and referral-qualification stats to one tenant.
 * `pendingSubscriptions` remains global (rows are not tied to a business id in the DB).
 */
export async function GET(req: NextRequest) {
    const g = parsePlatformListRequest(req);
    if (!g.ok) {
        return g.response;
    }
    const { businessId } = g.params;
    const data = await getPlatformBillingSummary(businessId);
    return NextResponse.json(data);
}
