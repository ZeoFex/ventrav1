"use client";

import { useEffect, useRef } from "react";
import { CatalogProductImage } from "./catalog-product-image";
import { unitShort } from "@/app/lib/product-units";
import { renderCode128Barcode } from "@/app/lib/barcode-render";

export type BarcodeItemProps = {
  sku: string;
  name?: string;
  description?: string;
  imageSrc?: string;
  priceGhs?: number | "";
  unit?: string;
  width?: number;
  height?: number;
  fontSize?: number;
  className?: string;
};

export function BarcodeItem({
  sku,
  name,
  description,
  imageSrc,
  priceGhs,
  unit,
  width = 1.5,
  height = 40,
  fontSize = 10,
  className,
}: BarcodeItemProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    renderCode128Barcode(svg, sku, { width, height, fontSize, lineColor: "#000000" });
  }, [sku, width, height, fontSize]);

  const unitLabel = unit ? unitShort(unit) : null;

  return (
    <div className={`text-black ${className ?? ""}`}>
      {imageSrc ? (
        <div className="mb-2 flex justify-center">
          <CatalogProductImage
            src={imageSrc}
            alt={name || "Product"}
            className="h-12 w-12 rounded-lg object-cover"
          />
        </div>
      ) : null}
      {name ? (
        <div className="mb-0.5 truncate text-center text-[10px] font-bold uppercase leading-tight">
          {name}
        </div>
      ) : null}
      {description ? (
        <div className="mb-1 line-clamp-2 text-center text-[9px] text-muted-foreground leading-tight">
          {description}
        </div>
      ) : null}
      <svg ref={svgRef} className="barcode-svg block h-auto w-full bg-white" />
      {typeof priceGhs === "number" && (
        <div className="mt-1 text-center text-[11px] font-bold tabular-nums">
          GHS {priceGhs.toFixed(2)}
          {unitLabel ? <span className="font-normal text-muted-foreground"> / {unitLabel}</span> : null}
        </div>
      )}
    </div>
  );
}
