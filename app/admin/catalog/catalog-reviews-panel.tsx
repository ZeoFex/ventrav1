"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, Loader2, Star, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatWhen } from "./catalog-admin-utils";

const REVIEW_PAGE_OPTIONS = [
    "home",
    "about",
    "features",
    "pricing",
    "contact",
    "general",
] as const;

type ReviewListItem = {
    id: string;
    name: string;
    role: string | null;
    rating: number;
    content: string;
    page: string | null;
    status: "pending" | "approved" | "rejected";
    createdAt: string;
};

type Props = {
    token: string;
};

function authHeaders(token: string) {
    return { Authorization: `Bearer ${token}` };
}

function Stars({ rating }: { rating: number }) {
    return (
        <span className="inline-flex items-center gap-0.5 text-amber-500" aria-label={`${rating} out of 5 stars`}>
            {Array.from({ length: 5 }).map((_, i) => (
                <Star
                    key={i}
                    className={`size-3.5 ${i < rating ? "fill-current" : "fill-none opacity-30"}`}
                    strokeWidth={2}
                    aria-hidden
                />
            ))}
        </span>
    );
}

function statusClass(status: ReviewListItem["status"]): string {
    switch (status) {
        case "approved":
            return "bg-[#006c49]/10 text-[#006c49] dark:bg-[#6ffbbe]/10 dark:text-[#6ffbbe]";
        case "rejected":
            return "bg-destructive/10 text-destructive";
        default:
            return "bg-amber-500/10 text-amber-700 dark:text-amber-300";
    }
}

