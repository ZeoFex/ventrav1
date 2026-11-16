"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
  useRef,
} from "react";
import { type CartLine } from "./sale/pos-cart-totals";
import { toast } from "sonner";
import { type CustomerRow } from "../customers/customers-mock-data";
import {
  WALKIN_CART_KEY,
  cloneCartLines,
  cartsMatch,
  customerCartKey,
  emptyCartBucket,
  loadCustomerCarts,
  saveCustomerCarts,
  type CustomerCartBucket,
} from "./sale/pos-customer-carts-storage";

type CustomerCartSwitchResult = {
  nextLineCount: number;
};

type LastAddedItem = {
  name: string;
  imageSrc: string | null;
};

type GlobalCartContextType = {
  lines: CartLine[];
  setLines: React.Dispatch<React.SetStateAction<CartLine[]>>;
  addToCart: (productId: string, variationId?: string, stockLimit?: number) => void;
  increment: (productId: string, variationId?: string, stockLimit?: number) => void;
  decrement: (productId: string, variationId?: string) => void;
  remove: (productId: string, variationId?: string) => void;
  resetCart: () => void;
  selectedCustomer: CustomerRow | null;
  selectCustomer: (customer: CustomerRow | null) => CustomerCartSwitchResult;
  finishActiveCustomerCart: () => CustomerCartSwitchResult;
  manualDiscountId: string | null;
  setManualDiscountId: React.Dispatch<React.SetStateAction<string | null>>;
  customerCartsReady: boolean;
  lastAdded: LastAddedItem | null;
  setLastAdded: (item: LastAddedItem | null) => void;
};

const GlobalCartContext = createContext<GlobalCartContextType | null>(null);

