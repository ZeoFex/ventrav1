"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import {
    Bar,
    BarChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
    PieChart,
    Pie,
    Cell,
    Legend,
} from "recharts";

function formatGhs(n: number): string {
    return new Intl.NumberFormat("en-GH", {
        style: "currency",
        currency: "GHS",
        maximumFractionDigits: 0,
    }).format(n);
}

export function SalesTrendChart({ data }: { data: any[] }) {
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => setMounted(true), []);

    const isDark = resolvedTheme === "dark";
    const textColor = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)";
    const gridColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
    const barColor = isDark ? "#6ffbbe" : "#006c49";

    if (!mounted) {
        return <div className="flex h-[350px] w-full animate-pulse rounded-2xl bg-muted/50" />;
    }

    return (
        <div className="flex h-full w-full flex-col rounded-[1.25rem] border border-[#eef0f2] bg-surface-card p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] dark:border-white/[0.08] dark:bg-[#111]">
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h3 className="font-[family-name:var(--font-display)] text-[16px] font-semibold text-foreground">
                        Sales Trend (Today)
                    </h3>
                    <p className="text-[13px] text-muted-foreground">Hourly sales volume</p>
                </div>
            </div>

            <div className="flex-1">
                <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barSize={32}>
                        <CartesianGrid strokeDasharray="4 4" vertical={false} stroke={gridColor} />
                        <XAxis
                            dataKey="time"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: textColor, fontSize: 12, fontWeight: 500 }}
                            dy={10}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: textColor, fontSize: 12, fontWeight: 500 }}
                            tickFormatter={(val) => `GH₵${val / 1000}k`}
                            dx={-10}
                        />
                        <Tooltip
                            cursor={{ fill: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)" }}
                            content={({ active, payload, label }) => {
                                if (active && payload && payload.length) {
                                    return (
                                        <div className="rounded-xl border border-[#eef0f2] bg-white p-3 shadow-xl dark:border-white/[0.12] dark:bg-[#1a1a1a]">
                                            <p className="mb-2 text-[13px] font-medium text-foreground">{label}</p>
                                            <div className="flex items-center gap-4 text-[13px]">
                                                <div className="flex items-center gap-1.5 font-medium text-muted-foreground">
                                                    <span className="size-2.5 rounded-full bg-[#006c49] dark:bg-[#6ffbbe]" />
                                                    Sales
                                                </div>
                                                <span className="font-[family-name:var(--font-display)] font-semibold tabular-nums text-foreground">
                                                    {formatGhs(payload[0].value as number)}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />
                        <Bar dataKey="sales" fill={barColor} radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

export function PaymentMethodsChart({ data }: { data: any[] }) {
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => setMounted(true), []);

    if (!mounted) {
        return <div className="flex h-[350px] w-full animate-pulse rounded-2xl bg-muted/50" />;
    }

    const chartData = data.map(item => ({
        ...item,
        color: (item.color === "#006c49" && resolvedTheme === "dark") ? "#6ffbbe" : item.color
    }));

    return (
        <div className="flex h-full w-full flex-col rounded-[1.25rem] border border-[#eef0f2] bg-surface-card p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] dark:border-white/[0.08] dark:bg-[#111]">
            <div className="mb-2">
                <h3 className="font-[family-name:var(--font-display)] text-[16px] font-semibold text-foreground">
                    Payment Split
                </h3>
                <p className="text-[13px] text-muted-foreground">Revenue by tender type</p>
            </div>

            <div className="flex-1 relative">
                <ResponsiveContainer width="100%" height={350}>
                    <PieChart>
                        <Tooltip
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    return (
                                        <div className="rounded-xl border border-[#eef0f2] bg-white p-3 shadow-xl dark:border-white/[0.12] dark:bg-[#1a1a1a]">
                                            <div className="flex items-center gap-4 text-[13px]">
                                                <div className="flex items-center gap-1.5 font-medium text-muted-foreground">
                                                    <span className="size-2.5 rounded-full" style={{ backgroundColor: payload[0].payload.color }} />
                                                    {payload[0].name}
                                                </div>
                                                <span className="font-[family-name:var(--font-display)] font-semibold tabular-nums text-foreground">
                                                    {formatGhs(payload[0].value as number)}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />
                        <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={70}
                            outerRadius={100}
                            paddingAngle={4}
                            dataKey="value"
                            nameKey="name"
                            stroke="none"
                            cornerRadius={6}
                        >
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                        <Legend
                            verticalAlign="bottom"
                            height={36}
                            iconType="circle"
                            formatter={(value, entry: any) => (
                                <span className="text-[13px] font-medium text-foreground ml-1">{value}</span>
                            )}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
