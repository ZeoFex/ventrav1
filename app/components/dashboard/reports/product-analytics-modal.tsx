"use client";

import useSWR from "swr";
import { Loader2 } from "lucide-react";
import { formatGhs } from "@/app/lib/catalog-utils";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

type PerformanceMetrics = {
    qtySold: number;
    revenue: number;
    profit: number;
};

export type ProductAnalytics = {
    product: {
        id: string;
        name: string;
        sku: string;
        barcode: string | null;
        imageSrc: string | null;
        stock: number;
        costPriceGhs: number;
        sellingPriceGhs: number;
        createdAt: string;
    };
    referenceDate: string;
    daily: PerformanceMetrics;
    weekly: PerformanceMetrics;
    monthly: PerformanceMetrics;
    overall: PerformanceMetrics;
};

/** Today in Africa/Accra as YYYY-MM-DD (for Product Report tab). */
export function accraTodayDateKey(): string {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Accra" }).format(new Date());
}

export function buildProductAnalyticsUrl(productId: string, referenceDate: string): string {
    const params = new URLSearchParams({
        productId,
        referenceDate,
    });
    return `/api/reports/product-analytics?${params.toString()}`;
}

async function fetchProductAnalytics(url: string): Promise<ProductAnalytics> {
    const r = await fetch(url);
    if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || "Could not load analytics");
    }
    return r.json();
}

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString("en-GH", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "Africa/Accra",
    });
}

function formatReferenceDay(dateKey: string): string {
    return new Date(`${dateKey}T12:00:00.000Z`).toLocaleDateString("en-GH", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "Africa/Accra",
    });
}

function formatWeekRange(dateKey: string): string {
    const start = new Date(`${dateKey}T12:00:00.000Z`);
    const day = start.getUTCDay();
    const diff = (day + 6) % 7;
    start.setUTCDate(start.getUTCDate() - diff);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + 6);
    const fmt = (d: Date) =>
        d.toLocaleDateString("en-GH", { day: "numeric", month: "short", timeZone: "Africa/Accra" });
    const endFmt = end.toLocaleDateString("en-GH", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "Africa/Accra",
    });
    return `${fmt(start)} – ${endFmt}`;
}

function formatMonthLabel(dateKey: string): string {
    return new Date(`${dateKey}T12:00:00.000Z`).toLocaleDateString("en-GH", {
        month: "long",
        year: "numeric",
        timeZone: "Africa/Accra",
    });
}

function MetricsSection({
    title,
    soldLabel,
    revenueLabel,
    profitLabel,
    metrics,
    highlight = false,
}: {
    title: string;
    soldLabel: string;
    revenueLabel: string;
    profitLabel: string;
    metrics: PerformanceMetrics;
    highlight?: boolean;
}) {
    return (
        <div className="rounded-xl border border-[#eef0f2] bg-muted/20 p-4 dark:border-white/[0.08]">
            <p className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
                {title}
            </p>
            <div className="grid grid-cols-3 gap-3 text-[13px]">
                <div>
                    <p className="text-muted-foreground">{soldLabel}</p>
                    <p className="font-medium tabular-nums text-foreground">{metrics.qtySold}</p>
                </div>
                <div>
                    <p className="text-muted-foreground">{revenueLabel}</p>
                    <p className="font-medium tabular-nums text-foreground">
                        {formatGhs(metrics.revenue)}
                    </p>
                </div>
                <div>
                    <p className="text-muted-foreground">{profitLabel}</p>
                    <p
                        className={`font-semibold tabular-nums ${
                            highlight
                                ? "text-[#006c49] dark:text-[#6ffbbe]"
                                : "text-foreground"
                        }`}
                    >
                        {formatGhs(metrics.profit)}
                    </p>
                </div>
            </div>
        </div>
    );
}

export type ProductAnalyticsModalProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    productId: string | null;
    /** ISO timestamp or YYYY-MM-DD — anchors daily/weekly/monthly windows. */
    referenceDate: string | null;
};

export function ProductAnalyticsModal({
    open,
    onOpenChange,
    productId,
    referenceDate,
}: ProductAnalyticsModalProps) {
    const analyticsUrl =
        open && productId && referenceDate
            ? buildProductAnalyticsUrl(productId, referenceDate)
            : null;

    const {
        data: analytics,
        error: analyticsError,
        isLoading: analyticsLoading,
    } = useSWR(analyticsUrl, fetchProductAnalytics);

    const loaded =
        productId && analytics?.product.id === productId ? analytics : null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[min(90dvh,720px)] overflow-y-auto sm:max-w-lg" showCloseButton>
                <DialogHeader>
                    <DialogTitle className="font-[family-name:var(--font-display)] text-lg">
                        {loaded?.product.name ?? "Product analytics"}
                    </DialogTitle>
                    <DialogDescription className="text-left text-[13px]">
                        {loaded
                            ? `SKU ${loaded.product.sku}${loaded.product.barcode ? ` · Barcode ${loaded.product.barcode}` : ""} · Added ${formatDate(loaded.product.createdAt)}`
                            : analyticsLoading
                              ? "Loading…"
                              : "Sales performance for this product."}
                    </DialogDescription>
                </DialogHeader>

                {open && productId && analyticsLoading && !loaded && (
                    <div className="flex justify-center py-12">
                        <Loader2 className="size-8 animate-spin text-muted-foreground opacity-40" />
                    </div>
                )}

                {analyticsError && (
                    <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-800 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200">
                        {analyticsError instanceof Error
                            ? analyticsError.message
                            : "Something went wrong."}
                    </p>
                )}

                {loaded && (
                    <div className="space-y-4">
                        <div>
                            <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
                                Product Information
                            </p>
                            <div className="grid grid-cols-3 gap-3 rounded-xl border border-[#eef0f2] bg-muted/20 p-4 text-[13px] dark:border-white/[0.08]">
                                <div>
                                    <p className="text-muted-foreground">Total Stock</p>
                                    <p className="font-medium tabular-nums text-foreground">
                                        {loaded.product.stock}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Cost Price</p>
                                    <p className="font-medium tabular-nums">
                                        {formatGhs(loaded.product.costPriceGhs)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Selling Price</p>
                                    <p className="font-semibold tabular-nums text-[#006c49] dark:text-[#6ffbbe]">
                                        {formatGhs(loaded.product.sellingPriceGhs)}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <MetricsSection
                            title={`Daily Performance (${formatReferenceDay(loaded.referenceDate)})`}
                            soldLabel="Daily Sold"
                            revenueLabel="Daily Revenue"
                            profitLabel="Daily Profit"
                            metrics={loaded.daily}
                        />
                        <MetricsSection
                            title={`Weekly Performance (${formatWeekRange(loaded.referenceDate)})`}
                            soldLabel="Weekly Sold"
                            revenueLabel="Weekly Revenue"
                            profitLabel="Weekly Profit"
                            metrics={loaded.weekly}
                        />
                        <MetricsSection
                            title={`Monthly Performance (${formatMonthLabel(loaded.referenceDate)})`}
                            soldLabel="Monthly Sold"
                            revenueLabel="Monthly Revenue"
                            profitLabel="Monthly Profit"
                            metrics={loaded.monthly}
                        />
                        <MetricsSection
                            title="Overall Performance"
                            soldLabel="Total Sold"
                            revenueLabel="Total Revenue"
                            profitLabel="Total Profit"
                            metrics={loaded.overall}
                            highlight
                        />
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
