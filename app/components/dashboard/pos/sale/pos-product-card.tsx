"use client";

import { Plus } from "lucide-react";
import { CatalogProductImage } from "../../products/catalog-product-image";
import { type ProductRow } from "../../products/types";
import { formatGhs } from "@/app/lib/catalog-utils";
import { formatQuantity, unitShort } from "@/app/lib/product-units";

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

  return (
    <article className={`group flex flex-col overflow-hidden rounded-[1.25rem] border border-[#eef0f2] bg-white transition-all hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)] dark:border-white/[0.08] dark:bg-[#111] dark:hover:border-white/[0.15] ${isOutOfStock ? "opacity-60 grayscale-[0.5]" : ""}`}>
      <div className="relative aspect-[4/3] bg-[#f8f9fa] dark:bg-[#1a1a1a] overflow-hidden flex items-center justify-center">
        <span className={`absolute left-3 top-3 z-[1] rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide text-white backdrop-blur-md ${isOutOfStock ? "bg-red-500/80" : "bg-black/70"}`}>
          {isOutOfStock ? "Out of Stock" : `${formatQuantity(stockToDisplay, product.unit)} in stock`}
        </span>
        {product.imageSrc ? (
          <CatalogProductImage
            src={product.imageSrc}
            alt={product.name}
            className="absolute inset-0 size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground/40 text-center p-4">
            <span className="text-4xl font-bold uppercase opacity-20">
              {product.name.charAt(0)}
            </span>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-[14px] font-semibold text-foreground sm:text-[15px]">
              {product.name}
            </h3>
            <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground sm:text-[12px]">
              {product.sku}
            </p>
            {product.description && (
              <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-muted-foreground/80 sm:text-[12px]">
                {product.description}
              </p>
            )}
          </div>
          <p className="shrink-0 text-[14px] font-bold tabular-nums text-foreground sm:text-[15px]">
            {formatGhs(Number(product.priceGhs))}
            {unitShort(product.unit) && (
              <span className="ml-0.5 text-[11px] font-medium text-muted-foreground">/{unitShort(product.unit)}</span>
            )}
          </p>
        </div>

        <div className="mt-auto pt-3">
          <button
            type="button"
            onClick={onAdd}
            disabled={isOutOfStock}
            className={`tap-target flex min-h-[40px] w-full items-center justify-center gap-2 rounded-xl text-[13px] font-semibold transition-colors ${isOutOfStock
              ? "bg-muted text-muted-foreground cursor-not-allowed"
              : "bg-[#f4f4f5] text-foreground hover:bg-[#e4e4e7] active:bg-[#d4d4d8] dark:bg-[#1a1a1a] dark:text-white/90 dark:hover:bg-[#262626]"
              }`}
          >
            <Plus className="size-[15px]" strokeWidth={2.5} aria-hidden />
            {isOutOfStock ? "Sold Out" : "Add to Cart"}
          </button>
        </div>
      </div>
    </article>
  );
}
