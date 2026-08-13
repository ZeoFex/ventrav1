"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";

type PosProductSearchContextType = {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  openScan: () => void;
  registerOpenScan: (fn: (() => void) | null) => void;
};

const PosProductSearchContext = createContext<PosProductSearchContextType | null>(
  null,
);

export function PosProductSearchProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";
  const [searchQuery, setSearchQuery] = useState("");
  const [pathForSearch, setPathForSearch] = useState(pathname);
  const openScanRef = useRef<(() => void) | null>(null);

  // Reset POS search when navigating away from the sale page (render-time sync).
  if (pathname !== pathForSearch) {
    setPathForSearch(pathname);
    if (!pathname.startsWith("/dashboard/pos/sale")) {
      setSearchQuery("");
      openScanRef.current = null;
    }
  }

  const registerOpenScan = useCallback((fn: (() => void) | null) => {
    openScanRef.current = fn;
  }, []);

  const openScan = useCallback(() => {
    openScanRef.current?.();
  }, []);

  return (
    <PosProductSearchContext.Provider
      value={{ searchQuery, setSearchQuery, openScan, registerOpenScan }}
    >
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
