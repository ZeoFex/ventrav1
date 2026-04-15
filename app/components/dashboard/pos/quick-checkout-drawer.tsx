"use client";

import { useState, useMemo } from "react";
import { useBranchContext } from "../branch-context";
import { useBranches } from "../branches/branches-data-hooks";
import { resolveBranchReceiptMeta } from "./sale/pos-receipt-data";
import { Drawer } from "vaul";
import { X, Receipt } from "lucide-react";
import { useGlobalCart } from "./global-cart-context";
import { useProducts } from "../products/products-data-hooks";
import { PosCartPanelContent } from "./sale/pos-cart-panel";
import { PosPaymentStep } from "./sale/pos-payment-step";
import { PosReceiptStep } from "./sale/pos-receipt-step";
import { computePosTotals } from "./sale/pos-cart-totals";
import { ProductRow } from "../products/types";
import { usePosConfig } from "./sale/pos-config-hooks";
import { useSession } from "../../auth/use-session";
import type { GhanaPaymentMethodId } from "./sale/pos-payment-methods";
import { getPaymentMethod } from "./sale/pos-payment-methods";
import type { PosReceiptData } from "./sale/pos-receipt-data";

function newInvoiceId(): string {
  return `INV-${Date.now().toString(36).toUpperCase()}`;
}

