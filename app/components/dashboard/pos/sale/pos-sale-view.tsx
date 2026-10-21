"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Store } from "lucide-react";
import { toast } from "sonner";
import { useBranchContext } from "../../branch-context";
import { useSession } from "../../../auth/use-session";

import type { CartLine } from "./pos-cart-totals";
import { computePosTotals, computeDiscountGhs, computeEligibleSubtotal } from "./pos-cart-totals";
import { PosCartPanel, PosMobileCartDock } from "./pos-cart-panel";
import { PosCategoryBar } from "./pos-category-bar";
import { getPaymentMethod } from "./pos-payment-methods";
import type { PosPaymentCompletion } from "./pos-payment-completion";
import { PosPaymentStep } from "./pos-payment-step";
import {
  resolveBranchReceiptMeta,
  buildCustomerOrderAdvancePaymentReceiptData,
  type PosReceiptData,
  type PosReceiptLine,
} from "./pos-receipt-data";
import { PosReceiptStep } from "./pos-receipt-step";
import { PosBarcodeScanPanel } from "./pos-barcode-scan-panel";
import { resolveProductFromScan } from "./pos-barcode-resolve";
import {
  useIsDesktopLayout,
  usePosKeyboardWedge,
} from "./use-pos-keyboard-wedge";
import { PosProductCard, PosProductTableHeader } from "./pos-product-card";
import { PosQuickAddProductModal } from "./pos-quick-add-product-modal";
import { playPosAddProductBeep } from "./pos-add-beep";
import {
  addHeldSale,
  getHeldSale,
  removeHeldSale,
} from "./pos-held-sales-storage";
import { useGlobalCart } from "../global-cart-context";
import { usePosProductSearch } from "../pos-product-search-context";

import { useProducts, useCategories } from "../../products/products-data-hooks";
import { useDiscounts, type Discount } from "../../marketing/discounts-data-hooks";
import { type ProductRow } from "../../products/types";
import { type CustomerRow } from "../../customers/customers-mock-data";
import { applySoldToCatalog, catalogStockIsOnParent, onHandForLine } from "@/app/lib/apply-sold-stock";
import { usePosConfig } from "./pos-config-hooks";
import { useBranches } from "../../branches/branches-data-hooks";

type Flow = "browse" | "payment" | "receipt";

const STORE_NAME = "Ventra POS";

function newInvoiceId(): string {
  return `INV-${Date.now().toString(36).toUpperCase()}`;
}

export type PosPaymentSnapshot = {
  completion: PosPaymentCompletion;
  _offline?: boolean;
};

function roundMoney2(n: number): number {
  return Math.round(n * 100) / 100;
}

function sellableForLine(p: ProductRow, variationId?: string): number {
  return onHandForLine(p, variationId);
}

