"use client";

import Link from "next/link";
import useSWR from "swr";
import { Plus, Loader2, BookUser } from "lucide-react";
import { ProductsPageShell } from "../products/products-page-shell";

const fetcher = (u: string) => fetch(u).then((r) => {
    if (!r.ok) throw new Error("Failed");
    return r.json();
});

export function SuppliersListView() {
    const { data, isLoading, error } = useSWR("/api/suppliers", fetcher);

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
                                        <Link
                                            href={`/dashboard/suppliers/${s.id}`}
                                            className="text-[#006c49] font-semibold hover:underline dark:text-[#6ffbbe]"
                                        >
                                            View
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </ProductsPageShell>
    );
}
