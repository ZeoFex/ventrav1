import { PLANS, type PlanId } from "@/config/plans";
import { db } from "@/server/db";
import { businesses } from "@/server/db/schema/businesses";
import { eq } from "drizzle-orm";
import { applyReservedReferralDiscountPesewas } from "@/server/referrals/referral-pricing";

export async function getSubscriptionQuoteForBusiness(
    businessId: string | null,
    plan: PlanId,
    cycle: "monthly" | "annually",
): Promise<{
    subtotalGhs: number;
    discountGhs: number;
    totalGhs: number;
    totalPesewas: number;
    reservedBpsApplied: number;
} | null> {
    const planDetails = PLANS.find((p) => p.id === plan);
    if (!planDetails) return null;

    const subtotalGhs =
        cycle === "monthly"
            ? planDetails.priceMonthly
            : planDetails.priceAnnually;

    let reservedBps = 0;
    if (businessId) {
        const [row] = await db
            .select({
                reserved: businesses.referralDiscountReservedBps,
            })
            .from(businesses)
            .where(eq(businesses.id, businessId))
            .limit(1);
        reservedBps = row?.reserved ?? 0;
    }

    const { pesewas, discountGhs } = applyReservedReferralDiscountPesewas(
        subtotalGhs,
        reservedBps,
    );

    return {
        subtotalGhs,
        discountGhs,
        totalGhs: pesewas / 100,
        totalPesewas: pesewas,
        reservedBpsApplied: reservedBps > 0 ? reservedBps : 0,
    };
}
