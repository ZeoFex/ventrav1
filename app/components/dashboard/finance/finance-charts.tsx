"use client";

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
    PieChart,
    Pie,
    Cell,
    Legend,
} from "recharts";

function formatCurrency(n: number): string {
    return new Intl.NumberFormat("en-GH", {
        style: "currency",
        currency: "GHS",
        maximumFractionDigits: 0,
    }).format(n);
}

export function CashFlowChart({ data = [] }: { data: any[] }) {
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => setMounted(true), []);

    const isDark = resolvedTheme === "dark";
    const textColor = isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)";
    const gridColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";

    const revenueColor = isDark ? "#6ffbbe" : "#006c49";
    const expenseColor = isDark ? "#ef4444" : "#dc2626";

    if (!mounted) {
        return <div className="flex h-[350px] w-full animate-pulse rounded-2xl bg-muted/50" />;
    }

    return (
        <div className="flex h-full w-full flex-col rounded-[1.25rem] border border-[#eef0f2] bg-surface-card p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] dark:border-white/[0.08] dark:bg-[#111]">
            <div className="mb-6">
                <h3 className="font-[family-name:var(--font-display)] text-[16px] font-semibold text-foreground">
                    Cash Flow (Last 7 Days)
                </h3>
                <p className="text-[13px] text-muted-foreground">Revenue vs. Expenses</p>
            </div>

            <div className="flex-1">
                <ResponsiveContainer width="100%" height={350}>
                    <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={revenueColor} stopOpacity={0.3} />
                                <stop offset="95%" stopColor={revenueColor} stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={expenseColor} stopOpacity={0.3} />
                                <stop offset="95%" stopColor={expenseColor} stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="4 4" vertical={false} stroke={gridColor} />
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
                            tickFormatter={(val) => `GH₵${val / 1000}k`}
                            dx={-10}
                        />
                        <Tooltip
                            content={({ active, payload, label }) => {
                                if (active && payload && payload.length) {
                                    return (
                                        <div className="rounded-xl border border-[#eef0f2] bg-white p-3 shadow-xl dark:border-white/[0.12] dark:bg-[#1a1a1a]">
                                            <p className="mb-2 text-[13px] font-medium text-foreground">{label}</p>
                                            <div className="flex flex-col gap-1.5">
                                                {payload.map((entry, index) => (
                                                    <div key={index} className="flex items-center gap-4 text-[13px]">
                                                        <div className="flex items-center gap-1.5 font-medium text-muted-foreground capitalize">
                                                            <span className="size-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                                                            {entry.name}
                                                        </div>
                                                        <span className="font-[family-name:var(--font-display)] font-semibold tabular-nums text-foreground">
                                                            {formatCurrency(entry.value as number)}
                                                        </span>
                                                    </div>
                                                ))}
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
                            name="Revenue"
                            stroke={revenueColor}
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorRev)"
                            activeDot={{ r: 6, strokeWidth: 4, stroke: isDark ? "#111" : "#fff", fill: revenueColor }}
                        />
                        <Area
                            type="monotone"
                            dataKey="expenses"
                            name="Expenses"
                            stroke={expenseColor}
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorExp)"
                            activeDot={{ r: 4, strokeWidth: 3, stroke: isDark ? "#111" : "#fff", fill: expenseColor }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

export function ExpenseBreakdownChart({ data: propData = [], total = 0 }: { data: any[], total: number }) {
    const { resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => setMounted(true), []);

    if (!mounted) {
        return <div className="flex h-[350px] w-full animate-pulse rounded-2xl bg-muted/50" />;
    }

    // Adjust brand color for dark mode in pie chart
    const data = propData.map((item: any) => ({
        ...item,
        color: (item.color === "#006c49" && resolvedTheme === "dark") ? "#6ffbbe" : item.color
    }));

    return (
        <div className="flex h-full w-full flex-col rounded-[1.25rem] border border-[#eef0f2] bg-surface-card p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] dark:border-white/[0.08] dark:bg-[#111]">
            <div className="mb-2">
                <h3 className="font-[family-name:var(--font-display)] text-[16px] font-semibold text-foreground">
                    Expense Breakdown
                </h3>
                <p className="text-[13px] text-muted-foreground">Last 30 Days</p>
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
                                                    {formatCurrency(payload[0].value as number)}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                }
                                return null;
                            }}
                        />
                        <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={70}
                            outerRadius={100}
                            paddingAngle={4}
                            dataKey="value"
                            nameKey="category"
                            stroke="none"
                            cornerRadius={6}
                        >
                            {data.map((entry, index) => (
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

                {/* Center Text overlay */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-8">
                    <span className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">Total</span>
                    <span className="font-[family-name:var(--font-display)] text-2xl font-bold text-foreground">{formatCurrency(total)}</span>
                </div>
            </div>
        </div>
    );
}
