"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { authHeaders, formatWhen, readResponseJson } from "./catalog-admin-utils";

export type ActivityDetailPayload = {
    kind: string;
    title: string;
    subtitle: string | null;
    source: "platform" | "shop";
    actionLabel: string;
    resourceLabel: string;
    shopName: string | null;
    actorName: string | null;
    actorEmail: string | null;
    createdAt: string;
    fields: { label: string; value: string }[];
    sections: {
        title: string;
        lines: {
            title: string;
            subtitle?: string;
            qty?: string;
            amount?: string;
        }[];
    }[];
};

export type ActivityDetailFallback = {
    actionLabel?: string;
    resourceLabel?: string | null;
    detail?: string | null;
    shopName?: string | null;
    actorName?: string | null;
    actorEmail?: string | null;
    createdAt?: string;
    source?: "platform" | "shop";
};

type Props = {
    token: string;
    entryId: string;
    fallback?: ActivityDetailFallback | null;
    onClose: () => void;
};

function splitEntryId(entryId: string): { kind: string; id: string } | null {
    const i = entryId.indexOf(":");
    if (i <= 0) return null;
    const kind = entryId.slice(0, i);
    const id = entryId.slice(i + 1);
    if (!kind || !id) return null;
    return { kind, id };
}

function snapshotFromFallback(
    entryId: string,
    fallback?: ActivityDetailFallback | null,
): ActivityDetailPayload | null {
    if (!fallback) return null;
    const kind = splitEntryId(entryId)?.kind ?? "log";
    return {
        kind,
        title: fallback.actionLabel || "Activity",
        subtitle: fallback.detail ?? null,
        source: fallback.source ?? "shop",
        actionLabel: fallback.actionLabel || "Activity",
        resourceLabel: fallback.resourceLabel || "—",
        shopName: fallback.shopName ?? null,
        actorName: fallback.actorName ?? null,
        actorEmail: fallback.actorEmail ?? null,
        createdAt: fallback.createdAt || new Date(0).toISOString(),
        fields: [
            { label: "Summary", value: fallback.detail || "—" },
        ],
        sections: [],
    };
}

