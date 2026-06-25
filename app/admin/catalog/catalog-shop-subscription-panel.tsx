"use client";

import { useState } from "react";
import {
    CalendarClock,
    CheckCircle2,
    Gift,
    Loader2,
    PauseCircle,
    Shield,
    Sparkles,
    Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BRANCH_ADDON_PRICE_MONTHLY_GHS } from "@/config/plans";
import type { CatalogShop } from "./catalog-admin-types";
import {
    formatDate,
    formatWhen,
    platformDeleteShop,
    platformPatch,
    subscriptionDaysLeft,
    PLAN_LABELS,
} from "./catalog-admin-utils";
import {
    AccountStatusBadge,
    PlanBadge,
    SubscriptionStatusBadge,
} from "./catalog-status-badge";

const FREE_DAY_PRESETS = [7, 14, 30, 60, 90] as const;

type Props = {
    token: string;
    shop: CatalogShop;
    onUpdated: (patch: Partial<CatalogShop>) => void;
    onDeleted?: () => void;
};

export function CatalogShopSubscriptionPanel({ token, shop, onUpdated, onDeleted }: Props) {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [customDays, setCustomDays] = useState("30");
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [confirmSlug, setConfirmSlug] = useState("");
    const [deleting, setDeleting] = useState(false);
    const [periodEndInput, setPeriodEndInput] = useState(
        shop.currentPeriodEnd
            ? new Date(shop.currentPeriodEnd).toISOString().slice(0, 16)
            : ""
    );

    const daysLeft = subscriptionDaysLeft(shop.currentPeriodEnd);
    const branchAddonMonthly =
        (shop.paidExtraBranches ?? 0) * BRANCH_ADDON_PRICE_MONTHLY_GHS;
    const periodProgress =
        daysLeft !== null && daysLeft > 0
            ? Math.min(100, Math.max(8, (daysLeft / 30) * 100))
            : daysLeft !== null && daysLeft <= 0
              ? 4
              : 50;

    const runPatch = async (
        body: Record<string, unknown>,
        message: string,
        localPatch: Partial<CatalogShop>
    ) => {
        setBusy(true);
        setError(null);
        setSuccess(null);
        try {
            await platformPatch(token, `/api/platform/businesses/${shop.id}`, body);
            onUpdated(localPatch);
            setSuccess(message);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Update failed");
        } finally {
            setBusy(false);
        }
    };

    const extendDays = (days: number) =>
        void runPatch(
            { extendSubscriptionDays: days },
            `Added ${days} free day${days === 1 ? "" : "s"} to subscription`,
            {
                subscriptionStatus: "active",
                currentPeriodEnd: estimateExtendedEnd(shop.currentPeriodEnd, days),
            }
        );

    const setPeriodEnd = () => {
        if (!periodEndInput) return;
        const iso = new Date(periodEndInput).toISOString();
        void runPatch(
            { currentPeriodEnd: iso, subscriptionStatus: "active" },
            "Subscription end date updated",
            { currentPeriodEnd: iso, subscriptionStatus: "active" }
        );
    };

    const deleteShop = async () => {
        if (confirmSlug.trim() !== shop.slug) return;
        setDeleting(true);
        setError(null);
        setSuccess(null);
        try {
            await platformDeleteShop(token, shop.id, confirmSlug);
            onDeleted?.();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to delete shop");
            setDeleting(false);
        }
    };

    const slugMatches = confirmSlug.trim() === shop.slug;
    const actionBusy = busy || deleting;

    return (
        <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            Subscription & billing
                        </p>
                        <h3 className="mt-1 text-lg font-semibold text-foreground">
                            {PLAN_LABELS[shop.plan]} plan
                        </h3>
                        <div className="mt-3 flex flex-wrap gap-2">
                            <PlanBadge plan={shop.plan} />
                            <SubscriptionStatusBadge
                                status={shop.subscriptionStatus}
                                periodEnd={shop.currentPeriodEnd}
                            />
                            <AccountStatusBadge status={shop.status} />
                        </div>
                        {(shop.paidExtraBranches ?? 0) > 0 ? (
                            <p className="mt-3 text-sm text-emerald-700 dark:text-emerald-400">
                                +GHS {branchAddonMonthly}/month for {shop.paidExtraBranches}{" "}
                                extra branch{shop.paidExtraBranches === 1 ? "" : "es"} (GHS{" "}
                                {BRANCH_ADDON_PRICE_MONTHLY_GHS} each)
                            </p>
                        ) : null}
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-muted-foreground">Period ends</p>
                        <p className="mt-0.5 font-medium text-foreground">
                            {formatDate(shop.currentPeriodEnd)}
                        </p>
                        {daysLeft !== null ? (
                            <p
                                className={cn(
                                    "mt-1 text-sm font-semibold tabular-nums",
                                    daysLeft <= 0
                                        ? "text-destructive"
                                        : daysLeft <= 7
                                          ? "text-amber-600 dark:text-amber-400"
                                          : "text-emerald-600 dark:text-emerald-400"
                                )}
                            >
                                {daysLeft <= 0
                                    ? `${Math.abs(daysLeft)}d overdue`
                                    : `${daysLeft} day${daysLeft === 1 ? "" : "s"} remaining`}
                            </p>
                        ) : (
                            <p className="mt-1 text-sm text-muted-foreground">No end date set</p>
                        )}
                    </div>
                </div>

                <div className="mt-5">
                    <div className="mb-1.5 flex justify-between text-[11px] text-muted-foreground">
                        <span>Timeline</span>
                        <span>Joined {formatDate(shop.createdAt)}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                            className={cn(
                                "h-full rounded-full transition-all",
                                daysLeft !== null && daysLeft <= 0
                                    ? "bg-destructive"
                                    : daysLeft !== null && daysLeft <= 7
                                      ? "bg-amber-500"
                                      : "bg-primary"
                            )}
                            style={{ width: `${periodProgress}%` }}
                        />
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                        Last updated {formatWhen(shop.updatedAt)}
                        {shop.onboardingCompleted ? " · Onboarding complete" : " · Onboarding in progress"}
                    </p>
                </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
                <div className="mb-4 flex items-center gap-2">
                    <Gift className="h-4 w-4 text-primary" aria-hidden />
                    <h4 className="font-semibold text-foreground">Grant free days</h4>
                </div>
                <p className="mb-4 text-sm text-muted-foreground">
                    Extend this shop&apos;s subscription from today or their current period end — ideal
                    for trials, goodwill credits, or promotional discounts.
                </p>
                <div className="flex flex-wrap gap-2">
                    {FREE_DAY_PRESETS.map((d) => (
                        <Button
                            key={d}
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={actionBusy}
                            onClick={() => extendDays(d)}
                        >
                            +{d} days
                        </Button>
                    ))}
                </div>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
                    <label className="grid flex-1 gap-1.5 text-sm">
                        <span className="font-medium text-foreground">Custom days</span>
                        <input
                            type="number"
                            min={1}
                            max={3650}
                            value={customDays}
                            onChange={(e) => setCustomDays(e.target.value)}
                            className="rounded-lg border border-input bg-background px-3 py-2 text-foreground"
                        />
                    </label>
                    <Button
                        type="button"
                        disabled={busy || !customDays}
                        onClick={() => extendDays(Math.max(1, parseInt(customDays, 10) || 0))}
                    >
                        Apply custom
                    </Button>
                </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-xl border border-border bg-card p-5">
                    <div className="mb-4 flex items-center gap-2">
                        <CalendarClock className="h-4 w-4 text-primary" aria-hidden />
                        <h4 className="font-semibold text-foreground">Set period end</h4>
                    </div>
                    <label className="grid gap-1.5 text-sm">
                        <span className="text-muted-foreground">Exact end date & time</span>
                        <input
                            type="datetime-local"
                            value={periodEndInput}
                            onChange={(e) => setPeriodEndInput(e.target.value)}
                            className="rounded-lg border border-input bg-background px-3 py-2 text-foreground"
                        />
                    </label>
                    <Button
                        type="button"
                        className="mt-3"
                        variant="secondary"
                        disabled={busy || !periodEndInput}
                        onClick={setPeriodEnd}
                    >
                        Save timeline
                    </Button>
                </div>

                <div className="rounded-xl border border-border bg-card p-5">
                    <div className="mb-4 flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary" aria-hidden />
                        <h4 className="font-semibold text-foreground">Plan & status</h4>
                    </div>
                    <div className="grid gap-3">
                        <label className="grid gap-1.5 text-sm">
                            <span className="text-muted-foreground">Subscription plan</span>
                            <select
                                value={shop.plan}
                                disabled={actionBusy}
                                onChange={(e) =>
                                    void runPatch(
                                        { plan: e.target.value },
                                        "Plan updated",
                                        { plan: e.target.value as CatalogShop["plan"] }
                                    )
                                }
                                className="rounded-lg border border-input bg-background px-3 py-2 text-foreground"
                            >
                                <option value="starter">Starter</option>
                                <option value="growth">Growth</option>
                                <option value="pro">Pro</option>
                            </select>
                        </label>
                        <label className="grid gap-1.5 text-sm">
                            <span className="text-muted-foreground">Billing status</span>
                            <select
                                value={shop.subscriptionStatus}
                                disabled={actionBusy}
                                onChange={(e) =>
                                    void runPatch(
                                        { subscriptionStatus: e.target.value },
                                        "Billing status updated",
                                        {
                                            subscriptionStatus: e.target
                                                .value as CatalogShop["subscriptionStatus"],
                                        }
                                    )
                                }
                                className="rounded-lg border border-input bg-background px-3 py-2 text-foreground"
                            >
                                <option value="active">Active</option>
                                <option value="past_due">Past due</option>
                                <option value="canceled">Canceled</option>
                            </select>
                        </label>
                        <label className="grid gap-1.5 text-sm">
                            <span className="text-muted-foreground">Account access</span>
                            <select
                                value={shop.status}
                                disabled={actionBusy}
                                onChange={(e) =>
                                    void runPatch(
                                        { status: e.target.value },
                                        "Account status updated",
                                        { status: e.target.value as CatalogShop["status"] }
                                    )
                                }
                                className="rounded-lg border border-input bg-background px-3 py-2 text-foreground"
                            >
                                <option value="active">Active</option>
                                <option value="suspended">Suspended</option>
                                <option value="deactivated">Deactivated</option>
                            </select>
                        </label>
                    </div>
                </div>
            </div>

            <div className="flex flex-wrap gap-2">
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={actionBusy}
                    onClick={() =>
                        void runPatch(
                            { subscriptionStatus: "active", extendSubscriptionDays: 30 },
                            "Reactivated with 30 bonus days",
                            {
                                subscriptionStatus: "active",
                                currentPeriodEnd: estimateExtendedEnd(shop.currentPeriodEnd, 30),
                            }
                        )
                    }
                >
                    <CheckCircle2 className="mr-1.5 h-4 w-4" />
                    Reactivate +30d
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={actionBusy}
                    onClick={() =>
                        void runPatch(
                            { status: "suspended" },
                            "Shop suspended",
                            { status: "suspended" }
                        )
                    }
                >
                    <PauseCircle className="mr-1.5 h-4 w-4" />
                    Suspend shop
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={actionBusy}
                    onClick={() =>
                        void runPatch(
                            { status: "active", subscriptionStatus: "active" },
                            "Shop restored to active",
                            { status: "active", subscriptionStatus: "active" }
                        )
                    }
                >
                    <Shield className="mr-1.5 h-4 w-4" />
                    Restore access
                </Button>
            </div>

            <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h4 className="flex items-center gap-2 font-semibold text-destructive">
                            <Trash2 className="h-4 w-4" aria-hidden />
                            Delete shop permanently
                        </h4>
                        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
                            Removes <span className="font-medium text-foreground">{shop.name}</span> and
                            all related data (products, sales, users, branches). This cannot be undone.
                        </p>
                    </div>
                    {!deleteOpen ? (
                        <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            disabled={actionBusy}
                            onClick={() => setDeleteOpen(true)}
                        >
                            <Trash2 className="mr-1.5 h-4 w-4" />
                            Delete shop
                        </Button>
                    ) : null}
                </div>

                {deleteOpen ? (
                    <div className="mt-4 space-y-3 border-t border-destructive/20 pt-4">
                        <p className="text-sm text-foreground">
                            Type the shop slug{" "}
                            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                                {shop.slug}
                            </code>{" "}
                            to confirm:
                        </p>
                        <input
                            type="text"
                            value={confirmSlug}
                            onChange={(e) => setConfirmSlug(e.target.value)}
                            placeholder={shop.slug}
                            autoComplete="off"
                            className="w-full max-w-md rounded-lg border border-input bg-background px-3 py-2 font-mono text-sm text-foreground"
                        />
                        <div className="flex flex-wrap gap-2">
                            <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                disabled={!slugMatches || deleting}
                                onClick={() => void deleteShop()}
                            >
                                {deleting ? (
                                    <>
                                        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                                        Deleting…
                                    </>
                                ) : (
                                    <>
                                        <Trash2 className="mr-1.5 h-4 w-4" />
                                        Permanently delete
                                    </>
                                )}
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={deleting}
                                onClick={() => {
                                    setDeleteOpen(false);
                                    setConfirmSlug("");
                                }}
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                ) : null}
            </div>

            {actionBusy ? (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {deleting ? "Deleting shop…" : "Saving changes…"}
                </p>
            ) : null}
            {success ? (
                <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
                    {success}
                </p>
            ) : null}
            {error ? (
                <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {error}
                </p>
            ) : null}
        </div>
    );
}

/** Client-side estimate for optimistic UI (server is source of truth). */
function estimateExtendedEnd(current: string | null, days: number): string {
    const now = Date.now();
    const existing = current ? new Date(current).getTime() : now;
    const base = existing > now ? existing : now;
    return new Date(base + days * 24 * 60 * 60 * 1000).toISOString();
}
