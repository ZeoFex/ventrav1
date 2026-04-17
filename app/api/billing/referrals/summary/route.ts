import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/server/auth/token-service";
import { COOKIE_NAMES } from "@/server/config/auth-config";
import { db } from "@/server/db";
import { businesses } from "@/server/db/schema/businesses";
import { referralQualifications } from "@/server/db/schema/referral-qualifications";
import { count, eq } from "drizzle-orm";
import { REFERRAL_MAX_REWARD_BPS } from "@/config/referrals";
import { ensureReferralCodeForBusiness } from "@/server/referrals/referral-service";

export async function GET(req: NextRequest) {
    try {
        const cookieStore = await cookies();
        const t = cookieStore.get(COOKIE_NAMES.ACCESS)?.value;
        if (!t) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const payload = await verifyAccessToken(t);
        if (payload.role !== "owner") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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

        const origin =
            process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
            req.nextUrl.origin;

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
