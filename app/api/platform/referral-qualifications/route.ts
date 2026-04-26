import { count, desc, eq, or } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { parsePlatformListRequest } from "@/server/platform/platform-list";
import { db } from "@/server/db";
import { referralQualifications } from "@/server/db/schema/referral-qualifications";

export const dynamic = "force-dynamic";

const row = {
    id: referralQualifications.id,
    referrerBusinessId: referralQualifications.referrerBusinessId,
    refereeBusinessId: referralQualifications.refereeBusinessId,
    firstChargeReference: referralQualifications.firstChargeReference,
    createdAt: referralQualifications.createdAt,
} as const;

export async function GET(req: NextRequest) {
    const g = parsePlatformListRequest(req);
    if (!g.ok) {
        return g.response;
    }
    const { limit, offset, businessId } = g.params;
    const cond = businessId
        ? or(
              eq(referralQualifications.referrerBusinessId, businessId),
              eq(referralQualifications.refereeBusinessId, businessId)
          )
        : undefined;

    const [countRow] = cond
        ? await db.select({ n: count() }).from(referralQualifications).where(cond)
        : await db.select({ n: count() }).from(referralQualifications);

    const items = cond
        ? await db
              .select(row)
              .from(referralQualifications)
              .where(cond)
              .orderBy(desc(referralQualifications.createdAt))
              .limit(limit)
              .offset(offset)
        : await db
              .select(row)
              .from(referralQualifications)
              .orderBy(desc(referralQualifications.createdAt))
              .limit(limit)
              .offset(offset);

    return NextResponse.json({ total: countRow?.n ?? 0, items, limit, offset });
}
