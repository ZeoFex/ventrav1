"use client";

import { useState, useMemo } from "react";
import { useBranchContext } from "../branch-context";
import { useBranches } from "../branches/branches-data-hooks";
import { resolveBranchReceiptMeta } from "./sale/pos-receipt-data";
import { Drawer } from "vaul";
import { X } from "lucide-react";
import { useGlobalCart } from "./global-cart-context";
import { useProducts } from "../products/products-data-hooks";
import { PosCartPanelContent } from "./sale/pos-cart-panel";
import { PosPaymentStep } from "./sale/pos-payment-step";
import { PosReceiptStep } from "./sale/pos-receipt-step";
import { computePosTotals } from "./sale/pos-cart-totals";
import { ProductRow } from "../products/types";
import { applySoldToCatalog } from "@/app/lib/apply-sold-stock";
import { usePosConfig } from "./sale/pos-config-hooks";
import { useSession } from "../../auth/use-session";
import type { PosReceiptData } from "./sale/pos-receipt-data";
import type { PosPaymentCompletion } from "./sale/pos-payment-completion";
import {
  buildReceiptData,
  type PosPaymentSnapshot,
} from "./sale/pos-sale-view";

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
  const { lines, setLines, increment, decrement, remove, resetCart, selectedCustomer, selectCustomer, finishActiveCustomerCart } = useGlobalCart();
  const { products = [], mutate: mutateProducts } = useProducts(isOpen || lines.length > 0);
  const { config } = usePosConfig();
  const { user } = useSession();
  const { branchId } = useBranchContext();
  const { branches = [] } = useBranches();

  const setQuantity = (productId: string, qty: number, variationId?: string) => {
    const nextQty = Math.floor(qty);
    if (!Number.isFinite(nextQty) || nextQty <= 0) {
      remove(productId, variationId);
      return;
    }
    setLines((prev) =>
      prev.map((l) =>
        l.productId === productId && l.variationId === variationId
          ? { ...l, qty: nextQty }
          : l,
      ),
    );
  };

  const branchMeta = useMemo(
    () => resolveBranchReceiptMeta(branches, branchId),
    [branches, branchId],
  );

  const [flow, setFlow] = useState<"cart" | "payment" | "receipt">("cart");
  const [paymentSnapshot, setPaymentSnapshot] = useState<PosPaymentSnapshot | null>(null);
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

  const handlePaymentComplete = async (completion: PosPaymentCompletion) => {
    if (completion.kind === "reserve_only") return;
    setIsCheckingOut(true);
    const thisInvoiceId = newInvoiceId();

    const round2 = (n: number) => Math.round(n * 100) / 100;
    const paymentLines =
      completion.kind === "single"
        ? [{ paymentMethod: completion.methodId, amountGhs: round2(totals.total) }]
        : completion.lines.map((l) => ({
            paymentMethod: l.methodId,
            amountGhs: round2(l.amountGhs),
          }));

    const checkoutPayload = {
      invoiceId: thisInvoiceId,
      subtotalGhs: totals.subtotal,
      taxGhs: totals.tax,
      discountGhs: totals.discount,
      totalGhs: totals.total,
      paymentMethod: paymentLines.length > 1 ? "split" : paymentLines[0]!.paymentMethod,
      paymentLines,
      customerId: selectedCustomer?.id ?? null,
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
        if (!res.ok)
          throw new Error(typeof data.error === "string" ? data.error : "Checkout failed");
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
            return applySoldToCatalog(
              current,
              lines.map((l) => ({
                productId: l.productId,
                variationId: l.variationId,
                qty: l.qty,
              })),
            );
          },
          { revalidate: navigator.onLine },
        );

      setInvoiceId(thisInvoiceId);
      setPaymentSnapshot({ completion, _offline: !navigator.onLine });
      setFlow("receipt");
    } catch (err: any) {
      alert(`Error processing checkout: ${err.message}`);
    } finally {
      setIsCheckingOut(false);
    }
  };

  const receiptData = useMemo((): PosReceiptData | null => {
    if (!invoiceId || !paymentSnapshot || lines.length === 0) return null;
    const missingProduct = lines.some((l) => !productById.get(l.productId));
    if (missingProduct && productById.size === 0) return null;
    return buildReceiptData(
      lines,
      productById,
      totals,
      paymentSnapshot,
      invoiceId,
      branchMeta.name,
      branchMeta.location,
      receiptSaleId,
      selectedCustomer?.name,
      config?.name || "Ventra POS",
      config?.receiptHeader ?? undefined,
      config?.receiptFooter ?? undefined,
      config?.currency || "GHS",
      user?.name || "SYSTEM",
    );
  }, [invoiceId, receiptSaleId, paymentSnapshot, lines, productById, totals, config, user, branchMeta, selectedCustomer]);

  const handleNewSale = () => {
    finishActiveCustomerCart();
    setPaymentSnapshot(null);
    setInvoiceId(null);
    setReceiptSaleId(null);
    setFlow("cart");
    onClose();
  };

  return (
    <Drawer.Root open={isOpen} onOpenChange={(open) => !open && onClose()} direction="bottom">
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-[80] mx-auto mt-24 flex max-h-[92vh] min-h-0 w-full max-w-[480px] flex-col rounded-t-2xl bg-background shadow-2xl outline-none sm:max-h-[85vh] sm:rounded-t-[2rem]">
          <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-muted-foreground/20" />
          <div className="flex shrink-0 items-center justify-between border-b px-3 py-2.5 dark:border-white/10 sm:px-5 sm:py-4">
            <Drawer.Title className="text-[15px] font-semibold sm:text-lg">
              {flow === "payment" ? "Payment" : flow === "receipt" ? "Receipt" : "Quick Cart"}
            </Drawer.Title>
            <button type="button" onClick={onClose} className="rounded-full bg-surface-elevated p-1.5 hover:bg-muted sm:p-2">
              <X className="size-4 sm:size-5" />
            </button>
          </div>
          <div className="flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto scroll-pb-4 px-3 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-4 sm:pt-3">
            {flow === "cart" && (
              <PosCartPanelContent
                variant="drawer"
                lines={lines}
                productById={productById}
                onIncrement={increment}
                onDecrement={decrement}
                onSetQuantity={setQuantity}
                onRemove={remove}
                onReset={resetCart}
                onContinue={() => setFlow("payment")}
                customerId={selectedCustomer?.id ?? null}
                onCustomerSelect={selectCustomer}
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
                  allowCreditDeposit={Boolean(selectedCustomer)}
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
