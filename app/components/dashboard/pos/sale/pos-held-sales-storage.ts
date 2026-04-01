import type { CartLine } from "./pos-cart-totals";

const STORAGE_KEY = "ventrapos-held-sales-v1";

export type HeldSale = {
  id: string;
  /** Short label shown in the list */
  label: string;
  lines: CartLine[];
  /** ISO timestamp when the sale was held */
  heldAt: string;
};

function readRaw(): HeldSale[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isHeldSale);
  } catch {
    return [];
  }
}

function isHeldSale(x: unknown): x is HeldSale {
  if (x === null || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.label === "string" &&
    typeof o.heldAt === "string" &&
    Array.isArray(o.lines) &&
    o.lines.every(
      (l) =>
        l &&
        typeof l === "object" &&
        typeof (l as CartLine).productId === "string" &&
        typeof (l as CartLine).qty === "number",
    )
  );
}

function writeAll(list: HeldSale[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function newId(): string {
  return `hold_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function getHeldSales(): HeldSale[] {
  return readRaw().sort(
    (a, b) => new Date(b.heldAt).getTime() - new Date(a.heldAt).getTime(),
  );
}

export function getHeldSale(id: string): HeldSale | undefined {
  return readRaw().find((h) => h.id === id);
}

/** Saves a new held sale and returns its id. */
export function addHeldSale(lines: CartLine[]): HeldSale {
  const list = readRaw();
  const held: HeldSale = {
    id: newId(),
    label: `Hold · ${formatHeldLabelTime(new Date())}`,
    lines: lines.map((l) => ({ ...l })),
    heldAt: new Date().toISOString(),
  };
  writeAll([held, ...list]);
  return held;
}

export function removeHeldSale(id: string): void {
  writeAll(readRaw().filter((h) => h.id !== id));
}

function formatHeldLabelTime(d: Date): string {
  return d.toLocaleString("en-GH", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
