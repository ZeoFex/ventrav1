import { and, count, eq, isNotNull, or } from "drizzle-orm";
import { db } from "@/server/db";
import { businesses } from "@/server/db/schema/businesses";
import { pendingSubscriptions } from "@/server/db/schema/pending-subscriptions";
import { referralQualifications } from "@/server/db/schema/referral-qualifications";

type GbRow = { key: string; n: number };

function toMap(rows: GbRow[]): Record<string, number> {
    const o: Record<string, number> = {};
    for (const r of rows) {
        o[String(r.key)] = Number(r.n);
    }
    return o;
}

/** Payload for GET /api/platform/billing/summary and GET /api/platform/overview. */
export async function getPlatformBillingSummary(businessId: string | undefined) {
    const idEq = businessId ? eq(businesses.id, businessId) : undefined;
    const refCond = businessId
        ? or(
              eq(referralQualifications.referrerBusinessId, businessId),
              eq(referralQualifications.refereeBusinessId, businessId)
          )
        : undefined;

    const withReferrerCond = idEq
        ? and(idEq, isNotNull(businesses.referredByBusinessId))
        : isNotNull(businesses.referredByBusinessId);

    const [totalBusinesses, withReferrer, referralRows, pendingTotal, pendingByStatus, plans, subStatuses, businessStatuses] =
        await Promise.all([
            idEq
                ? db
                      .select({ n: count() })
                      .from(businesses)
                      .where(idEq)
                : db.select({ n: count() }).from(businesses),
            db
                .select({ n: count() })
                .from(businesses)
                .where(withReferrerCond),
            refCond
                ? db
                      .select({ n: count() })
                      .from(referralQualifications)
                      .where(refCond)
                : db.select({ n: count() }).from(referralQualifications),
            db.select({ n: count() }).from(pendingSubscriptions),
            db
                .select({ key: pendingSubscriptions.status, n: count() })
                .from(pendingSubscriptions)
                .groupBy(pendingSubscriptions.status),
            idEq
                ? db
                      .select({ key: businesses.plan, n: count() })
                      .from(businesses)
                      .where(idEq)
                      .groupBy(businesses.plan)
                : db
                      .select({ key: businesses.plan, n: count() })
                      .from(businesses)
                      .groupBy(businesses.plan),
            idEq
                ? db
                      .select({ key: businesses.subscriptionStatus, n: count() })
                      .from(businesses)
                      .where(idEq)
                      .groupBy(businesses.subscriptionStatus)
                : db
                      .select({ key: businesses.subscriptionStatus, n: count() })
                      .from(businesses)
                      .groupBy(businesses.subscriptionStatus),
            idEq
                ? db
                      .select({ key: businesses.status, n: count() })
                      .from(businesses)
                      .where(idEq)
                      .groupBy(businesses.status)
                : db
                      .select({ key: businesses.status, n: count() })
                      .from(businesses)
                      .groupBy(businesses.status),
        ]);

    const pendingMap: Record<string, number> = {};
    for (const r of pendingByStatus) {
        pendingMap[String(r.key)] = Number(r.n);
    }

    return {
        filter: businessId ? { businessId } : null,
        businessesTotal: Number(totalBusinesses[0]?.n ?? 0),
        businessesWithReferralSignup: Number(withReferrer[0]?.n ?? 0),
        plans: toMap(plans as GbRow[]),
        subscriptionStatus: toMap(subStatuses as GbRow[]),
        businessStatus: toMap(businessStatuses as GbRow[]),
        referralQualifications: Number(referralRows[0]?.n ?? 0),
        pendingSubscriptions: {
            total: Number(pendingTotal[0]?.n ?? 0),
            byStatus: pendingMap,
        },
        relatedPlatformLists: {
            billingBusinesses: "/api/platform/billing/businesses",
            businesses: "/api/platform/businesses",
            pendingSubscriptions: "/api/platform/pending-subscriptions",
            referralQualifications: "/api/platform/referral-qualifications",
        },
    };
}
