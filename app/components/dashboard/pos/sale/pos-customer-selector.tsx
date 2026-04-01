"use client";

import { UserPlus, User, Search, Check, X, Loader2 } from "lucide-react";
import { useState, useMemo } from "react";
import useSWR from "swr";
import { type CustomerRow } from "../../customers/customers-mock-data";
import { PosAddCustomerModal } from "./pos-add-customer-modal";

const fetcher = async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch customers");
    return res.json();
};

type PosCustomerSelectorProps = {
    selectedId: string | null;
    onSelect: (customer: CustomerRow | null) => void;
};

export function PosCustomerSelector({ selectedId, onSelect }: PosCustomerSelectorProps) {
    const { data: customers = [], isLoading } = useSWR<CustomerRow[]>("/api/customers", fetcher);

    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [showAddModal, setShowAddModal] = useState(false);

    const selectedCustomer = useMemo(
        () => customers.find((c) => c.id === selectedId) || null,
        [customers, selectedId]
    );

    const filtered = useMemo(() => {
        const q = search.toLowerCase().trim();
        if (!q) return customers.slice(0, 10);
        return customers.filter(
            (c) =>
                c.name.toLowerCase().includes(q) ||
                c.phone.toLowerCase().includes(q) ||
                (c.email || "").toLowerCase().includes(q)
        ).slice(0, 5);
    }, [customers, search]);

    return (
        <div className="relative mb-4">
            <div className="flex items-center justify-between mb-2 px-1">
                <label className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Customer
                </label>
                <button
                    type="button"
                    onClick={() => setShowAddModal(true)}
                    className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#006c49] hover:underline dark:text-[#6ffbbe]"
                >
                    <UserPlus className="size-3.5" />
                    Add New
                </button>
            </div>

            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="flex w-full items-center gap-3 rounded-2xl border border-[#e5e7eb] bg-[#fafafa] p-3 text-left transition-all hover:bg-white focus:border-[#006c49]/40 focus:ring-2 focus:ring-[#006c49]/10 dark:border-white/[0.08] dark:bg-[#1a1a1a] dark:hover:bg-[#222]"
            >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white dark:bg-[#111] shadow-sm">
                    <User className="size-5 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold text-foreground">
                        {selectedCustomer ? selectedCustomer.name : "Walk-in Customer"}
                    </p>
                    <p className="truncate text-[12px] text-muted-foreground">
                        {selectedCustomer ? selectedCustomer.phone : "No account associated"}
                    </p>
                </div>
            </button>

            {isOpen && (
                <div className="absolute left-0 right-0 top-full z-50 mt-2 rounded-[1.5rem] border border-[#f0f2f4] bg-white p-2 shadow-2xl dark:border-white/[0.08] dark:bg-[#141414]">
                    <div className="relative mb-2">
                        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                            autoFocus
                            type="text"
                            placeholder="Search customers..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full rounded-xl border border-[#f0f2f4] bg-[#fafafa] py-2.5 pl-10 pr-4 text-[13px] outline-none focus:border-[#006c49]/40 dark:border-white/[0.08] dark:bg-[#1a1a1a]"
                        />
                    </div>

                    <div className="max-h-[240px] overflow-y-auto custom-scrollbar">
                        <button
                            onClick={() => {
                                onSelect(null);
                                setIsOpen(false);
                            }}
                            className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-surface-elevated dark:hover:bg-white/[0.04]"
                        >
                            <div className="min-w-0">
                                <p className="text-[14px] font-medium text-foreground">Walk-in Customer</p>
                                <p className="text-[12px] text-muted-foreground">Default</p>
                            </div>
                            {!selectedId && <Check className="size-4 text-[#006c49] dark:text-[#6ffbbe]" />}
                        </button>

                        {isLoading ? (
                            <div className="flex items-center justify-center py-6">
                                <Loader2 className="size-5 animate-spin text-muted-foreground opacity-30" />
                            </div>
                        ) : (
                            filtered.map((c) => (
                                <button
                                    key={c.id}
                                    onClick={() => {
                                        onSelect(c);
                                        setIsOpen(false);
                                    }}
                                    className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-surface-elevated dark:hover:bg-white/[0.04]"
                                >
                                    <div className="min-w-0">
                                        <p className="text-[14px] font-medium text-foreground">{c.name}</p>
                                        <p className="text-[12px] text-muted-foreground">{c.phone}</p>
                                    </div>
                                    {selectedId === c.id && <Check className="size-4 text-[#006c49] dark:text-[#6ffbbe]" />}
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}

            {showAddModal && (
                <PosAddCustomerModal
                    onClose={() => setShowAddModal(false)}
                    onSuccess={(customer) => {
                        onSelect(customer);
                    }}
                />
            )}
        </div>
    );
}
