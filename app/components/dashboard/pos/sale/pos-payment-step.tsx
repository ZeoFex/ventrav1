"use client";

import { ArrowLeft, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import {
  GHANA_PAYMENT_METHODS,
  type GhanaPaymentMethodId,
  getPaymentMethod,
} from "./pos-payment-methods";

function formatGhs(n: number): string {
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
    minimumFractionDigits: 2,
  }).format(n);
}

export function PosPaymentStep({
  totalGhs,
  onBack,
  onComplete,
  isProcessing = false,
}: {
  totalGhs: number;
  onBack: () => void;
  onComplete: (payload: {
    methodId: GhanaPaymentMethodId;
    amountTenderedGhs: number;
    changeGhs: number;
  }) => void;
  isProcessing?: boolean;
}) {
  const [methodId, setMethodId] = useState<GhanaPaymentMethodId>("cash");
  const [tenderInput, setTenderInput] = useState("");

  const method = getPaymentMethod(methodId);
  const usesCash = method?.usesTenderAndChange ?? false;

  const tenderedNum = useMemo(() => {
    const n = parseFloat(tenderInput.replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  }, [tenderInput]);

  const changeGhs = useMemo(() => {
    if (!usesCash) return 0;
    return Math.max(0, tenderedNum - totalGhs);
  }, [usesCash, tenderedNum, totalGhs]);

  const canPay = useMemo(() => {
    if (!method || isProcessing) return false;
    if (usesCash) return tenderedNum >= totalGhs && tenderedNum > 0;
    return true;
  }, [method, usesCash, tenderedNum, totalGhs, isProcessing]);

  function handlePay() {
    if (!method || isProcessing) return;
    if (usesCash) {
      onComplete({
        methodId,
        amountTenderedGhs: tenderedNum,
        changeGhs,
      });
    } else {
      onComplete({
        methodId,
        amountTenderedGhs: totalGhs,
        changeGhs: 0,
      });
    }
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
          Ghana methods — select how the customer paid.
        </p>

        <div className="mt-6 rounded-2xl border border-[#eef0f2] bg-[#fafafa] px-4 py-4 dark:border-white/[0.08] dark:bg-[#141414]">
          <p className="text-[12px] font-medium uppercase tracking-wide text-muted-foreground">
            Amount due
          </p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-2xl font-semibold tabular-nums text-foreground">
            {formatGhs(totalGhs)}
          </p>
        </div>

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
                  className={`tap-target flex min-h-[52px] items-start gap-3 rounded-2xl border px-4 py-3 text-left transition-[border-color,background-color,box-shadow] ${selected
                      ? "border-[#006c49]/40 bg-[#006c49]/[0.06] shadow-[0_0_0_1px_rgba(0,108,73,0.15)] dark:border-[#6ffbbe]/35 dark:bg-[#6ffbbe]/[0.07]"
                      : "border-[#e5e7eb] bg-white hover:border-[#d1d5db] dark:border-white/[0.1] dark:bg-[#1a1a1a] dark:hover:border-white/[0.15]"
                    }`}
                >
                  <span
                    className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl ${selected
                        ? "bg-[#003527]/10 text-[#006c49] dark:bg-[#6ffbbe]/15 dark:text-[#6ffbbe]"
                        : "bg-[#f4f4f5] text-muted-foreground dark:bg-[#262626]"
                      }`}
                  >
                    <Icon className="size-[18px]" strokeWidth={1.75} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[14px] font-medium text-foreground">
                      {m.label}
                    </span>
                    <span className="mt-0.5 block text-[12px] text-muted-foreground">
                      {m.hint}
                    </span>
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
              <span className="text-[13px] font-medium text-muted-foreground">
                Change to give
              </span>
              <span className="font-[family-name:var(--font-display)] text-lg font-semibold tabular-nums text-foreground">
                {formatGhs(changeGhs)}
              </span>
            </div>
            {tenderInput && !canPay && !isProcessing ? (
              <p className="text-[13px] text-red-600 dark:text-red-400">
                Amount received must be at least {formatGhs(totalGhs)}.
              </p>
            ) : null}
          </div>
        ) : (
          <p className="mt-6 text-[13px] leading-relaxed text-muted-foreground">
            Customer pays{" "}
            <span className="font-semibold text-foreground">
              {formatGhs(totalGhs)}
            </span>{" "}
            via {method?.label}. Confirm when payment is successful.
          </p>
        )}

        <button
          type="button"
          disabled={!canPay || isProcessing}
          onClick={handlePay}
          className="tap-target mt-8 flex min-h-[52px] w-full items-center justify-center rounded-2xl bg-gradient-to-br from-[#003527] to-[#064e3b] py-3.5 text-[16px] font-semibold text-white shadow-[0_8px_24px_-8px_rgba(0,53,39,0.45)] transition-[filter] hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45 dark:shadow-[0_8px_24px_-8px_rgba(0,0,0,0.5)]"
        >
          {isProcessing ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            "Complete payment"
          )}
        </button>
      </div>
    </div>
  );
}
