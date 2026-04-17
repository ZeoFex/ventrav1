import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/server/auth/token-service";
import { COOKIE_NAMES } from "@/server/config/auth-config";
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
        const cookieStore = await cookies();
        const t = cookieStore.get(COOKIE_NAMES.ACCESS)?.value;
        if (!t) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const payload = await verifyAccessToken(t);
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
