import { tool, zodSchema } from "ai";
import { z } from "zod";
import { DASHBOARD_NAV_ITEMS } from "@/app/components/dashboard/sidebar/dashboard-nav-config";
import type { ToolContext } from "../types";

function flattenNav(): { label: string; href: string }[] {
  const out: { label: string; href: string }[] = [];
  for (const item of DASHBOARD_NAV_ITEMS) {
    out.push({ label: item.label, href: item.href });
    if (item.children) {
      for (const c of item.children) {
        out.push({ label: `${item.label} → ${c.label}`, href: c.href });
      }
    }
  }
  return out;
}

export function navSuggestionsTool(_ctx: ToolContext) {
  return tool({
    description:
      "Suggest relevant dashboard deep links: each item is { label, href } where href is a path the app can navigate to (e.g. /dashboard/finance). Best match is the top suggestion for primary navigation.",
    inputSchema: zodSchema(
      z.object({
        intent: z
          .string()
          .min(1)
          .max(300)
          .describe('What the user wants to do, e.g. "discounts", "sales report"'),
      }),
    ),
    execute: async ({ intent }) => {
      const q = intent.toLowerCase();
      const all = flattenNav();
      const scored = all
        .map((l) => {
          const hay = `${l.label} ${l.href}`.toLowerCase();
          let score = 0;
          for (const word of q.split(/\s+/)) {
            if (word.length < 2) continue;
            if (hay.includes(word)) score += 2;
          }
          if (hay.includes(q)) score += 5;
          return { ...l, score };
        })
        .filter((x) => x.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 8);
      const list = scored.map(({ label, href }) => ({ label, href }));
      return {
        best_match: list[0] ?? null,
        suggestions: list,
      };
    },
  });
}
