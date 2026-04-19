import { tool, zodSchema } from "ai";
import { z } from "zod";
import type { ToolContext } from "../types";

const HELP: Record<string, string> = {
  "/dashboard":
    "Home shows today’s sales vs yesterday, transaction count, and recent receipts.",
  "/dashboard/sales/overview":
    "Sales overview charts revenue trends and product performance for the selected period.",
  "/dashboard/products":
    "Product list is your catalog — search, edit, and manage stock at the branch level.",
  "/dashboard/inventory":
    "Inventory focuses on stock levels and adjustments for the selected branch.",
  "/dashboard/pos/sale":
    "POS checkout — scan or search items, apply discounts, and take payment.",
  "/dashboard/settings/billing":
    "Billing & plan — upgrade subscription, manage payment method, referrals.",
};

export function explainScreenTool(ctx: ToolContext) {
  return tool({
    description:
      "Explain what the current dashboard screen is for (uses pathname context when available).",
    inputSchema: zodSchema(
      z.object({
        pathname: z
          .string()
          .optional()
          .describe("Override path; defaults to the user’s current path from context"),
      }),
    ),
    execute: async ({ pathname }) => {
      const p = (pathname ?? ctx.pathname ?? "/dashboard").split("?")[0] ?? "/dashboard";
      const exact = HELP[p];
      if (exact) return { pathname: p, summary: exact };
      const prefix = Object.keys(HELP).find((k) => p.startsWith(k));
      if (prefix) {
        return { pathname: p, summary: HELP[prefix] };
      }
      return {
        pathname: p,
        summary:
          "This area is part of your Ventra dashboard. Use the sidebar to open related sections (sales, products, settings).",
      };
    },
  });
}
