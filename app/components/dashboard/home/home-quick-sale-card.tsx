"use client";

import { Plus, TrendingUp } from "lucide-react";
import { CatalogProductImage } from "../products/catalog-product-image";
import { type ProductRow } from "../products/types";
import { formatGhs } from "@/app/lib/catalog-utils";
import { formatQuantity, unitShort } from "@/app/lib/product-units";

export function HomeQuickSaleCard({
  product,
  rank,
  availableStock,
  onAdd,
}: {
  product: ProductRow;
  rank?: number;
  availableStock: number;
  onAdd: () => void;
}) {
  const isOutOfStock = availableStock <= 0;
  const unitLabel = unitShort(product.unit);

  return (
    <article
      className={`group relative flex w-[168px] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-[#bfc9c3]/20 bg-surface-card shadow-[0_1px_0_rgba(0,0,0,0.04)] transition-[transform,box-shadow,border-color] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-0.5 hover:border-[#006c49]/35 hover:shadow-[0_12px_28px_-12px_rgba(0,108,73,0.22)] active:scale-[0.98] dark:border-white/[0.08] dark:bg-[#111] dark:hover:border-[#6ffbbe]/35 sm:w-[184px] ${
        isOutOfStock ? "opacity-70 grayscale-[0.35]" : ""
      }`}
    >
      {rank != null && rank <= 3 && !isOutOfStock && (
        <span className="absolute left-2.5 top-2.5 z-[2] inline-flex items-center gap-1 rounded-full bg-[#006c49]/90 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white backdrop-blur-sm dark:bg-[#6ffbbe]/90 dark:text-[#003527]">
          <TrendingUp className="size-2.5" strokeWidth={2.5} aria-hidden />
          #{rank}
        </span>
      )}

      <div className="relative aspect-[5/4] overflow-hidden bg-gradient-to-br from-[#f4f6f5] to-[#e8ecea] dark:from-[#1a1a1a] dark:to-[#141414]">
        {product.imageSrc ? (
          <CatalogProductImage
            src={product.imageSrc}
            alt={product.name}
            className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <span className="font-[family-name:var(--font-display)] text-3xl font-bold uppercase text-[#006c49]/15 dark:text-[#6ffbbe]/15">
              {product.name.charAt(0)}
            </span>
          </div>
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/25 to-transparent" />
        <span
          className={`absolute bottom-2 left-2.5 z-[1] rounded-full px-2 py-0.5 text-[10px] font-semibold backdrop-blur-md ${
            isOutOfStock
              ? "bg-red-500/85 text-white"
              : "bg-black/65 text-white dark:bg-black/75"
          }`}
        >
          {isOutOfStock
            ? "Out of stock"
            : `${formatQuantity(availableStock, product.unit)} left`}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2.5 p-3 sm:p-3.5">
        <div className="min-w-0 space-y-0.5">
          <h3 className="line-clamp-2 text-[13px] font-semibold leading-snug text-foreground sm:text-[14px]">
            {product.name}
          </h3>
          <p className="truncate font-mono text-[10px] text-muted-foreground sm:text-[11px]">
            {product.sku}
          </p>
        </div>

        <div className="mt-auto flex items-end justify-between gap-2">
          <p className="font-[family-name:var(--font-display)] text-[15px] font-bold tabular-nums text-foreground sm:text-[16px]">
            {formatGhs(Number(product.priceGhs))}
            {unitLabel && (
              <span className="ml-0.5 text-[10px] font-medium text-muted-foreground">
                /{unitLabel}
              </span>
            )}
          </p>
          <button
            type="button"
            onClick={onAdd}
            disabled={isOutOfStock}
            aria-label={isOutOfStock ? `${product.name} out of stock` : `Add ${product.name} to cart`}
            className={`tap-target flex size-9 shrink-0 items-center justify-center rounded-xl transition-colors ${
              isOutOfStock
                ? "cursor-not-allowed bg-muted text-muted-foreground"
                : "bg-[#006c49] text-white shadow-sm hover:brightness-110 active:scale-95 dark:bg-[#6ffbbe] dark:text-[#003527]"
            }`}
          >
            <Plus className="size-4" strokeWidth={2.5} aria-hidden />
          </button>
        </div>
      </div>
    </article>
  );
}
