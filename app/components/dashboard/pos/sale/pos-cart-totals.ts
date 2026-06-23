import { type ProductRow } from "../../products/types";
import type { Discount } from "../../marketing/discounts-data-hooks";

export type CartLine = { productId: string; qty: number; variationId?: string };

function lineUnitPrice(line: CartLine, productById: Map<string, ProductRow>): number {
  const p = productById.get(line.productId);
  if (!p) return 0;

  let price = Number(p.priceGhs);
  if (line.variationId && p.variations) {
    const v = p.variations.find((v) => v.id === line.variationId);
    if (v?.priceGhs) {
      price = Number(v.priceGhs);
    }
  }
  return price;
}

export function getEligibleCartLines(
  lines: CartLine[],
  discount: Pick<Discount, "productIds">,
): CartLine[] {
  const productIds = discount.productIds;
  if (!Array.isArray(productIds) || productIds.length === 0) return lines;
  const allowed = new Set(productIds);
  return lines.filter((line) => allowed.has(line.productId));
}

export function computeEligibleSubtotal(
  lines: CartLine[],
  productById: Map<string, ProductRow>,
  discount?: Pick<Discount, "productIds"> | null,
): number {
  const eligible = discount ? getEligibleCartLines(lines, discount) : lines;
  return eligible.reduce((sum, line) => sum + lineUnitPrice(line, productById) * line.qty, 0);
}

export function computeDiscountGhs(
  discount: Discount,
  lines: CartLine[],
  productById: Map<string, ProductRow>,
): number {
  const eligibleSubtotal = computeEligibleSubtotal(lines, productById, discount);
  if (eligibleSubtotal <= 0) return 0;

  if (discount.type === "percentage") {
    return eligibleSubtotal * (Number(discount.value) / 100);
  }
  return Math.min(Number(discount.value), eligibleSubtotal);
}

export function computePosTotals(
  lines: CartLine[],
  productById: Map<string, ProductRow>,
  options: { taxRate?: number; discountGhs?: number } = {},
): { subtotal: number; tax: number; discount: number; total: number } {
  const { taxRate = 0, discountGhs = 0 } = options;

  const subtotal = lines.reduce((sum, line) => {
    return sum + lineUnitPrice(line, productById) * line.qty;
  }, 0);

  const tax = subtotal * taxRate;
  const discount = discountGhs;
  const total = Math.max(0, subtotal + tax - discount);
  return { subtotal, tax, discount, total };
}
