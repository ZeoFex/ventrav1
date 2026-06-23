"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ImageIcon, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import useSWR, { useSWRConfig } from "swr";
import { generateProductSku } from "../../products/product-catalog-codes";
import { type CategoryRow, type ProductRow } from "../../products/types";
import { useUploadThing } from "@/app/lib/uploadthing";
import {
  DEFAULT_PRODUCT_UNIT,
  PRODUCT_UNITS,
  getUnit,
} from "@/app/lib/product-units";
import type { GlobalBarcodePrefill } from "@/app/lib/pos/pending-product-barcode";

type PosCreateProductFromScanModalProps = {
  open: boolean;
  barcode: string;
  globalPrefill?: GlobalBarcodePrefill | null;
  onClose: () => void;
  /** Called after product is saved — typically add to cart. */
  onProductCreated: (product: ProductRow) => void;
};

async function categoriesFetcher(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to load categories");
  return res.json() as Promise<CategoryRow[]>;
}

function slugifyName(name: string): string {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 120) || `product-${Date.now().toString(36)}`
  );
}

export function PosCreateProductFromScanModal({
  open,
  barcode,
  globalPrefill,
  onClose,
  onProductCreated,
}: PosCreateProductFromScanModalProps) {
  const { mutate } = useSWRConfig();
  const { data: categories = [] } = useSWR<CategoryRow[]>(
    open ? "/api/categories" : null,
    categoriesFetcher,
  );
  const { startUpload, isUploading } = useUploadThing("productImage");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [stock, setStock] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [unitSelect, setUnitSelect] = useState(DEFAULT_PRODUCT_UNIT);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "success" | "error">("idle");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setName(globalPrefill?.productName ?? "");
    setDescription(globalPrefill?.description ?? "");
    setImagePreview(globalPrefill?.imageSrc ?? null);
    setSelectedFile(null);
    setPrice("");
    setCostPrice("");
    setStock("");
    setCategoryId("");
    setUnitSelect(globalPrefill?.unit?.toLowerCase() || DEFAULT_PRODUCT_UNIT);
    setSaveState("idle");
  }, [open, barcode, globalPrefill]);

  if (!open) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    const priceNum = Number(price);
    const costTrim = costPrice.trim();
    const costNum = costTrim === "" ? null : Number(costTrim);
    const stockNum = Math.max(0, Math.floor(Number(stock) || 0));

    if (!trimmedName) {
      toast.error("Enter a product name.");
      return;
    }
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      toast.error("Enter a valid selling price.");
      return;
    }
    if (costNum != null && (!Number.isFinite(costNum) || costNum < 0)) {
      toast.error("Enter a valid cost price or leave it blank.");
      return;
    }

    setSaving(true);
    setSaveState("saving");
    try {
      let finalImageSrc = imagePreview;
      if (selectedFile) {
        const uploadRes = await startUpload([selectedFile]);
        if (!uploadRes?.[0]?.url) throw new Error("Image upload failed");
        finalImageSrc = uploadRes[0].url;
      }

      const sku = generateProductSku();
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          slug: slugifyName(trimmedName),
          sku,
          barcode: barcode.trim(),
          description: description.trim() || null,
          priceGhs: String(priceNum),
          costPriceGhs: costNum != null ? String(costNum) : null,
          stock: stockNum,
          reorderAt: 5,
          categoryId: categoryId || null,
          status: "active",
          unit: unitSelect || DEFAULT_PRODUCT_UNIT,
          imageSrc: finalImageSrc,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Could not save product");
      }

      await mutate((key) => typeof key === "string" && key.startsWith("/api/products"));
      setSaveState("success");
      toast.success("Product saved and added to catalog");
      if (data.id) {
        onProductCreated({
          id: data.id,
          name: trimmedName,
          sku,
          barcode: barcode.trim(),
          priceGhs: priceNum,
          stock: stockNum,
          categoryId: categoryId || null,
          tagIds: [],
          reorderAt: 5,
          status: "active",
          description: description.trim(),
          imageSrc: finalImageSrc,
          unit: unitSelect,
        });
      }
      window.setTimeout(onClose, 600);
    } catch (err) {
      setSaveState("error");
      toast.error(err instanceof Error ? err.message : "Failed to save product");
    } finally {
      setSaving(false);
    }
  }

  const unitMeta = getUnit(unitSelect);

  return (
    <div className="fixed inset-0 z-[130] flex items-end justify-center bg-black/55 p-0 sm:items-center sm:p-4">
      <button type="button" className="absolute inset-0" aria-label="Close" onClick={onClose} />
      <div
        className="relative flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-[#e5e7eb] bg-white shadow-2xl dark:border-white/[0.1] dark:bg-[#111] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b px-4 py-3 dark:border-white/[0.08]">
          <div>
            <h2 className="text-[16px] font-semibold">Add as New Product</h2>
            <p className="font-mono text-[11px] text-muted-foreground">{barcode}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-muted">
            <X className="size-5" />
          </button>
        </div>

        {globalPrefill?.productName ? (
          <div className="shrink-0 border-b bg-[#006c49]/8 px-4 py-2.5 text-[12px] text-[#006c49] dark:bg-[#6ffbbe]/10 dark:text-[#6ffbbe]">
            Pre-filled from Ventra&apos;s shared barcode catalog
            {globalPrefill.sourceBusinessName
              ? ` · contributed by ${globalPrefill.sourceBusinessName}`
              : ""}
            . Review and set your prices before saving.
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="min-h-0 flex-1 overflow-y-auto px-4 py-4 space-y-4">
          <div className="space-y-2">
            <label className="text-[13px] font-semibold">Barcode</label>
            <input
              readOnly
              value={barcode}
              className="w-full rounded-xl border border-[#e5e7eb] bg-muted/40 px-3 py-2.5 font-mono text-[14px] dark:border-white/[0.12]"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[13px] font-semibold">Product name *</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-[#e5e7eb] px-3 py-2.5 text-[14px] outline-none focus:border-[#006c49] dark:border-white/[0.12] dark:bg-[#0a0a0a]"
              placeholder="e.g. Coke 1.25L"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[13px] font-semibold">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-[#e5e7eb] px-3 py-2.5 text-[14px] outline-none focus:border-[#006c49] dark:border-white/[0.12] dark:bg-[#0a0a0a]"
              placeholder="Size, pack, brand notes…"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-[13px] font-semibold">Selling price (GHS) *</label>
              <input
                required
                type="number"
                min={0}
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full rounded-xl border border-[#e5e7eb] px-3 py-2.5 text-[14px] dark:border-white/[0.12] dark:bg-[#0a0a0a]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[13px] font-semibold">Cost price (GHS)</label>
              <input
                type="number"
                min={0}
                step="0.01"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                className="w-full rounded-xl border border-[#e5e7eb] px-3 py-2.5 text-[14px] dark:border-white/[0.12] dark:bg-[#0a0a0a]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-[13px] font-semibold">Stock quantity</label>
              <input
                type="number"
                min={0}
                step={1}
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="w-full rounded-xl border border-[#e5e7eb] px-3 py-2.5 text-[14px] dark:border-white/[0.12] dark:bg-[#0a0a0a]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[13px] font-semibold">Unit</label>
              <select
                value={unitSelect}
                onChange={(e) => setUnitSelect(e.target.value)}
                className="w-full rounded-xl border border-[#e5e7eb] px-3 py-2.5 text-[14px] dark:border-white/[0.12] dark:bg-[#0a0a0a]"
              >
                {PRODUCT_UNITS.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </select>
              {unitMeta ? (
                <p className="text-[11px] text-muted-foreground">Sold per {unitMeta.short}</p>
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[13px] font-semibold">Category</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full rounded-xl border border-[#e5e7eb] px-3 py-2.5 text-[14px] dark:border-white/[0.12] dark:bg-[#0a0a0a]"
            >
              <option value="">Uncategorized</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[13px] font-semibold">Product image (optional)</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setSelectedFile(file);
                setImagePreview(URL.createObjectURL(file));
              }}
            />
            <div className="flex items-center gap-3">
              <div className="flex size-16 items-center justify-center overflow-hidden rounded-xl border bg-muted/30">
                {imagePreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imagePreview} alt="" className="size-full object-cover" />
                ) : (
                  <ImageIcon className="size-6 opacity-40" />
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-xl border px-3 py-2 text-[13px] font-medium hover:bg-muted dark:border-white/[0.12]"
              >
                Upload photo
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving || isUploading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-[#003527] to-[#064e3b] py-3.5 text-[15px] font-semibold text-white disabled:opacity-50"
          >
            {(saving || isUploading) && <Loader2 className="size-4 animate-spin" />}
            {saveState === "success" ? "Saved!" : "Save product"}
          </button>
        </form>
      </div>
    </div>
  );
}
