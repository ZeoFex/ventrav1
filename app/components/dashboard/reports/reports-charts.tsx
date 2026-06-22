"use client";

import type { ReactNode } from "react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    ComposedChart,
    Legend,
    Line,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

export function formatReportGhs(n: number, compact = false): string {
    if (compact && Math.abs(n) >= 1000) {
        return `GH₵${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
    }
    return new Intl.NumberFormat("en-GH", {
        style: "currency",
        currency: "GHS",
        maximumFractionDigits: 0,
    }).format(n);
}

function useChartTheme() {
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    const isDark = resolvedTheme === "dark";
    return {
        mounted,
        isDark,
        primary: isDark ? "#6ffbbe" : "#006c49",
        secondary: isDark ? "#34d399" : "#059669",
        accent: isDark ? "#a78bfa" : "#8b5cf6",
        warning: isDark ? "#fbbf24" : "#f59e0b",
        danger: isDark ? "#f87171" : "#dc2626",
        textColor: isDark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.5)",
        gridColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
        tooltipBg: isDark ? "#1a1a1a" : "#ffffff",
        tooltipBorder: isDark ? "rgba(255,255,255,0.12)" : "#eef0f2",
    };
}

function ChartSkeleton({ height = 350 }: { height?: number }) {
    return <div className="w-full animate-pulse rounded-2xl bg-muted/50" style={{ height }} />;
}

function ChartCard({
    title,
    subtitle,
    children,
    className = "",
}: {
    title: string;
    subtitle?: string;
    children: ReactNode;
    className?: string;
}) {
    return (
        <div
            className={`flex h-full w-full flex-col rounded-[1.25rem] border border-[#eef0f2] bg-surface-card p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] dark:border-white/[0.08] dark:bg-[#111] ${className}`}
        >
            <div className="mb-4">
                <h3 className="font-[family-name:var(--font-display)] text-[16px] font-semibold text-foreground">
                    {title}
                </h3>
                {subtitle ? <p className="mt-0.5 text-[13px] text-muted-foreground">{subtitle}</p> : null}
            </div>
            <div className="flex-1 min-h-0">{children}</div>
        </div>
    );
}

function ReportTooltip({
    label,
    rows,
}: {
    label?: string;
    rows: { name: string; value: string; color?: string }[];
}) {
    return (
        <div className="rounded-xl border border-[#eef0f2] bg-white p-3 shadow-xl dark:border-white/[0.12] dark:bg-[#1a1a1a]">
            {label ? <p className="mb-2 text-[13px] font-medium text-foreground">{label}</p> : null}
            <div className="flex flex-col gap-1.5">
                {rows.map((row) => (
                    <div key={row.name} className="flex items-center justify-between gap-4 text-[13px]">
                        <div className="flex items-center gap-1.5 font-medium text-muted-foreground">
                            {row.color ? (
                                <span className="size-2.5 rounded-full" style={{ backgroundColor: row.color }} />
                            ) : null}
                            {row.name}
                        </div>
                        <span className="font-[family-name:var(--font-display)] font-semibold tabular-nums text-foreground">
                            {row.value}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

const CHART_PALETTE = ["#006c49", "#f59e0b", "#8b5cf6", "#0ea5e9", "#ec4899", "#64748b", "#14b8a6", "#f97316"];

export function DailyRevenueChart({
    data,
    periodLabel,
}: {
    data: { date: string; sales: number; transactions?: number }[];
    periodLabel?: string;
}) {
    const theme = useChartTheme();
    if (!theme.mounted) return <ChartSkeleton />;

    const total = data.reduce((s, d) => s + d.sales, 0);
    const avg = data.length ? total / data.length : 0;

    return (
        <ChartCard
            title="Revenue trend"
            subtitle={periodLabel || "Daily net sales across the selected period"}
        >
            {data.length === 0 ? (
                <div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground">
                    No sales in this period yet.
                </div>
            ) : (
                <>
                    <div className="mb-3 flex flex-wrap gap-4 text-[12px]">
                        <span className="text-muted-foreground">
                            Total{" "}
                            <strong className="text-foreground">{formatReportGhs(total)}</strong>
                        </span>
                        <span className="text-muted-foreground">
                            Daily avg{" "}
                            <strong className="text-foreground">{formatReportGhs(avg)}</strong>
                        </span>
                    </div>
                    <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="reportRevGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={theme.primary} stopOpacity={0.35} />
                                    <stop offset="95%" stopColor={theme.primary} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="4 4" vertical={false} stroke={theme.gridColor} />
                            <XAxis
                                dataKey="date"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: theme.textColor, fontSize: 11 }}
                                dy={8}
                                interval="preserveStartEnd"
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: theme.textColor, fontSize: 11 }}
                                tickFormatter={(v) => formatReportGhs(v, true)}
                                width={52}
                            />
                            <Tooltip
                                content={({ active, payload, label }) => {
                                    if (!active || !payload?.length) return null;
                                    const sales = Number(payload[0]?.value ?? 0);
                                    const tx = payload[0]?.payload?.transactions;
                                    return (
                                        <ReportTooltip
                                            label={String(label)}
                                            rows={[
                                                { name: "Revenue", value: formatReportGhs(sales), color: theme.primary },
                                                ...(tx != null
                                                    ? [{ name: "Transactions", value: String(tx) }]
                                                    : []),
                                            ]}
                                        />
                                    );
                                }}
                            />
                            <Area
                                type="monotone"
                                dataKey="sales"
                                stroke={theme.primary}
                                strokeWidth={2.5}
                                fill="url(#reportRevGrad)"
                                activeDot={{
                                    r: 5,
                                    strokeWidth: 3,
                                    stroke: theme.isDark ? "#111" : "#fff",
                                    fill: theme.primary,
                                }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </>
            )}
        </ChartCard>
    );
}

export function HourlySalesChart({ data }: { data: { time: string; sales: number; transactions?: number }[] }) {
    const theme = useChartTheme();
    if (!theme.mounted) return <ChartSkeleton />;

    const peak = data.reduce(
        (best, d) => (d.sales > best.sales ? d : best),
        { time: "—", sales: 0 },
    );

    return (
        <ChartCard title="Today's hourly sales" subtitle="Accra time — live register activity">
            {data.length === 0 ? (
                <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
                    No sales recorded today yet.
                </div>
            ) : (
                <>
                    <p className="mb-3 text-[12px] text-muted-foreground">
                        Peak hour: <strong className="text-foreground">{peak.time}</strong> (
                        {formatReportGhs(peak.sales)})
                    </p>
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barSize={20}>
                            <CartesianGrid strokeDasharray="4 4" vertical={false} stroke={theme.gridColor} />
                            <XAxis
                                dataKey="time"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: theme.textColor, fontSize: 11 }}
                            />
                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: theme.textColor, fontSize: 11 }}
                                tickFormatter={(v) => formatReportGhs(v, true)}
                                width={48}
                            />
                            <Tooltip
                                content={({ active, payload, label }) => {
                                    if (!active || !payload?.length) return null;
                                    return (
                                        <ReportTooltip
                                            label={String(label)}
                                            rows={[
                                                {
                                                    name: "Sales",
                                                    value: formatReportGhs(Number(payload[0]?.value ?? 0)),
                                                    color: theme.primary,
                                                },
                                            ]}
                                        />
                                    );
                                }}
                            />
                            <Bar dataKey="sales" fill={theme.primary} radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </>
            )}
        </ChartCard>
    );
}

