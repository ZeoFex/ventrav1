import type { CustomerRow } from "../../customers/customers-mock-data";
import type { CartLine } from "./pos-cart-totals";

const STORAGE_KEY = "ventrapos-pos-customer-carts-v2";

export const WALKIN_CART_KEY = "__walkin__";

export type CustomerCartBucket = {
  lines: CartLine[];
  discountId: string | null;
};

export type CustomerCartStore = {
  activeKey: string;
  customer: CustomerRow | null;
  carts: Record<string, CustomerCartBucket>;
};

export function customerCartKey(customerId: string | null | undefined): string {
  return customerId?.trim() ? customerId : WALKIN_CART_KEY;
}

export function cloneCartLines(lines: CartLine[]): CartLine[] {
  return lines.map((l) => ({ ...l }));
}

export function cartsMatch(a: CartLine[], b: CartLine[]): boolean {
  if (a.length !== b.length) return false;
  return a.every(
    (line, i) =>
      line.productId === b[i]?.productId &&
      line.qty === b[i]?.qty &&
      line.variationId === b[i]?.variationId,
  );
}

export function emptyCartBucket(): CustomerCartBucket {
  return { lines: [], discountId: null };
}

function isCartLine(x: unknown): x is CartLine {
  if (x === null || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return typeof o.productId === "string" && typeof o.qty === "number" && o.qty > 0;
}

function isCustomerSnapshot(x: unknown): x is CustomerRow {
  if (x === null || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.name === "string" &&
    typeof o.phone === "string"
  );
}

function isBucket(x: unknown): x is CustomerCartBucket {
  if (x === null || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  if (!Array.isArray(o.lines) || !o.lines.every(isCartLine)) return false;
  return o.discountId === null || typeof o.discountId === "string";
}

export function loadCustomerCarts(): CustomerCartStore | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (parsed === null || typeof parsed !== "object") return null;
    const o = parsed as Record<string, unknown>;
    if (typeof o.activeKey !== "string" || o.activeKey.length === 0) return null;
    if (o.customer !== null && !isCustomerSnapshot(o.customer)) return null;
    if (o.carts === null || typeof o.carts !== "object" || Array.isArray(o.carts)) {
      return null;
    }
    const carts: Record<string, CustomerCartBucket> = {};
    for (const [key, value] of Object.entries(o.carts as Record<string, unknown>)) {
      if (isBucket(value)) carts[key] = value;
    }
    return {
      activeKey: o.activeKey,
      customer: o.customer,
      carts,
    };
  } catch {
    return null;
  }
}

export function saveCustomerCarts(store: CustomerCartStore): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Ignore quota / private-mode failures.
  }
}
