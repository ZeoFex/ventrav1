"use client";

import { CatalogProductImage } from "../products/catalog-product-image";
import { type ProductRow } from "../products/types";
import { formatGhs } from "@/app/lib/catalog-utils";
import { formatQuantity, unitShort } from "@/app/lib/product-units";

export function HomeRetailProductCard({
  product,
  availableStock,
  onAdd,
  badge,
  layout = "row",
}: {
  product: ProductRow;
  availableStock: number;
  onAdd: () => void;
  badge?: string;
  layout?: "row" | "grid";
}) {
  const isOutOfStock = availableStock <= 0;
  const hasVariations = (product.variations?.length ?? 0) > 0;
  const unitLabel = unitShort(product.unit);
  const widthClass = layout === "row" ? "w-[152px] shrink-0 snap-start" : "w-full";

  return (
    <article
      className={`flex flex-col overflow-hidden rounded-xl border border-[#bfc9c3]/25 bg-surface-card dark:border-white/[0.08] dark:bg-[#111] ${widthClass} ${
        isOutOfStock ? "opacity-65" : ""
      }`}
    >
      <div className="relative aspect-square bg-[#f8f9fa] p-2 dark:bg-[#1a1a1a]">
        {badge && !isOutOfStock ? (
          <span className="absolute left-1.5 top-1.5 z-[1] rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white bg-[#003527] dark:bg-[#006c49]">
            {badge}
          </span>
        ) : null}
        {product.imageSrc ? (
          <CatalogProductImage
            src={product.imageSrc}
            alt={product.name}
            className="size-full object-contain"
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <span className="font-[family-name:var(--font-display)] text-3xl font-bold uppercase text-[#006c49]/20 dark:text-[#6ffbbe]/20">
              {product.name.charAt(0)}
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 px-2 pb-2.5 pt-1">
        <button
          type="button"
          onClick={onAdd}
          disabled={isOutOfStock}
          className={`min-h-[36px] w-full rounded-full border text-[13px] font-semibold transition-colors ${
            isOutOfStock
              ? "cursor-not-allowed border-muted bg-muted text-muted-foreground"
              : "border-foreground/15 bg-surface-card hover:bg-muted/40 active:scale-[0.98] dark:border-white/15 dark:bg-[#111]"
          }`}
        >
          {isOutOfStock ? "Out of stock" : hasVariations ? "Options" : "Add"}
        </button>

        <p className="font-[family-name:var(--font-display)] text-[15px] font-bold tabular-nums text-[#006c49] dark:text-[#6ffbbe]">
          {formatGhs(Number(product.priceGhs))}
          {unitLabel ? (
            <span className="text-[10px] font-medium text-muted-foreground">/{unitLabel}</span>
          ) : null}
        </p>

        <h3 className="line-clamp-2 min-h-[2.25rem] text-[12px] leading-snug text-foreground">
          {product.name}
        </h3>

        {!isOutOfStock ? (
          <p className="text-[10px] text-muted-foreground">
            {formatQuantity(availableStock, product.unit)} in stock
          </p>
        ) : null}
      </div>
    </article>
  );
}
