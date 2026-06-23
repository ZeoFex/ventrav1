"use client";

import useSWR from "swr";
import { useSearchParams } from "next/navigation";
import { SalesDetailLayout } from "./sales-detail-layout";
import { SalesFluidChart } from "./sales-fluid-chart";
import { SalesOverviewDateProvider } from "./sales-overview-date-context";
import { TrendingUp, Wallet, Loader2 } from "lucide-react";
import { useBranchContext } from "../branch-context";

const fetcher = (url: string) => fetch(url).then(r => r.json());

function formatGhs(n: number): string {
    return new Intl.NumberFormat("en-GH", {
        style: "currency",
        currency: "GHS",
        maximumFractionDigits: 0,
    }).format(n);
}

export function RevenueDetailView() {
    const searchParams = useSearchParams();
    const period = searchParams.get("period") || "7";
    const { branchId } = useBranchContext();

    const { data, isLoading } = useSWR(`/api/sales/revenue?period=${period}&b=${branchId}`, fetcher);

    if (isLoading) {
        return (
            <SalesDetailLayout
                title="Total Revenue"
                description="Detailed analysis of your gross intake before expenses and taxes."
            >
                <div className="flex w-full h-[400px] items-center justify-center">
                    <Loader2 className="size-8 animate-spin text-muted-foreground" />
                </div>
            </SalesDetailLayout>
        );
    }

    if (!data) return null;

    const expected = Number(data.expectedToday) || 0;
    const collected = Number(data.collectedToday) || 0;
    const receivables = Number(data.receivables) || 0;
    const channels = data.channels || [];
    const insights = data.insights || {};

    return (
        <SalesDetailLayout
            title="Total Revenue"
            description="Detailed analysis of your gross intake before expenses and taxes."
        >
            <div className="grid gap-6">
                {/* TOP STATS */}
                <div className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded-2xl border border-[#eef0f2] bg-white p-5 dark:border-white/[0.08] dark:bg-[#111]">
                        <p className="text-[13px] font-medium text-muted-foreground uppercase tracking-wide">Expected Today</p>
                        <h3 className="mt-2 font-[family-name:var(--font-display)] text-2xl font-bold text-foreground">{formatGhs(expected)}</h3>
                    </div>
                    <div className="rounded-2xl border border-[#eef0f2] bg-white p-5 dark:border-white/[0.08] dark:bg-[#111]">
                        <p className="text-[13px] font-medium text-muted-foreground uppercase tracking-wide">Collected</p>
                        <h3 className="mt-2 font-[family-name:var(--font-display)] text-2xl font-bold text-[#006c49] dark:text-[#6ffbbe]">{formatGhs(collected)}</h3>
                    </div>
                    <div className="rounded-2xl border border-[#eef0f2] bg-white p-5 dark:border-white/[0.08] dark:bg-[#111]">
                        <p className="text-[13px] font-medium text-muted-foreground uppercase tracking-wide">Receivables</p>
                        <h3 className="mt-2 font-[family-name:var(--font-display)] text-2xl font-bold text-amber-600">{formatGhs(receivables)}</h3>
                    </div>
                </div>

                {/* CHART SECTION */}
                <div className="rounded-2xl border border-[#eef0f2] bg-white p-6 dark:border-white/[0.08] dark:bg-[#111]">
                    <div className="mb-6 flex items-center justify-between">
                        <h3 className="font-semibold text-foreground">Revenue Trend</h3>
                    </div>
                    <div className="h-[400px]">
                        <SalesOverviewDateProvider branchId={branchId}>
                            <SalesFluidChart />
                        </SalesOverviewDateProvider>
                    </div>
                </div>

                {/* SOURCE BREAKDOWN */}
                <div className="grid gap-6 lg:grid-cols-2">
                    <div className="rounded-2xl border border-[#eef0f2] bg-white p-6 dark:border-white/[0.08] dark:bg-[#111]">
                        <h3 className="mb-4 font-semibold text-foreground">Revenue by Channel (All Time)</h3>
                        <div className="space-y-4">
                            {channels.length === 0 ? (
                                <p className="text-[13px] text-muted-foreground">No revenue channels logged yet.</p>
                            ) : (
                                channels.map((ch: any) => (
                                    <ChannelProgress
                                        key={ch.label}
                                        label={ch.label}
                                        value={formatGhs(ch.value)}
                                        percent={ch.percent}
                                    />
                                ))
                            )}
                        </div>
                    </div>
                    <div className="rounded-2xl border border-[#eef0f2] bg-white p-6 dark:border-white/[0.08] dark:bg-[#111]">
                        <h3 className="mb-4 font-semibold text-foreground">Quick Insights</h3>
                        <div className="space-y-3">
                            <div className="flex items-center gap-3 rounded-xl bg-[#006c49]/04 p-3 dark:bg-[#6ffbbe]/05">
                                <TrendingUp className={`size-4 ${insights.growthPercent >= 0 ? "text-[#006c49] dark:text-[#6ffbbe]" : "text-red-500"}`} />
                                <p className="text-[13px] text-foreground">{insights.trendText}</p>
                            </div>
                            <div className="flex items-center gap-3 rounded-xl bg-blue-500/05 p-3">
                                <Wallet className="size-4 text-blue-600" />
                                <p className="text-[13px] text-foreground">Mobile Money accounts for {insights.momoDominance}% of all recorded revenue.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </SalesDetailLayout>
    );
}

function ChannelProgress({ label, value, percent }: { label: string; value: string; percent: number }) {
    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between text-[13px]">
                <span className="font-medium text-foreground">{label}</span>
                <span className="font-semibold text-foreground">{value}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted/30">
                <div className="h-full bg-[#006c49] dark:bg-[#6ffbbe]" style={{ width: `${percent}%` }} />
            </div>
        </div>
    )
}
