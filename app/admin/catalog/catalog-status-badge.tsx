"use client";

import { cn } from "@/lib/utils";
import type { CatalogShop } from "./catalog-admin-types";
import { PLAN_LABELS, subscriptionDaysLeft } from "./catalog-admin-utils";

const tone = {
    ok: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    warning: "bg-amber-500/15 text-amber-800 dark:text-amber-300",
    danger: "bg-destructive/15 text-destructive",
    muted: "bg-muted text-muted-foreground",
    primary: "bg-primary/10 text-foreground",
    info: "bg-sky-500/15 text-sky-800 dark:text-sky-300",
} as const;

export function StatusBadge({
    children,
    variant = "muted",
    className,
}: {
    children: React.ReactNode;
    variant?: keyof typeof tone;
    className?: string;
}) {
    return (
        <span
            className={cn(
                "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium capitalize",
                tone[variant],
                className
            )}
        >
            {children}
        </span>
    );
}

export function PlanBadge({ plan }: { plan: CatalogShop["plan"] }) {
    const variant =
        plan === "pro" ? "primary" : plan === "growth" ? "info" : "muted";
    return <StatusBadge variant={variant}>{PLAN_LABELS[plan]}</StatusBadge>;
}

export function AccountStatusBadge({ status }: { status: CatalogShop["status"] }) {
    const variant =
        status === "active" ? "ok" : status === "suspended" ? "warning" : "danger";
    return <StatusBadge variant={variant}>{status.replace(/_/g, " ")}</StatusBadge>;
}

export function SubscriptionStatusBadge({
    status,
    periodEnd,
}: {
    status: CatalogShop["subscriptionStatus"];
    periodEnd?: string | null;
}) {
    const days = subscriptionDaysLeft(periodEnd);
    if (status === "active" && days !== null && days <= 7 && days >= 0) {
        return (
            <StatusBadge variant="warning">
                {days === 0 ? "Expires today" : `${days}d left`}
            </StatusBadge>
        );
    }
    if (status === "active" && days !== null && days < 0) {
        return <StatusBadge variant="danger">Expired</StatusBadge>;
    }
    const variant =
        status === "active" ? "ok" : status === "past_due" ? "danger" : "inactive";
    return (
        <StatusBadge variant={variant === "inactive" ? "muted" : variant}>
            {status.replace(/_/g, " ")}
        </StatusBadge>
    );
}
