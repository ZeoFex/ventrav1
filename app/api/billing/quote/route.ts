import { NextRequest, NextResponse } from "next/server";
import { getAccessTokenStringFromRequest } from "@/server/auth/api-request-auth";
import { verifyAccessToken } from "@/server/auth/token-service";
import { getSubscriptionQuoteForBusiness } from "@/server/billing/subscription-quote";
import type { PlanId } from "@/config/plans";

/**
 * GET /api/billing/quote?plan=growth&cycle=monthly
 * Auth optional: when logged in, applies reserved referral discount from DB.
 */
export async function GET(req: NextRequest) {
    try {
        const token = getAccessTokenStringFromRequest(req);
        let businessId: string | null = null;
        if (token) {
            try {
                const payload = await verifyAccessToken(token);
                businessId = payload.bid;
            } catch {
                businessId = null;
            }
        }

        const plan = req.nextUrl.searchParams.get("plan") as PlanId | null;
        const cycle = req.nextUrl.searchParams.get("cycle") as
            | "monthly"
            | "annually"
            | null;

        if (
            !plan ||
            !["starter", "growth", "pro"].includes(plan) ||
            !cycle ||
            !["monthly", "annually"].includes(cycle)
        ) {
            return NextResponse.json(
                { error: "Invalid plan or cycle" },
                { status: 400 },
            );
        }

        const quote = await getSubscriptionQuoteForBusiness(
            businessId,
            plan,
            cycle,
        );
        if (!quote) {
            return NextResponse.json({ error: "Plan not found" }, { status: 400 });
        }

        return NextResponse.json({
            subtotalGhs: quote.subtotalGhs,
            discountGhs: quote.discountGhs,
            totalGhs: quote.totalGhs,
            reservedBpsApplied: quote.reservedBpsApplied,
        });
    } catch (e: unknown) {
        console.error("[GET /api/billing/quote]", e);
        return NextResponse.json(
            { error: "Failed to compute quote" },
            { status: 500 },
        );
    }
}
