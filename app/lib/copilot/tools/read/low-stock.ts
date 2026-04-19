import { tool, zodSchema } from "ai";
import { z } from "zod";
import { getProducts } from "@/server/products/product-service";

type ProductRow = Awaited<ReturnType<typeof getProducts>>[number];
import type { ToolContext } from "../types";

export function lowStockTool(ctx: ToolContext) {
  return tool({
    description:
      "List products at or below a stock threshold (helps reorder planning).",
    inputSchema: zodSchema(
      z.object({
        maxStock: z
          .number()
          .int()
          .min(0)
          .max(1_000_000)
          .describe("Include products with stock <= this value"),
        limit: z.number().int().min(1).max(50).optional().default(25),
      }),
    ),
    execute: async ({ maxStock, limit }) => {
      const products = await getProducts(ctx.businessId, ctx.branchId);
      const low = products
        .filter((p: ProductRow) => Number(p.stock) <= maxStock)
        .sort(
          (a: ProductRow, b: ProductRow) => Number(a.stock) - Number(b.stock),
        )
        .slice(0, limit)
        .map((p: ProductRow) => ({
          id: p.id,
          name: p.name,
          sku: p.sku,
          stock: p.stock,
        }));
      return { threshold: maxStock, count: low.length, products: low };
    },
  });
}
