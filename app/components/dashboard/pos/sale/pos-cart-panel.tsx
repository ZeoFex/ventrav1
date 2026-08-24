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
import { useGlobalCart } from "../global-cart-context";
import type { CartLine } from "./pos-cart-totals";
import { computePosTotals, computeDiscountGhs, lineUnitPrice } from "./pos-cart-totals";
import { CatalogProductImage } from "../../products/catalog-product-image";
import { type ProductRow } from "../../products/types";
import { formatGhs } from "@/app/lib/catalog-utils";
import { SaleTotalDock } from "./sale-total-dock";
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
  compact,
}: {
  qty: number;
  maxQty?: number;
  onIncrement: () => void;
  onDecrement: () => void;
  onSetQuantity: (qty: number) => void;
  disabled?: boolean;
  compact?: boolean;
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

  const sizeClass = compact
    ? "h-8 lg:h-7"
    : "h-10 lg:h-7";
  const btnClass = compact
    ? "flex size-8 items-center justify-center lg:size-7"
    : "tap-target flex size-10 items-center justify-center lg:size-7";

  return (
    <div className={`inline-flex items-center rounded-lg border border-[#e5e7eb] bg-[#fafafa] dark:border-white/[0.1] dark:bg-[#1a1a1a] lg:rounded-md ${sizeClass}`}>
      <button
        type="button"
        onClick={onDecrement}
        disabled={disabled}
        className={`${btnClass} rounded-l-lg text-muted-foreground transition-colors hover:bg-white hover:text-foreground disabled:opacity-40 dark:hover:bg-[#262626] lg:rounded-l-md`}
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
        className={`w-10 border-x border-[#e5e7eb] bg-transparent text-center font-semibold tabular-nums text-foreground outline-none dark:border-white/[0.1] lg:h-7 lg:text-[13px] ${
          compact ? "h-8 text-[13px]" : "h-10 text-[15px]"
        }`}
        aria-label="Quantity"
      />
      <button
        type="button"
        onClick={onIncrement}
        disabled={disabled}
        className={`${btnClass} rounded-r-lg bg-[#003527] text-white transition-[filter] hover:brightness-110 disabled:opacity-40 lg:rounded-r-md`}
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
  const compactChrome = variant === "sheet" || variant === "drawer";

  return (
    <div
      className={
        isPinnedLayout || variant === "sheet"
          ? "flex h-full min-h-0 flex-col overflow-hidden"
          : "flex flex-col"
      }
    >
      {variant === "sheet" ? (
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[#f0f2f4] px-3 py-2 dark:border-white/[0.06]">
          <div className="flex min-w-0 items-center gap-1.5">
            <ShoppingBag
              className="size-4 shrink-0 text-[#006c49] dark:text-[#6ffbbe]"
              strokeWidth={1.75}
              aria-hidden
            />
            <span className="font-[family-name:var(--font-display)] text-[15px] font-semibold tracking-tight text-[#14261e] dark:text-white">
              Cart
            </span>
            <span className="text-[12px] font-medium text-[#7a8c84] dark:text-muted-foreground">
              ({itemCount})
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            <button
              type="button"
              onClick={onReset}
              className="rounded-lg px-2 py-1.5 text-[12px] font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={onCloseSheet}
              className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-surface-elevated dark:hover:bg-[#1a1a1a]"
              aria-label="Close cart"
            >
              <X className="size-4" strokeWidth={2} aria-hidden />
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
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={onReset}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-red-200/80 bg-red-50/80 px-3 py-2 text-[12px] font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-red-500/25 dark:bg-red-950/30 dark:hover:bg-red-950/50"
            >
              <Trash2 className="size-3.5" strokeWidth={2} aria-hidden />
              Reset Order
            </button>
            {onCloseSheet ? (
              <button
                type="button"
                onClick={onCloseSheet}
                className="flex size-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted dark:hover:bg-[#1a1a1a]"
                aria-label="Close cart"
              >
                <X className="size-5" strokeWidth={2} aria-hidden />
              </button>
            ) : null}
          </div>
        </div>
      )}

      <div
        className={
          variant === "drawer"
            ? "mt-3 flex shrink-0 flex-col gap-3"
            : "mt-3 flex shrink-0 flex-col gap-3 px-0"
        }
      >
        <div className={variant === "sheet" ? "px-3" : undefined}>
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
              ? "min-h-0 flex-1 overflow-y-auto overscroll-contain px-3"
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
                    <div className="relative size-11 shrink-0 overflow-hidden rounded-xl bg-[#f3f6f4] ring-1 ring-[#e4ebe6] dark:bg-[#1a1a1a] dark:ring-white/[0.08]">
                      {p.imageSrc ? (
                        <CatalogProductImage
                          src={p.imageSrc}
                          alt=""
                          className="size-full object-cover"
                        />
                      ) : (
                        <div className="flex size-full items-center justify-center">
                          <span className="font-[family-name:var(--font-display)] text-[13px] font-semibold uppercase text-[#006c49]/35 dark:text-[#6ffbbe]/35">
                            {p.name.charAt(0)}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-[family-name:var(--font-display)] text-[14px] font-semibold leading-tight tracking-tight text-[#14261e] dark:text-white">
                            {p.name}
                          </p>
                          <p className="mt-0.5 truncate text-[11px] font-medium text-[#7a8c84] dark:text-muted-foreground">
                            {variation?.name ? `${variation.name} · ` : ""}
                            {formatGhs(unitPrice)} × {line.qty}
                          </p>
                        </div>
                        <p className="shrink-0 font-[family-name:var(--font-display)] text-[15px] font-bold tabular-nums leading-tight tracking-tight text-[#006c49] dark:text-[#6ffbbe]">
                          {formatGhs(lineTotal)}
                        </p>
                      </div>

                      <div className="mt-1.5 flex items-center justify-between gap-2">
                        <CartQtyControl
                          qty={line.qty}
                          compact={compactChrome}
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

      <div className={`mt-3 shrink-0 space-y-2 rounded-xl border border-[#e5e7eb] bg-[#f7f8f9] dark:border-white/[0.1] dark:bg-[#0c0c0c] ${compactChrome ? "mx-3 p-2.5" : "space-y-3 p-3"}`}>
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
          <span className={`font-[family-name:var(--font-display)] font-bold tabular-nums text-[#006c49] dark:text-[#6ffbbe] ${compactChrome ? "text-lg" : "text-xl"}`}>
            {formatGhs(total)}
          </span>
        </div>

        <div className="flex flex-col gap-1.5">
          <button
            type="button"
            disabled={lines.length === 0 || !onContinue}
            onClick={handleContinue}
            className={`tap-target flex w-full items-center justify-center bg-gradient-to-br from-[#003527] to-[#064e3b] font-semibold text-white shadow-[0_8px_24px_-8px_rgba(0,53,39,0.45)] transition-[filter] hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45 dark:shadow-[0_8px_24px_-8px_rgba(0,0,0,0.5)] ${
              compactChrome
                ? "h-10 rounded-xl text-[13px]"
                : "min-h-[48px] rounded-2xl py-3.5 text-[15px]"
            }`}
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
              className={`tap-target flex w-full items-center justify-center gap-2 border border-[#006c49]/30 bg-white font-semibold text-[#006c49] transition-colors hover:bg-[#006c49]/10 disabled:cursor-not-allowed disabled:opacity-45 dark:border-[#6ffbbe]/30 dark:bg-transparent dark:text-[#6ffbbe] dark:hover:bg-[#6ffbbe]/12 ${
                compactChrome
                  ? "h-9 rounded-xl text-[12px]"
                  : "min-h-[48px] rounded-2xl py-3 text-[14px]"
              }`}
            >
              Customer order (pay &amp; hold)
            </button>
          )}
          {onHoldSale && (
            <button
              type="button"
              disabled={lines.length === 0}
              onClick={onHoldSale}
              className={`tap-target flex w-full items-center justify-center gap-2 border border-[#d1d5db] bg-white font-semibold text-foreground transition-colors hover:bg-[#fafafa] disabled:cursor-not-allowed disabled:opacity-45 dark:border-white/[0.12] dark:bg-transparent dark:hover:bg-white/[0.04] ${
                compactChrome
                  ? "h-9 rounded-xl text-[12px]"
                  : "min-h-[48px] rounded-2xl py-3 text-[14px]"
              }`}
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

export function PosCartPanel({
  open,
  onOpenChange,
  ...props
}: Omit<CartPanelContentProps, "variant" | "onCloseSheet" | "onContinueClick"> & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const itemCount = props.lines.reduce((s, l) => s + l.qty, 0);
  const discountGhs = props.appliedDiscount
    ? computeDiscountGhs(props.appliedDiscount, props.lines, props.productById)
    : 0;
  const { total } = computePosTotals(props.lines, props.productById, {
    discountGhs,
  });

  return (
    <>
      {itemCount > 0 && !open ? (
        <button
          type="button"
          onClick={() => onOpenChange(true)}
          className="absolute bottom-4 right-4 z-20 hidden min-h-[52px] items-center gap-3 rounded-2xl border border-[#006c49]/25 bg-white px-4 py-2.5 text-left shadow-[0_12px_32px_-12px_rgba(0,53,39,0.45)] transition-transform hover:scale-[1.02] dark:border-[#6ffbbe]/30 dark:bg-[#121212] lg:inline-flex"
        >
          <span className="flex size-9 items-center justify-center rounded-xl bg-[#006c49]/12 text-[#006c49] dark:bg-[#6ffbbe]/15 dark:text-[#6ffbbe]">
            <ShoppingBag className="size-4" strokeWidth={2} aria-hidden />
          </span>
          <span>
            <span className="block text-[12px] font-medium text-muted-foreground">
              {itemCount} item{itemCount === 1 ? "" : "s"}
            </span>
            <span className="block font-[family-name:var(--font-display)] text-[15px] font-semibold tabular-nums text-foreground">
              {formatGhs(total)}
            </span>
          </span>
        </button>
      ) : null}

      {open ? (
        <aside
          className="absolute inset-y-0 right-0 z-20 hidden w-[min(400px,42vw)] flex-col overflow-hidden rounded-[1.35rem] border border-[#006c49]/25 bg-white p-4 shadow-[0_16px_48px_-12px_rgba(0,53,39,0.35),0_1px_3px_rgba(15,23,42,0.08)] dark:border-[#6ffbbe]/28 dark:bg-[#121212] dark:shadow-[0_20px_48px_-14px_rgba(0,0,0,0.7)] lg:flex"
          role="dialog"
          aria-modal="false"
          aria-label="Transaction details"
        >
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#003527] via-[#006c49] to-[#6ffbbe]/80"
            aria-hidden
          />
          <PosCartPanelContent
            variant="desktop"
            {...props}
            onCloseSheet={() => onOpenChange(false)}
          />
        </aside>
      ) : null}
    </>
  );
}

export function PosMobileCartDock({
  open,
  onOpenChange,
  ...props
}: Omit<CartPanelContentProps, "variant" | "onCloseSheet" | "onContinueClick"> & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { lastAdded } = useGlobalCart();
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
  const latestLine = props.lines[0];
  const latestProduct = latestLine ? props.productById.get(latestLine.productId) : undefined;
  const name = lastAdded?.name ?? latestProduct?.name ?? null;

  const closeSheet = useCallback(() => onOpenChange(false), [onOpenChange]);
  const goPay = () => props.onContinue?.();

  return (
    <>
      <SaleTotalDock
        total={total}
        itemCount={lineCount}
        itemName={name}
        onReview={() => onOpenChange(true)}
        onPay={goPay}
      />

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden" role="presentation">
          <button
            type="button"
            className="absolute inset-0 bg-black/45 backdrop-blur-[1px]"
            aria-label="Close cart"
            onClick={closeSheet}
          />
          <div
            className="absolute bottom-0 left-0 right-0 flex h-[min(92dvh,100%)] max-h-[92dvh] flex-col overflow-hidden rounded-t-2xl border border-b-0 border-[#eef0f2] bg-white shadow-2xl dark:border-white/[0.1] dark:bg-[#111]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pos-mobile-cart-title"
          >
            <span id="pos-mobile-cart-title" className="sr-only">
              Shopping cart
            </span>
            <div
              className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-muted-foreground/25"
              aria-hidden
            />
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-1">
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