export function QuickCheckoutDrawer({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { lines, setLines, addToCart, increment, decrement, remove, resetCart } = useGlobalCart();
  const { products = [], mutate: mutateProducts } = useProducts(isOpen);
  const { config } = usePosConfig();
  const { user } = useSession();
  const { branchId } = useBranchContext();
  const { branches = [] } = useBranches();

  const branchMeta = useMemo(
    () => resolveBranchReceiptMeta(branches, branchId),
    [branches, branchId],
  );

  const [flow, setFlow] = useState<"cart" | "payment" | "receipt">("cart");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [manualDiscountId, setManualDiscountId] = useState<string | null>(null);
  const [paymentSnapshot, setPaymentSnapshot] = useState<any>(null);
  const [invoiceId, setInvoiceId] = useState<string | null>(null);
  const [receiptSaleId, setReceiptSaleId] = useState<string | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const productById = useMemo(() => {
    const m = new Map<string, ProductRow>();
    products.forEach((p: ProductRow) => m.set(p.id, p));
    return m;
  }, [products]);

  const taxRate = useMemo(() => (config ? parseFloat(config.taxRate) / 100 : 0), [config]);

  // Simplified discount calculation for the quick drawer (you could add `useDiscounts` here if needed)
  const totals = useMemo(
    () => computePosTotals(lines, productById, { taxRate, discountGhs: 0 }),
    [lines, productById, taxRate],
  );

  const handlePaymentComplete = async (payload: {
    methodId: GhanaPaymentMethodId;
    amountTenderedGhs: number;
    changeGhs: number;
  }) => {
    setIsCheckingOut(true);
    const thisInvoiceId = newInvoiceId();

    const checkoutPayload = {
      invoiceId: thisInvoiceId,
      subtotalGhs: totals.subtotal,
      taxGhs: totals.tax,
      discountGhs: totals.discount,
      totalGhs: totals.total,
      paymentMethod: payload.methodId,
      customerId: selectedCustomerId,
      lines: lines.map((l) => {
        const p = productById.get(l.productId)!;
        let price = Number(p.priceGhs);
        let name = p.name;
        if (l.variationId && p.variations) {
          const v = p.variations.find((varItem) => varItem.id === l.variationId);
          if (v) {
            name = `${p.name} (${v.name})`;
            if (v.priceGhs) price = Number(v.priceGhs);
          }
        }
        return {
          productId: l.productId,
          variationId: l.variationId,
          quantity: l.qty,
          productName: name,
          unitPriceGhs: price,
          lineTotalGhs: price * l.qty,
        };
      }),
    };

    try {
      if (navigator.onLine) {
        const res = await fetch("/api/pos/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(checkoutPayload),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error("Checkout failed");
        setReceiptSaleId(typeof data.saleId === "string" ? data.saleId : null);
      } else {
        setReceiptSaleId(null);
        const { addToSyncQueue, updateCachedProductStock } = await import("@/app/lib/offline/offline-db");
        await addToSyncQueue({ type: "checkout", payload: checkoutPayload });
        for (const l of lines) {
          await updateCachedProductStock(l.productId, l.qty).catch(() => {});
        }
      }

      mutateProducts(
        (current: ProductRow[] | undefined) => {
          if (!current) return current;
          return current.map((p: ProductRow) => {
            const sold = lines.find((l) => l.productId === p.id);
            if (!sold) return p;
            return { ...p, stock: Math.max(0, p.stock - sold.qty) };
          });
        },
        { revalidate: navigator.onLine },
      );

      setInvoiceId(thisInvoiceId);
      setPaymentSnapshot({ ...payload, _offline: !navigator.onLine });
      setFlow("receipt");
    } catch (err: any) {
      alert(`Error processing checkout: ${err.message}`);
    } finally {
      setIsCheckingOut(false);
    }
  };

  const receiptData = useMemo((): PosReceiptData | null => {
    if (!invoiceId || !paymentSnapshot || lines.length === 0) return null;
    return {
      invoiceId,
      date: new Date(),
      lines: lines.map((l) => {
        const p = productById.get(l.productId)!;
        let name = p.name;
        let price = Number(p.priceGhs);
        if (l.variationId && p.variations) {
          const v = p.variations.find((v) => v.id === l.variationId);
          if (v) {
            name = `${p.name} (${v.name})`;
            if (v.priceGhs) price = Number(v.priceGhs);
          }
        }
        return { name, qty: l.qty, unitPriceGhs: price, lineTotalGhs: price * l.qty };
      }),
      subtotal: totals.subtotal,
      tax: totals.tax,
      discount: totals.discount,
      total: totals.total,
      paymentMethodLabel: getPaymentMethod(paymentSnapshot.methodId)?.label ?? paymentSnapshot.methodId,
      amountTenderedGhs: paymentSnapshot.amountTenderedGhs,
      changeGhs: paymentSnapshot.changeGhs,
      storeName: config?.name || "Ventra POS",
      branchName: branchMeta.name,
      branchLocation: branchMeta.location,
      receiptHeader: config?.receiptHeader ?? undefined,
      receiptFooter: config?.receiptFooter ?? undefined,
      operatorName: user?.name || "SYSTEM",
      currencySymbol: config?.currency || "GHS",
      saleId: receiptSaleId ?? undefined,
    };
  }, [invoiceId, receiptSaleId, paymentSnapshot, lines, productById, totals, config, user, branchMeta]);

  const handleNewSale = () => {
    resetCart();
    setPaymentSnapshot(null);
    setInvoiceId(null);
    setReceiptSaleId(null);
    setFlow("cart");
    onClose();
  };

  return (
    <Drawer.Root open={isOpen} onOpenChange={(open) => !open && onClose()} direction="bottom">
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 mx-auto mt-24 flex max-h-[92vh] min-h-0 w-full max-w-[480px] flex-col rounded-t-[2rem] bg-background shadow-2xl outline-none sm:max-h-[85vh]">
          <div className="mx-auto mt-4 h-1.5 w-12 shrink-0 rounded-full bg-muted-foreground/20" />
          <div className="flex shrink-0 items-center justify-between border-b px-5 py-4 dark:border-white/10">
            <h2 className="font-semibold text-lg">{flow === "payment" ? "Payment" : flow === "receipt" ? "Receipt" : "Quick Cart"}</h2>
            <button onClick={onClose} className="rounded-full bg-surface-elevated p-2 hover:bg-muted">
              <X className="size-5" />
            </button>
          </div>
          <div className="flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto scroll-pb-4 px-4 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
            {flow === "cart" && (
              <PosCartPanelContent
                variant="drawer"
                lines={lines}
                productById={productById}
                onIncrement={increment}
                onDecrement={decrement}
                onRemove={remove}
                onReset={resetCart}
                onContinue={() => setFlow("payment")}
                customerId={selectedCustomerId}
                onCustomerSelect={(c) => setSelectedCustomerId(c?.id || null)}
                discounts={[]}
              />
            )}
            {flow === "payment" && (
              <div className="min-h-0 py-1">
                 <PosPaymentStep
                   totalGhs={totals.total}
                   isProcessing={isCheckingOut}
                   onBack={() => setFlow("cart")}
                   onComplete={handlePaymentComplete}
                 />
              </div>
            )}
            {flow === "receipt" && receiptData && (
              <div className="min-h-0 py-1">
                 <PosReceiptStep receiptData={receiptData} onNewSale={handleNewSale} />
              </div>
            )}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
