"use client";

import { useRef, useState } from "react";
import {
  History,
  ImageIcon,
  Info,
  Loader2,
  Minus,
  Plus,
  Printer,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import useSWR from "swr";
import { ProductsPageShell } from "./products-page-shell";
import { BarcodeHelpPanel } from "./barcode-help-panel";
import { BarcodeGridModal, type BarcodeLabelProduct } from "./barcode-grid-modal";
import { BarcodeItem } from "./product-barcode-preview";
import { CatalogProductImage } from "./catalog-product-image";
import { generateProductSku } from "./product-catalog-codes";
import { useBranchContext } from "../branch-context";
import { useUploadThing } from "@/app/lib/uploadthing";

export type BarcodeLabelRow = {
  id: string;
  productId: string | null;
  productName: string;
  labelName: string;
  labelDescription: string;
  imageSrc: string;
  sku: string;
  quantity: number;
  createdAt: string;
};

async function barcodeLabelsFetcher(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to load barcode history");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

function toLabelProduct(row: BarcodeLabelRow): BarcodeLabelProduct {
  return {
    id: row.id,
    name: row.labelName,
    description: row.labelDescription,
    sku: row.sku,
    imageSrc: row.imageSrc,
  };
}

export function ProductsBarcodesView() {
  const { branchId } = useBranchContext();
  const { data: history = [], isLoading: historyLoading, mutate } = useSWR<BarcodeLabelRow[]>(
    branchId !== "all" ? `/api/products/barcodes?b=${branchId}` : null,
    barcodeLabelsFetcher,
  );

  const [activeTab, setActiveTab] = useState<"generate" | "history">("generate");
  const [productName, setProductName] = useState("");
  const [labelDescription, setLabelDescription] = useState("");
  const [sku, setSku] = useState(() => generateProductSku());
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [printProducts, setPrintProducts] = useState<BarcodeLabelProduct[]>([]);
  const [printQuantities, setPrintQuantities] = useState<Record<string, number>>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { startUpload, isUploading } = useUploadThing("productImage");

  function resetForm() {
    setProductName("");
    setLabelDescription("");
    setSku(generateProductSku());
    setImagePreview(null);
    setSelectedFile(null);
    setQuantity(1);
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function openPrintModal(label: BarcodeLabelProduct, qty: number) {
    setPrintProducts([label]);
    setPrintQuantities({ [label.id]: qty });
    setIsPrintOpen(true);
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!productName.trim()) {
      toast.error("Enter the product name.");
      return;
    }
    if (!labelDescription.trim()) {
      toast.error("Description is required (e.g. volume, weight, pack size).");
      return;
    }
    if (!imagePreview) {
      toast.error("Product photo is required for the label.");
      return;
    }
    if (!sku.trim()) {
      toast.error("Generate a barcode number first.");
      return;
    }
    if (isSaving || isUploading) return;

    setIsSaving(true);
    try {
      let finalImageSrc = imagePreview;
      if (selectedFile) {
        const uploadRes = await startUpload([selectedFile]);
        if (!uploadRes?.[0]?.url) throw new Error("Image upload failed");
        finalImageSrc = uploadRes[0].url;
      }

      const res = await fetch("/api/products/barcodes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName: productName.trim(),
          labelDescription: labelDescription.trim(),
          imageSrc: finalImageSrc,
          sku: sku.trim().toUpperCase(),
          quantity,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to save barcode");
      }

      const saved = (await res.json()) as BarcodeLabelRow;
      await mutate();
      toast.success("Barcode saved. Print the label, then scan it when adding the product to your store.");

      openPrintModal(toLabelProduct({ ...saved, productName: productName.trim() }), quantity);
      resetForm();
      setActiveTab("history");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate barcode");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (deletingId) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/products/barcodes/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      await mutate();
      toast.success("Removed from history");
    } catch {
      toast.error("Could not delete barcode");
    } finally {
      setDeletingId(null);
    }
  }

  const canGenerate =
    productName.trim() && labelDescription.trim() && imagePreview && sku.trim();

  if (branchId === "all") {
    return (
      <ProductsPageShell
        title="Barcodes"
        description="Generate barcodes for locally made products and print labels."
      >
        <div className="rounded-2xl border border-dashed border-border p-12 text-center dark:border-white/10">
          <Printer className="mx-auto mb-4 size-10 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Select a branch</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose a specific branch from the header to generate and manage barcodes.
          </p>
        </div>
      </ProductsPageShell>
    );
  }

  return (
    <ProductsPageShell
      title="Barcodes"
      description="Generate printable barcodes for local products. Photo and description are saved so you can scan the label later on Add product to fill the form automatically."
    >
      <BarcodeHelpPanel className="mb-6" defaultOpen />

      <div className="mb-6 flex gap-2 border-b border-border dark:border-white/10">
        <button
          type="button"
          onClick={() => setActiveTab("generate")}
          className={`px-4 py-2.5 text-[14px] font-semibold border-b-2 transition-colors ${
            activeTab === "generate"
              ? "border-[#006c49] text-[#006c49] dark:border-[#6ffbbe] dark:text-[#6ffbbe]"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Generate
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("history")}
          className={`flex items-center gap-2 px-4 py-2.5 text-[14px] font-semibold border-b-2 transition-colors ${
            activeTab === "history"
              ? "border-[#006c49] text-[#006c49] dark:border-[#6ffbbe] dark:text-[#6ffbbe]"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <History className="size-4" />
          History
          {history.length > 0 ? (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium">
              {history.length}
            </span>
          ) : null}
        </button>
      </div>

      {activeTab === "generate" ? (
        <form onSubmit={handleGenerate} className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-semibold ml-1">Product name *</label>
              <input
                required
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="e.g. Auntie Ama's Palm Oil"
                className="w-full rounded-2xl border border-border bg-transparent p-3 text-[15px] outline-none focus:ring-4 focus:ring-[#003527]/5 focus:border-[#006c49]/40 dark:border-white/10"
              />
              <p className="ml-1 text-[12px] text-muted-foreground">
                Type the name — the product does not need to be in your catalog yet.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold ml-1">Product photo *</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border p-6 transition-colors hover:border-[#006c49]/40 hover:bg-muted/30 dark:border-white/10"
              >
                {imagePreview ? (
                  <CatalogProductImage
                    src={imagePreview}
                    alt="Label preview"
                    className="h-24 w-24 rounded-xl object-cover bg-white"
                  />
                ) : (
                  <ImageIcon className="size-10 text-muted-foreground" />
                )}
                <span className="text-[13px] font-medium text-muted-foreground">
                  {imagePreview ? "Change photo" : "Upload product photo"}
                </span>
              </button>
              <p className="ml-1 flex items-start gap-1.5 text-[12px] text-muted-foreground">
                <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                Use a photo with a <strong className="font-medium text-foreground">white background</strong> so
                the product shows clearly on printed labels and in your catalog later.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold ml-1">Description *</label>
              <textarea
                required
                value={labelDescription}
                onChange={(e) => setLabelDescription(e.target.value)}
                placeholder="e.g. 1 litre · sold by bottle · homemade"
                className="w-full rounded-2xl border border-border bg-transparent p-3 h-24 text-[15px] outline-none focus:ring-4 focus:ring-[#003527]/5 focus:border-[#006c49]/40 dark:border-white/10"
              />
              <p className="ml-1 text-[12px] text-muted-foreground">
                Saved for when you scan this barcode on Add product — volume, weight, pack size, etc.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold ml-1">Barcode number</label>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={sku}
                  className="flex-1 rounded-2xl border border-border bg-muted/30 p-3 font-mono text-[14px] outline-none dark:border-white/10"
                />
                <button
                  type="button"
                  onClick={() => setSku(generateProductSku())}
                  className="flex items-center justify-center rounded-2xl border border-border px-4 hover:bg-muted dark:border-white/10"
                  title="Generate new barcode number"
                >
                  <RefreshCw className="size-4" />
                </button>
              </div>
              <p className="ml-1 text-[12px] text-muted-foreground">
                Auto-generated. Print it on the label, then scan on Add product when you are ready to list it.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold ml-1">Print quantity</label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="flex size-10 items-center justify-center rounded-xl border border-border hover:bg-muted dark:border-white/10"
                >
                  <Minus className="size-4" />
                </button>
                <span className="min-w-[3ch] text-center text-lg font-semibold tabular-nums">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => q + 1)}
                  className="flex size-10 items-center justify-center rounded-xl border border-border hover:bg-muted dark:border-white/10"
                >
                  <Plus className="size-4" />
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={!canGenerate || isSaving || isUploading}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-[#003527] to-[#064e3b] px-6 py-3.5 text-[15px] font-bold text-white shadow-lg disabled:opacity-50"
            >
              {(isSaving || isUploading) && <Loader2 className="size-4 animate-spin" />}
              <Printer className="size-4" />
              Generate &amp; print
            </button>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold ml-1">Preview</h3>
            <div className="rounded-2xl border border-border bg-white p-6 dark:border-white/10 dark:bg-[#0a0a0a]">
              {productName.trim() && imagePreview ? (
                <div className="mx-auto max-w-[200px]">
                  <BarcodeItem
                    sku={sku}
                    name={productName}
                    description={labelDescription}
                    imageSrc={imagePreview}
                  />
                </div>
              ) : (
                <div className="flex h-48 flex-col items-center justify-center text-center text-muted-foreground">
                  <Printer className="mb-2 size-8 opacity-40" />
                  <p className="text-sm">Fill in the product name and photo to preview the label.</p>
                </div>
              )}
            </div>
            {productName.trim() ? (
              <dl className="grid gap-3 rounded-2xl border border-border bg-muted/20 p-4 text-[13px] dark:border-white/10">
                <div>
                  <dt className="text-muted-foreground">Barcode</dt>
                  <dd className="font-mono font-semibold">{sku}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Next step</dt>
                  <dd>
                    Print the label, then go to Add product and scan this barcode to load name, photo, and
                    description.
                  </dd>
                </div>
              </dl>
            ) : null}
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          {historyLoading ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          ) : history.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-12 text-center dark:border-white/10">
              <History className="mx-auto mb-4 size-10 text-muted-foreground" />
              <h3 className="text-lg font-semibold">No barcode history yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Generated labels appear here so you can reprint anytime.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab("generate")}
                className="mt-4 rounded-xl bg-[#003527] px-5 py-2.5 text-sm font-semibold text-white"
              >
                Generate your first label
              </button>
            </div>
          ) : (
            <div className="divide-y divide-border rounded-2xl border border-border dark:divide-white/10 dark:border-white/10">
              {history.map((row) => (
                <div
                  key={row.id}
                  className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-start gap-4">
                    <CatalogProductImage
                      src={row.imageSrc}
                      alt={row.labelName}
                      className="size-14 shrink-0 rounded-xl object-cover bg-white"
                    />
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{row.labelName}</p>
                      <p className="text-[13px] text-muted-foreground line-clamp-2">
                        {row.labelDescription}
                      </p>
                      <p className="mt-1 text-[12px] text-muted-foreground">
                        <span className="font-mono">{row.sku}</span>
                        {row.productId ? " · In catalog" : " · Not in catalog yet"}
                        {" · "}Qty {row.quantity}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {new Date(row.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {row.productId ? (
                      <a
                        href={`/dashboard/products/${row.productId}/edit`}
                        className="rounded-xl border border-border px-3 py-2 text-[13px] font-semibold hover:bg-muted dark:border-white/10"
                      >
                        View product
                      </a>
                    ) : (
                      <a
                        href="/dashboard/products/new"
                        className="rounded-xl border border-border px-3 py-2 text-[13px] font-semibold hover:bg-muted dark:border-white/10"
                      >
                        Add product
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => openPrintModal(toLabelProduct(row), row.quantity)}
                      className="flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-[13px] font-semibold hover:bg-muted dark:border-white/10"
                    >
                      <Printer className="size-4" />
                      Print
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(row.id)}
                      disabled={deletingId === row.id}
                      className="flex items-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-900/40 dark:hover:bg-red-950/30"
                    >
                      {deletingId === row.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Trash2 className="size-4" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <BarcodeGridModal
        isOpen={isPrintOpen}
        onClose={() => setIsPrintOpen(false)}
        products={printProducts}
        initialQuantities={printQuantities}
      />
    </ProductsPageShell>
  );
}
