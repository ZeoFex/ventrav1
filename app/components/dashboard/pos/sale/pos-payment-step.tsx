"use client";

import { ArrowLeft, Loader2, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
  const [tenderInput, setTenderInput] = useState(() => total.toFixed(2));

  const [splitRows, setSplitRows] = useState<SplitRow[]>(() => [newRow(), newRow()]);

  const method = getPaymentMethod(methodId);
  const usesCash = method?.usesTenderAndChange ?? false;

  useEffect(() => {
    setTenderInput(total.toFixed(2));
  }, [total]);

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
      const n = round2(parseFloat(r.amountStr.replace(",", ".")));
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
    <div className="mx-auto flex min-h-0 w-full max-w-4xl flex-col px-3 py-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-7">
      <button
        type="button"
        onClick={onBack}
        disabled={isProcessing}
        className="tap-target mb-4 inline-flex min-h-[40px] w-fit items-center gap-2 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
      >
        <ArrowLeft className="size-4" strokeWidth={2} />
        Back to sale
      </button>

      <div className="overflow-hidden rounded-[1.5rem] border border-[#e5e7eb] bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)] dark:border-white/[0.08] dark:bg-[#111] dark:shadow-none">
        {/* Header */}
        <div className="border-b border-[#eef0f2] px-5 py-5 sm:px-7 sm:py-6 dark:border-white/[0.06]">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#006c49] dark:text-[#6ffbbe]">
                Checkout
              </p>
              <h2 className="mt-1 font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem]">
                Payment
              </h2>
              <p className="mt-1.5 max-w-xl text-[13px] leading-relaxed text-muted-foreground">
                {layawayMode
                  ? "Pay in full, split tender, collect a partial amount, or reserve stock for later."
                  : "Choose how the customer is paying — one method, a split, or a deposit with balance on account."}
              </p>
            </div>

            <div className="shrink-0 rounded-2xl border border-[#e5e7eb] bg-[#f8faf9] px-5 py-4 dark:border-white/[0.1] dark:bg-[#0c0c0c] sm:min-w-[12.5rem]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Invoice total
              </p>
              <p className="mt-1 font-[family-name:var(--font-display)] text-[1.75rem] font-semibold tabular-nums leading-none text-foreground">
                {formatGhs(total)}
              </p>
            </div>
          </div>

          {/* Mode segmented control */}
          <div
            className="mt-5 inline-flex max-w-full flex-wrap gap-1 rounded-full border border-[#e5e7eb] bg-[#f4f5f6] p-1 dark:border-white/[0.1] dark:bg-[#1a1a1a]"
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
                  className={`rounded-full px-4 py-2 text-[13px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
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
            <p className="mt-4 rounded-xl border border-amber-200/80 bg-amber-50 px-3.5 py-2.5 text-[12px] leading-relaxed text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
              Choose a <strong>customer</strong> in the cart first —{" "}
              {layawayMode
                ? "required for customer orders and partial payments."
                : "the balance is tracked on their account."}
            </p>
          ) : null}
          {mode === "reserve_only" && !allowCreditDeposit ? (
            <p className="mt-4 rounded-xl border border-amber-200/80 bg-amber-50 px-3.5 py-2.5 text-[12px] leading-relaxed text-amber-950 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
              Select a <strong>customer</strong> on the cart to reserve stock against their name.
            </p>
          ) : null}
        </div>

        {/* Body */}
        <div className="px-5 py-5 sm:px-7 sm:py-6">
          {mode === "reserve_only" ? (
            <div className="rounded-2xl border border-dashed border-[#d7dce0] bg-[#fafafa] px-5 py-6 dark:border-white/[0.1] dark:bg-[#141414]">
              <p className="text-[14px] leading-relaxed text-muted-foreground">
                Units will be reserved so other sales cannot use them. No payment is recorded yet —
                add payments from <strong className="text-foreground">Customer orders</strong> or
                the customer profile, then complete pickup when paid.
              </p>
            </div>
          ) : mode === "single" ? (
            <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] lg:gap-8">
              <fieldset disabled={isProcessing} className="min-w-0">
                <legend className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  Payment method
                </legend>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
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
                        className={`tap-target group flex min-h-[64px] items-center gap-3 rounded-2xl border px-3.5 py-3 text-left transition-colors ${
                          selected
                            ? "border-[#006c49] bg-[#006c49]/[0.07] dark:border-[#6ffbbe] dark:bg-[#6ffbbe]/[0.08]"
                            : "border-[#e5e7eb] bg-white hover:border-[#cfd4d9] hover:bg-[#fafafa] dark:border-white/[0.1] dark:bg-[#141414] dark:hover:border-white/[0.16] dark:hover:bg-[#1a1a1a]"
                        }`}
                      >
                        <span
                          className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${
                            selected
                              ? "bg-[#003527] text-white dark:bg-[#6ffbbe] dark:text-[#003527]"
                              : "bg-[#f0f2f4] text-muted-foreground dark:bg-[#262626]"
                          }`}
                        >
                          <Icon className="size-[18px]" strokeWidth={1.75} />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[14px] font-semibold text-foreground">
                            {m.label}
                          </span>
                          <span className="mt-0.5 block truncate text-[12px] text-muted-foreground">
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
                  <div className="flex h-full flex-col rounded-2xl border border-[#e5e7eb] bg-[#f8faf9] p-4 dark:border-white/[0.1] dark:bg-[#0c0c0c] sm:p-5">
                    <label
                      htmlFor="amount-tendered"
                      className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
                    >
                      Amount received
                    </label>
                    <div className="relative mt-3">
                      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[14px] font-semibold text-muted-foreground">
                        GHS
                      </span>
                      <input
                        id="amount-tendered"
                        type="text"
                        inputMode="decimal"
                        disabled={isProcessing}
                        value={tenderInput}
                        onChange={(e) => setTenderInput(e.target.value)}
                        placeholder="0.00"
                        className="tap-target min-h-[56px] w-full rounded-xl border border-[#d7dce0] bg-white pl-14 pr-4 text-[22px] font-semibold tabular-nums text-foreground outline-none transition-[border-color,box-shadow] focus:border-[#006c49] focus:ring-4 focus:ring-[#006c49]/12 dark:border-white/[0.12] dark:bg-[#141414] dark:focus:border-[#6ffbbe] dark:focus:ring-[#6ffbbe]/12"
                      />
                    </div>

                    <div className="mt-4 flex items-center justify-between rounded-xl bg-white px-4 py-3 dark:bg-[#141414]">
                      <span className="text-[13px] font-medium text-muted-foreground">
                        Change to give
                      </span>
                      <span className="font-[family-name:var(--font-display)] text-lg font-semibold tabular-nums text-foreground">
                        {formatGhs(changeGhs)}
                      </span>
                    </div>

                    {tenderInput && !singleCanPay && !isProcessing ? (
                      <p className="mt-3 text-[13px] font-medium text-red-600 dark:text-red-400">
                        Amount received must be at least {formatGhs(total)}.
                      </p>
                    ) : (
                      <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">
                        Exact total is pre-filled. Adjust if the customer pays with more cash.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex h-full flex-col justify-center rounded-2xl border border-[#e5e7eb] bg-[#f8faf9] p-5 dark:border-white/[0.1] dark:bg-[#0c0c0c]">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      Amount due
                    </p>
                    <p className="mt-2 font-[family-name:var(--font-display)] text-3xl font-semibold tabular-nums text-foreground">
                      {formatGhs(total)}
                    </p>
                    <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
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
        <div className="border-t border-[#eef0f2] bg-[#fafafa] px-5 py-4 dark:border-white/[0.06] dark:bg-[#0c0c0c] sm:px-7">
          <button
            type="button"
            disabled={!canPay || isProcessing}
            onClick={handlePay}
            className="tap-target flex min-h-[52px] w-full items-center justify-center rounded-2xl bg-gradient-to-br from-[#003527] to-[#064e3b] py-3.5 text-[15px] font-semibold text-white shadow-[0_8px_24px_-8px_rgba(0,53,39,0.45)] transition-[filter] hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45 dark:shadow-[0_8px_24px_-8px_rgba(0,0,0,0.5)]"
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
