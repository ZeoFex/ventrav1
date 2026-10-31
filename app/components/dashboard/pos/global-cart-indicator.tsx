"use client";

import { ShoppingBag } from "lucide-react";
import { usePathname } from "next/navigation";
import { useGlobalCart } from "./global-cart-context";
import { useState, useEffect, useMemo } from "react";
import { QuickCheckoutDrawer } from "./quick-checkout-drawer";
import { SaleTotalDock } from "./sale/sale-total-dock";
import { formatGhs } from "@/app/lib/catalog-utils";
import { useProducts } from "../products/products-data-hooks";
import { computePosTotals } from "./sale/pos-cart-totals";
import { type ProductRow } from "../products/types";

export function GlobalCartIndicator() {
  const pathname = usePathname() ?? "";
  const { lines, lastAdded } = useGlobalCart();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [startAt, setStartAt] = useState<"cart" | "payment">("cart");
  const [mounted, setMounted] = useState(false);
  const [pulse, setPulse] = useState(false);

  // We only enable fetching products if we have lines
  const { products = [] } = useProducts(lines.length > 0);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Keep the product grid free: flash the dock/FAB instead of opening the popup on every add.
  useEffect(() => {
    if (!mounted || !lastAdded) return;
    setPulse(true);
    const timer = window.setTimeout(() => setPulse(false), 700);
    return () => window.clearTimeout(timer);
  }, [mounted, lastAdded]);

  const productById = useMemo(() => {
    const map = new Map<string, ProductRow>();
    products.forEach((p: ProductRow) => map.set(p.id, p));
    return map;
  }, [products]);

  const total = useMemo(() => {
    if (!products.length || !lines.length) return 0;
    const { total } = computePosTotals(lines, productById, { taxRate: 0, discountGhs: 0 });
    return total;
  }, [lines, products, productById]);

  if (!mounted) return null;

  // POS sale has its own cart panel and bottom dock.
  if (pathname === "/dashboard/pos/sale") {
    return null;
  }

  const itemCount = lines.reduce((acc, line) => acc + line.qty, 0);
  const latestLine = lines[0];
  const latestProduct = latestLine ? productById.get(latestLine.productId) : undefined;
  const itemName = lastAdded?.name ?? latestProduct?.name ?? null;

  if (itemCount === 0 && !isDrawerOpen) {
    return null;
  }

  const openCart = () => {
    setStartAt("cart");
    setIsDrawerOpen(true);
  };

  const openPayment = () => {
    setStartAt("payment");
    setIsDrawerOpen(true);
  };

  return (
    <>
      {itemCount > 0 ? (
        <>
          <div
            className={`lg:hidden ${pulse ? "animate-in fade-in zoom-in-95 duration-300" : ""}`}
          >
            <SaleTotalDock
              total={total}
              itemCount={itemCount}
              itemName={itemName}
              onReview={openCart}
              onPay={openPayment}
            />
          </div>
          <button
            type="button"
            onClick={openCart}
            className={`fixed bottom-28 right-10 z-50 hidden items-center gap-3 rounded-full bg-[#006c49] px-5 py-3.5 text-white shadow-lg outline-none transition-all hover:scale-105 hover:bg-[#003527] focus-visible:ring-2 focus-visible:ring-[#6ffbbe] lg:flex dark:bg-[#6ffbbe] dark:text-[#0a0a0a] dark:hover:bg-white ${
              pulse ? "animate-in fade-in zoom-in-95 duration-300" : ""
            }`}
            aria-label="Open quick checkout"
          >
            <div className="relative">
              <ShoppingBag className="size-5" />
              <span className="absolute -top-2.5 -right-2.5 flex size-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-[#006c49] dark:ring-[#6ffbbe]">
                {itemCount}
              </span>
            </div>
            <div className="mr-1 flex flex-col text-left">
              <span className="mb-0.5 text-[10px] font-bold uppercase leading-none tracking-wider opacity-80">
                Quick Cart
              </span>
              <span className="text-[14px] font-bold leading-none tabular-nums">{formatGhs(total)}</span>
            </div>
          </button>
        </>
      ) : null}

      <QuickCheckoutDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        startAt={startAt}
      />
    </>
  );
}
