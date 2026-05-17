"use client";

import useSWR from "swr";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { ExpenseForm, type ExpenseFormInitialValues } from "./expense-form";

const fetcher = (u: string) =>
    fetch(u).then((r) => {
        if (!r.ok) throw new Error("failed");
        return r.json();
    });

export function ExpenseEditView({ expenseId }: { expenseId: string }) {
    const { data, error, isLoading } = useSWR(`/api/finance/expenses/${expenseId}`, fetcher);

    if (isLoading) {
        return (
            <div className="flex min-h-[40vh] items-center justify-center">
                <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (error || !data?.id) {
        return (
            <div className="p-8 text-center text-destructive">
                Could not load expense.{" "}
                <Link href="/dashboard/finance/expenses" className="underline">
                    Back to list
                </Link>
            </div>
        );
    }

    const initial: ExpenseFormInitialValues = {
        id: data.id,
        description: data.description,
        amount: String(data.amount),
        category: data.category,
        status: data.status,
        date: typeof data.date === "string" ? data.date.slice(0, 10) : "",
        vendor: data.vendor ?? "",
        paymentMethod: data.paymentMethod ?? "cash",
        receiptSrc: null,
        receiptUrl: data.receiptUrl ?? null,
    };

    return (
        <ExpenseForm
            mode="edit"
            initial={initial}
            title="Edit expense"
            shellDescription="Update amount, category, payment method, or receipt."
        />
    );
}
