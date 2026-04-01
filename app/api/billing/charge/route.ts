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
});

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get(COOKIE_NAMES.ACCESS)?.value;
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    
    const payload = await verifyAccessToken(token);
    if (!payload.bid) return NextResponse.json({ error: "No business context found" }, { status: 400 });

    const body = await req.json();
    const parsed = chargeSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payment details" }, { status: 400 });
    }

    const { plan, cycle, phone, provider } = parsed.data;
    
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
    const reference = `vpn_${payload.bid}_${Date.now()}_${plan.substring(0, 3)}_${cycleCode}`;

    // Get the user's email to pass to Paystack
    const email = payload.email || "billing@ventrapos.com"; 

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
