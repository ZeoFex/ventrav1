"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type SalesOverviewDateContextValue = {
  from: string;
  to: string;
  setFrom: (v: string) => void;
  setTo: (v: string) => void;
  overviewUrl: string;
};

const SalesOverviewDateContext = createContext<SalesOverviewDateContextValue | null>(null);

function defaultToIso(): string {
  return new Date().toLocaleDateString("en-CA");
}

function defaultFromIso(): string {
  const d = new Date();
  d.setDate(d.getDate() - 6);
  return d.toLocaleDateString("en-CA");
}

export function SalesOverviewDateProvider({
  branchId,
  children,
}: {
  branchId: string;
  children: ReactNode;
}) {
  const [from, setFrom] = useState(defaultFromIso);
  const [to, setTo] = useState(defaultToIso);

  const overviewUrl = useMemo(() => {
    const q = new URLSearchParams();
    if (branchId && branchId !== "all") q.set("b", branchId);
    if (from) q.set("from", from);
    if (to) q.set("to", to);
    const s = q.toString();
    return s ? `/api/sales/overview?${s}` : "/api/sales/overview";
  }, [branchId, from, to]);

  const value = useMemo(
    () => ({ from, to, setFrom, setTo, overviewUrl }),
    [from, to, overviewUrl],
  );

  return (
    <SalesOverviewDateContext.Provider value={value}>
      {children}
    </SalesOverviewDateContext.Provider>
  );
}

export function useSalesOverviewDate() {
  const ctx = useContext(SalesOverviewDateContext);
  if (!ctx) {
    throw new Error("useSalesOverviewDate must be used within SalesOverviewDateProvider");
  }
  return ctx;
}
