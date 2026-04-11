"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { PosBarcodeCamera } from "../pos/sale/pos-barcode-camera";
import { useProducts } from "../products/products-data-hooks";
import { resolveProductFromScan } from "../pos/sale/pos-barcode-resolve";
import { useGlobalCart } from "../pos/global-cart-context";
import { playPosAddProductBeep } from "../pos/sale/pos-add-beep";

export function GlobalBarcodeModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { products = [], isLoading } = useProducts(isOpen);
  const { addToCart } = useGlobalCart();
  const [cameraActive, setCameraActive] = useState(false);
  const [processing, setProcessing] = useState(false);
  const closeTimeout = useRef<NodeJS.Timeout | null>(null);

  // Activate camera shortly after opening to allow animation
  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => setCameraActive(true), 150);
      return () => clearTimeout(t);
    } else {
      setCameraActive(false);
      setProcessing(false);
    }
  }, [isOpen]);

  const handleScan = useCallback(
    (code: string) => {
      if (processing || !products.length || !isOpen) return;

      setProcessing(true);
      const result = resolveProductFromScan(code, products);

      if (result.ok) {
        // Assume default variation if any, or just add.
        // POS barcode resolve should eventually handle resolving direct to variation ID
        // For now, if variation is required, this might just add the base product.
        addToCart(result.product.id, undefined, result.product.stock);
        playPosAddProductBeep();
        toast.success(`Added ${result.product.name} to cart`);
        
        // Auto-close after successful scan
        if (closeTimeout.current) clearTimeout(closeTimeout.current);
        closeTimeout.current = setTimeout(() => {
           onClose();
        }, 1000);
      } else {
        toast.error("Product not found");
        setProcessing(false); // allow immediate retry on failure
      }
    },
    [products, addToCart, processing, isOpen, onClose],
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-background shadow-2xl dark:border dark:border-white/10">
        <div className="flex items-center justify-between border-b p-4 dark:border-white/10">
          <h2 className="font-semibold">Scan Product Barcode</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 hover:bg-muted"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="relative h-[300px] w-full sm:h-[400px]">
          {isLoading ? (
            <div className="flex h-full items-center justify-center">
               <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <PosBarcodeCamera
              active={cameraActive}
              onScan={handleScan}
              className="h-full w-full"
            />
          )}

          {processing && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                <div className="flex items-center gap-2 rounded-xl bg-white px-4 py-3 shadow-lg dark:bg-[#111]">
                   <Loader2 className="size-5 animate-spin text-[#006c49]" />
                   <span className="font-medium">Adding to cart...</span>
                </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