function ReviewDeleteDialog({
    review,
    busy,
    error,
    onCancel,
    onConfirm,
}: {
    review: ReviewListItem;
    busy: boolean;
    error: string | null;
    onCancel: () => void;
    onConfirm: () => void;
}) {
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape" && !busy) onCancel();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [busy, onCancel]);

    return (
        <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-4 backdrop-blur-[2px] sm:items-center"
            role="presentation"
            onClick={() => {
                if (!busy) onCancel();
            }}
        >
            <div
                className="w-full max-w-md overflow-hidden rounded-2xl border border-[#bfc9c3]/25 bg-surface-card shadow-2xl dark:border-white/[0.1] dark:bg-[#111]"
                role="dialog"
                aria-modal="true"
                aria-labelledby="review-delete-title"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="border-b border-destructive/15 bg-gradient-to-br from-destructive/10 via-destructive/5 to-transparent px-5 py-5 dark:from-destructive/15">
                    <div className="flex items-start gap-3">
                        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-destructive/15 text-destructive ring-1 ring-destructive/20">
                            <AlertTriangle className="size-5" strokeWidth={2.25} aria-hidden />
                        </span>
                        <div className="min-w-0 flex-1 pt-0.5">
                            <h3
                                id="review-delete-title"
                                className="font-[family-name:var(--font-display)] text-lg font-semibold text-foreground"
                            >
                                Delete this review?
                            </h3>
                            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                                It will be removed from the public site right away. This cannot be
                                undone.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={onCancel}
                            disabled={busy}
                            className="flex size-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-black/5 hover:text-foreground disabled:opacity-50 dark:hover:bg-white/10"
                            aria-label="Close"
                        >
                            <X className="size-4" />
                        </button>
                    </div>
                </div>

                <div className="space-y-4 px-5 py-5">
                    <div className="rounded-xl border border-[#bfc9c3]/20 bg-muted/30 p-4 dark:border-white/[0.08] dark:bg-white/[0.03]">
                        <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-foreground">{review.name}</p>
                            {review.role ? (
                                <span className="text-sm text-muted-foreground">· {review.role}</span>
                            ) : null}
                            <span
                                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusClass(review.status)}`}
                            >
                                {review.status}
                            </span>
                        </div>
                        <div className="mt-2">
                            <Stars rating={review.rating} />
                        </div>
                        <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-foreground">
                            &ldquo;{review.content}&rdquo;
                        </p>
                        <p className="mt-2 text-xs text-muted-foreground">
                            {review.page ? `Shown on ${review.page}` : "Shown on general pages"} ·{" "}
                            {formatWhen(review.createdAt)}
                        </p>
                    </div>

                    {error ? (
                        <p
                            className="rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                            role="alert"
                        >
                            {error}
                        </p>
                    ) : null}

                    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                        <Button
                            type="button"
                            variant="outline"
                            disabled={busy}
                            className="sm:min-w-[7rem]"
                            onClick={onCancel}
                        >
                            Keep review
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            disabled={busy}
                            className="sm:min-w-[9rem]"
                            onClick={onConfirm}
                        >
                            {busy ? (
                                <>
                                    <Loader2 className="mr-1.5 size-4 animate-spin" />
                                    Deleting…
                                </>
                            ) : (
                                <>
                                    <Trash2 className="mr-1.5 size-4" />
                                    Delete review
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export function CatalogReviewsPanel({ token }: Props) {
    const [items, setItems] = useState<ReviewListItem[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [pendingDelete, setPendingDelete] = useState<ReviewListItem | null>(null);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [pageFilter, setPageFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const q = new URLSearchParams({ limit: "100", offset: "0" });
            if (pageFilter) q.set("page", pageFilter);
            if (statusFilter) q.set("status", statusFilter);

            const res = await fetch(`/api/platform/reviews?${q}`, {
                headers: authHeaders(token),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);

            setItems(data.items ?? []);
            setTotal(data.total ?? 0);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to load reviews");
        } finally {
            setLoading(false);
        }
    }, [token, pageFilter, statusFilter]);

    useEffect(() => {
        void load();
    }, [load]);

    const confirmDelete = async () => {
        if (!pendingDelete) return;

        setDeletingId(pendingDelete.id);
        setDeleteError(null);
        try {
            const res = await fetch(`/api/platform/reviews/${pendingDelete.id}`, {
                method: "DELETE",
                headers: authHeaders(token),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);

            setItems((prev) => prev.filter((r) => r.id !== pendingDelete.id));
            setTotal((n) => Math.max(0, n - 1));
            setPendingDelete(null);
        } catch (err) {
            setDeleteError(err instanceof Error ? err.message : "Failed to delete review");
        } finally {
            setDeletingId(null);
        }
    };

    const closeDeleteDialog = () => {
        if (deletingId) return;
        setPendingDelete(null);
        setDeleteError(null);
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-3 rounded-2xl border border-[#bfc9c3]/20 bg-surface-card p-4 shadow-sm dark:border-white/[0.08] dark:bg-[#141414] sm:flex-row sm:items-end">
                <label className="grid flex-1 gap-1.5 text-sm">
                    <span className="font-medium text-foreground">Page</span>
                    <select
                        value={pageFilter}
                        onChange={(e) => setPageFilter(e.target.value)}
                        className="rounded-lg border border-input bg-background px-3 py-2.5 text-foreground"
                    >
                        <option value="">All pages</option>
                        {REVIEW_PAGE_OPTIONS.map((p) => (
                            <option key={p} value={p}>
                                {p}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="grid flex-1 gap-1.5 text-sm sm:max-w-[12rem]">
                    <span className="font-medium text-foreground">Status</span>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="rounded-lg border border-input bg-background px-3 py-2.5 text-foreground"
                    >
                        <option value="">All statuses</option>
                        <option value="approved">Approved</option>
                        <option value="pending">Pending</option>
                        <option value="rejected">Rejected</option>
                    </select>
                </label>
                <Button type="button" variant="outline" onClick={() => void load()} disabled={loading}>
                    Refresh
                </Button>
            </div>

            {error ? (
                <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
                    {error}
                </p>
            ) : null}

            {loading ? (
                <div className="flex items-center justify-center gap-2 rounded-2xl border border-[#bfc9c3]/20 bg-surface-card py-16 text-sm text-muted-foreground dark:border-white/[0.08] dark:bg-[#141414]">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Loading reviews…
                </div>
            ) : items.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#bfc9c3]/30 bg-surface-card px-6 py-14 text-center dark:border-white/[0.08] dark:bg-[#141414]">
                    <p className="font-medium text-foreground">No reviews found</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Try changing filters or wait for customers to submit reviews on the site.
                    </p>
                </div>
            ) : (
                <>
                    <p className="text-sm text-muted-foreground">
                        Showing {items.length} of {total} review{total === 1 ? "" : "s"}
                    </p>
                    <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-[#bfc9c3]/20 bg-surface-card dark:border-white/[0.08] dark:bg-[#141414]">
                        {items.map((review) => (
                            <li
                                key={review.id}
                                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between"
                            >
                                <div className="min-w-0 flex-1 space-y-2">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <p className="font-semibold text-foreground">{review.name}</p>
                                        {review.role ? (
                                            <span className="text-sm text-muted-foreground">
                                                · {review.role}
                                            </span>
                                        ) : null}
                                        <span
                                            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusClass(review.status)}`}
                                        >
                                            {review.status}
                                        </span>
                                    </div>
                                    <Stars rating={review.rating} />
                                    <p className="text-sm leading-relaxed text-foreground">{review.content}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {review.page ? `Page: ${review.page}` : "Page: general"} ·{" "}
                                        {formatWhen(review.createdAt)}
                                    </p>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="shrink-0 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                    disabled={deletingId === review.id}
                                    onClick={() => {
                                        setDeleteError(null);
                                        setPendingDelete(review);
                                    }}
                                >
                                    {deletingId === review.id ? (
                                        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                                    ) : (
                                        <Trash2 className="mr-1.5 h-4 w-4" />
                                    )}
                                    Delete
                                </Button>
                            </li>
                        ))}
                    </ul>
                </>
            )}

            {pendingDelete ? (
                <ReviewDeleteDialog
                    review={pendingDelete}
                    busy={deletingId === pendingDelete.id}
                    error={deleteError}
                    onCancel={closeDeleteDialog}
                    onConfirm={() => void confirmDelete()}
                />
            ) : null}
        </div>
    );
}
