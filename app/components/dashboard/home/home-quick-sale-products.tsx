"use client";

import { useEffect, useMemo, useRef } from "react";
import useSWR from "swr";
import Link from "next/link";
import { ArrowUpRight, PackageOpen, Store } from "lucide-react";
import { Skeleton } from "../ui/skeleton";
import { useBranchContext } from "../branch-context";
import { type ProductRow } from "../products/types";
import { HomeQuickSaleCard } from "./home-quick-sale-card";
import { HomeRetailProductCard } from "./home-retail-product-card";
import {
  HomeVariationModal,
  sellableForLine,
  useHomeAddToCart,
} from "./home-cart-shared";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to fetch data");
  }
  return res.json();
};

function QuickSaleCarousel({
  products,
  onAdd,
  variant = "classic",
}: {
  products: ProductRow[];
  onAdd: (p: ProductRow) => void;
  variant?: "classic" | "retail";
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);
  const loopProducts = products.length >= 3 ? [...products, ...products] : products;
  const enableAutoScroll = products.length >= 3;

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !enableAutoScroll) return;

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    let frame = 0;
    const tick = () => {
      if (!pausedRef.current && el) {
        el.scrollLeft += 0.55;
        const loopWidth = el.scrollWidth / 2;
        if (loopWidth > 0 && el.scrollLeft >= loopWidth) {
          el.scrollLeft -= loopWidth;
        }
      }
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);

    const pause = () => {
      pausedRef.current = true;
    };
    const resume = () => {
      pausedRef.current = false;
    };

    el.addEventListener("pointerenter", pause);
    el.addEventListener("pointerleave", resume);
    el.addEventListener("pointerdown", pause);
    el.addEventListener("pointerup", resume);
    el.addEventListener("touchstart", pause, { passive: true });
    el.addEventListener("touchend", resume);

    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener("pointerenter", pause);
      el.removeEventListener("pointerleave", resume);
      el.removeEventListener("pointerdown", pause);
      el.removeEventListener("pointerup", resume);
      el.removeEventListener("touchstart", pause);
      el.removeEventListener("touchend", resume);
    };
  }, [enableAutoScroll, products.length]);

  return (
    <div
      ref={scrollRef}
      className={`-mx-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
        variant === "classic" ? "sm:-mx-6 sm:px-6" : ""
      }`}
      role="region"
      aria-label="Top selling products carousel"
    >
      <div className="flex w-max gap-2.5 py-1 sm:gap-3">
        {loopProducts.map((product, index) => {
          const rank = (index % products.length) + 1;
          const isFirst = index === 0;
          const stock = sellableForLine(product);
          return (
            <div
              key={`${product.id}-${index}`}
              data-tour-target={isFirst ? "home-quick-sale-item" : undefined}
            >
              {variant === "retail" ? (
                <HomeRetailProductCard
                  product={product}
                  availableStock={stock}
                  onAdd={() => onAdd(product)}
                  badge={rank <= 3 ? "Hot" : undefined}
                  layout="row"
                />
              ) : (
                <HomeQuickSaleCard
                  product={product}
                  rank={rank <= 3 ? rank : undefined}
                  availableStock={stock}
                  onAdd={() => onAdd(product)}
                />
              )}
            </div>
          );
        })}
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
      <p className="text-[15px] font-semibold text-foreground">No best sellers yet</p>
      <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-muted-foreground">
        Complete sales to see trending products here.
      </p>
      <Link
        href="/dashboard/products/new"
        className="mt-5 inline-flex min-h-[40px] items-center justify-center rounded-xl bg-[#006c49] px-4 text-[13px] font-semibold text-white dark:bg-[#6ffbbe] dark:text-[#003527]"
      >
        Add a product
      </Link>
    </div>
  );
}

function QuickSaleBranchPrompt() {
  return (
    <section className="flex flex-col items-center rounded-2xl border border-[#bfc9c3]/15 bg-surface-card px-6 py-10 text-center dark:border-white/[0.06] dark:bg-[#111] sm:px-8">
      <Store className="mb-3 size-8 text-muted-foreground" />
      <p className="text-[15px] font-semibold text-foreground">Select a branch</p>
      <p className="mt-1.5 text-[13px] text-muted-foreground">
        Choose a branch to browse and sell products.
      </p>
    </section>
  );
}

function QuickSaleLoadingState() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-4 w-28" />
      <div className="-mx-4 flex gap-3 overflow-hidden px-4">
        <Skeleton className="h-[220px] w-[168px] shrink-0 rounded-2xl" />
        <Skeleton className="h-[220px] w-[168px] shrink-0 rounded-2xl" />
        <Skeleton className="h-[220px] w-[168px] shrink-0 rounded-2xl" />
      </div>
    </div>
  );
}

export function HomeQuickSaleProducts({
  variant = "classic",
}: {
  variant?: "classic" | "retail";
} = {}) {
  const { branchId } = useBranchContext();
  const { data, isLoading } = useSWR(`/api/dashboard/home?b=${branchId}`, fetcher);
  const { handleAdd, variationProduct, setVariationProduct } = useHomeAddToCart();
  const isRetail = variant === "retail";

  const products = useMemo(
    () => (data?.quickSaleProducts ?? []) as ProductRow[],
    [data?.quickSaleProducts],
  );

  if (branchId === "all") {
    return <QuickSaleBranchPrompt />;
  }

  if (isLoading && !data) {
    return <QuickSaleLoadingState />;
  }

  return (
    <>
      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h2
              className={
                isRetail
                  ? "text-[17px] font-bold text-foreground"
                  : "text-[13px] font-semibold uppercase tracking-wide text-muted-foreground"
              }
            >
              {isRetail ? "Top sellers" : "Trending"}
            </h2>
            {!isRetail ? (
              <p className="mt-0.5 text-[12px] text-muted-foreground">
                Best sellers — swipe the row or tap + to add
              </p>
            ) : null}
          </div>
          <Link
            href="/dashboard/pos/sale"
            className={`items-center gap-1 rounded-lg px-2 py-1 text-[13px] font-medium text-[#006c49] dark:text-[#6ffbbe] ${
              isRetail ? "hidden" : "hidden sm:inline-flex"
            }`}
          >
            Full POS
            <ArrowUpRight className="size-3.5" />
          </Link>
        </div>

        {products.length === 0 ? (
          <QuickSaleEmptyState />
        ) : (
          <div data-tour-target="home-quick-sale" data-tour-mount="main">
            <QuickSaleCarousel products={products} onAdd={handleAdd} variant={variant} />
          </div>
        )}
      </section>

      <HomeVariationModal
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
