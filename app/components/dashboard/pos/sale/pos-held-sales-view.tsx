"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { PauseCircle, Play, Trash2, Loader2 } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { computePosTotals } from "./pos-cart-totals";
import {
  getHeldSales,
  removeHeldSale,
  type HeldSale,
} from "./pos-held-sales-storage";
import { useProducts } from "../../products/products-data-hooks";
import { type ProductRow } from "../../products/types";
import { formatGhs } from "@/app/lib/catalog-utils";

function formatRelative(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  if (diff < 60_000) return "Just now";
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 48) return `${hours}h ago`;
  return d.toLocaleDateString("en-GH", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function lineItemCount(lines: HeldSale["lines"]): number {
  return lines.reduce((s, l) => s + l.qty, 0);
}

export function PosHeldSalesView() {
  const router = useRouter();
  const [items, setItems] = useState<HeldSale[]>(() => getHeldSales());
  const { products = [], isLoading: isProductsLoading } = useProducts();

  const productById = useMemo(() => {
    const m = new Map<string, ProductRow>();
    products.forEach((p: ProductRow) => m.set(p.id, p));
    return m;
  }, [products]);

  const refresh = useCallback(() => {
    setItems(getHeldSales());
  }, []);

  const handleResume = useCallback(
    (id: string) => {
      router.push(`/dashboard/pos/sale?resume=${encodeURIComponent(id)}`);
    },
    [router],
  );

  const handleDelete = useCallback(
    (id: string, label: string) => {
      if (
        !window.confirm(
          `Discard "${label}"? This removes the held cart from this device.`,
        )
      ) {
        return;
      }
      removeHeldSale(id);
      refresh();
    },
    [refresh],
  );

  if (isProductsLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground opacity-20" />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#F8F9FA] dark:bg-[#0a0a0a]">
      <div className="mx-auto max-w-[960px] px-3 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6 sm:py-8 lg:px-8">
        <header className="mb-6 sm:mb-8">
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-tight text-foreground">
            Held Sales
          </h1>
          <p className="mt-1.5 max-w-xl text-[15px] text-muted-foreground">
            Parked carts on this register. Resume to continue checkout.
          </p>
        </header>

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-[1.25rem] border border-dashed border-[#e5e7eb] bg-white/80 px-6 py-16 text-center dark:border-white/[0.12] dark:bg-[#111]/80">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-[#f4f5f7] dark:bg-[#1a1a1a]">
              <PauseCircle className="size-8 text-muted-foreground opacity-30" strokeWidth={1.5} />
            </div>
            <p className="mt-4 text-[15px] font-medium text-foreground">No held sales</p>
            <Link
              href="/dashboard/pos/sale"
              className="mt-6 bg-[#003527] text-white px-8 py-3 rounded-xl font-bold shadow-lg"
            >
              Start New Sale
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-[1.25rem] border border-[#eef0f2] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.05)] dark:border-white/[0.08] dark:bg-[#111]">
            <ul className="divide-y divide-[#f0f2f4] dark:divide-white/[0.06]">
              {items.map((h) => {
                const { total } = computePosTotals(h.lines, productById);
                const n = lineItemCount(h.lines);
                return (
                  <li key={h.id} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-foreground">{h.label}</p>
                      <p className="text-[13px] text-muted-foreground">
                        {n} item{n === 1 ? "" : "s"} · {formatRelative(h.heldAt)}
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                      <p className="text-xl font-bold font-mono text-foreground sm:text-right sm:min-w-[100px]">
                        {formatGhs(total)}
                      </p>
                      <div className="flex gap-2">
                        <button onClick={() => handleResume(h.id)} className="flex-1 sm:flex-initial bg-muted px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2">
                          <Play className="size-3.5" /> Resume
                        </button>
                        <button onClick={() => handleDelete(h.id, h.label)} className="text-destructive font-semibold text-sm px-4">
                          Discard
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
