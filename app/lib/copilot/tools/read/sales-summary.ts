import { tool, zodSchema } from "ai";
import { z } from "zod";
import { getDashboardHomeData, getSalesOverview } from "@/server/pos/pos-service";
import type { ToolContext } from "../types";

export function salesSummaryTool(ctx: ToolContext) {
  return tool({
    description:
      "Get recent sales KPIs: today vs yesterday on the home dashboard, and 7-day sales overview (revenue, transactions, AOV, daily chart, top products).",
    inputSchema: zodSchema(
      z.object({
        detail: z
          .enum(["home", "overview"])
          .describe(
            '"home" for today snapshot + recent sales; "overview" for 7-day analytics.',
          ),
      }),
    ),
    execute: async ({ detail }) => {
      if (detail === "home") {
        const data = await getDashboardHomeData(ctx.businessId, ctx.branchId);
        return { source: "home", data };
      }
      const data = await getSalesOverview(ctx.businessId, ctx.branchId);
      return { source: "overview", data };
    },
  });
}
