"use client";

import JsBarcode from "jsbarcode";
import { useEffect, useId, useRef } from "react";
import { BarcodeHelpPanel } from "./barcode-help-panel";

type ProductBarcodePreviewProps = {
  productId: string;
  sku: string;
  name: string;
  priceGhs: number | "";
  categoryId: string;
};

export type BarcodeItemProps = {
  sku: string;
  name?: string;
  priceGhs?: number | "";
  width?: number;
  height?: number;
  fontSize?: number;
  className?: string;
};

export function BarcodeItem({
  sku,
  name,
  priceGhs,
  width = 1.5,
  height = 40,
  fontSize = 10,
  className,
}: BarcodeItemProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    svg.innerHTML = "";
    const code = sku.trim();
    if (!code) return;
    try {
      JsBarcode(svg, code, {
        format: "CODE128",
        width,
        height,
        displayValue: true,
        fontSize,
        margin: 6,
        background: "transparent",
        lineColor: "currentColor",
      });
    } catch {
      // Invalid data for Code128
    }
  }, [sku, width, height, fontSize]);

  return (
    <div className={className}>
      {name && (
        <div className="mb-1 truncate text-center text-[10px] font-bold uppercase">
          {name}
        </div>
      )}
      <svg ref={svgRef} className="block h-auto w-full" />
      {typeof priceGhs === "number" && (
        <div className="mt-1 text-center text-[11px] font-bold tabular-nums">
          GHS {priceGhs.toFixed(2)}
        </div>
      )}
    </div>
  );
}

export function ProductBarcodePreview({
  sku,
  name,
  priceGhs,
}: ProductBarcodePreviewProps) {
  const labelId = useId();
  const hasSku = Boolean(sku.trim());

  return (
    <section
      className="rounded-2xl border border-[#eef0f2] bg-[#fafafa] p-3 dark:border-white/[0.08] dark:bg-[#141414]"
      aria-labelledby={labelId}
    >
      <h3
        id={labelId}
        className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground"
      >
        Barcode
      </h3>
      <p className="mt-0.5 text-[11px] text-muted-foreground">
        <strong className="font-medium text-foreground">Code 128</strong> —
        SKU for laser & camera scanners.
      </p>

      {!hasSku ? (
        <p className="mt-3 text-[12px] text-muted-foreground">
          Generate a SKU to render barcode.
        </p>
      ) : (
        <div className="mt-3 inline-block max-w-[180px] overflow-x-auto rounded-lg border border-[#e5e7eb] bg-white px-1.5 py-1.5 text-foreground dark:border-white/[0.12] dark:bg-[#0a0a0a]">
          <BarcodeItem sku={sku} name={name} priceGhs={priceGhs} />
        </div>
      )}
      <BarcodeHelpPanel className="mt-3" />
    </section>
  );
}
