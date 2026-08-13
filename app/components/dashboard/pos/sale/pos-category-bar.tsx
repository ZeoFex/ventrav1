"use client";

import { useEffect, useMemo } from "react";
import { Plus } from "lucide-react";
import { type CategoryRow, type ProductRow } from "../../products/types";

function productSellableStock(p: ProductRow): number {
  if (p.variations?.length) {
    return p.variations.reduce((sum, v) => {
      const avail = v.stockAvailable ?? v.stock;
      return sum + Math.max(0, Number(avail) || 0);
    }, 0);
  }
  return Math.max(0, Number(p.stockAvailable ?? p.stock) || 0);
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
      .filter((c) => c.stockQty > 0)
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
              className={`tap-target inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-[13px] font-medium transition-[background-color,box-shadow,border-color] sm:px-4 sm:py-2 sm:text-[14px] ${active
                ? "border-[#e5e7eb] bg-white text-foreground shadow-[0_1px_2px_rgba(15,23,42,0.05)] dark:border-white/[0.08] dark:bg-[#141414] dark:shadow-none"
                : "border-[#e5e7eb] bg-white/80 text-muted-foreground hover:border-[#d1d5db] hover:text-foreground dark:border-white/[0.1] dark:bg-transparent dark:hover:border-white/[0.15]"
                }`}
            >
              <span>{c.name}</span>
              {c.productCount !== undefined && (
                <span
                  className={`min-w-[1.5rem] rounded-full px-2 py-0.5 text-center text-[11px] font-semibold tabular-nums sm:text-[12px] ${active
                    ? "bg-[#006c49]/12 text-[#006c49] dark:bg-[#6ffbbe]/15 dark:text-[#6ffbbe]"
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
          className="tap-target inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full border border-[#e5e7eb] bg-white px-4 text-[13px] font-medium text-foreground shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-colors hover:border-[#006c49]/35 hover:bg-[#006c49]/06 dark:border-white/[0.1] dark:bg-[#141414] dark:shadow-none dark:hover:border-[#6ffbbe]/35 dark:hover:bg-[#6ffbbe]/08 sm:text-[14px]"
          title="Add product"
        >
          <Plus className="size-[18px] text-[#006c49] dark:text-[#6ffbbe]" strokeWidth={2} aria-hidden />
          <span className="hidden sm:inline">Add product</span>
        </button>
      ) : null}
    </div>
  );
}
