"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";

type PosProductSearchContextType = {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  categoryId: string;
  setCategoryId: (id: string) => void;
  showCatalogChrome: boolean;
  setShowCatalogChrome: (value: boolean) => void;
  openScan: () => void;
  registerOpenScan: (fn: (() => void) | null) => void;
  openQuickAdd: () => void;
  registerOpenQuickAdd: (fn: (() => void) | null) => void;
};

const PosProductSearchContext = createContext<PosProductSearchContextType | null>(
  null,
);

export function PosProductSearchProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryId, setCategoryId] = useState("all");
  const [showCatalogChrome, setShowCatalogChrome] = useState(false);
  const [pathForSearch, setPathForSearch] = useState(pathname);
  const openScanRef = useRef<(() => void) | null>(null);
  const openQuickAddRef = useRef<(() => void) | null>(null);

  // Reset POS search when navigating away from the sale page (render-time sync).
  if (pathname !== pathForSearch) {
    setPathForSearch(pathname);
    if (!pathname.startsWith("/dashboard/pos/sale")) {
      setSearchQuery("");
      setCategoryId("all");
      setShowCatalogChrome(false);
      openScanRef.current = null;
      openQuickAddRef.current = null;
    }
  }

  const registerOpenScan = useCallback((fn: (() => void) | null) => {
    openScanRef.current = fn;
  }, []);

  const openScan = useCallback(() => {
    openScanRef.current?.();
  }, []);

  const registerOpenQuickAdd = useCallback((fn: (() => void) | null) => {
    openQuickAddRef.current = fn;
  }, []);

  const openQuickAdd = useCallback(() => {
    openQuickAddRef.current?.();
  }, []);

  const value = useMemo(
    () => ({
      searchQuery,
      setSearchQuery,
      categoryId,
      setCategoryId,
      showCatalogChrome,
      setShowCatalogChrome,
      openScan,
      registerOpenScan,
      openQuickAdd,
      registerOpenQuickAdd,
    }),
    [
      searchQuery,
      categoryId,
      showCatalogChrome,
      openScan,
      registerOpenScan,
      openQuickAdd,
      registerOpenQuickAdd,
    ],
  );

  return (
    <PosProductSearchContext.Provider value={value}>
      {children}
    </PosProductSearchContext.Provider>
  );
}

export function usePosProductSearch() {
  const ctx = useContext(PosProductSearchContext);
  if (!ctx) {
    throw new Error("usePosProductSearch must be used within PosProductSearchProvider");
  }
  return ctx;
}
