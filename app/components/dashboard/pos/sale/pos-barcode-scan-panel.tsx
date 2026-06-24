"use client";

import QRCode from "qrcode";
import {
  Keyboard,
  Minus,
  MonitorSmartphone,
  Plus,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useState,
} from "react";
import type { CartLine } from "./pos-cart-totals";
import { PosBarcodeScanner } from "./pos-barcode-scanner";
import { PosCreateProductFromScanModal } from "./pos-create-product-from-scan-modal";
import { resolveProductFromScan } from "./pos-barcode-resolve";
import type { GlobalBarcodePrefill } from "@/app/lib/pos/pending-product-barcode";
import { storePendingProductFromScan } from "@/app/lib/pos/pending-product-barcode";
import { useIsDesktopLayout } from "./use-pos-keyboard-wedge";
import { CatalogProductImage } from "../../products/catalog-product-image";
import { type ProductRow } from "../../products/types";
import { formatGhs } from "@/app/lib/catalog-utils";

type PosBarcodeScanPanelProps = {
  open: boolean;
  onClose: () => void;
  products: ProductRow[];
  onProductAdded: (product: ProductRow) => void;
  /** Mobile: show live cart under the camera while scanning (camera stays open). */
  mobileCart?: {
    lines: CartLine[];
    productById: Map<string, ProductRow>;
    onIncrement: (productId: string) => void;
    onDecrement: (productId: string) => void;
    totalGhs: number;
    /** Closes scan + starts payment flow */
    onContinueToPayment?: () => void;
  };
};

