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
import { useCallback, useState } from "react";
import type { CartLine } from "./pos-cart-totals";
import { computePosTotals } from "./pos-cart-totals";
import { CatalogProductImage } from "../../products/catalog-product-image";
import { type ProductRow } from "../../products/types";
import { formatGhs } from "@/app/lib/catalog-utils";
import { PosCustomerSelector } from "./pos-customer-selector";
import type { Discount } from "../../marketing/discounts-data-hooks";

export type { CartLine } from "./pos-cart-totals";

type CartPanelContentProps = {
  variant: "desktop" | "sheet";
  lines: CartLine[];
  productById: Map<string, ProductRow>;
  onIncrement: (productId: string) => void;
  onDecrement: (productId: string) => void;
  onRemove: (productId: string) => void;
  onReset: () => void;
  onContinue?: () => void;
  onHoldSale?: () => void;
  onCloseSheet?: () => void;
  /** Wrap continue (e.g. close sheet first) */
  onContinueClick?: () => void;
  customerId?: string | null;
  onCustomerSelect?: (customer: any | null) => void;
  discounts?: Discount[];
  appliedDiscount?: Discount | null;
  onSelectDiscount?: (id: string | null) => void;
};

export function PosCartPanelContent({
  variant,
  lines,
  productById,
  onIncrement,
  onDecrement,
  onRemove,
  onReset,
  onContinue,
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
    ? appliedDiscount.type === 'percentage' 
      ? lines.reduce((sum, l) => sum + Number(productById.get(l.productId)?.priceGhs || 0) * l.qty, 0) * (Number(appliedDiscount.value) / 100)
      : Number(appliedDiscount.value)
    : 0;

  const { subtotal, tax, discount, total } = computePosTotals(
    lines,
    productById,
    { discountGhs: discountGhs }
  );

  const scrollClass =
    variant === "sheet"
      ? "max-h-[min(48dvh,380px)] min-h-[120px]"
      : "max-h-[min(42vh,360px)]";

  const handleContinue = () => {
    onContinueClick?.();
    onContinue?.();
  };

  return (
    <>
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
              ({lines.reduce((s, l) => s + l.qty, 0)} items)
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
        <div className="flex items-start justify-between gap-3 border-b border-[#f0f2f4] pb-4 dark:border-white/[0.06]">
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-foreground">
            Transaction Details
          </h2>
          <button
            type="button"
            onClick={onReset}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-[#e5e7eb] bg-white px-3 py-2 text-[12px] font-medium text-red-600 transition-colors hover:bg-red-50 dark:border-white/[0.12] dark:bg-transparent dark:hover:bg-red-950/40"
          >
            <Trash2 className="size-3.5" strokeWidth={2} aria-hidden />
            Reset Order
          </button>
        </div>
      )}

      <div className="mt-4 px-4 flex flex-col gap-3">
        <PosCustomerSelector
          selectedId={customerId ?? null}
          onSelect={(c) => onCustomerSelect?.(c)}
        />
        
        {discounts.length > 0 && (
          <div className="flex items-center justify-between gap-2 text-[13px]">
            <span className="text-muted-foreground font-medium flex items-center gap-1.5"><Percent className="size-3.5" /> Discount</span>
            <select
              disabled={lines.length === 0}
              className="bg-transparent text-foreground font-semibold outline-none border border-[#e5e7eb] dark:border-white/[0.1] rounded-lg px-2 py-1 max-w-[140px] truncate"
              value={appliedDiscount ? appliedDiscount.id : ""}
              onChange={(e) => onSelectDiscount?.(e.target.value === "" ? null : e.target.value)}
            >
              <option value="">No Discount</option>
              {discounts.map(d => (
                <option key={d.id} value={d.id}>{d.name} ({d.type === 'fixed' ? `GH₵${d.value}` : `${d.value}%`})</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div
        className={`custom-scrollbar flex min-h-0 flex-col gap-3 overflow-y-auto py-4 pr-1 ${scrollClass}`}
      >
        {lines.length === 0 ? (
          <p className="py-8 text-center text-[13px] text-muted-foreground">
            No items yet. Add products from the grid.
          </p>
        ) : (
          lines.map((line) => {
            const p = productById.get(line.productId);
            if (!p) return null;
            const lineTotal = Number(p.priceGhs) * line.qty;
            const qtyStr = String(line.qty).padStart(2, "0");
            return (
              <div
                key={line.productId}
                className="rounded-2xl border border-[#eef0f2] p-3 dark:border-white/[0.08]"
              >
                <div className="flex gap-3">
                  <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-[#f8f9fa] dark:bg-[#1a1a1a] flex items-center justify-center">
                    {p.imageSrc ? (
                      <CatalogProductImage
                        src={p.imageSrc}
                        alt={p.name}
                        className="absolute inset-0 size-full object-cover"
                      />
                    ) : (
                      <span className="text-xl font-bold uppercase opacity-20 text-muted-foreground">
                        {p.name.charAt(0)}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium leading-tight text-foreground">
                      {p.name}
                    </p>
                    <p className="mt-0.5 text-[12px] text-muted-foreground">
                      SKU: {p.sku}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemove(line.productId)}
                    className="tap-target flex shrink-0 self-start rounded-lg p-2 text-red-600 transition-colors hover:bg-red-50 dark:hover:bg-red-950/40"
                    aria-label="Remove"
                  >
                    <Trash2 className="size-4" strokeWidth={2} />
                  </button>
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1 rounded-full border border-[#e5e7eb] bg-[#fafafa] p-1 dark:border-white/[0.1] dark:bg-[#1a1a1a] sm:gap-2 sm:p-1">
                    <button
                      type="button"
                      onClick={() => onDecrement(line.productId)}
                      className="tap-target flex size-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-white hover:text-foreground sm:size-8 dark:hover:bg-[#262626]"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="size-4" strokeWidth={2} />
                    </button>
                    <span className="min-w-[2rem] text-center text-[13px] font-semibold tabular-nums">
                      {qtyStr}
                    </span>
                    <button
                      type="button"
                      onClick={() => onIncrement(line.productId)}
                      className="tap-target flex size-10 items-center justify-center rounded-full bg-[#003527] text-white shadow-sm transition-[filter] hover:brightness-110 sm:size-8"
                      aria-label="Increase quantity"
                    >
                      <Plus className="size-4" strokeWidth={2.5} />
                    </button>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] text-muted-foreground">Total</p>
                    <p className="text-[14px] font-semibold tabular-nums text-foreground">
                      {formatGhs(lineTotal)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="mt-2 space-y-3 border-t border-[#f0f2f4] pt-4 dark:border-white/[0.06]">
        <dl className="space-y-2 text-[13px]">
          <div className="flex justify-between gap-4 text-muted-foreground">
            <dt>Sub-Total</dt>
            <dd className="tabular-nums text-foreground">
              {formatGhs(subtotal)}
            </dd>
          </div>
          <div className="flex justify-between gap-4 text-muted-foreground">
            <dt>Tax (12%)</dt>
            <dd className="tabular-nums text-foreground">{formatGhs(tax)}</dd>
          </div>
          <div className="flex justify-between gap-4 text-muted-foreground">
            <dt>Discount {appliedDiscount ? `(${appliedDiscount.name})` : ''}</dt>
            <dd className="tabular-nums text-foreground">
              −{formatGhs(discount)}
            </dd>
          </div>
        </dl>

        <div className="border-t border-[#eef0f2] pt-3 dark:border-white/[0.08]">
          <div className="flex items-center justify-between gap-4">
            <span className="text-[15px] font-semibold text-foreground">
              Total Payment
            </span>
            <span className="font-[family-name:var(--font-display)] text-xl font-semibold tabular-nums text-foreground">
              {formatGhs(total)}
            </span>
          </div>
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
          {onHoldSale && (
            <button
              type="button"
              disabled={lines.length === 0}
              onClick={onHoldSale}
              className="tap-target flex w-full min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-[#e5e7eb] bg-white py-3 text-[14px] font-semibold text-foreground transition-colors hover:bg-[#fafafa] disabled:cursor-not-allowed disabled:opacity-45 dark:border-white/[0.12] dark:bg-transparent dark:hover:bg-white/[0.04]"
            >
              <PauseCircle className="size-4" strokeWidth={2} aria-hidden />
              Hold sale
            </button>
          )}
        </div>
      </div>
    </>
  );
}

export function PosCartPanel(
  props: Omit<
    CartPanelContentProps,
    "variant" | "onCloseSheet" | "onContinueClick"
  >,
) {
  return (
    <aside className="hidden lg:flex w-[320px] xl:w-[360px] 2xl:w-[400px] shrink-0 rounded-[1.25rem] border border-[#eef0f2] bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.05)] dark:border-white/[0.08] dark:bg-[#111] lg:max-h-[min(calc(100dvh-2rem),920px)] lg:flex-col lg:self-start lg:sticky lg:top-4">
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
    ? props.appliedDiscount.type === 'percentage' 
      ? props.lines.reduce((sum, l) => sum + Number(props.productById.get(l.productId)?.priceGhs || 0) * l.qty, 0) * (Number(props.appliedDiscount.value) / 100)
      : Number(props.appliedDiscount.value)
    : 0;

  const { total } = computePosTotals(props.lines, props.productById, { discountGhs });
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
            className="absolute bottom-0 left-0 right-0 flex max-h-[min(92dvh,720px)] flex-col rounded-t-3xl border border-b-0 border-[#eef0f2] bg-white shadow-2xl motion-safe:transition-transform motion-safe:duration-300 dark:border-white/[0.1] dark:bg-[#111]"
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
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2">
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
