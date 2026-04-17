import { NextRequest, NextResponse } from "next/server";
import { checkPendingCharge } from "@/lib/paystack";
import { verifyAccessToken } from "@/server/auth/token-service";
import { COOKIE_NAMES } from "@/server/config/auth-config";
import { db } from "@/server/db";
import { pendingSubscriptions } from "@/server/db/schema/pending-subscriptions";
import { sendSubscriptionEmail } from "@/server/auth/email-service";
import { extractDetailsFromReference } from "@/server/billing/billing-reference";
import { applySuccessfulAuthenticatedSubscriptionPayment } from "@/server/billing/apply-successful-subscription-payment";

/**
 * GET /api/billing/status?reference=xxx
 *
 * Polls Paystack for the charge status. If the charge is successful,
 * immediately updates the business plan in the DB so the frontend
 * can pick it up via its next session fetch.
 */
export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get(COOKIE_NAMES.ACCESS)?.value;
    let payload: any = null;
    
    if (token) {
        try {
            payload = await verifyAccessToken(token);
        } catch {
            // ignore invalid token for status check (could be guest)
        }
    }

    const reference = req.nextUrl.searchParams.get("reference");
    if (!reference) {
      return NextResponse.json({ error: "Missing reference parameter" }, { status: 400 });
    }

    const paystackResult = await checkPendingCharge(reference);

    // On success, update the business plan in the DB immediately
    if (paystackResult.status && paystackResult.data.status === "success") {
      const parsedRef = extractDetailsFromReference(reference);
      
      if (parsedRef) {
        if (payload?.bid) {
            console.log(`[Status API] Upgrading business ${payload.bid} → ${parsedRef.plan} (${parsedRef.cycle})`);
            const amountGhs = paystackResult.data.amount
                ? paystackResult.data.amount / 100
                : 0;
            await applySuccessfulAuthenticatedSubscriptionPayment({
                businessId: payload.bid,
                reference,
                parsed: parsedRef,
                emailTo: payload.email,
                firstName: payload.firstName ?? "",
                amountGhsDisplay: amountGhs.toString(),
            });
        } else if (reference.includes("_guest_")) {
            // Record in pending_subscriptions for pre-signup flow
            const email = paystackResult.data.customer?.email;
            if (!email) {
                console.warn(`[Status API] Success for guest reference ${reference} but no email found in Paystack response`);
                return NextResponse.json(paystackResult);
            }

            console.log(`[Status API] Recording pending subscription for ${email} → ${parsedRef.plan}`);
            
            await db.insert(pendingSubscriptions)
              .values({
                email,
                plan: parsedRef.plan,
                cycle: parsedRef.cycle,
                reference,
                status: "success",
                amount: paystackResult.data.amount?.toString() || "0",
              })
              .onConflictDoUpdate({
                target: pendingSubscriptions.reference,
                set: { status: "success" }
              });

            // Send confirmation email for guest
            await sendSubscriptionEmail({
                to: email,
                planName: parsedRef.plan.charAt(0).toUpperCase() + parsedRef.plan.slice(1),
                amount: (paystackResult.data.amount ? paystackResult.data.amount / 100 : 0).toString(),
                cycle: parsedRef.cycle,
            }).catch(err => console.error("[Status API] Failed to send guest subscription email:", err));
        }
      }
    }

    return NextResponse.json(paystackResult);
  } catch (error: any) {
    console.error("[Paystack Status API Error]", error.message || error);
    return NextResponse.json(
      { error: "Failed to check payment status" },
      { status: 500 }
    );
  }
}
