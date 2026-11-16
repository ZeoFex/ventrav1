"use client";

import { Plus } from "lucide-react";
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
  const widthClass = layout === "row" ? "w-[108px] shrink-0 snap-start" : "w-full";

  return (
    <article
      className={`flex flex-col overflow-hidden rounded-xl border border-[#e2e8e4] bg-white dark:border-white/[0.08] dark:bg-[#111] ${widthClass}`}
    >
      <button type="button" onClick={onAdd} className="flex min-h-0 flex-1 flex-col text-left">
        <div className="relative aspect-square bg-[#f4f6f5] dark:bg-[#1a1a1a]">
          {badge ? (
            <span className="absolute left-1 top-1 z-[1] rounded bg-[#003527] px-1 py-px text-[8px] font-bold uppercase tracking-wide text-white dark:bg-[#006c49]">
              {badge}
            </span>
          ) : null}
          {product.imageSrc ? (
            <CatalogProductImage
              src={product.imageSrc}
              alt={product.name}
              className="size-full object-cover"
            />
          ) : (
            <div className="flex size-full items-center justify-center">
              <span className="font-[family-name:var(--font-display)] text-lg font-bold uppercase text-[#006c49]/25 dark:text-[#6ffbbe]/25">
                {product.name.charAt(0)}
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-0.5 px-1.5 pb-1.5 pt-1.5">
          <h3 className="line-clamp-2 min-h-[1.9rem] text-[11px] font-semibold leading-tight text-foreground">
            {product.name}
          </h3>
          <p className="font-[family-name:var(--font-display)] text-[12px] font-bold tabular-nums text-[#006c49] dark:text-[#6ffbbe]">
            {formatGhs(Number(product.priceGhs))}
            {unitLabel ? (
              <span className="text-[9px] font-medium text-muted-foreground">/{unitLabel}</span>
            ) : null}
          </p>
          <p
            className={`text-[9px] ${
              isOutOfStock
                ? "font-medium text-red-600 dark:text-red-400"
                : "text-muted-foreground"
            }`}
          >
            {formatQuantity(availableStock, product.unit)}
          </p>
        </div>
      </button>

      <div className="px-1.5 pb-1.5">
        <button
          type="button"
          onClick={onAdd}
        className="flex h-7 w-full items-center justify-center gap-0.5 rounded-full bg-[#006c49] text-[11px] font-semibold text-white active:scale-[0.98] dark:bg-[#6ffbbe] dark:text-[#003527]"
        >
          <Plus className="size-3" strokeWidth={2.5} />
          {hasVariations ? "Opts" : "Add"}
        </button>
      </div>
    </article>
  );
}
