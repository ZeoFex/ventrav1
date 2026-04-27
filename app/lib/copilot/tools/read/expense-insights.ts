import { tool, zodSchema } from "ai";
import { z } from "zod";
import {
  getExpensesList,
  getFinanceOverview,
} from "@/server/finance/finance-service";
import type { ToolContext } from "../types";

export function expenseInsightsTool(ctx: ToolContext) {
  return tool({
    description:
      "Read expense and finance rollups: 30-day revenue vs expenses, net, 7-day trend, category breakdown, and/or recent expense lines (GHS). Respects active branch filter.",
    inputSchema: zodSchema(
      z.object({
        mode: z
          .enum(["summary", "recent_lines", "both"])
          .describe(
            '"summary" for 30d totals + 7d trend + category pie data; "recent_lines" for latest expenses; "both".',
          ),
        recentLimit: z.number().int().min(1).max(30).optional().default(12),
      }),
    ),
    execute: async ({ mode, recentLimit }) => {
      const out: {
        summary?: Awaited<ReturnType<typeof getFinanceOverview>>;
        recentExpenses?: {
          id: string;
          date: string;
          description: string;
          category: string;
          amount: number;
          status: string;
        }[];
      } = {};

      if (mode === "summary" || mode === "both") {
        out.summary = await getFinanceOverview(ctx.businessId, ctx.branchId);
      }
      if (mode === "recent_lines" || mode === "both") {
        const list = await getExpensesList(ctx.businessId, ctx.branchId);
        out.recentExpenses = list.slice(0, recentLimit ?? 12);
      }
      return out;
    },
  });
}
