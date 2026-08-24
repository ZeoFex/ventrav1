"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";

type HomeCatalogFilterContextType = {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  categoryId: string | null;
  setCategoryId: (id: string | null) => void;
};

const HomeCatalogFilterContext = createContext<HomeCatalogFilterContextType | null>(
  null,
);

export function HomeCatalogFilterProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "";
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [pathForFilter, setPathForFilter] = useState(pathname);

  const isHome = pathname === "/dashboard" || pathname === "/dashboard/";
  if (pathname !== pathForFilter) {
    setPathForFilter(pathname);
    if (!isHome) {
      setSearchQuery("");
      setCategoryId(null);
    }
  }

  const value = useMemo(
    () => ({ searchQuery, setSearchQuery, categoryId, setCategoryId }),
    [searchQuery, categoryId],
  );

  return (
    <HomeCatalogFilterContext.Provider value={value}>
      {children}
    </HomeCatalogFilterContext.Provider>
  );
}

export function useHomeCatalogFilter() {
  const ctx = useContext(HomeCatalogFilterContext);
  if (!ctx) {
    throw new Error("useHomeCatalogFilter must be used within HomeCatalogFilterProvider");
  }
  return ctx;
}
