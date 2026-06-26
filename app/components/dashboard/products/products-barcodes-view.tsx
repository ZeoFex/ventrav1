"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Globe,
  History,
  ImageIcon,
  Info,
  Loader2,
  Minus,
  Plus,
  Printer,
  RefreshCw,
  Save,
  Search,
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

export type GlobalBarcodeLabelRow = BarcodeLabelRow & {
  businessId: string;
  businessName: string;
  isOwnShop: boolean;
};

export type BarcodeProductSuggestion = {
  id: string;
  productName: string;
  description: string | null;
  imageSrc: string | null;
  sku: string | null;
  source: "barcode_label" | "global_catalog" | "inventory" | "master_catalog";
  sourceBusinessName: string | null;
  isOwnShop?: boolean;
};

function suggestionSourceLabel(source: BarcodeProductSuggestion["source"]) {
  switch (source) {
    case "barcode_label":
      return "Barcode label";
    case "global_catalog":
      return "Shared barcode";
    case "inventory":
      return "Shop inventory";
    case "master_catalog":
      return "Ventra catalog";
    default:
      return "Product";
  }
}

function mergeSuggestions(
  local: BarcodeProductSuggestion[],
  remote: BarcodeProductSuggestion[],
  limit = 10,
): BarcodeProductSuggestion[] {
  const seen = new Set<string>();
  const merged: BarcodeProductSuggestion[] = [];
  for (const item of [...local, ...remote]) {
    const key = item.productName.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
    if (merged.length >= limit) break;
  }
  return merged;
}

type TabId = "generate" | "history" | "catalog";

