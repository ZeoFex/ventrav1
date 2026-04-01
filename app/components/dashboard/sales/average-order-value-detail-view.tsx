"use client";

import { SalesDetailLayout } from "./sales-detail-layout";
import { ShoppingCart, TrendingUp, Info, Loader2 } from "lucide-react";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function AverageOrderValueDetailView() {
    const { data: aovData, isLoading } = useSWR("/api/sales/average-order-value", fetcher);

    if (isLoading) {
        return (
            <SalesDetailLayout title="Average Order Value (AOV)" description="The average amount spent each time a customer places an order.">
                <div className="flex h-64 items-center justify-center">
                    <Loader2 className="size-8 animate-spin text-muted-foreground" />
                </div>
            </SalesDetailLayout>
        );
    }

    const currentAov = aovData?.currentAov ?? 0;
    const categoryAovs = aovData?.byCategory ?? [];

    return (
        <SalesDetailLayout
            title="Average Order Value (AOV)"
            description="The average amount spent each time a customer places an order."
        >
            <div className="grid gap-6">
                <div className="rounded-2xl border border-[#eef0f2] bg-white p-6 dark:border-white/[0.08] dark:bg-[#111]">
                    <div className="flex items-center gap-4">
                        <div className="flex size-14 items-center justify-center rounded-2xl bg-[#006c49]/10 text-[#006c49] dark:bg-[#6ffbbe]/10 dark:text-[#6ffbbe]">
                            <ShoppingCart className="size-7" />
                        </div>
                        <div>
                            <p className="text-[13px] font-bold uppercase tracking-wider text-muted-foreground">Current Average</p>
                            <h2 className="font-[family-name:var(--font-display)] text-4xl font-bold text-foreground">
                                GH₵ {currentAov.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </h2>
                        </div>
                    </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                    <div className="rounded-2xl border border-[#eef0f2] bg-white p-6 dark:border-white/[0.08] dark:bg-[#111]">
                        <h3 className="mb-4 font-semibold text-foreground">AOV by Category</h3>
                        <div className="space-y-4">
                            {categoryAovs.length > 0 ? (
                                categoryAovs.map((row: any, idx: number) => (
                                    <AovRow key={idx} label={row.label} value={`GH₵ ${row.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
                                ))
                            ) : (
                                <p className="text-[14px] text-muted-foreground py-4 text-center">No sales data found yet.</p>
                            )}
                        </div>
                    </div>
                    <div className="rounded-2xl border border-[#eef0f2] bg-white p-6 dark:border-white/[0.08] dark:bg-[#111]">
                        <div className="flex items-start gap-3 rounded-xl bg-blue-500/05 p-4">
                            <Info className="mt-0.5 size-4 text-blue-600" />
                            <div className="text-[13px] text-foreground">
                                <p className="font-semibold text-blue-900 dark:text-blue-300">How to increase AOV</p>
                                <p className="mt-1 text-muted-foreground">Consider bundling related items or offering free delivery for orders above GH₵ 200 to push this metric higher.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </SalesDetailLayout>
    );
}

function AovRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between border-b border-[#f0f2f4] py-3 last:border-0 dark:border-white/[0.04]">
            <span className="text-[14px] text-muted-foreground">{label}</span>
            <span className="font-[family-name:var(--font-display)] font-bold text-foreground">{value}</span>
        </div>
    )
}
