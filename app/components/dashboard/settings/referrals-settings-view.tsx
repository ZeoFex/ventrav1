"use client";

import { useSession } from "@/app/components/auth/use-session";
import Link from "next/link";
import {
    Copy,
    Gift,
    Loader2,
    Users,
    ArrowRight,
    CheckCircle2,
    Sparkles,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type ReferralSummary = {
    referralCode: string;
    qualifiedCount: number;
    earnedBps: number;
    reservedBps: number;
    maxBps: number;
    shareUrl: string;
};

type ActivityItem = {
    id: string;
    refereeBusinessName: string;
    qualifiedAt: string | null;
    firstChargeReference: string;
};

export function ReferralsSettingsView() {
    const { user } = useSession();
    const [summary, setSummary] = useState<ReferralSummary | null>(null);
    const [activity, setActivity] = useState<ActivityItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [claimLoading, setClaimLoading] = useState(false);
    const [copyDone, setCopyDone] = useState<"url" | "code" | null>(null);

    const load = useCallback(async () => {
        if (user?.role !== "owner") {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const [sRes, aRes] = await Promise.all([
                fetch("/api/billing/referrals/summary", { credentials: "include" }),
                fetch("/api/billing/referrals/activity", { credentials: "include" }),
            ]);
            if (sRes.ok) setSummary(await sRes.json());
            if (aRes.ok) {
                const j = await aRes.json();
                setActivity(j.items ?? []);
            }
        } finally {
            setLoading(false);
        }
    }, [user?.role]);

    useEffect(() => {
        load();
    }, [load]);

    const handleClaim = async () => {
        setClaimLoading(true);
        try {
            const res = await fetch("/api/billing/referrals/claim", {
                method: "POST",
                credentials: "include",
            });
            if (res.ok) await load();
        } finally {
            setClaimLoading(false);
        }
    };

    const copy = async (text: string, kind: "url" | "code") => {
        await navigator.clipboard.writeText(text);
        setCopyDone(kind);
        window.setTimeout(() => setCopyDone(null), 2000);
    };

    const earnedPercent = summary ? summary.earnedBps / 100 : 0;
    const reservedPercent = summary ? summary.reservedBps / 100 : 0;
    const maxPercent = summary ? summary.maxBps / 100 : 20;

    if (user?.role !== "owner") {
        return (
            <div className="rounded-2xl border border-border bg-surface-elevated p-8 text-center">
                <p className="text-muted-foreground">
                    Only the business owner can view referral links and rewards.
                </p>
                <Link
                    href="/dashboard/settings"
                    className="mt-4 inline-flex text-sm font-medium text-[#006c49] dark:text-[#6ffbbe]"
                >
                    Back to settings
                </Link>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex min-h-[240px] items-center justify-center">
                <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-8 max-w-4xl">
            <div className="rounded-2xl border border-[#006c49]/15 bg-gradient-to-br from-[#003527]/8 to-transparent p-6 dark:from-[#6ffbbe]/10 dark:to-transparent sm:p-8">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <div className="inline-flex items-center gap-2 rounded-full bg-[#003527]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#006c49] dark:bg-[#6ffbbe]/15 dark:text-[#6ffbbe]">
                            <Sparkles className="size-3.5" />
                            Referral program
                        </div>
                        <h2 className="mt-3 font-[family-name:var(--font-display)] text-xl font-bold text-foreground sm:text-2xl">
                            Grow together, save on your plan
                        </h2>
                        <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
                            Share your link with other businesses. When they subscribe, you bank{" "}
                            <strong className="text-foreground">2% off</strong> per qualified referral, up to{" "}
                            <strong className="text-foreground">{maxPercent}%</strong>. Claim your discount before you renew. T&amp;Cs apply.
                        </p>
                    </div>
                    <Link
                        href="/dashboard/settings/billing"
                        className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-[#006c49] hover:underline dark:text-[#6ffbbe]"
                    >
                        Billing &amp; renewal
                        <ArrowRight className="size-4" />
                    </Link>
                </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-3">
                <div className="rounded-2xl border border-border bg-surface-elevated p-5">
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Users className="size-4" />
                        <span className="text-xs font-semibold uppercase tracking-wide">Qualified</span>
                    </div>
                    <p className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold tabular-nums">
                        {summary?.qualifiedCount ?? 0}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">Successful paid sign-ups via your link</p>
                </div>
                <div className="rounded-2xl border border-border bg-surface-elevated p-5">
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Gift className="size-4" />
                        <span className="text-xs font-semibold uppercase tracking-wide">Reward bank</span>
                    </div>
                    <p className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold tabular-nums text-[#006c49] dark:text-[#6ffbbe]">
                        {earnedPercent.toFixed(0)}%
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">Available toward subscription (max {maxPercent}%)</p>
                </div>
                <div className="rounded-2xl border border-border bg-surface-elevated p-5">
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <CheckCircle2 className="size-4" />
                        <span className="text-xs font-semibold uppercase tracking-wide">Next payment</span>
                    </div>
                    <p className="mt-2 font-[family-name:var(--font-display)] text-3xl font-bold tabular-nums">
                        {reservedPercent > 0 ? `${reservedPercent.toFixed(0)}%` : "—"}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                        {reservedPercent > 0
                            ? "Reserved — pay via Billing to apply"
                            : "Claim below to apply on your next charge"}
                    </p>
                </div>
            </div>

            <div className="rounded-2xl border border-border bg-surface-elevated p-6">
                <h3 className="font-semibold text-foreground">Your referral link</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                    Your code is created automatically. Copy the link or code to share — new businesses who sign up with it count toward your rewards after their first paid subscription.
                </p>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1 rounded-xl border border-border bg-background px-4 py-3 font-mono text-sm break-all">
                        {summary?.shareUrl ?? "—"}
                    </div>
                    <button
                        type="button"
                        onClick={() => summary?.shareUrl && copy(summary.shareUrl, "url")}
                        className="shrink-0 rounded-xl bg-[#003527] px-4 py-3 text-sm font-semibold text-white hover:brightness-105 dark:bg-[#6ffbbe] dark:text-[#003527]"
                    >
                        {copyDone === "url" ? "Copied" : "Copy link"}
                    </button>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="text-xs text-muted-foreground">Code:</span>
                    <code className="rounded-lg bg-muted px-2 py-1 text-sm font-semibold">
                        {summary?.referralCode ?? "—"}
                    </code>
                    <button
                        type="button"
                        onClick={() => summary?.referralCode && copy(summary.referralCode, "code")}
                        className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs font-medium hover:bg-muted/50"
                    >
                        <Copy className="size-3.5" />
                        {copyDone === "code" ? "Copied" : "Copy code"}
                    </button>
                </div>
            </div>

            {summary && summary.earnedBps > 0 && (
                <div className="flex flex-col gap-3 rounded-2xl border border-[#006c49]/20 bg-[#003527]/5 p-5 dark:border-[#6ffbbe]/20 dark:bg-[#6ffbbe]/5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="font-medium text-foreground">Use your reward on renewal</p>
                        <p className="text-sm text-muted-foreground">
                            Claim to reserve your full bank ({earnedPercent.toFixed(0)}%) for your next subscription payment in Billing.
                        </p>
                    </div>
                    <button
                        type="button"
                        disabled={claimLoading || summary.reservedBps > 0}
                        onClick={handleClaim}
                        className="shrink-0 rounded-xl bg-[#003527] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:brightness-105 disabled:opacity-50 dark:bg-[#6ffbbe] dark:text-[#003527]"
                    >
                        {claimLoading ? (
                            <Loader2 className="size-4 animate-spin" />
                        ) : summary.reservedBps > 0 ? (
                            "Discount ready — pay in Billing"
                        ) : (
                            "Claim for next payment"
                        )}
                    </button>
                </div>
            )}

            <div className="rounded-2xl border border-border bg-surface-elevated overflow-hidden">
                <div className="border-b border-border px-6 py-4">
                    <h3 className="font-semibold text-foreground">Referral activity</h3>
                    <p className="text-sm text-muted-foreground">
                        Businesses that completed a qualifying subscription after using your link.
                    </p>
                </div>
                {activity.length === 0 ? (
                    <div className="px-6 py-12 text-center text-sm text-muted-foreground">
                        No qualified referrals yet. Share your link to get started.
                    </div>
                ) : (
                    <ul className="divide-y divide-border">
                        {activity.map((row) => (
                            <li
                                key={row.id}
                                className="flex flex-col gap-1 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
                            >
                                <div>
                                    <p className="font-medium text-foreground">{row.refereeBusinessName}</p>
                                    <p className="text-xs text-muted-foreground font-mono truncate max-w-md">
                                        {row.firstChargeReference}
                                    </p>
                                </div>
                                <p className="text-sm text-muted-foreground tabular-nums shrink-0">
                                    {row.qualifiedAt
                                        ? new Date(row.qualifiedAt).toLocaleString(undefined, {
                                              dateStyle: "medium",
                                              timeStyle: "short",
                                          })
                                        : "—"}
                                </p>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
