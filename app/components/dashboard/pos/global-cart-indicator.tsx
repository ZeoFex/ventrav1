"use client";

import { ShoppingBag } from "lucide-react";
import { usePathname } from "next/navigation";
import { useGlobalCart } from "./global-cart-context";
import { useState, useEffect, useMemo } from "react";
import { QuickCheckoutDrawer } from "./quick-checkout-drawer";
import { formatGhs } from "@/app/lib/catalog-utils";
import { useProducts } from "../products/products-data-hooks";
import { computePosTotals } from "./sale/pos-cart-totals";
import { type ProductRow } from "../products/types";

export function GlobalCartIndicator() {
  const pathname = usePathname();
  const { lines } = useGlobalCart();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  // We only enable fetching products if we have lines
  const { products = [] } = useProducts(lines.length > 0);

  useEffect(() => {
    setMounted(true);
  }, []);

  const total = useMemo(() => {
    if (!products.length || !lines.length) return 0;
    const productById = new Map<string, ProductRow>();
    products.forEach((p: ProductRow) => productById.set(p.id, p));
    const { total } = computePosTotals(lines, productById, { taxRate: 0, discountGhs: 0 }); // Ignoring config tax for quick display, will be accurate in drawer
    return total;
  }, [lines, products]);

  if (!mounted) return null;

  // Don't show indicator if we are on the main POS page, as it has its own cart panel
  if (pathname === "/dashboard/pos/sale") {
    return null;
  }

  const itemCount = lines.reduce((acc, line) => acc + line.qty, 0);

  if (itemCount === 0) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsDrawerOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-3 animate-in slide-in-from-bottom-5 fade-in zoom-in-95 rounded-full bg-[#006c49] text-white px-5 py-3.5 shadow-lg lg:bottom-10 lg:right-10 hover:bg-[#003527] hover:scale-105 transition-all outline-none focus-visible:ring-2 focus-visible:ring-[#6ffbbe] dark:bg-[#6ffbbe] dark:text-[#0a0a0a] dark:hover:bg-white"
        aria-label="Open quick checkout"
      >
        <div className="relative">
          <ShoppingBag className="size-5" />
          <span className="absolute -top-2.5 -right-2.5 flex size-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-[#006c49] dark:ring-[#6ffbbe]">
            {itemCount}
          </span>
        </div>
        <div className="flex flex-col text-left mr-1">
           <span className="text-[10px] uppercase font-bold tracking-wider opacity-80 leading-none mb-0.5">Quick Cart</span>
           <span className="text-[14px] font-bold leading-none tabular-nums">{formatGhs(total)}</span>
        </div>
      </button>
      
      <QuickCheckoutDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
    </>
  );
}
