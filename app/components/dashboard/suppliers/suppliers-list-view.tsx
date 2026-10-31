"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { Plus, Loader2, BookUser, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ProductsPageShell } from "../products/products-page-shell";
import { DeleteConfirmModal } from "./delete-confirm-modal";

const fetcher = (u: string) => fetch(u).then((r) => {
    if (!r.ok) throw new Error("Failed");
    return r.json();
});

export function SuppliersListView() {
    const router = useRouter();
    const { data, isLoading, error, mutate } = useSWR("/api/suppliers", fetcher);
    const [pendingSupplier, setPendingSupplier] = useState<{ id: string; name: string } | null>(null);
    const [deleting, setDeleting] = useState(false);

    async function confirmDeleteSupplier() {
        if (!pendingSupplier || deleting) return;
        setDeleting(true);
        try {
            const res = await fetch(`/api/suppliers/${pendingSupplier.id}`, { method: "DELETE" });
            const j = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(j.error || "Failed to delete supplier");
            toast.success("Supplier deleted");
            setPendingSupplier(null);
            await mutate();
            router.refresh();
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Failed to delete supplier");
        } finally {
            setDeleting(false);
        }
    }

    return (
        <ProductsPageShell
            title="Supplier management"
            description="Add suppliers, record deliveries (GRN), and track outstanding balances."
            actions={
                <Link
                    href="/dashboard/suppliers/new"
                    className="inline-flex items-center gap-2 rounded-xl bg-[#006c49] px-4 py-2.5 text-[14px] font-semibold text-white dark:bg-[#6ffbbe] dark:text-[#003523]"
                >
                    <Plus className="size-4" />
                    Add supplier
                </Link>
            }
        >
            {isLoading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="size-8 animate-spin text-muted-foreground" />
                </div>
            ) : error ? (
                <p className="text-destructive text-sm">Could not load suppliers.</p>
            ) : !data?.length ? (
                <div className="rounded-2xl border border-dashed p-12 text-center text-muted-foreground">
                    <BookUser className="mx-auto size-10 opacity-30" />
                    <p className="mt-4 font-medium text-foreground">No suppliers yet</p>
                    <p className="mt-1 text-sm">Add a supplier to record stock purchases.</p>
                </div>
            ) : (
                <div className="overflow-hidden rounded-2xl border border-[#eef0f2] dark:border-white/[0.08]">
                    <table className="w-full text-left text-[14px]">
                        <thead className="border-b bg-muted/40 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                            <tr>
                                <th className="px-4 py-3">Name</th>
                                <th className="px-4 py-3">Type</th>
                                <th className="px-4 py-3">Phones</th>
                                <th className="px-4 py-3 text-right">Outstanding</th>
                                <th className="px-4 py-3" />
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {data.map((s: any) => (
                                <tr key={s.id} className="hover:bg-muted/30">
                                    <td className="px-4 py-3 font-medium">{s.name}</td>
                                    <td className="px-4 py-3 capitalize text-muted-foreground">{s.type}</td>
                                    <td className="px-4 py-3 text-muted-foreground">
                                        {(s.phones || []).join(", ") || "—"}
                                    </td>
                                    <td className="px-4 py-3 text-right font-medium tabular-nums text-amber-800 dark:text-amber-200">
                                        ₵{Number(s.outstandingGhs ?? 0).toFixed(2)}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex items-center justify-end gap-3">
                                            <Link
                                                href={`/dashboard/suppliers/${s.id}`}
                                                className="text-[#006c49] font-semibold hover:underline dark:text-[#6ffbbe]"
                                            >
                                                View
                                            </Link>
                                            <button
                                                type="button"
                                                onClick={() => setPendingSupplier({ id: s.id, name: s.name })}
                                                className="inline-flex items-center justify-center rounded-lg p-1.5 text-muted-foreground hover:bg-red-50 hover:text-destructive dark:hover:bg-red-950/40"
                                                aria-label={`Delete ${s.name}`}
                                            >
                                                <Trash2 className="size-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            {pendingSupplier ? (
                <DeleteConfirmModal
                    title="Delete this supplier?"
                    description={
                        <>
                            You will no longer take goods from{" "}
                            <span className="font-semibold text-foreground">&quot;{pendingSupplier.name}&quot;</span>.
                            Their supply records will be removed and stock from those deliveries will be reversed.
                            This cannot be undone.
                        </>
                    }
                    confirmLabel="Delete supplier"
                    isDeleting={deleting}
                    onCancel={() => {
                        if (!deleting) setPendingSupplier(null);
                    }}
                    onConfirm={confirmDeleteSupplier}
                />
            ) : null}
        </ProductsPageShell>
    );
}
