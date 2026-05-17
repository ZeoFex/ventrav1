import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { businesses } from "@/server/db/schema/businesses";
import { sendSubscriptionEmail } from "@/server/auth/email-service";
import {
    consumeReservedReferralDiscount,
    recordQualificationOnFirstPaidCharge,
} from "@/server/referrals/referral-service";
import type { ParsedBillingReference } from "@/server/billing/billing-reference";
import { computePeriodEndAfterAddingDays } from "@/server/billing/subscription-period";

/**
 * Apply plan extension + referral side-effects after Paystack reports success
 * (authenticated checkout with a known business id).
 */
export async function applySuccessfulAuthenticatedSubscriptionPayment(input: {
    businessId: string;
    reference: string;
    parsed: ParsedBillingReference;
    emailTo: string;
    firstName: string;
    /** Paystack amount in GHS (pesewas/100) for email */
    amountGhsDisplay: string;
}): Promise<void> {
    const { businessId, reference, parsed, emailTo, firstName, amountGhsDisplay } =
        input;

    const [biz] = await db
        .select({ currentPeriodEnd: businesses.currentPeriodEnd })
        .from(businesses)
        .where(eq(businesses.id, businessId));

    const daysToAdd = parsed.cycle === "annually" ? 365 : 30;
    const newExpiry = computePeriodEndAfterAddingDays({
        currentPeriodEnd: biz?.currentPeriodEnd,
        days: daysToAdd,
    });

    await db
        .update(businesses)
        .set({
            plan: parsed.plan,
            subscriptionStatus: "active",
            currentPeriodEnd: newExpiry,
            updatedAt: new Date(),
        })
        .where(eq(businesses.id, businessId));

    await recordQualificationOnFirstPaidCharge(businessId, reference);
    await consumeReservedReferralDiscount(businessId);

    await sendSubscriptionEmail({
        to: emailTo,
        firstName,
        planName:
            parsed.plan.charAt(0).toUpperCase() + parsed.plan.slice(1),
        amount: amountGhsDisplay,
        cycle: parsed.cycle,
    }).catch((err) =>
        console.error(
            "[applySuccessfulAuthenticatedSubscriptionPayment] Email:",
            err,
        ),
    );
}
