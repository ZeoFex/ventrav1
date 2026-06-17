"use client";

import { useCallback, useEffect, useState } from "react";
import {
    Calendar,
    ChevronRight,
    Gift,
    Loader2,
    Search,
    SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CatalogShop } from "./catalog-admin-types";
import {
    authHeaders,
    formatDate,
    platformPatch,
    subscriptionDaysLeft,
} from "./catalog-admin-utils";
import {
    AccountStatusBadge,
    PlanBadge,
    SubscriptionStatusBadge,
} from "./catalog-status-badge";
import { CatalogShopSubscriptionPanel } from "./catalog-shop-subscription-panel";
import { CatalogBulkShopDelete } from "./catalog-bulk-shop-delete";
import {
    CatalogPagination,
    pageOffset,
    SUBSCRIPTION_PAGE_SIZE,
} from "./catalog-pagination";

export function CatalogSubscriptionsPanel({ token }: { token: string }) {
    const [shops, setShops] = useState<CatalogShop[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [planFilter, setPlanFilter] = useState("");
    const [subFilter, setSubFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [sort, setSort] = useState<"period_end" | "name" | "created">("period_end");
    const [applied, setApplied] = useState({
        search: "",
        planFilter: "",
        subFilter: "",
        statusFilter: "",
        sort: "period_end" as "period_end" | "name" | "created",
    });
    const [selected, setSelected] = useState<CatalogShop | null>(null);
    const [quickBusy, setQuickBusy] = useState<string | null>(null);
    const [selectedShops, setSelectedShops] = useState<Map<string, CatalogShop>>(new Map());

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams({
                limit: String(SUBSCRIPTION_PAGE_SIZE),
                offset: String(pageOffset(page, SUBSCRIPTION_PAGE_SIZE)),
                sort: applied.sort,
                order: applied.sort === "period_end" ? "asc" : "asc",
            });
            if (applied.search.trim()) params.set("q", applied.search.trim());
            if (applied.planFilter) params.set("plan", applied.planFilter);
            if (applied.subFilter) params.set("subscriptionStatus", applied.subFilter);
            if (applied.statusFilter) params.set("status", applied.statusFilter);

            const res = await fetch(
                `/api/platform/master-catalog/shops?${params}`,
                { headers: authHeaders(token) }
            );
            const data = await res.json();
            if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
            setShops(data.items);
            setTotal(data.total);
            const maxPage = Math.max(0, Math.ceil(data.total / SUBSCRIPTION_PAGE_SIZE) - 1);
            if (page > maxPage) setPage(maxPage);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load shops");
        } finally {
            setLoading(false);
        }
    }, [token, applied, page]);

    useEffect(() => {
        void load();
    }, [load]);

    const applyFilters = () => {
        setApplied({
            search,
            planFilter,
            subFilter,
            statusFilter,
            sort,
        });
        setPage(0);
    };

    const toggleShop = (shop: CatalogShop) => {
        setSelectedShops((prev) => {
            const next = new Map(prev);
            if (next.has(shop.id)) next.delete(shop.id);
            else next.set(shop.id, shop);
            return next;
        });
    };

    const allPageSelected =
        shops.length > 0 && shops.every((s) => selectedShops.has(s.id));

    const toggleAllPage = () => {
        setSelectedShops((prev) => {
            const next = new Map(prev);
            if (allPageSelected) {
                for (const s of shops) next.delete(s.id);
            } else {
                for (const s of shops) next.set(s.id, s);
            }
            return next;
        });
    };

    const handleBulkDeleted = (deletedIds: string[]) => {
        setSelectedShops((prev) => {
            const next = new Map(prev);
            for (const id of deletedIds) next.delete(id);
            return next;
        });
        setTotal((n) => Math.max(0, n - deletedIds.length));
        setShops((prev) => prev.filter((s) => !deletedIds.includes(s.id)));
    };

    const quickExtend = async (shop: CatalogShop, days: number) => {
        setQuickBusy(shop.id);
        try {
            await platformPatch(token, `/api/platform/businesses/${shop.id}`, {
                extendSubscriptionDays: days,
            });
            const nextEnd = estimateExtendedEnd(shop.currentPeriodEnd, days);
            const patch = {
                subscriptionStatus: "active" as const,
                currentPeriodEnd: nextEnd,
            };
            setShops((prev) =>
                prev.map((s) => (s.id === shop.id ? { ...s, ...patch } : s))
            );
            if (selected?.id === shop.id) {
                setSelected({ ...selected, ...patch });
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to extend");
        } finally {
            setQuickBusy(null);
        }
    };

    if (selected) {
        return (
            <div className="space-y-4">
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSelected(null)}
                >
                    ← All subscriptions
                </Button>
                <div className="rounded-xl border border-border bg-card p-5">
                    <h2 className="text-xl font-semibold text-foreground">{selected.name}</h2>
                    <p className="text-sm text-muted-foreground">{selected.shopTypeLabel}</p>
                </div>
                <CatalogShopSubscriptionPanel
                    token={token}
                    shop={selected}
                    onUpdated={(patch) => {
                        const next = { ...selected, ...patch };
                        setSelected(next);
                        setShops((prev) =>
                            prev.map((s) => (s.id === next.id ? { ...s, ...patch } : s))
                        );
                    }}
                    onDeleted={() => {
                        setShops((prev) => prev.filter((s) => s.id !== selected.id));
                        setSelectedShops((prev) => {
                            const next = new Map(prev);
                            next.delete(selected.id);
                            return next;
                        });
                        setTotal((n) => Math.max(0, n - 1));
                        setSelected(null);
                    }}
                />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
                    <SlidersHorizontal className="h-4 w-4" />
                    Filter & search subscriptions
                </div>
                <div className="grid gap-3 lg:grid-cols-[1fr_repeat(4,minmax(0,8rem))]">
                    <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && applyFilters()}
                            placeholder="Shop name or email…"
                            className="w-full rounded-lg border border-input bg-background py-2.5 pl-9 pr-3"
                        />
                    </div>
                    <select
                        value={planFilter}
                        onChange={(e) => setPlanFilter(e.target.value)}
                        className="rounded-lg border border-input bg-background px-2 py-2 text-sm"
                    >
                        <option value="">All plans</option>
                        <option value="starter">Starter</option>
                        <option value="growth">Growth</option>
                        <option value="pro">Pro</option>
                    </select>
                    <select
                        value={subFilter}
                        onChange={(e) => setSubFilter(e.target.value)}
                        className="rounded-lg border border-input bg-background px-2 py-2 text-sm"
                    >
                        <option value="">All billing</option>
                        <option value="active">Active</option>
                        <option value="past_due">Past due</option>
                        <option value="canceled">Canceled</option>
                    </select>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="rounded-lg border border-input bg-background px-2 py-2 text-sm"
                    >
                        <option value="">All accounts</option>
                        <option value="active">Active</option>
                        <option value="suspended">Suspended</option>
                        <option value="deactivated">Deactivated</option>
                    </select>
                    <select
                        value={sort}
                        onChange={(e) =>
                            setSort(e.target.value as "period_end" | "name" | "created")
                        }
                        className="rounded-lg border border-input bg-background px-2 py-2 text-sm"
                    >
                        <option value="period_end">Ending soon</option>
                        <option value="name">Name</option>
                        <option value="created">Newest</option>
                    </select>
                </div>
                <Button type="button" className="mt-3" size="sm" onClick={applyFilters}>
                    Apply filters
                </Button>
            </div>

            <CatalogBulkShopDelete
                token={token}
                shops={Array.from(selectedShops.values())}
                selectedIds={new Set(selectedShops.keys())}
                onClearSelection={() => setSelectedShops(new Map())}
                onDeleted={handleBulkDeleted}
            />

            {error ? (
                <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {error}
                </p>
            ) : null}

            {loading ? (
                <div className="flex justify-center gap-2 py-16 text-sm text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Loading…
                </div>
            ) : (
                <>
                    <div className="overflow-hidden rounded-xl border border-border bg-card">
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[52rem] text-left text-sm">
                                <thead className="border-b border-border bg-muted/40 text-muted-foreground">
                                    <tr>
                                        <th className="w-10 px-4 py-3">
                                            <input
                                                type="checkbox"
                                                checked={allPageSelected}
                                                onChange={toggleAllPage}
                                                aria-label="Select all on this page"
                                                className="size-4 rounded border-input"
                                            />
                                        </th>
                                        <th className="px-4 py-3 font-medium">Shop</th>
                                        <th className="px-4 py-3 font-medium">Plan</th>
                                        <th className="px-4 py-3 font-medium">Billing</th>
                                        <th className="px-4 py-3 font-medium">Account</th>
                                        <th className="px-4 py-3 font-medium">Period end</th>
                                        <th className="px-4 py-3 font-medium">Quick grant</th>
                                        <th className="px-4 py-3 font-medium" />
                                    </tr>
                                </thead>
                                <tbody>
                                    {shops.map((shop) => {
                                        const days = subscriptionDaysLeft(shop.currentPeriodEnd);
                                        const checked = selectedShops.has(shop.id);
                                        return (
                                            <tr
                                                key={shop.id}
                                                className={cn(
                                                    "border-b border-border/60 last:border-0 hover:bg-muted/30",
                                                    checked && "bg-primary/5"
                                                )}
                                            >
                                                <td className="px-4 py-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={checked}
                                                        onChange={() => toggleShop(shop)}
                                                        aria-label={`Select ${shop.name}`}
                                                        className="size-4 rounded border-input"
                                                    />
                                                </td>
                                                <td className="px-4 py-3">
                                                    <p className="font-medium text-foreground">
                                                        {shop.name}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {shop.shopTypeLabel}
                                                    </p>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <PlanBadge plan={shop.plan} />
                                                </td>
                                                <td className="px-4 py-3">
                                                    <SubscriptionStatusBadge
                                                        status={shop.subscriptionStatus}
                                                        periodEnd={shop.currentPeriodEnd}
                                                    />
                                                </td>
                                                <td className="px-4 py-3">
                                                    <AccountStatusBadge status={shop.status} />
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-1.5 text-xs">
                                                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                                        <span>{formatDate(shop.currentPeriodEnd)}</span>
                                                    </div>
                                                    {days !== null ? (
                                                        <p
                                                            className={cn(
                                                                "mt-0.5 text-xs tabular-nums",
                                                                days <= 0
                                                                    ? "text-destructive"
                                                                    : days <= 7
                                                                      ? "text-amber-600"
                                                                      : "text-muted-foreground"
                                                            )}
                                                        >
                                                            {days <= 0
                                                                ? `${Math.abs(days)}d overdue`
                                                                : `${days}d left`}
                                                        </p>
                                                    ) : null}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex gap-1">
                                                        {[7, 30].map((d) => (
                                                            <Button
                                                                key={d}
                                                                type="button"
                                                                variant="outline"
                                                                size="sm"
                                                                className="h-7 px-2 text-xs"
                                                                disabled={quickBusy === shop.id}
                                                                onClick={() => void quickExtend(shop, d)}
                                                            >
                                                                <Gift className="mr-1 h-3 w-3" />
                                                                +{d}d
                                                            </Button>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => setSelected(shop)}
                                                    >
                                                        Manage
                                                        <ChevronRight className="ml-1 h-4 w-4" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        {shops.length === 0 ? (
                            <p className="px-6 py-12 text-center text-sm text-muted-foreground">
                                No shops match your filters.
                            </p>
                        ) : null}
                    </div>

                    <CatalogPagination
                        total={total}
                        page={page}
                        pageSize={SUBSCRIPTION_PAGE_SIZE}
                        onPageChange={setPage}
                        disabled={loading}
                    />
                </>
            )}
        </div>
    );
}

function estimateExtendedEnd(current: string | null, days: number): string {
    const now = Date.now();
    const existing = current ? new Date(current).getTime() : now;
    const base = existing > now ? existing : now;
    return new Date(base + days * 24 * 60 * 60 * 1000).toISOString();
}
