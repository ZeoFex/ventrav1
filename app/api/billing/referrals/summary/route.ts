import { NextRequest, NextResponse } from "next/server";
import { requireOwner, requireUserAuth } from "@/server/auth/api-request-auth";
import { getPublicBaseUrl } from "@/config/public-site";
import { db } from "@/server/db";
import { businesses } from "@/server/db/schema/businesses";
import { referralQualifications } from "@/server/db/schema/referral-qualifications";
import { count, eq } from "drizzle-orm";
import { REFERRAL_MAX_REWARD_BPS } from "@/config/referrals";
import { ensureReferralCodeForBusiness } from "@/server/referrals/referral-service";

export async function GET(req: NextRequest) {
    try {
        const auth = await requireUserAuth(req);
        if (auth instanceof NextResponse) return auth;
        const { payload } = auth;
        const denied = requireOwner(payload);
        if (denied !== true) {
            return denied;
        }

        const businessId = payload.bid;
        const code = await ensureReferralCodeForBusiness(businessId);

        const [row] = await db
            .select({
                reward: businesses.referralRewardBps,
                reserved: businesses.referralDiscountReservedBps,
            })
            .from(businesses)
            .where(eq(businesses.id, businessId))
            .limit(1);

        const [countRow] = await db
            .select({ qualifiedCount: count() })
            .from(referralQualifications)
            .where(eq(referralQualifications.referrerBusinessId, businessId));

        const origin = getPublicBaseUrl();

        return NextResponse.json({
            referralCode: code,
            qualifiedCount: Number(countRow?.qualifiedCount ?? 0),
            earnedBps: row?.reward ?? 0,
            reservedBps: row?.reserved ?? 0,
            maxBps: REFERRAL_MAX_REWARD_BPS,
            shareUrl: `${origin}/signup?ref=${encodeURIComponent(code)}`,
        });
    } catch (e) {
        console.error("[GET /api/billing/referrals/summary]", e);
        return NextResponse.json(
            { error: "Failed to load referral summary" },
            { status: 500 },
        );
    }
}
