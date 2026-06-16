"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { useSession } from "@/app/components/auth/use-session";
import {
  canAccess,
  COPILOT_FEATURE_ID,
  type PlanId,
} from "@/config/plan-feature-access";

type CopilotContextValue = {
  open: boolean;
  setOpen: (v: boolean) => void;
  toggle: () => void;
  pathname: string;
  /** Zuri (in-dashboard assistant) is limited to the Pro plan (server enforces the same). */
  copilotEnabled: boolean;
};

const CopilotContext = createContext<CopilotContextValue | null>(null);

export function CopilotProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname() ?? "/dashboard";
  const { user } = useSession();
  const copilotEnabled =
    user != null &&
    canAccess(
      user.plan as PlanId,
      COPILOT_FEATURE_ID,
      user.subscriptionStatus,
      user.currentPeriodEnd,
    );

  const setOpenGuarded = useCallback(
    (v: boolean) => {
      if (v && !copilotEnabled) return;
      setOpen(v);
    },
    [copilotEnabled],
  );

  const toggle = useCallback(() => {
    if (!copilotEnabled) return;
    setOpen((o) => !o);
  }, [copilotEnabled]);

  useEffect(() => {
    if (!copilotEnabled) setOpen(false);
  }, [copilotEnabled]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "/") {
        if (!copilotEnabled) return;
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [copilotEnabled]);

  const value = useMemo(
    () => ({
      open,
      setOpen: setOpenGuarded,
      toggle,
      pathname,
      copilotEnabled,
    }),
    [open, setOpenGuarded, toggle, pathname, copilotEnabled],
  );

  return (
    <CopilotContext.Provider value={value}>{children}</CopilotContext.Provider>
  );
}

export function useCopilot() {
  const ctx = useContext(CopilotContext);
  if (!ctx) {
    throw new Error("useCopilot must be used within CopilotProvider");
  }
  return ctx;
}
