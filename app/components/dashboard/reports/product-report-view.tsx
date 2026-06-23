"use client";

import Link from "next/link";
import useSWR from "swr";
import { useMemo, useState } from "react";
import {
    ArrowLeft,
    Calendar,
    ChevronDown,
    ChevronRight,
    Download,
    FileText,
    Loader2,
    Package,
    Search,
    Table as TableIcon,
} from "lucide-react";
import { ProductsPageShell } from "../products/products-page-shell";
import { useCategories } from "../products/products-data-hooks";
import { CatalogProductImage } from "../products/catalog-product-image";
import { formatGhs } from "@/app/lib/catalog-utils";
import { useBranchContext } from "../branch-context";
import { exportToCSV, exportToExcel } from "@/app/utils/export-utils";
import {
    ProductAnalyticsModal,
    accraTodayDateKey,
} from "./product-analytics-modal";
import {
    CategoryMixPieChart,
    ProductMovementChart,
    TopProductsChart,
} from "./reports-charts";

type ReportPeriodType = "all" | "daily" | "weekly" | "monthly" | "custom";
type ActivityFilter = "all" | "sold" | "added" | "activity";

type ProductReportRow = {
    id: string;
    name: string;
    sku: string;
    barcode?: string | null;
    imageSrc?: string | null;
    categoryId?: string | null;
    categoryName?: string | null;
    stock: number;
    priceGhs: number;
    costPriceGhs: number;
    qtySold: number;
    qtyAdded: number;
    revenue: number;
    profit: number;
};

type ProductReportResponse = {
    period: {
        type: ReportPeriodType;
        referenceDate: string;
        fromKey: string;
        toKey: string;
        label: string;
    };
    products: ProductReportRow[];
};

const PERIOD_TABS: { id: ReportPeriodType; label: string }[] = [
    { id: "all", label: "All time" },
    { id: "daily", label: "Daily" },
    { id: "weekly", label: "Weekly" },
    { id: "monthly", label: "Monthly" },
    { id: "custom", label: "Custom" },
];

const ACTIVITY_TABS: { id: ActivityFilter; label: string; hint: string }[] = [
    { id: "all", label: "All products", hint: "Full catalog with period metrics" },
    { id: "sold", label: "Sold", hint: "Sold in this period only" },
    { id: "added", label: "Added", hint: "Stock added in period" },
    { id: "activity", label: "Sold or added", hint: "Any movement in period" },
];

async function reportFetcher(url: string): Promise<ProductReportResponse> {
    const res = await fetch(url);
    const json = await res.json();
    if (!res.ok || json.error) {
        throw new Error(json.error || "Failed to load product report");
    }
    return json;
}

function buildReportUrl(
    branchId: string | null,
    period: ReportPeriodType,
    referenceDate: string,
    customFrom: string,
    customTo: string,
    categoryId: string,
    activity: ActivityFilter,
): string {
    const params = new URLSearchParams({ period, referenceDate, activity });
    if (branchId && branchId !== "all") params.set("b", branchId);
    if (period === "custom") {
        if (customFrom) params.set("from", customFrom);
        if (customTo) params.set("to", customTo);
    }
    if (categoryId && categoryId !== "all") params.set("categoryId", categoryId);
    return `/api/reports/product-report?${params.toString()}`;
}

function periodColumnSuffix(period: ReportPeriodType): string {
    if (period === "all") return "";
    if (period === "daily") return " (day)";
    if (period === "weekly") return " (week)";
    if (period === "monthly") return " (month)";
    return "";
}

