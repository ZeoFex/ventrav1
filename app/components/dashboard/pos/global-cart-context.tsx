"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { type CartLine } from "./sale/pos-cart-totals";

type GlobalCartContextType = {
  lines: CartLine[];
  setLines: React.Dispatch<React.SetStateAction<CartLine[]>>;
  addToCart: (productId: string, variationId?: string, stockLimit?: number) => void;
  increment: (productId: string, variationId?: string, stockLimit?: number) => void;
  decrement: (productId: string, variationId?: string) => void;
  remove: (productId: string, variationId?: string) => void;
  resetCart: () => void;
};

const GlobalCartContext = createContext<GlobalCartContextType | null>(null);

export function GlobalCartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [mounted, setMounted] = useState(false);

  // Hydrate from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("ventrapos-global-cart");
      if (stored) {
        setLines(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to load global cart", e);
    }
    setMounted(true);
  }, []);

  // Save to localStorage
  useEffect(() => {
    if (mounted) {
      try {
        localStorage.setItem("ventrapos-global-cart", JSON.stringify(lines));
      } catch (e) {
        console.error("Failed to save global cart", e);
      }
    }
  }, [lines, mounted]);

  const addToCart = useCallback((productId: string, variationId?: string, stockLimit = Infinity) => {
    setLines((prev) => {
      const i = prev.findIndex((l) => l.productId === productId && l.variationId === variationId);
      if (i >= 0) {
        const currentQty = prev[i].qty;
        if (currentQty >= stockLimit) {
            alert(`Cannot add more. Stock limit reached.`);
            return prev;
        }
        const next = [...prev];
        next[i] = { ...next[i], qty: next[i].qty + 1 };
        return next;
      }
      return [...prev, { productId, qty: 1, variationId }];
    });
  }, []);

  const increment = useCallback((productId: string, variationId?: string, stockLimit = Infinity) => {
    setLines((prev) =>
      prev.map((l) => {
        if (l.productId === productId && l.variationId === variationId) {
          if (l.qty >= stockLimit) {
             alert(`Cannot add more. Stock limit reached.`);
             return l;
          }
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

  const resetCart = useCallback(() => setLines([]), []);

  return (
    <GlobalCartContext.Provider
      value={{
        lines: mounted ? lines : [], // Avoid hydration mismatch on initial render
        setLines,
        addToCart,
        increment,
        decrement,
        remove,
        resetCart,
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
