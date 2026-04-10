"use client";

import { useState, useRef, useEffect } from "react";
import { X, Printer, Download, Plus, Minus } from "lucide-react";
import { toPng } from "html-to-image";
import { BarcodeItem } from "./product-barcode-preview";

export type BarcodeProduct = {
    id: string;
    name: string;
    sku: string;
    barcode?: string;
    priceGhs: number;
};

type BarcodeGridModalProps = {
    isOpen: boolean;
    onClose: () => void;
    products: BarcodeProduct[];
};

export function BarcodeGridModal({
    isOpen,
    onClose,
    products,
}: BarcodeGridModalProps) {
    const [quantities, setQuantities] = useState<Record<string, number>>({});
    const gridRef = useRef<HTMLDivElement>(null);

    // Sync initial quantities when products change or modal opens
    useEffect(() => {
        if (isOpen) {
            setQuantities(
                Object.fromEntries(products.map((p) => [p.id, quantities[p.id] ?? 1]))
            );
        }
    }, [isOpen, products]);

    if (!isOpen) return null;

    const handleQuantityChange = (id: string, delta: number) => {
        setQuantities((prev) => ({
            ...prev,
            [id]: Math.max(0, (prev[id] || 0) + delta),
        }));
    };

    const totalBarcodes = Object.values(quantities).reduce((a, b) => a + b, 0);

    const flatList = products.flatMap((p) =>
        Array.from({ length: quantities[p.id] || 0 }).map(() => p)
    );

    const handlePrint = () => {
        window.print();
    };

    const handleSaveImage = async () => {
        if (!gridRef.current) return;
        try {
            const dataUrl = await toPng(gridRef.current, {
                backgroundColor: "#fff",
                pixelRatio: 2,
            });
            const link = document.createElement("a");
            link.download = `barcodes-${new Date().getTime()}.png`;
            link.href = dataUrl;
            link.click();
        } catch (err) {
            console.error("Failed to save image", err);
        }
    };

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm print:p-0 print:bg-white print:backdrop-blur-none">
            <div className="flex h-full max-h-[90vh] w-full max-w-5xl animate-in fade-in zoom-in duration-200 flex-col rounded-[1.5rem] border border-[#eef0f2] bg-white shadow-2xl dark:border-white/[0.08] dark:bg-[#111] overflow-hidden print:max-h-none print:w-auto print:rounded-none print:border-none print:shadow-none print:static">
                {/* Header - Hidden on Print */}
                <div className="flex items-center justify-between border-b border-[#f0f2f4] px-6 py-4 dark:border-white/[0.06] print:hidden">
                    <div>
                        <h2 className="text-xl font-bold tracking-tight text-foreground font-[family-name:var(--font-display)]">
                            Print Barcodes
                        </h2>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                            Arrange barcodes in a grid for printing or saving.
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-full p-2 hover:bg-[#f4f5f7] transition-colors dark:hover:bg-white/5"
                    >
                        <X className="size-5" />
                    </button>
                </div>

                <div className="flex flex-1 overflow-hidden print:overflow-visible">
                    {/* Sidebar - Settings - Hidden on Print */}
                    <div className="w-72 overflow-y-auto border-r border-[#f0f2f4] p-6 hidden lg:block dark:border-white/[0.06] print:hidden">
                        <h3 className="mb-4 text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
                            Select Quantities
                        </h3>
                        <div className="space-y-4">
                            {products.map((p) => (
                                <div key={p.id} className="space-y-2">
                                    <div className="flex items-center justify-between text-[13px]">
                                        <span className="font-medium truncate mr-2">{p.name}</span>
                                        <span className="shrink-0 font-mono text-muted-foreground tabular-nums">
                                            {quantities[p.id] || 0}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleQuantityChange(p.id, -1)}
                                            className="flex-1 flex items-center justify-center rounded-lg border border-[#e5e7eb] bg-white py-1.5 hover:bg-[#fafafa] dark:border-white/[0.12] dark:bg-transparent dark:hover:bg-white/5"
                                        >
                                            <Minus className="size-3.5" />
                                        </button>
                                        <button
                                            onClick={() => handleQuantityChange(p.id, 1)}
                                            className="flex-1 flex items-center justify-center rounded-lg border border-[#e5e7eb] bg-white py-1.5 hover:bg-[#fafafa] dark:border-white/[0.12] dark:bg-transparent dark:hover:bg-white/5"
                                        >
                                            <Plus className="size-3.5" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Preview Area */}
                    <div className="flex-1 overflow-y-auto bg-[#f8f9fa] p-8 dark:bg-black/20 print:p-0 print:bg-white print:overflow-visible">
                        <div
                            className="mx-auto shadow-xl print:shadow-none"
                            style={{ width: "210mm" }}
                        >
                            <div
                                ref={gridRef}
                                id="barcode-print-grid"
                                className="grid grid-cols-3 gap-y-8 gap-x-4 bg-white p-[10mm] min-h-[297mm] text-black"
                                style={{ width: "210mm" }}
                            >
                                {flatList.map((p, i) => (
                                    <div
                                        key={`${p.id}-${i}`}
                                        className="flex flex-col items-center border border-dashed border-gray-100 p-4"
                                    >
                                        <BarcodeItem
                                            sku={p.barcode || p.sku} // Prioritize barcode for linear code
                                            name={p.name}
                                            priceGhs={p.priceGhs}
                                            width={1.4}
                                            height={45}
                                            fontSize={10}
                                            className="w-full"
                                        />
                                    </div>
                                ))}
                                {flatList.length === 0 && (
                                    <div className="col-span-3 flex h-64 items-center justify-center text-muted-foreground print:hidden">
                                        No barcodes selected.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer - Hidden on Print */}
                <div className="flex items-center justify-between border-t border-[#f0f2f4] px-6 py-4 dark:border-white/[0.06] print:hidden">
                    <div className="text-sm font-medium text-muted-foreground">
                        {totalBarcodes} total barcodes
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={handleSaveImage}
                            className="flex items-center gap-2 rounded-xl border border-[#e5e7eb] bg-white px-4 py-2.5 text-[14px] font-medium text-foreground hover:bg-[#fafafa] transition-colors dark:border-white/[0.12] dark:bg-transparent dark:hover:bg-white/5"
                        >
                            <Download className="size-4" />
                            Save Image
                        </button>
                        <button
                            onClick={handlePrint}
                            className="flex items-center gap-2 rounded-xl bg-gradient-to-br from-[#003527] to-[#064e3b] px-5 py-2.5 text-[14px] font-semibold text-white shadow-lg hover:brightness-110 transition-all"
                        >
                            <Printer className="size-4" />
                            Print
                        </button>
                    </div>
                </div>
            </div>

            <style
                dangerouslySetInnerHTML={{
                    __html: `
        @media print {
          body > *:not(.print-container) {
            display: none !important;
          }
          .fixed.inset-0 {
            position: absolute !important;
            display: block !important;
            background: white !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          #barcode-print-grid {
            border: none !important;
          }
        }
      `,
                }}
            />
        </div>
    );
}
