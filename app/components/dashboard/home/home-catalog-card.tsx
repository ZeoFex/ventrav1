"use client";

import { Plus } from "lucide-react";
import { CatalogProductImage } from "../products/catalog-product-image";
import { type ProductRow } from "../products/types";
import { formatGhs } from "@/app/lib/catalog-utils";
import { formatQuantity, unitShort } from "@/app/lib/product-units";

export function HomeCatalogCard({
  product,
  availableStock,
  onAdd,
}: {
  product: ProductRow;
  availableStock: number;
  onAdd: () => void;
}) {
  const isOutOfStock = availableStock <= 0;
  const unitLabel = unitShort(product.unit);

  return (
    <article
      className={`flex flex-col overflow-hidden rounded-2xl border border-[#bfc9c3]/15 bg-surface-card dark:border-white/[0.08] dark:bg-[#111] ${
        isOutOfStock ? "opacity-60" : ""
      }`}
    >
      <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-[#f4f6f5] to-[#e8ecea] dark:from-[#1a1a1a] dark:to-[#141414]">
        {product.imageSrc ? (
          <CatalogProductImage
            src={product.imageSrc}
            alt={product.name}
            className="absolute inset-0 size-full object-cover"
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <span className="font-[family-name:var(--font-display)] text-3xl font-bold uppercase text-[#006c49]/15 dark:text-[#6ffbbe]/15">
              {product.name.charAt(0)}
            </span>
          </div>
        )}
        {!isOutOfStock ? (
          <button
            type="button"
            onClick={onAdd}
            aria-label={`Add ${product.name}`}
            className="absolute bottom-2 right-2 flex size-9 items-center justify-center rounded-full bg-[#006c49] text-white shadow-md active:scale-95 dark:bg-[#6ffbbe] dark:text-[#003527]"
          >
            <Plus className="size-4" strokeWidth={2.5} />
          </button>
        ) : (
          <span className="absolute bottom-2 left-2 rounded-full bg-red-500/90 px-2 py-0.5 text-[10px] font-bold text-white">
            Out of stock
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-2.5">
        <h3 className="line-clamp-2 min-h-[2.5rem] text-[12px] font-semibold leading-snug text-foreground">
          {product.name}
        </h3>
        <p className="font-[family-name:var(--font-display)] text-[14px] font-bold tabular-nums text-foreground">
          {formatGhs(Number(product.priceGhs))}
          {unitLabel ? (
            <span className="text-[10px] font-medium text-muted-foreground">/{unitLabel}</span>
          ) : null}
        </p>
        <p className="text-[10px] text-muted-foreground">
          {isOutOfStock ? "Unavailable" : `${formatQuantity(availableStock, product.unit)} in stock`}
        </p>
      </div>
    </article>
  );
}
