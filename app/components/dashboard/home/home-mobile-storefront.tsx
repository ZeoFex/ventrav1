"use client";

import { useState } from "react";
import Link from "next/link";
import { LayoutGrid, Store } from "lucide-react";
import { useBranchContext } from "../branch-context";
import { useCategories } from "../products/products-data-hooks";
import { HomeOwnerAlerts } from "./home-owner-alerts";
import { HomeQuickSaleProducts } from "./home-quick-sale-products";
import { HomeProductGrid } from "./home-product-grid";
import { HomeDailySales } from "./home-daily-sales";

export function HomeMobileStorefront() {
  const { branchId } = useBranchContext();
  const { categories = [] } = useCategories();
  const [categoryId, setCategoryId] = useState<string | null>(null);

  if (branchId === "all") {
    return (
      <div className="flex flex-col items-center rounded-2xl border border-dashed border-[#bfc9c3]/30 bg-muted/20 px-6 py-12 text-center">
        <Store className="mb-3 size-10 text-muted-foreground/50" />
        <p className="text-[15px] font-semibold text-foreground">Select a branch</p>
        <p className="mt-1.5 max-w-xs text-[13px] text-muted-foreground">
          Choose a branch in the header to browse products and sell on this device.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5 px-4 py-4 pb-8 sm:px-6">
      <HomeDailySales variant="banner" />

      <div
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:-mx-6 sm:px-6 [&::-webkit-scrollbar]:hidden"
        role="tablist"
        aria-label="Product categories"
        data-tour-target="home-mobile-hub"
        data-tour-mount="main"
      >
        <button
          type="button"
          role="tab"
          aria-selected={categoryId === null}
          onClick={() => setCategoryId(null)}
          className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2 text-[12px] font-semibold transition-colors ${
            categoryId === null
              ? "border-[#006c49] bg-[#006c49] text-white dark:border-[#6ffbbe] dark:bg-[#6ffbbe] dark:text-[#003527]"
              : "border-[#bfc9c3]/40 bg-surface-card text-foreground dark:border-white/15 dark:bg-[#111]"
          }`}
        >
          <LayoutGrid className="size-3.5" aria-hidden />
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            role="tab"
            aria-selected={categoryId === cat.id}
            onClick={() => setCategoryId(cat.id)}
            className={`shrink-0 rounded-full border px-3.5 py-2 text-[12px] font-semibold transition-colors ${
              categoryId === cat.id
                ? "border-[#006c49] bg-[#006c49] text-white dark:border-[#6ffbbe] dark:bg-[#6ffbbe] dark:text-[#003527]"
                : "border-[#bfc9c3]/40 bg-surface-card text-foreground dark:border-white/15 dark:bg-[#111]"
            }`}
          >
            {cat.name}
          </button>
        ))}
        <Link
          href="/dashboard/pos/sale"
          className="shrink-0 rounded-full border border-[#bfc9c3]/40 bg-surface-card px-3.5 py-2 text-[12px] font-semibold text-[#006c49] dark:border-white/15 dark:bg-[#111] dark:text-[#6ffbbe]"
        >
          Full POS
        </Link>
      </div>

      <HomeOwnerAlerts />

      <HomeQuickSaleProducts variant="retail" />

      <HomeProductGrid variant="retail" categoryId={categoryId} hideSearchBar />
    </div>
  );
}
