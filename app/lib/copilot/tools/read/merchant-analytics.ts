import { tool, zodSchema } from "ai";
import { z } from "zod";
import {
  getMerchantAnalytics,
  type MerchantAnalyticsQuery,
} from "@/server/pos/copilot-analytics";
import type { ToolContext } from "../types";

const queryEnum = z.enum([
  "all_time_top_products",
  "daily_revenue_trend_90d",
  "best_store_sales_days",
  "slow_moving_products",
  "top_product_peak_day",
]);

export function merchantAnalyticsTool(ctx: ToolContext) {
  return tool({
    description:
      "Merchant sales intelligence: all-time top products by revenue, 90-day daily revenue trend (which days sold well), best calendar days for the store, slow-moving active products (low revenue last 60 days but stock on hand), and peak sales day for the current #1 product. Call the right query for the user's question; you can call multiple times for a full picture.",
    inputSchema: zodSchema(
      z.object({
        query: queryEnum.describe(
          "Which dataset to load: all_time_top_products, daily_revenue_trend_90d, best_store_sales_days, slow_moving_products, top_product_peak_day.",
        ),
      }),
    ),
    execute: async ({ query }) => {
      const q = query as MerchantAnalyticsQuery;
      return getMerchantAnalytics(ctx.businessId, ctx.branchId, q);
    },
  });
}
