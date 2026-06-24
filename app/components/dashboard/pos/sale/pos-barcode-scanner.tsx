"use client";

import {
  Check,
  Keyboard,
  Loader2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { PosBarcodeCamera } from "./pos-barcode-camera";
import { resolveProductFromScan } from "./pos-barcode-resolve";
import { playPosScanSuccessFeedback } from "@/app/lib/pos/barcode-scanner/feedback";
import { POS_BARCODE_SCANNER_CONFIG } from "@/app/lib/pos/barcode-scanner/config";
import { normalizeScannedBarcode } from "@/app/lib/pos/barcode-scanner/normalize";
import type { GlobalBarcodePrefill } from "@/app/lib/pos/pending-product-barcode";
import { type ProductRow } from "../../products/types";

export type PosBarcodeScannerState =
  | "scanning"
  | "loading"
  | "success"
  | "error"
  | "manual";

type PosBarcodeScannerProps = {
  active: boolean;
  products: ProductRow[];
  onProductFound: (product: ProductRow, barcode: string) => void;
  /** User chose to create a new product from an unknown barcode. */
  onCreateProduct?: (barcode: string, globalPrefill: GlobalBarcodePrefill | null) => void;
  className?: string;
  showManualEntry?: boolean;
  compactFooter?: boolean;
};

const LOOKUP_TIMEOUT_MS = 6000;
const SUCCESS_DISPLAY_MS = 1400;
const ERROR_AUTO_DISMISS_MS = 0; // stay until user acts

async function fetchGlobalBarcodePrefill(
  barcode: string,
): Promise<GlobalBarcodePrefill | null> {
  try {
    const res = await fetch(
      `/api/barcodes/global/lookup?barcode=${encodeURIComponent(barcode)}`,
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      found?: boolean;
      productName?: string;
      description?: string | null;
      imageSrc?: string | null;
      unit?: string | null;
      sourceBusinessName?: string | null;
    };
    if (!data.found || !data.productName) return null;
    return {
      productName: data.productName,
      description: data.description,
      imageSrc: data.imageSrc,
      unit: data.unit,
      sourceBusinessName: data.sourceBusinessName,
    };
  } catch {
    return null;
  }
}

export function PosBarcodeScanner({
  active,
  products,
  onProductFound,
  onCreateProduct,
  className,
  showManualEntry = true,
  compactFooter = false,
}: PosBarcodeScannerProps) {
  const [state, setState] = useState<PosBarcodeScannerState>("scanning");
  const [lastBarcode, setLastBarcode] = useState("");
  const [globalPrefill, setGlobalPrefill] = useState<GlobalBarcodePrefill | null>(null);
  const [matchedProduct, setMatchedProduct] = useState<ProductRow | null>(null);
  const [manualValue, setManualValue] = useState("");
  const [lookupPhase, setLookupPhase] = useState<string>("");
  const lastEmitRef = useRef<{ raw: string; at: number } | null>(null);
  const lookupTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const busyRef = useRef(false);

  const clearTimers = useCallback(() => {
    if (lookupTimeoutRef.current) {
      clearTimeout(lookupTimeoutRef.current);
      lookupTimeoutRef.current = null;
    }
    if (resetTimeoutRef.current) {
      clearTimeout(resetTimeoutRef.current);
      resetTimeoutRef.current = null;
    }
  }, []);

  const resetToScanning = useCallback(() => {
    clearTimers();
    busyRef.current = false;
    setState("scanning");
    setMatchedProduct(null);
    setGlobalPrefill(null);
    setManualValue("");
    setLookupPhase("");
  }, [clearTimers]);

  useEffect(() => {
    if (!active) resetToScanning();
  }, [active, resetToScanning]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const processBarcode = useCallback(
    async (raw: string) => {
      const normalized = normalizeScannedBarcode(raw);
      if (!normalized || busyRef.current) return;

      const now = Date.now();
      const prev = lastEmitRef.current;
      if (
        prev &&
        prev.raw === normalized &&
        now - prev.at < POS_BARCODE_SCANNER_CONFIG.duplicateCooldownMs
      ) {
        return;
      }
      lastEmitRef.current = { raw: normalized, at: now };

      busyRef.current = true;
      setLastBarcode(normalized);
      setGlobalPrefill(null);
      setState("loading");
      setLookupPhase("Searching your catalog…");

      lookupTimeoutRef.current = setTimeout(() => {
        busyRef.current = false;
        setState("error");
        setLookupPhase("");
      }, LOOKUP_TIMEOUT_MS);

      try {
        const local = resolveProductFromScan(normalized, products);
        if (local.ok) {
          clearTimeout(lookupTimeoutRef.current!);
          lookupTimeoutRef.current = null;
          setMatchedProduct(local.product);
          onProductFound(local.product, local.normalizedBarcode);
          playPosScanSuccessFeedback();
          setState("success");
          resetTimeoutRef.current = setTimeout(() => {
            busyRef.current = false;
            resetToScanning();
          }, SUCCESS_DISPLAY_MS);
          return;
        }

        setLookupPhase("Checking Ventra shared barcode catalog…");
        const global = await fetchGlobalBarcodePrefill(normalized);
        setGlobalPrefill(global);

        clearTimeout(lookupTimeoutRef.current!);
        lookupTimeoutRef.current = null;

        setState("error");
        busyRef.current = false;
        setLookupPhase("");
      } catch {
        clearTimeout(lookupTimeoutRef.current!);
        lookupTimeoutRef.current = null;
        setState("error");
        busyRef.current = false;
        setLookupPhase("");
      }
    },
    [onProductFound, products, resetToScanning],
  );

  const submitManual = useCallback(() => {
    const value = normalizeScannedBarcode(manualValue);
    if (!value) return;
    void processBarcode(value);
  }, [manualValue, processBarcode]);

  const handleAddNewProduct = useCallback(() => {
    if (!lastBarcode) return;
    onCreateProduct?.(lastBarcode, globalPrefill);
  }, [globalPrefill, lastBarcode, onCreateProduct]);

  const scanEnabled = state === "scanning" || state === "error";

  return (
    <div className={`relative flex flex-col ${className ?? ""}`}>
      <div className="relative min-h-0 flex-1 bg-black">
        <PosBarcodeCamera
          active={active}
          scanEnabled={scanEnabled}
          onScan={(code) => void processBarcode(code)}
          className="h-full w-full min-h-[200px]"
        />

        {showManualEntry && state !== "manual" ? (
          <div className="absolute inset-x-0 top-3 z-10 flex justify-center px-4">
            <button
              type="button"
              onClick={() => {
                clearTimers();
                busyRef.current = false;
                setState("manual");
                setManualValue(lastBarcode);
              }}
              className="rounded-full border border-white/20 bg-black/50 px-4 py-2 text-[13px] font-medium text-white backdrop-blur-md transition-colors hover:bg-black/65"
            >
              Type your barcode
            </button>
          </div>
        ) : null}

        {state === "loading" ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/25">
            <div className="flex flex-col items-center gap-2 rounded-2xl bg-black/55 px-4 py-3 backdrop-blur-sm">
              <Loader2 className="size-5 animate-spin text-[#FFD60A]" aria-hidden />
              <span className="text-[13px] font-medium text-white">{lookupPhase || "Looking up…"}</span>
            </div>
          </div>
        ) : null}
      </div>

      <div className="shrink-0 border-t border-white/10 bg-white dark:border-white/[0.08] dark:bg-[#111]">
        {state === "scanning" && !compactFooter ? (
          <div className="flex items-start gap-3 px-4 py-3.5">
            <Keyboard className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden />
            <p className="text-[13px] leading-snug text-muted-foreground">
              Scan barcodes at any angle — EAN-13, UPC, Code 128, Code 39, QR, and more.
            </p>
          </div>
        ) : null}

        {state === "loading" ? (
          <div className="space-y-2.5 px-4 py-4">
            <div className="h-3 w-3/4 animate-pulse rounded-full bg-muted" />
            <div className="h-3 w-1/2 animate-pulse rounded-full bg-muted" />
            <div className="h-3 w-2/5 animate-pulse rounded-full bg-muted" />
            <p className="pt-1 text-[12px] text-muted-foreground">{lookupPhase}</p>
          </div>
        ) : null}

        {state === "success" && matchedProduct ? (
          <div className="flex items-center gap-3 px-4 py-4">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#006c49]/12 text-[#006c49] dark:bg-[#6ffbbe]/15 dark:text-[#6ffbbe]">
              <Check className="size-5" strokeWidth={2.5} aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="text-[14px] font-semibold text-foreground">Added to cart</p>
              <p className="truncate text-[13px] text-muted-foreground">{matchedProduct.name}</p>
              <p className="font-mono text-[11px] text-muted-foreground">{lastBarcode}</p>
            </div>
          </div>
        ) : null}

        {state === "error" ? (
          <div className="px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[15px] font-semibold text-foreground">No matching item found</p>
                <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                  Would you like to create a new product using this barcode?
                </p>
                {lastBarcode ? (
                  <p className="mt-2 font-mono text-[12px] text-muted-foreground">{lastBarcode}</p>
                ) : null}
                {globalPrefill?.productName ? (
                  <p className="mt-2 text-[12px] text-[#006c49] dark:text-[#6ffbbe]">
                    Found in shared catalog: {globalPrefill.productName}
                    {globalPrefill.sourceBusinessName
                      ? ` (from ${globalPrefill.sourceBusinessName})`
                      : ""}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={resetToScanning}
                className="shrink-0 text-[13px] font-medium text-muted-foreground hover:text-foreground"
              >
                Dismiss
              </button>
            </div>
            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleAddNewProduct}
                disabled={!lastBarcode || !onCreateProduct}
                className="w-full rounded-xl bg-gradient-to-br from-[#003527] to-[#064e3b] py-3 text-[14px] font-semibold text-white disabled:opacity-50 dark:from-[#6ffbbe] dark:to-[#6ffbbe] dark:text-[#0a0a0a]"
              >
                Add as New Product
              </button>
              <button
                type="button"
                onClick={() => {
                  setManualValue(lastBarcode);
                  setState("manual");
                }}
                className="w-full rounded-xl border border-[#e5e7eb] py-3 text-[14px] font-semibold text-foreground dark:border-white/[0.12]"
              >
                Enter number manually
              </button>
            </div>
          </div>
        ) : null}

        {state === "manual" ? (
          <div className="px-4 py-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[14px] font-semibold">Enter barcode</p>
              <button
                type="button"
                onClick={resetToScanning}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
                aria-label="Close manual entry"
              >
                <X className="size-4" />
              </button>
            </div>
            <input
              type="text"
              inputMode="numeric"
              autoFocus
              value={manualValue}
              onChange={(e) => setManualValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitManual();
              }}
              placeholder="e.g. 5449000009746"
              className="mb-3 w-full rounded-xl border border-[#e5e7eb] bg-white px-4 py-3 font-mono text-[15px] outline-none focus:border-[#006c49] dark:border-white/[0.12] dark:bg-[#0a0a0a]"
            />
            <button
              type="button"
              onClick={submitManual}
              disabled={!normalizeScannedBarcode(manualValue)}
              className="w-full rounded-xl bg-gradient-to-br from-[#003527] to-[#064e3b] py-3 text-[14px] font-semibold text-white disabled:opacity-50"
            >
              Look up barcode
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
