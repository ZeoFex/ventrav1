"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useGlobalCart } from "../pos/global-cart-context";
import { useProducts } from "../products/products-data-hooks";
import { computePosTotals } from "../pos/sale/pos-cart-totals";
import { SaleTotalDock } from "../pos/sale/sale-total-dock";
import { type ProductRow } from "../products/types";

export function HomeCartDock() {
  const router = useRouter();
  const { lines, lastAdded } = useGlobalCart();
  const { products = [] } = useProducts(lines.length > 0);

  const productById = useMemo(() => {
    const map = new Map<string, ProductRow>();
    for (const p of products as ProductRow[]) map.set(p.id, p);
    return map;
  }, [products]);

  const { total } = useMemo(
    () => computePosTotals(lines, productById, { taxRate: 0, discountGhs: 0 }),
    [lines, productById],
  );

  const itemCount = lines.reduce((sum, line) => sum + line.qty, 0);
  const latestLine = lines[0];
  const latestProduct = latestLine ? productById.get(latestLine.productId) : undefined;
  const name = lastAdded?.name ?? latestProduct?.name ?? null;

  const goToPos = () => {
    router.push("/dashboard/pos/sale");
  };

  return (
    <SaleTotalDock
      total={total}
      itemCount={itemCount}
      itemName={name}
      onReview={goToPos}
      onPay={goToPos}
    />
  );
}
