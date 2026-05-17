"use client";

import { useState, type FormEvent } from "react";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { generateProductSku } from "../../products/product-catalog-codes";
import { type CategoryRow } from "../../products/types";
import { useSWRConfig } from "swr";

function slugifyName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120) || `product-${Date.now().toString(36)}`;
}

export function PosQuickAddProductModal({
  open,
  onClose,
  categories,
}: {
  open: boolean;
  onClose: () => void;
  categories: CategoryRow[];
}) {
  const { mutate } = useSWRConfig();
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [cost, setCost] = useState("");
  const [stock, setStock] = useState("0");
  const [categoryId, setCategoryId] = useState<string>("");
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const n = name.trim();
    const priceNum = Number(price);
    const costTrim = cost.trim();
    const costNum = costTrim === "" ? null : Number(costTrim);
    const stockNum = Math.max(0, Math.floor(Number(stock) || 0));

    if (!n) {
      toast.error("Enter a product name.");
      return;
    }
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      toast.error("Enter a valid price.");
      return;
    }
    if (costNum != null && (!Number.isFinite(costNum) || costNum < 0)) {
      toast.error("Enter a valid cost or leave it blank.");
      return;
    }

    setSaving(true);
    try {
      const sku = generateProductSku();
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: n,
          slug: slugifyName(n),
          sku,
          priceGhs: String(priceNum),
          ...(costNum != null ? { costPriceGhs: String(costNum) } : {}),
          stock: stockNum,
          reorderAt: 0,
          categoryId: categoryId || null,
          status: "active",
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data?.error === "string" ? data.error : "Could not add product");
      }

      await mutate("/api/products");
      toast.success("Product added");
      setName("");
      setPrice("");
      setCost("");
      setStock("0");
      setCategoryId("");
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Could not add product");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-black/45 backdrop-blur-sm"
        aria-label="Close"
        onClick={() => !saving && onClose()}
      />
      <div className="relative w-full max-w-md rounded-3xl border border-[#eef0f2] bg-white p-6 shadow-2xl dark:border-white/[0.08] dark:bg-[#111]">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-foreground">Quick add product</h2>
            <p className="mt-1 text-[13px] text-muted-foreground">
              Creates an active product on this branch without leaving the register.
            </p>
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={() => onClose()}
            className="rounded-full p-2 text-muted-foreground hover:bg-muted disabled:opacity-50"
            aria-label="Close dialog"
          >
            <X className="size-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-[13px] font-medium text-muted-foreground">
              Name
            </label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-[#e5e7eb] bg-transparent px-3 py-2.5 text-[14px] focus:border-[#006c49] focus:outline-none focus:ring-1 focus:ring-[#006c49] dark:border-white/[0.12]"
              placeholder="e.g. Malta Guinness 330ml"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[13px] font-medium text-muted-foreground">
                Price (GHS)
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full rounded-xl border border-[#e5e7eb] bg-transparent px-3 py-2.5 text-[14px] focus:border-[#006c49] focus:outline-none focus:ring-1 focus:ring-[#006c49] dark:border-white/[0.12]"
              />
            </div>
            <div>
              <label className="mb-1 block text-[13px] font-medium text-muted-foreground">
                Cost (GHS, opt.)
              </label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                placeholder="COGS"
                className="w-full rounded-xl border border-[#e5e7eb] bg-transparent px-3 py-2.5 text-[14px] focus:border-[#006c49] focus:outline-none focus:ring-1 focus:ring-[#006c49] dark:border-white/[0.12]"
              />
            </div>
            <div className="col-span-2">
              <label className="mb-1 block text-[13px] font-medium text-muted-foreground">
                Stock
              </label>
              <input
                type="number"
                min={0}
                step={1}
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="w-full rounded-xl border border-[#e5e7eb] bg-transparent px-3 py-2.5 text-[14px] focus:border-[#006c49] focus:outline-none focus:ring-1 focus:ring-[#006c49] dark:border-white/[0.12]"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[13px] font-medium text-muted-foreground">
              Category (optional)
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full rounded-xl border border-[#e5e7eb] bg-transparent px-3 py-2.5 text-[14px] focus:border-[#006c49] focus:outline-none focus:ring-1 focus:ring-[#006c49] dark:border-white/[0.12] dark:bg-[#111]"
            >
              <option value="">Uncategorized</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#006c49] py-3 text-[14px] font-semibold text-white disabled:opacity-60 dark:bg-[#6ffbbe] dark:text-[#003527]"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            {saving ? "Saving…" : "Add product"}
          </button>
        </form>
      </div>
    </div>
  );
}
