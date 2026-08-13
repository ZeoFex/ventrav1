"use client";

import {
  Minus,
  PauseCircle,
  Percent,
  Plus,
  ShoppingBag,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CartLine } from "./pos-cart-totals";
import { computePosTotals, computeDiscountGhs, lineUnitPrice } from "./pos-cart-totals";
import { CatalogProductImage } from "../../products/catalog-product-image";
import { type ProductRow } from "../../products/types";
import { formatGhs } from "@/app/lib/catalog-utils";
import { PosCustomerSelector } from "./pos-customer-selector";
import type { Discount } from "../../marketing/discounts-data-hooks";
import type { CustomerRow } from "../../customers/customers-mock-data";

export type { CartLine } from "./pos-cart-totals";

type CartPanelContentProps = {
  /** `drawer`: bottom-sheet quick cart — single outer scroll, no inner max-height. */
  variant: "desktop" | "sheet" | "drawer";
  lines: CartLine[];
  productById: Map<string, ProductRow>;
  onIncrement: (productId: string, variationId?: string) => void;
  onDecrement: (productId: string, variationId?: string) => void;
  onSetQuantity: (productId: string, qty: number, variationId?: string) => void;
  onRemove: (productId: string, variationId?: string) => void;
  onReset: () => void;
  onContinue?: () => void;
  /** Pay & hold: customer order / layaway (requires customer on cart). */
  onCustomerOrder?: () => void;
  onHoldSale?: () => void;
  onCloseSheet?: () => void;
  /** Wrap continue (e.g. close sheet first) */
  onContinueClick?: () => void;
  customerId?: string | null;
  onCustomerSelect?: (customer: CustomerRow | null) => void;
  discounts?: Discount[];
  appliedDiscount?: Discount | null;
  onSelectDiscount?: (id: string | null) => void;
};

function sellableQty(p: ProductRow, variationId?: string): number {
  if (variationId && p.variations?.length) {
    const v = p.variations.find((x) => x.id === variationId);
    if (v) return Math.max(0, Number(v.stockAvailable ?? v.stock) || 0);
  }
  return Math.max(0, Number(p.stockAvailable ?? p.stock) || 0);
}

function parseQtyInput(raw: string): number | null {
  const parsed = Number.parseInt(raw.replace(/[^\d]/g, ""), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

function CartQtyControl({
  qty,
  maxQty,
  onIncrement,
  onDecrement,
  onSetQuantity,
  disabled,
}: {
  qty: number;
  maxQty?: number;
  onIncrement: () => void;
  onDecrement: () => void;
  onSetQuantity: (qty: number) => void;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState(String(qty));
  const [syncedQty, setSyncedQty] = useState(qty);

  if (qty !== syncedQty) {
    setSyncedQty(qty);
    setDraft(String(qty));
  }

  const applyQty = (raw: string, { revertIfInvalid = false } = {}) => {
    const parsed = parseQtyInput(raw);
    if (parsed == null) {
      if (revertIfInvalid) setDraft(String(qty));
      return;
    }
    const cap =
      maxQty != null && Number.isFinite(maxQty) ? Math.max(0, maxQty) : Infinity;
    const next = Math.min(parsed, cap);
    if (next <= 0) {
      if (revertIfInvalid) setDraft(String(qty));
      return;
    }
    if (String(next) !== raw) setDraft(String(next));
    if (next !== qty) onSetQuantity(next);
  };

  return (
    <div className="inline-flex h-7 items-center rounded-md border border-[#e5e7eb] bg-[#fafafa] dark:border-white/[0.1] dark:bg-[#1a1a1a]">
      <button
        type="button"
        onClick={onDecrement}
        disabled={disabled}
        className="tap-target flex size-7 items-center justify-center rounded-l-md text-muted-foreground transition-colors hover:bg-white hover:text-foreground disabled:opacity-40 dark:hover:bg-[#262626]"
        aria-label="Decrease quantity"
      >
        <Minus className="size-3.5" strokeWidth={2.25} />
      </button>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={draft}
        disabled={disabled}
        onChange={(e) => {
          const next = e.target.value.replace(/[^\d]/g, "");
          setDraft(next);
          applyQty(next);
        }}
        onBlur={() => applyQty(draft, { revertIfInvalid: true })}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.currentTarget.blur();
          }
          if (e.key === "Escape") {
            setDraft(String(qty));
            e.currentTarget.blur();
          }
        }}
        className="h-7 w-12 border-x border-[#e5e7eb] bg-transparent text-center text-[13px] font-semibold tabular-nums text-foreground outline-none dark:border-white/[0.1]"
        aria-label="Quantity"
      />
      <button
        type="button"
        onClick={onIncrement}
        disabled={disabled}
        className="tap-target flex size-7 items-center justify-center rounded-r-md bg-[#003527] text-white transition-[filter] hover:brightness-110 disabled:opacity-40"
        aria-label="Increase quantity"
      >
        <Plus className="size-3.5" strokeWidth={2.5} />
      </button>
    </div>
  );
}

