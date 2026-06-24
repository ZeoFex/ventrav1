"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Loader2, X } from "lucide-react";
import { PosBarcodeScanner } from "../pos/sale/pos-barcode-scanner";
import { PosCreateProductFromScanModal } from "../pos/sale/pos-create-product-from-scan-modal";
import { useProducts } from "../products/products-data-hooks";
import { useGlobalCart } from "../pos/global-cart-context";
import type { GlobalBarcodePrefill } from "@/app/lib/pos/pending-product-barcode";
import { type ProductRow } from "../products/types";

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
  const [createModal, setCreateModal] = useState<{
    barcode: string;
    globalPrefill: GlobalBarcodePrefill | null;
  } | null>(null);
  const closeTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => setCameraActive(true), 150);
      return () => clearTimeout(t);
    }
    setCameraActive(false);
    setCreateModal(null);
  }, [isOpen]);

  const handleProductFound = useCallback(
    (product: ProductRow) => {
      addToCart(product.id, undefined, product.stock);
      if (closeTimeout.current) clearTimeout(closeTimeout.current);
      closeTimeout.current = setTimeout(() => {}, 1250);
    },
    [addToCart],
  );

  const handleCreateProduct = useCallback(
    (barcode: string, globalPrefill: GlobalBarcodePrefill | null) => {
      setCreateModal({ barcode, globalPrefill });
    },
    [],
  );

  const handleProductCreated = useCallback(
    (product: ProductRow) => {
      addToCart(product.id, undefined, product.stock);
      setCreateModal(null);
    },
    [addToCart],
  );

  const handleClose = useCallback(() => {
    if (closeTimeout.current) clearTimeout(closeTimeout.current);
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={handleClose}
      />
      <div className="relative flex w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-background shadow-2xl dark:border dark:border-white/10">
        <div className="flex items-center justify-between border-b p-4 dark:border-white/10">
          <h2 className="font-semibold">Scan Product Barcode</h2>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleClose();
            }}
            className="tap-target rounded-full p-2 hover:bg-muted"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="relative min-h-[480px] w-full">
          {isLoading ? (
            <div className="absolute top-4 right-4 z-10 flex items-center gap-2 rounded-xl bg-black/60 px-3 py-1.5 backdrop-blur-md text-white">
              <Loader2 className="size-3.5 animate-spin text-[#FFD60A]" />
              <span className="text-xs font-medium">Syncing catalog…</span>
            </div>
          ) : null}

          <PosBarcodeScanner
            active={cameraActive && !isLoading}
            products={products}
            onProductFound={handleProductFound}
            onCreateProduct={handleCreateProduct}
            className="h-full min-h-[480px]"
          />
        </div>
      </div>

      <PosCreateProductFromScanModal
        open={Boolean(createModal)}
        barcode={createModal?.barcode ?? ""}
        globalPrefill={createModal?.globalPrefill ?? null}
        onClose={() => setCreateModal(null)}
        onProductCreated={handleProductCreated}
      />
    </div>
  );
}
