"use client";

import { ArrowLeft, Loader2, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import {
    GHANA_PAYMENT_METHODS,
    type GhanaPaymentMethodId,
    getPaymentMethod,
} from "./pos-payment-methods";
import type { PosPaymentCompletion } from "./pos-payment-completion";

function formatGhs(n: number): string {
    return new Intl.NumberFormat("en-GH", {
        style: "currency",
        currency: "GHS",
        minimumFractionDigits: 2,
    }).format(n);
}

function round2(n: number): number {
    return Math.round(n * 100) / 100;
}

type PayMode = "single" | "split" | "deposit" | "reserve_only";

type SplitRow = { id: string; methodId: GhanaPaymentMethodId; amountStr: string };

function newRow(): SplitRow {
    return { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, methodId: "cash", amountStr: "" };
}

export function PosPaymentStep({
    totalGhs,
    onBack,
    onComplete,
    isProcessing = false,
    allowCreditDeposit,
    layawayMode = false,
}: {
    totalGhs: number;
    onBack: () => void;
    onComplete: (payload: PosPaymentCompletion) => void;
    isProcessing?: boolean;
    /** True when a customer is selected on the cart (required for partial / on-account). */
    allowCreditDeposit: boolean;
    /** Customer order (pay & pickup later): balance stays on the order, not AR. Enables reserve without payment. */
    layawayMode?: boolean;
}) {
    const total = round2(totalGhs);
    const [mode, setMode] = useState<PayMode>("single");

    const [methodId, setMethodId] = useState<GhanaPaymentMethodId>("cash");
    const [tenderInput, setTenderInput] = useState("");

    const [splitRows, setSplitRows] = useState<SplitRow[]>(() => [newRow(), newRow()]);

    const method = getPaymentMethod(methodId);
    const usesCash = method?.usesTenderAndChange ?? false;

    const tenderedNum = useMemo(() => {
        const n = parseFloat(tenderInput.replace(",", "."));
        return Number.isFinite(n) ? n : 0;
    }, [tenderInput]);

    const changeGhs = useMemo(() => {
        if (!usesCash) return 0;
        return Math.max(0, round2(tenderedNum - total));
    }, [usesCash, tenderedNum, total]);

    const singleCanPay = useMemo(() => {
        if (!method || isProcessing) return false;
        if (usesCash) return tenderedNum >= total && tenderedNum > 0;
        return true;
    }, [method, usesCash, tenderedNum, total, isProcessing]);

    const multiSum = useMemo(() => {
        let s = 0;
        for (const r of splitRows) {
            const n = parseFloat(r.amountStr.replace(",", "."));
            if (Number.isFinite(n) && n > 0) s += n;
        }
        return round2(s);
    }, [splitRows]);

    const multiRemaining = round2(total - multiSum);

    const multiOverpay = round2(Math.max(0, multiSum - total));

    const splitCanPay =
        mode === "split" &&
        !isProcessing &&
        multiSum > 0 &&
        multiSum >= total - 0.02;

    const depositCanPay =
        mode === "deposit" &&
        allowCreditDeposit &&
        !isProcessing &&
        multiSum > 0 &&
        multiRemaining > 0.02;

    const reserveOnlyCanPay =
        mode === "reserve_only" &&
        layawayMode &&
        allowCreditDeposit &&
        !isProcessing;

    const canPay =
        (mode === "single" && singleCanPay) ||
        splitCanPay ||
        depositCanPay ||
        reserveOnlyCanPay;

    function updateRow(id: string, patch: Partial<SplitRow>) {
        setSplitRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    }

    function removeRow(id: string) {
        setSplitRows((prev) => (prev.length <= 1 ? prev : prev.filter((r) => r.id !== id)));
    }

    function handlePay() {
        if (!canPay || isProcessing) return;

        if (mode === "reserve_only") {
            onComplete({ kind: "reserve_only" });
            return;
        }

        if (mode === "single") {
            if (!method) return;
            if (usesCash) {
                onComplete({
                    kind: "single",
                    methodId,
                    amountTenderedGhs: tenderedNum,
                    changeGhs,
                });
            } else {
                onComplete({
                    kind: "single",
                    methodId,
                    amountTenderedGhs: total,
                    changeGhs: 0,
                });
            }
            return;
        }

        const lines: { methodId: GhanaPaymentMethodId; amountGhs: number }[] = [];
        for (const r of splitRows) {
            const n = round2(parseFloat(r.amountStr.replace(",", ".")));
            if (Number.isFinite(n) && n > 0) {
                lines.push({ methodId: r.methodId, amountGhs: n });
            }
        }
        if (lines.length === 0) return;
        onComplete({ kind: "multi", lines });
    }

    return (
        <div className="mx-auto min-h-0 max-w-3xl px-3 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-8">
            <button
                type="button"
                onClick={onBack}
                disabled={isProcessing}
                className="tap-target mb-5 inline-flex min-h-[44px] items-center gap-2 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50 sm:mb-6"
            >
                <ArrowLeft className="size-4" strokeWidth={2} />
                Back to sale
            </button>

            <div className="rounded-[1.25rem] border border-[#eef0f2] bg-white p-4 shadow-sm dark:border-white/[0.08] dark:bg-[#111] sm:p-6">
                <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-foreground sm:text-xl">
                    Payment
                </h2>
                <p className="mt-1 text-[13px] text-muted-foreground">
                    {layawayMode
                        ? "Pay in full, split tender, partial payment (balance on this order), or reserve stock with no payment today."
                        : "One method, split between MoMo and cash, or a deposit with balance on the customer&apos;s account."}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                    {(
                        [
                            ["single", "Single method"],
                            ["split", "Split payment"],
                            [
                                "deposit",
                                layawayMode ? "Partial (balance on order)" : "Pay deposit (owe rest)",
                            ],
                            ...(layawayMode ? ([["reserve_only", "Reserve only"]] as const) : []),
                        ] as [string, string][]
                    ).map(([id, label]) => (
                        <button
                            key={id}
                            type="button"
                            disabled={
                                isProcessing ||
                                (id === "deposit" && !allowCreditDeposit) ||
                                (id === "reserve_only" && !layawayMode)
                            }
                            onClick={() => setMode(id as PayMode)}
                            title={
                                id === "deposit" && !allowCreditDeposit
                                    ? "Select a customer on the cart first"
                                    : undefined
                            }
                            className={`rounded-xl px-3 py-2 text-[12px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
                                mode === id
                                    ? "bg-[#006c49] text-white dark:bg-[#6ffbbe] dark:text-[#003527]"
                                    : "border border-[#e5e7eb] bg-[#fafafa] dark:border-white/10 dark:bg-[#1a1a1a]"
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>
                {mode === "deposit" && !allowCreditDeposit ? (
                    <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
                        Choose a <strong>customer</strong> in the cart first —{" "}
                        {layawayMode
                            ? "required for customer orders and partial payments."
                            : "the balance is tracked on their account."}
                    </p>
                ) : null}
                {mode === "reserve_only" && !allowCreditDeposit ? (
                    <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
                        Select a <strong>customer</strong> on the cart to reserve stock against their name.
                    </p>
                ) : null}

                <div className="mt-6 rounded-2xl border border-[#eef0f2] bg-[#fafafa] px-4 py-4 dark:border-white/[0.08] dark:bg-[#141414]">
                    <p className="text-[12px] font-medium uppercase tracking-wide text-muted-foreground">Invoice total</p>
                    <p className="mt-1 font-[family-name:var(--font-display)] text-2xl font-semibold tabular-nums text-foreground">
                        {formatGhs(total)}
                    </p>
                </div>

                {mode === "reserve_only" ? (
                    <p className="mt-8 text-[13px] leading-relaxed text-muted-foreground">
                        Units will be reserved so other sales cannot use them. No payment is recorded yet — add payments
                        from <strong>Customer orders</strong> or the customer profile, then complete pickup when paid.
                    </p>
                ) : mode === "single" ? (
                    <>
                        <fieldset className="mt-8 space-y-3" disabled={isProcessing}>
                            <legend className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
                                Payment method
                            </legend>
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                {GHANA_PAYMENT_METHODS.map((m) => {
                                    const selected = methodId === m.id;
                                    const Icon = m.icon;
                                    return (
                                        <button
                                            key={m.id}
                                            type="button"
                                            onClick={() => {
                                                setMethodId(m.id);
                                                if (!m.usesTenderAndChange) setTenderInput("");
                                            }}
                                            className={`tap-target flex min-h-[52px] items-start gap-3 rounded-2xl border px-4 py-3 text-left transition-[border-color,background-color,box-shadow] ${
                                                selected
                                                    ? "border-[#006c49]/40 bg-[#006c49]/[0.06] shadow-[0_0_0_1px_rgba(0,108,73,0.15)] dark:border-[#6ffbbe]/35 dark:bg-[#6ffbbe]/[0.07]"
                                                    : "border-[#e5e7eb] bg-white hover:border-[#d1d5db] dark:border-white/[0.1] dark:bg-[#1a1a1a] dark:hover:border-white/[0.15]"
                                            }`}
                                        >
                                            <span
                                                className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl ${
                                                    selected
                                                        ? "bg-[#003527]/10 text-[#006c49] dark:bg-[#6ffbbe]/15 dark:text-[#6ffbbe]"
                                                        : "bg-[#f4f4f5] text-muted-foreground dark:bg-[#262626]"
                                                }`}
                                            >
                                                <Icon className="size-[18px]" strokeWidth={1.75} />
                                            </span>
                                            <span className="min-w-0">
                                                <span className="block text-[14px] font-medium text-foreground">{m.label}</span>
                                                <span className="mt-0.5 block text-[12px] text-muted-foreground">{m.hint}</span>
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </fieldset>

                        {usesCash ? (
                            <div className="mt-8 space-y-4">
                                <div>
                                    <label
                                        htmlFor="amount-tendered"
                                        className="text-[12px] font-medium text-muted-foreground"
                                    >
                                        Amount received (GHS)
                                    </label>
                                    <input
                                        id="amount-tendered"
                                        type="text"
                                        inputMode="decimal"
                                        disabled={isProcessing}
                                        value={tenderInput}
                                        onChange={(e) => setTenderInput(e.target.value)}
                                        placeholder="0.00"
                                        className="tap-target mt-2 min-h-[48px] w-full rounded-xl border border-[#e5e7eb] bg-white px-4 text-[16px] font-medium tabular-nums text-foreground outline-none transition-[border-color,box-shadow] focus:border-[#006c49]/45 focus:ring-2 focus:ring-[#006c49]/15 dark:border-white/[0.12] dark:bg-[#141414] dark:focus:border-[#6ffbbe]/40 dark:focus:ring-[#6ffbbe]/12"
                                    />
                                </div>
                                <div className="flex items-center justify-between rounded-2xl border border-dashed border-[#e5e7eb] bg-[#fafafa] px-4 py-3 dark:border-white/[0.1] dark:bg-[#141414]">
                                    <span className="text-[13px] font-medium text-muted-foreground">Change to give</span>
                                    <span className="font-[family-name:var(--font-display)] text-lg font-semibold tabular-nums text-foreground">
                                        {formatGhs(changeGhs)}
                                    </span>
                                </div>
                                {tenderInput && !singleCanPay && !isProcessing ? (
                                    <p className="text-[13px] text-red-600 dark:text-red-400">
                                        Amount received must be at least {formatGhs(total)}.
                                    </p>
                                ) : null}
                            </div>
                        ) : (
                            <p className="mt-6 text-[13px] leading-relaxed text-muted-foreground">
                                Customer pays{" "}
                                <span className="font-semibold text-foreground">{formatGhs(total)}</span> via{" "}
                                {method?.label}. Confirm when payment is successful.
                            </p>
                        )}
                    </>
                ) : (
                    <div className="mt-8 space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
                                {mode === "split"
                                    ? "Allocate by method"
                                    : layawayMode
                                      ? "Payment collected now (order balance)"
                                      : "Deposit collected now"}
                            </p>
                            <button
                                type="button"
                                disabled={isProcessing}
                                onClick={() => setSplitRows((p) => [...p, newRow()])}
                                className="inline-flex items-center gap-1 rounded-xl border border-[#e5e7eb] px-3 py-1.5 text-[12px] font-semibold dark:border-white/10"
                            >
                                <Plus className="size-3.5" />
                                Add line
                            </button>
                        </div>

                        <div className="space-y-3">
                            {splitRows.map((row) => (
                                <div
                                    key={row.id}
                                    className="flex flex-col gap-2 rounded-2xl border border-[#eef0f2] bg-[#fafafa] p-3 dark:border-white/[0.08] dark:bg-[#141414] sm:flex-row sm:items-center"
                                >
                                    <select
                                        disabled={isProcessing}
                                        value={row.methodId}
                                        onChange={(e) =>
                                            updateRow(row.id, {
                                                methodId: e.target.value as GhanaPaymentMethodId,
                                            })
                                        }
                                        className="min-h-[44px] flex-1 rounded-xl border border-[#e5e7eb] bg-white px-3 text-[14px] dark:border-white/12 dark:bg-[#111]"
                                    >
                                        {GHANA_PAYMENT_METHODS.map((m) => (
                                            <option key={m.id} value={m.id}>
                                                {m.shortLabel}
                                            </option>
                                        ))}
                                    </select>
                                    <input
                                        type="text"
                                        inputMode="decimal"
                                        disabled={isProcessing}
                                        placeholder="Amount"
                                        value={row.amountStr}
                                        onChange={(e) => updateRow(row.id, { amountStr: e.target.value })}
                                        className="min-h-[44px] w-full rounded-xl border border-[#e5e7eb] bg-white px-3 text-[14px] tabular-nums sm:w-36 dark:border-white/12 dark:bg-[#111]"
                                    />
                                    <button
                                        type="button"
                                        disabled={isProcessing || splitRows.length <= 1}
                                        onClick={() => removeRow(row.id)}
                                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted disabled:opacity-30"
                                        aria-label="Remove line"
                                    >
                                        <Trash2 className="size-4" />
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div className="rounded-2xl border border-dashed border-[#e5e7eb] bg-white px-4 py-3 text-[13px] dark:border-white/10 dark:bg-[#1a1a1a]">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Collected</span>
                                <span className="font-semibold tabular-nums">{formatGhs(multiSum)}</span>
                            </div>
                            <div className="mt-1 flex justify-between">
                                <span className="text-muted-foreground">
                                    {mode === "split"
                                        ? multiOverpay > 0.02
                                            ? "Change to give"
                                            : "Remaining"
                                        : "Still owed"}
                                </span>
                                <span
                                    className={`font-semibold tabular-nums ${mode === "split" && multiOverpay <= 0.02 && multiRemaining > 0.02 ? "text-amber-700 dark:text-amber-300" : ""}`}
                                >
                                    {mode === "split" && multiOverpay > 0.02
                                        ? formatGhs(multiOverpay)
                                        : formatGhs(Math.max(0, multiRemaining))}
                                </span>
                            </div>
                            {mode === "split" && multiOverpay > 0.02 ? (
                                <p className="mt-2 text-[12px] text-muted-foreground">
                                    Collected more than the invoice total. The difference is change due to the customer.
                                </p>
                            ) : null}
                            {mode === "split" && multiSum > 0 && multiRemaining > 0.02 ? (
                                <p className="mt-2 text-[12px] text-muted-foreground">
                                    Split payment must cover the full total. Use{" "}
                                    <strong>{layawayMode ? "Partial (balance on order)" : "Pay deposit"}</strong> to
                                    leave a balance{layawayMode ? " on this order" : " on account"}.
                                </p>
                            ) : null}
                        </div>
                    </div>
                )}

                <button
                    type="button"
                    disabled={!canPay || isProcessing}
                    onClick={handlePay}
                    className="tap-target mt-8 flex min-h-[52px] w-full items-center justify-center rounded-2xl bg-gradient-to-br from-[#003527] to-[#064e3b] py-3.5 text-[16px] font-semibold text-white shadow-[0_8px_24px_-8px_rgba(0,53,39,0.45)] transition-[filter] hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45 dark:shadow-[0_8px_24px_-8px_rgba(0,0,0,0.5)]"
                >
                    {isProcessing ? (
                        <Loader2 className="size-5 animate-spin" />
                    ) : mode === "reserve_only" ? (
                        "Reserve stock"
                    ) : layawayMode ? (
                        "Create customer order"
                    ) : (
                        "Complete payment"
                    )}
                </button>
            </div>
        </div>
    );
}
