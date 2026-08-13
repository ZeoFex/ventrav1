"use client";

import { Plus } from "lucide-react";
import { CatalogProductImage } from "../../products/catalog-product-image";
import { type ProductRow } from "../../products/types";
import { formatGhs } from "@/app/lib/catalog-utils";
import { formatQuantity, unitShort } from "@/app/lib/product-units";

const rowGrid =
  "grid w-full grid-cols-[2.5rem_minmax(0,1fr)_4.25rem_5.25rem_2.25rem] items-center gap-2 sm:grid-cols-[2.75rem_minmax(0,1fr)_5.5rem_6.5rem_2.75rem] sm:gap-4";

export function PosProductCard({
  product,
  onAdd,
  availableStock,
}: {
  product: ProductRow;
  onAdd: () => void;
  availableStock?: number;
}) {
  const stockToDisplay = availableStock ?? product.stock;
  const isOutOfStock = stockToDisplay <= 0;
  const unitLabel = unitShort(product.unit);

  return (
    <button
      type="button"
      onClick={onAdd}
      disabled={isOutOfStock}
      className={`${rowGrid} border-b border-[#eef0f2] px-3 py-2.5 text-left transition-colors last:border-b-0 sm:px-4 sm:py-3 dark:border-white/[0.06] ${
        isOutOfStock
          ? "cursor-not-allowed opacity-50"
          : "hover:bg-[#f7f8f9] active:bg-[#eef1f2] dark:hover:bg-white/[0.04] dark:active:bg-white/[0.06]"
      }`}
      aria-label={isOutOfStock ? `${product.name} sold out` : `Add ${product.name}`}
    >
      <div className="size-10 shrink-0 overflow-hidden rounded-md border border-[#eef0f2] bg-[#f4f5f6] dark:border-white/[0.08] dark:bg-[#1a1a1a] sm:size-11">
        {product.imageSrc ? (
          <CatalogProductImage
            src={product.imageSrc}
            alt=""
            className="size-full object-cover"
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <span className="text-sm font-semibold uppercase text-muted-foreground/50">
              {product.name.charAt(0)}
            </span>
          </div>
        )}
      </div>

      <span className="min-w-0 truncate text-[14px] font-semibold text-foreground sm:text-[15px]">
        {product.name}
      </span>

      <span
        className={`truncate text-right text-[13px] tabular-nums sm:text-[14px] ${
          isOutOfStock
            ? "font-medium text-red-600 dark:text-red-400"
            : "font-medium text-[#006c49] dark:text-[#6ffbbe]"
        }`}
      >
        {isOutOfStock ? "0" : formatQuantity(stockToDisplay, product.unit)}
      </span>

      <span className="truncate text-right text-[14px] font-bold tabular-nums text-foreground sm:text-[15px]">
        {formatGhs(Number(product.priceGhs))}
        {unitLabel ? (
          <span className="ml-0.5 hidden text-[11px] font-medium text-muted-foreground sm:inline">
            /{unitLabel}
          </span>
        ) : null}
      </span>

      <span
        className={`inline-flex size-8 items-center justify-center justify-self-end rounded-md border sm:size-9 ${
          isOutOfStock
            ? "border-[#eef0f2] bg-[#f3f4f6] text-muted-foreground dark:border-white/[0.08] dark:bg-[#1a1a1a]"
            : "border-[#006c49]/15 bg-[#006c49]/10 text-[#006c49] dark:border-[#6ffbbe]/25 dark:bg-[#6ffbbe]/15 dark:text-[#6ffbbe]"
        }`}
        aria-hidden
      >
        <Plus className="size-4" strokeWidth={2.5} />
      </span>
    </button>
  );
}

export function PosProductTableHeader() {
  return (
    <div
      className={`${rowGrid} shrink-0 border-b border-[#e5e7eb] bg-[#f7f8f9] px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground sm:px-4 sm:text-[12px] dark:border-white/[0.08] dark:bg-[#141414]`}
    >
      <span aria-hidden />
      <span>Item</span>
      <span className="text-right">In stock</span>
      <span className="text-right">Price</span>
      <span className="sr-only">Add</span>
    </div>
  );
}