/** @deprecated Use HourlySalesChart — kept for backward compatibility */
export const SalesTrendChart = HourlySalesChart;

export function PaymentMethodsChart({
    data,
}: {
    data: { name: string; value: number; color: string }[];
}) {
    const theme = useChartTheme();
    if (!theme.mounted) return <ChartSkeleton />;

    const chartData = data.map((item) => ({
        ...item,
        color: item.color === "#006c49" && theme.isDark ? "#6ffbbe" : item.color,
    }));
    const total = chartData.reduce((s, d) => s + d.value, 0);

    return (
        <ChartCard title="Payment mix" subtitle="Revenue share by tender type">
            {chartData.length === 0 ? (
                <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
                    No payment data yet.
                </div>
            ) : (
                <div className="relative">
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Tooltip
                                content={({ active, payload }) => {
                                    if (!active || !payload?.length) return null;
                                    const p = payload[0];
                                    const val = Number(p.value ?? 0);
                                    const share = total > 0 ? Math.round((val / total) * 100) : 0;
                                    return (
                                        <ReportTooltip
                                            rows={[
                                                {
                                                    name: String(p.name),
                                                    value: `${formatReportGhs(val)} (${share}%)`,
                                                    color: p.payload?.color,
                                                },
                                            ]}
                                        />
                                    );
                                }}
                            />
                            <Pie
                                data={chartData}
                                cx="50%"
                                cy="48%"
                                innerRadius={68}
                                outerRadius={98}
                                paddingAngle={3}
                                dataKey="value"
                                nameKey="name"
                                stroke="none"
                                cornerRadius={5}
                            >
                                {chartData.map((entry, i) => (
                                    <Cell key={entry.name} fill={entry.color} />
                                ))}
                            </Pie>
                            <Legend
                                verticalAlign="bottom"
                                height={40}
                                iconType="circle"
                                formatter={(value) => (
                                    <span className="ml-1 text-[12px] font-medium text-foreground">{value}</span>
                                )}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pb-10">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                            Total
                        </span>
                        <span className="font-[family-name:var(--font-display)] text-xl font-bold text-foreground">
                            {formatReportGhs(total)}
                        </span>
                    </div>
                </div>
            )}
        </ChartCard>
    );
}

