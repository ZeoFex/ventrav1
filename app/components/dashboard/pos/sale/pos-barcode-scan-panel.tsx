"use client";

import QRCode from "qrcode";
import Image from "next/image";
import { Minus, MonitorSmartphone, Plus, ScanLine, Usb, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import type { CartLine } from "./pos-cart-totals";
import { PosBarcodeCamera } from "./pos-barcode-camera";
import { resolveProductFromScan } from "./pos-barcode-resolve";
import { type ProductRow } from "../../products/types";
import { formatGhs } from "@/app/lib/catalog-utils";

type PosBarcodeScanPanelProps = {
  open: boolean;
  onClose: () => void;
  products: ProductRow[];
  onProductAdded: (product: ProductRow, variationId?: string) => void;
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

function useIsDesktopLayout(): boolean {
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    setDesktop(mq.matches);
    const fn = () => setDesktop(mq.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);
  return desktop;
}

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
  const [banner, setBanner] = useState<{
    tone: "ok" | "err";
    text: string;
  } | null>(null);
  const usbBufferRef = useRef("");
  const lastEmitRef = useRef<{ raw: string; at: number } | null>(null);

  const applyScan = useCallback(
    (raw: string) => {
      console.log(`[scan:apply] raw barcode: "${raw}"`);
      const now = Date.now();
      const prev = lastEmitRef.current;
      if (prev && prev.raw === raw && now - prev.at < 500) {
        console.log(`[scan:apply] ⏭ duplicate scan skipped (same barcode within 500ms)`);
        return;
      }
      lastEmitRef.current = { raw, at: now };

      console.log(`[scan:apply] resolving barcode against ${products.length} products…`);
      const result = resolveProductFromScan(raw, products);
      if (!result.ok) {
        console.log(`[scan:apply] resolve failed: ${result.message}`);
        setBanner({ tone: "err", text: result.message });
        return;
      }
      let displayName = result.product.name;
      if (result.variationId && result.product.variations) {
        const v = result.product.variations.find(v => v.id === result.variationId);
        if (v) displayName += ` (${v.name})`;
      }

      console.log(`[scan:apply] matched: "${displayName}" (id=${result.product.id}, vId=${result.variationId})`);
      onProductAdded(result.product, result.variationId);

      // Desktop: toast-style banner. Mobile with inline cart: list updates; camera stays open.
      if (isDesktop || !mobileCart) {
        setBanner({
          tone: "ok",
          text: `Added · ${displayName}`,
        });
      }
    },
    [isDesktop, mobileCart, onProductAdded, products],
  );

  useEffect(() => {
    if (!banner) return;
    const t = window.setTimeout(() => setBanner(null), 2800);
    return () => window.clearTimeout(t);
  }, [banner]);

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
          applyScan(s.barcode);
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
  }, [isDesktop, sessionId, pairToken, applyScan]);

  useEffect(() => {
    if (!isDesktop) return;

    const onKey = (e: KeyboardEvent) => {
      // Ignore keystrokes if the user is typing in an input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();
        const raw = usbBufferRef.current;
        usbBufferRef.current = "";
        if (raw.trim()) applyScan(raw);
        return;
      }
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        usbBufferRef.current += e.key;
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isDesktop, applyScan]);

  useEffect(() => {
    if (!open) {
      setDesktopTab("phone");
      setBanner(null);
      usbBufferRef.current = "";
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
                ? "Pair your phone or use a USB scanner."
                : "Point at the product QR or barcode."}
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

        {banner ? (
          <div
            className={`shrink-0 px-4 py-2 text-[13px] sm:px-5 ${banner.tone === "ok"
              ? "bg-[#006c49]/10 text-[#006c49] dark:bg-[#6ffbbe]/10 dark:text-[#6ffbbe]"
              : "bg-red-500/10 text-red-700 dark:text-red-300"
              } ${showMobileCart && banner.tone === "ok" ? "hidden" : ""}`}
          >
            {banner.text}
          </div>
        ) : null}

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
              >
                <Usb className="size-4 shrink-0" aria-hidden />
                USB scanner
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
              <div className="flex flex-1 flex-col gap-4 px-4 py-8 sm:px-6">
                <div className="rounded-xl border border-dashed border-[#bfc9c3]/35 bg-[#F8F9FA] p-6 text-center dark:border-white/[0.12] dark:bg-[#141414]">
                  <ScanLine
                    className="mx-auto size-10 text-[#006c49] dark:text-[#6ffbbe]"
                    strokeWidth={1.5}
                    aria-hidden
                  />
                  <p className="mt-3 text-[14px] font-medium text-foreground">
                    USB barcode scanner
                  </p>
                  <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
                    Plug in your scanner — it types digits like a keyboard.
                    Click here, then scan; each scan should end with Enter.
                  </p>
                </div>
                <input
                  type="text"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  aria-label="USB scanner capture"
                  className="sr-only"
                // keep focusable for accessibility; wedge still uses window keydown
                />
              </div>
            )}
          </div>
        ) : showMobileCart && mobileCart ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="relative w-full shrink-0 bg-black">
              <PosBarcodeCamera
                active
                onScan={applyScan}
                className="h-[min(280px,42svh)] w-full min-h-[200px] [&_video]:h-full [&_video]:object-cover [&_video]:rounded-none"
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-3 pb-2.5 pt-8">
                <p className="text-center text-[12px] leading-snug text-white/88">
                  Align code in frame · items appear below
                </p>
              </div>
            </div>

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
                              <Image
                                src={p.imageSrc}
                                alt={p.name}
                                fill
                                sizes="56px"
                                className="object-cover"
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
          <div className="relative flex min-h-0 flex-1 flex-col bg-black">
            <PosBarcodeCamera
              active
              onScan={applyScan}
              className="min-h-[min(70dvh,520px)] w-full [&_video]:rounded-none"
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-12">
              <p className="text-center text-[13px] text-white/90">
                Align the barcode or QR inside the frame
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