export function buildReceiptData(
  lines: CartLine[],
  productById: Map<string, ProductRow>,
  totals: ReturnType<typeof computePosTotals>,
  snapshot: PosPaymentSnapshot,
  invoiceId: string,
  branchName: string,
  branchLocation?: string,
  saleId?: string | null,
  customerName?: string,
  businessName?: string,
  receiptHeader?: string,
  receiptFooter?: string,
  currencySymbol?: string,
  operatorName?: string,
): PosReceiptData {
  const receiptLines: PosReceiptLine[] = lines.flatMap((line) => {
    const p = productById.get(line.productId);
    if (!p) {
      return [
        {
          name: "Item",
          qty: line.qty,
          unitPriceGhs: 0,
          lineTotalGhs: 0,
        },
      ];
    }
    let name = p.name;
    let price = Number(p.priceGhs);

    if (line.variationId && p.variations) {
      const v = p.variations.find(v => v.id === line.variationId);
      if (v) {
        name = `${p.name} (${v.name})`;
        if (v.priceGhs) price = Number(v.priceGhs);
      }
    }

    return {
      name,
      qty: line.qty,
      unitPriceGhs: price,
      lineTotalGhs: price * line.qty,
    };
  });
  const total = roundMoney2(totals.total);
  const comp = snapshot.completion;

  let paymentMethodLabel: string;
  /** Amount collected toward the invoice (not larger than total unless balance line shown). */
  let amountTenderedGhs: number;
  let changeGhs: number;
  let paymentLines: PosReceiptData["paymentLines"];
  let balanceDueGhs: number | undefined;

  if (comp.kind === "single") {
    const m = getPaymentMethod(comp.methodId);
    paymentMethodLabel = m?.label ?? comp.methodId;
    if (m?.usesTenderAndChange) {
      amountTenderedGhs = comp.amountTenderedGhs;
      changeGhs = comp.changeGhs;
    } else {
      amountTenderedGhs = total;
      changeGhs = 0;
    }
  } else if (comp.kind === "multi") {
    const paid = roundMoney2(comp.lines.reduce((s, l) => s + l.amountGhs, 0));
    amountTenderedGhs = paid;
    changeGhs = roundMoney2(Math.max(0, paid - total));
    paymentLines = comp.lines.map((l) => ({
      label: getPaymentMethod(l.methodId)?.shortLabel ?? l.methodId,
      amountGhs: roundMoney2(l.amountGhs),
    }));
    const due = roundMoney2(total - paid);
    if (due > 0.02) {
      balanceDueGhs = due;
      paymentMethodLabel =
        comp.lines.length > 1 ? "Split + balance due" : "Deposit / account balance";
    } else {
      paymentMethodLabel =
        comp.lines.length > 1 ? "Split payment" : (getPaymentMethod(comp.lines[0]!.methodId)?.label ?? "Payment");
    }
  } else {
    paymentMethodLabel = "Reserved (no payment)";
    amountTenderedGhs = 0;
    changeGhs = 0;
  }

  return {
    invoiceId,
    date: new Date(),
    lines: receiptLines,
    subtotal: totals.subtotal,
    tax: totals.tax,
    discount: totals.discount,
    total: totals.total,
    paymentMethodLabel,
    amountTenderedGhs,
    changeGhs,
    paymentLines,
    balanceDueGhs,
    customerName,
    storeName: businessName || STORE_NAME,
    branchName,
    branchLocation,
    receiptHeader,
    receiptFooter,
    operatorName,
    currencySymbol: currencySymbol || "GHS",
    saleId: saleId ?? undefined,
  };
}