export function CategoryPerformanceChart({
    data,
}: {
    data: { category: string; sales: number; percentage: number }[];
}) {
    const theme = useChartTheme();
    if (!theme.mounted) return <ChartSkeleton />;

    const chartData = data.slice(0, 8).map((d) => ({
        ...d,
        shortName: d.category.length > 18 ? `${d.category.slice(0, 16)}…` : d.category,
    }));

    return (
        <ChartCard title="Sales by category" subtitle="Revenue contribution by product category">
            {chartData.length === 0 ? (
                <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
                    No category data yet.
                </div>
            ) : (
                <ResponsiveContainer width="100%" height={Math.max(280, chartData.length * 36)}>
                    <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 16, left: 4, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="4 4" horizontal={false} stroke={theme.gridColor} />
                        <XAxis
                            type="number"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: theme.textColor, fontSize: 11 }}
                            tickFormatter={(v) => formatReportGhs(v, true)}
                        />
                        <YAxis
                            type="category"
                            dataKey="shortName"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: theme.textColor, fontSize: 11 }}
                            width={100}
                        />
                        <Tooltip
                            content={({ active, payload }) => {
                                if (!active || !payload?.length) return null;
                                const row = payload[0]?.payload;
                                return (
                                    <ReportTooltip
                                        label={row?.category}
                                        rows={[
                                            {
                                                name: "Revenue",
                                                value: formatReportGhs(Number(row?.sales ?? 0)),
                                                color: theme.primary,
                                            },
                                            { name: "Share", value: `${row?.percentage ?? 0}%` },
                                        ]}
                                    />
                                );
                            }}
                        />
                        <Bar dataKey="sales" fill={theme.primary} radius={[0, 4, 4, 0]} barSize={18} />
                    </BarChart>
                </ResponsiveContainer>
            )}
        </ChartCard>
    );
}

export function TopProductsChart({
    data,
}: {
    data: { name: string; revenue: number; qty?: number }[];
}) {
    const theme = useChartTheme();
    if (!theme.mounted) return <ChartSkeleton />;

    const chartData = data.slice(0, 8).map((d, i) => ({
        ...d,
        shortName: d.name.length > 22 ? `${d.name.slice(0, 20)}…` : d.name,
        fill: CHART_PALETTE[i % CHART_PALETTE.length],
    }));

    return (
        <ChartCard title="Top products" subtitle="Best sellers by revenue">
            {chartData.length === 0 ? (
                <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
                    No product sales yet.
                </div>
            ) : (
                <ResponsiveContainer width="100%" height={Math.max(260, chartData.length * 34)}>
                    <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 12, left: 4, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="4 4" horizontal={false} stroke={theme.gridColor} />
                        <XAxis
                            type="number"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: theme.textColor, fontSize: 11 }}
                            tickFormatter={(v) => formatReportGhs(v, true)}
                        />
                        <YAxis
                            type="category"
                            dataKey="shortName"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: theme.textColor, fontSize: 11 }}
                            width={108}
                        />
                        <Tooltip
                            content={({ active, payload }) => {
                                if (!active || !payload?.length) return null;
                                const row = payload[0]?.payload;
                                const rows = [
                                    {
                                        name: "Revenue",
                                        value: formatReportGhs(Number(row?.revenue ?? 0)),
                                        color: row?.fill,
                                    },
                                ];
                                if (row?.qty != null) {
                                    rows.push({ name: "Units sold", value: String(row.qty) });
                                }
                                return <ReportTooltip label={row?.name} rows={rows} />;
                            }}
                        />
                        <Bar dataKey="revenue" radius={[0, 4, 4, 0]} barSize={16}>
                            {chartData.map((entry) => (
                                <Cell key={entry.name} fill={entry.fill} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            )}
        </ChartCard>
    );
}

