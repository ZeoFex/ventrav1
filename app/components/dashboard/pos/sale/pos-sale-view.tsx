"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Store } from "lucide-react";
import { useBranchContext } from "../../branch-context";
import { useSession } from "../../../auth/use-session";

import type { CartLine } from "./pos-cart-totals";
import { computePosTotals } from "./pos-cart-totals";
import { PosCartPanel, PosMobileCartDock } from "./pos-cart-panel";
import { PosCategoryBar } from "./pos-category-bar";
import type { GhanaPaymentMethodId } from "./pos-payment-methods";
import { getPaymentMethod } from "./pos-payment-methods";
import { PosPaymentStep } from "./pos-payment-step";
import type { PosReceiptData, PosReceiptLine } from "./pos-receipt-data";
import { PosReceiptStep } from "./pos-receipt-step";
import { PosBarcodeScanPanel } from "./pos-barcode-scan-panel";
import { PosProductCard } from "./pos-product-card";
import { playPosAddProductBeep } from "./pos-add-beep";
import {
  addHeldSale,
  getHeldSale,
  removeHeldSale,
} from "./pos-held-sales-storage";

import { useProducts, useCategories } from "../../products/products-data-hooks";
import { useDiscounts, type Discount } from "../../marketing/discounts-data-hooks";
import { type ProductRow } from "../../products/types";
import { type CustomerRow } from "../../customers/customers-mock-data";
import { usePosConfig } from "./pos-config-hooks";

type Flow = "browse" | "payment" | "receipt";

const STORE_NAME = "Ventra POS";
const BRANCH_NAME = "Main Branch";

function newInvoiceId(): string {
  return `INV-${Date.now().toString(36).toUpperCase()}`;
}

function buildReceiptData(
  lines: CartLine[],
  productById: Map<string, ProductRow>,
  totals: ReturnType<typeof computePosTotals>,
  payment: {
    methodId: GhanaPaymentMethodId;
    amountTenderedGhs: number;
    changeGhs: number;
  },
  invoiceId: string,
  customerName?: string,
  businessName?: string,
  receiptHeader?: string,
  receiptFooter?: string,
  currencySymbol?: string,
  operatorName?: string,
): PosReceiptData {
  const receiptLines: PosReceiptLine[] = lines.map((line) => {
    const p = productById.get(line.productId)!;
    return {
      name: p.name,
      qty: line.qty,
      unitPriceGhs: Number(p.priceGhs),
      lineTotalGhs: Number(p.priceGhs) * line.qty,
    };
  });
  const m = getPaymentMethod(payment.methodId);
  return {
    invoiceId,
    date: new Date(),
    lines: receiptLines,
    subtotal: totals.subtotal,
    tax: totals.tax,
    discount: totals.discount,
    total: totals.total,
    paymentMethodLabel: m?.label ?? payment.methodId,
    amountTenderedGhs: payment.amountTenderedGhs,
    changeGhs: payment.changeGhs,
    customerName,
    storeName: businessName || STORE_NAME,
    branchName: BRANCH_NAME, // Keep branch name as is or add to config later
    receiptHeader,
    receiptFooter,
    operatorName,
    currencySymbol: currencySymbol || "GHS",
  };
}

function PosSaleSkeleton() {
  return (
    <div className="min-h-full bg-[#F8F9FA] dark:bg-[#0a0a0a] flex items-center justify-center">
      <Loader2 className="size-8 animate-spin text-muted-foreground opacity-20" />
    </div>
  );
}

function PosSaleResumeBridge({
  onLines,
}: {
  onLines: (lines: CartLine[]) => void;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const id = searchParams.get("resume");
    if (!id) return;
    const held = getHeldSale(id);
    if (held && held.lines.length > 0) {
      onLines(held.lines);
      removeHeldSale(id);
    }
    router.replace("/dashboard/pos/sale", { scroll: false });
  }, [searchParams, router, onLines]);

  return null;
}

