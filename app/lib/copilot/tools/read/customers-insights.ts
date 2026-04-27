import { tool, zodSchema } from "ai";
import { z } from "zod";
import { searchCustomersForCopilot } from "@/server/customers/customer-service";
import type { ToolContext } from "../types";

export function customersInsightsTool(ctx: ToolContext) {
  return tool({
    description:
      "Search customers by name or phone fragment, or list the most recently added customers for this business (respects branch filter). Use search_products if you need product titles for POS cart product IDs.",
    inputSchema: zodSchema(
      z.object({
        query: z
          .string()
          .max(120)
          .optional()
          .describe(
            "Substring to match name or phone; omit or empty for recent customers list.",
          ),
        limit: z.number().int().min(1).max(25).optional().default(15),
      }),
    ),
    execute: async ({ query, limit }) => {
      const rows = await searchCustomersForCopilot(ctx.businessId, ctx.branchId, {
        query: query?.trim() ? query.trim() : null,
        limit: limit ?? 15,
      });
      return {
        count: rows.length,
        customers: rows.map((c) => ({
          id: c.id,
          name: c.name,
          phone: c.phone,
          status: c.status,
          createdAt: c.createdAt,
        })),
      };
    },
  });
}