export function ProfitMarginComboChart({
    data,
}: {
    data: { date: string; sales: number; profit?: number }[];
}) {
    const theme = useChartTheme();
    if (!theme.mounted) return <ChartSkeleton />;

    const enriched = data.map((d) => ({
        ...d,
        profit: d.profit ?? Math.round(d.sales * 0.35),
    }));

    return (
        <ChartCard title="Revenue & estimated profit" subtitle="Daily net sales with margin trajectory">
            <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={enriched} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="4 4" vertical={false} stroke={theme.gridColor} />
                    <XAxis
                        dataKey="date"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: theme.textColor, fontSize: 11 }}
                        interval="preserveStartEnd"
                    />
                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: theme.textColor, fontSize: 11 }}
                        tickFormatter={(v) => formatReportGhs(v, true)}
                        width={52}
                    />
                    <Tooltip
                        content={({ active, payload, label }) => {
                            if (!active || !payload?.length) return null;
                            return (
                                <ReportTooltip
                                    label={String(label)}
                                    rows={payload.map((p) => ({
                                        name: String(p.name),
                                        value: formatReportGhs(Number(p.value ?? 0)),
                                        color: String(p.color),
                                    }))}
                                />
                            );
                        }}
                    />
                    <Legend
                        formatter={(v) => <span className="text-[12px] text-foreground">{v}</span>}
                    />
                    <Bar dataKey="sales" name="Revenue" fill={theme.primary} radius={[3, 3, 0, 0]} barSize={14} />
                    <Line
                        type="monotone"
                        dataKey="profit"
                        name="Gross profit"
                        stroke={theme.accent}
                        strokeWidth={2}
                        dot={false}
                    />
                </ComposedChart>
            </ResponsiveContainer>
        </ChartCard>
    );
}

export function ProductMovementChart({
    data,
}: {
    data: { name: string; qtySold: number; qtyAdded: number }[];
}) {
    const theme = useChartTheme();
    if (!theme.mounted) return <ChartSkeleton />;

    const top = data
        .filter((d) => d.qtySold > 0 || d.qtyAdded > 0)
        .sort((a, b) => b.qtySold + b.qtyAdded - (a.qtySold + a.qtyAdded))
        .slice(0, 8)
        .map((d) => ({
            ...d,
            shortName: d.name.length > 16 ? `${d.name.slice(0, 14)}…` : d.name,
        }));

    return (
        <ChartCard title="Stock movement" subtitle="Units sold vs stock added (top movers)">
            {top.length === 0 ? (
                <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
                    No movement in this period.
                </div>
            ) : (
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={top} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="4 4" vertical={false} stroke={theme.gridColor} />
                        <XAxis
                            dataKey="shortName"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: theme.textColor, fontSize: 10 }}
                            interval={0}
                            angle={-25}
                            textAnchor="end"
                            height={56}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: theme.textColor, fontSize: 11 }}
                        />
                        <Tooltip
                            content={({ active, payload, label }) => {
                                if (!active || !payload?.length) return null;
                                const row = payload[0]?.payload;
                                return (
                                    <ReportTooltip
                                        label={row?.name || String(label)}
                                        rows={[
                                            { name: "Sold", value: String(row?.qtySold ?? 0), color: theme.primary },
                                            { name: "Added", value: String(row?.qtyAdded ?? 0), color: theme.warning },
                                        ]}
                                    />
                                );
                            }}
                        />
                        <Legend formatter={(v) => <span className="text-[12px]">{v}</span>} />
                        <Bar dataKey="qtySold" name="Sold" fill={theme.primary} radius={[3, 3, 0, 0]} />
                        <Bar dataKey="qtyAdded" name="Added" fill={theme.warning} radius={[3, 3, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            )}
        </ChartCard>
    );
}

