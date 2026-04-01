"use client";

import useSWR from "swr";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import {
    Area,
    AreaChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function formatGhs(n: number): string {
    return new Intl.NumberFormat("en-GH", {
        style: "currency",
        currency: "GHS",
        maximumFractionDigits: 0,
    }).format(n);
}

export function SalesFluidChart() {
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const { data } = useSWR("/api/sales/overview", fetcher);

    useEffect(() => setMounted(true), []);

    const isDark = resolvedTheme === "dark";
    const textColor = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)";
    const gridColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
    const primaryColor = isDark ? "#6ffbbe" : "#006c49";

    const chartData = data?.chartData ?? [];

    if (!mounted) {
        return (
            <div className="flex h-[350px] w-full animate-pulse items-center justify-center rounded-2xl bg-muted/50" />
        );
    }

    return (
        <div className="flex h-full w-full flex-col rounded-2xl border border-[#eef0f2] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] dark:border-white/[0.08] dark:bg-[#111]">
            <div className="mb-6 flex flex-col gap-1">
                <h3 className="font-[family-name:var(--font-display)] text-[16px] font-semibold text-foreground">
                    Revenue Overview
                </h3>
                <p className="text-[13px] text-muted-foreground">
                    Daily revenue for the last 7 days
                </p>
            </div>

            <div className="flex-1">
                {chartData.length === 0 ? (
                    <div className="flex h-[350px] items-center justify-center text-muted-foreground text-sm">
                        Complete your first sale to see revenue data here.
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height={350}>
                        <AreaChart
                            data={chartData}
                            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                        >
                            <defs>
                                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={primaryColor} stopOpacity={0.35} />
                                    <stop offset="95%" stopColor={primaryColor} stopOpacity={0} />
                                </linearGradient>
                            </defs>

                            <CartesianGrid
                                strokeDasharray="4 4"
                                vertical={false}
                                stroke={gridColor}
                            />

                            <XAxis
                                dataKey="date"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: textColor, fontSize: 12, fontWeight: 500 }}
                                dy={10}
                            />

                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: textColor, fontSize: 12, fontWeight: 500 }}
                                tickFormatter={(val) => val >= 1000 ? `GH₵${val / 1000}k` : `GH₵${val}`}
                                dx={-10}
                            />

                            <Tooltip
                                content={({ active, payload, label }) => {
                                    if (active && payload && payload.length) {
                                        return (
                                            <div className="rounded-xl border border-[#eef0f2] bg-white p-3 shadow-xl dark:border-white/[0.12] dark:bg-[#1a1a1a]">
                                                <p className="mb-2 text-[13px] font-medium text-foreground">{label}</p>
                                                <div className="flex items-center gap-4 text-[13px]">
                                                    <div className="flex items-center gap-1.5 font-medium text-muted-foreground">
                                                        <span
                                                            className="size-2.5 rounded-full"
                                                            style={{ backgroundColor: primaryColor }}
                                                        />
                                                        Revenue
                                                    </div>
                                                    <span className="font-[family-name:var(--font-display)] font-semibold tabular-nums text-foreground">
                                                        {formatGhs(payload[0]?.value as number)}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />

                            <Area
                                type="monotone"
                                dataKey="revenue"
                                stroke={primaryColor}
                                strokeWidth={3}
                                fillOpacity={1}
                                fill="url(#colorRevenue)"
                                activeDot={{
                                    r: 6,
                                    strokeWidth: 4,
                                    stroke: isDark ? "#111" : "#fff",
                                    fill: primaryColor,
                                }}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
}