async function barcodeLabelsFetcher(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to load barcode history");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

async function catalogFetcher(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to search barcodes");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

async function suggestFetcher(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to load suggestions");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

function toLabelProduct(
  row: Pick<BarcodeLabelRow, "id" | "sku" | "imageSrc" | "productName" | "labelDescription">,
): BarcodeLabelProduct {
  return {
    id: row.id,
    name: row.productName,
    description: row.labelDescription,
    sku: row.sku,
    imageSrc: row.imageSrc,
  };
}

function clampPrintQty(n: number) {
  return Math.max(1, Math.min(99, Math.floor(n) || 1));
}

type BarcodeListRowProps = {
  row: BarcodeLabelRow | GlobalBarcodeLabelRow;
  printQty: number;
  onPrintQtyChange: (id: string, qty: number) => void;
  onPrint: () => void;
  onDelete?: () => void;
  deleting?: boolean;
  showShop?: boolean;
  showCatalogActions?: boolean;
};

function BarcodeListRow({
  row,
  printQty,
  onPrintQtyChange,
  onPrint,
  onDelete,
  deleting,
  showShop,
  showCatalogActions,
}: BarcodeListRowProps) {
  const globalRow = row as GlobalBarcodeLabelRow;

  return (
    <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
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
            {showShop && globalRow.businessName ? (
              <> · {globalRow.businessName}{globalRow.isOwnShop ? " (your shop)" : ""}</>
            ) : null}
            {!showShop && (
              <>
                {row.productId ? " · In catalog" : " · Not in catalog yet"}
                {" · "}Saved qty {row.quantity}
              </>
            )}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {new Date(row.createdAt).toLocaleString()}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 rounded-xl border border-border px-2 py-1 dark:border-white/10">
          <span className="text-[11px] text-muted-foreground">Print</span>
          <button
            type="button"
            onClick={() => onPrintQtyChange(row.id, printQty - 1)}
            className="flex size-8 items-center justify-center rounded-lg hover:bg-muted"
            aria-label="Decrease print quantity"
          >
            <Minus className="size-3.5" />
          </button>
          <input
            type="number"
            min={1}
            max={99}
            value={printQty}
            onChange={(e) => onPrintQtyChange(row.id, Number(e.target.value))}
            className="w-12 bg-transparent text-center text-[14px] font-semibold tabular-nums outline-none"
            aria-label="Print quantity"
          />
          <button
            type="button"
            onClick={() => onPrintQtyChange(row.id, printQty + 1)}
            className="flex size-8 items-center justify-center rounded-lg hover:bg-muted"
            aria-label="Increase print quantity"
          >
            <Plus className="size-3.5" />
          </button>
        </div>
        {showCatalogActions && !row.productId ? (
          <a
            href="/dashboard/products/new"
            className="rounded-xl border border-border px-3 py-2 text-[13px] font-semibold hover:bg-muted dark:border-white/10"
          >
            Add product
          </a>
        ) : null}
        {!showCatalogActions && row.productId ? (
          <a
            href={`/dashboard/products/${row.productId}/edit`}
            className="rounded-xl border border-border px-3 py-2 text-[13px] font-semibold hover:bg-muted dark:border-white/10"
          >
            View product
          </a>
        ) : null}
        {!showCatalogActions && !row.productId ? (
          <a
            href="/dashboard/products/new"
            className="rounded-xl border border-border px-3 py-2 text-[13px] font-semibold hover:bg-muted dark:border-white/10"
          >
            Add product
          </a>
        ) : null}
        <button
          type="button"
          onClick={onPrint}
          className="flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-[13px] font-semibold hover:bg-muted dark:border-white/10"
        >
          <Printer className="size-4" />
          Print
        </button>
        {onDelete ? (
          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            className="flex items-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-900/40 dark:hover:bg-red-950/30"
          >
            {deleting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Trash2 className="size-4" />
            )}
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function ProductsBarcodesView() {
  const { branchId } = useBranchContext();
  const branchSelected = branchId !== "all";

  const { data: history = [], isLoading: historyLoading, mutate } = useSWR<BarcodeLabelRow[]>(
    branchSelected ? `/api/products/barcodes?b=${branchId}` : null,
    barcodeLabelsFetcher,
  );

  const [activeTab, setActiveTab] = useState<TabId>("generate");
  const [catalogQuery, setCatalogQuery] = useState("");
  const [debouncedCatalogQuery, setDebouncedCatalogQuery] = useState("");

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedCatalogQuery(catalogQuery.trim()), 350);
    return () => window.clearTimeout(t);
  }, [catalogQuery]);

  const { data: catalogResults = [], isLoading: catalogLoading } = useSWR<GlobalBarcodeLabelRow[]>(
    debouncedCatalogQuery.length >= 2
      ? `/api/products/barcodes/catalog?q=${encodeURIComponent(debouncedCatalogQuery)}`
      : null,
    catalogFetcher,
  );

  const { data: catalogPreview = [], isLoading: catalogPreviewLoading } = useSWR<
    GlobalBarcodeLabelRow[]
  >(
    activeTab === "catalog" && debouncedCatalogQuery.length < 2
      ? "/api/products/barcodes/catalog?recent=1&limit=12"
      : null,
    catalogFetcher,
  );

  const catalogSliderRef = useRef<HTMLDivElement>(null);

  const [productName, setProductName] = useState("");
  const [debouncedProductName, setDebouncedProductName] = useState("");
  const [showNameSuggestions, setShowNameSuggestions] = useState(false);
  const [labelDescription, setLabelDescription] = useState("");
  const [sku, setSku] = useState(() => generateProductSku());
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [printProducts, setPrintProducts] = useState<BarcodeLabelProduct[]>([]);
  const [printQuantities, setPrintQuantities] = useState<Record<string, number>>({});
  const [rowPrintQty, setRowPrintQty] = useState<Record<string, number>>({});
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nameSuggestRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedProductName(productName.trim()), 300);
    return () => window.clearTimeout(t);
  }, [productName]);

  const { data: nameSuggestionsRemote = [], isLoading: nameSuggestionsLoading } = useSWR<
    BarcodeProductSuggestion[]
  >(
    debouncedProductName.length >= 2 && showNameSuggestions
      ? `/api/barcodes/suggest?q=${encodeURIComponent(debouncedProductName)}&limit=10`
      : null,
    suggestFetcher,
  );

  const localNameSuggestions = useMemo((): BarcodeProductSuggestion[] => {
    const q = debouncedProductName.trim().toLowerCase();
    if (q.length < 2) return [];
    return history
      .filter(
        (row) =>
          row.productName.toLowerCase().includes(q) ||
          row.labelDescription.toLowerCase().includes(q) ||
          row.sku.toLowerCase().includes(q),
      )
      .map((row) => ({
        id: `local:${row.id}`,
        productName: row.productName,
        description: row.labelDescription || null,
        imageSrc: row.imageSrc || null,
        sku: row.sku || null,
        source: "barcode_label" as const,
        sourceBusinessName: "Your branch",
        isOwnShop: true,
      }));
  }, [debouncedProductName, history]);

  const nameSuggestions = useMemo(
    () => mergeSuggestions(localNameSuggestions, nameSuggestionsRemote, 10),
    [localNameSuggestions, nameSuggestionsRemote],
  );

  useEffect(() => {
    if (!showNameSuggestions) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!nameSuggestRef.current?.contains(e.target as Node)) {
        setShowNameSuggestions(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [showNameSuggestions]);

  const applyNameSuggestion = useCallback((suggestion: BarcodeProductSuggestion) => {
    setProductName(suggestion.productName);
    setLabelDescription(suggestion.description ?? "");
    if (suggestion.imageSrc) {
      setImagePreview(suggestion.imageSrc);
      setSelectedFile(null);
    }
    if (suggestion.sku) {
      setSku(suggestion.sku);
    }
    setShowNameSuggestions(false);
    const from = suggestion.sourceBusinessName
      ? ` (from ${suggestion.sourceBusinessName})`
      : "";
    toast.success(`Loaded "${suggestion.productName}"${from}. Review and continue.`);
  }, []);

  const { startUpload, isUploading } = useUploadThing("productImage");

  const getRowPrintQty = useCallback(
    (id: string, fallback = 1) => rowPrintQty[id] ?? fallback,
    [rowPrintQty],
  );

  const setRowQty = useCallback((id: string, qty: number) => {
    setRowPrintQty((prev) => ({ ...prev, [id]: clampPrintQty(qty) }));
  }, []);

  function resetForm() {
    setProductName("");
    setDebouncedProductName("");
    setShowNameSuggestions(false);
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
    setPrintQuantities({ [label.id]: clampPrintQty(qty) });
    setIsPrintOpen(true);
  }

  async function handleGenerate(e: React.FormEvent, options?: { openPrint?: boolean }) {
    e.preventDefault();
    const openPrint = options?.openPrint ?? false;
    if (!branchSelected) {
      toast.error("Select a branch to generate barcodes.");
      return;
    }
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
      toast.success(
        openPrint
          ? "Barcode saved. Opening print preview…"
          : "Barcode saved to your history and the shared catalog.",
      );

      if (openPrint) {
        openPrintModal(toLabelProduct(saved), quantity);
      }
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
    branchSelected &&
    productName.trim() &&
    labelDescription.trim() &&
    imagePreview &&
    sku.trim();

  return (
    <ProductsPageShell
      title="Barcodes"
      description="Generate printable barcodes for local products. Labels are saved to the shared catalog so other shops can find and reprint them."
    >
      <BarcodeHelpPanel className="mb-6" defaultOpen />

      <div className="mb-6 flex flex-wrap gap-2 border-b border-border dark:border-white/10">
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
        <button
          type="button"
          onClick={() => setActiveTab("catalog")}
          className={`flex items-center gap-2 px-4 py-2.5 text-[14px] font-semibold border-b-2 transition-colors ${
            activeTab === "catalog"
              ? "border-[#006c49] text-[#006c49] dark:border-[#6ffbbe] dark:text-[#6ffbbe]"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Globe className="size-4" />
          All barcodes
        </button>
      </div>

      {activeTab === "generate" ? (
        !branchSelected ? (
          <div className="rounded-2xl border border-dashed border-border p-12 text-center dark:border-white/10">
            <Printer className="mx-auto mb-4 size-10 text-muted-foreground" />
            <h3 className="text-lg font-semibold">Select a branch</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Choose a branch from the header to generate labels for that location.
            </p>
          </div>
        ) : (
          <form onSubmit={(e) => void handleGenerate(e, { openPrint: false })} className="grid gap-8 lg:grid-cols-2">
            <div className="space-y-5">
              <div className="space-y-2" ref={nameSuggestRef}>
                <label className="text-sm font-semibold ml-1">Product name *</label>
                <div className="relative">
                  <input
                    required
                    value={productName}
                    onChange={(e) => {
                      setProductName(e.target.value);
                      setShowNameSuggestions(true);
                    }}
                    onFocus={() => {
                      if (productName.trim().length >= 2) setShowNameSuggestions(true);
                    }}
                    autoComplete="off"
                    placeholder="e.g. Auntie Ama's Palm Oil"
                    className="w-full rounded-2xl border border-border bg-transparent p-3 text-[15px] outline-none focus:ring-4 focus:ring-[#003527]/5 focus:border-[#006c49]/40 dark:border-white/10"
                  />
                  {showNameSuggestions && debouncedProductName.length >= 2 ? (
                    <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-20 overflow-hidden rounded-2xl border border-border bg-white shadow-lg dark:border-white/10 dark:bg-[#111]">
                      {nameSuggestionsLoading ? (
                        <div className="flex items-center gap-2 px-4 py-3 text-[13px] text-muted-foreground">
                          <Loader2 className="size-4 animate-spin" />
                          Searching Ventra catalog…
                        </div>
                      ) : nameSuggestions.length === 0 ? (
                        <p className="px-4 py-3 text-[13px] text-muted-foreground">
                          No matches yet — keep typing to add a new product.
                        </p>
                      ) : (
                        <ul className="max-h-64 overflow-y-auto py-1">
                          {nameSuggestions.map((suggestion) => (
                            <li key={suggestion.id}>
                              <button
                                type="button"
                                onClick={() => applyNameSuggestion(suggestion)}
                                className="flex w-full items-start gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/60 dark:hover:bg-white/5"
                              >
                                {suggestion.imageSrc ? (
                                  <CatalogProductImage
                                    src={suggestion.imageSrc}
                                    alt=""
                                    className="size-10 shrink-0 rounded-lg object-cover bg-white"
                                  />
                                ) : (
                                  <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-[11px] font-semibold uppercase text-muted-foreground">
                                    {suggestion.productName.charAt(0)}
                                  </div>
                                )}
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-[14px] font-semibold text-foreground">
                                    {suggestion.productName}
                                    {suggestion.isOwnShop ? (
                                      <span className="ml-1.5 text-[11px] font-medium text-[#006c49] dark:text-[#6ffbbe]">
                                        Your shop
                                      </span>
                                    ) : null}
                                  </p>
                                  {suggestion.description ? (
                                    <p className="line-clamp-1 text-[12px] text-muted-foreground">
                                      {suggestion.description}
                                    </p>
                                  ) : null}
                                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                                    {suggestionSourceLabel(suggestion.source)}
                                    {suggestion.sourceBusinessName
                                      ? ` · ${suggestion.sourceBusinessName}`
                                      : ""}
                                    {suggestion.sku ? (
                                      <>
                                        {" · "}
                                        <span className="font-mono">{suggestion.sku}</span>
                                      </>
                                    ) : null}
                                  </p>
                                </div>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ) : null}
                </div>
                <p className="ml-1 text-[12px] text-muted-foreground">
                  After 2 characters, matching products from your branch and across Ventra appear —
                  select one to avoid duplicates, or keep typing to add something new.
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
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={quantity}
                    onChange={(e) => setQuantity(clampPrintQty(Number(e.target.value)))}
                    className="w-16 rounded-xl border border-border bg-transparent py-2 text-center text-lg font-semibold tabular-nums outline-none dark:border-white/10"
                  />
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => q + 1)}
                    className="flex size-10 items-center justify-center rounded-xl border border-border hover:bg-muted dark:border-white/10"
                  >
                    <Plus className="size-4" />
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="submit"
                  disabled={!canGenerate || isSaving || isUploading}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-[#e5e7eb] bg-white px-6 py-3.5 text-[15px] font-bold text-foreground shadow-sm disabled:opacity-50 dark:border-white/12 dark:bg-[#141414]"
                >
                  {(isSaving || isUploading) && <Loader2 className="size-4 animate-spin" />}
                  <Save className="size-4" />
                  Save barcode
                </button>
                <button
                  type="button"
                  disabled={!canGenerate || isSaving || isUploading}
                  onClick={(e) => void handleGenerate(e, { openPrint: true })}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-[#003527] to-[#064e3b] px-6 py-3.5 text-[15px] font-bold text-white shadow-lg disabled:opacity-50"
                >
                  {(isSaving || isUploading) && <Loader2 className="size-4 animate-spin" />}
                  <Printer className="size-4" />
                  Save &amp; print
                </button>
              </div>
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
            </div>
          </form>
        )
      ) : activeTab === "history" ? (
        !branchSelected ? (
          <div className="rounded-2xl border border-dashed border-border p-12 text-center dark:border-white/10">
            <History className="mx-auto mb-4 size-10 text-muted-foreground" />
            <h3 className="text-lg font-semibold">Select a branch</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              History shows labels generated for the selected branch.
            </p>
          </div>
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
                  <BarcodeListRow
                    key={row.id}
                    row={row}
                    printQty={getRowPrintQty(row.id, row.quantity)}
                    onPrintQtyChange={setRowQty}
                    onPrint={() =>
                      openPrintModal(toLabelProduct(row), getRowPrintQty(row.id, row.quantity))
                    }
                    onDelete={() => handleDelete(row.id)}
                    deleting={deletingId === row.id}
                  />
                ))}
              </div>
            )}
          </div>
        )
      ) : (
        <div className="space-y-4">
          <div className="relative max-w-xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={catalogQuery}
              onChange={(e) => setCatalogQuery(e.target.value)}
              placeholder="Search by product name, description, or barcode…"
              className="w-full rounded-2xl border border-border bg-transparent py-3 pl-10 pr-4 text-[15px] outline-none focus:ring-4 focus:ring-[#003527]/5 focus:border-[#006c49]/40 dark:border-white/10"
            />
          </div>
          <p className="text-[13px] text-muted-foreground">
            Search labels saved by any Ventra shop. If a match exists, set print quantity and print — no need to generate a duplicate barcode.
          </p>

          {debouncedCatalogQuery.length < 2 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[13px] font-semibold text-foreground">
                  Recently generated barcodes
                </p>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() =>
                      catalogSliderRef.current?.scrollBy({ left: -280, behavior: "smooth" })
                    }
                    className="flex size-9 items-center justify-center rounded-xl border border-border hover:bg-muted dark:border-white/10"
                    aria-label="Scroll left"
                  >
                    <ChevronLeft className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      catalogSliderRef.current?.scrollBy({ left: 280, behavior: "smooth" })
                    }
                    className="flex size-9 items-center justify-center rounded-xl border border-border hover:bg-muted dark:border-white/10"
                    aria-label="Scroll right"
                  >
                    <ChevronRight className="size-4" />
                  </button>
                </div>
              </div>

              {catalogPreviewLoading ? (
                <div className="flex h-40 items-center justify-center">
                  <Loader2 className="size-7 animate-spin text-muted-foreground" />
                </div>
              ) : catalogPreview.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border p-10 text-center dark:border-white/10">
                  <Globe className="mx-auto mb-3 size-9 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    No shared barcodes yet. Generate one under the Generate tab, or search above.
                  </p>
                </div>
              ) : (
                <div
                  ref={catalogSliderRef}
                  className="custom-scrollbar flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory"
                >
                  {catalogPreview.map((row) => (
                    <div
                      key={row.id}
                      className="w-[200px] shrink-0 snap-start rounded-2xl border border-border bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#111]"
                    >
                      <div className="mb-3 flex items-center gap-2">
                        <CatalogProductImage
                          src={row.imageSrc}
                          alt={row.labelName}
                          className="size-10 rounded-lg object-cover bg-white"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-semibold">{row.labelName}</p>
                          <p className="truncate text-[11px] text-muted-foreground">
                            {(row as GlobalBarcodeLabelRow).businessName ?? "Ventra shop"}
                          </p>
                        </div>
                      </div>
                      <BarcodeItem
                        sku={row.sku}
                        name={row.labelName}
                        description={row.labelDescription}
                        imageSrc={row.imageSrc}
                        width={1.2}
                        height={36}
                        fontSize={9}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          openPrintModal(toLabelProduct(row), getRowPrintQty(row.id, 1))
                        }
                        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-border py-2 text-[12px] font-semibold hover:bg-muted dark:border-white/10"
                      >
                        <Printer className="size-3.5" />
                        Print
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="rounded-2xl border border-dashed border-border p-8 text-center dark:border-white/10">
                <Search className="mx-auto mb-2 size-7 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Type at least 2 characters above to search all Ventra shops.
                </p>
              </div>
            </div>
          ) : catalogLoading ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          ) : catalogResults.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-10 text-center dark:border-white/10">
              <p className="font-medium">No matches for &ldquo;{debouncedCatalogQuery}&rdquo;</p>
              <p className="mt-1 text-sm text-muted-foreground">
                You can generate a new label under the Generate tab.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab("generate")}
                className="mt-4 rounded-xl bg-[#003527] px-5 py-2.5 text-sm font-semibold text-white"
              >
                Generate new barcode
              </button>
            </div>
          ) : (
            <div className="divide-y divide-border rounded-2xl border border-border dark:divide-white/10 dark:border-white/10">
              {catalogResults.map((row) => (
                <BarcodeListRow
                  key={row.id}
                  row={row}
                  printQty={getRowPrintQty(row.id, 1)}
                  onPrintQtyChange={setRowQty}
                  onPrint={() =>
                    openPrintModal(toLabelProduct(row), getRowPrintQty(row.id, 1))
                  }
                  showShop
                  showCatalogActions
                />
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
