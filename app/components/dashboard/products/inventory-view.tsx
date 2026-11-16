"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { AlertCircle, Loader2, Package, Search } from "lucide-react";
import { ProductsPageShell } from "./products-page-shell";
import { CatalogProductImage } from "./catalog-product-image";
import { useProducts, useCategories } from "./products-data-hooks";
import { formatGhs, getCategoryName } from "@/app/lib/catalog-utils";
import { formatQuantity } from "@/app/lib/product-units";
import { useBranchContext } from "../branch-context";

type StockFilter = "all" | "low" | "out";

function StockBadge({ stock, reorderAt }: { stock: number; reorderAt: number }) {
  if (stock <= 0) {
    return (
      <span className="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700 dark:bg-red-500/20 dark:text-red-400">
        Out
      </span>
    );
  }
  if (stock <= reorderAt) {
    return (
      <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:bg-amber-500/20 dark:text-amber-300">
        Low
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400">
      In stock
    </span>
  );
}

export function InventoryView() {
  const router = useRouter();
  const { branchId } = useBranchContext();
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState("all");
  const [stockFilter, setStockFilter] = useState<StockFilter>("all");
  const { products = [], isLoading: isProductsLoading } = useProducts();
  const { categories = [] } = useCategories();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p: any) => {
      const reorderAt = Number(p.reorderAt ?? 5);
      const stock = Number(p.stock ?? 0);
      if (stockFilter === "out" && stock > 0) return false;
      if (stockFilter === "low" && !(stock > 0 && stock <= reorderAt)) return false;
      if (categoryId !== "all" && p.categoryId !== categoryId) return false;
      if (q) {
        const category = getCategoryName(categories, p.categoryId).toLowerCase();
        const hit =
          String(p.name ?? "").toLowerCase().includes(q) ||
          String(p.sku ?? "").toLowerCase().includes(q) ||
          String(p.barcode ?? "").toLowerCase().includes(q) ||
          category.includes(q);
        if (!hit) return false;
      }
      return true;
    });
  }, [products, query, categoryId, stockFilter, categories]);

  const summary = useMemo(() => {
    let low = 0;
    let out = 0;
    let value = 0;
    for (const p of products as any[]) {
      const stock = Number(p.stock ?? 0);
      const reorderAt = Number(p.reorderAt ?? 5);
      if (stock <= 0) out += 1;
      else if (stock <= reorderAt) low += 1;
      value += Number(p.priceGhs ?? 0) * stock;
    }
    return { count: products.length, low, out, value };
  }, [products]);

  const isEmpty = products.length === 0 && !isProductsLoading;
  const noMatches = !isProductsLoading && !isEmpty && filtered.length === 0;

  return (
    <ProductsPageShell
      fill
      title="Stock"
      description="On-hand quantities and value."
      actions={
        <Link
          href="/dashboard/products"
          className="shrink-0 whitespace-nowrap rounded-xl border border-border px-4 py-2.5 text-[14px] font-medium hover:bg-muted/50"
        >
          Products
        </Link>
      }
    >
      <div className="sticky top-0 z-20 shrink-0 -mx-4 border-b border-border/70 bg-background px-4 py-3 sm:-mx-6 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 size-4 shrink-0 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder="Search stock…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-xl border border-border bg-white py-2.5 pl-9 pr-3 text-[15px] outline-none focus:ring-2 focus:ring-[#003527]/5 dark:border-white/10 dark:bg-[#141414]"
            />
          </div>
          <div className="flex w-full min-w-0 shrink-0 gap-2 sm:w-auto sm:gap-3">
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="min-w-0 flex-1 truncate rounded-xl border border-border bg-white px-3 py-2.5 text-[14px] outline-none sm:flex-none dark:border-white/10 dark:bg-[#141414]"
            >
              <option value="all">Categories</option>
              {categories.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value as StockFilter)}
              className="min-w-0 flex-1 truncate rounded-xl border border-border bg-white px-3 py-2.5 text-[14px] outline-none sm:flex-none dark:border-white/10 dark:bg-[#141414]"
            >
              <option value="all">All stock</option>
              <option value="low">Low stock</option>
              <option value="out">Out of stock</option>
            </select>
          </div>
        </div>
      </div>

      <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-3 lg:pb-4">
        <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <SummaryChip label="Items" value={String(summary.count)} />
          <SummaryChip label="Low" value={String(summary.low)} warn={summary.low > 0} />
          <SummaryChip label="Out" value={String(summary.out)} danger={summary.out > 0} />
          <SummaryChip label="Value" value={formatGhs(summary.value)} />
        </div>
        {isProductsLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="size-8 animate-spin text-muted-foreground" />
          </div>
        ) : isEmpty ? (
          <div className="flex flex-col items-center rounded-3xl border border-dashed py-20 text-center">
            <Package className="mb-4 size-12 opacity-20" />
            <h3 className="text-lg font-semibold">No inventory to track</h3>
            <p className="text-sm text-muted-foreground">Add products to see stock here.</p>
            {branchId === "all" ? (
              <button
                disabled
                title="Select a specific branch to add products"
                className="mt-6 cursor-not-allowed rounded-xl bg-muted px-6 py-2 font-medium text-muted-foreground opacity-50"
              >
                Add Product
              </button>
            ) : (
              <Link
                href="/dashboard/products/new"
                className="mt-6 rounded-xl bg-[#003527] px-6 py-2 font-medium text-white"
              >
                Add Product
              </Link>
            )}
          </div>
        ) : noMatches ? (
          <div className="rounded-3xl border bg-muted/20 p-16 text-center">
            <AlertCircle className="mx-auto mb-4 size-10 text-muted-foreground" />
            <h3 className="text-lg font-semibold">No matching items</h3>
            <p className="text-sm text-muted-foreground">Try a different name, SKU, or filter.</p>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setCategoryId("all");
                setStockFilter("all");
              }}
              className="mt-4 font-semibold text-[#006c49] underline dark:text-[#6ffbbe]"
            >
              Clear search
            </button>
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:hidden">
              {filtered.map((p: any) => {
                const stock = Number(p.stock ?? 0);
                const reorderAt = Number(p.reorderAt ?? 5);
                const value = Number(p.priceGhs ?? 0) * stock;
                return (
                  <Link
                    key={p.id}
                    href={`/dashboard/products/${p.id}`}
                    className="flex gap-3.5 overflow-hidden rounded-2xl border border-border bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#111]"
                  >
                    <div className="relative size-[4.5rem] shrink-0 overflow-hidden rounded-xl border bg-muted dark:border-white/5">
                      {p.imageSrc ? (
                        <CatalogProductImage
                          src={p.imageSrc}
                          alt={p.name}
                          className="absolute inset-0 size-full object-cover"
                        />
                      ) : (
                        <span className="flex h-full items-center justify-center text-lg font-bold uppercase opacity-30">
                          {String(p.name ?? "?")[0]}
                        </span>
                      )}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="truncate text-[15px] font-semibold leading-tight">{p.name}</h4>
                        <StockBadge stock={stock} reorderAt={reorderAt} />
                      </div>
                      <p className="mt-1 truncate text-[12px] text-muted-foreground">
                        {getCategoryName(categories, p.categoryId)}
                      </p>
                      <div className="mt-auto flex items-end justify-between gap-2 pt-2">
                        <p className="text-[13px] font-semibold tabular-nums">
                          {formatQuantity(stock, p.unit)}
                          <span className="ml-1 text-[11px] font-medium text-muted-foreground">
                            / {formatQuantity(reorderAt, p.unit)}
                          </span>
                        </p>
                        <p className="text-[13px] font-semibold tabular-nums text-[#006c49] dark:text-[#6ffbbe]">
                          {formatGhs(value)}
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            <div className="hidden overflow-hidden rounded-[1.25rem] border border-[#eef0f2] bg-surface-card shadow-[0_1px_3px_rgba(0,0,0,0.05)] sm:block dark:border-white/[0.08] dark:bg-[#111]">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-[13px]">
                  <thead className="sticky top-0 z-10">
                    <tr className="border-b border-[#f0f2f4] bg-[#fafafa] dark:border-white/[0.06] dark:bg-[#141414]">
                      <th className="px-4 py-3 font-semibold">Product</th>
                      <th className="px-4 py-3 font-semibold">Category</th>
                      <th className="px-4 py-3 text-right font-semibold">Stock</th>
                      <th className="px-4 py-3 text-right font-semibold">Reorder</th>
                      <th className="px-4 py-3 text-right font-semibold">Value</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0f2f4] dark:divide-white/[0.06]">
                    {filtered.map((p: any) => {
                      const stock = Number(p.stock ?? 0);
                      const reorderAt = Number(p.reorderAt ?? 5);
                      const value = Number(p.priceGhs ?? 0) * stock;
                      return (
                        <tr
                          key={p.id}
                          className="cursor-pointer hover:bg-[#fafafa]/80 dark:hover:bg-white/[0.03]"
                          onClick={() => router.push(`/dashboard/products/${p.id}`)}
                        >
                          <td className="px-4 py-3">
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="relative size-10 shrink-0 overflow-hidden rounded-lg border bg-muted">
                                {p.imageSrc ? (
                                  <CatalogProductImage
                                    src={p.imageSrc}
                                    alt={p.name}
                                    className="absolute inset-0 size-full object-cover"
                                  />
                                ) : (
                                  <span className="flex h-full items-center justify-center text-xs font-bold uppercase opacity-30">
                                    {String(p.name ?? "?")[0]}
                                  </span>
                                )}
                              </div>
                              <span className="truncate font-medium">{p.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {getCategoryName(categories, p.categoryId)}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold tabular-nums whitespace-nowrap">
                            {formatQuantity(stock, p.unit)}
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap text-muted-foreground">
                            {formatQuantity(reorderAt, p.unit)}
                          </td>
                          <td className="px-4 py-3 text-right font-medium tabular-nums whitespace-nowrap">
                            {formatGhs(value)}
                          </td>
                          <td className="px-4 py-3">
                            <StockBadge stock={stock} reorderAt={reorderAt} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </ProductsPageShell>
  );
}

function SummaryChip({
  label,
  value,
  warn,
  danger,
}: {
  label: string;
  value: string;
  warn?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface-card px-3 py-2 dark:bg-[#111]">
      <p className="text-[11px] font-semibold text-muted-foreground">{label}</p>
      <p
        className={`mt-0.5 truncate text-[13px] font-semibold tabular-nums sm:text-[14px] ${
          danger
            ? "text-red-600 dark:text-red-400"
            : warn
              ? "text-amber-700 dark:text-amber-300"
              : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}