export function GlobalCartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [mounted, setMounted] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRow | null>(null);
  const [manualDiscountId, setManualDiscountId] = useState<string | null>(null);
  const [customerCartsReady, setCustomerCartsReady] = useState(false);
  const [lastAdded, setLastAdded] = useState<LastAddedItem | null>(null);

  const cartsByCustomerRef = useRef<Record<string, CustomerCartBucket>>({});
  const activeCartKeyRef = useRef(WALKIN_CART_KEY);
  const selectedCustomerRef = useRef<CustomerRow | null>(null);
  const linesRef = useRef<CartLine[]>([]);
  const discountIdRef = useRef<string | null>(null);
  const expectedSwitchLinesRef = useRef<CartLine[] | null>(null);

  linesRef.current = lines;
  discountIdRef.current = manualDiscountId;
  selectedCustomerRef.current = selectedCustomer;

  const persistCustomerCarts = useCallback((customer: CustomerRow | null) => {
    saveCustomerCarts({
      activeKey: activeCartKeyRef.current,
      customer,
      carts: cartsByCustomerRef.current,
    });
  }, []);

  const snapshotActiveCart = useCallback(() => {
    cartsByCustomerRef.current[activeCartKeyRef.current] = {
      lines: cloneCartLines(linesRef.current),
      discountId: discountIdRef.current,
    };
  }, []);

  useEffect(() => {
    const storedCarts = loadCustomerCarts();
    if (storedCarts) {
      cartsByCustomerRef.current = storedCarts.carts;
      activeCartKeyRef.current = storedCarts.activeKey;
      const bucket = storedCarts.carts[storedCarts.activeKey] ?? emptyCartBucket();
      const customer =
        storedCarts.activeKey === WALKIN_CART_KEY ? null : storedCarts.customer;
      selectedCustomerRef.current = customer;
      setSelectedCustomer(customer);
      setManualDiscountId(bucket.discountId);
      setLines(cloneCartLines(bucket.lines));
    } else {
      try {
        const stored = localStorage.getItem("ventrapos-global-cart");
        if (stored) {
          setLines(JSON.parse(stored) as CartLine[]);
        }
      } catch (e) {
        console.error("Failed to load global cart", e);
      }
    }
    setMounted(true);
    setCustomerCartsReady(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem("ventrapos-global-cart", JSON.stringify(lines));
    } catch (e) {
      console.error("Failed to save global cart", e);
    }
  }, [lines, mounted]);

  useEffect(() => {
    if (!customerCartsReady) return;
    const expected = expectedSwitchLinesRef.current;
    if (expected) {
      if (!cartsMatch(lines, expected)) return;
      expectedSwitchLinesRef.current = null;
      return;
    }
    cartsByCustomerRef.current[activeCartKeyRef.current] = {
      lines: cloneCartLines(lines),
      discountId: manualDiscountId,
    };
    persistCustomerCarts(selectedCustomerRef.current);
  }, [customerCartsReady, lines, manualDiscountId, persistCustomerCarts]);

  const addToCart = useCallback((productId: string, variationId?: string, stockLimit = Infinity) => {
    const activeLines = linesRef.current;
    const i = activeLines.findIndex((l) => l.productId === productId && l.variationId === variationId);
    if (i >= 0 && activeLines[i].qty >= stockLimit) {
      toast.error(`Cannot add more. Stock limit reached.`);
      return;
    }

    setLines((prev) => {
      const j = prev.findIndex((l) => l.productId === productId && l.variationId === variationId);
      if (j >= 0) {
        if (prev[j].qty >= stockLimit) return prev;
        const updated = { ...prev[j], qty: prev[j].qty + 1 };
        if (j === 0) {
          const next = [...prev];
          next[0] = updated;
          return next;
        }
        return [updated, ...prev.slice(0, j), ...prev.slice(j + 1)];
      }
      return [{ productId, qty: 1, variationId }, ...prev];
    });
  }, []);

  const increment = useCallback((productId: string, variationId?: string, stockLimit = Infinity) => {
    const activeLines = linesRef.current;
    const i = activeLines.findIndex((l) => l.productId === productId && l.variationId === variationId);
    if (i >= 0 && activeLines[i].qty >= stockLimit) {
      toast.error(`Cannot add more. Stock limit reached.`);
      return;
    }

    setLines((prev) =>
      prev.map((l) => {
        if (l.productId === productId && l.variationId === variationId) {
          if (l.qty >= stockLimit) return l;
          return { ...l, qty: l.qty + 1 };
        }
        return l;
      }),
    );
  }, []);

  const decrement = useCallback((productId: string, variationId?: string) => {
    setLines((prev) =>
      prev
        .map((l) =>
          l.productId === productId && l.variationId === variationId ? { ...l, qty: l.qty - 1 } : l,
        )
        .filter((l) => l.qty > 0),
    );
  }, []);

  const remove = useCallback((productId: string, variationId?: string) => {
    setLines((prev) => prev.filter((l) => !(l.productId === productId && l.variationId === variationId)));
  }, []);

  const selectCustomer = useCallback(
    (next: CustomerRow | null): CustomerCartSwitchResult => {
      const nextKey = customerCartKey(next?.id);
      const prevKey = activeCartKeyRef.current;
      if (prevKey === nextKey) {
        selectedCustomerRef.current = next;
        setSelectedCustomer(next);
        persistCustomerCarts(next);
        return { nextLineCount: linesRef.current.reduce((s, l) => s + l.qty, 0) };
      }

      snapshotActiveCart();

      const saved = cartsByCustomerRef.current[nextKey] ?? emptyCartBucket();
      if (!cartsByCustomerRef.current[nextKey]) {
        cartsByCustomerRef.current[nextKey] = emptyCartBucket();
      }

      activeCartKeyRef.current = nextKey;
      selectedCustomerRef.current = next;
      expectedSwitchLinesRef.current = cloneCartLines(saved.lines);
      persistCustomerCarts(next);

      setSelectedCustomer(next);
      setManualDiscountId(saved.discountId);
      setLines(() => cloneCartLines(saved.lines));
      return { nextLineCount: saved.lines.reduce((s, l) => s + l.qty, 0) };
    },
    [persistCustomerCarts, snapshotActiveCart],
  );

  const finishActiveCustomerCart = useCallback((): CustomerCartSwitchResult => {
    const completedKey = activeCartKeyRef.current;
    cartsByCustomerRef.current[completedKey] = emptyCartBucket();
    const restoreWalkIn = completedKey !== WALKIN_CART_KEY;
    const walkin = cartsByCustomerRef.current[WALKIN_CART_KEY] ?? emptyCartBucket();
    const nextLines = restoreWalkIn ? cloneCartLines(walkin.lines) : [];
    activeCartKeyRef.current = WALKIN_CART_KEY;
    selectedCustomerRef.current = null;
    expectedSwitchLinesRef.current = nextLines;
    persistCustomerCarts(null);
    setSelectedCustomer(null);
    setManualDiscountId(restoreWalkIn ? walkin.discountId : null);
    setLines(nextLines);
    return { nextLineCount: nextLines.reduce((s, l) => s + l.qty, 0) };
  }, [persistCustomerCarts]);

  const resetCart = useCallback(() => {
    cartsByCustomerRef.current[activeCartKeyRef.current] = emptyCartBucket();
    expectedSwitchLinesRef.current = [];
    persistCustomerCarts(selectedCustomerRef.current);
    setManualDiscountId(null);
    setLines([]);
  }, [persistCustomerCarts]);

  return (
    <GlobalCartContext.Provider
      value={{
        lines: mounted ? lines : [],
        setLines,
        addToCart,
        increment,
        decrement,
        remove,
        resetCart,
        selectedCustomer,
        selectCustomer,
        finishActiveCustomerCart,
        manualDiscountId,
        setManualDiscountId,
        customerCartsReady,
        lastAdded,
        setLastAdded,
      }}
    >
      {children}
    </GlobalCartContext.Provider>
  );
}

export function useGlobalCart() {
  const ctx = useContext(GlobalCartContext);
  if (!ctx) {
    throw new Error("useGlobalCart must be used within a GlobalCartProvider");
  }
  return ctx;
}
