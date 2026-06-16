"use client";

import { ScanLine, Plus } from "lucide-react";
import { type CategoryRow } from "../../products/types";
import { PosCategorySearchMorph } from "./pos-category-search-morph";
import { useSession } from "../../../auth/use-session";
import { UpgradeTooltip } from "../../sidebar/upgrade-tooltip";
import { canAccess } from "@/config/plan-feature-access";

export function PosCategoryBar({
  categories,
  activeId,
  onSelect,
  searchQuery,
  onSearchQueryChange,
  onOpenScan,
  onQuickAddProduct,
  showQuickAddProduct,
}: {
  categories: CategoryRow[];
  activeId: string;
  onSelect: (id: string) => void;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  onOpenScan: () => void;
  /** Optional: open quick-add product modal (POS register). */
  onQuickAddProduct?: () => void;
  showQuickAddProduct?: boolean;
}) {
  const allCategories = [
    { id: "all", name: "All", productCount: categories.reduce((s, c) => s + (c.productCount || 0), 0) },
    ...categories
  ];

  const { user } = useSession();
  const plan = user?.plan || "starter";
  const hasScanAccess = canAccess(
    plan,
    "pos-scan",
    user?.subscriptionStatus,
    user?.currentPeriodEnd,
  );

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
      <div className="-mx-1 flex min-w-0 flex-1 gap-2 overflow-x-auto overflow-y-hidden overscroll-x-contain px-1 pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {allCategories.map((c) => {
          const active = activeId === c.id;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onSelect(c.id)}
              className={`tap-target inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-[13px] font-medium transition-[background-color,box-shadow,border-color] sm:px-4 sm:py-2 sm:text-[14px] ${active
                ? "border-transparent bg-white text-foreground shadow-[0_1px_3px_rgba(0,0,0,0.06)] dark:border-white/[0.08] dark:bg-[#141414]"
                : "border-[#e5e7eb] bg-transparent text-muted-foreground hover:border-[#d1d5db] dark:border-white/[0.1] dark:hover:border-white/[0.15]"
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
      <div className="flex w-full min-w-0 shrink-0 flex-col gap-2 sm:flex-row sm:items-stretch sm:justify-end lg:ml-auto lg:w-auto lg:max-w-md">
        {showQuickAddProduct && onQuickAddProduct ? (
          <button
            type="button"
            onClick={onQuickAddProduct}
            className="tap-target inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full border border-[#e5e7eb] bg-white px-4 text-[13px] font-medium text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-colors hover:border-[#006c49]/35 hover:bg-[#006c49]/06 dark:border-white/[0.1] dark:bg-[#141414] dark:hover:border-[#6ffbbe]/35 dark:hover:bg-[#6ffbbe]/08 sm:h-10 sm:text-[14px]"
            title="Add product"
          >
            <Plus className="size-[18px] text-[#006c49] dark:text-[#6ffbbe]" strokeWidth={2} aria-hidden />
            Add product
          </button>
        ) : null}
        {hasScanAccess ? (
          <button
            type="button"
            onClick={onOpenScan}
            className="tap-target inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full border border-[#e5e7eb] bg-white px-4 text-[13px] font-medium text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-colors hover:border-[#006c49]/35 hover:bg-[#006c49]/06 dark:border-white/[0.1] dark:bg-[#141414] dark:hover:border-[#6ffbbe]/35 dark:hover:bg-[#6ffbbe]/08 sm:h-10 sm:text-[14px]"
          >
            <ScanLine className="size-[18px] text-[#006c49] dark:text-[#6ffbbe]" strokeWidth={2} aria-hidden />
            Scan
          </button>
        ) : (
          <UpgradeTooltip featureId="pos-scan">
            <button
              type="button"
              className="tap-target inline-flex h-10 shrink-0 cursor-not-allowed items-center justify-center gap-2 rounded-full border border-[#e5e7eb] bg-white px-4 text-[13px] font-medium text-muted-foreground opacity-70 shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-white/[0.1] dark:bg-[#141414] sm:h-10 sm:text-[14px]"
            >
              <ScanLine className="size-[18px]" strokeWidth={2} aria-hidden />
              Scan
            </button>
          </UpgradeTooltip>
        )}
        <div className="min-w-0 flex-1 sm:flex sm:min-w-[10rem] sm:justify-end">
          <PosCategorySearchMorph
            value={searchQuery}
            onChange={onSearchQueryChange}
          />
        </div>
      </div>
    </div>
  );
}
