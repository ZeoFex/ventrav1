"use client";

import { ChevronDown, HelpCircle } from "lucide-react";
import { useId, useState } from "react";

type BarcodeHelpPanelProps = {
  defaultOpen?: boolean;
  className?: string;
};

export function BarcodeHelpPanel({ defaultOpen = false, className = "" }: BarcodeHelpPanelProps) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();

  return (
    <div
      className={`rounded-2xl border border-[#eef0f2] bg-[#fafafa] dark:border-white/[0.08] dark:bg-[#141414] ${className}`}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
          <HelpCircle className="size-4 text-[#006c49] dark:text-[#6ffbbe]" aria-hidden />
          How barcodes work
        </span>
        <ChevronDown
          className={`size-4 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>
      {open ? (
        <div id={panelId} className="space-y-3 border-t border-[#eef0f2] px-4 py-3 text-[13px] text-muted-foreground dark:border-white/[0.06]">
          <p>
            <strong className="font-medium text-foreground">1. Generate</strong> — Each product needs a unique SKU.
            Use the generate button on the product form, or type your own barcode number.
          </p>
          <p>
            <strong className="font-medium text-foreground">2. Print</strong> — Open{" "}
            <span className="font-medium text-foreground">Barcodes</span> on the product list (or Print on the form)
            to lay out labels on A4 and print or save as an image.
          </p>
          <p>
            <strong className="font-medium text-foreground">3. Scan</strong> — At POS, use the camera scan button,
            a USB laser scanner, or pair a phone via the remote scanner QR. Scans match SKU or barcode fields.
          </p>
        </div>
      ) : null}
    </div>
  );
}
