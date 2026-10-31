"use client";

import { LayoutGrid, Search } from "lucide-react";
import { useCategories } from "../products/products-data-hooks";
import { useHomeCatalogFilter } from "../home/home-catalog-filter-context";
import { HeaderBranchSelector } from "./header-branch-selector";

export function HeaderHomeSearch() {
  const { searchQuery, setSearchQuery } = useHomeCatalogFilter();

  return (
    <div className="relative w-full min-w-0">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
      <input
        type="search"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search…"
        aria-label="Search products"
        className="h-9 w-full rounded-full border border-[#d7ddd9] bg-white pl-8 pr-3 text-[13px] outline-none focus:border-[#006c49]/40 dark:border-white/[0.1] dark:bg-[#141414]"
      />
    </div>
  );
}

export function HeaderHomeCategories() {
  const { categories = [] } = useCategories();
  const { categoryId, setCategoryId } = useHomeCatalogFilter();

  return (
    <div className="flex min-w-0 items-center gap-2">
      <div className="w-[8.25rem] shrink-0">
        <HeaderBranchSelector compact />
      </div>
      <div
        className="flex min-w-0 flex-1 gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
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
          className={`inline-flex h-8 shrink-0 items-center gap-1 rounded-full border px-2.5 text-[11px] font-semibold ${
            categoryId === null
              ? "border-[#006c49] bg-[#006c49] text-white dark:border-[#6ffbbe] dark:bg-[#6ffbbe] dark:text-[#003527]"
              : "border-[#d7ddd9] bg-white text-foreground dark:border-white/15 dark:bg-[#141414]"
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
                : "border-[#d7ddd9] bg-white text-foreground dark:border-white/15 dark:bg-[#141414]"
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>
    </div>
  );
}
