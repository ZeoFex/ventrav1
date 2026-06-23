"use client";

import { useState, useMemo } from "react";
import { Plus, Loader2, Megaphone, Trash2, Edit2, Search } from "lucide-react";
import { MarketingPageShell } from "./marketing-page-shell";
import { useDiscounts } from "./discounts-data-hooks";
import { useBranchContext } from "../branch-context";
import { useProducts } from "../products/products-data-hooks";

export function DiscountsView() {
  const { branchId } = useBranchContext();
  const { discounts = [], isLoading, mutate } = useDiscounts();
  const { products = [] } = useProducts();
  const [open, setOpen] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<any>(null);
  const [deletingDiscount, setDeletingDiscount] = useState<any>(null);

  // Form states
  const [name, setName] = useState("");
  const [type, setType] = useState<"percentage" | "fixed">("percentage");
  const [value, setValue] = useState("");
  const [autoApply, setAutoApply] = useState(false);
  const [minOrderValueGhs, setMinOrderValueGhs] = useState("");
  const [productIds, setProductIds] = useState<string[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [limitToProducts, setLimitToProducts] = useState(false);

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p: { name: string; sku?: string }) =>
      p.name.toLowerCase().includes(q) || (p.sku ?? "").toLowerCase().includes(q),
    );
  }, [products, productSearch]);

  function toggleProduct(id: string) {
    setProductIds((prev) =>
      prev.includes(id) ? prev.filter((pid) => pid !== id) : [...prev, id],
    );
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName || !value || isSaving) return;

    setIsSaving(true);
    try {
      const mode = editingDiscount ? "PUT" : "POST";
      const body = {
        id: editingDiscount?.id,
        name: trimmedName,
        type,
        value,
        autoApply,
        minOrderValueGhs: autoApply ? minOrderValueGhs : null,
        productIds: limitToProducts ? productIds : null,
        isActive: true,
      };

      const url = editingDiscount ? `/api/discounts/${editingDiscount.id}` : "/api/discounts";

      const res = await fetch(url, {
        method: mode,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("Failed");

      mutate();
      closeModal();
    } catch {
      alert(`Error ${editingDiscount ? "updating" : "adding"} discount.`);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!deletingDiscount || isDeleting) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/discounts/${deletingDiscount.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");

      mutate();
      setDeletingDiscount(null);
    } catch {
      alert("Error deleting discount.");
    } finally {
      setIsDeleting(false);
    }
  }

  function openEdit(d: any) {
    setEditingDiscount(d);
    setName(d.name);
    setType(d.type);
    setValue(d.value);
    setAutoApply(d.autoApply);
    setMinOrderValueGhs(d.minOrderValueGhs || "");
    const ids = Array.isArray(d.productIds) ? d.productIds : [];
    setProductIds(ids);
    setLimitToProducts(ids.length > 0);
    setProductSearch("");
    setOpen(true);
  }

  function closeModal() {
    setOpen(false);
    setEditingDiscount(null);
    setName("");
    setType("percentage");
    setValue("");
    setAutoApply(false);
    setMinOrderValueGhs("");
    setProductIds([]);
    setLimitToProducts(false);
    setProductSearch("");
  }

  return (
    <MarketingPageShell
      title="Discounts & Promotions"
      description="Create seasonal sales, smart promotions, or fixed deals. These will be available during checkout."
      actions={
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={branchId === "all"}
          title={branchId === "all" ? "Select a specific branch to add discounts" : ""}
          className={`bg-[#003527] text-white px-4 py-2.5 rounded-xl font-semibold flex items-center gap-2 shadow-lg shadow-[#003527]/10 transition-all hover:bg-[#004d39] ${branchId === "all" ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <Plus className="size-4" /> Add discount
        </button>
      }
    >
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : discounts.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center border-2 border-dashed rounded-3xl">
          <Megaphone className="size-12 text-muted-foreground mb-4 opacity-20" />
          <h3 className="text-lg font-semibold">No discounts yet</h3>
          <p className="text-muted-foreground max-w-sm mx-auto">Create sales and promotions to boost your revenue. Apply them manually or automatically during checkout.</p>
          <button 
            onClick={() => setOpen(true)} 
            disabled={branchId === "all"}
            title={branchId === "all" ? "Select a branch to create discounts" : ""}
            className={`mt-6 bg-[#003527] text-white px-6 py-2 rounded-xl transition-all hover:bg-[#004d39] ${branchId === "all" ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            Create Discount
          </button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {discounts.map((d: any) => {
            return (
              <div key={d.id} className="p-5 rounded-2xl border bg-white flex flex-col justify-between dark:bg-[#111] dark:border-white/10 group hover:shadow-md transition-all">
                <div className="flex flex-col mb-4">
                  <div className="flex items-start justify-between">
                    <span className="font-bold text-[16px] truncate">{d.name}</span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-muted text-muted-foreground uppercase tracking-wider">
                      {d.autoApply ? "Auto" : "Manual"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="font-extrabold text-[22px] text-[#006c49] dark:text-[#6ffbbe]">
                      {d.type === 'fixed' ? `GH₵${d.value}` : `${d.value}%`}
                    </span>
                    <span className="text-sm font-medium text-muted-foreground">off</span>
                  </div>
                  {Array.isArray(d.productIds) && d.productIds.length > 0 && (
                    <p className="mt-2 text-[12px] text-muted-foreground">
                      Applies to {d.productIds.length} selected {d.productIds.length === 1 ? "product" : "products"}
                    </p>
                  )}
                </div>
                
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity border-t pt-3 dark:border-white/5 mt-auto">
                  <button
                    onClick={() => openEdit(d)}
                    className="flex-1 flex justify-center items-center py-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors bg-muted/20 rounded-lg"
                  >
                    <Edit2 className="size-4 mr-1.5" /> Edit
                  </button>
                  <button
                    onClick={() => setDeletingDiscount(d)}
                    className="flex-1 flex justify-center items-center py-1.5 text-sm font-semibold text-red-500 hover:text-red-600 transition-colors bg-red-500/5 hover:bg-red-500/10 rounded-lg"
                  >
                    <Trash2 className="size-4 mr-1.5" /> Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Save Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative z-10 w-full max-w-[28rem] rounded-2xl border bg-white shadow-2xl dark:bg-[#141414] overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex-1 overflow-y-auto px-6 py-6 scrollbar-hide">
              <h2 className="text-xl font-bold mb-6 font-[family-name:var(--font-display)]">{editingDiscount ? "Edit Discount" : "New Discount"}</h2>
              
              <form id="discount-form" onSubmit={handleSave} className="space-y-6">
                
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold">Promotion Name</label>
                  <input required autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Summer Sale, Student Discount" className="w-full p-3 rounded-xl border bg-transparent outline-none ring-primary/20 focus:ring-4 focus:border-primary/40 transition-all font-medium" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold">Type</label>
                    <div className="flex rounded-xl p-1 border bg-muted/30">
                      <button type="button" onClick={() => setType("percentage")} className={`flex-1 text-[13px] font-semibold py-1.5 rounded-lg transition-all ${type === "percentage" ? "bg-white shadow-sm dark:bg-[#1a1a1a]" : "text-muted-foreground hover:text-foreground"}`}>Percentage</button>
                      <button type="button" onClick={() => setType("fixed")} className={`flex-1 text-[13px] font-semibold py-1.5 rounded-lg transition-all ${type === "fixed" ? "bg-white shadow-sm dark:bg-[#1a1a1a]" : "text-muted-foreground hover:text-foreground"}`}>Fixed Hint</button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold">Value {type === 'percentage' ? '(%)' : '(GH₵)'}</label>
                    <input required type="number" step="0.01" min="0" value={value} onChange={(e) => setValue(e.target.value)} placeholder={type === 'percentage' ? "10" : "50"} className="w-full p-2.5 rounded-xl border bg-transparent font-medium" />
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-primary/20 bg-primary/5">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <div className="flex h-5 items-center mt-0.5">
                      <input type="checkbox" checked={autoApply} onChange={(e) => setAutoApply(e.target.checked)} className="size-4 rounded border-primary ring-offset-background text-primary focus:ring-2 focus:ring-primary focus:ring-offset-2 appearance-none checked:bg-primary checked:border-primary checked:after:content-['✓'] checked:after:text-white checked:after:text-xs checked:after:flex checked:after:justify-center checked:after:items-center" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-foreground">Auto-apply at checkout</span>
                      <span className="text-xs font-medium text-muted-foreground leading-relaxed mt-0.5">The system will automatically apply this discount if requirements are met.</span>
                    </div>
                  </label>
                  
                  {autoApply && (
                    <div className="mt-4 pt-4 border-t border-primary/10">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex justify-between">
                          Minimum Order Value
                          <span className="lowercase font-medium tracking-normal text-muted-foreground/60">(Optional)</span>
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">GH₵</span>
                          <input type="number" step="0.01" min="0" value={minOrderValueGhs} onChange={(e) => setMinOrderValueGhs(e.target.value)} placeholder="0.00" className="w-full py-2.5 pl-10 pr-4 rounded-xl border bg-white dark:bg-[#1a1a1a] font-medium" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-4 rounded-xl border bg-muted/20">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <div className="flex h-5 items-center mt-0.5">
                      <input
                        type="checkbox"
                        checked={limitToProducts}
                        onChange={(e) => {
                          setLimitToProducts(e.target.checked);
                          if (!e.target.checked) setProductIds([]);
                        }}
                        className="size-4 rounded border-primary"
                      />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-foreground">Limit to specific products</span>
                      <span className="text-xs font-medium text-muted-foreground leading-relaxed mt-0.5">
                        When enabled, this discount only applies to matching items in the cart.
                      </span>
                    </div>
                  </label>

                  {limitToProducts && (
                    <div className="mt-4 space-y-3 border-t border-[#e5e7eb] pt-4 dark:border-white/10">
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                          type="search"
                          value={productSearch}
                          onChange={(e) => setProductSearch(e.target.value)}
                          placeholder="Search products…"
                          className="w-full rounded-xl border bg-white py-2.5 pl-10 pr-3 text-[14px] outline-none dark:bg-[#1a1a1a]"
                        />
                      </div>
                      <div className="max-h-40 overflow-y-auto space-y-1 rounded-xl border p-2 dark:border-white/10">
                        {filteredProducts.length === 0 ? (
                          <p className="px-2 py-3 text-center text-[13px] text-muted-foreground">No products found</p>
                        ) : (
                          filteredProducts.map((p: { id: string; name: string; sku?: string }) => (
                            <label
                              key={p.id}
                              className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-2 hover:bg-muted/40"
                            >
                              <input
                                type="checkbox"
                                checked={productIds.includes(p.id)}
                                onChange={() => toggleProduct(p.id)}
                                className="size-4 rounded"
                              />
                              <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{p.name}</span>
                              {p.sku && (
                                <span className="shrink-0 text-[11px] text-muted-foreground">{p.sku}</span>
                              )}
                            </label>
                          ))
                        )}
                      </div>
                      {productIds.length > 0 && (
                        <p className="text-[12px] font-medium text-muted-foreground">
                          {productIds.length} product{productIds.length === 1 ? "" : "s"} selected
                        </p>
                      )}
                    </div>
                  )}
                </div>

              </form>
            </div>
            
            <div className="p-4 border-t bg-muted/20 flex justify-end gap-2 shrink-0">
              <button type="button" onClick={closeModal} className="px-5 py-2.5 border rounded-xl font-semibold transition-all hover:bg-muted/50 bg-white dark:bg-[#1a1a1a]">Cancel</button>
              <button type="submit" form="discount-form" disabled={isSaving} className="bg-[#003527] text-white px-8 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-[#003527]/10 transition-all hover:brightness-110">
                {isSaving && <Loader2 className="size-4 animate-spin" />}
                {editingDiscount ? "Update" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingDiscount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeletingDiscount(null)} />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-red-500/20 bg-white p-6 shadow-xl dark:bg-[#141414]">
            <h2 className="text-xl font-bold mb-2">Delete Promotion</h2>
            <p className="text-muted-foreground text-[15px] mb-6 leading-relaxed">
              Are you sure you want to delete <span className="font-bold text-foreground">"{deletingDiscount.name}"</span>? It will no longer be available for new sales.
            </p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setDeletingDiscount(null)} className="px-5 py-2.5 border rounded-xl font-semibold transition-all hover:bg-muted/30">Cancel</button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-red-600 text-white px-8 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all hover:bg-red-700 shadow-lg shadow-red-600/20"
              >
                {isDeleting && <Loader2 className="size-4 animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </MarketingPageShell>
  );
}
