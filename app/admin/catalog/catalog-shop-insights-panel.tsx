"use client";

import { useCallback, useEffect, useState } from "react";
import {
    Activity,
    Building2,
    Loader2,
    MapPin,
    Percent,
    Plus,
    Users,
} from "lucide-react";
import { BRANCH_ADDON_PRICE_MONTHLY_GHS } from "@/config/plans";
import { BUSINESS_TYPES } from "@/config/business-types";
import { cn } from "@/lib/utils";
import type { CatalogShop } from "./catalog-admin-types";
import { authHeaders, formatWhen } from "./catalog-admin-utils";

type Branch = {
    id: string;
    name: string;
    code: string | null;
    region: string | null;
    status: string;
    isMain: boolean;
    businessType?: string | null;
};

type Discount = {
    id: string;
    name: string;
    type: string;
    value: string;
    isActive: boolean;
    startDate: string | null;
    endDate: string | null;
};

type AuditLog = {
    id: string;
    action: string;
    resource: string;
    createdAt: string;
};

type ShopStats = {
    counts: Record<string, number>;
};

const GHANA_REGIONS = [
    "Greater Accra",
    "Ashanti",
    "Western",
    "Central",
    "Eastern",
    "Volta",
    "Northern",
    "Upper East",
    "Upper West",
    "Bono",
    "Bono East",
    "Ahafo",
    "Oti",
    "Savannah",
    "North East",
    "Western North",
] as const;

