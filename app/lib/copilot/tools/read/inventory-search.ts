import { tool, zodSchema } from "ai";
import { z } from "zod";
import { getProducts } from "@/server/products/product-service";

type ProductRow = Awaited<ReturnType<typeof getProducts>>[number];
import type { ToolContext } from "../types";

export function inventorySearchTool(ctx: ToolContext) {
  return tool({
    description:
      "Search products by name or SKU for this business (respects branch filter). Returns up to 20 matches with stock.",
    inputSchema: zodSchema(
      z.object({
        query: z.string().min(1).max(200).describe("Search text"),
        limit: z.number().int().min(1).max(20).optional().default(12),
      }),
    ),
    execute: async ({ query, limit }) => {
      const products = await getProducts(ctx.businessId, ctx.branchId);
      const q = query.trim().toLowerCase();
      const rows = products
        .filter((p: ProductRow) => {
          const name = (p.name ?? "").toLowerCase();
          const sku = (p.sku ?? "").toLowerCase();
          return name.includes(q) || sku.includes(q);
        })
        .slice(0, limit)
        .map((p: ProductRow) => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          stock: p.stock,
          priceGhs: p.priceGhs,
        }));
      return { matches: rows.length, products: rows };
    },
  });
}