export function PosCartPanelContent({
  variant,
  lines,
  productById,
  onIncrement,
  onDecrement,
  onSetQuantity,
  onRemove,
  onReset,
  onContinue,
  onCustomerOrder,
  onHoldSale,
  onCloseSheet,
  onContinueClick,
  customerId,
  onCustomerSelect,
  discounts = [],
  appliedDiscount,
  onSelectDiscount,
}: CartPanelContentProps) {
  const discountGhs = appliedDiscount
    ? computeDiscountGhs(appliedDiscount, lines, productById)
    : 0;

  const { discount, total } = computePosTotals(
    lines,
    productById,
    { discountGhs: discountGhs }
  );

  const itemCount = lines.reduce((s, l) => s + l.qty, 0);
  const linesScrollRef = useRef<HTMLDivElement>(null);
  const linesTopRef = useRef<HTMLLIElement>(null);

  useEffect(() => {
    if (variant === "drawer") return;
    linesTopRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [lines.length, itemCount, variant]);

  const handleContinue = () => {
    onContinueClick?.();
    onContinue?.();
  };

  const isPinnedLayout = variant === "desktop";

  return (
    <div
      className={
        isPinnedLayout
          ? "flex h-full min-h-0 flex-col"
          : "flex flex-col"
      }
    >
      {variant === "sheet" ? (
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#f0f2f4] px-4 py-3 dark:border-white/[0.06]">
          <div className="flex min-w-0 items-center gap-2">
            <ShoppingBag
              className="size-5 shrink-0 text-[#006c49] dark:text-[#6ffbbe]"
              strokeWidth={1.75}
              aria-hidden
            />
            <span className="font-[family-name:var(--font-display)] text-base font-semibold text-foreground">
              Cart
            </span>
            <span className="text-[13px] text-muted-foreground">
              ({itemCount} items)
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={onReset}
              className="rounded-lg px-2 py-2 text-[12px] font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={onCloseSheet}
              className="flex size-11 items-center justify-center rounded-xl text-muted-foreground hover:bg-surface-elevated dark:hover:bg-[#1a1a1a]"
              aria-label="Close cart"
            >
              <X className="size-5" strokeWidth={2} aria-hidden />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[#e5e7eb] pb-3.5 dark:border-white/[0.1]">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#006c49]/12 text-[#006c49] dark:bg-[#6ffbbe]/15 dark:text-[#6ffbbe]">
                <ShoppingBag className="size-4" strokeWidth={2} aria-hidden />
              </div>
              <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight text-foreground">
                Transaction Details
              </h2>
              {itemCount > 0 ? (
                <span className="inline-flex items-center rounded-full bg-[#006c49] px-2.5 py-0.5 text-[12px] font-semibold tabular-nums text-white dark:bg-[#6ffbbe] dark:text-[#003527]">
                  {itemCount} item{itemCount === 1 ? "" : "s"}
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full border border-[#d1d5db] bg-[#f3f4f6] px-2.5 py-0.5 text-[12px] font-semibold text-muted-foreground dark:border-white/[0.12] dark:bg-[#1a1a1a]">
                  Empty
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onReset}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-red-200/80 bg-red-50/80 px-3 py-2 text-[12px] font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-500/25 dark:bg-red-950/30 dark:hover:bg-red-950/50"
          >
            <Trash2 className="size-3.5" strokeWidth={2} aria-hidden />
            Reset Order
          </button>
        </div>
      )}

      <div
        className={
          variant === "drawer"
            ? "mt-3 flex shrink-0 flex-col gap-3"
            : "mt-3 flex shrink-0 flex-col gap-3 px-0"
        }
      >
        <div className={variant === "sheet" ? "px-4" : undefined}>
          <PosCustomerSelector
            selectedId={customerId ?? null}
            onSelect={(c) => onCustomerSelect?.(c)}
          />

          {discounts.length > 0 && (
            <div className="mt-3 flex items-center justify-between gap-2 text-[13px]">
              <span className="flex items-center gap-1.5 font-medium text-muted-foreground">
                <Percent className="size-3.5" /> Discount
              </span>
              <select
                disabled={lines.length === 0}
                className="min-w-0 max-w-[200px] truncate rounded-lg border border-[#e5e7eb] bg-transparent px-2 py-1 font-semibold text-foreground outline-none dark:border-white/[0.1]"
                value={appliedDiscount ? appliedDiscount.id : ""}
                onChange={(e) =>
                  onSelectDiscount?.(e.target.value === "" ? null : e.target.value)
                }
              >
                <option value="">No Discount</option>
                {discounts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} (
                    {d.type === "fixed" ? `GH₵${d.value}` : `${d.value}%`})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      <div
        ref={linesScrollRef}
        className={`mt-3 min-h-0 min-w-0 ${
          isPinnedLayout
            ? "flex-1 overflow-y-auto overscroll-contain pr-0.5"
            : variant === "sheet"
              ? "max-h-[min(40dvh,320px)] overflow-y-auto overscroll-contain px-4"
              : ""
        }`}
      >
        {lines.length === 0 ? (
          <div className="flex h-full min-h-[140px] flex-col items-center justify-center rounded-xl border border-dashed border-[#d1d5db] bg-[#f8f9fa]/80 px-4 py-8 text-center dark:border-white/[0.12] dark:bg-[#0d0d0d]/80">
            <ShoppingBag
              className="mb-2 size-7 text-muted-foreground/35"
              strokeWidth={1.5}
              aria-hidden
            />
            <p className="text-[13px] font-medium text-muted-foreground">
              No items yet
            </p>
            <p className="mt-0.5 text-[12px] text-muted-foreground/80">
              Add products from the list
            </p>
          </div>
        ) : (
          <ul className="overflow-hidden rounded-xl border border-[#d1d5db] bg-white divide-y divide-[#eef0f2] dark:border-white/[0.1] dark:bg-[#0f0f0f] dark:divide-white/[0.06]">
            {lines.map((line, index) => {
              const p = productById.get(line.productId);
              if (!p) return null;
              const unitPrice = lineUnitPrice(line, productById);
              const lineTotal = unitPrice * line.qty;
              const variation = line.variationId
                ? p.variations?.find((v) => v.id === line.variationId)
                : undefined;
              const lineKey = line.variationId
                ? `${line.productId}:${line.variationId}`
                : line.productId;
              const isNewest = index === 0;
              return (
                <li
                  key={lineKey}
                  ref={isNewest ? linesTopRef : undefined}
                  className="px-2.5 py-2"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="relative size-9 shrink-0 overflow-hidden rounded-md border border-[#eef0f2] bg-[#f4f5f6] dark:border-white/[0.08] dark:bg-[#1a1a1a]">
                      {p.imageSrc ? (
                        <CatalogProductImage
                          src={p.imageSrc}
                          alt=""
                          className="size-full object-cover"
                        />
                      ) : (
                        <div className="flex size-full items-center justify-center">
                          <span className="text-xs font-semibold uppercase text-muted-foreground/40">
                            {p.name.charAt(0)}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-semibold leading-tight text-foreground">
                            {p.name}
                          </p>
                          <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                            {variation?.name ? `${variation.name} · ` : ""}
                            {formatGhs(unitPrice)} × {line.qty}
                          </p>
                        </div>
                        <p className="shrink-0 text-[13px] font-semibold tabular-nums leading-tight text-foreground">
                          {formatGhs(lineTotal)}
                        </p>
                      </div>

                      <div className="mt-1.5 flex items-center justify-between gap-2">
                        <CartQtyControl
                          qty={line.qty}
                          maxQty={sellableQty(p, line.variationId)}
                          onIncrement={() =>
                            onIncrement(line.productId, line.variationId)
                          }
                          onDecrement={() =>
                            onDecrement(line.productId, line.variationId)
                          }
                          onSetQuantity={(qty) =>
                            onSetQuantity(line.productId, qty, line.variationId)
                          }
                        />
                        <button
                          type="button"
                          onClick={() =>
                            onRemove(line.productId, line.variationId)
                          }
                          className="tap-target flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                          aria-label={`Remove ${p.name}`}
                          title="Remove item"
                        >
                          <Trash2 className="size-3.5" strokeWidth={2} />
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="mt-3 shrink-0 space-y-3 rounded-xl border border-[#e5e7eb] bg-[#f7f8f9] p-3 dark:border-white/[0.1] dark:bg-[#0c0c0c]">
        {discount > 0 ? (
          <div className="flex items-center justify-between gap-4 text-[13px] text-muted-foreground">
            <span>
              Discount{appliedDiscount ? ` (${appliedDiscount.name})` : ""}
            </span>
            <span className="tabular-nums font-medium text-foreground">
              −{formatGhs(discount)}
            </span>
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-4">
          <span className="text-[14px] font-semibold text-foreground">
            Total
          </span>
          <span className="font-[family-name:var(--font-display)] text-xl font-bold tabular-nums text-[#006c49] dark:text-[#6ffbbe]">
            {formatGhs(total)}
          </span>
        </div>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={lines.length === 0 || !onContinue}
            onClick={handleContinue}
            className="tap-target flex w-full min-h-[48px] items-center justify-center rounded-2xl bg-gradient-to-br from-[#003527] to-[#064e3b] py-3.5 text-[15px] font-semibold text-white shadow-[0_8px_24px_-8px_rgba(0,53,39,0.45)] transition-[filter] hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45 dark:shadow-[0_8px_24px_-8px_rgba(0,0,0,0.5)]"
          >
            Continue to payment
          </button>
          {onCustomerOrder && (
            <button
              type="button"
              disabled={lines.length === 0 || !customerId}
              title={
                !customerId
                  ? "Select a customer for pay-and-hold orders"
                  : undefined
              }
              onClick={onCustomerOrder}
              className="tap-target flex w-full min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-[#006c49]/30 bg-white py-3 text-[14px] font-semibold text-[#006c49] transition-colors hover:bg-[#006c49]/10 disabled:cursor-not-allowed disabled:opacity-45 dark:border-[#6ffbbe]/30 dark:bg-transparent dark:text-[#6ffbbe] dark:hover:bg-[#6ffbbe]/12"
            >
              Customer order (pay &amp; hold)
            </button>
          )}
          {onHoldSale && (
            <button
              type="button"
              disabled={lines.length === 0}
              onClick={onHoldSale}
              className="tap-target flex w-full min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-[#d1d5db] bg-white py-3 text-[14px] font-semibold text-foreground transition-colors hover:bg-[#fafafa] disabled:cursor-not-allowed disabled:opacity-45 dark:border-white/[0.12] dark:bg-transparent dark:hover:bg-white/[0.04]"
            >
              <PauseCircle className="size-4" strokeWidth={2} aria-hidden />
              Hold sale
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function PosCartPanel(
  props: Omit<
    CartPanelContentProps,
    "variant" | "onCloseSheet" | "onContinueClick"
  >,
) {
  return (
    <aside className="relative hidden h-full min-h-0 w-[320px] shrink-0 flex-col overflow-hidden rounded-[1.35rem] border border-[#006c49]/25 bg-white p-4 shadow-[0_8px_30px_-12px_rgba(0,53,39,0.28),0_1px_3px_rgba(15,23,42,0.06)] dark:border-[#6ffbbe]/28 dark:bg-[#121212] dark:shadow-[0_12px_36px_-14px_rgba(0,0,0,0.65)] lg:flex xl:w-[360px] 2xl:w-[400px]">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#003527] via-[#006c49] to-[#6ffbbe]/80"
        aria-hidden
      />
      <PosCartPanelContent variant="desktop" {...props} />
    </aside>
  );
}

export function PosMobileCartDock(
  props: Omit<
    CartPanelContentProps,
    "variant" | "onCloseSheet" | "onContinueClick"
  >,
) {
  const [open, setOpen] = useState(false);
  const discountGhs = props.appliedDiscount
    ? props.appliedDiscount.type === "percentage"
      ? props.lines.reduce(
          (sum, l) =>
            sum +
            Number(props.productById.get(l.productId)?.priceGhs || 0) * l.qty,
          0,
        ) *
        (Number(props.appliedDiscount.value) / 100)
      : Number(props.appliedDiscount.value)
    : 0;

  const { total } = computePosTotals(props.lines, props.productById, {
    discountGhs,
  });
  const lineCount = props.lines.reduce((s, l) => s + l.qty, 0);

  const closeSheet = useCallback(() => setOpen(false), []);

  return (
    <>
      <div
        className="fixed inset-x-0 bottom-0 z-40 border-t border-[#eef0f2] bg-white/95 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_32px_-8px_rgba(0,0,0,0.08)] backdrop-blur-md dark:border-white/[0.08] dark:bg-[#111]/95 dark:shadow-[0_-8px_32px_-8px_rgba(0,0,0,0.4)] lg:hidden"
        role="region"
        aria-label="Cart summary"
      >
        <div className="mx-auto flex max-w-[1600px] items-stretch gap-2 px-3 sm:px-4">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="tap-target flex min-h-[52px] min-w-0 flex-1 items-center justify-between gap-3 rounded-2xl border border-[#e5e7eb] bg-white px-3 text-left dark:border-white/[0.12] dark:bg-[#141414]"
          >
            <span className="text-[13px] font-medium text-muted-foreground">
              {lineCount === 0 ? (
                "Tap to open cart"
              ) : (
                <>
                  <span className="text-foreground">{lineCount} items</span>
                  <span className="mx-1">·</span>
                  <span>Review</span>
                </>
              )}
            </span>
            <span className="shrink-0 font-[family-name:var(--font-display)] text-[17px] font-semibold tabular-nums text-foreground">
              {formatGhs(total)}
            </span>
          </button>
          {lineCount > 0 && props.onContinue ? (
            <button
              type="button"
              onClick={() => props.onContinue?.()}
              className="tap-target flex min-h-[52px] shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#003527] to-[#064e3b] px-4 text-[14px] font-semibold text-white shadow-[0_8px_24px_-8px_rgba(0,53,39,0.45)] dark:shadow-[0_8px_24px_-8px_rgba(0,0,0,0.5)]"
            >
              Pay
            </button>
          ) : null}
        </div>
      </div>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="presentation">
          <button
            type="button"
            className="absolute inset-0 bg-black/45 backdrop-blur-[1px]"
            aria-label="Close cart"
            onClick={closeSheet}
          />
          <div
            className="absolute bottom-0 left-0 right-0 flex max-h-[min(92dvh,720px)] flex-col overflow-y-auto rounded-t-3xl border border-b-0 border-[#eef0f2] bg-white shadow-2xl motion-safe:transition-transform motion-safe:duration-300 dark:border-white/[0.1] dark:bg-[#111]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pos-mobile-cart-title"
          >
            <span id="pos-mobile-cart-title" className="sr-only">
              Shopping cart
            </span>
            <div
              className="mx-auto mt-3 h-1 w-10 shrink-0 rounded-full bg-muted-foreground/25"
              aria-hidden
            />
            <div className="flex flex-col px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2">
              <PosCartPanelContent
                variant="sheet"
                {...props}
                onCloseSheet={closeSheet}
                onContinueClick={closeSheet}
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
