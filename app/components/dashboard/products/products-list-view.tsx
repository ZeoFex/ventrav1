"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Download, Package, Plus, Printer, Search, Trash2,
  FileSpreadsheet, FileText, Loader2
} from "lucide-react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { ProductsPageShell } from "./products-page-shell";
import { ImportProductsModal } from "./import-products-modal";
import { BarcodeGridModal } from "./barcode-grid-modal";
import { SyncProgressModal } from "./sync-progress-modal";
import { BulkDeleteModal } from "./bulk-delete-modal";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
import { type ProductRow } from "./types";
import { useProducts, useCategories, useTags } from "./products-data-hooks";
import { formatGhs, getCategoryName, getTagNames } from "@/app/lib/catalog-utils";
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
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState<string>("all");
  const [tagId, setTagId] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [deletingProduct, setDeletingProduct] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  // Bulk delete state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  // Real data hooks
  const { products = [], isLoading: isProductsLoading, mutate: mutateProducts } = useProducts();
  const { categories = [] } = useCategories();
  const { tags = [] } = useTags();

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

  const handleDelete = async () => {
    if (!deletingProduct || isDeleting) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/products?id=${deletingProduct.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");

      toast.success(`${deletingProduct.name} deleted successfully`);
      mutateProducts();
      
      // Remove from selected set if present
      setSelectedIds(prev => {
        const copy = new Set(prev);
        copy.delete(deletingProduct.id);
        return copy;
      });
      setDeletingProduct(null);
    } catch (err) {
      toast.error("Failed to delete product");
    } finally {
      setIsDeleting(false);
    }
  };

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

  const handleExportCSV = () => {
    if (filtered.length === 0) return;
    const exportData = filtered.map((p: any) => ({
      Name: p.name,
      SKU: p.sku,
      Category: getCategoryName(categories, p.categoryId),
      Tags: getTagNames(tags, p.tagIds || []).join(", "),
      Price: p.priceGhs,
      Stock: p.stock,
      Status: p.status,
    }));
    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `products_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  const handleExportExcel = () => {
    if (filtered.length === 0) return;
    const exportData = filtered.map((p: any) => ({
      Name: p.name,
      SKU: p.sku,
      Category: getCategoryName(categories, p.categoryId),
      Tags: getTagNames(tags, p.tagIds || []).join(", "),
      Price: p.priceGhs,
      Stock: p.stock,
      Status: p.status,
    }));
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Products");
    XLSX.writeFile(workbook, `products_${new Date().toISOString().split("T")[0]}.xlsx`);
  };

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
      title="Products"
      description="Manage your catalog and pricing."
      actions={
        <>
          {showSyncButton && (
            <button onClick={handleSyncMain} className="btn-secondary px-4 py-2.5 rounded-xl border border-border flex items-center gap-2 font-medium">
              <Download className="size-4" />
              Import from Main
            </button>
          )}
          <button onClick={handleExportCSV} className="btn-secondary px-4 py-2.5 rounded-xl border border-border flex items-center gap-2">
            <FileText className="size-4" /> CSV
          </button>
          <button onClick={handleExportExcel} className="btn-secondary px-4 py-2.5 rounded-xl border border-border flex items-center gap-2">
            <FileSpreadsheet className="size-4" /> Excel
          </button>
          <button 
            onClick={() => setIsImportModalOpen(true)} 
            disabled={branchId === "all"}
            title={branchId === "all" ? "Select a branch to import products" : ""}
            className={`btn-secondary px-4 py-2.5 rounded-xl border border-border flex items-center gap-2 text-[14px] ${branchId === "all" ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <Download className="size-4" /> Import
          </button>
          <button onClick={() => setIsBarcodeModalOpen(true)} className="btn-secondary px-4 py-2.5 rounded-xl border border-border flex items-center gap-2 text-[14px]">
            <Printer className="size-4" /> Barcodes
          </button>
          {branchId === "all" ? (
            <button
              disabled
              title="Select a specific branch to add products"
              className="bg-muted text-muted-foreground px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2 text-[14px] cursor-not-allowed opacity-50"
            >
              <Plus className="size-4" /> Add
            </button>
          ) : (
            <Link href="/dashboard/products/new" className="bg-[#003527] bg-gradient-to-br from-[#003527] to-[#064e3b] text-white px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2 text-[14px] shadow-sm">
              <Plus className="size-4" /> Add
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
      <BarcodeGridModal
        isOpen={isBarcodeModalOpen}
        onClose={() => setIsBarcodeModalOpen(false)}
        products={filtered.flatMap((p: any) => {
          const base = {
            id: p.id,
            name: p.name,
            sku: p.sku,
            barcode: p.barcode,
            priceGhs: p.priceGhs,
          };
          
          const vars = (p.variations || []).map((v: any) => ({
            id: v.id,
            name: `${p.name} (${v.name})`,
            sku: v.sku || p.sku,
            barcode: v.barcode || v.sku || p.sku,
            priceGhs: v.priceGhs || p.priceGhs,
          }));

          return [base, ...vars];
        })}
      />
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

      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            placeholder="Search catalog..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-xl border border-border bg-white py-2.5 pl-9 text-[15px] outline-none focus:ring-2 focus:ring-[#003527]/5 dark:bg-[#141414] dark:border-white/10"
          />
        </div>
        <div className="flex gap-2 sm:gap-3">
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="flex-1 sm:flex-none rounded-xl border border-border bg-white px-3 py-2.5 text-[14px] outline-none dark:bg-[#141414] dark:border-white/10">
            <option value="all">Categories</option>
            {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="flex-1 sm:flex-none rounded-xl border border-border bg-white px-3 py-2.5 text-[14px] outline-none dark:bg-[#141414] dark:border-white/10">
            <option value="all">Status</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

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
          <div className="grid gap-4 sm:hidden pb-10">
            {filtered.map((p: any) => (
              <div key={p.id} className="rounded-2xl border border-border bg-white p-4 dark:bg-[#111] dark:border-white/10 shadow-sm active:scale-[0.98] transition-transform flex items-start">
                <input type="checkbox" checked={selectedIds.has(p.id)} onChange={() => toggleSelect(p.id)} className="mr-2 mt-1" />
                <div className="flex gap-4 w-full">
                  <div className="size-16 shrink-0 rounded-xl bg-muted overflow-hidden relative border dark:border-white/5">
                    {p.imageSrc ? (
                      <Image src={p.imageSrc} alt="" fill className="object-cover" />
                    ) : (
                      <span className="flex items-center justify-center h-full text-sm font-bold opacity-30 uppercase">{p.name[0]}</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-semibold text-[15px] truncate">{p.name}</h4>
                      <StatusBadge status={p.status} />
                    </div>
                    <p className="text-[12px] text-muted-foreground mt-0.5 font-mono">{p.sku}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <p className="font-bold text-[#006c49] dark:text-[#6ffbbe]">{formatGhs(p.priceGhs)}</p>
                      <p className="text-[12px] text-muted-foreground">Stock: <span className="font-semibold text-foreground">{p.stock}</span></p>
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex gap-2 pt-4 border-t dark:border-white/5 w-full">
                  <Link href={`/dashboard/products/${p.id}/edit`} className="flex-1 flex justify-center py-2 text-[14px] font-semibold rounded-lg bg-surface-card border border-border dark:bg-white/5 dark:border-white/10">
                    Edit
                  </Link>
                  <button onClick={() => setDeletingProduct(p)} className="flex-1 py-2 text-[14px] font-semibold text-red-500 rounded-lg bg-red-500/5 border border-red-500/10">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Table View (Desktop) */}
          <div className="hidden sm:block overflow-hidden border rounded-2xl bg-white dark:bg-[#111] dark:border-white/10">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="bg-muted/50 border-b">
                  <th className="px-4 py-3 font-semibold">
                    <input type="checkbox" onChange={e => e.target.checked ? selectAll() : deselectAll()} checked={selectedIds.size === filtered.length && filtered.length > 0} />
                  </th>
                  <th className="px-4 py-3 font-semibold">Product</th>
                  <th className="px-4 py-3 font-semibold">SKU</th>
                  <th className="px-4 py-3 font-semibold">Category</th>
                  <th className="px-4 py-3 font-semibold text-right">Price</th>
                  <th className="px-4 py-3 font-semibold text-right">Stock</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((p: any) => (
                  <tr key={p.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={selectedIds.has(p.id)} onChange={() => toggleSelect(p.id)} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-lg bg-muted overflow-hidden relative border">
                          {p.imageSrc ? (
                            <Image src={p.imageSrc} alt="" fill className="object-cover" />
                          ) : (
                            <span className="flex items-center justify-center h-full text-xs font-bold opacity-30 uppercase">{p.name[0]}</span>
                          )}
                        </div>
                        <span className="font-medium">{p.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-muted-foreground">{p.sku}</td>
                    <td className="px-4 py-3">{getCategoryName(categories, p.categoryId)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatGhs(p.priceGhs)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{p.stock}</td>
                    <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <Link href={`/dashboard/products/${p.id}/edit`} className="text-[#006c49] font-medium mr-4">Edit</Link>
                      <button onClick={() => setDeletingProduct(p)} className="text-destructive font-medium">Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {/* Delete Confirmation Modal */}
      {deletingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeletingProduct(null)} />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-red-500/20 bg-white p-6 shadow-xl dark:bg-[#141414]">
            <h2 className="text-lg font-bold mb-1">Delete Product</h2>
            <p className="text-muted-foreground text-sm mb-6">
              Are you sure you want to delete <span className="font-bold text-foreground">"{deletingProduct.name}"</span>? This will remove it from the catalog.
            </p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setDeletingProduct(null)} className="px-4 py-2 border rounded-xl font-semibold">Cancel</button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-red-600 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 transition-all hover:bg-red-700 shadow-lg shadow-red-600/20"
              >
                {isDeleting && <Loader2 className="size-4 animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </ProductsPageShell>
  );
}
