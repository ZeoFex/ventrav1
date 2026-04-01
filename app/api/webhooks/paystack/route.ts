import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/server/db";
import { businesses } from "@/server/db/schema/businesses";
import { eq } from "drizzle-orm";

const secret = process.env.PAYSTACK_SECRET_KEY || "";

export async function POST(req: NextRequest) {
  try {
    const bodyStr = await req.text();
    const signature = req.headers.get("x-paystack-signature");

    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 401 });
    }

    // Validate event
    const hash = crypto.createHmac("sha512", secret).update(bodyStr).digest("hex");
    if (hash !== signature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = JSON.parse(bodyStr);

    if (event.event === "charge.success") {
      const { reference, amount } = event.data;

      // Extract the business ID and plan from our custom reference:
      // Format: vpn_{businessId}_{timestamp}_{plan}
      // Example: vpn_1234-5678-abcd_1711234567_gro (growth)
      const parts = reference.split("_");
      if (parts.length >= 4 && parts[0] === "vpn") {
        const businessId = parts[1];
        const planCode = parts[parts.length - 1].toLowerCase();

        let newPlan: "starter" | "growth" | "pro" = "starter";
        if (planCode.includes("gro") || amount >= 15000) newPlan = "growth";
        if (planCode.includes("pro") || amount >= 30000) newPlan = "pro";

        console.log(`[Webhook] Upgrading business ${businessId} to ${newPlan} via ${reference}`);

        await db.update(businesses)
          .set({ plan: newPlan as "starter" | "growth" | "pro" })
          .where(eq(businesses.id, businessId));
      }
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error("[Paystack Webhook Error]", error);
    return NextResponse.json({ error: "Webhook Error" }, { status: 500 });
  }
}