export function CatalogShopInsightsPanel({
    token,
    shop,
    onShopUpdated,
}: {
    token: string;
    shop: CatalogShop;
    onShopUpdated?: (patch: Partial<CatalogShop>) => void;
}) {
    const [stats, setStats] = useState<ShopStats | null>(null);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [discounts, setDiscounts] = useState<Discount[]>([]);
    const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);

    const [addOpen, setAddOpen] = useState(false);
    const [addName, setAddName] = useState("");
    const [addRegion, setAddRegion] = useState("");
    const [addShopType, setAddShopType] = useState(shop.shopType || "");
    const [adding, setAdding] = useState(false);
    const [addError, setAddError] = useState<string | null>(null);
    const [addSuccess, setAddSuccess] = useState<string | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        const q = `businessId=${shop.id}&limit=20&offset=0`;
        const headers = authHeaders(token);
        try {
            const [overviewRes, branchesRes, discountsRes, auditRes] = await Promise.all([
                fetch(`/api/platform/overview?businessId=${shop.id}`, { headers }),
                fetch(`/api/platform/branches?${q}`, { headers }),
                fetch(`/api/platform/discounts?${q}`, { headers }),
                fetch(`/api/platform/audit-logs?${q}`, { headers }),
            ]);
            const [overview, branchData, discountData, auditData] = await Promise.all([
                overviewRes.json(),
                branchesRes.json(),
                discountsRes.json(),
                auditRes.json(),
            ]);
            if (overviewRes.ok) setStats({ counts: overview.counts });
            if (branchesRes.ok) setBranches(branchData.items ?? []);
            if (discountsRes.ok) setDiscounts(discountData.items ?? []);
            if (auditRes.ok) setAuditLogs(auditData.items ?? []);
        } finally {
            setLoading(false);
        }
    }, [token, shop.id]);

    useEffect(() => {
        void load();
    }, [load]);

    const monthlyAddon =
        (shop.paidExtraBranches ?? 0) * BRANCH_ADDON_PRICE_MONTHLY_GHS;

    const handleAddBranch = async () => {
        if (!addName.trim()) {
            setAddError("Branch name is required.");
            return;
        }
        setAdding(true);
        setAddError(null);
        setAddSuccess(null);
        try {
            const res = await fetch("/api/platform/branches", {
                method: "POST",
                headers: {
                    ...authHeaders(token),
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    businessId: shop.id,
                    name: addName.trim(),
                    region: addRegion || undefined,
                    businessType: addShopType || undefined,
                }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                throw new Error(data.error || "Failed to add branch");
            }
            setAddSuccess(data.message || "Branch added.");
            setAddName("");
            setAddRegion("");
            setAddOpen(false);
            onShopUpdated?.({
                branchCount: shop.branchCount + 1,
                paidExtraBranches: data.paidExtraBranches ?? shop.paidExtraBranches,
            });
            await load();
        } catch (err) {
            setAddError(err instanceof Error ? err.message : "Failed to add branch");
        } finally {
            setAdding(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center gap-2 rounded-xl border border-border bg-card py-12 text-sm text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading shop insights…
            </div>
        );
    }

    const c = stats?.counts ?? {};

    return (
        <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <InsightCard icon={Users} label="Team" value={c.users ?? 0} />
                <InsightCard icon={Building2} label="Branches" value={shop.branchCount} />
                <InsightCard icon={Percent} label="Promotions" value={c.discounts ?? 0} />
                <InsightCard icon={Activity} label="Sales" value={c.sales ?? 0} />
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                <section className="rounded-xl border border-border bg-card p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                        <h3 className="flex items-center gap-2 font-semibold text-foreground">
                            <Building2 className="h-4 w-4" />
                            Branches
                        </h3>
                        <button
                            type="button"
                            onClick={() => {
                                setAddOpen((v) => !v);
                                setAddError(null);
                                setAddSuccess(null);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800"
                        >
                            <Plus className="h-3.5 w-3.5" />
                            Add branch
                        </button>
                    </div>

                    {(shop.paidExtraBranches ?? 0) > 0 && (
                        <p className="mt-3 rounded-lg bg-emerald-500/10 px-3 py-2 text-xs text-emerald-800 dark:text-emerald-300">
                            {shop.paidExtraBranches} paid extra branch
                            {shop.paidExtraBranches === 1 ? "" : "es"} · +GHS {monthlyAddon}/month
                            on subscription
                        </p>
                    )}

                    {addSuccess ? (
                        <p className="mt-3 text-sm text-emerald-600">{addSuccess}</p>
                    ) : null}

                    {addOpen ? (
                        <div className="mt-4 space-y-3 rounded-lg border border-dashed border-emerald-500/30 bg-emerald-500/5 p-4">
                            <p className="text-xs text-muted-foreground">
                                Grant a branch when the owner requests it. Branches beyond their
                                plan limit add GHS {BRANCH_ADDON_PRICE_MONTHLY_GHS}/month each.
                            </p>
                            <input
                                value={addName}
                                onChange={(e) => setAddName(e.target.value)}
                                placeholder="Branch name"
                                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                            />
                            <select
                                value={addRegion}
                                onChange={(e) => setAddRegion(e.target.value)}
                                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                            >
                                <option value="">Region (optional)</option>
                                {GHANA_REGIONS.map((r) => (
                                    <option key={r} value={r}>
                                        {r}
                                    </option>
                                ))}
                            </select>
                            <select
                                value={addShopType}
                                onChange={(e) => setAddShopType(e.target.value)}
                                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                            >
                                <option value="">Shop type (optional)</option>
                                {BUSINESS_TYPES.map((t) => (
                                    <option key={t.id} value={t.id}>
                                        {t.label}
                                    </option>
                                ))}
                            </select>
                            {addError ? (
                                <p className="text-xs text-red-600">{addError}</p>
                            ) : null}
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    disabled={adding}
                                    onClick={() => void handleAddBranch()}
                                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
                                >
                                    {adding ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : null}
                                    Confirm add
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setAddOpen(false)}
                                    className="rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    ) : null}

                    {branches.length === 0 ? (
                        <p className="mt-4 text-sm text-muted-foreground">No branches yet.</p>
                    ) : (
                        <ul className="mt-4 divide-y divide-border">
                            {branches.map((b) => (
                                <li key={b.id} className="flex items-center justify-between py-3">
                                    <div>
                                        <p className="font-medium text-foreground">
                                            {b.name}
                                            {b.isMain ? (
                                                <span className="ml-2 text-[10px] uppercase text-muted-foreground">
                                                    Main
                                                </span>
                                            ) : null}
                                        </p>
                                        {b.region ? (
                                            <p className="flex items-center gap-1 text-xs text-muted-foreground">
                                                <MapPin className="h-3 w-3" />
                                                {b.region}
                                            </p>
                                        ) : null}
                                    </div>
                                    <span
                                        className={cn(
                                            "rounded-full px-2 py-0.5 text-xs capitalize",
                                            b.status === "active"
                                                ? "bg-emerald-500/15 text-emerald-700"
                                                : "bg-muted text-muted-foreground"
                                        )}
                                    >
                                        {b.status}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                <section className="rounded-xl border border-border bg-card p-5">
                    <h3 className="flex items-center gap-2 font-semibold text-foreground">
                        <Percent className="h-4 w-4" />
                        Active promotions
                    </h3>
                    {discounts.length === 0 ? (
                        <p className="mt-4 text-sm text-muted-foreground">
                            No discount rules configured.
                        </p>
                    ) : (
                        <ul className="mt-4 divide-y divide-border">
                            {discounts.slice(0, 8).map((d) => (
                                <li key={d.id} className="py-3">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="font-medium text-foreground">{d.name}</p>
                                        <span
                                            className={cn(
                                                "text-xs font-medium",
                                                d.isActive
                                                    ? "text-emerald-600"
                                                    : "text-muted-foreground"
                                            )}
                                        >
                                            {d.isActive ? "Active" : "Off"}
                                        </span>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        {d.type === "percentage"
                                            ? `${d.value}% off`
                                            : `GHS ${d.value} off`}
                                        {d.endDate ? ` · ends ${formatWhen(d.endDate)}` : ""}
                                    </p>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            </div>

            <section className="rounded-xl border border-border bg-card p-5">
                <h3 className="flex items-center gap-2 font-semibold text-foreground">
                    <Activity className="h-4 w-4" />
                    Recent activity
                </h3>
                {auditLogs.length === 0 ? (
                    <p className="mt-4 text-sm text-muted-foreground">No audit logs yet.</p>
                ) : (
                    <ul className="mt-4 divide-y divide-border">
                        {auditLogs.map((log) => (
                            <li
                                key={log.id}
                                className="flex flex-col gap-0.5 py-3 sm:flex-row sm:items-center sm:justify-between"
                            >
                                <div>
                                    <p className="text-sm font-medium text-foreground">
                                        {log.action}
                                    </p>
                                    <p className="text-xs text-muted-foreground">{log.resource}</p>
                                </div>
                                <time className="text-xs text-muted-foreground">
                                    {formatWhen(log.createdAt)}
                                </time>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </div>
    );
}

function InsightCard({
    icon: Icon,
    label,
    value,
}: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value: number;
}) {
    return (
        <div className="rounded-xl border border-border bg-card px-4 py-3">
            <div className="flex items-center gap-2 text-muted-foreground">
                <Icon className="h-4 w-4" />
                <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
            </div>
            <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">{value}</p>
        </div>
    );
}
