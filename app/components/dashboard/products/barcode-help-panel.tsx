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
            <strong className="font-medium text-foreground">1. Generate a label</strong> — Under{" "}
            <span className="font-medium text-foreground">Products → Barcodes</span>, type the product name,
            upload a photo (white background works best), and add a short description. Ventra assigns a unique
            barcode number you can print.
          </p>
          <p>
            <strong className="font-medium text-foreground">2. Add to your store later</strong> — When you are ready,
            go to <span className="font-medium text-foreground">Products → Add product</span> and scan the printed
            barcode. Name, photo, and description fill in automatically — you add price, stock, and save.
          </p>
          <p>
            <strong className="font-medium text-foreground">3. Scan at POS</strong> — After the product is in your
            catalog, scan the same barcode at checkout with a camera, USB scanner, or paired phone.
          </p>
          <p>
            <strong className="font-medium text-foreground">History</strong> — Every generated label is saved so you
            can reprint anytime.
          </p>
        </div>
      ) : null}
    </div>
  );
}
