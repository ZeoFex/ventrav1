"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { useGlobalCart } from "../pos/global-cart-context";
import { playPosAddProductBeep } from "../pos/sale/pos-add-beep";
import { formatGhs } from "@/app/lib/catalog-utils";
import { type ProductRow } from "../products/types";

export function sellableForLine(p: ProductRow, variationId?: string): number {
  if (variationId && p.variations?.length) {
    const v = p.variations.find((x) => x.id === variationId);
    if (v) return v.stockAvailable ?? v.stock;
  }
  return p.stockAvailable ?? p.stock;
}

export function HomeVariationModal({
  product,
  onClose,
  onSelect,
}: {
  product: ProductRow | null;
  onClose: () => void;
  onSelect: (productId: string, variationId: string) => void;
}) {
  if (!product) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center p-0 sm:items-center sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-black/45 backdrop-blur-sm"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative max-h-[85vh] w-full max-w-lg overflow-hidden rounded-t-3xl border border-[#eef0f2] bg-white shadow-2xl sm:rounded-3xl dark:border-white/[0.08] dark:bg-[#111]">
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-muted lg:hidden" />
        <div className="p-5 pb-6">
          <h2 className="text-lg font-bold text-foreground">{product.name}</h2>
          <p className="text-sm text-muted-foreground">Select a variation</p>
          <div className="mt-4 grid max-h-[50vh] grid-cols-1 gap-2 overflow-y-auto">
            {product.variations?.map((v) => {
              const sell = v.stockAvailable ?? v.stock;
              const isOutOfStock = sell <= 0;
              return (
                <button
                  key={v.id}
                  type="button"
                  disabled={isOutOfStock}
                  onClick={() => onSelect(product.id, v.id!)}
                  className={`flex items-center justify-between rounded-2xl border p-3.5 text-left ${
                    isOutOfStock
                      ? "cursor-not-allowed opacity-50"
                      : "hover:border-[#006c49] active:scale-[0.98] dark:hover:border-[#6ffbbe]"
                  }`}
                >
                  <div>
                    <p className="font-semibold text-foreground">{v.name}</p>
                    <p className="text-xs text-muted-foreground">{v.type}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold tabular-nums">
                      {formatGhs(Number(v.priceGhs ?? product.priceGhs))}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {isOutOfStock ? "Out of stock" : `${sell} left`}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export function useHomeAddToCart() {
  const { addToCart, lines } = useGlobalCart();
  const [variationProduct, setVariationProduct] = useState<ProductRow | null>(null);

  const handleAdd = useCallback(
    (product: ProductRow, variationId?: string) => {
      if (product.variations && product.variations.length > 0 && !variationId) {
        setVariationProduct(product);
        return;
      }

      const sell = sellableForLine(product, variationId);
      const inCart =
        lines.find((l) => l.productId === product.id && l.variationId === variationId)?.qty ?? 0;
      if (inCart >= sell) {
        toast.error("Cannot add more. Stock limit reached.");
        return;
      }

      addToCart(product.id, variationId, sell);
      playPosAddProductBeep();
      toast.success(`Added ${product.name}`);
      setVariationProduct(null);
    },
    [addToCart, lines],
  );

  return { handleAdd, variationProduct, setVariationProduct, lines };
}