function PosSaleSkeleton() {
  return (
    <div className="flex h-full min-h-0 items-center justify-center bg-[#F8F9FA] dark:bg-[#0a0a0a]">
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
  const {
    searchQuery,
    setSearchQuery,
    categoryId,
    setCategoryId,
    setShowCatalogChrome,
    registerOpenScan,
    registerOpenQuickAdd,
  } = usePosProductSearch();
  const {
    lines,
    setLines,
    selectedCustomer,
    selectCustomer,
    finishActiveCustomerCart: finishSharedCustomerCart,
    resetCart: resetActiveCustomerCart,
    manualDiscountId,
    setManualDiscountId,
    customerCartsReady,
    setLastAdded,
  } = useGlobalCart();
  const [invoiceId, setInvoiceId] = useState<string | null>(null);
  /** Server sale UUID for `/receipt/verify/{id}` — unset for offline-queued checkouts. */
  const [receiptSaleId, setReceiptSaleId] = useState<string | null>(null);
  const [paymentSnapshot, setPaymentSnapshot] = useState<PosPaymentSnapshot | null>(null);
  /** Receipt for customer-order advance payment (no regular sale invoice). */
  const [customerOrderReceipt, setCustomerOrderReceipt] =
    useState<PosReceiptData | null>(null);
  const [scanOpen, setScanOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [paymentPurpose, setPaymentPurpose] = useState<"sale" | "customer_order">("sale");
  const [selectedVariationProduct, setSelectedVariationProduct] = useState<ProductRow | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const skipEmptyCartCloseRef = useRef(false);

  useEffect(() => {
    setShowCatalogChrome(flow === "browse");
    return () => setShowCatalogChrome(false);
  }, [flow, setShowCatalogChrome]);

  useEffect(() => {
    if (!customerCartsReady) return;
    if (lines.length > 0) return;
    if (skipEmptyCartCloseRef.current) {
      skipEmptyCartCloseRef.current = false;
      return;
    }
    setCartOpen(false);
  }, [customerCartsReady, lines.length]);

  useEffect(() => {
    registerOpenScan(() => setScanOpen(true));
    return () => registerOpenScan(null);
  }, [registerOpenScan]);

  const { products = [], isLoading: isProductsLoading, mutate: mutateProducts } = useProducts();
  const { categories = [] } = useCategories();
  const { discounts = [] } = useDiscounts();
  const { config } = usePosConfig();
  const { branches = [] } = useBranches();

  const canQuickAddProduct =
    user?.role === "owner" ||
    (user?.permissions?.length &&
      user.permissions.includes("product-list"));

  useEffect(() => {
    if (!canQuickAddProduct) {
      registerOpenQuickAdd(null);
      return;
    }
    registerOpenQuickAdd(() => setQuickAddOpen(true));
    return () => registerOpenQuickAdd(null);
  }, [canQuickAddProduct, registerOpenQuickAdd]);

  const branchMeta = useMemo(
    () => resolveBranchReceiptMeta(branches, branchId),
    [branches, branchId],
  );

  const taxRate = useMemo(() => {
    if (!config) return 0;
    return parseFloat(config.taxRate) / 100;
  }, [config]);

  const productById = useMemo(() => {
    const m = new Map<string, ProductRow>();
    products.forEach((p: ProductRow) => m.set(p.id, p));
    return m;
  }, [products]);

  // Determine applied discount and totals
  const appliedDiscount = useMemo(() => {
    if (manualDiscountId) {
      return discounts.find((d: Discount) => d.id === manualDiscountId) || null;
    }
    // Auto-apply logic: find the best valid auto-apply discount
    let bestDiscount: Discount | null = null;
    let maxDiscountAmount = 0;

    for (const d of discounts) {
      if (!d.isActive || !d.autoApply) continue;

      const eligibleSubtotal = computeEligibleSubtotal(lines, productById, d);
      if (eligibleSubtotal <= 0) continue;
      if (d.minOrderValueGhs && eligibleSubtotal < Number(d.minOrderValueGhs)) continue;

      const amount = computeDiscountGhs(d, lines, productById);
      if (amount > maxDiscountAmount) {
        maxDiscountAmount = amount;
        bestDiscount = d;
      }
    }
    return bestDiscount;
  }, [manualDiscountId, discounts, lines, productById]);

  // Compute discountGhs
  const discountGhs = useMemo(() => {
    if (!appliedDiscount) return 0;
    return computeDiscountGhs(appliedDiscount, lines, productById);
  }, [appliedDiscount, lines, productById]);

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
      branchMeta.name,
      branchMeta.location,
      receiptSaleId,
      selectedCustomer?.name,
      config?.name,
      config?.receiptHeader || undefined,
      config?.receiptFooter || undefined,
      config?.currency || "GHS",
      user?.name || "SYSTEM",
    );
  }, [
    invoiceId,
    receiptSaleId,
    paymentSnapshot,
    lines,
    productById,
    totals,
    selectedCustomer,
    config,
    branchMeta,
    user?.name,
  ]);

  const activeReceipt = customerOrderReceipt ?? receiptData;
  const isDesktopLayout = useIsDesktopLayout();

  const addToCart = useCallback((productId: string, variationId?: string) => {
    const p = productById.get(productId);
    if (!p) return;

    const treatAsSimple = catalogStockIsOnParent(p);
    const lineVariationId = treatAsSimple ? undefined : variationId;
    const needsVariation =
      Boolean(p.variations?.length) && !lineVariationId && !treatAsSimple;

    if (needsVariation) {
      setSelectedVariationProduct(p);
      return;
    }

    playPosAddProductBeep();
    const variation = lineVariationId
      ? p.variations?.find((v) => v.id === lineVariationId)
      : undefined;
    setLastAdded({
      name: variation ? `${p.name} (${variation.name})` : p.name,
      imageSrc: p.imageSrc ?? null,
    });
    setLines((prev) => {
      const i = prev.findIndex((l) => l.productId === productId && l.variationId === lineVariationId);
      if (i >= 0) {
        const updated = { ...prev[i]!, qty: prev[i]!.qty + 1 };
        if (i === 0) {
          const next = [...prev];
          next[0] = updated;
          return next;
        }
        return [updated, ...prev.slice(0, i), ...prev.slice(i + 1)];
      }
      return [{ productId, qty: 1, variationId: lineVariationId }, ...prev];
    });
    setSelectedVariationProduct(null);
    // Desktop: open the transaction panel so cashiers can keep adding.
    // Mobile: leave the overlay closed — the bottom dock already shows the sale.
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(min-width: 1024px)").matches
    ) {
      setCartOpen(true);
    }
  }, [productById, setLines, setLastAdded]);
  const lastWedgeScanRef = useRef<{ raw: string; at: number } | null>(null);

  const handleKeyboardWedgeBarcode = useCallback(
    (raw: string) => {
      const now = Date.now();
      const prev = lastWedgeScanRef.current;
      if (prev && prev.raw === raw && now - prev.at < 500) return;
      lastWedgeScanRef.current = { raw, at: now };

      const result = resolveProductFromScan(raw, products);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      addToCart(result.product.id, result.variationId);
    },
    [products, addToCart],
  );

  usePosKeyboardWedge({
    enabled: flow === "browse" && isDesktopLayout && branchId !== "all",
    onBarcode: handleKeyboardWedgeBarcode,
  });

  const increment = useCallback((productId: string, variationId?: string) => {
    const p = productById.get(productId);
    if (!p) return;

    setLines((prev) =>
      prev.map((l) => {
        if (l.productId === productId && l.variationId === variationId) {
          return { ...l, qty: l.qty + 1 };
        }
        return l;
      }),
    );
  }, [productById, setLines]);

  const decrement = useCallback((productId: string, variationId?: string) => {
    setLines((prev) =>
      prev
        .map((l) =>
          l.productId === productId && l.variationId === variationId
            ? { ...l, qty: l.qty - 1 }
            : l,
        )
        .filter((l) => l.qty > 0),
    );
  }, [setLines]);

  const setQuantity = useCallback(
    (productId: string, qty: number, variationId?: string) => {
      const p = productById.get(productId);
      if (!p) return;
      const nextQty = Math.floor(qty);
      if (!Number.isFinite(nextQty) || nextQty <= 0) {
        setLines((prev) =>
          prev.filter(
            (l) => !(l.productId === productId && l.variationId === variationId),
          ),
        );
        return;
      }

      setLines((prev) =>
        prev.map((l) => {
          if (l.productId !== productId || l.variationId !== variationId) return l;
          return { ...l, qty: nextQty };
        }),
      );
    },
    [productById, setLines],
  );

  const remove = useCallback((productId: string, variationId?: string) => {
    setLines((prev) =>
      prev.filter(
        (l) => !(l.productId === productId && l.variationId === variationId),
      ),
    );
  }, [setLines]);

  const handleCustomerSelect = useCallback(
    (next: CustomerRow | null) => {
      const { nextLineCount } = selectCustomer(next);
      skipEmptyCartCloseRef.current = nextLineCount === 0;
      setCartOpen(true);
    },
    [selectCustomer],
  );

  const finishActiveCustomerCart = useCallback(() => {
    const { nextLineCount } = finishSharedCustomerCart();
    skipEmptyCartCloseRef.current = nextLineCount === 0;
    if (nextLineCount > 0) setCartOpen(true);
  }, [finishSharedCustomerCart]);

  const resetCart = useCallback(() => {
    resetActiveCustomerCart();
    setCartOpen(false);
  }, [resetActiveCustomerCart]);

  const hydrateFromHeldSale = useCallback((next: CartLine[]) => {
    setLines(next.map((l) => ({ ...l })));
    if (next.length > 0) setCartOpen(true);
  }, [setLines]);

  const handleHoldSale = useCallback(() => {
    if (lines.length === 0) return;
    addHeldSale(lines);
    resetActiveCustomerCart();
    router.push("/dashboard/pos/held");
  }, [lines, resetActiveCustomerCart, router]);

  const goToPayment = useCallback(() => {
    if (lines.length === 0) return;
    setPaymentPurpose("sale");
    setFlow("payment");
  }, [lines.length]);

  const goToCustomerOrderPayment = useCallback(() => {
    if (lines.length === 0) return;
    if (!selectedCustomer) {
      toast.error("Select a customer on the cart for pay-and-hold orders.");
      return;
    }
    setPaymentPurpose("customer_order");
    setFlow("payment");
  }, [lines.length, selectedCustomer]);

  const handlePaymentComplete = useCallback(
    async (completion: PosPaymentCompletion) => {
      if (completion.kind === "reserve_only") return;
      setCustomerOrderReceipt(null);
      setIsCheckingOut(true);
      const thisInvoiceId = newInvoiceId();

      const paymentLines =
        completion.kind === "single"
          ? [
                {
                    paymentMethod: completion.methodId,
                    amountGhs: roundMoney2(totals.total),
                },
            ]
          : completion.lines.map((l) => ({
                paymentMethod: l.methodId,
                amountGhs: roundMoney2(l.amountGhs),
            }));

      const checkoutPayload = {
        invoiceId: thisInvoiceId,
        subtotalGhs: totals.subtotal,
        taxGhs: totals.tax,
        discountGhs: totals.discount,
        totalGhs: totals.total,
        paymentMethod:
          paymentLines.length > 1 ? "split" : paymentLines[0]!.paymentMethod,
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
          if (!res.ok) {
            throw new Error(typeof data.error === "string" ? data.error : "Checkout failed");
          }
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
    },
    [lines, mutateProducts, productById, totals, selectedCustomer, setLines],
  );

  const handleCustomerOrderComplete = useCallback(
    async (completion: PosPaymentCompletion) => {
      if (!selectedCustomer) {
        toast.error("Customer is required.");
        return;
      }
      setIsCheckingOut(true);
      try {
        let paymentLinesPayload: { paymentMethod: string; amountGhs: number }[] = [];
        if (completion.kind === "reserve_only") {
          paymentLinesPayload = [];
        } else if (completion.kind === "single") {
          const method = getPaymentMethod(completion.methodId);
          const usesCash = method?.usesTenderAndChange ?? false;
          const amount = usesCash
            ? roundMoney2(Math.min(completion.amountTenderedGhs, totals.total))
            : roundMoney2(totals.total);
          paymentLinesPayload = [{ paymentMethod: completion.methodId, amountGhs: amount }];
        } else {
          paymentLinesPayload = completion.lines.map((l) => ({
            paymentMethod: l.methodId,
            amountGhs: roundMoney2(l.amountGhs),
          }));
        }

        const orderInvoiceId = `ORD-${Date.now().toString(36).toUpperCase()}`;
        const res = await fetch("/api/customer-orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            invoiceId: orderInvoiceId,
            subtotalGhs: totals.subtotal,
            taxGhs: totals.tax,
            discountGhs: totals.discount,
            totalGhs: totals.total,
            customerId: selectedCustomer.id,
            ...(paymentLinesPayload.length > 0 ? { paymentLines: paymentLinesPayload } : {}),
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
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(typeof data.error === "string" ? data.error : "Failed to create order");
        }
        toast.success(
          `Customer order ${typeof data.invoiceId === "string" ? data.invoiceId : orderInvoiceId} saved.`,
        );
        if (
          paymentLinesPayload.length > 0 &&
          typeof data.invoiceId === "string"
        ) {
          const orderLinesForReceipt = lines.map((l) => {
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
              productName: name,
              quantity: l.qty,
              lineTotalGhs: price * l.qty,
            };
          });
          setCustomerOrderReceipt(
            buildCustomerOrderAdvancePaymentReceiptData({
              order: {
                invoiceId: data.invoiceId,
                subtotalGhs: totals.subtotal,
                taxGhs: totals.tax,
                discountGhs: totals.discount,
                totalGhs:
                  typeof data.totalGhs === "number" ? data.totalGhs : totals.total,
              },
              orderLines: orderLinesForReceipt,
              paymentLines: paymentLinesPayload,
              balanceDueGhs:
                typeof data.balanceDueGhs === "number" ? data.balanceDueGhs : 0,
              customerName: selectedCustomer.name,
              storeName: config?.name?.trim() || STORE_NAME,
              branchName: branchMeta.name,
              branchLocation: branchMeta.location,
              receiptHeader: config?.receiptHeader || undefined,
              receiptFooter: config?.receiptFooter || undefined,
              operatorName: user?.name || "SYSTEM",
              currencySymbol: config?.currency || "GHS",
            }),
          );
          setPaymentPurpose("sale");
          setPaymentSnapshot(null);
          setInvoiceId(null);
          setReceiptSaleId(null);
          setFlow("receipt");
        } else {
          finishActiveCustomerCart();
          setPaymentPurpose("sale");
          setFlow("browse");
        }
        await mutateProducts();
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Order failed");
      } finally {
        setIsCheckingOut(false);
      }
    },
    [
      lines,
      productById,
      totals,
      selectedCustomer,
      mutateProducts,
      setLines,
      branchMeta,
      config,
      user?.name,
      finishActiveCustomerCart,
    ],
  );

  const handleNewSale = useCallback(() => {
    finishActiveCustomerCart();
    setPaymentSnapshot(null);
    setInvoiceId(null);
    setReceiptSaleId(null);
    setCustomerOrderReceipt(null);
    setPaymentPurpose("sale");
    setSearchQuery("");
    setFlow("browse");
  }, [finishActiveCustomerCart, setSearchQuery]);

  const filteredProducts = useMemo(() => {
    let list = categories.length > 0 && categoryId !== "all"
      ? products.filter((p: ProductRow) => p.categoryId === categoryId)
      : products;

    const q = searchQuery.trim().toLowerCase();
    const relevance = (p: ProductRow) => {
      const name = (p.name ?? "").toLowerCase();
      const sku = (p.sku ?? "").toLowerCase();
      if (name === q || sku === q) return 0;
      if (name.startsWith(q) || sku.startsWith(q)) return 1;
      if (name.includes(q) || sku.includes(q)) return 2;
      return 3;
    };

    if (q) {
      const tokens = q.split(/\s+/).filter(Boolean);
      list = list.filter((p: ProductRow) => {
        const variationText = Array.isArray(p.variations)
          ? p.variations
              .map((v) => `${v?.name ?? ""} ${v?.type ?? ""} ${v?.sku ?? ""}`)
              .join(" ")
          : "";

        const haystack = `${p.name ?? ""} ${p.sku ?? ""} ${p.barcode ?? ""} ${(p as any).categoryName ?? ""} ${(p as any).subcategoryName ?? ""} ${p.description ?? ""} ${variationText}`
          .toLowerCase()
          .replace(/\s+/g, " ")
          .trim();

        if (haystack.includes(q)) return true;
        return tokens.every((t) => haystack.includes(t));
      });
    }

    // Single pass: in-stock first, then search relevance (stable otherwise).
    return [...list].sort((a, b) => {
      const aOut = sellableForLine(a) <= 0 ? 1 : 0;
      const bOut = sellableForLine(b) <= 0 ? 1 : 0;
      if (aOut !== bOut) return aOut - bOut;
      if (!q) return 0;
      return relevance(a) - relevance(b);
    });
  }, [products, categories, categoryId, searchQuery]);

  if (branchId === "all") {
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center bg-[#F8F9FA] px-4 py-20 text-center dark:bg-[#0a0a0a]">
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
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <PosSaleResumeBridge onLines={hydrateFromHeldSale} />
      {flow === "payment" ? (
        <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#F8F9FA] pb-[max(0.5rem,env(safe-area-inset-bottom))] dark:bg-[#0a0a0a] lg:overflow-y-auto lg:overscroll-contain lg:pb-0">
          <PosPaymentStep
            key={paymentPurpose}
            fillHeight
            totalGhs={totals.total}
            isProcessing={isCheckingOut}
            onBack={() => {
              setPaymentPurpose("sale");
              setFlow("browse");
            }}
            onComplete={
              paymentPurpose === "customer_order"
                ? handleCustomerOrderComplete
                : handlePaymentComplete
            }
            allowCreditDeposit={Boolean(selectedCustomer)}
            layawayMode={paymentPurpose === "customer_order"}
          />
        </div>
      ) : flow === "receipt" && activeReceipt ? (
        <div className="h-full min-h-0 overflow-y-auto overscroll-contain bg-[#F8F9FA] pb-[max(0.5rem,env(safe-area-inset-bottom))] dark:bg-[#0a0a0a]">
          <PosReceiptStep receiptData={activeReceipt} onNewSale={handleNewSale} />
        </div>
      ) : (
        <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#F6F8F7] dark:bg-[#0a0a0a]">
          <PosBarcodeScanPanel
            open={scanOpen}
            onClose={() => setScanOpen(false)}
            products={products}
            onProductAdded={(p, variationId) => addToCart(p.id, variationId)}
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
          <div className="relative mx-auto flex h-full min-h-0 w-full max-w-[1600px] flex-col gap-2 px-3 py-2 pb-[calc(var(--home-cart-dock-height)+0.35rem)] sm:gap-3 sm:px-4 sm:py-4 lg:px-6 lg:pb-4">
            <div className="hidden shrink-0 lg:block">
              <PosCategoryBar
                categories={categories}
                products={products}
                activeId={categoryId}
                onSelect={setCategoryId}
                showQuickAddProduct={Boolean(canQuickAddProduct)}
                onQuickAddProduct={() => setQuickAddOpen(true)}
              />
            </div>
            <div className="relative flex min-h-0 min-w-0 flex-1">
              <div
                className={`flex min-h-0 min-w-0 flex-1 flex-col transition-[margin] duration-200 ${
                  cartOpen ? "lg:mr-[min(412px,42vw)]" : ""
                }`}
              >
              {isProductsLoading ? (
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden sm:rounded-xl sm:border sm:border-[#e5e7eb] sm:bg-white dark:sm:border-white/[0.08] dark:sm:bg-[#111]">
                  <div className="hidden h-10 shrink-0 border-b border-[#e5e7eb] bg-[#f7f8f9] sm:block dark:border-white/[0.08] dark:bg-[#141414]" />
                  <div className="min-h-0 flex-1 overflow-hidden">
                    {[...Array(8)].map((_, i) => (
                      <div
                        key={i}
                        className="h-[58px] border-b border-[#edf1ef] last:border-b-0 dark:border-white/[0.06]"
                      >
                        <div className="flex h-full items-center gap-2.5 px-0 sm:px-4">
                          <div className="size-11 animate-pulse rounded-xl bg-[#edf1ef] dark:bg-muted" />
                          <div className="h-4 flex-1 animate-pulse rounded bg-[#edf1ef] dark:bg-muted" />
                          <div className="h-4 w-14 animate-pulse rounded bg-[#edf1ef] dark:bg-muted" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="flex min-h-0 flex-1 items-center justify-center text-[14px] font-medium text-[#7a8c84] dark:text-muted-foreground sm:rounded-xl sm:border sm:border-[#e5e7eb] sm:bg-white dark:sm:border-white/[0.08] dark:sm:bg-[#111]">
                  No products found.
                </div>
              ) : (
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden sm:rounded-xl sm:border sm:border-[#e5e7eb] sm:bg-white dark:sm:border-white/[0.08] dark:sm:bg-[#111]">
                  <PosProductTableHeader />
                  <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                    {filteredProducts.map((p: ProductRow) => {
                      const inCart = lines
                        .filter((l) => l.productId === p.id && !l.variationId)
                        .reduce((s, l) => s + l.qty, 0);
                      const available = sellableForLine(p) - inCart;
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
                </div>
              )}
            </div>
            <PosCartPanel
              open={cartOpen}
              onOpenChange={setCartOpen}
              lines={lines}
              productById={productById}
              customerId={selectedCustomer?.id ?? null}
              onCustomerSelect={handleCustomerSelect}
              onIncrement={increment}
              onDecrement={decrement}
              onSetQuantity={setQuantity}
              onRemove={remove}
              onReset={resetCart}
              onContinue={goToPayment}
              onCustomerOrder={goToCustomerOrderPayment}
              onHoldSale={handleHoldSale}
              discounts={discounts}
              appliedDiscount={appliedDiscount}
              onSelectDiscount={setManualDiscountId}
            />
            </div>
            <PosMobileCartDock
              open={cartOpen}
              onOpenChange={setCartOpen}
              lines={lines}
              productById={productById}
              customerId={selectedCustomer?.id ?? null}
              onCustomerSelect={handleCustomerSelect}
              onIncrement={increment}
              onDecrement={decrement}
              onSetQuantity={setQuantity}
              onRemove={remove}
              onReset={resetCart}
              onContinue={goToPayment}
              onCustomerOrder={goToCustomerOrderPayment}
              onHoldSale={handleHoldSale}
              discounts={discounts}
              appliedDiscount={appliedDiscount}
              onSelectDiscount={setManualDiscountId}
            />
          </div>
        </div>
      )}
      <PosVariationModal 
        product={selectedVariationProduct}
        onClose={() => setSelectedVariationProduct(null)}
        onSelect={(pId, vId) => addToCart(pId, vId)}
      />
      <PosQuickAddProductModal
        open={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        categories={categories}
      />
    </div>
  );
}

function PosVariationModal({
  product,
  onClose,
  onSelect,
}: {
  product: ProductRow | null;
  onClose: () => void;
  onSelect: (productId: string, variationId: string) => void;
}) {
  if (!product) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center p-0 sm:items-center sm:p-6">
      <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={onClose} />
      <div className="relative max-h-[80vh] w-full max-w-lg overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-3xl sm:p-6 dark:bg-[#111]">
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-muted sm:hidden" />
        <div className="p-3.5 pb-4 sm:p-0">
          <h2 className="text-[15px] font-bold sm:text-xl">{product.name}</h2>
          <p className="text-[12px] text-muted-foreground sm:text-sm">Select a variation</p>
        </div>

        <div className="grid max-h-[55vh] grid-cols-1 gap-1.5 overflow-y-auto px-3.5 pb-4 custom-scrollbar sm:gap-3 sm:px-0 sm:pr-2">
          {product.variations?.map((v) => {
            const sell = onHandForLine(product, v.id);
            const isLowOrOversold = sell <= 0;
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => onSelect(product.id, v.id!)}
                className="flex items-center justify-between rounded-xl border border-border p-2.5 text-left transition-all hover:border-[#006c49] hover:bg-[#006c49]/5 active:scale-[0.98] sm:rounded-2xl sm:p-4"
              >
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{v.type}</span>
                  <h3 className="text-[13px] font-semibold sm:text-[15px]">{v.name}</h3>
                  <p className={`text-[11px] ${isLowOrOversold ? "font-medium text-red-600 dark:text-red-400" : "text-muted-foreground"}`}>
                    {isLowOrOversold ? `${sell} in stock` : `${sell} available`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-[#006c49] dark:text-[#6ffbbe]">
                    ₵{v.priceGhs || product.priceGhs}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mx-3.5 mb-3 h-9 w-[calc(100%-1.75rem)] rounded-xl border border-border text-[13px] font-semibold hover:bg-muted sm:mx-0 sm:mb-0 sm:mt-4 sm:h-11 sm:w-full sm:rounded-2xl"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export function PosSaleView() {
  return (
    <div className="h-full min-h-0">
      <Suspense fallback={<PosSaleSkeleton />}>
        <PosSaleViewInner />
      </Suspense>
    </div>
  );
}
