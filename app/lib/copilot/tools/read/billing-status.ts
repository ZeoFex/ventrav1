import { tool, zodSchema } from "ai";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/server/db";
import { businesses } from "@/server/db/schema/businesses";
import type { ToolContext } from "../types";

export function billingStatusTool(ctx: ToolContext) {
  return tool({
    description:
      "Read subscription plan and billing status for the current business (non-sensitive summary).",
    inputSchema: zodSchema(z.object({})),
    execute: async () => {
      const [row] = await db
        .select({
          plan: businesses.plan,
          subscriptionStatus: businesses.subscriptionStatus,
          currentPeriodEnd: businesses.currentPeriodEnd,
        })
        .from(businesses)
        .where(eq(businesses.id, ctx.businessId))
        .limit(1);
      if (!row) return { error: "Business not found" };
      return {
        plan: row.plan,
        subscriptionStatus: row.subscriptionStatus,
        currentPeriodEnd: row.currentPeriodEnd,
      };
    },
  });
}
