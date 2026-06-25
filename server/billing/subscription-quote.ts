import { PLANS, type PlanId, getBranchAddonPriceGhs } from "@/config/plans";
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
    branchAddonGhs: number;
    paidExtraBranches: number;
    discountGhs: number;
    totalGhs: number;
    totalPesewas: number;
    reservedBpsApplied: number;
} | null> {
    const planDetails = PLANS.find((p) => p.id === plan);
    if (!planDetails) return null;

    const basePlanGhs =
        cycle === "monthly"
            ? planDetails.priceMonthly
            : planDetails.priceAnnually;

    let reservedBps = 0;
    let paidExtraBranches = 0;
    if (businessId) {
        const [row] = await db
            .select({
                reserved: businesses.referralDiscountReservedBps,
                paidExtraBranches: businesses.paidExtraBranches,
            })
            .from(businesses)
            .where(eq(businesses.id, businessId))
            .limit(1);
        reservedBps = row?.reserved ?? 0;
        paidExtraBranches = row?.paidExtraBranches ?? 0;
    }

    const branchAddonGhs = getBranchAddonPriceGhs(paidExtraBranches, cycle);
    const subtotalGhs = basePlanGhs + branchAddonGhs;

    const { pesewas, discountGhs } = applyReservedReferralDiscountPesewas(
        subtotalGhs,
        reservedBps,
    );

    return {
        subtotalGhs,
        branchAddonGhs,
        paidExtraBranches,
        discountGhs,
        totalGhs: pesewas / 100,
        totalPesewas: pesewas,
        reservedBpsApplied: reservedBps > 0 ? reservedBps : 0,
    };
}
