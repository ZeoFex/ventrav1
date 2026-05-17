"use client";

import useSWR from "swr";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ClipboardCheck, Loader2, Save } from "lucide-react";
import { ProductsPageShell } from "../products/products-page-shell";
import { useBranchContext } from "../branch-context";
import { useProducts } from "../products/products-data-hooks";
import type { Product } from "@/app/lib/offline/offline-db";
import { toast } from "sonner";

const fetcher = (u: string) =>
    fetch(u).then((r) => {
        if (!r.ok) throw new Error("failed");
        return r.json();
    });

export function StockTakeView() {
    const { branchId } = useBranchContext();
    const { products = [], mutate: mutateProducts } = useProducts();
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [counts, setCounts] = useState<Record<string, number>>({});
    const [note, setNote] = useState("");
    const [busy, setBusy] = useState(false);

    const { data: recentSessions, mutate: mutateRecent } = useSWR(
        branchId !== "all" ? `/api/stock-take/sessions?limit=10` : null,
        fetcher,
    );

    const { data: sessionDetail, mutate: mutateSession } = useSWR(
        sessionId ? `/api/stock-take/sessions/${sessionId}` : null,
        fetcher,
    );

    const activeProducts = useMemo(
        () => (products as Product[]).filter((p) => p.status !== "archived"),
        [products],
    );

    useEffect(() => {
        if (!sessionId || !sessionDetail?.lines?.length) return;
        const next: Record<string, number> = {};
        for (const l of sessionDetail.lines) {
            next[l.productId] = l.countedQty;
        }
        setCounts((prev) => ({ ...prev, ...next }));
    }, [sessionId, sessionDetail]);

    const initCountsFromCatalog = useCallback(() => {
        const next: Record<string, number> = {};
        for (const p of activeProducts) {
            next[p.id] = p.stock ?? 0;
        }
        setCounts(next);
    }, [activeProducts]);

    async function startSession() {
        if (branchId === "all") {
            toast.error("Select a branch to run a stock take.");
            return;
        }
        setBusy(true);
        try {
            const res = await fetch("/api/stock-take/sessions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ note: note.trim() || null }),
            });
            const j = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(j.error || "failed");
            setSessionId(j.id);
            initCountsFromCatalog();
            await mutateRecent();
            toast.success("Stock take started — adjust counted quantities, then save.");
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Could not start");
        } finally {
            setBusy(false);
        }
    }

    async function persistLines(): Promise<boolean> {
        if (!sessionId) return false;
        const lines = activeProducts.map((p) => ({
            productId: p.id,
            countedQty: Math.max(0, Math.floor(counts[p.id] ?? 0)),
        }));
        const res = await fetch(`/api/stock-take/sessions/${sessionId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ intent: "save-lines", lines }),
        });
        return res.ok;
    }

    async function saveLines() {
        if (!sessionId) return;
        setBusy(true);
        try {
            const ok = await persistLines();
            if (!ok) throw new Error("Save failed");
            await mutateSession();
            toast.success("Counts saved");
        } catch {
            toast.error("Could not save lines");
        } finally {
            setBusy(false);
        }
    }

    async function completeSession() {
        if (!sessionId) return;
        setBusy(true);
        try {
            const ok = await persistLines();
            if (!ok) throw new Error("Save failed");
            const res = await fetch(`/api/stock-take/sessions/${sessionId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ intent: "complete" }),
            });
            const j = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(j.error || "Complete failed");
            toast.success("Stock take completed — inventory updated.");
            setSessionId(null);
            setCounts({});
            await mutateRecent();
            await mutateProducts();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Could not complete");
        } finally {
            setBusy(false);
        }
    }

    if (branchId === "all") {
        return (
            <ProductsPageShell
                title="Stock take"
                description="Physical count session for this branch."
                actions={null}
            >
                <p className="rounded-2xl border border-dashed p-8 text-center text-muted-foreground">
                    Select a specific branch in the header to run a stock take.
                </p>
            </ProductsPageShell>
        );
    }

    return (
        <ProductsPageShell
            title="Stock take"
            description="Count on-hand quantities. Saving stores a snapshot; completing updates product stock for this branch."
            actions={
                sessionId ? (
                    <span className="text-[13px] font-medium text-muted-foreground">Draft session active</span>
                ) : null
            }
        >
            <div className="mb-6 flex flex-wrap items-center gap-3">
                <input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Session note (optional)"
                    className="min-w-[12rem] flex-1 rounded-xl border px-3 py-2 text-[14px] dark:border-white/[0.12] dark:bg-[#111]"
                />
                {!sessionId ? (
                    <button
                        type="button"
                        disabled={busy}
                        onClick={startSession}
                        className="rounded-xl bg-[#006c49] px-4 py-2.5 text-[14px] font-semibold text-white dark:bg-[#6ffbbe] dark:text-[#003523]"
                    >
                        {busy ? <Loader2 className="size-5 animate-spin" /> : "Start stock take"}
                    </button>
                ) : (
                    <>
                        <button
                            type="button"
                            disabled={busy}
                            onClick={saveLines}
                            className="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-[14px] font-semibold"
                        >
                            <Save className="size-4" />
                            Save draft
                        </button>
                        <button
                            type="button"
                            disabled={busy}
                            onClick={completeSession}
                            className="rounded-xl bg-[#006c49] px-4 py-2.5 text-[14px] font-semibold text-white dark:bg-[#6ffbbe] dark:text-[#003523]"
                        >
                            Complete &amp; apply
                        </button>
                    </>
                )}
            </div>

            <div className="overflow-hidden rounded-2xl border dark:border-white/[0.08]">
                <table className="w-full text-left text-[13px]">
                    <thead className="border-b bg-muted/40 text-[11px] font-bold uppercase text-muted-foreground">
                        <tr>
                            <th className="px-3 py-2">Product</th>
                            <th className="px-3 py-2 text-right">System</th>
                            <th className="px-3 py-2 text-right">Counted</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {activeProducts.map((p) => (
                            <tr key={p.id}>
                                <td className="px-3 py-2 font-medium">{p.name}</td>
                                <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                                    {p.stock ?? 0}
                                </td>
                                <td className="px-3 py-2 text-right">
                                    <input
                                        type="number"
                                        min={0}
                                        value={counts[p.id] ?? p.stock ?? 0}
                                        onChange={(e) =>
                                            setCounts((c) => ({
                                                ...c,
                                                [p.id]: Math.max(0, parseInt(e.target.value, 10) || 0),
                                            }))
                                        }
                                        className="w-24 rounded-lg border px-2 py-1 text-right dark:border-white/[0.12] dark:bg-[#111]"
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <section className="mt-10">
                <h2 className="mb-3 flex items-center gap-2 text-[15px] font-semibold">
                    <ClipboardCheck className="size-4" />
                    Recent sessions
                </h2>
                {!recentSessions?.length ? (
                    <p className="text-[13px] text-muted-foreground">No sessions yet.</p>
                ) : (
                    <ul className="space-y-2 text-[13px]">
                        {recentSessions.map((s: any) => (
                            <li key={s.id} className="flex justify-between rounded-xl border px-3 py-2 dark:border-white/[0.08]">
                                <span>
                                    {new Date(s.createdAt).toLocaleString()} —{" "}
                                    <span className="font-medium capitalize">{s.status}</span>
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </ProductsPageShell>
    );
}
