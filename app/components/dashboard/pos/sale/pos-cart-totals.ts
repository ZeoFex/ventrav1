import { type ProductRow } from "../../products/types";

export type CartLine = { productId: string; qty: number; variationId?: string };

export function computePosTotals(
  lines: CartLine[],
  productById: Map<string, ProductRow>,
  options: { taxRate?: number; discountGhs?: number } = {},
): { subtotal: number; tax: number; discount: number; total: number } {
  const { taxRate = 0, discountGhs = 0 } = options;

  const subtotal = lines.reduce((sum, line) => {
    const p = productById.get(line.productId);
    if (!p) return sum;

    let price = Number(p.priceGhs);
    if (line.variationId && p.variations) {
      const v = p.variations.find((v) => v.id === line.variationId);
      if (v?.priceGhs) {
        price = Number(v.priceGhs);
      }
    }

    return sum + price * line.qty;
  }, 0);

  const tax = subtotal * taxRate;
  const discount = discountGhs;
  const total = Math.max(0, subtotal + tax - discount);
  return { subtotal, tax, discount, total };
}
