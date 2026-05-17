"use client";

import { useState } from "react";
import { ExpenseForm, type ExpenseFormInitialValues } from "./expense-form";

function buildInitial(): ExpenseFormInitialValues {
    return {
        description: "",
        amount: "",
        category: "",
        status: "Paid",
        date: new Date().toISOString().split("T")[0]!,
        receiptSrc: null,
        vendor: "",
        paymentMethod: "cash",
        receiptUrl: null,
    };
}

export function ExpenseNewView() {
    const [initial] = useState(buildInitial);

    return (
        <ExpenseForm
            mode="new"
            initial={initial}
            title="Record new expense"
            shellDescription="Log a new operational expense or supply purchase."
        />
    );
}
