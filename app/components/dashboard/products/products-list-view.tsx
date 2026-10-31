"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  Download, Package, Plus, Search, Trash2,
  Loader2,
} from "lucide-react";
import { ProductsPageShell } from "./products-page-shell";
import { ImportProductsModal } from "./import-products-modal";
import { SyncProgressModal } from "./sync-progress-modal";
import { BulkDeleteModal } from "./bulk-delete-modal";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import { CatalogProductImage } from "./catalog-product-image";
import { useProducts, useCategories } from "./products-data-hooks";
import { formatGhs, getCategoryName } from "@/app/lib/catalog-utils";
import { formatQuantity, unitShort } from "@/app/lib/product-units";
import { useBranchContext } from "../branch-context";
import { useBranches } from "../branches/branches-data-hooks";

function StatusBadge({ status }: { status: string }) {
  if (status === "archived") {
    return (
      <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
        Archived
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full bg-[#006c49]/12 px-2 py-0.5 text-[11px] font-semibold text-[#006c49] dark:bg-[#6ffbbe]/15 dark:text-[#6ffbbe]">
      Active
    </span>
  );
}

export function ProductsListView() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState<string>("all");
  const [tagId, setTagId] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Real data hooks
  const { products = [], isLoading: isProductsLoading, mutate: mutateProducts } = useProducts();
  const { categories = [] } = useCategories();

  const { branchId } = useBranchContext();
  const { branches = [] } = useBranches();
  const currentBranch = branches?.find?.((b: any) => b.id === branchId);
  const isMainBranch = currentBranch?.isMain;
  const showSyncButton = branchId !== "all" && !isMainBranch;
  const [isSyncing, setIsSyncing] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p: any) => {
      if (status !== "all" && p.status !== status) return false;
      if (categoryId !== "all" && p.categoryId !== categoryId) return false;
      if (tagId !== "all" && !p.tagIds?.includes(tagId)) return false;
      if (q) {
        const hit =
          p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
        if (!hit) return false;
      }
      return true;
    });
  }, [products, query, categoryId, tagId, status]);

  const isGloballyEmpty = products.length === 0 && !isProductsLoading;

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0 || isBulkDeleting) return;
    setIsBulkDeleting(true);
    try {
      const res = await fetch(`/api/products/bulk-delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Bulk delete failed");
      }
      
      toast.success(`${selectedIds.size} products deleted successfully`);
      await mutateProducts();
      setSelectedIds(new Set());
    } catch (err: any) {
      toast.error(err.message || "Error during bulk delete");
    } finally {
      setIsBulkDeleting(false);
      setIsBulkDeleteOpen(false);
    }
  };

  const handleImport = () => {
    mutateProducts();
  };

  const handleSyncMain = () => setIsSyncModalOpen(true);

  // Toggle selection of a product ID
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const copy = new Set(prev);
      if (copy.has(id)) copy.delete(id);
      else copy.add(id);
      return copy;
    });
  };

  const selectAll = () => {
    const allIds = filtered.map((p: any) => p.id);
    setSelectedIds(new Set(allIds));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  return (
    <ProductsPageShell
      fill
      title="Products"
      description="Manage your catalog and pricing."
      actions={
        <>
          {showSyncButton && (
            <button onClick={handleSyncMain} className="shrink-0 whitespace-nowrap btn-secondary px-3 py-2 rounded-xl border border-border flex items-center gap-1.5 text-[13px] font-medium sm:gap-2 sm:px-4 sm:py-2.5 sm:text-[14px]">
              <Download className="shrink-0 size-4" />
              Import from Main
            </button>
          )}
          <button 
            onClick={() => setIsImportModalOpen(true)} 
            disabled={branchId === "all"}
            title={branchId === "all" ? "Select a branch to import products" : ""}
            className={`shrink-0 whitespace-nowrap btn-secondary px-3 py-2 rounded-xl border border-border flex items-center gap-1.5 text-[13px] sm:gap-2 sm:px-4 sm:py-2.5 sm:text-[14px] ${branchId === "all" ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <Download className="shrink-0 size-4" /> Import
          </button>
          {branchId === "all" ? (
            <button
              disabled
              title="Select a specific branch to add products"
              className="shrink-0 whitespace-nowrap bg-muted text-muted-foreground px-3 py-2 rounded-xl font-semibold flex items-center gap-1.5 text-[13px] cursor-not-allowed opacity-50 sm:gap-2 sm:px-5 sm:py-2.5 sm:text-[14px]"
            >
              <Plus className="shrink-0 size-4" /> Add
            </button>
          ) : (
            <Link href="/dashboard/products/new" className="shrink-0 whitespace-nowrap bg-[#003527] bg-gradient-to-br from-[#003527] to-[#064e3b] text-white px-3 py-2 rounded-xl font-semibold flex items-center gap-1.5 text-[13px] shadow-sm sm:gap-2 sm:px-5 sm:py-2.5 sm:text-[14px]">
              <Plus className="shrink-0 size-4" /> Add
            </Link>
          )}
          {/* Bulk Delete Toolbar */}
          <AnimatePresence>
            {selectedIds.size > 0 && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex items-center gap-2 ml-auto"
              >
                <span className="text-sm font-medium bg-muted px-3 py-1.5 rounded-lg border">{selectedIds.size} selected</span>
                <button
                  onClick={() => setIsBulkDeleteOpen(true)}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl font-semibold flex items-center gap-2 transition-colors shadow-sm"
                  disabled={isBulkDeleting}
                >
                  <Trash2 className="size-4" />
                  Delete
                </button>
                <button onClick={deselectAll} className="px-4 py-2 rounded-xl border font-medium hover:bg-muted/50 transition-colors">Clear</button>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      }
    >
      <ImportProductsModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={handleImport}
      />
      <SyncProgressModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        onComplete={() => mutateProducts()}
        type="products"
      />
      <BulkDeleteModal
        isOpen={isBulkDeleteOpen}
        onClose={() => setIsBulkDeleteOpen(false)}
        onConfirm={handleBulkDelete}
        count={selectedIds.size}
        isDeleting={isBulkDeleting}
      />

      <div className="sticky top-0 z-20 shrink-0 -mx-4 mb-2 flex flex-col gap-2 border-b border-border/70 bg-background/95 px-4 py-2 backdrop-blur-md sm:mb-3 sm:flex-row sm:-mx-6 sm:gap-3 sm:px-6 sm:py-3">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground shrink-0" />
          <input
            placeholder="Search catalog..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-xl border border-border bg-white py-2.5 pl-9 pr-3 text-[15px] outline-none focus:ring-2 focus:ring-[#003527]/5 dark:bg-[#141414] dark:border-white/10"
          />
        </div>
        <div className="flex gap-2 sm:gap-3 shrink-0 min-w-0 w-full sm:w-auto">
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="flex-1 sm:flex-none rounded-xl border border-border bg-background px-3 py-2.5 text-[14px] text-foreground outline-none dark:bg-[#141414] dark:border-white/10 min-w-0 truncate">
            <option value="all">Categories</option>
            {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="flex-1 sm:flex-none rounded-xl border border-border bg-background px-3 py-2.5 text-[14px] text-foreground outline-none dark:bg-[#141414] dark:border-white/10 min-w-0 truncate">
            <option value="all">Status</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:pb-4">
      {isProductsLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : isGloballyEmpty ? (
        <div className="flex flex-col items-center py-16 text-center border-2 border-dashed rounded-3xl">
          <Package className="size-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold">No products yet</h3>
          <p className="text-muted-foreground text-sm">Start by adding your first item.</p>
          <Link href="/dashboard/products/new" className="mt-4 bg-[#003527] text-white px-6 py-2 rounded-xl font-medium">Add Product</Link>
        </div>
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="grid grid-cols-1 w-full min-w-0 gap-4 sm:hidden pb-10">
            {filtered.map((p: any) => (
              <div key={p.id} className="rounded-2xl border border-border bg-white p-4 dark:bg-[#111] dark:border-white/10 shadow-sm flex w-full min-w-0 overflow-hidden">
                <input
                  type="checkbox"
                  checked={selectedIds.has(p.id)}
                  onChange={() => toggleSelect(p.id)}
                  className="mr-3 mt-1.5 size-4 shrink-0 appearance-none rounded border border-muted-foreground/30 checked:bg-[#006c49] checked:border-[#006c49] dark:checked:bg-[#6ffbbe] dark:checked:border-[#6ffbbe]"
                />
                <Link href={`/dashboard/products/${p.id}`} className="flex min-w-0 flex-1 gap-3.5">
                  <div className="size-[4.5rem] shrink-0 rounded-xl bg-muted overflow-hidden relative border dark:border-white/5">
                    {p.imageSrc ? (
                      <CatalogProductImage
                        src={p.imageSrc}
                        alt={p.name}
                        className="absolute inset-0 size-full object-cover"
                      />
                    ) : (
                      <span className="flex items-center justify-center h-full text-lg font-bold opacity-30 uppercase">{p.name[0]}</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 flex flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-semibold text-[15px] leading-tight truncate">{p.name}</h4>
                      <div className="shrink-0"><StatusBadge status={p.status} /></div>
                    </div>
                    <p className="text-[12px] text-muted-foreground mt-1 font-mono truncate">{p.sku}</p>
                    <div className="mt-auto pt-2 flex items-center justify-between gap-2">
                      <p className="font-bold text-[#006c49] dark:text-[#6ffbbe] tabular-nums whitespace-nowrap">
                        {formatGhs(Number(p.priceGhs))}
                        {unitShort(p.unit) && (
                          <span className="ml-1 text-[11px] font-medium text-muted-foreground">/ {unitShort(p.unit)}</span>
                        )}
                      </p>
                      <p className="text-[12px] text-muted-foreground whitespace-nowrap">Stock: <span className="font-semibold text-foreground">{formatQuantity(p.stock, p.unit)}</span></p>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>

          {/* Table View (Desktop) */}
          <div className="hidden sm:block overflow-hidden border rounded-2xl bg-white dark:bg-[#111] dark:border-white/10">
            <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="bg-muted/50 border-b">
                  <th className="px-4 py-3 font-semibold">
                    <input type="checkbox" onChange={e => e.target.checked ? selectAll() : deselectAll()} checked={selectedIds.size === filtered.length && filtered.length > 0} />
                  </th>
                  <th className="px-4 py-3 font-semibold">Product</th>
                  <th className="px-4 py-3 font-semibold">Category</th>
                  <th className="px-4 py-3 font-semibold text-right">Price</th>
                  <th className="px-4 py-3 font-semibold text-right">Stock</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((p: any) => (
                  <tr
                    key={p.id}
                    className="cursor-pointer hover:bg-muted/30"
                    onClick={() => router.push(`/dashboard/products/${p.id}`)}
                  >
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={selectedIds.has(p.id)} onChange={() => toggleSelect(p.id)} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="size-10 rounded-lg bg-muted overflow-hidden relative border shrink-0">
                          {p.imageSrc ? (
                            <CatalogProductImage
                              src={p.imageSrc}
                              alt={p.name}
                              className="absolute inset-0 size-full object-cover"
                            />
                          ) : (
                            <span className="flex items-center justify-center h-full text-xs font-bold opacity-30 uppercase">{p.name[0]}</span>
                          )}
                        </div>
                        <span className="font-medium truncate">{p.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">{getCategoryName(categories, p.categoryId)}</td>
                    <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap">
                      {formatGhs(Number(p.priceGhs))}
                      {unitShort(p.unit) && (
                        <span className="ml-1 text-[11px] font-medium text-muted-foreground">/ {unitShort(p.unit)}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums whitespace-nowrap">{formatQuantity(p.stock, p.unit)}</td>
                    <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                  </tr>
                ))}
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
