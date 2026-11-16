"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Loader2, Search, Store, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { authHeaders } from "./catalog-admin-utils";

type ReferrerShop = {
    id: string;
    name: string;
    region: string | null;
    city: string | null;
    plan: "starter" | "growth" | "pro";
};

type Referrer = {
    name: string;
    shopCount: number;
    shops: ReferrerShop[];
};

type Props = {
    token: string;
    onOpenShop: (businessId: string) => void;
};

function initials(name: string): string {
    const parts = name.trim().split(/\s+/).slice(0, 2);
    return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "?";
}

function placeLabel(shop: ReferrerShop): string {
    return [shop.city, shop.region].filter(Boolean).join(", ");
}

export function CatalogReferrersPanel({ token, onOpenShop }: Props) {
    const [people, setPeople] = useState<Referrer[]>([]);
    const [shopCount, setShopCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [query, setQuery] = useState("");
    const [openName, setOpenName] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await fetch("/api/platform/referrers", {
                    headers: authHeaders(token),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error ?? "Could not load referrers");
                if (cancelled) return;
                const next = (data.people ?? []) as Referrer[];
                setPeople(next);
                setShopCount(Number(data.shopCount ?? 0));
                setOpenName(next[0]?.name ?? null);
            } catch (err) {
                if (!cancelled) {
                    setError(err instanceof Error ? err.message : "Could not load referrers");
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        void load();
        return () => {
            cancelled = true;
        };
    }, [token]);

    const filtered = useMemo(() => {
        const term = query.trim().toLowerCase();
        if (!term) return people;
        return people.filter((person) => {
            if (person.name.toLowerCase().includes(term)) return true;
            return person.shops.some((shop) =>
                `${shop.name} ${shop.city ?? ""} ${shop.region ?? ""}`
                    .toLowerCase()
                    .includes(term),
            );
        });
    }, [people, query]);

    if (loading) {
        return (
            <div className="flex items-center justify-center gap-2 rounded-2xl border border-[#bfc9c3]/20 bg-surface-card py-16 text-sm text-muted-foreground dark:border-white/[0.08] dark:bg-[#141414]">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading referrers…
            </div>
        );
    }

    if (error) {
        return (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/5 px-4 py-6 text-sm text-red-700 dark:text-red-300">
                {error}
            </div>
        );
    }

    return (
        <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-[#bfc9c3]/20 bg-surface-card p-5 dark:border-white/[0.08] dark:bg-[#141414]">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        People bringing shops
                    </p>
                    <p className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold text-[#006c49] dark:text-[#6ffbbe]">
                        {people.length}
                    </p>
                </div>
                <div className="rounded-2xl border border-[#bfc9c3]/20 bg-surface-card p-5 dark:border-white/[0.08] dark:bg-[#141414]">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Shops they brought
                    </p>
                    <p className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold text-foreground">
                        {shopCount}
                    </p>
                </div>
            </div>

            <label className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search a person or a shop"
                    className="w-full rounded-xl border border-input bg-background py-2.5 pl-9 pr-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
            </label>

            {filtered.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#bfc9c3]/40 bg-surface-card px-6 py-14 text-center dark:border-white/10 dark:bg-[#141414]">
                    <UserPlus className="mx-auto h-8 w-8 text-[#006c49] dark:text-[#6ffbbe]" />
                    <p className="mt-3 text-sm font-medium text-foreground">
                        {people.length === 0
                            ? "No referrers yet"
                            : "No one matches that search"}
                    </p>
                    <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                        Open a shop and use the Referral tab, or add the name when you create the shop. That same name is listed here.
                    </p>
                </div>
            ) : (
                <ul className="grid gap-3 lg:grid-cols-2">
                    {filtered.map((person) => {
                        const open = openName === person.name;
                        return (
                            <li
                                key={person.name}
                                className="overflow-hidden rounded-2xl border border-[#bfc9c3]/20 bg-surface-card dark:border-white/[0.08] dark:bg-[#141414]"
                            >
                                <button
                                    type="button"
                                    onClick={() => setOpenName(open ? null : person.name)}
                                    className="flex w-full items-center gap-3 px-4 py-4 text-left"
                                >
                                    <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#006c49]/10 text-sm font-semibold text-[#006c49] dark:bg-[#6ffbbe]/15 dark:text-[#6ffbbe]">
                                        {initials(person.name)}
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate text-base font-semibold text-foreground">
                                            {person.name}
                                        </span>
                                        <span className="mt-0.5 block text-sm text-muted-foreground">
                                            {person.shopCount}{" "}
                                            {person.shopCount === 1 ? "shop" : "shops"}
                                        </span>
                                    </span>
                                    <span className="rounded-full bg-[#006c49] px-2.5 py-1 text-xs font-semibold text-white dark:bg-[#6ffbbe] dark:text-[#003527]">
                                        {person.shopCount}
                                    </span>
                                    <ChevronDown
                                        className={cn(
                                            "h-4 w-4 text-muted-foreground transition",
                                            open && "rotate-180",
                                        )}
                                    />
                                </button>
                                {open ? (
                                    <ol className="space-y-2 border-t border-[#bfc9c3]/20 px-4 py-3 dark:border-white/[0.08]">
                                        {person.shops.map((shop, index) => (
                                            <li key={shop.id}>
                                                <button
                                                    type="button"
                                                    onClick={() => onOpenShop(shop.id)}
                                                    className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-[#006c49]/5 dark:hover:bg-[#6ffbbe]/10"
                                                >
                                                    <span className="w-6 shrink-0 text-sm font-semibold tabular-nums text-muted-foreground">
                                                        {index + 1}
                                                    </span>
                                                    <Store className="h-4 w-4 shrink-0 text-[#006c49] dark:text-[#6ffbbe]" />
                                                    <span className="min-w-0 flex-1">
                                                        <span className="block truncate text-sm font-medium text-foreground">
                                                            {shop.name}
                                                        </span>
                                                        <span className="block truncate text-xs text-muted-foreground">
                                                            {placeLabel(shop) || "Location not set"}
                                                        </span>
                                                    </span>
                                                    <span className="shrink-0 rounded-md bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                                                        {shop.plan}
                                                    </span>
                                                </button>
                                            </li>
                                        ))}
                                    </ol>
                                ) : null}
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
