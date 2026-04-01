import { type ProductRow } from "../../products/types";

export type CartLine = { productId: string; qty: number };

export function computePosTotals(
  lines: CartLine[],
  productById: Map<string, ProductRow>,
  options: { taxRate?: number; discountGhs?: number } = {},
): { subtotal: number; tax: number; discount: number; total: number } {
  const { taxRate = 0, discountGhs = 0 } = options;

  const subtotal = lines.reduce((sum, line) => {
    const p = productById.get(line.productId);
    if (!p) return sum;
    return sum + Number(p.priceGhs) * line.qty;
  }, 0);

  const tax = subtotal * taxRate;
  const discount = discountGhs;
  const total = Math.max(0, subtotal + tax - discount);
  return { subtotal, tax, discount, total };
}
