"use client";

import { LayoutGrid, Plus, ScanLine } from "lucide-react";
import { useSession } from "../../auth/use-session";
import { UpgradeTooltip } from "../sidebar/upgrade-tooltip";
import { canAccess } from "@/config/plan-feature-access";
import { usePosProductSearch } from "../pos/pos-product-search-context";
import { PosCategorySearchMorph } from "../pos/sale/pos-category-search-morph";
import { useCategories } from "../products/products-data-hooks";
import { HeaderBranchSelector } from "./header-branch-selector";

export function HeaderPosProductSearch() {
  const { searchQuery, setSearchQuery, openScan } = usePosProductSearch();
  const { user } = useSession();
  const plan = user?.plan || "starter";
  const hasScanAccess = canAccess(
    plan,
    "pos-scan",
    user?.subscriptionStatus,
    user?.currentPeriodEnd,
  );

  return (
    <div className="flex w-full min-w-0 items-center gap-2">
      <div className="min-w-0 flex-1">
        <PosCategorySearchMorph value={searchQuery} onChange={setSearchQuery} />
      </div>
      {hasScanAccess ? (
        <button
          type="button"
          onClick={openScan}
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-[#d7ddd9] bg-white text-muted-foreground outline-none transition-all hover:border-[#006c49]/40 hover:bg-surface-elevated hover:text-foreground dark:border-white/[0.1] dark:bg-[#141414] dark:hover:border-[#6ffbbe]/35 sm:size-11 sm:rounded-xl"
          aria-label="Scan barcode"
          title="Scan"
        >
          <ScanLine className="size-[1.125rem] text-[#006c49] dark:text-[#6ffbbe]" strokeWidth={1.75} />
        </button>
      ) : (
        <UpgradeTooltip featureId="pos-scan">
          <button
            type="button"
            className="inline-flex size-9 shrink-0 cursor-not-allowed items-center justify-center rounded-full border border-[#d7ddd9] bg-white text-muted-foreground opacity-70 dark:border-white/[0.1] dark:bg-[#141414] sm:size-11 sm:rounded-xl"
            aria-label="Scan barcode"
          >
            <ScanLine className="size-[1.125rem]" strokeWidth={1.75} />
          </button>
        </UpgradeTooltip>
      )}
    </div>
  );
}

export function HeaderPosCategories() {
  const { categories = [] } = useCategories();
  const { categoryId, setCategoryId, openQuickAdd } = usePosProductSearch();
  const { user } = useSession();
  const canQuickAdd =
    user?.role === "owner" ||
    Boolean(user?.permissions?.length && user.permissions.includes("product-list"));

  return (
    <div className="flex min-w-0 items-center gap-2">
      <div className="w-[8.25rem] shrink-0">
        <HeaderBranchSelector compact />
      </div>
      <div
        className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="tablist"
        aria-label="Product categories"
      >
        <button
          type="button"
          role="tab"
          aria-selected={categoryId === "all"}
          onClick={() => setCategoryId("all")}
          className={`inline-flex h-8 shrink-0 items-center gap-1 rounded-full border px-2.5 text-[11px] font-semibold ${
            categoryId === "all"
              ? "border-[#006c49] bg-[#006c49] text-white dark:border-[#6ffbbe] dark:bg-[#6ffbbe] dark:text-[#003527]"
              : "border-[#d7ddd9] bg-white text-[#14261e] dark:border-white/15 dark:bg-[#141414] dark:text-white"
          }`}
        >
          <LayoutGrid className="size-3" aria-hidden />
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            role="tab"
            aria-selected={categoryId === cat.id}
            onClick={() => setCategoryId(cat.id)}
            className={`inline-flex h-8 shrink-0 items-center rounded-full border px-2.5 text-[11px] font-semibold ${
              categoryId === cat.id
                ? "border-[#006c49] bg-[#006c49] text-white dark:border-[#6ffbbe] dark:bg-[#6ffbbe] dark:text-[#003527]"
                : "border-[#d7ddd9] bg-white text-[#14261e] dark:border-white/15 dark:bg-[#141414] dark:text-white"
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>
      {canQuickAdd ? (
        <button
          type="button"
          onClick={openQuickAdd}
          className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-[#d7ddd9] bg-white text-[#006c49] dark:border-white/15 dark:bg-[#141414] dark:text-[#6ffbbe]"
          aria-label="Add product"
          title="Add product"
        >
          <Plus className="size-3.5" strokeWidth={2.25} />
        </button>
      ) : null}
    </div>
  );
}
