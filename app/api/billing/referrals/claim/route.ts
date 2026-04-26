import { NextResponse } from "next/server";
import { requireUserAuthFromContext } from "@/server/auth/api-request-auth";
import { claimReferralDiscountForNextCharge } from "@/server/referrals/referral-service";

export async function POST() {
    try {
        const auth = await requireUserAuthFromContext();
        if (auth instanceof NextResponse) return auth;
        const { payload } = auth;
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
