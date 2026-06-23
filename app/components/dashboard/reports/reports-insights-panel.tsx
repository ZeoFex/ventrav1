"use client";

import { Lightbulb, TrendingDown, TrendingUp, AlertTriangle } from "lucide-react";

export type ReportInsight = {
    type: "positive" | "neutral" | "warning";
    title: string;
    detail: string;
};

const ICONS = {
    positive: TrendingUp,
    neutral: Lightbulb,
    warning: AlertTriangle,
} as const;

const STYLES = {
    positive: "border-[#006c49]/20 bg-[#006c49]/05 dark:border-[#6ffbbe]/20 dark:bg-[#6ffbbe]/05",
    neutral: "border-[#eef0f2] bg-white dark:border-white/[0.08] dark:bg-[#111]",
    warning: "border-amber-500/25 bg-amber-500/05",
} as const;

const ICON_STYLES = {
    positive: "text-[#006c49] dark:text-[#6ffbbe]",
    neutral: "text-muted-foreground",
    warning: "text-amber-600",
} as const;

export function ReportsInsightsPanel({
    insights,
    title = "Key insights",
}: {
    insights: ReportInsight[];
    title?: string;
}) {
    if (!insights.length) return null;

    return (
        <div className="rounded-[1.25rem] border border-[#eef0f2] bg-surface-card p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] dark:border-white/[0.08] dark:bg-[#111]">
            <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                    <h3 className="font-[family-name:var(--font-display)] text-[16px] font-semibold text-foreground">
                        {title}
                    </h3>
                    <p className="text-[13px] text-muted-foreground">
                        Auto-generated from your live business data
                    </p>
                </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {insights.map((insight, i) => {
                    const Icon = ICONS[insight.type];
                    return (
                        <div
                            key={`${insight.title}-${i}`}
                            className={`flex gap-3 rounded-xl border p-4 ${STYLES[insight.type]}`}
                        >
                            <div className={`mt-0.5 shrink-0 ${ICON_STYLES[insight.type]}`}>
                                <Icon className="size-4" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[13px] font-semibold text-foreground">{insight.title}</p>
                                <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
                                    {insight.detail}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export function TrendBadge({ value, suffix = "vs prior period" }: { value?: number; suffix?: string }) {
    if (value === undefined || value === 0) return null;
    const isUp = value > 0;
    const Icon = isUp ? TrendingUp : TrendingDown;
    return (
        <div
            className={`flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                isUp
                    ? "bg-[#006c49]/10 text-[#006c49] dark:bg-[#6ffbbe]/10 dark:text-[#6ffbbe]"
                    : "bg-red-500/10 text-red-600 dark:text-red-400"
            }`}
            title={suffix}
        >
            <Icon className="size-3" strokeWidth={3} />
            {isUp ? "+" : ""}
            {value.toFixed(1)}%
        </div>
    );
}
