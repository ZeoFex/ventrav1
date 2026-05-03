/**
 * Billing aggregates for GET /api/platform/billing/summary and GET /api/platform/overview.
 * Single SQL round-trip to avoid piling many sequential counts on a small serverless DB pool.
 */
import { db } from "@/server/db";

type JsonMap = Record<string, unknown>;

type BillingRow = {
    businesses_total: bigint | string | number | null;
    businesses_with_referrer: bigint | string | number | null;
    referral_qualifications_total: bigint | string | number | null;
    pending_total: bigint | string | number | null;
    pending_by_status: JsonMap | null;
    plans: JsonMap | null;
    subscription_status: JsonMap | null;
    business_status: JsonMap | null;
};

function num(v: bigint | string | number | null | undefined): number {
    if (v == null) return 0;
    if (typeof v === "bigint") return Number(v);
    if (typeof v === "number") return v;
    const x = Number(v);
    return Number.isFinite(x) ? x : 0;
}

function jsonToCountMap(j: JsonMap | null | undefined): Record<string, number> {
    if (!j || typeof j !== "object") return {};
    const o: Record<string, number> = {};
    for (const [k, v] of Object.entries(j)) {
        o[k] = num(v as bigint | string | number | null);
    }
    return o;
}

/** Payload for GET /api/platform/billing/summary and GET /api/platform/overview. */
export async function getPlatformBillingSummary(businessId: string | undefined) {
    const sql = db.$client;

    if (businessId) {
        const [row] = await sql<BillingRow[]>`
            SELECT
                (SELECT COUNT(*)::bigint FROM businesses WHERE id = ${businessId}) AS businesses_total,
                (SELECT COUNT(*)::bigint FROM businesses
                    WHERE id = ${businessId} AND referred_by_business_id IS NOT NULL)
                    AS businesses_with_referrer,
                (SELECT COUNT(*)::bigint FROM referral_qualifications
                    WHERE referrer_business_id = ${businessId} OR referee_business_id = ${businessId})
                    AS referral_qualifications_total,
                (SELECT COUNT(*)::bigint FROM pending_subscriptions) AS pending_total,
                (SELECT COALESCE(jsonb_object_agg(sub.status, sub.n), '{}'::jsonb)
                    FROM (
                        SELECT ps.status, COUNT(*)::bigint AS n
                        FROM pending_subscriptions ps
                        GROUP BY ps.status
                    ) sub) AS pending_by_status,
                (SELECT COALESCE(jsonb_object_agg(sub.plan, sub.n), '{}'::jsonb)
                    FROM (
                        SELECT b.plan::text AS plan, COUNT(*)::bigint AS n
                        FROM businesses b
                        WHERE b.id = ${businessId}
                        GROUP BY b.plan
                    ) sub) AS plans,
                (SELECT COALESCE(jsonb_object_agg(sub.subscription_status, sub.n), '{}'::jsonb)
                    FROM (
                        SELECT b.subscription_status::text AS subscription_status, COUNT(*)::bigint AS n
                        FROM businesses b
                        WHERE b.id = ${businessId}
                        GROUP BY b.subscription_status
                    ) sub) AS subscription_status,
                (SELECT COALESCE(jsonb_object_agg(sub.biz_status, sub.n), '{}'::jsonb)
                    FROM (
                        SELECT b.status::text AS biz_status, COUNT(*)::bigint AS n
                        FROM businesses b
                        WHERE b.id = ${businessId}
                        GROUP BY b.status
                    ) sub) AS business_status
        `;
        if (!row) {
            throw new Error("platform billing: empty result");
        }
        return {
            filter: { businessId } as const,
            businessesTotal: num(row.businesses_total),
            businessesWithReferralSignup: num(row.businesses_with_referrer),
            plans: jsonToCountMap(row.plans),
            subscriptionStatus: jsonToCountMap(row.subscription_status),
            businessStatus: jsonToCountMap(row.business_status),
            referralQualifications: num(row.referral_qualifications_total),
            pendingSubscriptions: {
                total: num(row.pending_total),
                byStatus: jsonToCountMap(row.pending_by_status),
            },
            relatedPlatformLists: {
                billingBusinesses: "/api/platform/billing/businesses",
                businesses: "/api/platform/businesses",
                pendingSubscriptions: "/api/platform/pending-subscriptions",
                referralQualifications: "/api/platform/referral-qualifications",
            },
        };
    }

    const [row] = await sql<BillingRow[]>`
        SELECT
            (SELECT COUNT(*)::bigint FROM businesses) AS businesses_total,
            (SELECT COUNT(*)::bigint FROM businesses WHERE referred_by_business_id IS NOT NULL)
                AS businesses_with_referrer,
            (SELECT COUNT(*)::bigint FROM referral_qualifications) AS referral_qualifications_total,
            (SELECT COUNT(*)::bigint FROM pending_subscriptions) AS pending_total,
            (SELECT COALESCE(jsonb_object_agg(sub.status, sub.n), '{}'::jsonb)
                FROM (
                    SELECT ps.status, COUNT(*)::bigint AS n
                    FROM pending_subscriptions ps
                    GROUP BY ps.status
                ) sub) AS pending_by_status,
            (SELECT COALESCE(jsonb_object_agg(sub.plan, sub.n), '{}'::jsonb)
                FROM (
                    SELECT b.plan::text AS plan, COUNT(*)::bigint AS n
                    FROM businesses b
                    GROUP BY b.plan
                ) sub) AS plans,
            (SELECT COALESCE(jsonb_object_agg(sub.subscription_status, sub.n), '{}'::jsonb)
                FROM (
                    SELECT b.subscription_status::text AS subscription_status, COUNT(*)::bigint AS n
                    FROM businesses b
                    GROUP BY b.subscription_status
                ) sub) AS subscription_status,
            (SELECT COALESCE(jsonb_object_agg(sub.biz_status, sub.n), '{}'::jsonb)
                FROM (
                    SELECT b.status::text AS biz_status, COUNT(*)::bigint AS n
                    FROM businesses b
                    GROUP BY b.status
                ) sub) AS business_status
    `;
    if (!row) {
        throw new Error("platform billing: empty result");
    }
    return {
        filter: null,
        businessesTotal: num(row.businesses_total),
        businessesWithReferralSignup: num(row.businesses_with_referrer),
        plans: jsonToCountMap(row.plans),
        subscriptionStatus: jsonToCountMap(row.subscription_status),
        businessStatus: jsonToCountMap(row.business_status),
        referralQualifications: num(row.referral_qualifications_total),
        pendingSubscriptions: {
            total: num(row.pending_total),
            byStatus: jsonToCountMap(row.pending_by_status),
        },
        relatedPlatformLists: {
            billingBusinesses: "/api/platform/billing/businesses",
            businesses: "/api/platform/businesses",
            pendingSubscriptions: "/api/platform/pending-subscriptions",
            referralQualifications: "/api/platform/referral-qualifications",
        },
    };
}
