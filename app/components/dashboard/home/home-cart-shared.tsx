"use client";

import { useCallback, useState } from "react";
import { useGlobalCart } from "../pos/global-cart-context";
import { playPosAddProductBeep } from "../pos/sale/pos-add-beep";
import { formatGhs } from "@/app/lib/catalog-utils";
import { type ProductRow } from "../products/types";
import { onHandForLine, catalogStockIsOnParent } from "@/app/lib/apply-sold-stock";

export function sellableForLine(p: ProductRow, variationId?: string): number {
  return onHandForLine(p, variationId);
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
      <div className="relative max-h-[85vh] w-full max-w-lg overflow-hidden rounded-t-2xl border border-[#eef0f2] bg-white shadow-2xl sm:rounded-3xl dark:border-white/[0.08] dark:bg-[#111]">
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-muted lg:hidden" />
        <div className="p-3.5 pb-4 sm:p-5 sm:pb-6">
          <h2 className="text-[15px] font-bold text-foreground sm:text-lg">{product.name}</h2>
          <p className="text-[12px] text-muted-foreground sm:text-sm">Select a variation</p>
          <div className="mt-3 grid max-h-[50vh] grid-cols-1 gap-1.5 overflow-y-auto sm:mt-4 sm:gap-2">
            {product.variations?.map((v) => {
            const sell = onHandForLine(product, v.id);
            const isLowOrOversold = sell <= 0;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => onSelect(product.id, v.id!)}
                  className="flex items-center justify-between rounded-xl border p-2.5 text-left hover:border-[#006c49] active:scale-[0.98] sm:rounded-2xl sm:p-3.5 dark:hover:border-[#6ffbbe]"
                >
                  <div>
                    <p className="font-semibold text-foreground">{v.name}</p>
                    <p className="text-xs text-muted-foreground">{v.type}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold tabular-nums">
                      {formatGhs(Number(v.priceGhs ?? product.priceGhs))}
                    </p>
                    <p className={`text-xs ${isLowOrOversold ? "font-medium text-red-600 dark:text-red-400" : "text-muted-foreground"}`}>
                    {isLowOrOversold ? `${sell} in stock` : `${sell} left`}
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
  const { addToCart, setLastAdded } = useGlobalCart();
  const [variationProduct, setVariationProduct] = useState<ProductRow | null>(null);

  const handleAdd = useCallback(
    (product: ProductRow, variationId?: string) => {
      const treatAsSimple = catalogStockIsOnParent(product);
      const lineVariationId = treatAsSimple ? undefined : variationId;
      if (
        product.variations &&
        product.variations.length > 0 &&
        !lineVariationId &&
        !treatAsSimple
      ) {
        setVariationProduct(product);
        return;
      }

      addToCart(product.id, lineVariationId);
      playPosAddProductBeep();
      const variation = lineVariationId
        ? product.variations?.find((v) => v.id === lineVariationId)
        : undefined;
      setLastAdded({
        name: variation ? `${product.name} (${variation.name})` : product.name,
        imageSrc: product.imageSrc ?? null,
      });
      setVariationProduct(null);
    },
    [addToCart, setLastAdded],
  );

  return { handleAdd, variationProduct, setVariationProduct };
}
