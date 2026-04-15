"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useLayoutEffect,
  type ReactNode,
} from "react";
import { useSWRConfig } from "swr";

const COOKIE_NAME = "__ventra_branch";
/** Mirrors the cookie when cookies are cleared or blocked; validated when branches load. */
const LOCAL_STORAGE_KEY = "ventra_branch";

type BranchContextType = {
  branchId: string;
  setBranchId: (id: string) => void;
};

const BranchContext = createContext<BranchContextType>({
  branchId: "all",
  setBranchId: () => {},
});

export function useBranchContext() {
  return useContext(BranchContext);
}

/** Returns null if the cookie is absent (not the same as value `"all"`). */
function getCookieValue(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp("(?:^|; )" + name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "=([^;]*)"),
  );
  return match ? decodeURIComponent(match[1]) : null;
}

function setCookie(name: string, value: string) {
  const secure =
    typeof window !== "undefined" && window.location.protocol === "https:"
      ? ";Secure"
      : "";
  document.cookie = `${name}=${encodeURIComponent(value)};path=/;max-age=${365 * 24 * 60 * 60};SameSite=Lax${secure}`;
}

function readLocalStorageBranch(): string | null {
  try {
    const v = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (v !== null && v !== "") return v;
  } catch {
    /* private mode or denied */
  }
  return null;
}

function writeLocalStorageBranch(value: string) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, value);
  } catch {
    /* ignore */
  }
}

/**
 * Cookie wins when set (including explicit `"all"`).
 * If the cookie is missing, fall back to localStorage (survives some cookie clears / ITP).
 */
function readInitialBranchId(): string {
  if (typeof window === "undefined") return "all";
  const fromCookie = getCookieValue(COOKIE_NAME);
  if (fromCookie !== null) {
    return fromCookie === "" ? "all" : fromCookie;
  }
  return readLocalStorageBranch() ?? "all";
}

function persistBranchPreference(id: string) {
  setCookie(COOKIE_NAME, id);
  writeLocalStorageBranch(id);
}

export function BranchProvider({ children }: { children: ReactNode }) {
  /** Start aligned with SSR; hydrate before paint via useLayoutEffect. */
  const [branchId, _setBranchId] = useState<string>("all");

  const { mutate } = useSWRConfig();

  useLayoutEffect(() => {
    const next = readInitialBranchId();
    _setBranchId(next);
    persistBranchPreference(next);
  }, []);

  const setBranchId = useCallback(
    (id: string) => {
      _setBranchId(id);
      persistBranchPreference(id);
      mutate(() => true, undefined, { revalidate: true });
    },
    [mutate],
  );

  return (
    <BranchContext.Provider value={{ branchId, setBranchId }}>
      {children}
    </BranchContext.Provider>
  );
}
