"use client";

import { useCallback, useEffect, useState } from "react";
import {
    Building2,
    CreditCard,
    Loader2,
    Package,
    ShoppingCart,
    Store,
    Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { authHeaders, formatWhen } from "./catalog-admin-utils";

type OverviewData = {
    generatedAt: string;
    counts: Record<string, number>;
    billing: {
        businessesTotal: number;
        plans: Record<string, number>;
        subscriptionStatus: Record<string, number>;
        businessStatus: Record<string, number>;
    };
};

type StatCardProps = {
    label: string;
    value: number | string;
    icon: React.ComponentType<{ className?: string }>;
    hint?: string;
    accent?: "default" | "success" | "warning" | "danger";
};

function OverviewStatCard({ label, value, icon: Icon, hint, accent = "default" }: StatCardProps) {
    const accentClass = {
        default: "bg-muted text-foreground",
        success: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
        warning: "bg-amber-500/15 text-amber-800 dark:text-amber-300",
        danger: "bg-destructive/15 text-destructive",
    }[accent];

    return (
        <div className="rounded-xl border border-border bg-card p-5 transition hover:shadow-sm">
            <div className="flex items-start justify-between gap-3">
                <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", accentClass)}>
                    <Icon className="h-5 w-5" aria-hidden />
                </div>
            </div>
            <p className="mt-4 text-2xl font-semibold tabular-nums text-foreground">{value}</p>
            <p className="mt-0.5 text-sm font-medium text-foreground">{label}</p>
            {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
        </div>
    );
}

function BreakdownBar({
    title,
    items,
    colors,
}: {
    title: string;
    items: Record<string, number>;
    colors: Record<string, string>;
}) {
    const total = Object.values(items).reduce((a, b) => a + b, 0);
    if (total === 0) return null;

    return (
        <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="font-semibold text-foreground">{title}</h3>
            <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-muted">
                {Object.entries(items).map(([key, n]) =>
                    n > 0 ? (
                        <div
                            key={key}
                            className={cn("h-full", colors[key] ?? "bg-primary")}
                            style={{ width: `${(n / total) * 100}%` }}
                            title={`${key}: ${n}`}
                        />
                    ) : null
                )}
            </div>
            <ul className="mt-4 space-y-2">
                {Object.entries(items).map(([key, n]) => (
                    <li key={key} className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 capitalize text-muted-foreground">
                            <span
                                className={cn(
                                    "h-2.5 w-2.5 rounded-full",
                                    colors[key] ?? "bg-primary"
                                )}
                            />
                            {key.replace(/_/g, " ")}
                        </span>
                        <span className="font-medium tabular-nums text-foreground">{n}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

export function CatalogOverviewPanel({ token }: { token: string }) {
    const [data, setData] = useState<OverviewData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch("/api/platform/overview", {
                headers: authHeaders(token),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
            setData(json as OverviewData);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load overview");
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        void load();
    }, [load]);

    if (loading) {
        return (
            <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card py-20 text-sm text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading platform overview…
            </div>
        );
    }

    if (error || !data) {
        return (
            <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error ?? "No data"}
            </p>
        );
    }

    const c = data.counts;
    const pastDue = data.billing.subscriptionStatus.past_due ?? 0;
    const suspended = data.billing.businessStatus.suspended ?? 0;

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <h2 className="text-lg font-semibold text-foreground">Platform overview</h2>
                    <p className="text-sm text-muted-foreground">
                        Live snapshot across all VentraPOS shops · updated {formatWhen(data.generatedAt)}
                    </p>
                </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <OverviewStatCard
                    label="Registered shops"
                    value={c.businesses ?? 0}
                    icon={Store}
                />
                <OverviewStatCard
                    label="Total products"
                    value={c.products ?? 0}
                    icon={Package}
                    hint={`${c.categories ?? 0} categories platform-wide`}
                />
                <OverviewStatCard
                    label="Completed sales"
                    value={c.sales ?? 0}
                    icon={ShoppingCart}
                />
                <OverviewStatCard
                    label="Team members"
                    value={c.users ?? 0}
                    icon={Users}
                    hint={`${c.branches ?? 0} branches`}
                />
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <OverviewStatCard
                    label="Past due billing"
                    value={pastDue}
                    icon={CreditCard}
                    accent={pastDue > 0 ? "danger" : "success"}
                    hint="Shops needing payment attention"
                />
                <OverviewStatCard
                    label="Suspended accounts"
                    value={suspended}
                    icon={Building2}
                    accent={suspended > 0 ? "warning" : "default"}
                />
                <OverviewStatCard
                    label="Active promotions"
                    value={c.discounts ?? 0}
                    icon={Package}
                    hint="POS discount rules across tenants"
                />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                <BreakdownBar
                    title="Plans distribution"
                    items={data.billing.plans}
                    colors={{
                        starter: "bg-slate-400",
                        growth: "bg-sky-500",
                        pro: "bg-primary",
                    }}
                />
                <BreakdownBar
                    title="Subscription health"
                    items={data.billing.subscriptionStatus}
                    colors={{
                        active: "bg-emerald-500",
                        past_due: "bg-destructive",
                        canceled: "bg-muted-foreground",
                    }}
                />
            </div>
        </div>
    );
}
