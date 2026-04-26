import { NextResponse } from "next/server";
import { requireUserAuthFromContext } from "@/server/auth/api-request-auth";
import { db } from "@/server/db";
import { businesses } from "@/server/db/schema/businesses";
import { referralQualifications } from "@/server/db/schema/referral-qualifications";
import { desc, eq } from "drizzle-orm";

/**
 * Qualified referrals for the signed-in business (referrer), newest first.
 * Owner-only.
 */
export async function GET() {
    try {
        const auth = await requireUserAuthFromContext();
        if (auth instanceof NextResponse) return auth;
        const { payload } = auth;
        if (payload.role !== "owner") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const referrerId = payload.bid;

        const rows = await db
            .select({
                id: referralQualifications.id,
                qualifiedAt: referralQualifications.createdAt,
                firstChargeReference: referralQualifications.firstChargeReference,
                refereeBusinessName: businesses.name,
            })
            .from(referralQualifications)
            .innerJoin(
                businesses,
                eq(referralQualifications.refereeBusinessId, businesses.id),
            )
            .where(eq(referralQualifications.referrerBusinessId, referrerId))
            .orderBy(desc(referralQualifications.createdAt));

        return NextResponse.json({
            items: rows.map((r) => ({
                id: r.id,
                refereeBusinessName: r.refereeBusinessName,
                qualifiedAt: r.qualifiedAt?.toISOString() ?? null,
                firstChargeReference: r.firstChargeReference,
            })),
        });
    } catch (e) {
        console.error("[GET /api/billing/referrals/activity]", e);
        return NextResponse.json(
            { error: "Failed to load referral activity" },
            { status: 500 },
        );
    }
}
