"use client";

import useSWR from "swr";
import { Loader2 } from "lucide-react";
import { CatalogProductImage } from "../products/catalog-product-image";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function formatGhs(n: number): string {
    return new Intl.NumberFormat("en-GH", {
        style: "currency",
        currency: "GHS",
        maximumFractionDigits: 0,
    }).format(n);
}

type TopProduct = {
    id: string | null;
    name: string;
    unitsSold: number;
    revenue: number;
    imageSrc: string | null;
};

export function SalesTopProducts() {
    const { data, isLoading } = useSWR("/api/sales/overview", fetcher);
    const topProducts: TopProduct[] = data?.topProducts ?? [];

    return (
        <div className="flex h-full w-full flex-col rounded-2xl border border-[#eef0f2] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] dark:border-white/[0.08] dark:bg-[#111]">
            <div className="mb-5 flex items-center justify-between gap-4">
                <h3 className="font-[family-name:var(--font-display)] text-[16px] font-semibold text-foreground">
                    Top Selling Products
                </h3>
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-4">
                {isLoading ? (
                    <div className="flex flex-1 items-center justify-center">
                        <Loader2 className="size-6 animate-spin text-muted-foreground opacity-30" />
                    </div>
                ) : topProducts.length === 0 ? (
                    <div className="flex flex-1 items-center justify-center">
                        <p className="text-sm text-muted-foreground">Complete sales to see top products.</p>
                    </div>
                ) : (
                    topProducts.map((p, i) => (
                        <div key={p.id ?? i} className="flex items-center gap-3">
                            <span className="flex w-4 shrink-0 justify-center text-[13px] font-bold text-muted-foreground">
                                {i + 1}
                            </span>
                            <div className="relative size-10 shrink-0 overflow-hidden rounded-[10px] bg-[#eceff2] dark:bg-[#1a1a1a] flex items-center justify-center">
                                {p.imageSrc ? (
                                    <CatalogProductImage
                                        src={p.imageSrc}
                                        alt={p.name}
                                        className="absolute inset-0 size-full object-cover"
                                    />
                                ) : (
                                    <span className="text-sm font-bold uppercase opacity-25 text-muted-foreground">
                                        {p.name.charAt(0)}
                                    </span>
                                )}
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-[14px] font-semibold text-foreground">
                                    {p.name}
                                </p>
                                <span className="text-[12px] text-muted-foreground">
                                    {p.unitsSold} sold
                                </span>
                            </div>
                            <div className="text-right">
                                <span className="font-[family-name:var(--font-display)] text-[14px] font-bold tabular-nums text-foreground">
                                    {formatGhs(p.revenue)}
                                </span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
