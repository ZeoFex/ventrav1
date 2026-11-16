"use client";

import { Plus } from "lucide-react";
import { CatalogProductImage } from "../../products/catalog-product-image";
import { type ProductRow } from "../../products/types";
import { formatGhs } from "@/app/lib/catalog-utils";
import { formatQuantity, unitShort } from "@/app/lib/product-units";

const rowGrid =
  "grid w-full grid-cols-[2.75rem_minmax(0,1fr)_auto_2rem] items-center gap-2.5 min-h-[58px] sm:min-h-0 sm:grid-cols-[2.75rem_minmax(0,1fr)_5.5rem_6.5rem_2.75rem] sm:gap-4";

export function PosProductCard({
  product,
  onAdd,
  availableStock,
}: {
  product: ProductRow;
  onAdd: () => void;
  availableStock?: number;
}) {
  const stockToDisplay = Number.isFinite(availableStock as number)
    ? (availableStock as number)
    : Number(product.stock) || 0;
  const isLowOrOversold = stockToDisplay <= 0;
  const unitLabel = unitShort(product.unit);
  const stockLabel = formatQuantity(stockToDisplay, product.unit);

  return (
    <button
      type="button"
      onClick={onAdd}
      className={`${rowGrid} border-b border-[#edf1ef] px-0 py-2.5 text-left transition-colors last:border-b-0 sm:px-4 sm:py-3 dark:border-white/[0.06] hover:bg-[#f6f8f7] active:bg-[#eef3f0] dark:hover:bg-white/[0.04] dark:active:bg-white/[0.06]`}
      aria-label={`Add ${product.name}`}
    >
      <div className="size-11 shrink-0 overflow-hidden rounded-xl bg-[#f3f6f4] ring-1 ring-[#e4ebe6] dark:bg-[#1a1a1a] dark:ring-white/[0.08] sm:size-11 sm:rounded-lg">
        {product.imageSrc ? (
          <CatalogProductImage
            src={product.imageSrc}
            alt=""
            className="size-full object-cover"
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <span className="font-[family-name:var(--font-display)] text-[15px] font-semibold uppercase text-[#006c49]/35 dark:text-[#6ffbbe]/35">
              {product.name.charAt(0)}
            </span>
          </div>
        )}
      </div>

      <span className="min-w-0">
        <span className="block truncate font-[family-name:var(--font-display)] text-[15px] font-semibold leading-snug tracking-tight text-[#14261e] dark:text-white sm:text-[15px]">
          {product.name}
        </span>
        <span className="mt-0.5 flex items-center gap-1.5 sm:hidden">
          <span
            className={`inline-flex items-center rounded-full px-1.5 py-px text-[10px] font-semibold tabular-nums ${
              isLowOrOversold
                ? "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300"
                : "bg-[#e7f4ee] text-[#0f6a4a] dark:bg-[#6ffbbe]/12 dark:text-[#6ffbbe]"
            }`}
          >
            {isLowOrOversold ? `Out of stock · ${stockLabel}` : stockLabel}
          </span>
        </span>
      </span>

      <span className="shrink-0 whitespace-nowrap text-right sm:hidden">
        <span className="block font-[family-name:var(--font-display)] text-[16px] font-bold leading-none tabular-nums tracking-tight text-[#006c49] dark:text-[#6ffbbe]">
          {formatGhs(Number(product.priceGhs))}
        </span>
        {unitLabel ? (
          <span className="mt-0.5 block text-[10px] font-medium text-[#7a8c84] dark:text-muted-foreground">
            /{unitLabel}
          </span>
        ) : null}
      </span>

      <span
        className={`hidden truncate text-right text-[13px] tabular-nums sm:block sm:text-[14px] ${
          isLowOrOversold
            ? "font-medium text-red-600 dark:text-red-400"
            : "font-medium text-[#006c49] dark:text-[#6ffbbe]"
        }`}
      >
        {stockLabel}
      </span>

      <span className="hidden truncate text-right font-[family-name:var(--font-display)] text-[15px] font-bold tabular-nums tracking-tight text-[#006c49] sm:block dark:text-[#6ffbbe]">
        {formatGhs(Number(product.priceGhs))}
        {unitLabel ? (
          <span className="ml-0.5 hidden text-[11px] font-medium text-muted-foreground sm:inline">
            /{unitLabel}
          </span>
        ) : null}
      </span>

      <span
        className="inline-flex size-8 items-center justify-center justify-self-end rounded-full bg-[#006c49] text-white shadow-[0_1px_2px_rgba(0,53,39,0.18)] dark:bg-[#6ffbbe] dark:text-[#003527] dark:shadow-none sm:size-9 sm:rounded-md sm:bg-[#006c49]/10 sm:text-[#006c49] sm:shadow-none sm:ring-1 sm:ring-[#006c49]/15 dark:sm:bg-[#6ffbbe]/15 dark:sm:text-[#6ffbbe] dark:sm:ring-[#6ffbbe]/25"
        aria-hidden
      >
        <Plus className="size-3.5 sm:size-4" strokeWidth={2.5} />
      </span>
    </button>
  );
}

export function PosProductTableHeader() {
  return (
    <div
      className={`${rowGrid} hidden shrink-0 border-b border-[#e5e7eb] bg-[#f7f8f9] px-2.5 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground sm:grid sm:px-4 sm:py-2.5 sm:text-[12px] dark:border-white/[0.08] dark:bg-[#141414]`}
    >
      <span aria-hidden />
      <span>Item</span>
      <span className="hidden text-right sm:block">In stock</span>
      <span className="hidden text-right sm:block">Price</span>
      <span className="sr-only">Add</span>
    </div>
  );
}
