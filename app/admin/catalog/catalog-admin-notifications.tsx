"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
    Bell,
    CheckCheck,
    CreditCard,
    Loader2,
    Package,
    Store,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PlatformNotification, PlatformNotificationType, TabId } from "./catalog-admin-types";
import { authHeaders, formatWhen } from "./catalog-admin-utils";

type NotificationNav = {
    tab: TabId;
    businessId?: string | null;
};

function notificationIcon(type: PlatformNotificationType) {
    switch (type) {
        case "subscription_past_due":
        case "subscription_expiring":
            return CreditCard;
        case "product_added":
        case "products_bulk_added":
            return Package;
        default:
            return Store;
    }
}

function notificationTarget(type: PlatformNotificationType): NotificationNav {
    switch (type) {
        case "subscription_past_due":
        case "subscription_expiring":
            return { tab: "subscriptions" };
        case "product_added":
        case "products_bulk_added":
        case "shop_created":
        case "shop_onboarded":
            return { tab: "shops" };
        default:
            return { tab: "overview" };
    }
}

type Props = {
    token: string;
    onNavigate: (nav: NotificationNav) => void;
};

export function CatalogAdminNotifications({ token, onNavigate }: Props) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [items, setItems] = useState<PlatformNotification[]>([]);
    const [unread, setUnread] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    const load = useCallback(async () => {
        try {
            const res = await fetch(
                "/api/platform/admin-notifications?limit=25&offset=0",
                { headers: authHeaders(token) }
            );
            const data = await res.json();
            if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
            setItems(data.items ?? []);
            setUnread(data.unread ?? 0);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load notifications");
        }
    }, [token]);

    const refresh = useCallback(async () => {
        setLoading(true);
        await load();
        setLoading(false);
    }, [load]);

    useEffect(() => {
        void load();
        const interval = window.setInterval(() => void load(), 60_000);
        return () => window.clearInterval(interval);
    }, [load]);

    useEffect(() => {
        if (!open) return;
        void refresh();
    }, [open, refresh]);

    useEffect(() => {
        if (!open) return;
        const onPointerDown = (e: MouseEvent) => {
            if (!panelRef.current?.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", onPointerDown);
        return () => document.removeEventListener("mousedown", onPointerDown);
    }, [open]);

    const markRead = async (ids: string[]) => {
        const res = await fetch("/api/platform/admin-notifications", {
            method: "PATCH",
            headers: {
                ...authHeaders(token),
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ ids }),
        });
        if (!res.ok) return;
        setItems((prev) =>
            prev.map((n) => (ids.includes(n.id) ? { ...n, isRead: true } : n))
        );
        setUnread((n) => Math.max(0, n - ids.length));
    };

    const markAllRead = async () => {
        const res = await fetch("/api/platform/admin-notifications", {
            method: "PATCH",
            headers: {
                ...authHeaders(token),
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ markAllRead: true }),
        });
        if (!res.ok) return;
        setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnread(0);
    };

    const handleClick = async (item: PlatformNotification) => {
        if (!item.isRead) {
            await markRead([item.id]);
        }
        const target = notificationTarget(item.type);
        onNavigate({
            tab: target.tab,
            businessId: item.businessId ?? target.businessId,
        });
        setOpen(false);
    };

    return (
        <div ref={panelRef} className="relative">
            <Button
                type="button"
                variant="outline"
                size="sm"
                className="relative border-[#bfc9c3]/30 bg-white/70 dark:border-white/[0.08] dark:bg-white/[0.02]"
                onClick={() => setOpen((v) => !v)}
                aria-label={`Notifications${unread > 0 ? `, ${unread} unread` : ""}`}
                aria-expanded={open}
            >
                <Bell className="h-4 w-4" />
                {unread > 0 ? (
                    <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
                        {unread > 99 ? "99+" : unread}
                    </span>
                ) : null}
            </Button>

            {open ? (
                <div className="absolute right-0 top-full z-50 mt-2 w-[min(100vw-2rem,22rem)] overflow-hidden rounded-2xl border border-[#bfc9c3]/20 bg-surface-card shadow-xl dark:border-white/[0.08] dark:bg-[#141414]">
                    <div className="flex items-center justify-between border-b border-border px-4 py-3">
                        <p className="text-sm font-semibold text-foreground">Notifications</p>
                        {unread > 0 ? (
                            <button
                                type="button"
                                onClick={() => void markAllRead()}
                                className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                            >
                                <CheckCheck className="h-3.5 w-3.5" />
                                Mark all read
                            </button>
                        ) : null}
                    </div>

                    <div className="max-h-[min(24rem,60vh)] overflow-y-auto">
                        {loading && items.length === 0 ? (
                            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Loading…
                            </div>
                        ) : error ? (
                            <p className="px-4 py-6 text-center text-sm text-destructive">{error}</p>
                        ) : items.length === 0 ? (
                            <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                                No notifications yet.
                            </p>
                        ) : (
                            <ul className="divide-y divide-border">
                                {items.map((item) => {
                                    const Icon = notificationIcon(item.type);
                                    return (
                                        <li key={item.id}>
                                            <button
                                                type="button"
                                                onClick={() => void handleClick(item)}
                                                className={cn(
                                                    "flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60",
                                                    !item.isRead && "bg-primary/5"
                                                )}
                                            >
                                                <div
                                                    className={cn(
                                                        "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                                                        item.isRead ? "bg-muted" : "bg-primary/10"
                                                    )}
                                                >
                                                    <Icon
                                                        className={cn(
                                                            "h-4 w-4",
                                                            item.isRead
                                                                ? "text-muted-foreground"
                                                                : "text-primary"
                                                        )}
                                                    />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p
                                                        className={cn(
                                                            "text-sm leading-snug",
                                                            item.isRead
                                                                ? "text-foreground"
                                                                : "font-medium text-foreground"
                                                        )}
                                                    >
                                                        {item.title}
                                                    </p>
                                                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                                                        {item.body}
                                                    </p>
                                                    <p className="mt-1 text-[10px] text-muted-foreground">
                                                        {formatWhen(item.createdAt)}
                                                    </p>
                                                </div>
                                                {!item.isRead ? (
                                                    <span
                                                        className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary"
                                                        aria-hidden
                                                    />
                                                ) : null}
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>
                </div>
            ) : null}
        </div>
    );
}