export function CategoryMixPieChart({
    data,
    valueKey = "revenue" as "revenue" | "retailValue",
    labelKey = "category",
}: {
    data: { category: string; revenue?: number; retailValue?: number; percentage?: number }[];
    valueKey?: "revenue" | "retailValue";
    labelKey?: string;
}) {
    const theme = useChartTheme();

    const chartData = data.slice(0, 6).map((d, i) => ({
        name: d.category,
        value: Number(d[valueKey] ?? d.revenue ?? d.retailValue ?? 0),
        color: CHART_PALETTE[i % CHART_PALETTE.length],
    }));
    const total = chartData.reduce((s, d) => s + d.value, 0);

    if (!theme.mounted) return <ChartSkeleton />;

    return (
        <ChartCard title="Category mix" subtitle="Share of total value">
            {chartData.length === 0 ? (
                <div className="flex h-[280px] items-center justify-center text-sm text-muted-foreground">
                    No data available.
                </div>
            ) : (
                <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                        <Tooltip
                            content={({ active, payload }) => {
                                if (!active || !payload?.length) return null;
                                const val = Number(payload[0]?.value ?? 0);
                                const share = total > 0 ? Math.round((val / total) * 100) : 0;
                                return (
                                    <ReportTooltip
                                        rows={[
                                            {
                                                name: String(payload[0]?.name),
                                                value: `${formatReportGhs(val)} (${share}%)`,
                                                color: payload[0]?.payload?.color,
                                            },
                                        ]}
                                    />
                                );
                            }}
                        />
                        <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            outerRadius={95}
                            dataKey="value"
                            nameKey="name"
                            stroke="none"
                        >
                            {chartData.map((entry) => (
                                <Cell key={entry.name} fill={entry.color} />
                            ))}
                        </Pie>
                        <Legend
                            verticalAlign="bottom"
                            formatter={(v) => <span className="text-[11px]">{v}</span>}
                        />
                    </PieChart>
                </ResponsiveContainer>
            )}
        </ChartCard>
    );
}

export function TaxCollectionChart({
    data,
}: {
    data: { date: string; tax: number; taxable?: number }[];
}) {
    const theme = useChartTheme();
    if (!theme.mounted) return <ChartSkeleton />;

    return (
        <ChartCard title="Daily tax collection" subtitle="Tax collected per Accra calendar day">
            <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <defs>
                        <linearGradient id="taxGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={theme.warning} stopOpacity={0.35} />
                            <stop offset="95%" stopColor={theme.warning} stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="4 4" vertical={false} stroke={theme.gridColor} />
                    <XAxis
                        dataKey="date"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: theme.textColor, fontSize: 11 }}
                        interval="preserveStartEnd"
                    />
                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: theme.textColor, fontSize: 11 }}
                        tickFormatter={(v) => formatReportGhs(v, true)}
                        width={48}
                    />
                    <Tooltip
                        content={({ active, payload, label }) => {
                            if (!active || !payload?.length) return null;
                            const rows = [
                                {
                                    name: "Tax",
                                    value: formatReportGhs(Number(payload[0]?.value ?? 0)),
                                    color: theme.warning,
                                },
                            ];
                            const taxable = payload[0]?.payload?.taxable;
                            if (taxable != null) {
                                rows.push({ name: "Taxable sales", value: formatReportGhs(Number(taxable)) });
                            }
                            return <ReportTooltip label={String(label)} rows={rows} />;
                        }}
                    />
                    <Area
                        type="monotone"
                        dataKey="tax"
                        stroke={theme.warning}
                        strokeWidth={2}
                        fill="url(#taxGrad)"
                    />
                </AreaChart>
            </ResponsiveContainer>
        </ChartCard>
    );
}

