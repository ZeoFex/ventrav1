"use client";

import { useCallback, useMemo, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "../ui/skeleton";
import { useBranchContext } from "../branch-context";
import { PosProductCard } from "../pos/sale/pos-product-card";
import { useGlobalCart } from "../pos/global-cart-context";
import { playPosAddProductBeep } from "../pos/sale/pos-add-beep";
import { formatGhs } from "@/app/lib/catalog-utils";
import { type ProductRow } from "../products/types";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to fetch data");
  }
  return res.json();
};

function sellableForLine(p: ProductRow, variationId?: string): number {
  if (variationId && p.variations?.length) {
    const v = p.variations.find((x) => x.id === variationId);
    if (v) return v.stockAvailable ?? v.stock;
  }
  return p.stockAvailable ?? p.stock;
}

function QuickSaleVariationModal({
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
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-black/45 backdrop-blur-sm"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg rounded-3xl border border-[#eef0f2] bg-white p-6 shadow-2xl dark:border-white/[0.08] dark:bg-[#111]">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-foreground">{product.name}</h2>
          <p className="text-sm text-muted-foreground">Select a variation to add to cart</p>
        </div>

        <div className="grid max-h-[60vh] grid-cols-1 gap-3 overflow-y-auto pr-2">
          {product.variations?.map((v) => {
            const sell = v.stockAvailable ?? v.stock;
            const isOutOfStock = sell <= 0;
            return (
              <button
                key={v.id}
                type="button"
                disabled={isOutOfStock}
                onClick={() => onSelect(product.id, v.id!)}
                className={`flex items-center justify-between rounded-2xl border border-border p-4 text-left transition-all ${
                  isOutOfStock
                    ? "cursor-not-allowed bg-muted/20 opacity-50 grayscale"
                    : "hover:border-[#006c49] hover:bg-[#006c49]/5 hover:shadow-md active:scale-[0.98] dark:hover:border-[#6ffbbe] dark:hover:bg-[#6ffbbe]/5"
                }`}
              >
                <div>
                  <p className="font-semibold text-foreground">{v.name}</p>
                  <p className="text-xs text-muted-foreground">{v.type}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold tabular-nums text-foreground">
                    {formatGhs(Number(v.priceGhs ?? product.priceGhs))}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isOutOfStock ? "Out of stock" : `${sell} available`}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function QuickSaleMarquee({ products, onAdd }: { products: ProductRow[]; onAdd: (p: ProductRow) => void }) {
  const shouldAnimate = products.length >= 4;

  const renderTrack = (suffix: string) =>
    products.map((product) => (
      <div
        key={`${product.id}${suffix}`}
        className="w-[200px] shrink-0 sm:w-[220px]"
        data-tour-target={suffix === "-a" ? "home-quick-sale-item" : undefined}
      >
        <PosProductCard
          product={product}
          availableStock={sellableForLine(product)}
          onAdd={() => onAdd(product)}
        />
      </div>
    ));

  if (!shouldAnimate) {
    return (
      <div className="-mx-4 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6">
        <div className="flex gap-3 sm:gap-4">{renderTrack("-a")}</div>
      </div>
    );
  }

  return (
    <div className="quick-sale-marquee -mx-4 overflow-hidden px-4 sm:-mx-6 sm:px-6">
      <div className="quick-sale-marquee-track flex w-max gap-3 sm:gap-4">
        {renderTrack("-a")}
        {renderTrack("-b")}
      </div>
    </div>
  );
}

export function HomeQuickSaleProducts() {
  const { branchId } = useBranchContext();
  const { addToCart, lines } = useGlobalCart();
  const [variationProduct, setVariationProduct] = useState<ProductRow | null>(null);
  const { data, isLoading } = useSWR(`/api/dashboard/home?b=${branchId}`, fetcher);

  const products = useMemo(
    () => (data?.quickSaleProducts ?? []) as ProductRow[],
    [data?.quickSaleProducts],
  );

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

  if (branchId === "all") {
    return (
      <section className="rounded-2xl border border-[#bfc9c3]/15 bg-surface-card px-4 py-8 text-center dark:border-white/[0.06] dark:bg-[#111] sm:px-5">
        <p className="text-[14px] text-muted-foreground">
          Select a branch to quick-sell products from the home screen.
        </p>
      </section>
    );
  }

  if (isLoading && !data) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="flex gap-3 overflow-hidden">
          <Skeleton className="h-[280px] w-[200px] shrink-0 rounded-[1.25rem]" />
          <Skeleton className="h-[280px] w-[200px] shrink-0 rounded-[1.25rem]" />
          <Skeleton className="h-[280px] w-[200px] shrink-0 rounded-[1.25rem]" />
        </div>
      </div>
    );
  }

  return (
    <>
      <section className="space-y-3 sm:space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
            Quick sale
          </h2>
          <Link
            href="/dashboard/pos/sale"
            className="inline-flex items-center gap-1 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Open full POS
            <ArrowUpRight className="size-3.5" strokeWidth={2} aria-hidden />
          </Link>
        </div>

        {products.length === 0 ? (
          <div
            className="rounded-2xl border border-[#bfc9c3]/15 bg-surface-card px-4 py-8 text-center dark:border-white/[0.06] dark:bg-[#111] sm:px-5"
            data-tour-target="home-quick-sale"
            data-tour-mount="main"
          >
            <p className="text-[14px] text-muted-foreground">
              No in-stock products yet. Add products to enable quick sale.
            </p>
            <Link
              href="/dashboard/products/new"
              className="mt-3 inline-flex text-[13px] font-medium text-[#006c49] hover:underline dark:text-[#6ffbbe]"
            >
              Add a product
            </Link>
          </div>
        ) : (
          <div data-tour-target="home-quick-sale" data-tour-mount="main">
            <QuickSaleMarquee products={products} onAdd={handleAdd} />
          </div>
        )}
      </section>

      <QuickSaleVariationModal
        product={variationProduct}
        onClose={() => setVariationProduct(null)}
        onSelect={(productId, variationId) => {
          const product = products.find((p) => p.id === productId);
          if (product) handleAdd(product, variationId);
        }}
      />
    </>
  );
}
