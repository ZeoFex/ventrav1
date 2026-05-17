"use client";

import { Download, Printer, ShoppingCart } from "lucide-react";
import type { PosReceiptData } from "./pos-receipt-data";
import { buildReceiptPlainText } from "./pos-receipt-data";
import { downloadTextFile, printReceiptHtml } from "./pos-print-utils";
import { PosSaleReceiptThermal } from "./pos-sale-receipt";

export function PosReceiptStep({
  receiptData,
  onNewSale,
  title = "Payment complete",
  description = "Print or save your receipt.",
  primaryActionLabel = "New sale",
  onPrimaryAction,
}: {
  receiptData: PosReceiptData;
  onNewSale: () => void;
  title?: string;
  description?: string;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
}) {
  const plain = buildReceiptPlainText(receiptData);
  const safeName = receiptData.invoiceId.replace(/[^\w-]+/g, "_");
  const handlePrimary = onPrimaryAction ?? onNewSale;

  return (
    <div className="mx-auto max-w-4xl px-3 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-8">
      <div className="mb-8 text-center sm:text-left">
        <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold text-foreground sm:text-2xl">
          {title}
        </h2>
        <p className="mt-1 text-[14px] text-muted-foreground">{description}</p>
      </div>

      <div className="flex flex-col items-center gap-8 lg:flex-row lg:items-start lg:justify-center">
        <PosSaleReceiptThermal data={receiptData} />

        <div className="flex w-full max-w-xs flex-col gap-3">
          <div className="flex items-stretch gap-3">
            <button
              type="button"
              onClick={() => void printReceiptHtml(receiptData)}
              className="tap-target inline-flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-2xl border border-[#e5e7eb] bg-white px-4 text-[14px] font-semibold text-foreground shadow-sm transition-colors hover:bg-[#fafafa] dark:border-white/[0.12] dark:bg-[#141414] dark:hover:bg-[#1a1a1a]"
            >
              <Printer className="size-[18px] shrink-0" strokeWidth={1.75} />
              Print receipt
            </button>
          </div>
          <button
            type="button"
            onClick={() =>
              downloadTextFile(`ventrapos-receipt-${safeName}.txt`, plain)
            }
            className="tap-target inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl border border-[#e5e7eb] bg-white px-4 text-[14px] font-semibold text-foreground shadow-sm transition-colors hover:bg-[#fafafa] dark:border-white/[0.12] dark:bg-[#141414] dark:hover:bg-[#1a1a1a]"
          >
            <Download className="size-[18px]" strokeWidth={1.75} />
            Save as file
          </button>
          <button
            type="button"
            onClick={handlePrimary}
            className="tap-target inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-[#003527] to-[#064e3b] px-4 text-[14px] font-semibold text-white shadow-[0_8px_24px_-8px_rgba(0,53,39,0.4)] transition-[filter] hover:brightness-105 dark:shadow-[0_8px_24px_-8px_rgba(0,0,0,0.5)]"
          >
            <ShoppingCart className="size-[18px]" strokeWidth={1.75} />
            {primaryActionLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