export function PosBarcodeScanPanel({
  open,
  onClose,
  products,
  onProductAdded,
  mobileCart,
}: PosBarcodeScanPanelProps) {
  const titleId = useId();
  const isDesktop = useIsDesktopLayout();
  const showMobileCart = Boolean(mobileCart) && !isDesktop;
  const [desktopTab, setDesktopTab] = useState<"phone" | "usb">("phone");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [pairToken, setPairToken] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [relayError, setRelayError] = useState<string | null>(null);
  const [createModal, setCreateModal] = useState<{
    barcode: string;
    globalPrefill: GlobalBarcodePrefill | null;
  } | null>(null);

  const applyScan = useCallback(
    (product: ProductRow, _barcode: string) => {
      onProductAdded(product);
    },
    [onProductAdded],
  );

  const handleCreateProduct = useCallback(
    (barcode: string, globalPrefill: GlobalBarcodePrefill | null) => {
      storePendingProductFromScan({
        barcode,
        productName: globalPrefill?.productName,
        description: globalPrefill?.description ?? undefined,
        imageSrc: globalPrefill?.imageSrc,
        unit: globalPrefill?.unit,
        fromGlobalCatalog: Boolean(globalPrefill),
        sourceBusinessName: globalPrefill?.sourceBusinessName,
      });
      setCreateModal({ barcode, globalPrefill });
    },
    [],
  );

  const handleProductCreatedFromScan = useCallback(
    (product: ProductRow) => {
      onProductAdded(product);
      setCreateModal(null);
    },
    [onProductAdded],
  );

  useEffect(() => {
    if (!isDesktop) return;

    let cancelled = false;
    setRelayError(null);
    console.log(`[scan:pair] requesting new relay session…`);

    (async () => {
      try {
        const res = await fetch("/api/pos/relay", { method: "POST" });
        if (!res.ok) throw new Error("Could not start pairing");
        const data = (await res.json()) as {
          sessionId: string;
          token: string;
        };
        console.log(`[scan:pair] session created: id=${data.sessionId} token=${data.token.slice(0, 8)}…`);
        if (cancelled) return;
        setSessionId(data.sessionId);
        setPairToken(data.token);
        const origin = window.location.origin;
        const url = `${origin}/pos-scan?s=${encodeURIComponent(data.sessionId)}&t=${encodeURIComponent(data.token)}`;
        console.log(`[scan:pair] QR URL: ${url}`);
        const dataUrl = await QRCode.toDataURL(url, {
          width: 220,
          margin: 2,
          color: { dark: "#0a0a0a", light: "#ffffff" },
        });
        if (!cancelled) setQrDataUrl(dataUrl);
      } catch (err) {
        console.error(`[scan:pair] pairing failed:`, err);
        if (!cancelled) setRelayError("Pairing unavailable. Check connection.");
      }
    })();

    return () => {
      cancelled = true;
      setSessionId(null);
      setPairToken(null);
      setQrDataUrl(null);
    };
  }, [isDesktop]);

  useEffect(() => {
    if (!isDesktop) return;
    if (!sessionId || !pairToken) return;

    console.log(`[scan:poll] starting poll loop for session ${sessionId}`);
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await fetch(
          `/api/pos/relay/${encodeURIComponent(sessionId)}/poll?token=${encodeURIComponent(pairToken)}`,
        );
        if (!res.ok || cancelled) {
          if (!res.ok) console.log(`[scan:poll] ⚠ poll returned ${res.status}`);
          return;
        }
        const data = (await res.json()) as {
          scans: { id: string; barcode: string }[];
        };
        if (data.scans.length > 0) {
          console.log(`[scan:poll] 📥 received ${data.scans.length} scan(s):`, data.scans.map(s => s.barcode));
        }
        for (const s of data.scans) {
          const result = resolveProductFromScan(s.barcode, products);
          if (result.ok) applyScan(result.product, result.normalizedBarcode);
        }
      } catch (err) {
        console.error(`[scan:poll] ❌ poll error:`, err);
      }
    };

    const id = window.setInterval(tick, 450);
    void tick();
    return () => {
      cancelled = true;
      window.clearInterval(id);
      console.log(`[scan:poll] stopped poll loop`);
    };
  }, [isDesktop, sessionId, pairToken, applyScan, products]);

  useEffect(() => {
    if (!open) {
      setDesktopTab("phone");
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-black/50 p-0 backdrop-blur-[3px] sm:items-center sm:p-4 lg:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close scan"
        onClick={onClose}
      />

      <div
        className={`relative flex w-full flex-col overflow-hidden border border-[#e5e7eb] bg-surface-card shadow-2xl dark:border-white/[0.1] dark:bg-[#0a0a0a] ${isDesktop
          ? "max-h-[min(92dvh,720px)] max-w-lg rounded-t-2xl sm:rounded-2xl"
          : "h-[min(100dvh,100%)] max-h-[100dvh] rounded-t-2xl"
          }`}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#bfc9c3]/15 px-4 py-3 dark:border-white/[0.08] sm:px-5 sm:py-4">
          <div className="min-w-0">
            <h2
              id={titleId}
              className="font-[family-name:var(--font-display)] text-base font-semibold tracking-tight text-foreground sm:text-lg"
            >
              Scan to add
            </h2>
            <p className="mt-0.5 text-[12px] text-muted-foreground sm:text-[13px]">
              {isDesktop
                ? "Use your phone below, or scan from the sale screen with a handheld scanner."
                : "Point at the product — any angle or orientation."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="tap-target flex size-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-surface-elevated hover:text-foreground dark:hover:bg-[#1a1a1a]"
            aria-label="Close"
          >
            <X className="size-5" strokeWidth={2} aria-hidden />
          </button>
        </div>

        {isDesktop ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex shrink-0 gap-1 border-b border-[#bfc9c3]/10 p-2 dark:border-white/[0.06]">
              <button
                type="button"
                onClick={() => setDesktopTab("phone")}
                className={`tap-target flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-colors sm:text-[14px] ${desktopTab === "phone"
                  ? "bg-[#003527]/10 text-[#006c49] dark:bg-[#6ffbbe]/10 dark:text-[#6ffbbe]"
                  : "text-muted-foreground hover:bg-surface-elevated dark:hover:bg-[#141414]"
                  }`}
              >
                <MonitorSmartphone className="size-4 shrink-0" aria-hidden />
                Phone
              </button>
              <button
                type="button"
                onClick={() => setDesktopTab("usb")}
                className={`tap-target flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-colors sm:text-[14px] ${desktopTab === "usb"
                  ? "bg-[#003527]/10 text-[#006c49] dark:bg-[#6ffbbe]/10 dark:text-[#6ffbbe]"
                  : "text-muted-foreground hover:bg-surface-elevated dark:hover:bg-[#141414]"
                  }`}
                aria-label="Wired scanner tips"
              >
                <Keyboard className="size-4 shrink-0" aria-hidden />
                Scanner
              </button>
            </div>

            {desktopTab === "phone" ? (
              <div className="flex min-h-0 flex-1 flex-col items-center gap-4 overflow-y-auto px-4 py-6 sm:px-6">
                {relayError ? (
                  <p className="text-center text-[13px] text-red-600 dark:text-red-400">
                    {relayError}
                  </p>
                ) : null}
                <div className="flex flex-col items-center gap-3">
                  {qrDataUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={qrDataUrl}
                      alt="QR code to open phone scanner"
                      width={220}
                      height={220}
                      className="rounded-xl border border-[#e5e7eb] bg-white p-2 dark:border-white/[0.12]"
                    />
                  ) : (
                    <div className="flex size-[220px] items-center justify-center rounded-xl border border-dashed border-[#bfc9c3]/40 text-[13px] text-muted-foreground dark:border-white/[0.12]">
                      Preparing QR…
                    </div>
                  )}
                  <p className="max-w-[18rem] text-center text-[13px] leading-relaxed text-muted-foreground">
                    Open the camera on your phone and scan this code. Your
                    scans add lines to{" "}
                    <span className="font-medium text-foreground">
                      this register
                    </span>
                    .
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-5 px-6 py-10 text-center">
                <div className="flex size-16 items-center justify-center rounded-2xl bg-[#006c49]/12 text-[#006c49] dark:bg-[#6ffbbe]/12 dark:text-[#6ffbbe]">
                  <Keyboard className="size-8" aria-hidden />
                </div>
                <div className="max-w-[22rem] space-y-2">
                  <p className="font-[family-name:var(--font-display)] text-[15px] font-semibold text-foreground">
                    Scan from the register
                  </p>
                  <p className="text-[13px] leading-relaxed text-muted-foreground">
                    Your scanner works on the sale page — point at a barcode and it adds to the cart. You
                    don’t need to open this window.
                  </p>
                </div>
              </div>
            )}
          </div>
        ) : showMobileCart && mobileCart ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <PosBarcodeScanner
              active
              products={products}
              onProductFound={applyScan}
              onCreateProduct={handleCreateProduct}
              compactFooter
              className="shrink-0 [&_.relative.min-h-0.flex-1]:h-[min(280px,42svh)] [&_.relative.min-h-0.flex-1]:min-h-[200px]"
            />

            <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-[#F8F9FA] dark:bg-[#0a0a0a]">
              <div className="flex shrink-0 items-center justify-between border-b border-[#e5e7eb] px-4 py-2.5 dark:border-white/[0.08]">
                <span className="text-[13px] font-semibold text-foreground">
                  Order items
                </span>
                <span className="rounded-full bg-[#006c49]/12 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-[#006c49] dark:bg-[#6ffbbe]/15 dark:text-[#6ffbbe]">
                  {mobileCart.lines.reduce((s, l) => s + l.qty, 0)}
                </span>
              </div>
              <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-2">
                {mobileCart.lines.length === 0 ? (
                  <p className="py-6 text-center text-[13px] text-muted-foreground">
                    Scanned products appear here — keep the camera open.
                  </p>
                ) : (
                  <ul className="space-y-2.5 pb-1">
                    {mobileCart.lines.map((line) => {
                      const p = mobileCart.productById.get(line.productId);
                      if (!p) return null;
                      return (
                        <li
                          key={line.productId}
                          className="flex gap-3 rounded-2xl border border-[#eef0f2] bg-white p-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)] dark:border-white/[0.08] dark:bg-[#141414] dark:shadow-none"
                        >
                          <div className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-[#f8f9fa] dark:bg-[#1a1a1a] flex items-center justify-center">
                            {p.imageSrc ? (
                              <CatalogProductImage
                                src={p.imageSrc}
                                alt={p.name}
                                className="absolute inset-0 size-full object-cover"
                              />
                            ) : (
                              <span className="text-lg font-bold uppercase opacity-20">
                                {p.name.charAt(0)}
                              </span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-[14px] font-medium leading-snug text-foreground">
                              {p.name}
                            </p>
                            <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                              {p.sku}
                            </p>
                            <p className="mt-0.5 text-[13px] tabular-nums text-muted-foreground">
                              {formatGhs(Number(p.priceGhs))} each
                            </p>
                            <div className="mt-2 flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  mobileCart.onDecrement(line.productId)
                                }
                                className="tap-target flex size-9 items-center justify-center rounded-lg border border-[#e5e7eb] text-[#006c49] transition-colors active:bg-[#f4f4f5] dark:border-white/[0.12] dark:text-[#6ffbbe] dark:active:bg-[#262626]"
                                aria-label="Decrease quantity"
                              >
                                <Minus className="size-4" strokeWidth={2} />
                              </button>
                              <span className="min-w-[2rem] text-center text-[15px] font-semibold tabular-nums text-foreground">
                                {line.qty}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  mobileCart.onIncrement(line.productId)
                                }
                                className="tap-target flex size-9 items-center justify-center rounded-lg border border-[#e5e7eb] text-[#006c49] transition-colors active:bg-[#f4f4f5] dark:border-white/[0.12] dark:text-[#6ffbbe] dark:active:bg-[#262626]"
                                aria-label="Increase quantity"
                              >
                                <Plus className="size-4" strokeWidth={2} />
                              </button>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>

            <div className="shrink-0 border-t border-[#bfc9c3]/15 bg-surface-card px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] dark:border-white/[0.08]">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[13px] font-medium text-muted-foreground">
                  Total
                </span>
                <span className="text-[18px] font-semibold tabular-nums text-foreground">
                  {formatGhs(mobileCart.totalGhs)}
                </span>
              </div>
              <div className="mt-3 flex flex-col gap-2">
                {mobileCart.lines.length > 0 &&
                  mobileCart.onContinueToPayment ? (
                  <button
                    type="button"
                    onClick={mobileCart.onContinueToPayment}
                    className="tap-target w-full rounded-xl bg-gradient-to-br from-[#003527] to-[#064e3b] py-3.5 text-[15px] font-semibold text-white shadow-[0_8px_24px_-8px_rgba(0,53,39,0.45)] dark:shadow-[0_8px_24px_-8px_rgba(0,0,0,0.5)]"
                  >
                    Continue to payment
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={onClose}
                  className="tap-target w-full rounded-xl border border-[#e5e7eb] bg-white py-3 text-[14px] font-medium text-foreground dark:border-white/[0.12] dark:bg-[#141414]"
                >
                  Done scanning
                </button>
              </div>
            </div>
          </div>
        ) : (
          <PosBarcodeScanner
            active
            products={products}
            onProductFound={applyScan}
            onCreateProduct={handleCreateProduct}
            className="min-h-0 flex-1"
          />
        )}
      </div>

      <PosCreateProductFromScanModal
        open={Boolean(createModal)}
        barcode={createModal?.barcode ?? ""}
        globalPrefill={createModal?.globalPrefill}
        onClose={() => setCreateModal(null)}
        onProductCreated={handleProductCreatedFromScan}
      />
    </div>
  );
}
