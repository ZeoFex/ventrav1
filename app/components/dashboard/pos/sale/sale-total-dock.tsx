"use client";

import { ArrowUpRight } from "lucide-react";
import { formatGhs } from "@/app/lib/catalog-utils";

export function SaleTotalDock({
  total,
  itemCount,
  itemName,
  onReview,
  onPay,
}: {
  total: number;
  itemCount: number;
  itemName: string | null;
  onReview: () => void;
  onPay: () => void;
}) {
  const hasItems = itemCount > 0;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 lg:hidden"
      role="region"
      aria-label="Sale total"
    >
      <div className="pointer-events-none absolute inset-x-0 -top-6 h-6 bg-gradient-to-t from-black/20 to-transparent dark:from-black/50" />
      <div className="border-t border-white/10 bg-gradient-to-br from-[#003527] to-[#064e3b] px-4 pt-3 shadow-[0_-12px_32px_-12px_rgba(0,53,39,0.55)] dark:from-[#06261c] dark:to-[#003527]">
        <div className="mx-auto flex max-w-lg items-end gap-3 pb-[max(0.7rem,env(safe-area-inset-bottom))]">
          <button type="button" onClick={onReview} className="min-w-0 flex-1 text-left">
            <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-white/55">
              {hasItems ? "Sale total" : "Ready to sell"}
            </span>
            <span className="mt-0.5 block font-[family-name:var(--font-display)] text-[1.65rem] font-semibold leading-none tracking-tight text-white tabular-nums">
              {formatGhs(total)}
            </span>
            <span className="mt-1.5 block truncate text-[12px] font-medium text-white/70">
              {hasItems && itemName
                ? `${itemName}${itemCount > 1 ? ` · ${itemCount} items` : ""}`
                : "Tap a product to start a sale"}
            </span>
          </button>
          <button
            type="button"
            onClick={hasItems ? onPay : onReview}
            className="mb-0.5 inline-flex h-11 shrink-0 items-center gap-1 rounded-full bg-white px-4 text-[13px] font-semibold text-[#003527] shadow-sm"
          >
            {hasItems ? "Pay" : "Sell"}
            <ArrowUpRight className="size-3.5" strokeWidth={2.25} />
          </button>
        </div>
      </div>
    </div>
  );
}