function PosSaleViewInner() {
  const router = useRouter();
  const { user } = useSession();
  const { branchId } = useBranchContext();
  const [flow, setFlow] = useState<Flow>("browse");
  const [categoryId, setCategoryId] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [lines, setLines] = useState<CartLine[]>([]);
  const [invoiceId, setInvoiceId] = useState<string | null>(null);
  const [paymentSnapshot, setPaymentSnapshot] = useState<{
    methodId: GhanaPaymentMethodId;
    amountTenderedGhs: number;
    changeGhs: number;
  } | null>(null);
  const [scanOpen, setScanOpen] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRow | null>(null);

  const { products = [], isLoading: isProductsLoading, mutate: mutateProducts } = useProducts();
  const { categories = [] } = useCategories();
  const { discounts = [] } = useDiscounts();
  const { config } = usePosConfig();

  const [manualDiscountId, setManualDiscountId] = useState<string | null>(null);

  const taxRate = useMemo(() => {
    if (!config) return 0;
    return parseFloat(config.taxRate) / 100;
  }, [config]);

  const productById = useMemo(() => {
    const m = new Map<string, ProductRow>();
    products.forEach((p: ProductRow) => m.set(p.id, p));
    return m;
  }, [products]);

  // 1. Calculate subtotal first to check min order values
  const preDiscountSubtotal = useMemo(() => {
    return lines.reduce((sum, line) => {
      const p = productById.get(line.productId);
      return sum + (p ? Number(p.priceGhs) * line.qty : 0);
    }, 0);
  }, [lines, productById]);

  // 2. Determine applied discount
  const appliedDiscount = useMemo(() => {
    if (manualDiscountId) {
      return discounts.find((d: Discount) => d.id === manualDiscountId) || null;
    }
    // Auto-apply logic: find the best valid auto-apply discount
    let bestDiscount: Discount | null = null;
    let maxDiscountAmount = 0;

    for (const d of discounts) {
      if (!d.isActive || !d.autoApply) continue;
      if (d.minOrderValueGhs && preDiscountSubtotal < Number(d.minOrderValueGhs)) continue;
      
      const amount = d.type === "percentage" 
        ? preDiscountSubtotal * (Number(d.value) / 100)
        : Number(d.value);
        
      if (amount > maxDiscountAmount) {
        maxDiscountAmount = amount;
        bestDiscount = d;
      }
    }
    return bestDiscount;
  }, [manualDiscountId, discounts, preDiscountSubtotal]);

  // 3. Compute discountGhs
  const discountGhs = useMemo(() => {
    if (!appliedDiscount) return 0;
    return appliedDiscount.type === "percentage"
      ? preDiscountSubtotal * (Number(appliedDiscount.value) / 100)
      : Number(appliedDiscount.value);
  }, [appliedDiscount, preDiscountSubtotal]);

  const totals = useMemo(
    () => computePosTotals(lines, productById, { taxRate, discountGhs }),
    [lines, productById, taxRate, discountGhs],
  );

  const receiptData = useMemo((): PosReceiptData | null => {
    if (!invoiceId || !paymentSnapshot || lines.length === 0) return null;
    return buildReceiptData(
      lines,
      productById,
      totals,
      paymentSnapshot,
      invoiceId,
      selectedCustomer?.name,
      config?.name,
      config?.receiptHeader || undefined,
      config?.receiptFooter || undefined,
      config?.currency || "GHS",
      user?.name || "SYSTEM",
    );
  }, [invoiceId, paymentSnapshot, lines, productById, totals, selectedCustomer, config]);

  const addToCart = useCallback((productId: string) => {
    const p = productById.get(productId);
    if (!p) return;

    // Check availability
    const inCart = lines.find(l => l.productId === productId)?.qty || 0;
    if (inCart >= p.stock) {
      alert(`Cannot add more of ${p.name}. Stock limit reached.`);
      return;
    }

    playPosAddProductBeep();
    setLines((prev) => {
      const i = prev.findIndex((l) => l.productId === productId);
      if (i >= 0) {
        const next = [...prev];
        next[i] = { ...next[i]!, qty: next[i]!.qty + 1 };
        return next;
      }
      return [...prev, { productId, qty: 1 }];
    });
  }, [lines, productById]);

  const increment = useCallback((productId: string) => {
    const p = productById.get(productId);
    if (!p) return;

    setLines((prev) =>
      prev.map((l) => {
        if (l.productId === productId) {
          if (l.qty >= p.stock) {
            alert(`Cannot add more of ${p.name}. Stock limit reached.`);
            return l;
          }
          return { ...l, qty: l.qty + 1 };
        }
        return l;
      }),
    );
  }, [productById]);

  const decrement = useCallback((productId: string) => {
    setLines((prev) =>
      prev
        .map((l) =>
          l.productId === productId ? { ...l, qty: l.qty - 1 } : l,
        )
        .filter((l) => l.qty > 0),
    );
  }, []);

  const remove = useCallback((productId: string) => {
    setLines((prev) => prev.filter((l) => l.productId !== productId));
  }, []);

  const resetCart = useCallback(() => setLines([]), []);

  const hydrateFromHeldSale = useCallback((next: CartLine[]) => {
    setLines(next.map((l) => ({ ...l })));
  }, []);

  const handleHoldSale = useCallback(() => {
    if (lines.length === 0) return;
    addHeldSale(lines);
    setLines([]);
    router.push("/dashboard/pos/held");
  }, [lines, router]);

  const goToPayment = useCallback(() => {
    if (lines.length === 0) return;
    setFlow("payment");
  }, [lines.length]);

  const handlePaymentComplete = useCallback(
    async (payload: {
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
        customerId: selectedCustomer?.id,
        lines: lines.map((l) => {
          const p = productById.get(l.productId)!;
          return {
            productId: l.productId,
            quantity: l.qty,
            productName: p.name,
            unitPriceGhs: Number(p.priceGhs),
            lineTotalGhs: Number(p.priceGhs) * l.qty,
          };
        }),
      };

      try {
        if (navigator.onLine) {
          // Online: send to server immediately
          const res = await fetch("/api/pos/checkout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(checkoutPayload),
          });

          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || "Checkout failed");
          }
        } else {
          // Offline: queue for later sync
          const { addToSyncQueue, updateCachedProductStock } = await import("@/app/lib/offline/offline-db");
          await addToSyncQueue({ type: "checkout", payload: checkoutPayload });

          // Deduct stock locally in IndexedDB
          for (const l of lines) {
            await updateCachedProductStock(l.productId, l.qty).catch(() => {});
          }
        }

        // Optimistic cache update (works for both online and offline)
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
        setPaymentSnapshot({ ...payload, _offline: !navigator.onLine } as any);
        setFlow("receipt");
      } catch (err: any) {
        alert(`Error processing checkout: ${err.message}`);
      } finally {
        setIsCheckingOut(false);
      }
    },
    [lines, mutateProducts, productById, totals, selectedCustomer],
  );

  const handleNewSale = useCallback(() => {
    setLines([]);
    setSelectedCustomer(null);
    setPaymentSnapshot(null);
    setInvoiceId(null);
    setFlow("browse");
  }, []);

  const filteredProducts = useMemo(() => {
    let list = categories.length > 0 && categoryId !== "all"
      ? products.filter((p: any) => p.categoryId === categoryId)
      : products;

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p: any) =>
          p.name.toLowerCase().includes(q) ||
          (p.description || "").toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q),
      );
    }
    return list;
  }, [products, categories, categoryId, searchQuery]);

  if (branchId === "all") {
    return (
      <div className="flex min-h-full flex-col items-center justify-center bg-[#F8F9FA] px-4 py-20 text-center dark:bg-[#0a0a0a]">
        <div className="mb-6 flex size-20 items-center justify-center rounded-full bg-amber-500/10 dark:bg-amber-500/20">
          <Store className="size-10 text-amber-600 dark:text-amber-500" strokeWidth={2} />
        </div>
        <h2 className="mb-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl font-[family-name:var(--font-display)]">
          Select a Branch to Continue
        </h2>
        <p className="mx-auto max-w-md text-[15px] leading-relaxed text-muted-foreground">
          You are currently in the Global View. To open the register and process a sale, please select a specific operating branch from the dropdown menu in the header.
        </p>
      </div>
    );
  }

  return (
    <>
      <PosSaleResumeBridge onLines={hydrateFromHeldSale} />
      {flow === "payment" ? (
        <div className="min-h-full bg-[#F8F9FA] dark:bg-[#0a0a0a]">
          <PosPaymentStep
            totalGhs={totals.total}
            isProcessing={isCheckingOut}
            onBack={() => setFlow("browse")}
            onComplete={handlePaymentComplete}
          />
        </div>
      ) : flow === "receipt" && receiptData ? (
        <div className="min-h-full bg-[#F8F9FA] dark:bg-[#0a0a0a]">
          <PosReceiptStep receiptData={receiptData} onNewSale={handleNewSale} />
        </div>
      ) : (
        <div className="min-h-full bg-[#F8F9FA] dark:bg-[#0a0a0a]">
          <PosBarcodeScanPanel
            open={scanOpen}
            onClose={() => setScanOpen(false)}
            products={products}
            onProductAdded={(p) => addToCart(p.id)}
            mobileCart={{
              lines,
              productById,
              onIncrement: increment,
              onDecrement: decrement,
              totalGhs: totals.total,
              onContinueToPayment: () => {
                setScanOpen(false);
                goToPayment();
              },
            }}
          />
          <div className="mx-auto flex max-w-[1600px] flex-col gap-5 px-3 py-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:gap-6 sm:px-4 sm:py-6 lg:flex-row lg:gap-8 lg:px-8 lg:py-8 lg:pb-8">
            <div className="min-w-0 flex-1 space-y-5 sm:space-y-6">
              <PosCategoryBar
                categories={categories}
                activeId={categoryId}
                onSelect={setCategoryId}
                searchQuery={searchQuery}
                onSearchQueryChange={setSearchQuery}
                onOpenScan={() => setScanOpen(true)}
              />
              {isProductsLoading ? (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3 sm:gap-4 xl:gap-5">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="h-48 rounded-[1.25rem] bg-muted animate-pulse" />
                  ))}
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="py-20 text-center text-muted-foreground opacity-50">
                  No products found.
                </div>
              ) : (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3 sm:gap-4 xl:gap-5">
                  {filteredProducts.map((p: ProductRow) => {
                    const inCart = lines.find(l => l.productId === p.id)?.qty || 0;
                    const available = p.stock - inCart;
                    return (
                      <PosProductCard
                        key={p.id}
                        product={p}
                        availableStock={available}
                        onAdd={() => addToCart(p.id)}
                      />
                    );
                  })}
                </div>
              )}
            </div>
            <PosCartPanel
              lines={lines}
              productById={productById}
              customerId={selectedCustomer?.id ?? null}
              onCustomerSelect={setSelectedCustomer}
              onIncrement={increment}
              onDecrement={decrement}
              onRemove={remove}
              onReset={resetCart}
              onContinue={goToPayment}
              onHoldSale={handleHoldSale}
              discounts={discounts}
              appliedDiscount={appliedDiscount}
              onSelectDiscount={setManualDiscountId}
            />
            <PosMobileCartDock
              lines={lines}
              productById={productById}
              customerId={selectedCustomer?.id ?? null}
              onCustomerSelect={setSelectedCustomer}
              onIncrement={increment}
              onDecrement={decrement}
              onRemove={remove}
              onReset={resetCart}
              onContinue={goToPayment}
              onHoldSale={handleHoldSale}
              discounts={discounts}
              appliedDiscount={appliedDiscount}
              onSelectDiscount={setManualDiscountId}
            />
          </div>
        </div>
      )}
    </>
  );
}

export function PosSaleView() {
  return (
    <Suspense fallback={<PosSaleSkeleton />}>
      <PosSaleViewInner />
    </Suspense>
  );
}
