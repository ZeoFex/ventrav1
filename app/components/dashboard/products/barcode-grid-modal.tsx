"use client";

import { useState, useRef, useEffect } from "react";
import { X, Printer, Download, Plus, Minus, Loader2 } from "lucide-react";
import { toPng } from "html-to-image";
import { BarcodeItem } from "./product-barcode-preview";
import { waitForBarcodeRender } from "@/app/lib/barcode-render";

export type BarcodeLabelProduct = {
    id: string;
    name: string;
    description: string;
    sku: string;
    priceGhs?: number;
    imageSrc: string;
    unit?: string;
};

type BarcodeGridModalProps = {
    isOpen: boolean;
    onClose: () => void;
    products: BarcodeLabelProduct[];
    title?: string;
    initialQuantities?: Record<string, number>;
};

function clampQty(n: number) {
    return Math.max(1, Math.min(99, Math.floor(n) || 1));
}

export function BarcodeGridModal({
    isOpen,
    onClose,
    products,
    title = "Print Barcodes",
    initialQuantities,
}: BarcodeGridModalProps) {
    const [quantities, setQuantities] = useState<Record<string, number>>({});
    const [printing, setPrinting] = useState(false);
    const gridRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isOpen) {
            setQuantities(
                Object.fromEntries(
                    products.map((p) => [p.id, clampQty(initialQuantities?.[p.id] ?? 1)]),
                ),
            );
        }
    }, [isOpen, products, initialQuantities]);

    if (!isOpen) return null;

    const setQuantity = (id: string, value: number) => {
        setQuantities((prev) => ({ ...prev, [id]: clampQty(value) }));
    };

    const handleQuantityChange = (id: string, delta: number) => {
        setQuantities((prev) => ({
            ...prev,
            [id]: clampQty((prev[id] || 1) + delta),
        }));
    };

    const totalBarcodes = Object.values(quantities).reduce((a, b) => a + b, 0);

    const flatList = products.flatMap((p) =>
        Array.from({ length: quantities[p.id] || 0 }).map(() => p),
    );

    const handlePrint = async () => {
        if (!gridRef.current || flatList.length === 0) return;
        setPrinting(true);
        try {
            await waitForBarcodeRender(gridRef.current);
            // Extra frame so layout settles before the print dialog
            await new Promise((r) => setTimeout(r, 120));
            window.print();
        } finally {
            setPrinting(false);
        }
    };

    const handleSaveImage = async () => {
        if (!gridRef.current) return;
        try {
            await waitForBarcodeRender(gridRef.current);
            const dataUrl = await toPng(gridRef.current, {
                backgroundColor: "#ffffff",
                pixelRatio: 2,
                cacheBust: true,
            });
            const link = document.createElement("a");
            link.download = `barcodes-${Date.now()}.png`;
            link.href = dataUrl;
            link.click();
        } catch (err) {
            console.error("Failed to save image", err);
        }
    };

    return (
        <>
            <div className="barcode-print-root fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
                <div className="flex h-full max-h-[90vh] w-full max-w-5xl animate-in fade-in zoom-in duration-200 flex-col rounded-[1.5rem] border border-[#eef0f2] bg-white shadow-2xl dark:border-white/[0.08] dark:bg-[#111] overflow-hidden">
                    <div className="flex items-center justify-between border-b border-[#f0f2f4] px-6 py-4 dark:border-white/[0.06] barcode-print-hide">
                        <div>
                            <h2 className="text-xl font-bold tracking-tight text-foreground font-[family-name:var(--font-display)]">
                                {title}
                            </h2>
                            <p className="mt-0.5 text-sm text-muted-foreground">
                                Set how many labels per product — they line up on one sheet for printing.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-full p-2 hover:bg-[#f4f5f7] transition-colors dark:hover:bg-white/5"
                        >
                            <X className="size-5" />
                        </button>
                    </div>

                    <div className="flex flex-1 overflow-hidden">
                        <div className="w-full shrink-0 overflow-y-auto border-b border-[#f0f2f4] p-4 sm:w-72 sm:border-b-0 sm:border-r dark:border-white/[0.06] barcode-print-hide">
                            <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
                                Labels per product
                            </h3>
                            <div className="space-y-4">
                                {products.map((p) => (
                                    <div key={p.id} className="space-y-2">
                                        <div className="text-[13px] font-medium truncate">{p.name}</div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                type="button"
                                                onClick={() => handleQuantityChange(p.id, -1)}
                                                className="flex size-9 items-center justify-center rounded-lg border border-[#e5e7eb] bg-white hover:bg-[#fafafa] dark:border-white/[0.12] dark:bg-transparent"
                                            >
                                                <Minus className="size-3.5" />
                                            </button>
                                            <input
                                                type="number"
                                                min={1}
                                                max={99}
                                                value={quantities[p.id] ?? 1}
                                                onChange={(e) =>
                                                    setQuantity(p.id, Number(e.target.value))
                                                }
                                                className="w-16 rounded-lg border border-[#e5e7eb] bg-white py-1.5 text-center text-[14px] font-semibold tabular-nums outline-none focus:border-[#006c49] dark:border-white/[0.12] dark:bg-transparent"
                                                aria-label={`Quantity for ${p.name}`}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => handleQuantityChange(p.id, 1)}
                                                className="flex size-9 items-center justify-center rounded-lg border border-[#e5e7eb] bg-white hover:bg-[#fafafa] dark:border-white/[0.12] dark:bg-transparent"
                                            >
                                                <Plus className="size-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto bg-[#f8f9fa] p-4 sm:p-8 dark:bg-black/20">
                            <div className="mx-auto shadow-xl barcode-print-sheet-wrap">
                                <div
                                    ref={gridRef}
                                    id="barcode-print-grid"
                                    className="grid grid-cols-3 gap-y-8 gap-x-4 bg-white p-[10mm] min-h-[297mm] text-black"
                                    style={{ width: "210mm" }}
                                >
                                    {flatList.map((p, i) => (
                                        <div
                                            key={`${p.id}-${i}`}
                                            className="flex flex-col items-center border border-dashed border-gray-200 p-4 print:border-gray-300"
                                        >
                                            <BarcodeItem
                                                sku={p.sku}
                                                name={p.name}
                                                description={p.description}
                                                imageSrc={p.imageSrc}
                                                priceGhs={p.priceGhs}
                                                unit={p.unit}
                                                width={1.4}
                                                height={45}
                                                fontSize={10}
                                                className="w-full"
                                            />
                                        </div>
                                    ))}
                                    {flatList.length === 0 && (
                                        <div className="col-span-3 flex h-64 items-center justify-center text-muted-foreground barcode-print-hide">
                                            Set a quantity above to preview labels.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-[#f0f2f4] px-6 py-4 dark:border-white/[0.06] barcode-print-hide">
                        <div className="text-sm font-medium text-muted-foreground">
                            {totalBarcodes} label{totalBarcodes === 1 ? "" : "s"} on sheet
                        </div>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={handleSaveImage}
                                disabled={flatList.length === 0}
                                className="flex items-center gap-2 rounded-xl border border-[#e5e7eb] bg-white px-4 py-2.5 text-[14px] font-medium text-foreground hover:bg-[#fafafa] disabled:opacity-50 dark:border-white/[0.12] dark:bg-transparent"
                            >
                                <Download className="size-4" />
                                Save image
                            </button>
                            <button
                                type="button"
                                onClick={() => void handlePrint()}
                                disabled={flatList.length === 0 || printing}
                                className="flex items-center gap-2 rounded-xl bg-gradient-to-br from-[#003527] to-[#064e3b] px-5 py-2.5 text-[14px] font-semibold text-white shadow-lg hover:brightness-110 disabled:opacity-50"
                            >
                                {printing ? (
                                    <Loader2 className="size-4 animate-spin" />
                                ) : (
                                    <Printer className="size-4" />
                                )}
                                Print
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <style
                dangerouslySetInnerHTML={{
                    __html: `
@media print {
  @page {
    size: A4 portrait;
    margin: 0;
  }
  html, body {
    width: 210mm;
    height: auto;
    margin: 0 !important;
    padding: 0 !important;
    background: #fff !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  body * {
    visibility: hidden !important;
  }
  .barcode-print-root,
  .barcode-print-root #barcode-print-grid,
  .barcode-print-root #barcode-print-grid * {
    visibility: visible !important;
  }
  .barcode-print-root {
    position: absolute !important;
    inset: 0 !important;
    display: block !important;
    background: #fff !important;
    padding: 0 !important;
    margin: 0 !important;
    z-index: 99999 !important;
    overflow: visible !important;
  }
  .barcode-print-hide {
    display: none !important;
  }
  .barcode-print-sheet-wrap {
    box-shadow: none !important;
    margin: 0 !important;
    padding: 0 !important;
  }
  #barcode-print-grid {
    position: absolute !important;
    left: 0 !important;
    top: 0 !important;
    width: 210mm !important;
    min-height: auto !important;
    border: none !important;
    box-shadow: none !important;
    page-break-inside: avoid;
  }
  #barcode-print-grid svg {
    background: #fff !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  #barcode-print-grid svg text {
    fill: #000 !important;
    color: #000 !important;
  }
  #barcode-print-grid svg rect.barcode-bar {
    fill: #000 !important;
  }
  #barcode-print-grid svg rect.barcode-bg {
    fill: #fff !important;
  }
}
`,
                }}
            />
        </>
    );
}
