import { NextRequest, NextResponse } from "next/server";
import { chargeMomo } from "@/lib/paystack";
import { z } from "zod";
import { verifyAccessToken } from "@/server/auth/token-service";
import { COOKIE_NAMES } from "@/server/config/auth-config";
import { db } from "@/server/db";
import { businesses } from "@/server/db/schema/businesses";
import { eq } from "drizzle-orm";
import { PLANS, PlanId } from "@/config/plans";

const chargeSchema = z.object({
  plan: z.enum(["starter", "growth", "pro"]),
  cycle: z.enum(["monthly", "annually"]).default("monthly"),
  phone: z.string().min(9),
  provider: z.enum(["mtn", "vod", "tigo"]),
  preSignupEmail: z.string().email().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get(COOKIE_NAMES.ACCESS)?.value;
    let payload: any = null;
    
    if (token) {
        try {
            payload = await verifyAccessToken(token);
        } catch {
            // ignore invalid token for guest checkout
        }
    }

    const body = await req.json();
    const parsed = chargeSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payment details" }, { status: 400 });
    }

    const { plan, cycle, phone, provider, preSignupEmail } = parsed.data;

    // Must have either a session email or a pre-signup email
    const email = payload?.email || preSignupEmail;
    if (!email) {
        return NextResponse.json({ error: "Email is required for payment" }, { status: 400 });
    }
    
    // Find the correct selected plan
    const planDetails = PLANS.find((p) => p.id === plan);
    if (!planDetails) {
        return NextResponse.json({ error: "Plan not found" }, { status: 400 });
    }

    // Paystack amounts are in pesewas (multiply GHS by 100)
    const amountGHS = cycle === "monthly" ? planDetails.priceMonthly : planDetails.priceAnnually;
    const amount = amountGHS * 100;
    // Create a unique reference for tracking including plan and cycle
    const cycleCode = cycle === "annually" ? "ann" : "mon";
    const bidLabel = payload?.bid || "guest";
    const reference = `vpn_${bidLabel}_${Date.now()}_${plan.substring(0, 3)}_${cycleCode}`;
    // Send the charge to Paystack
    const paystackResult = await chargeMomo(email, amount, { phone, provider }, reference);

    return NextResponse.json(paystackResult);

  } catch (error: any) {
    console.error("[Paystack Charge API Error]", error.message || error);
    return NextResponse.json(
      { error: error.message || "Failed to initialize payment" },
      { status: 500 }
    );
  }
}
