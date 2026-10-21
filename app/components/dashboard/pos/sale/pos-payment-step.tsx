"use client";

import { ArrowLeft, Loader2, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  GHANA_PAYMENT_METHODS,
  type GhanaPaymentMethodId,
  getPaymentMethod,
} from "./pos-payment-methods";
import { parseAmountInput } from "@/app/lib/parse-amount";
import { AmountInput } from "@/app/components/dashboard/ui/amount-input";
import { cn } from "@/lib/utils";
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
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    methodId: "cash",
    amountStr: "",
  };
}

export function PosPaymentStep({
  totalGhs,
  onBack,
  onComplete,
  isProcessing = false,
  allowCreditDeposit,
  layawayMode = false,
  fillHeight = false,
  className,
}: {
  totalGhs: number;
  onBack: () => void;
  onComplete: (payload: PosPaymentCompletion) => void;
  isProcessing?: boolean;
  /** True when a customer is selected on the cart (required for partial / on-account). */
  allowCreditDeposit: boolean;
  /** Customer order / layaway: partial payment leaves a balance on the order. */
  layawayMode?: boolean;
  /** Fill the viewport and pin the pay button — phones and POS handhelds only. */
  fillHeight?: boolean;
  className?: string;
}) {
  const total = round2(totalGhs);
  const [mode, setMode] = useState<PayMode>("single");

  const [methodId, setMethodId] = useState<GhanaPaymentMethodId>("cash");
  const [tenderInput, setTenderInput] = useState(() => total.toFixed(2));

  const [splitRows, setSplitRows] = useState<SplitRow[]>(() => [newRow(), newRow()]);

  const method = getPaymentMethod(methodId);
  const usesCash = method?.usesTenderAndChange ?? false;

  useEffect(() => {
    setTenderInput(total.toFixed(2));
  }, [total]);

  const tenderedNum = useMemo(() => {
    const n = parseAmountInput(tenderInput);
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
      const n = parseAmountInput(r.amountStr);
      if (Number.isFinite(n) && n > 0) s += n;
    }
    return round2(s);
  }, [splitRows]);

  const multiRemaining = round2(total - multiSum);
  const multiOverpay = round2(Math.max(0, multiSum - total));

  const splitCanPay =
    mode === "split" && !isProcessing && multiSum > 0 && multiSum >= total - 0.02;

  const depositCanPay =
    mode === "deposit" &&
    allowCreditDeposit &&
    !isProcessing &&
    multiSum > 0 &&
    multiRemaining > 0.02;

  const reserveOnlyCanPay =
    mode === "reserve_only" && layawayMode && allowCreditDeposit && !isProcessing;

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
      const n = round2(parseAmountInput(r.amountStr));
      if (Number.isFinite(n) && n > 0) {
        lines.push({ methodId: r.methodId, amountGhs: n });
      }
    }
    if (lines.length === 0) return;
    onComplete({ kind: "multi", lines });
  }

  const modeOptions = (
    [
      ["single", "Single"],
      ["split", "Split"],
      [
        "deposit",
        layawayMode ? "Partial" : "Deposit",
      ],
      ...(layawayMode ? ([["reserve_only", "Reserve"]] as const) : []),
    ] as [PayMode, string][]
  );

  return (
    <div
      className={cn(
        "mx-auto flex min-h-0 w-full max-w-4xl flex-col px-2 py-2",
        fillHeight && "max-lg:h-full",
        "lg:h-auto lg:px-6 lg:py-7",
        className,
      )}
    >
      <button
        type="button"
        onClick={onBack}
        disabled={isProcessing}
        className="mb-2 inline-flex h-8 w-fit items-center gap-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50 lg:mb-4 lg:h-10 lg:text-[13px]"
      >
        <ArrowLeft className="size-3.5 lg:size-4" strokeWidth={2} />
        <span className="lg:hidden">Back</span>
        <span className="hidden lg:inline">Back to sale</span>
      </button>

      <div
        className={cn(
          "flex min-h-0 flex-col overflow-hidden rounded-xl border border-[#e5e7eb] bg-white dark:border-white/[0.08] dark:bg-[#111]",
          fillHeight && "max-lg:flex-1",
          "lg:flex-none lg:rounded-[1.5rem] lg:shadow-[0_1px_3px_rgba(15,23,42,0.04)] dark:lg:shadow-none",
        )}
      >
        {/* Header */}
        <div className="shrink-0 border-b border-[#eef0f2] px-3 py-2.5 dark:border-white/[0.06] lg:px-7 lg:py-6">
          <div className="flex items-center justify-between gap-3 lg:items-end">
            <div className="min-w-0">
              <p className="hidden text-[11px] font-semibold uppercase tracking-[0.14em] text-[#006c49] lg:block dark:text-[#6ffbbe]">
                Checkout
              </p>
              <h2 className="font-[family-name:var(--font-display)] text-base font-semibold tracking-tight text-foreground lg:mt-1 lg:text-[1.75rem]">
                Payment
              </h2>
              <p className="mt-1 hidden max-w-xl text-[13px] leading-relaxed text-muted-foreground lg:block">
                {layawayMode
                  ? "Pay in full, split tender, collect a partial amount, or reserve stock for later."
                  : "Choose how the customer is paying — one method, a split, or a deposit with balance on account."}
              </p>
            </div>

            <div className="shrink-0 rounded-xl border border-[#e5e7eb] bg-[#f8faf9] px-3 py-1.5 dark:border-white/[0.1] dark:bg-[#0c0c0c] lg:min-w-[12.5rem] lg:rounded-2xl lg:px-5 lg:py-4">
              <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-muted-foreground lg:text-[11px]">
                <span className="lg:hidden">Total</span>
                <span className="hidden lg:inline">Invoice total</span>
              </p>
              <p className="font-[family-name:var(--font-display)] text-base font-semibold tabular-nums leading-none text-foreground lg:mt-1 lg:text-[1.75rem]">
                {formatGhs(total)}
              </p>
            </div>
          </div>

          {/* Mode segmented control */}
          <div
            className="mt-2.5 inline-flex max-w-full flex-wrap gap-0.5 rounded-full border border-[#e5e7eb] bg-[#f4f5f6] p-0.5 dark:border-white/[0.1] dark:bg-[#1a1a1a] lg:mt-5 lg:gap-1 lg:p-1"
            role="tablist"
            aria-label="Payment mode"
          >
            {modeOptions.map(([id, label]) => {
              const disabled =
                isProcessing ||
                (id === "deposit" && !allowCreditDeposit) ||
                (id === "reserve_only" && !layawayMode);
              const active = mode === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  disabled={disabled}
                  onClick={() => setMode(id)}
                  title={
                    id === "deposit" && !allowCreditDeposit
                      ? "Select a customer on the cart first"
                      : undefined
                  }
                  className={`h-8 rounded-full px-2.5 text-[12px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 lg:h-auto lg:min-h-0 lg:px-4 lg:py-2 lg:text-[13px] ${
                    active
                      ? "bg-white text-foreground shadow-sm dark:bg-[#262626] dark:text-white"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {mode === "deposit" && !allowCreditDeposit ? (
            <p className="mt-2 rounded-lg border border-amber-200/80 bg-amber-50 px-2.5 py-1.5 text-[11px] leading-snug text-amber-950 lg:mt-4 lg:rounded-xl lg:px-3.5 lg:py-2.5 lg:text-[12px] dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
              Choose a <strong>customer</strong> in the cart first —{" "}
              {layawayMode
                ? "required for customer orders and partial payments."
                : "the balance is tracked on their account."}
            </p>
          ) : null}
          {mode === "reserve_only" && !allowCreditDeposit ? (
            <p className="mt-2 rounded-lg border border-amber-200/80 bg-amber-50 px-2.5 py-1.5 text-[11px] leading-snug text-amber-950 lg:mt-4 lg:rounded-xl lg:px-3.5 lg:py-2.5 lg:text-[12px] dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
              Select a <strong>customer</strong> on the cart to reserve stock against their name.
            </p>
          ) : null}
        </div>

        {/* Body */}
        <div
          className={cn(
            "min-h-0 px-3 py-3",
            fillHeight && "max-lg:flex-1 max-lg:overflow-y-auto max-lg:overscroll-contain",
            "lg:overflow-visible lg:px-7 lg:py-6",
          )}
        >
          {mode === "reserve_only" ? (
            <div className="rounded-2xl border border-dashed border-[#d7dce0] bg-[#fafafa] px-5 py-6 dark:border-white/[0.1] dark:bg-[#141414]">
              <p className="text-[14px] leading-relaxed text-muted-foreground">
                Units will be reserved so other sales cannot use them. No payment is recorded yet —
                add payments from <strong className="text-foreground">Customer orders</strong> or
                the customer profile, then complete pickup when paid.
              </p>
            </div>
          ) : mode === "single" ? (
            <div className="grid gap-3 lg:grid-cols-[1.15fr_0.85fr] lg:gap-8">
              <fieldset disabled={isProcessing} className="min-w-0">
                <legend className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground lg:mb-3 lg:text-[11px]">
                  Payment method
                </legend>
                <div className="grid grid-cols-2 gap-1.5 lg:gap-2.5">
                  {GHANA_PAYMENT_METHODS.map((m) => {
                    const selected = methodId === m.id;
                    const Icon = m.icon;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setMethodId(m.id);
                          if (m.usesTenderAndChange) {
                            setTenderInput((prev) =>
                              prev.trim() ? prev : total.toFixed(2),
                            );
                          }
                        }}
                        className={`group flex min-h-[48px] items-center gap-2 rounded-xl border px-2 py-1.5 text-left transition-colors lg:min-h-[64px] lg:gap-3 lg:rounded-2xl lg:px-3.5 lg:py-3 ${
                          selected
                            ? "border-[#006c49] bg-[#006c49]/[0.07] dark:border-[#6ffbbe] dark:bg-[#6ffbbe]/[0.08]"
                            : "border-[#e5e7eb] bg-white hover:border-[#cfd4d9] hover:bg-[#fafafa] dark:border-white/[0.1] dark:bg-[#141414] dark:hover:border-white/[0.16] dark:hover:bg-[#1a1a1a]"
                        }`}
                      >
                        <span
                          className={`flex size-8 shrink-0 items-center justify-center rounded-lg lg:size-10 lg:rounded-xl ${
                            selected
                              ? "bg-[#003527] text-white dark:bg-[#6ffbbe] dark:text-[#003527]"
                              : "bg-[#f0f2f4] text-muted-foreground dark:bg-[#262626]"
                          }`}
                        >
                          <Icon className="size-[18px]" strokeWidth={1.75} />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[12px] font-semibold text-foreground lg:text-[14px]">
                            {m.label}
                          </span>
                          <span className="mt-0.5 hidden truncate text-[12px] text-muted-foreground lg:block">
                            {m.hint}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <div className="min-w-0">
                {usesCash ? (
                  <div className="flex h-full flex-col rounded-xl border border-[#e5e7eb] bg-[#f8faf9] p-2.5 dark:border-white/[0.1] dark:bg-[#0c0c0c] lg:rounded-2xl lg:p-5">
                    <label
                      htmlFor="amount-tendered"
                      className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
                    >
                      Amount received
                    </label>
                    <div className="relative mt-2 lg:mt-3">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[12px] font-semibold text-muted-foreground lg:left-4 lg:text-[14px]">
                        GHS
                      </span>
                      <AmountInput
                        id="amount-tendered"
                        disabled={isProcessing}
                        value={tenderInput}
                        onChange={setTenderInput}
                        placeholder="0.00"
                        className="h-10 w-full rounded-xl border border-[#d7dce0] bg-white pl-12 pr-3 text-[18px] font-semibold tabular-nums text-foreground outline-none focus:border-[#006c49] dark:border-white/[0.12] dark:bg-[#141414] lg:h-14 lg:min-h-[56px] lg:pl-14 lg:pr-4 lg:text-[22px] lg:focus:ring-4 lg:focus:ring-[#006c49]/12"
                      />
                    </div>

                    <div className="mt-2 flex items-center justify-between rounded-lg bg-white px-3 py-2 dark:bg-[#141414] lg:mt-4 lg:rounded-xl lg:px-4 lg:py-3">
                      <span className="text-[12px] font-medium text-muted-foreground lg:text-[13px]">
                        <span className="lg:hidden">Change</span>
                        <span className="hidden lg:inline">Change to give</span>
                      </span>
                      <span className="font-[family-name:var(--font-display)] text-[15px] font-semibold tabular-nums text-foreground lg:text-lg">
                        {formatGhs(changeGhs)}
                      </span>
                    </div>

                    {tenderInput && !singleCanPay && !isProcessing ? (
                      <p className="mt-3 text-[13px] font-medium text-red-600 dark:text-red-400">
                        Amount received must be at least {formatGhs(total)}.
                      </p>
                    ) : (
                      <p className="mt-2 hidden text-[12px] leading-relaxed text-muted-foreground lg:mt-3 lg:block">
                        Exact total is pre-filled. Adjust if the customer pays with more cash.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex h-full flex-col justify-center rounded-xl border border-[#e5e7eb] bg-[#f8faf9] p-3 dark:border-white/[0.1] dark:bg-[#0c0c0c] lg:rounded-2xl lg:p-5">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground lg:text-[11px]">
                      Amount due
                    </p>
                    <p className="mt-1 font-[family-name:var(--font-display)] text-xl font-semibold tabular-nums text-foreground lg:mt-2 lg:text-3xl">
                      {formatGhs(total)}
                    </p>
                    <p className="mt-1.5 text-[12px] leading-relaxed text-muted-foreground lg:mt-3 lg:text-[13px]">
                      Confirm when the customer has paid via{" "}
                      <span className="font-semibold text-foreground">{method?.label}</span>.
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  {mode === "split"
                    ? "Allocate by method"
                    : layawayMode
                      ? "Payment collected now"
                      : "Deposit collected now"}
                </p>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={() => setSplitRows((p) => [...p, newRow()])}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#e5e7eb] bg-white px-3 py-1.5 text-[12px] font-semibold text-foreground transition-colors hover:bg-[#fafafa] dark:border-white/10 dark:bg-[#141414] dark:hover:bg-[#1a1a1a]"
                >
                  <Plus className="size-3.5" />
                  Add line
                </button>
              </div>

              <div className="space-y-2.5">
                {splitRows.map((row) => (
                  <div
                    key={row.id}
                    className="flex flex-col gap-2 rounded-2xl border border-[#e5e7eb] bg-[#fafafa] p-3 dark:border-white/[0.08] dark:bg-[#141414] sm:flex-row sm:items-center"
                  >
                    <select
                      disabled={isProcessing}
                      value={row.methodId}
                      onChange={(e) =>
                        updateRow(row.id, {
                          methodId: e.target.value as GhanaPaymentMethodId,
                        })
                      }
                    className="min-h-9 flex-1 rounded-xl border border-[#e5e7eb] bg-white px-2.5 text-[14px] dark:border-white/12 dark:bg-[#111] lg:min-h-[44px] lg:px-3"
                    >
                      {GHANA_PAYMENT_METHODS.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.shortLabel}
                        </option>
                      ))}
                    </select>
                    <AmountInput
                      disabled={isProcessing}
                      placeholder="Amount"
                      value={row.amountStr}
                      onChange={(next) => updateRow(row.id, { amountStr: next })}
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

              <div className="grid gap-3 rounded-2xl border border-[#e5e7eb] bg-white p-4 sm:grid-cols-2 dark:border-white/[0.1] dark:bg-[#0c0c0c]">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                    Collected
                  </p>
                  <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
                    {formatGhs(multiSum)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                    {mode === "split"
                      ? multiOverpay > 0.02
                        ? "Change to give"
                        : "Remaining"
                      : "Still owed"}
                  </p>
                  <p
                    className={`mt-1 text-lg font-semibold tabular-nums ${
                      mode === "split" && multiOverpay <= 0.02 && multiRemaining > 0.02
                        ? "text-amber-700 dark:text-amber-300"
                        : "text-foreground"
                    }`}
                  >
                    {mode === "split" && multiOverpay > 0.02
                      ? formatGhs(multiOverpay)
                      : formatGhs(Math.max(0, multiRemaining))}
                  </p>
                </div>
                {mode === "split" && multiOverpay > 0.02 ? (
                  <p className="text-[12px] text-muted-foreground sm:col-span-2">
                    Collected more than the invoice total. The difference is change due to the
                    customer.
                  </p>
                ) : null}
                {mode === "split" && multiSum > 0 && multiRemaining > 0.02 ? (
                  <p className="text-[12px] text-muted-foreground sm:col-span-2">
                    Split payment must cover the full total. Use{" "}
                    <strong>{layawayMode ? "Partial" : "Deposit"}</strong> to leave a balance
                    {layawayMode ? " on this order" : " on account"}.
                  </p>
                ) : null}
              </div>
            </div>
          )}
        </div>

        {/* Footer CTA */}
        <div className="shrink-0 border-t border-[#eef0f2] bg-[#fafafa] px-3 py-2.5 dark:border-white/[0.06] dark:bg-[#0c0c0c] lg:px-7 lg:py-4">
          <button
            type="button"
            disabled={!canPay || isProcessing}
            onClick={handlePay}
            className="flex h-11 w-full items-center justify-center rounded-xl bg-gradient-to-br from-[#003527] to-[#064e3b] text-[13px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45 lg:min-h-[56px] lg:rounded-2xl lg:py-3.5 lg:text-[15px] lg:shadow-[0_8px_24px_-8px_rgba(0,53,39,0.45)] lg:hover:brightness-105"
          >
            {isProcessing ? (
              <Loader2 className="size-5 animate-spin" />
            ) : mode === "reserve_only" ? (
              "Reserve stock"
            ) : layawayMode ? (
              "Create customer order"
            ) : (
              `Complete payment · ${formatGhs(total)}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
