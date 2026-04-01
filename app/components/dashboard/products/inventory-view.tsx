"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Package, Loader2, AlertCircle } from "lucide-react";
import { ProductsPageShell } from "./products-page-shell";
import { useProducts, useCategories } from "./products-data-hooks";
import { formatGhs, getCategoryName } from "@/app/lib/catalog-utils";
import { useBranchContext } from "../branch-context";

function StockBadge({ stock, reorderAt }: { stock: number; reorderAt: number }) {
  if (stock <= 0) return (
    <span className="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-700 dark:bg-red-500/20 dark:text-red-400">
      Out of Stock
    </span>
  );
  if (stock <= reorderAt) return (
    <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
      Low Stock
    </span>
  );
  return (
    <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400">
      In Stock
    </span>
  );
}

export function InventoryView() {
  const { branchId } = useBranchContext();
  const [lowOnly, setLowOnly] = useState(false);
  const { products = [], isLoading: isProductsLoading } = useProducts();
  const { categories = [] } = useCategories();

  const filtered = useMemo(() => {
    if (!lowOnly) return products;
    return products.filter((p: any) => p.stock <= (p.reorderAt || 5));
  }, [products, lowOnly]);

  const isEmpty = products.length === 0 && !isProductsLoading;

  return (
    <ProductsPageShell
      title="Inventory"
      description="Track stock levels and reorder points live from your database."
      actions={
        <Link href="/dashboard/products" className="px-4 py-2 border rounded-xl font-medium">Product List</Link>
      }
    >
      <div className="mb-6">
        <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
          <input type="checkbox" checked={lowOnly} onChange={(e) => setLowOnly(e.target.checked)} className="rounded text-[#006c49]" />
          Only show low or out of stock items
        </label>
      </div>

      {isProductsLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : isEmpty ? (
        <div className="flex flex-col items-center py-20 text-center border border-dashed rounded-3xl">
          <Package className="size-12 opacity-20 mb-4" />
          <h3 className="text-lg font-bold">No inventory to track</h3>
          <p className="text-muted-foreground text-sm">Add products to see stock status here.</p>
          {branchId === "all" ? (
            <button
              disabled
              title="Select a specific branch to add products"
              className="mt-6 bg-muted text-muted-foreground px-6 py-2 rounded-xl font-medium cursor-not-allowed opacity-50"
            >
              Add Product
            </button>
          ) : (
            <Link href="/dashboard/products/new" className="mt-6 bg-[#003527] text-white px-6 py-2 rounded-xl">Add Product</Link>
          )}
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-16 text-center border rounded-3xl bg-muted/20">
          <AlertCircle className="size-10 mx-auto text-emerald-500 mb-4" />
          <h3 className="text-xl font-bold">Healthy Stock!</h3>
          <p className="text-muted-foreground">All your items are currently well-stocked. Great job!</p>
          <button onClick={() => setLowOnly(false)} className="mt-4 text-[#006c49] font-bold underline">Show all items</button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Mobile View: Cards */}
          <div className="grid gap-4 sm:hidden pb-10">
            {filtered.map((p: any) => (
              <div key={p.id} className="rounded-2xl border border-border bg-white p-5 dark:bg-[#111] dark:border-white/10 shadow-sm">
                <div className="flex items-start justify-between mb-3 border-b pb-3 dark:border-white/5">
                  <div>
                    <h4 className="font-bold text-[16px] leading-tight">{p.name}</h4>
                    <span className="text-[12px] text-muted-foreground mt-1 block">
                      {getCategoryName(categories, p.categoryId) || "Uncategorized"}
                    </span>
                  </div>
                  <StockBadge stock={p.stock} reorderAt={p.reorderAt} />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">In Stock</p>
                    <p className="text-[15px] font-bold tabular-nums">{p.stock}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">Reorder Point</p>
                    <p className="text-[15px] font-bold tabular-nums text-muted-foreground">{p.reorderAt}</p>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t dark:border-white/5">
                  <Link 
                    href={`/dashboard/products/${p.id}/edit`} 
                    className="flex w-full items-center justify-center py-2.5 rounded-xl bg-[#006c49]/5 text-[#006c49] text-[14px] font-bold hover:bg-[#006c49]/10 transition-colors"
                  >
                    Adjust Stock
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop View: Table */}
          <div className="hidden sm:block border rounded-2xl overflow-hidden shadow-sm bg-white dark:bg-[#111] dark:border-white/10">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-muted/50 border-b">
                  <th className="px-4 py-3 font-semibold">Product</th>
                  <th className="px-4 py-3 font-semibold">Category</th>
                  <th className="px-4 py-3 font-semibold text-right">In Stock</th>
                  <th className="px-4 py-3 font-semibold text-right">Reorder Point</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((p: any) => (
                  <tr key={p.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-semibold">{p.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{getCategoryName(categories, p.categoryId)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{p.stock}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{p.reorderAt}</td>
                    <td className="px-4 py-3"><StockBadge stock={p.stock} reorderAt={p.reorderAt} /></td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/dashboard/products/${p.id}/edit`} className="text-[#006c49] font-bold">Adjust</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-muted/30 p-4 rounded-xl border sm:rounded-none sm:border-x-0 sm:border-y-0 sm:border-t text-center text-xs text-muted-foreground">
            Total inventory value (estimated): <span className="font-bold text-foreground">{formatGhs(filtered.reduce((s: number, p: any) => s + (Number(p.priceGhs) * p.stock), 0))}</span>
          </div>
        </div>
      )}
    </ProductsPageShell>
  );
}
