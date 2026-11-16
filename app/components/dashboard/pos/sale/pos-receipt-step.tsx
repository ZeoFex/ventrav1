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
    <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col px-2 py-2 sm:px-6 sm:py-8">
      <div className="mb-2 text-center sm:mb-8 sm:text-left">
        <h2 className="font-[family-name:var(--font-display)] text-base font-semibold text-foreground sm:text-2xl">
          {title}
        </h2>
        <p className="mt-0.5 text-[12px] text-muted-foreground sm:text-[14px]">{description}</p>
      </div>

      <div className="flex flex-1 flex-col items-center gap-3 lg:flex-row lg:items-start lg:justify-center lg:gap-8">
        <div className="w-full max-w-[20rem] overflow-x-hidden sm:max-w-[22rem]">
          <PosSaleReceiptThermal data={receiptData} />
        </div>

        <div className="flex w-full max-w-xs flex-col gap-1.5 pb-2 lg:sticky lg:top-4">
          <button
            type="button"
            onClick={() => void printReceiptHtml(receiptData)}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-[#e5e7eb] bg-white px-3 text-[13px] font-semibold text-foreground dark:border-white/[0.12] dark:bg-[#141414] sm:h-[52px] sm:rounded-2xl sm:text-[14px]"
          >
            <Printer className="size-4 shrink-0" strokeWidth={1.75} />
            Print receipt
          </button>
          <button
            type="button"
            onClick={() =>
              downloadTextFile(`ventrapos-receipt-${safeName}.txt`, plain)
            }
            className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-[#e5e7eb] bg-white px-3 text-[13px] font-semibold text-foreground dark:border-white/[0.12] dark:bg-[#141414] sm:h-12 sm:rounded-2xl sm:text-[14px]"
          >
            <Download className="size-4" strokeWidth={1.75} />
            Save as file
          </button>
          <button
            type="button"
            onClick={handlePrimary}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-[#003527] to-[#064e3b] px-3 text-[13px] font-semibold text-white sm:h-14 sm:rounded-2xl sm:text-[15px]"
          >
            <ShoppingCart className="size-4" strokeWidth={1.75} />
            {primaryActionLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
