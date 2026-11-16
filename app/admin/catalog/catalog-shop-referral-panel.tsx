"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Save, Store, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CatalogShop } from "./catalog-admin-types";
import { authHeaders, platformPatch } from "./catalog-admin-utils";

type ReferrerShop = {
    id: string;
    name: string;
    region: string | null;
    city: string | null;
};

type Referrer = {
    name: string;
    shopCount: number;
    shops: ReferrerShop[];
};

type Props = {
    token: string;
    shop: CatalogShop;
    onUpdated: (patch: Partial<CatalogShop>) => void;
};

export function CatalogShopReferralPanel({ token, shop, onUpdated }: Props) {
    const [name, setName] = useState(shop.broughtByName ?? "");
    const [people, setPeople] = useState<Referrer[]>([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    useEffect(() => {
        setName(shop.broughtByName ?? "");
        setSuccess(null);
        setError(null);
    }, [shop.id, shop.broughtByName]);

    const loadPeople = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/platform/referrers", {
                headers: authHeaders(token),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error ?? "Could not load referrers");
            setPeople((data.people ?? []) as Referrer[]);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not load referrers");
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        void loadPeople();
    }, [loadPeople]);

    const savedName = (shop.broughtByName ?? "").trim();
    const match = people.find((person) => person.name.toLowerCase() === savedName.toLowerCase());
    const dirty = name.trim() !== savedName;

    const save = async () => {
        setBusy(true);
        setError(null);
        setSuccess(null);
        try {
            const next = name.trim();
            await platformPatch(token, `/api/platform/businesses/${shop.id}`, {
                broughtByName: next,
            });
            onUpdated({ broughtByName: next || null });
            setSuccess(
                next
                    ? `${next} is now tied to this shop and listed on the Referrers page.`
                    : "Referral name cleared for this shop.",
            );
            await loadPeople();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not save");
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-5">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Referral
                </p>
                <h3 className="mt-1 text-lg font-semibold text-foreground">
                    Who brought this shop
                </h3>

                <label className="mt-4 grid gap-1.5 text-sm">
                    <span className="font-medium text-foreground">Person&apos;s name</span>
                    <input
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        maxLength={120}
                        placeholder="Name of the person who brought this shop"
                        className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                </label>

                {error ? (
                    <p className="mt-3 text-sm text-red-700 dark:text-red-300">{error}</p>
                ) : null}
                {success ? (
                    <p className="mt-3 text-sm text-[#006c49] dark:text-[#6ffbbe]">{success}</p>
                ) : null}

                <div className="mt-4 flex flex-wrap items-center gap-2">
                    <Button type="button" disabled={busy || !dirty} onClick={() => void save()}>
                        {busy ? (
                            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                        ) : (
                            <Save className="mr-1.5 h-4 w-4" />
                        )}
                        Save referral
                    </Button>
                    {dirty ? (
                        <Button
                            type="button"
                            variant="outline"
                            disabled={busy}
                            onClick={() => setName(savedName)}
                        >
                            Reset
                        </Button>
                    ) : null}
                </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    On the Referrers page
                </p>
                {loading ? (
                    <p className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Checking this name…
                    </p>
                ) : !savedName ? (
                    <p className="mt-3 text-sm text-muted-foreground">
                        No one is recorded for this shop yet. Add a name above and it will show on Referrers.
                    </p>
                ) : (
                    <div className="mt-3">
                        <div className="flex items-center gap-3">
                            <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#006c49]/10 text-[#006c49] dark:bg-[#6ffbbe]/15 dark:text-[#6ffbbe]">
                                <UserPlus className="h-5 w-5" />
                            </span>
                            <div>
                                <p className="font-semibold text-foreground">{match?.name ?? savedName}</p>
                                <p className="text-sm text-muted-foreground">
                                    {(match?.shopCount ?? 1).toLocaleString()}{" "}
                                    {(match?.shopCount ?? 1) === 1 ? "shop" : "shops"}
                                </p>
                            </div>
                        </div>
                        <ul className="mt-4 divide-y divide-border">
                            {(match?.shops ?? [{ id: shop.id, name: shop.name, city: shop.city, region: shop.region }]).map(
                                (item) => (
                                    <li key={item.id} className="flex items-center gap-2 py-2.5 text-sm">
                                        <Store className="h-4 w-4 shrink-0 text-muted-foreground" />
                                        <span className="min-w-0 flex-1 truncate font-medium text-foreground">
                                            {item.name}
                                        </span>
                                        <span className="truncate text-muted-foreground">
                                            {[item.city, item.region].filter(Boolean).join(", ")}
                                        </span>
                                        {item.id === shop.id ? (
                                            <span className="shrink-0 rounded-full bg-[#006c49]/10 px-2 py-0.5 text-[11px] font-semibold text-[#006c49] dark:bg-[#6ffbbe]/15 dark:text-[#6ffbbe]">
                                                This shop
                                            </span>
                                        ) : null}
                                    </li>
                                ),
                            )}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
}
