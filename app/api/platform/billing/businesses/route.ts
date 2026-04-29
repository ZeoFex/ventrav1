import { count, desc, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { parsePlatformListRequest } from "@/server/platform/platform-list";
import { db } from "@/server/db";
import { businesses } from "@/server/db/schema/businesses";

export const dynamic = "force-dynamic";

/**
 * Per-tenant subscription and referral fields (all businesses, paginated).
 * For POS catalog etc. use /api/platform/businesses; this route is billing-focused.
 */
const row = {
    id: businesses.id,
    name: businesses.name,
    slug: businesses.slug,
    contactEmail: businesses.contactEmail,
    status: businesses.status,
    plan: businesses.plan,
    subscriptionStatus: businesses.subscriptionStatus,
    currentPeriodEnd: businesses.currentPeriodEnd,
    referralCode: businesses.referralCode,
    referredByBusinessId: businesses.referredByBusinessId,
    referralRewardBps: businesses.referralRewardBps,
    referralDiscountReservedBps: businesses.referralDiscountReservedBps,
    createdAt: businesses.createdAt,
    updatedAt: businesses.updatedAt,
} as const;

export async function GET(req: NextRequest) {
    const g = await parsePlatformListRequest(req);
    if (!g.ok) {
        return g.response;
    }
    const { limit, offset, businessId } = g.params;
    const idCond = businessId ? eq(businesses.id, businessId) : undefined;

    const [countRow] = idCond
        ? await db.select({ n: count() }).from(businesses).where(idCond)
        : await db.select({ n: count() }).from(businesses);

    const items = idCond
        ? await db
              .select(row)
              .from(businesses)
              .where(idCond)
              .orderBy(desc(businesses.createdAt))
              .limit(limit)
              .offset(offset)
        : await db
              .select(row)
              .from(businesses)
              .orderBy(desc(businesses.createdAt))
              .limit(limit)
              .offset(offset);

    return NextResponse.json({
        total: countRow?.n ?? 0,
        items,
        limit,
        offset,
    });
}
