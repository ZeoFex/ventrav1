import { NextRequest, NextResponse } from "next/server";
import { checkPendingCharge } from "@/lib/paystack";
import { verifyAccessToken } from "@/server/auth/token-service";
import { COOKIE_NAMES } from "@/server/config/auth-config";
import { db } from "@/server/db";
import { businesses } from "@/server/db/schema/businesses";
import { eq } from "drizzle-orm";

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
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const payload = await verifyAccessToken(token);

    const reference = req.nextUrl.searchParams.get("reference");
    if (!reference) {
      return NextResponse.json({ error: "Missing reference parameter" }, { status: 400 });
    }

    const paystackResult = await checkPendingCharge(reference);

    // On success, update the business plan in the DB immediately
    if (paystackResult.status && paystackResult.data.status === "success" && payload.bid) {
      const parsedRef = extractDetailsFromReference(reference);
      if (parsedRef) {
        console.log(`[Status API] Upgrading business ${payload.bid} → ${parsedRef.plan} (${parsedRef.cycle})`);
        
        // Fetch the business's current billing cycle
        const [biz] = await db
          .select({ currentPeriodEnd: businesses.currentPeriodEnd })
          .from(businesses)
          .where(eq(businesses.id, payload.bid));

        const now = Date.now();
        const currentEnd = biz?.currentPeriodEnd ? biz.currentPeriodEnd.getTime() : now;
        
        // If they still have time left, add to it. Otherwise, start from now.
        const baseDateDate = currentEnd > now ? currentEnd : now;
        
        // Calculate new expiration date
        const daysToAdd = parsedRef.cycle === "annually" ? 365 : 30;
        const newExpiry = new Date(baseDateDate + daysToAdd * 24 * 60 * 60 * 1000);

        await db.update(businesses)
          .set({ 
             plan: parsedRef.plan,
             subscriptionStatus: "active",
             currentPeriodEnd: newExpiry,
          })
          .where(eq(businesses.id, payload.bid));
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

/**
 * Reference format: vpn_{businessId}_{timestamp}_{planCode}_{cycleCode}
 * planCode is "sta", "gro", or "pro"
 * cycleCode is "mon" or "ann"
 */
function extractDetailsFromReference(ref: string): { plan: "starter" | "growth" | "pro", cycle: "monthly" | "annually" } | null {
  const parts = ref.split("_");
  // Supports both the old 4-part format (assumes monthly) and new 5-part format
  if (parts.length < 4 || parts[0] !== "vpn") return null;

  const planCode = parts[3].toLowerCase();
  
  let plan: "starter" | "growth" | "pro" = "starter";
  if (planCode.includes("pro")) plan = "pro";
  if (planCode.includes("gro")) plan = "growth";
  if (planCode.includes("sta")) plan = "starter";

  let cycle: "monthly" | "annually" = "monthly";
  if (parts.length >= 5) {
      const cycleCode = parts[4].toLowerCase();
      if (cycleCode === "ann") cycle = "annually";
  }

  return { plan, cycle };
}
