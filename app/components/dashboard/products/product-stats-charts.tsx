"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useTheme } from "next-themes";
import {
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { formatGhs } from "@/app/lib/catalog-utils";

type Metrics = {
    qtySold: number;
    revenue: number;
    profit: number;
};

type Buyer = {
    customerName: string | null;
    spentGhs: number;
    quantity: number;
};

function money(v: unknown): number {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
}

function qty(v: unknown): number {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
}

function compactGhs(n: number): string {
    if (Math.abs(n) >= 1000) {
        return `GH₵${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k`;
    }
    return formatGhs(n);
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
        warning: isDark ? "#fbbf24" : "#f59e0b",
        accent: isDark ? "#a78bfa" : "#8b5cf6",
        muted: isDark ? "#64748b" : "#94a3b8",
        textColor: isDark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.5)",
        gridColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
        pieStroke: isDark ? "#111" : "#fff",
    };
}

function ChartTip({
    label,
    rows,
}: {
    label?: string;
    rows: { name: string; value: string; color?: string }[];
}) {
    return (
        <div className="rounded-xl border border-border bg-white p-3 shadow-xl dark:bg-[#1a1a1a]">
            {label ? <p className="mb-1.5 text-[12px] font-semibold">{label}</p> : null}
            <div className="flex flex-col gap-1">
                {rows.map((row) => (
                    <div key={row.name} className="flex items-center justify-between gap-4 text-[12px]">
                        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                            {row.color ? (
                                <span className="size-2 rounded-full" style={{ backgroundColor: row.color }} />
                            ) : null}
                            {row.name}
                        </span>
                        <span className="font-semibold tabular-nums">{row.value}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function ChartBox({ title, children }: { title: string; children: ReactNode }) {
    return (
        <div className="rounded-xl border border-border p-3">
            <p className="mb-2 text-[12px] font-semibold">{title}</p>
            {children}
        </div>
    );
}

const BUYER_COLORS = ["#006c49", "#f59e0b", "#8b5cf6", "#0ea5e9", "#ec4899", "#64748b"];

export function ProductStatsCharts({
    daily,
    weekly,
    monthly,
    overall,
    stock,
    buyers,
}: {
    daily: Metrics;
    weekly: Metrics;
    monthly: Metrics;
    overall: Metrics;
    stock: number;
    buyers: Buyer[];
}) {
    const theme = useChartTheme();

    const periodBars = useMemo(
        () => [
            {
                period: "Today",
                sold: qty(daily.qtySold),
                revenue: money(daily.revenue),
                profit: money(daily.profit),
            },
            {
                period: "Week",
                sold: qty(weekly.qtySold),
                revenue: money(weekly.revenue),
                profit: money(weekly.profit),
            },
            {
                period: "Month",
                sold: qty(monthly.qtySold),
                revenue: money(monthly.revenue),
                profit: money(monthly.profit),
            },
        ],
        [daily, weekly, monthly],
    );

    const revenue = money(overall.revenue);
    const profit = Math.max(0, money(overall.profit));
    const cost = Math.max(0, revenue - profit);
    const moneyPie = useMemo(() => {
        const rows = [
            { name: "Profit", value: profit, color: theme.primary },
            { name: "Cost", value: cost, color: theme.warning },
        ].filter((r) => r.value > 0);
        return rows.length ? rows : [{ name: "No sales", value: 1, color: theme.muted }];
    }, [profit, cost, theme.primary, theme.warning, theme.muted]);

    const sold = qty(overall.qtySold);
    const onHand = Math.max(0, qty(stock));
    const stockPie = useMemo(() => {
        const rows = [
            { name: "Sold", value: sold, color: theme.primary },
            { name: "In stock", value: onHand, color: theme.accent },
        ].filter((r) => r.value > 0);
        return rows.length ? rows : [{ name: "No stock data", value: 1, color: theme.muted }];
    }, [sold, onHand, theme.primary, theme.accent, theme.muted]);

    const buyerPie = useMemo(() => {
        const ranked = [...buyers]
            .map((b) => ({
                name: b.customerName?.trim() || "Customer",
                value: money(b.spentGhs),
            }))
            .filter((b) => b.value > 0)
            .sort((a, b) => b.value - a.value);
        const top = ranked.slice(0, 5);
        const rest = ranked.slice(5).reduce((s, b) => s + b.value, 0);
        const rows = top.map((b, i) => ({
            ...b,
            color: BUYER_COLORS[i % BUYER_COLORS.length],
        }));
        if (rest > 0) rows.push({ name: "Others", value: rest, color: theme.muted });
        return rows;
    }, [buyers, theme.muted]);

    const hasSales = periodBars.some((p) => p.sold > 0 || p.revenue > 0) || sold > 0;

    if (!theme.mounted) {
        return <div className="h-[220px] animate-pulse rounded-xl bg-muted/50" />;
    }

    if (!hasSales) {
        return (
            <p className="rounded-xl border border-dashed border-border p-6 text-center text-[13px] text-muted-foreground">
                Charts appear after this product is sold.
            </p>
        );
    }

    const moneyEmpty = revenue <= 0;
    const buyerEmpty = buyerPie.length === 0;

    return (
        <div className="grid gap-3 lg:grid-cols-2">
            <ChartBox title="Sold by period">
                <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={periodBars} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barSize={22}>
                        <CartesianGrid strokeDasharray="4 4" vertical={false} stroke={theme.gridColor} />
                        <XAxis
                            dataKey="period"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: theme.textColor, fontSize: 11 }}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: theme.textColor, fontSize: 11 }}
                            width={28}
                            allowDecimals={false}
                        />
                        <Tooltip
                            content={({ active, payload, label }) => {
                                if (!active || !payload?.length) return null;
                                return (
                                    <ChartTip
                                        label={String(label)}
                                        rows={[
                                            {
                                                name: "Sold",
                                                value: String(payload[0]?.value ?? 0),
                                                color: theme.primary,
                                            },
                                        ]}
                                    />
                                );
                            }}
                        />
                        <Bar dataKey="sold" fill={theme.primary} radius={[6, 6, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </ChartBox>

            <ChartBox title="Revenue & profit">
                <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={periodBars} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barSize={14}>
                        <CartesianGrid strokeDasharray="4 4" vertical={false} stroke={theme.gridColor} />
                        <XAxis
                            dataKey="period"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: theme.textColor, fontSize: 11 }}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: theme.textColor, fontSize: 11 }}
                            tickFormatter={(v) => compactGhs(Number(v))}
                            width={48}
                        />
                        <Tooltip
                            content={({ active, payload, label }) => {
                                if (!active || !payload?.length) return null;
                                return (
                                    <ChartTip
                                        label={String(label)}
                                        rows={payload.map((p) => ({
                                            name: String(p.name),
                                            value: formatGhs(Number(p.value ?? 0)),
                                            color: String(p.color ?? theme.primary),
                                        }))}
                                    />
                                );
                            }}
                        />
                        <Legend
                            iconType="circle"
                            formatter={(v) => <span className="text-[11px] text-muted-foreground">{v}</span>}
                        />
                        <Bar name="Revenue" dataKey="revenue" fill={theme.primary} radius={[4, 4, 0, 0]} />
                        <Bar name="Profit" dataKey="profit" fill={theme.warning} radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </ChartBox>

            <ChartBox title="Money split">
                <div className="relative">
                    <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                            <Tooltip
                                content={({ active, payload }) => {
                                    if (!active || !payload?.length || moneyEmpty) return null;
                                    const val = Number(payload[0]?.value ?? 0);
                                    const share = revenue > 0 ? Math.round((val / revenue) * 100) : 0;
                                    return (
                                        <ChartTip
                                            rows={[
                                                {
                                                    name: String(payload[0]?.name),
                                                    value: `${formatGhs(val)} (${share}%)`,
                                                    color: payload[0]?.payload?.color,
                                                },
                                            ]}
                                        />
                                    );
                                }}
                            />
                            <Pie
                                data={moneyPie}
                                cx="50%"
                                cy="46%"
                                innerRadius={48}
                                outerRadius={72}
                                paddingAngle={3}
                                dataKey="value"
                                nameKey="name"
                                stroke={theme.pieStroke}
                                strokeWidth={2}
                            >
                                {moneyPie.map((entry) => (
                                    <Cell key={entry.name} fill={entry.color} />
                                ))}
                            </Pie>
                            <Legend
                                verticalAlign="bottom"
                                iconType="circle"
                                formatter={(v) => <span className="text-[11px] text-muted-foreground">{v}</span>}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-x-0 top-[58px] flex flex-col items-center">
                        <p className="text-[10px] text-muted-foreground">Revenue</p>
                        <p className="text-[12px] font-semibold tabular-nums">{compactGhs(revenue)}</p>
                    </div>
                </div>
            </ChartBox>

            <ChartBox title={buyerEmpty ? "Sold vs stock" : "Top buyers"}>
                <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                        <Tooltip
                            content={({ active, payload }) => {
                                if (!active || !payload?.length) return null;
                                const val = Number(payload[0]?.value ?? 0);
                                const slice = payload[0]?.payload as { name: string; color: string };
                                if (buyerEmpty) {
                                    const total = sold + onHand;
                                    const share = total > 0 ? Math.round((val / total) * 100) : 0;
                                    return (
                                        <ChartTip
                                            rows={[
                                                {
                                                    name: slice.name,
                                                    value: `${val} (${share}%)`,
                                                    color: slice.color,
                                                },
                                            ]}
                                        />
                                    );
                                }
                                const total = buyerPie.reduce((s, b) => s + b.value, 0);
                                const share = total > 0 ? Math.round((val / total) * 100) : 0;
                                return (
                                    <ChartTip
                                        rows={[
                                            {
                                                name: slice.name,
                                                value: `${formatGhs(val)} (${share}%)`,
                                                color: slice.color,
                                            },
                                        ]}
                                    />
                                );
                            }}
                        />
                        <Pie
                            data={buyerEmpty ? stockPie : buyerPie}
                            cx="50%"
                            cy="46%"
                            innerRadius={48}
                            outerRadius={72}
                            paddingAngle={3}
                            dataKey="value"
                            nameKey="name"
                            stroke={theme.pieStroke}
                            strokeWidth={2}
                        >
                            {(buyerEmpty ? stockPie : buyerPie).map((entry) => (
                                <Cell key={entry.name} fill={entry.color} />
                            ))}
                        </Pie>
                        <Legend
                            verticalAlign="bottom"
                            iconType="circle"
                            formatter={(v) => <span className="text-[11px] text-muted-foreground">{v}</span>}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </ChartBox>
        </div>
    );
}
