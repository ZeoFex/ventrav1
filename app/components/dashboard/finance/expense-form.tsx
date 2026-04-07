"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useSWRConfig } from "swr";
import { ArrowLeft, UploadCloud, X, Loader2 } from "lucide-react";
import { ProductsPageShell } from "../products/products-page-shell";
import { useOnlineStatus } from "@/app/lib/offline/use-online-status";
import { addToSyncQueue, cacheExpense } from "@/app/lib/offline/offline-db";
import { toast } from "sonner";

export type ExpenseFormInitialValues = {
    description: string;
    amount: string;
    category: string;
    status: "Paid" | "Pending";
    date: string;
    receiptSrc: string | null;
};

type ExpenseFormProps = {
    mode: "new" | "edit";
    initial: ExpenseFormInitialValues;
    title: string;
    shellDescription: string;
};

const EXPENSE_CATEGORIES = [
    "Payroll",
    "Inventory",
    "Utilities",
    "Marketing",
    "Logistics",
    "Maintenance",
    "Misc",
];

export function ExpenseForm({
    mode,
    initial,
    title,
    shellDescription,
}: ExpenseFormProps) {
    const router = useRouter();
    const { mutate } = useSWRConfig();
    const { isOnline } = useOnlineStatus();
    const [savedHint, setSavedHint] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const [description, setDescription] = useState(initial.description);
    const [amount, setAmount] = useState(initial.amount);
    const [category, setCategory] = useState(initial.category);
    const [status, setStatus] = useState<"Paid" | "Pending">(initial.status);
    const [date, setDate] = useState(initial.date);

    const blobUrlRef = useRef<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [receiptPreview, setReceiptPreview] = useState<string | null>(
        initial.receiptSrc
    );

    const revokeBlob = useCallback(() => {
        if (blobUrlRef.current) {
            URL.revokeObjectURL(blobUrlRef.current);
            blobUrlRef.current = null;
        }
    }, []);

    useEffect(() => {
        return () => revokeBlob();
    }, [revokeBlob]);

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        revokeBlob();

        if (!file || !file.type.startsWith("image/")) {
            setReceiptPreview(initial.receiptSrc ?? null);
            return;
        }

        const url = URL.createObjectURL(file);
        blobUrlRef.current = url;
        setReceiptPreview(url);
    }

    function clearFile() {
        revokeBlob();
        setReceiptPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    }

    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setIsSaving(true);

        try {
            const payload = {
                description,
                amountGhs: Number(amount),
                category,
                date,
                status
            };

            if (!isOnline) {
                // --- OFFLINE MODE ---
                const tempId = mode === "new" ? `off-exp-${Date.now()}` : (initial as any).id || `off-exp-${Date.now()}`;
                
                // 1. Queue for sync
                await addToSyncQueue({
                    type: "add-expense", // Currently sync engine only handles 'add-expense' generic
                    payload: payload
                });

                // 2. Cache locally for immediate view
                await cacheExpense({ ...payload, id: tempId, amount: Number(amount), _offline: true });

                toast.success("Expense saved locally. Will sync when online.");
                router.push("/dashboard/finance/expenses");
                return;
            }

            // --- ONLINE MODE ---
            const url = mode === "new" ? "/api/finance/expenses" : `/api/finance/expenses/${(initial as any).id}`;
            const method = mode === "new" ? "POST" : "PATCH";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error("Failed to save expense");

            mutate("/api/finance/overview");
            mutate("/api/finance/expenses");

            router.push("/dashboard/finance/expenses");
        } catch (error) {
            console.error(error);
            setIsSaving(false);
            setSavedHint(true);
            setTimeout(() => setSavedHint(false), 2500);
        }
    }

    return (
        <ProductsPageShell
            title={title}
            description={shellDescription}
            actions={
                <Link
                    href="/dashboard/finance/expenses"
                    className="inline-flex items-center gap-2 rounded-xl border border-[#e5e7eb] bg-white px-4 py-2.5 text-[14px] font-medium text-foreground hover:bg-[#fafafa] dark:border-white/[0.12] dark:bg-transparent dark:hover:bg-white/[0.04]"
                >
                    <ArrowLeft className="size-4" strokeWidth={2} />
                    Back to list
                </Link>
            }
        >
            {/* SUCCESS HINT */}
            {savedHint && (
                <div className="mb-6 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-[13px] text-red-600 dark:text-red-400">
                    Failed to save expense. Please try again.
                </div>
            )}

            <form
                onSubmit={handleSubmit}
                className="space-y-8 rounded-[1.25rem] border border-[#eef0f2] bg-surface-card p-6 shadow-[0_1px_3px_rgba(0,0,0,0.05)] dark:border-white/[0.08] dark:bg-[#111]"
            >
                {/* ================= BASIC INFO ================= */}
                <section className="space-y-4">
                    <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Expense Details
                    </h2>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label className="mb-1.5 block text-[13px] font-medium text-foreground">
                                Description
                            </label>
                            <input
                                required
                                placeholder="e.g. Office Supplies & Cleaning"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="w-full rounded-xl border border-[#e5e7eb] bg-white px-3 py-2.5 text-[14px] outline-none focus:border-[#006c49]/40 focus:ring-2 focus:ring-[#006c49]/20 dark:border-white/[0.12] dark:bg-[#141414]"
                            />
                        </div>

                        <div>
                            <label className="mb-1.5 block text-[13px] font-medium text-foreground">
                                Amount (GH₵)
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[14px] text-muted-foreground font-medium flex items-center">
                                    ₵
                                </span>
                                <input
                                    required
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    placeholder="0.00"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className="w-full rounded-xl border border-[#e5e7eb] bg-white px-3 py-2.5 pl-8 text-[14px] outline-none focus:border-[#006c49]/40 focus:ring-2 focus:ring-[#006c49]/20 dark:border-white/[0.12] dark:bg-[#141414]"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label className="mb-1.5 block text-[13px] font-medium text-foreground">
                                Date
                            </label>
                            <input
                                required
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full rounded-xl border border-[#e5e7eb] bg-white px-3 py-2.5 text-[14px] outline-none focus:border-[#006c49]/40 focus:ring-2 focus:ring-[#006c49]/20 dark:border-white/[0.12] dark:bg-[#141414] [color-scheme:light] dark:[color-scheme:dark]"
                            />
                        </div>

                        <div>
                            <label className="mb-1.5 block text-[13px] font-medium text-foreground">
                                Category
                            </label>
                            <select
                                required
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="w-full rounded-xl border border-[#e5e7eb] bg-white px-3 py-2.5 text-[14px] outline-none focus:border-[#006c49]/40 focus:ring-2 focus:ring-[#006c49]/20 dark:border-white/[0.12] dark:bg-[#141414]"
                            >
                                <option value="">Select category...</option>
                                {EXPENSE_CATEGORIES.map((cat) => (
                                    <option key={cat} value={cat}>
                                        {cat}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </section>

                {/* ================= STATUS ================= */}
                <section className="space-y-4 border-t border-[#f0f2f4] pt-6 dark:border-white/[0.06]">
                    <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Payment Status
                    </h2>

                    <select
                        value={status}
                        onChange={(e) => setStatus(e.target.value as "Paid" | "Pending")}
                        className="w-full max-w-sm rounded-xl border border-[#e5e7eb] bg-white px-3 py-2.5 text-[14px] outline-none focus:border-[#006c49]/40 focus:ring-2 focus:ring-[#006c49]/20 dark:border-white/[0.12] dark:bg-[#141414]"
                    >
                        <option value="Paid">Paid</option>
                        <option value="Pending">Pending / Unpaid</option>
                    </select>
                </section>

                {/* ================= RECEIPT / UPLOAD ================= */}
                <section className="space-y-4 border-t border-[#f0f2f4] pt-6 dark:border-white/[0.06]">
                    <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Receipt / Invoice Image
                    </h2>

                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                        <div className="relative flex min-h-32 w-full max-w-xs flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-[#e5e7eb] bg-[#fafafa] p-4 text-center transition-colors hover:border-[#006c49]/40 dark:border-white/[0.12] dark:bg-[#141414] dark:hover:border-[#6ffbbe]/40">
                            {receiptPreview ? (
                                <>
                                    <img
                                        src={receiptPreview}
                                        alt="Receipt"
                                        className="absolute inset-0 size-full object-cover"
                                    />
                                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
                                    <button
                                        type="button"
                                        onClick={clearFile}
                                        className="relative z-10 flex size-8 items-center justify-center rounded-lg bg-white/20 text-white shadow-sm ring-1 ring-white/30 backdrop-blur-md hover:bg-white/30"
                                    >
                                        <X className="size-4" />
                                    </button>
                                </>
                            ) : (
                                <div className="relative z-10 flex flex-col items-center gap-2">
                                    <div className="flex size-10 items-center justify-center rounded-full bg-white shadow-sm dark:bg-[#1a1a1a]">
                                        <UploadCloud className="size-4 text-muted-foreground" />
                                    </div>
                                    <div>
                                        <span className="text-[13px] font-medium text-foreground">
                                            Click to upload
                                        </span>
                                        <p className="text-[12px] text-muted-foreground">
                                            PNG, JPG up to 5MB
                                        </p>
                                    </div>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        onChange={handleFileChange}
                                        className="absolute inset-0 cursor-pointer opacity-0"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                {/* ================= ACTIONS ================= */}
                <div className="flex flex-col-reverse gap-3 border-t border-[#f0f2f4] pt-6 sm:flex-row sm:justify-end dark:border-white/[0.06]">
                    <Link
                        href="/dashboard/finance/expenses"
                        className="inline-flex justify-center rounded-xl border border-[#e5e7eb] bg-white px-5 py-2.5 text-[14px] font-medium text-foreground hover:bg-[#fafafa] dark:border-white/[0.12] dark:bg-transparent dark:hover:bg-white/[0.04]"
                    >
                        Cancel
                    </Link>

                    <button
                        type="submit"
                        disabled={isSaving}
                        className="inline-flex justify-center rounded-xl bg-gradient-to-br from-[#003527] to-[#064e3b] px-5 py-2.5 text-[14px] font-semibold text-white shadow-lg shadow-[#003527]/20 hover:brightness-105 disabled:opacity-70 disabled:pointer-events-none"
                    >
                        {isSaving ? (
                            <span className="flex items-center gap-2">
                                <Loader2 className="size-4 animate-spin" />
                                Saving...
                            </span>
                        ) : (
                            mode === "new" ? "Save expense" : "Save changes"
                        )}
                    </button>
                </div>
            </form>
        </ProductsPageShell>
    );
}
