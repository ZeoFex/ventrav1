"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
    ArrowLeft,
    ChevronRight,
    Loader2,
    Package,
    Search,
} from "lucide-react";
import { ProductsPageShell } from "../products/products-page-shell";
import { useProducts } from "../products/products-data-hooks";
import { CatalogProductImage } from "../products/catalog-product-image";
import { formatGhs } from "@/app/lib/catalog-utils";
import {
    ProductAnalyticsModal,
    accraTodayDateKey,
} from "./product-analytics-modal";

type ProductListItem = {
    id: string;
    name: string;
    sku: string;
    barcode?: string | null;
    imageSrc?: string | null;
    priceGhs: number | string;
    stock: number;
};

export function ProductReportView() {
    const [searchQuery, setSearchQuery] = useState("");
    const [analyticsTarget, setAnalyticsTarget] = useState<{
        productId: string;
        referenceDate: string;
    } | null>(null);

    const { products = [], isLoading: productsLoading } = useProducts();

    const filteredProducts = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return products as ProductListItem[];
        return (products as ProductListItem[]).filter((p) => {
            const nameHit = p.name.toLowerCase().includes(q);
            const skuHit = p.sku.toLowerCase().includes(q);
            const barcodeHit = (p.barcode || "").toLowerCase().includes(q);
            return nameHit || skuHit || barcodeHit;
        });
    }, [products, searchQuery]);

    return (
        <>
            <ProductsPageShell
                title="Product Report"
                description="Search products and view sales performance, revenue, and profit analytics."
                actions={
                    <Link
                        href="/dashboard/reports"
                        className="flex items-center justify-center rounded-xl border border-[#e5e7eb] bg-white p-2.5 text-foreground hover:bg-[#fafafa] dark:border-white/[0.12] dark:bg-transparent dark:hover:bg-white/[0.04]"
                    >
                        <ArrowLeft className="size-4" />
                    </Link>
                }
            >
                <div className="flex flex-col gap-4">
                    <div className="relative min-w-0 flex-1">
                        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                            type="search"
                            enterKeyHint="search"
                            autoComplete="off"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by name, SKU, or barcode…"
                            className="h-11 w-full min-w-0 rounded-2xl border border-[#eef0f2] bg-white pl-10 pr-4 text-[14px] outline-none focus:border-[#006c49]/40 focus:ring-4 focus:ring-[#006c49]/05 dark:border-white/[0.08] dark:bg-[#111]"
                        />
                    </div>

                    <div className="overflow-hidden rounded-2xl border border-[#eef0f2] bg-white dark:border-white/[0.08] dark:bg-[#111]">
                        {productsLoading ? (
                            <div className="flex h-64 items-center justify-center">
                                <Loader2 className="size-6 animate-spin text-muted-foreground opacity-30" />
                            </div>
                        ) : (products as ProductListItem[]).length === 0 ? (
                            <div className="flex h-64 items-center justify-center px-4 text-center text-sm text-muted-foreground">
                                No products yet. Add products to see analytics here.
                            </div>
                        ) : filteredProducts.length === 0 ? (
                            <div className="flex h-48 items-center justify-center px-4 text-center text-sm text-muted-foreground">
                                No products match your search. Try a different name, SKU, or barcode.
                            </div>
                        ) : (
                            <>
                                <ul className="divide-y divide-[#f0f2f4] md:hidden dark:divide-white/[0.06]">
                                    {filteredProducts.map((product) => (
                                        <li key={product.id}>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setAnalyticsTarget({
                                                        productId: product.id,
                                                        referenceDate: accraTodayDateKey(),
                                                    })
                                                }
                                                className="flex w-full items-stretch gap-3 p-4 text-left transition-colors hover:bg-muted/30 active:bg-muted/50 dark:hover:bg-white/[0.03]"
                                            >
                                                <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                                                    {product.imageSrc ? (
                                                        <CatalogProductImage
                                                            src={product.imageSrc}
                                                            alt={product.name}
                                                            className="size-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="flex size-full items-center justify-center text-muted-foreground">
                                                            <Package className="size-6 opacity-40" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="min-w-0 flex-1 space-y-1">
                                                    <p className="font-medium leading-snug text-foreground">
                                                        {product.name}
                                                    </p>
                                                    <p className="text-[12px] text-muted-foreground">
                                                        SKU {product.sku}
                                                    </p>
                                                    {product.barcode ? (
                                                        <p className="text-[12px] text-muted-foreground">
                                                            Barcode {product.barcode}
                                                        </p>
                                                    ) : null}
                                                    <p className="text-[12px] text-muted-foreground">
                                                        Stock {product.stock} · {formatGhs(Number(product.priceGhs))}
                                                    </p>
                                                </div>
                                                <ChevronRight
                                                    className="size-5 shrink-0 self-center text-muted-foreground opacity-50"
                                                    aria-hidden
                                                />
                                            </button>
                                        </li>
                                    ))}
                                </ul>

                                <div className="hidden md:block md:overflow-x-auto">
                                    <table className="w-full min-w-[720px] text-left text-[14px]">
                                        <thead className="border-b border-[#f0f2f4] bg-muted/10 text-[11px] uppercase tracking-wider text-muted-foreground dark:border-white/[0.04]">
                                            <tr>
                                                <th className="px-4 py-3 font-semibold lg:px-6 lg:py-4">Product</th>
                                                <th className="px-4 py-3 font-semibold lg:px-6 lg:py-4">SKU</th>
                                                <th className="px-4 py-3 font-semibold lg:px-6 lg:py-4">Barcode</th>
                                                <th className="px-4 py-3 text-right font-semibold lg:px-6 lg:py-4">Stock</th>
                                                <th className="px-4 py-3 text-right font-semibold lg:px-6 lg:py-4">Price</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#f0f2f4] dark:divide-white/[0.04]">
                                            {filteredProducts.map((product) => (
                                                <tr
                                                    key={product.id}
                                                    role="button"
                                                    tabIndex={0}
                                                    onClick={() =>
                                                    setAnalyticsTarget({
                                                        productId: product.id,
                                                        referenceDate: accraTodayDateKey(),
                                                    })
                                                }
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Enter" || e.key === " ") {
                                                            e.preventDefault();
                                                            setAnalyticsTarget({
                                                                productId: product.id,
                                                                referenceDate: accraTodayDateKey(),
                                                            });
                                                        }
                                                    }}
                                                    className="group cursor-pointer transition-colors hover:bg-surface-elevated/50 dark:hover:bg-white/[0.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#006c49]/30 dark:focus-visible:ring-[#6ffbbe]/30"
                                                >
                                                    <td className="px-4 py-3 lg:px-6 lg:py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-muted">
                                                                {product.imageSrc ? (
                                                                    <CatalogProductImage
                                                                        src={product.imageSrc}
                                                                        alt={product.name}
                                                                        className="size-full object-cover"
                                                                    />
                                                                ) : (
                                                                    <div className="flex size-full items-center justify-center text-muted-foreground">
                                                                        <Package className="size-4 opacity-40" />
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <span className="font-medium text-foreground">{product.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 font-mono text-[13px] text-muted-foreground lg:px-6 lg:py-4">
                                                        {product.sku}
                                                    </td>
                                                    <td className="px-4 py-3 font-mono text-[13px] text-muted-foreground lg:px-6 lg:py-4">
                                                        {product.barcode || "—"}
                                                    </td>
                                                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground lg:px-6 lg:py-4">
                                                        {product.stock}
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-[family-name:var(--font-display)] text-[13px] font-semibold tabular-nums text-foreground lg:px-6 lg:py-4">
                                                        {formatGhs(Number(product.priceGhs))}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </ProductsPageShell>

            <ProductAnalyticsModal
                open={!!analyticsTarget}
                onOpenChange={(open) => !open && setAnalyticsTarget(null)}
                productId={analyticsTarget?.productId ?? null}
                referenceDate={analyticsTarget?.referenceDate ?? null}
            />
        </>
    );
}
