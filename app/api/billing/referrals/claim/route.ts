import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/server/auth/token-service";
import { COOKIE_NAMES } from "@/server/config/auth-config";
import { claimReferralDiscountForNextCharge } from "@/server/referrals/referral-service";

export async function POST() {
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

        const result = await claimReferralDiscountForNextCharge(payload.bid);

        return NextResponse.json({
            ok: true,
            reservedBps: result.reservedBps,
            rewardBps: result.rewardBps,
        });
    } catch (e) {
        console.error("[POST /api/billing/referrals/claim]", e);
        return NextResponse.json(
            { error: "Failed to claim referral discount" },
            { status: 500 },
        );
    }
}