export function ProductReportView() {
    const { branchId } = useBranchContext();
    const today = accraTodayDateKey();

    const [searchQuery, setSearchQuery] = useState("");
    const [period, setPeriod] = useState<ReportPeriodType>("all");
    const [activity, setActivity] = useState<ActivityFilter>("all");
    const [exportOpen, setExportOpen] = useState(false);
    const [referenceDate, setReferenceDate] = useState(today);
    const [customFrom, setCustomFrom] = useState(today);
    const [customTo, setCustomTo] = useState(today);
    const [categoryId, setCategoryId] = useState("all");
    const [analyticsTarget, setAnalyticsTarget] = useState<{
        productId: string;
        referenceDate: string;
    } | null>(null);

    const { categories = [] } = useCategories();

    const reportUrl = useMemo(
        () =>
            buildReportUrl(
                branchId,
                period,
                referenceDate,
                customFrom,
                customTo,
                categoryId,
                activity,
            ),
        [branchId, period, referenceDate, customFrom, customTo, categoryId, activity],
    );

    const { data, isLoading, error } = useSWR<ProductReportResponse>(reportUrl, reportFetcher);

    const filteredProducts = useMemo(() => {
        const rows = data?.products ?? [];
        const q = searchQuery.trim().toLowerCase();
        if (!q) return rows;
        return rows.filter((p) => {
            const nameHit = p.name.toLowerCase().includes(q);
            const skuHit = p.sku.toLowerCase().includes(q);
            const barcodeHit = (p.barcode || "").toLowerCase().includes(q);
            return nameHit || skuHit || barcodeHit;
        });
    }, [data?.products, searchQuery]);

    const periodLabel = data?.period?.label ?? "selected period";
    const colSuffix = periodColumnSuffix(period);
    const analyticsReferenceDate =
        period === "custom" ? customTo || customFrom || referenceDate : referenceDate;

    const totals = useMemo(() => {
        return filteredProducts.reduce(
            (acc, p) => ({
                sold: acc.sold + p.qtySold,
                added: acc.added + p.qtyAdded,
                revenue: acc.revenue + p.revenue,
                profit: acc.profit + p.profit,
            }),
            { sold: 0, added: 0, revenue: 0, profit: 0 },
        );
    }, [filteredProducts]);

    const chartProducts = useMemo(() => {
        const byRevenue = [...filteredProducts]
            .filter((p) => p.revenue > 0)
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 10)
            .map((p) => ({ name: p.name, revenue: p.revenue, qty: p.qtySold }));

        const movement = filteredProducts.map((p) => ({
            name: p.name,
            qtySold: p.qtySold,
            qtyAdded: p.qtyAdded,
        }));

        const categoryMap = new Map<string, number>();
        for (const p of filteredProducts) {
            const cat = p.categoryName || "Uncategorized";
            categoryMap.set(cat, (categoryMap.get(cat) ?? 0) + p.revenue);
        }
        const totalRev = [...categoryMap.values()].reduce((s, v) => s + v, 0) || 1;
        const categoryMix = [...categoryMap.entries()]
            .map(([category, revenue]) => ({
                category,
                revenue,
                percentage: Math.round((revenue / totalRev) * 100),
            }))
            .sort((a, b) => b.revenue - a.revenue);

        return { byRevenue, movement, categoryMix };
    }, [filteredProducts]);

    function openAnalytics(productId: string) {
        setAnalyticsTarget({
            productId,
            referenceDate: analyticsReferenceDate,
        });
    }

    const exportTag = (data?.period?.fromKey && data.period.toKey
        ? `${data.period.fromKey}_${data.period.toKey}`
        : period
    ).replace(/[^a-z0-9_-]/gi, "");

    function buildExportRows() {
        return filteredProducts.map((p) => ({
            name: p.name,
            sku: p.sku,
            barcode: p.barcode || "",
            category: p.categoryName || "",
            stock: p.stock,
            priceGhs: p.priceGhs,
            qtySold: p.qtySold,
            qtyAdded: p.qtyAdded,
            revenue: p.revenue,
            profit: p.profit,
        }));
    }

    async function handleExportExcel() {
        setExportOpen(false);
        const columns = [
            { header: "Product", key: "name", width: 32 },
            { header: "SKU", key: "sku", width: 18 },
            { header: "Barcode", key: "barcode", width: 18 },
            { header: "Category", key: "category", width: 18 },
            { header: "Stock", key: "stock", width: 10 },
            { header: "Price (GHS)", key: "priceGhs", width: 14, isCurrency: true },
            { header: `Sold${colSuffix}`, key: "qtySold", width: 10 },
            { header: `Added${colSuffix}`, key: "qtyAdded", width: 10 },
            { header: "Revenue (GHS)", key: "revenue", width: 14, isCurrency: true },
            { header: "Profit (GHS)", key: "profit", width: 14, isCurrency: true },
        ];
        await exportToExcel({
            data: buildExportRows(),
            columns,
            filename: `product_report_${exportTag}.xlsx`,
            sheetName: "Product Report",
        });
    }

    function handleExportCSV() {
        setExportOpen(false);
        const columns = [
            { header: "Product", key: "name" },
            { header: "SKU", key: "sku" },
            { header: "Barcode", key: "barcode" },
            { header: "Category", key: "category" },
            { header: "Stock", key: "stock" },
            { header: "Price (GHS)", key: "priceGhs" },
            { header: `Sold${colSuffix}`, key: "qtySold" },
            { header: `Added${colSuffix}`, key: "qtyAdded" },
            { header: "Revenue (GHS)", key: "revenue" },
            { header: "Profit (GHS)", key: "profit" },
        ];
        exportToCSV(buildExportRows(), columns, `product_report_${exportTag}.csv`);
    }

    return (
        <>
            <ProductsPageShell
                title="Product Report"
                description="Search products and view sales performance, revenue, and profit analytics."
                actions={
                    <div className="flex items-center gap-2">
                        <Link
                            href="/dashboard/reports"
                            className="flex items-center justify-center rounded-xl border border-[#e5e7eb] bg-white p-2.5 text-foreground hover:bg-[#fafafa] dark:border-white/[0.12] dark:bg-transparent dark:hover:bg-white/[0.04]"
                        >
                            <ArrowLeft className="size-4" />
                        </Link>
                        <div className="relative">
                            <button
                                type="button"
                                disabled={filteredProducts.length === 0}
                                onClick={() => setExportOpen(!exportOpen)}
                                className="flex items-center gap-2 rounded-xl bg-[#006c49] px-4 py-2.5 text-[14px] font-semibold text-white shadow-lg hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <Download className="size-4" />
                                Export
                                <ChevronDown className={`size-3.5 transition-transform ${exportOpen ? "rotate-180" : ""}`} />
                            </button>
                            {exportOpen ? (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setExportOpen(false)} />
                                    <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-48 overflow-hidden rounded-2xl border border-[#eef0f2] bg-white p-1.5 shadow-2xl dark:border-white/[0.08] dark:bg-[#1a1a1a]">
                                        <button
                                            type="button"
                                            onClick={() => void handleExportExcel()}
                                            className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium hover:bg-muted/50"
                                        >
                                            <TableIcon className="size-4 text-[#006c49]" />
                                            Excel (.xlsx)
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleExportCSV}
                                            className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium hover:bg-muted/50"
                                        >
                                            <FileText className="size-4 text-[#006c49]" />
                                            CSV (.csv)
                                        </button>
                                    </div>
                                </>
                            ) : null}
                        </div>
                    </div>
                }
            >
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-3 rounded-2xl border border-[#eef0f2] bg-white p-4 dark:border-white/[0.08] dark:bg-[#111]">
                        <div className="flex flex-wrap gap-2">
                            {PERIOD_TABS.map((tab) => (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setPeriod(tab.id)}
                                    className={`rounded-xl px-4 py-2 text-[13px] font-semibold transition-colors ${
                                        period === tab.id
                                            ? "bg-[#006c49] text-white shadow-sm"
                                            : "border border-[#eef0f2] bg-transparent text-muted-foreground hover:bg-muted/40 dark:border-white/10"
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
                            {period === "custom" ? (
                                <>
                                    <div>
                                        <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                            From
                                        </label>
                                        <input
                                            type="date"
                                            value={customFrom}
                                            onChange={(e) => setCustomFrom(e.target.value)}
                                            className="rounded-xl border border-[#eef0f2] bg-transparent px-3 py-2 text-[14px] dark:border-white/10"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                            To
                                        </label>
                                        <input
                                            type="date"
                                            value={customTo}
                                            onChange={(e) => setCustomTo(e.target.value)}
                                            className="rounded-xl border border-[#eef0f2] bg-transparent px-3 py-2 text-[14px] dark:border-white/10"
                                        />
                                    </div>
                                </>
                            ) : period !== "all" ? (
                                <div>
                                    <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                        {period === "daily"
                                            ? "Day"
                                            : period === "weekly"
                                              ? "Week containing"
                                              : "Month containing"}
                                    </label>
                                    <div className="relative">
                                        <Calendar className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                                        <input
                                            type="date"
                                            value={referenceDate}
                                            onChange={(e) => setReferenceDate(e.target.value)}
                                            className="rounded-xl border border-[#eef0f2] bg-transparent py-2 pl-10 pr-3 text-[14px] dark:border-white/10"
                                        />
                                    </div>
                                </div>
                            ) : null}

                            <div className="min-w-[180px] flex-1 sm:max-w-xs">
                                <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                    Category
                                </label>
                                <select
                                    value={categoryId}
                                    onChange={(e) => setCategoryId(e.target.value)}
                                    className="h-[42px] w-full rounded-xl border border-[#eef0f2] bg-transparent px-3 text-[14px] dark:border-white/10"
                                >
                                    <option value="all">All categories</option>
                                    {categories.map((cat: { id: string; name: string }) => (
                                        <option key={cat.id} value={cat.id}>
                                            {cat.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2 border-t border-[#eef0f2] pt-3 dark:border-white/[0.06]">
                            {ACTIVITY_TABS.map((tab) => (
                                <button
                                    key={tab.id}
                                    type="button"
                                    title={tab.hint}
                                    onClick={() => setActivity(tab.id)}
                                    className={`rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                                        activity === tab.id
                                            ? "bg-[#003527]/10 text-[#006c49] ring-1 ring-[#006c49]/30 dark:bg-[#6ffbbe]/10 dark:text-[#6ffbbe] dark:ring-[#6ffbbe]/30"
                                            : "text-muted-foreground hover:bg-muted/40"
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        <p className="text-[12px] text-muted-foreground">
                            Period: <strong className="text-foreground">{periodLabel}</strong>.
                            Sold = units checked out; Added = stock received (supply, returns, stock-take).
                        </p>

                        {!isLoading && filteredProducts.length > 0 ? (
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                {[
                                    { label: `Sold${colSuffix}`, value: totals.sold },
                                    { label: `Added${colSuffix}`, value: totals.added },
                                    { label: "Revenue", value: formatGhs(totals.revenue) },
                                    { label: "Profit", value: formatGhs(totals.profit) },
                                ].map((kpi) => (
                                    <div
                                        key={kpi.label}
                                        className="rounded-xl bg-muted/30 px-3 py-2 text-center dark:bg-white/[0.04]"
                                    >
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                            {kpi.label}
                                        </p>
                                        <p className="mt-0.5 text-[15px] font-semibold tabular-nums text-foreground">
                                            {kpi.value}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        ) : null}
                    </div>

                    {!isLoading && filteredProducts.length > 0 ? (
                        <div className="grid gap-4 lg:grid-cols-3">
                            <div className="lg:col-span-2">
                                <TopProductsChart data={chartProducts.byRevenue} />
                            </div>
                            <CategoryMixPieChart data={chartProducts.categoryMix} />
                            <div className="lg:col-span-3">
                                <ProductMovementChart data={chartProducts.movement} />
                            </div>
                        </div>
                    ) : null}

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
                        {error ? (
                            <div className="flex h-48 items-center justify-center px-4 text-center text-sm text-red-600 dark:text-red-400">
                                Could not load report. Try refreshing the page.
                            </div>
                        ) : isLoading ? (
                            <div className="flex h-64 items-center justify-center">
                                <Loader2 className="size-6 animate-spin text-muted-foreground opacity-30" />
                            </div>
                        ) : !data?.products?.length ? (
                            <div className="flex h-64 items-center justify-center px-4 text-center text-sm text-muted-foreground">
                                {activity === "all"
                                    ? "No products yet. Add products to see analytics here."
                                    : "No products match this filter for the selected period."}
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
                                                onClick={() => openAnalytics(product.id)}
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
                                                        {product.barcode ? ` · Barcode ${product.barcode}` : ""}
                                                    </p>
                                                    <p className="text-[12px] text-muted-foreground">
                                                        Sold {product.qtySold} · Added {product.qtyAdded}
                                                    </p>
                                                    <p className="text-[12px] text-muted-foreground">
                                                        Stock {product.stock} · {formatGhs(product.priceGhs)}
                                                        {product.qtySold > 0
                                                            ? ` · Rev ${formatGhs(product.revenue)}`
                                                            : ""}
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
                                    <table className="w-full min-w-[1100px] text-left text-[14px]">
                                        <thead className="border-b border-[#f0f2f4] bg-muted/10 text-[11px] uppercase tracking-wider text-muted-foreground dark:border-white/[0.04]">
                                            <tr>
                                                <th className="px-4 py-3 font-semibold lg:px-6 lg:py-4">Product</th>
                                                <th className="px-4 py-3 font-semibold lg:px-6 lg:py-4">SKU</th>
                                                <th className="px-4 py-3 font-semibold lg:px-6 lg:py-4">Barcode</th>
                                                <th className="px-4 py-3 text-right font-semibold lg:px-6 lg:py-4">
                                                    Sold{colSuffix}
                                                </th>
                                                <th className="px-4 py-3 text-right font-semibold lg:px-6 lg:py-4">
                                                    Added{colSuffix}
                                                </th>
                                                <th className="px-4 py-3 text-right font-semibold lg:px-6 lg:py-4">Stock</th>
                                                <th className="px-4 py-3 text-right font-semibold lg:px-6 lg:py-4">Price</th>
                                                <th className="px-4 py-3 text-right font-semibold lg:px-6 lg:py-4">Revenue</th>
                                                <th className="px-4 py-3 text-right font-semibold lg:px-6 lg:py-4">Profit</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#f0f2f4] dark:divide-white/[0.04]">
                                            {filteredProducts.map((product) => (
                                                <tr
                                                    key={product.id}
                                                    role="button"
                                                    tabIndex={0}
                                                    onClick={() => openAnalytics(product.id)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Enter" || e.key === " ") {
                                                            e.preventDefault();
                                                            openAnalytics(product.id);
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
                                                    <td className="px-4 py-3 text-right tabular-nums text-foreground lg:px-6 lg:py-4">
                                                        {product.qtySold}
                                                    </td>
                                                    <td className="px-4 py-3 text-right tabular-nums text-[#006c49] dark:text-[#6ffbbe] lg:px-6 lg:py-4">
                                                        {product.qtyAdded}
                                                    </td>
                                                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground lg:px-6 lg:py-4">
                                                        {product.stock}
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-[family-name:var(--font-display)] text-[13px] font-semibold tabular-nums text-foreground lg:px-6 lg:py-4">
                                                        {formatGhs(product.priceGhs)}
                                                    </td>
                                                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground lg:px-6 lg:py-4">
                                                        {product.qtySold > 0 ? formatGhs(product.revenue) : "—"}
                                                    </td>
                                                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground lg:px-6 lg:py-4">
                                                        {product.qtySold > 0 ? formatGhs(product.profit) : "—"}
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