export function TaxBreakdownChart({
    data,
}: {
    data: { name: string; amount: number }[];
}) {
    const theme = useChartTheme();
    if (!theme.mounted) return <ChartSkeleton />;

    const chartData = data.map((d, i) => ({
        ...d,
        color: CHART_PALETTE[i % CHART_PALETTE.length],
    }));

    return (
        <ChartCard title="Levy composition" subtitle="Estimated split for GRA filing reference">
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="4 4" vertical={false} stroke={theme.gridColor} />
                    <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: theme.textColor, fontSize: 10 }}
                        interval={0}
                        angle={-15}
                        textAnchor="end"
                        height={64}
                    />
                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: theme.textColor, fontSize: 11 }}
                        tickFormatter={(v) => formatReportGhs(v, true)}
                        width={52}
                    />
                    <Tooltip
                        content={({ active, payload }) => {
                            if (!active || !payload?.length) return null;
                            return (
                                <ReportTooltip
                                    rows={[
                                        {
                                            name: String(payload[0]?.payload?.name),
                                            value: formatReportGhs(Number(payload[0]?.value ?? 0)),
                                            color: payload[0]?.payload?.color,
                                        },
                                    ]}
                                />
                            );
                        }}
                    />
                    <Bar dataKey="amount" radius={[4, 4, 0, 0]} barSize={36}>
                        {chartData.map((entry) => (
                            <Cell key={entry.name} fill={entry.color} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </ChartCard>
    );
}

export function InventoryValueChart({
    data,
}: {
    data: { category: string; costValue: number; retailValue: number }[];
}) {
    const theme = useChartTheme();
    if (!theme.mounted) return <ChartSkeleton />;

    const chartData = data.slice(0, 8).map((d) => ({
        ...d,
        shortName: d.category.length > 14 ? `${d.category.slice(0, 12)}…` : d.category,
    }));

    return (
        <ChartCard title="Inventory value by category" subtitle="Cost vs retail stock valuation">
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="4 4" vertical={false} stroke={theme.gridColor} />
                    <XAxis
                        dataKey="shortName"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: theme.textColor, fontSize: 10 }}
                        interval={0}
                        angle={-20}
                        textAnchor="end"
                        height={52}
                    />
                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: theme.textColor, fontSize: 11 }}
                        tickFormatter={(v) => formatReportGhs(v, true)}
                        width={52}
                    />
                    <Tooltip
                        content={({ active, payload, label }) => {
                            if (!active || !payload?.length) return null;
                            return (
                                <ReportTooltip
                                    label={String(label)}
                                    rows={payload.map((p) => ({
                                        name: String(p.name),
                                        value: formatReportGhs(Number(p.value ?? 0)),
                                        color: String(p.color),
                                    }))}
                                />
                            );
                        }}
                    />
                    <Legend formatter={(v) => <span className="text-[12px]">{v}</span>} />
                    <Bar dataKey="costValue" name="Cost value" fill={theme.textColor} radius={[3, 3, 0, 0]} />
                    <Bar dataKey="retailValue" name="Retail value" fill={theme.primary} radius={[3, 3, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </ChartCard>
    );
}

export function MarginGaugeChart({ percent }: { percent: number }) {
    const theme = useChartTheme();
    const clamped = Math.min(100, Math.max(0, percent));
    const dashOffset = 2 * Math.PI * 58 * (1 - clamped / 100);

    if (!theme.mounted) return <ChartSkeleton height={200} />;

    return (
        <ChartCard title="Portfolio margin" subtitle="Potential profit on current stock">
            <div className="flex flex-col items-center justify-center py-4">
                <div className="relative flex h-36 w-36 items-center justify-center">
                    <svg className="h-full w-full -rotate-90">
                        <circle
                            cx="72"
                            cy="72"
                            r="58"
                            fill="transparent"
                            stroke="currentColor"
                            strokeWidth="10"
                            className="text-[#f4f5f7] dark:text-white/[0.06]"
                        />
                        <circle
                            cx="72"
                            cy="72"
                            r="58"
                            fill="transparent"
                            stroke={theme.primary}
                            strokeWidth="10"
                            strokeLinecap="round"
                            strokeDasharray={2 * Math.PI * 58}
                            strokeDashoffset={dashOffset}
                        />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="font-[family-name:var(--font-display)] text-3xl font-bold text-foreground">
                            {clamped.toFixed(1)}%
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            Avg margin
                        </span>
                    </div>
                </div>
                <p className="mt-4 max-w-xs text-center text-[13px] text-muted-foreground">
                    {clamped >= 30
                        ? "Healthy margin — stock is priced well above cost."
                        : clamped >= 15
                          ? "Moderate margin — review pricing on low-margin categories."
                          : "Thin margin — consider repricing or renegotiating supplier costs."}
                </p>
            </div>
        </ChartCard>
    );
}

export function MiniSparkline({ data, dataKey = "sales" }: { data: { [k: string]: number | string }[]; dataKey?: string }) {
    const theme = useChartTheme();
    if (!theme.mounted || data.length < 2) return null;

    return (
        <ResponsiveContainer width="100%" height={48}>
            <AreaChart data={data}>
                <defs>
                    <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={theme.primary} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={theme.primary} stopOpacity={0} />
                    </linearGradient>
                </defs>
                <Area
                    type="monotone"
                    dataKey={dataKey}
                    stroke={theme.primary}
                    strokeWidth={1.5}
                    fill="url(#sparkGrad)"
                    dot={false}
                    isAnimationActive={false}
                />
            </AreaChart>
        </ResponsiveContainer>
    );
}
