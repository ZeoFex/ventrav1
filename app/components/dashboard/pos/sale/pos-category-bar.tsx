"use client";

import { useEffect, useMemo } from "react";
import { Plus } from "lucide-react";
import { type CategoryRow, type ProductRow } from "../../products/types";
import { onHandForLine } from "@/app/lib/apply-sold-stock";

function productSellableStock(p: ProductRow): number {
  return Math.max(0, onHandForLine(p));
}

export function PosCategoryBar({
  categories,
  products = [],
  activeId,
  onSelect,
  onQuickAddProduct,
  showQuickAddProduct,
}: {
  categories: CategoryRow[];
  /** Live POS products — used to hide empty-stock categories and sort by quantity. */
  products?: ProductRow[];
  activeId: string;
  onSelect: (id: string) => void;
  /** Optional: open quick-add product modal (POS register). */
  onQuickAddProduct?: () => void;
  showQuickAddProduct?: boolean;
}) {
  const visibleCategories = useMemo(() => {
    const stockByCategory = new Map<string, { stockQty: number; productCount: number }>();

    for (const p of products) {
      const catId = p.categoryId;
      if (!catId) continue;
      const prev = stockByCategory.get(catId) ?? { stockQty: 0, productCount: 0 };
      prev.stockQty += productSellableStock(p);
      prev.productCount += 1;
      stockByCategory.set(catId, prev);
    }

    return [...categories]
      .map((c) => {
        const live = stockByCategory.get(c.id);
        return {
          ...c,
          stockQty: live?.stockQty ?? 0,
          productCount: live?.productCount ?? c.productCount ?? 0,
        };
      })
      .filter((c) => c.productCount > 0)
      .sort((a, b) => {
        if (a.stockQty !== b.stockQty) return b.stockQty - a.stockQty;
        return a.name.localeCompare(b.name);
      });
  }, [categories, products]);

  useEffect(() => {
    if (activeId === "all") return;
    if (!visibleCategories.some((c) => c.id === activeId)) {
      onSelect("all");
    }
  }, [activeId, visibleCategories, onSelect]);

  const allProductCount = useMemo(
    () =>
      products.length > 0
        ? products.length
        : visibleCategories.reduce((s, c) => s + (c.productCount || 0), 0),
    [products, visibleCategories],
  );

  const allCategories = [
    { id: "all", name: "All", productCount: allProductCount },
    ...visibleCategories,
  ];

  return (
    <div className="flex min-w-0 items-center gap-2">
      <div className="-mx-1 flex min-w-0 flex-1 gap-2 overflow-x-auto overflow-y-hidden overscroll-x-contain px-1 pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {allCategories.map((c) => {
          const active = activeId === c.id;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onSelect(c.id)}
              className={`inline-flex h-8 shrink-0 items-center gap-1 rounded-full border px-2.5 text-[11px] font-semibold sm:h-auto sm:gap-1.5 sm:px-4 sm:py-2 sm:text-[14px] sm:font-medium ${
                active
                  ? "border-[#006c49] bg-[#006c49] text-white dark:border-[#6ffbbe] dark:bg-[#6ffbbe] dark:text-[#003527] sm:border-[#e5e7eb] sm:bg-white sm:text-foreground sm:shadow-[0_1px_2px_rgba(15,23,42,0.05)] sm:dark:border-white/[0.08] sm:dark:bg-[#141414] sm:dark:text-foreground"
                  : "border-[#d7ddd9] bg-white text-foreground dark:border-white/15 dark:bg-[#141414] sm:border-[#e5e7eb] sm:bg-white/80 sm:text-muted-foreground"
              }`}
            >
              <span>{c.name}</span>
              {c.productCount !== undefined && (
                <span
                  className={`min-w-[1.25rem] rounded-full px-1.5 py-0.5 text-center text-[10px] font-semibold tabular-nums sm:min-w-[1.5rem] sm:px-2 sm:text-[12px] ${
                    active
                      ? "bg-white/20 text-white sm:bg-[#006c49]/12 sm:text-[#006c49] dark:sm:bg-[#6ffbbe]/15 dark:sm:text-[#6ffbbe]"
                      : "bg-[#e5e7eb] text-foreground dark:bg-[#262626]"
                  }`}
                >
                  {c.productCount}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {showQuickAddProduct && onQuickAddProduct ? (
        <button
          type="button"
          onClick={onQuickAddProduct}
          className="inline-flex h-8 min-w-8 shrink-0 items-center justify-center gap-2 rounded-full border border-[#e5e7eb] bg-white px-2 text-[13px] font-medium text-foreground shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors hover:border-[#006c49]/35 hover:bg-[#006c49]/06 dark:border-white/[0.1] dark:bg-[#141414] dark:shadow-none dark:hover:border-[#6ffbbe]/35 dark:hover:bg-[#6ffbbe]/08 sm:h-10 sm:min-w-11 sm:px-4 sm:text-[14px]"
          title="Add product"
        >
          <Plus className="size-[18px] text-[#006c49] dark:text-[#6ffbbe]" strokeWidth={2} aria-hidden />
          <span className="hidden sm:inline">Add product</span>
        </button>
      ) : null}
    </div>
  );
}
