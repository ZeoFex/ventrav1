"use client";

import { useCallback, useMemo, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { ArrowUpRight, PackageOpen, Store } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "../ui/skeleton";
import { useBranchContext } from "../branch-context";
import { useGlobalCart } from "../pos/global-cart-context";
import { playPosAddProductBeep } from "../pos/sale/pos-add-beep";
import { formatGhs } from "@/app/lib/catalog-utils";
import { type ProductRow } from "../products/types";
import { HomeQuickSaleCard } from "./home-quick-sale-card";

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

function QuickSaleCarousel({
  products,
  onAdd,
}: {
  products: ProductRow[];
  onAdd: (p: ProductRow) => void;
}) {
  return (
    <div
      className="-mx-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#006c49]/25"
      role="region"
      aria-label="Top selling products carousel"
    >
      <div className="flex snap-x snap-mandatory gap-3 py-1 sm:gap-4">
        {products.map((product, index) => (
          <div
            key={product.id}
            data-tour-target={index === 0 ? "home-quick-sale-item" : undefined}
          >
            <HomeQuickSaleCard
              product={product}
              rank={index + 1}
              availableStock={sellableForLine(product)}
              onAdd={() => onAdd(product)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function QuickSaleEmptyState() {
  return (
    <div
      className="flex flex-col items-center rounded-2xl border border-dashed border-[#bfc9c3]/35 bg-surface-card px-6 py-10 text-center dark:border-white/[0.08] dark:bg-[#111] sm:px-8"
      data-tour-target="home-quick-sale"
      data-tour-mount="main"
    >
      <span className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-[#006c49]/10 text-[#006c49] dark:bg-[#6ffbbe]/10 dark:text-[#6ffbbe]">
        <PackageOpen className="size-6" strokeWidth={1.75} aria-hidden />
      </span>
      <p className="text-[15px] font-semibold text-foreground">No quick-sale products yet</p>
      <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-muted-foreground">
        Add in-stock products or complete sales — top sellers from the last 30 days appear here.
      </p>
      <Link
        href="/dashboard/products/new"
        className="mt-5 inline-flex min-h-[40px] items-center justify-center rounded-xl bg-[#006c49] px-4 text-[13px] font-semibold text-white transition-[filter] hover:brightness-110 dark:bg-[#6ffbbe] dark:text-[#003527]"
      >
        Add a product
      </Link>
    </div>
  );
}

function QuickSaleBranchPrompt() {
  return (
    <section className="flex flex-col items-center rounded-2xl border border-[#bfc9c3]/15 bg-surface-card px-6 py-10 text-center dark:border-white/[0.06] dark:bg-[#111] sm:px-8">
      <span className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <Store className="size-6" strokeWidth={1.75} aria-hidden />
      </span>
      <p className="text-[15px] font-semibold text-foreground">Select a branch</p>
      <p className="mt-1.5 max-w-sm text-[13px] text-muted-foreground">
        Choose a branch from the header to quick-sell top products from the home screen.
      </p>
    </section>
  );
}

function QuickSaleLoadingState() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-24" />
      </div>
      <div className="-mx-4 flex gap-3 overflow-hidden px-4 sm:-mx-6 sm:px-6">
        <Skeleton className="h-[220px] w-[168px] shrink-0 rounded-2xl sm:w-[184px]" />
        <Skeleton className="h-[220px] w-[168px] shrink-0 rounded-2xl sm:w-[184px]" />
        <Skeleton className="h-[220px] w-[168px] shrink-0 rounded-2xl sm:w-[184px]" />
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
    return <QuickSaleBranchPrompt />;
  }

  if (isLoading && !data) {
    return <QuickSaleLoadingState />;
  }

  return (
    <>
      <section className="space-y-3 sm:space-y-4">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
              Quick sale
            </h2>
            <p className="mt-0.5 text-[12px] text-muted-foreground">
              Top sellers — tap + to add to cart
            </p>
          </div>
          <Link
            href="/dashboard/pos/sale"
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[13px] font-medium text-[#006c49] transition-colors hover:bg-[#006c49]/5 dark:text-[#6ffbbe] dark:hover:bg-[#6ffbbe]/5"
          >
            Open full POS
            <ArrowUpRight className="size-3.5" strokeWidth={2} aria-hidden />
          </Link>
        </div>

        {products.length === 0 ? (
          <QuickSaleEmptyState />
        ) : (
          <div data-tour-target="home-quick-sale" data-tour-mount="main">
            <QuickSaleCarousel products={products} onAdd={handleAdd} />
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
