"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronRight, ClipboardList, Loader2, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { authHeaders, formatWhen, readResponseJson } from "./catalog-admin-utils";
import { CatalogActivityDetailPanel } from "./catalog-activity-detail-panel";
import {
    CatalogPagination,
    pageOffset,
    PRODUCT_PAGE_SIZE,
} from "./catalog-pagination";
import type { CatalogShop } from "./catalog-admin-types";

type ActivityRow = {
    id: string;
    source: "platform" | "shop";
    action: string;
    actionLabel: string;
    resource: string;
    resourceLabel: string;
    shopId: string | null;
    shopName: string | null;
    actorName: string | null;
    actorEmail: string | null;
    detail: string | null;
    createdAt: string;
};

type SourceFilter = "all" | "shops" | "platform";

export function CatalogActivityPanel({ token }: { token: string }) {
    const [items, setItems] = useState<ActivityRow[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(0);
    const [searchInput, setSearchInput] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [source, setSource] = useState<SourceFilter>("all");
    const [shopId, setShopId] = useState("");
    const [shops, setShops] = useState<Pick<CatalogShop, "id" | "name">[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedId, setSelectedId] = useState<string | null>(null);

    useEffect(() => {
        const id = window.setTimeout(() => {
            setSearchQuery(searchInput.trim());
            setPage(0);
        }, 250);
        return () => window.clearTimeout(id);
    }, [searchInput]);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch(
                    "/api/platform/master-catalog/shops?limit=200&sort=name",
                    { headers: authHeaders(token) },
                );
                const data = await res.json();
                if (!cancelled && res.ok && Array.isArray(data.items)) {
                    setShops(data.items.map((s: CatalogShop) => ({ id: s.id, name: s.name })));
                }
            } catch {
                /* keep empty shop filter */
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [token]);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams({
                limit: String(PRODUCT_PAGE_SIZE),
                offset: String(pageOffset(page, PRODUCT_PAGE_SIZE)),
                source,
            });
            if (searchQuery) params.set("q", searchQuery);
            if (shopId) params.set("businessId", shopId);
            const res = await fetch(`/api/platform/activity-logs?${params}`, {
                headers: authHeaders(token),
                cache: "no-store",
            });
            const data = await readResponseJson<{
                items?: ActivityRow[];
                total?: number;
                error?: string;
            }>(res);
            if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
            setItems(Array.isArray(data.items) ? data.items : []);
            setTotal(Number(data.total ?? 0));
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load activity");
        } finally {
            setLoading(false);
        }
    }, [token, page, searchQuery, source, shopId]);

    useEffect(() => {
        void load();
    }, [load]);

    useEffect(() => {
        setSelectedId(null);
    }, [page, searchQuery, source, shopId]);

    const selected = items.find((row) => row.id === selectedId) ?? null;

    return (
        <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Platform activity
                </p>
                <h3 className="mt-0.5 text-lg font-semibold text-foreground">
                    All shops &amp; admin actions
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                    Live trail from every shop — each sale and walk-in, saved customers and
                    payments, plus important staff actions (products, stock, expenses, returns,
                    settings). Click a row for full details.
                </p>
                <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-end">
                    <div className="relative min-w-0 flex-1">
                        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            placeholder="Search shop, invoice, customer, staff…"
                            className="w-full rounded-lg border border-input bg-background py-2.5 pl-9 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        />
                    </div>
                    <select
                        value={shopId}
                        onChange={(e) => {
                            setShopId(e.target.value);
                            setPage(0);
                        }}
                        className="rounded-lg border border-input bg-background px-3 py-2.5 text-sm lg:w-64"
                    >
                        <option value="">All shops</option>
                        {shops.map((s) => (
                            <option key={s.id} value={s.id}>
                                {s.name}
                            </option>
                        ))}
                    </select>
                    <div className="flex rounded-lg border border-border bg-muted/40 p-1">
                        {(
                            [
                                ["all", "All"],
                                ["shops", "Shops"],
                                ["platform", "Admin"],
                            ] as const
                        ).map(([id, label]) => (
                            <button
                                key={id}
                                type="button"
                                onClick={() => {
                                    setSource(id);
                                    setPage(0);
                                }}
                                className={cn(
                                    "rounded-md px-3 py-1.5 text-xs font-semibold",
                                    source === id
                                        ? "bg-background text-foreground shadow-sm"
                                        : "text-muted-foreground hover:text-foreground",
                                )}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {error ? (
                <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {error}
                </p>
            ) : null}

            {selectedId ? (
                <CatalogActivityDetailPanel
                    token={token}
                    entryId={selectedId}
                    fallback={
                        selected
                            ? {
                                  actionLabel: selected.actionLabel,
                                  resourceLabel: selected.resourceLabel,
                                  detail: selected.detail,
                                  shopName: selected.shopName,
                                  actorName: selected.actorName,
                                  actorEmail: selected.actorEmail,
                                  createdAt: selected.createdAt,
                                  source: selected.source,
                              }
                            : null
                    }
                    onClose={() => setSelectedId(null)}
                />
            ) : null}

            {loading ? (
                <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card py-16 text-sm text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Loading activity…
                </div>
            ) : items.length === 0 ? (
                <div className="rounded-xl border border-border bg-card px-6 py-12 text-center text-sm text-muted-foreground">
                    <ClipboardList className="mx-auto mb-2 h-8 w-8 opacity-40" />
                    No activity matches these filters.
                </div>
            ) : (
                <>
                    <div className="overflow-hidden rounded-xl border border-border bg-card">
                        <div className="hidden grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_auto_1.25rem] gap-3 border-b border-border bg-muted/40 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground sm:grid">
                            <span>Action</span>
                            <span>Shop</span>
                            <span>By</span>
                            <span className="text-right">When</span>
                            <span />
                        </div>
                        <ul className="divide-y divide-border">
                            {items.map((row) => {
                                const isOpen = selectedId === row.id;
                                return (
                                    <li key={row.id}>
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setSelectedId(isOpen ? null : row.id)
                                            }
                                            className={cn(
                                                "grid w-full gap-1 px-4 py-3 text-left transition sm:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_auto_1.25rem] sm:items-center sm:gap-3",
                                                isOpen
                                                    ? "bg-primary/5"
                                                    : "hover:bg-muted/40",
                                            )}
                                        >
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <p className="truncate font-medium text-foreground">
                                                        {row.actionLabel}
                                                    </p>
                                                    <span
                                                        className={cn(
                                                            "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                                                            row.source === "platform"
                                                                ? "bg-primary/10 text-foreground"
                                                                : "bg-muted text-muted-foreground",
                                                        )}
                                                    >
                                                        {row.source === "platform"
                                                            ? "Admin"
                                                            : "Shop"}
                                                    </span>
                                                </div>
                                                <p className="truncate text-xs text-muted-foreground">
                                                    {row.resourceLabel}
                                                    {row.detail ? ` · ${row.detail}` : ""}
                                                </p>
                                            </div>
                                            <p className="truncate text-sm text-foreground">
                                                {row.shopName || "—"}
                                            </p>
                                            <div className="min-w-0">
                                                <p className="truncate text-sm text-foreground">
                                                    {row.actorName || "—"}
                                                </p>
                                                {row.actorEmail ? (
                                                    <p className="truncate text-xs text-muted-foreground">
                                                        {row.actorEmail}
                                                    </p>
                                                ) : null}
                                            </div>
                                            <time className="text-xs text-muted-foreground sm:text-right">
                                                {formatWhen(row.createdAt)}
                                            </time>
                                            <ChevronRight
                                                className={cn(
                                                    "hidden size-4 justify-self-end text-muted-foreground sm:block",
                                                    isOpen && "text-foreground",
                                                )}
                                            />
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                    <CatalogPagination
                        total={total}
                        page={page}
                        pageSize={PRODUCT_PAGE_SIZE}
                        onPageChange={setPage}
                        disabled={loading}
                    />
                </>
            )}
        </div>
    );
}
