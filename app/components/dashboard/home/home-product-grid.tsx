"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Store } from "lucide-react";
import { useProducts } from "../products/products-data-hooks";
import { useBranchContext } from "../branch-context";
import { type ProductRow } from "../products/types";
import { Skeleton } from "../ui/skeleton";
import { HomeCatalogCard } from "./home-catalog-card";
import {
  HomeVariationModal,
  sellableForLine,
  useHomeAddToCart,
} from "./home-cart-shared";

export function HomeProductGrid() {
  const { branchId } = useBranchContext();
  const { products = [], isLoading } = useProducts(branchId !== "all");
  const [search, setSearch] = useState("");
  const { handleAdd, variationProduct, setVariationProduct } = useHomeAddToCart();

  const catalog = useMemo(() => {
    const rows = (products as ProductRow[]).filter((p) => p.status !== "archived");
    const q = search.trim().toLowerCase();
    const filtered = q
      ? rows.filter((p) => {
          const haystack = [
            p.name,
            p.sku,
            ...(p.variations?.map((v) => [v.name, v.sku, v.barcode].filter(Boolean)) ?? []),
          ]
            .join(" ")
            .toLowerCase();
          return haystack.includes(q);
        })
      : rows;

    return [...filtered].sort((a, b) => {
      const aStock = sellableForLine(a) > 0 ? 1 : 0;
      const bStock = sellableForLine(b) > 0 ? 1 : 0;
      if (bStock !== aStock) return bStock - aStock;
      return a.name.localeCompare(b.name);
    });
  }, [products, search]);

  if (branchId === "all") {
    return null;
  }

  return (
    <>
      <section className="space-y-3" aria-label="Product catalog">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
              All products
            </h2>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              Tap + to add — full catalog for quick selling
            </p>
          </div>
          <Link
            href="/dashboard/products"
            className="shrink-0 text-[12px] font-semibold text-[#006c49] dark:text-[#6ffbbe]"
          >
            Manage
          </Link>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, SKU, or barcode…"
            className="h-11 w-full rounded-2xl border border-[#bfc9c3]/20 bg-surface-card pl-10 pr-4 text-[14px] outline-none focus:border-[#006c49]/40 focus:ring-4 focus:ring-[#006c49]/5 dark:border-white/[0.08] dark:bg-[#111]"
          />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[3/4] rounded-2xl" />
            ))}
          </div>
        ) : catalog.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border border-dashed px-6 py-12 text-center">
            <Store className="mb-3 size-8 text-muted-foreground/40" />
            <p className="text-[14px] font-medium text-foreground">No products found</p>
            <p className="mt-1 text-[13px] text-muted-foreground">
              {search ? "Try a different search term." : "Add products to start selling."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {catalog.map((product) => (
              <HomeCatalogCard
                key={product.id}
                product={product}
                availableStock={sellableForLine(product)}
                onAdd={() => handleAdd(product)}
              />
            ))}
          </div>
        )}
      </section>

      <HomeVariationModal
        product={variationProduct}
        onClose={() => setVariationProduct(null)}
        onSelect={(productId, variationId) => {
          const product = catalog.find((p) => p.id === productId);
          if (product) handleAdd(product, variationId);
        }}
      />
    </>
  );
}