export function CatalogActivityDetailPanel({
    token,
    entryId,
    fallback,
    onClose,
}: Props) {
    const snapshot = snapshotFromFallback(entryId, fallback);
    const [detail, setDetail] = useState<ActivityDetailPayload | null>(snapshot);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const panelRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        panelRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, [entryId]);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);
        setDetail(snapshotFromFallback(entryId, fallback));
        (async () => {
            try {
                const parts = splitEntryId(entryId);
                const params = new URLSearchParams();
                if (parts) {
                    params.set("kind", parts.kind);
                    params.set("id", parts.id);
                } else {
                    params.set("entryId", entryId);
                }
                const res = await fetch(`/api/platform/activity-logs?${params}`, {
                    headers: authHeaders(token),
                    cache: "no-store",
                });
                const data = await readResponseJson<ActivityDetailPayload & { error?: string }>(
                    res,
                );
                if (!res.ok) {
                    throw new Error(data.error ?? `HTTP ${res.status}`);
                }
                if (!data.actionLabel || !Array.isArray(data.fields)) {
                    throw new Error("Invalid log details");
                }
                if (!cancelled) setDetail(data);
            } catch (err) {
                if (!cancelled) {
                    setError(err instanceof Error ? err.message : "Could not load this log");
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [token, entryId]);

    return (
        <div
            ref={panelRef}
            className="overflow-hidden rounded-xl border border-primary/30 bg-card shadow-sm"
        >
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border bg-primary/5 px-4 py-3">
                <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Activity detail
                    </p>
                    <h4 className="truncate text-base font-semibold text-foreground">
                        {detail?.title || fallback?.actionLabel || "Log"}
                    </h4>
                    {detail?.subtitle || fallback?.detail ? (
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {detail?.subtitle || fallback?.detail}
                        </p>
                    ) : null}
                </div>
                <Button type="button" variant="outline" size="sm" onClick={onClose}>
                    <X className="mr-1.5 h-3.5 w-3.5" />
                    Close
                </Button>
            </div>

            <div className="px-4 py-4">
                {loading && !detail ? (
                    <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                        <Loader2 className="size-4 animate-spin" />
                        Loading log details…
                    </div>
                ) : detail ? (
                    <div className="space-y-4">
                        {loading ? (
                            <p className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Loader2 className="size-3.5 animate-spin" />
                                Loading full record…
                            </p>
                        ) : null}
                        {error && !loading ? (
                            <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                                Could not load extra details ({error}). Showing the log summary.
                            </p>
                        ) : null}
                        <ActivityDetailBody detail={detail} />
                    </div>
                ) : (
                    <p className="py-6 text-center text-sm text-muted-foreground">
                        {error === "Log not found"
                            ? "This record is no longer available."
                            : error || "Could not load this log."}
                    </p>
                )}
            </div>
        </div>
    );
}

function ActivityDetailBody({ detail }: { detail: ActivityDetailPayload }) {
    const fields = Array.isArray(detail.fields) ? detail.fields : [];
    const sections = Array.isArray(detail.sections) ? detail.sections : [];

    return (
        <div className="space-y-5 text-sm">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <Meta label="Action" value={detail.actionLabel || "—"} />
                <Meta label="Type" value={detail.resourceLabel || "—"} />
                <Meta label="Shop" value={detail.shopName || "—"} />
                <Meta
                    label="When"
                    value={formatWhen(detail.createdAt)}
                    className="sm:col-span-2 lg:col-span-1"
                />
                <Meta label="By" value={detail.actorName || "—"} />
                <Meta label="Email" value={detail.actorEmail || "—"} />
                <Meta
                    label="Source"
                    value={detail.source === "platform" ? "Platform admin" : "Shop"}
                />
            </div>

            {fields.length > 0 ? (
                <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Details
                    </p>
                    <dl className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2">
                        {fields.map((field, i) => (
                            <div
                                key={`${field.label}-${i}`}
                                className="grid grid-cols-[minmax(7rem,9rem)_minmax(0,1fr)] gap-3 bg-background px-3 py-2"
                            >
                                <dt className="text-xs text-muted-foreground">{field.label}</dt>
                                <dd className="break-words font-medium text-foreground">
                                    {looksLikeIso(field.value)
                                        ? formatWhen(field.value)
                                        : field.value}
                                </dd>
                            </div>
                        ))}
                    </dl>
                </div>
            ) : null}

            {sections.map((section) => (
                <div key={section.title}>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {section.title}
                    </p>
                    {section.lines.length === 0 ? (
                        <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-muted-foreground">
                            No related records.
                        </p>
                    ) : (
                        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-background">
                            {section.lines.map((line, i) => (
                                <li
                                    key={`${line.title}-${i}`}
                                    className="flex items-start justify-between gap-3 px-3 py-2.5"
                                >
                                    <div className="min-w-0">
                                        <p className="truncate font-medium text-foreground">
                                            {line.title}
                                        </p>
                                        {line.subtitle ? (
                                            <p className="truncate text-xs text-muted-foreground">
                                                {looksLikeIso(line.subtitle)
                                                    ? line.subtitle.replace(
                                                          /(\d{4}-\d{2}-\d{2}T[^\s]+)/,
                                                          (m) => formatWhen(m),
                                                      )
                                                    : line.subtitle}
                                            </p>
                                        ) : null}
                                    </div>
                                    <div className="shrink-0 text-right tabular-nums">
                                        {line.qty ? (
                                            <p className="text-xs text-muted-foreground">
                                                Qty {line.qty}
                                            </p>
                                        ) : null}
                                        {line.amount ? (
                                            <p className="font-medium text-foreground">
                                                {line.amount}
                                            </p>
                                        ) : null}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            ))}
        </div>
    );
}

function Meta({
    label,
    value,
    className,
}: {
    label: string;
    value: string;
    className?: string;
}) {
    return (
        <div className={cn("rounded-lg border border-border bg-background px-3 py-2", className)}>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                {label}
            </p>
            <p className="mt-0.5 break-words font-medium text-foreground">{value}</p>
        </div>
    );
}

function looksLikeIso(value: string): boolean {
    return /^\d{4}-\d{2}-\d{2}T/.test(value);
}
