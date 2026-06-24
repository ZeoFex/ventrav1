"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { generateClientProductId, generateProductSku } from "./product-catalog-codes";
import { ProductForm, type ProductFormInitialValues } from "./product-form";
import { DEFAULT_PRODUCT_UNIT } from "@/app/lib/product-units";
import {
  clearPendingProductFromScan,
  readPendingProductFromScan,
} from "@/app/lib/pos/pending-product-barcode";

function buildInitial(overrides?: Partial<ProductFormInitialValues>): ProductFormInitialValues {
  return {
    name: "",
    sku: generateProductSku(),
    barcode: "",
    description: "",
    price: "",
    stock: 0,
    reorderAt: 5,
    categoryId: "all",
    tagIds: [],
    status: "active",
    imageSrc: null,
    unit: DEFAULT_PRODUCT_UNIT,
    variations: [],
    ...overrides,
  };
}

export function ProductsNewView() {
  const productId = generateClientProductId();
  const [initial, setInitial] = useState<ProductFormInitialValues>(() => buildInitial());
  const [loadingPrefill, setLoadingPrefill] = useState(true);
  const [prefillNote, setPrefillNote] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadPrefill() {
      const pending = readPendingProductFromScan();
      const params =
        typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
      const barcodeFromUrl = params?.get("barcode")?.trim() ?? "";

      const barcode = pending?.barcode || barcodeFromUrl;
      if (!barcode) {
        setLoadingPrefill(false);
        return;
      }

      let global: {
        productName?: string;
        description?: string | null;
        imageSrc?: string | null;
        unit?: string | null;
        sourceBusinessName?: string | null;
      } | null = null;

      if (!pending?.productName) {
        try {
          const res = await fetch(
            `/api/barcodes/global/lookup?barcode=${encodeURIComponent(barcode)}`,
          );
          if (res.ok) global = await res.json();
        } catch {
          /* optional */
        }
      }

      if (cancelled) return;

      setInitial(
        buildInitial({
          barcode,
          name: pending?.productName ?? global?.productName ?? "",
          description: pending?.description ?? global?.description ?? "",
          imageSrc: pending?.imageSrc ?? global?.imageSrc ?? null,
          unit: pending?.unit ?? global?.unit ?? DEFAULT_PRODUCT_UNIT,
        }),
      );

      if (pending?.fromGlobalCatalog || global?.productName) {
        const source =
          pending?.sourceBusinessName ?? global?.sourceBusinessName ?? "another shop";
        setPrefillNote(
          `Barcode ${barcode} loaded from Ventra's shared catalog (contributed by ${source}). Set your prices and save.`,
        );
      } else if (barcode) {
        setPrefillNote(`Barcode ${barcode} captured from scan. Complete the details and save.`);
      }

      clearPendingProductFromScan();
      setLoadingPrefill(false);
    }

    void loadPrefill();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loadingPrefill) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
        <span className="text-[14px]">Loading product details…</span>
      </div>
    );
  }

  return (
    <ProductForm
      mode="new"
      productId={productId}
      initial={initial}
      title="Add product"
      shellDescription={prefillNote ?? "Create a new catalog item."}
    />
  );
}
