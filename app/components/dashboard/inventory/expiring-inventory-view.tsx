"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import useSWR from "swr";
import { AlertTriangle, Calendar, Loader2, Package } from "lucide-react";
import { ProductsPageShell } from "../products/products-page-shell";
import { useBranchContext } from "../branch-context";

type ExpiringLine = {
  lineId: string;
  productId: string | null;
  productName: string;
  expiryDate: string;
  quantityTotal: number;
  batchNo: string | null;
  orderReference: string;
  daysUntilExpiry: number;
};

async function fetcher(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to load expiring stock");
  return res.json();
}

function ExpiryBadge({ days }: { days: number }) {
  if (days < 0) {
    return (
      <span className="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-700 dark:bg-red-500/20 dark:text-red-400">
        Expired
      </span>
    );
  }
  if (days === 0) {
    return (
      <span className="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-700 dark:bg-red-500/20 dark:text-red-400">
        Today
      </span>
    );
  }
  if (days <= 7) {
    return (
      <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
        {days}d left
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
      {days}d left
    </span>
  );
}

function formatExpiryDate(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function ExpiringInventoryView() {
  const { branchId } = useBranchContext();
  const searchParams = useSearchParams();
  const daysParam = searchParams.get("days");
  const days = useMemo(() => {
    const parsed = daysParam ? parseInt(daysParam, 10) : 14;
    return Number.isFinite(parsed) ? Math.max(1, Math.min(parsed, 365)) : 14;
  }, [daysParam]);

  const { data, isLoading, error } = useSWR(
    branchId !== "all" ? `/api/inventory/expiring?days=${days}&b=${branchId}` : null,
    fetcher,
  );

  const items: ExpiringLine[] = data?.items ?? [];

  const groupedByProduct = useMemo(() => {
    const map = new Map<string, { key: string; name: string; productId: string | null; lines: ExpiringLine[] }>();
    for (const line of items) {
      const key = line.productId ?? `name:${line.productName}`;
      const existing = map.get(key);
      if (existing) {
        existing.lines.push(line);
      } else {
        map.set(key, {
          key,
          name: line.productName,
          productId: line.productId,
          lines: [line],
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => {
      const aMin = Math.min(...a.lines.map((l) => l.daysUntilExpiry));
      const bMin = Math.min(...b.lines.map((l) => l.daysUntilExpiry));
      return aMin - bMin;
    });
  }, [items]);

  if (branchId === "all") {
    return (
      <ProductsPageShell
        title="Expiring stock"
        description="Supply lines nearing their expiry date."
      >
        <div className="rounded-2xl border border-dashed border-border p-12 text-center dark:border-white/10">
          <AlertTriangle className="mx-auto mb-4 size-10 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Select a branch</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose a specific branch to see which products are expiring soon.
          </p>
        </div>
      </ProductsPageShell>
    );
  }

  return (
    <ProductsPageShell
      title="Expiring stock"
      description={`Products from supply orders expiring within the next ${days} days.`}
      actions={
        <Link
          href="/dashboard/inventory"
          className="rounded-xl border border-border px-4 py-2 text-[14px] font-medium hover:bg-muted dark:border-white/10"
        >
          All inventory
        </Link>
      }
    >
      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
          Could not load expiring stock. Try again shortly.
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-border py-16 text-center dark:border-white/10">
          <Package className="mb-4 size-12 text-muted-foreground opacity-40" />
          <h3 className="text-lg font-semibold">Nothing expiring soon</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            No supply lines expire within the next {days} days for this branch.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-[13px] text-muted-foreground">
            {groupedByProduct.length} {groupedByProduct.length === 1 ? "product" : "products"} ·{" "}
            {items.length} supply {items.length === 1 ? "line" : "lines"}
          </p>

          {groupedByProduct.map((group) => {
            const soonest = group.lines.reduce((min, l) =>
              l.daysUntilExpiry < min.daysUntilExpiry ? l : min,
            );
            const totalQty = group.lines.reduce((s, l) => s + l.quantityTotal, 0);

            return (
              <article
                key={group.key}
                className="overflow-hidden rounded-2xl border border-border bg-white dark:border-white/10 dark:bg-[#111]"
              >
                <div className="flex flex-col gap-3 border-b border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-white/10">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-[16px] font-bold truncate">{group.name}</h3>
                      <ExpiryBadge days={soonest.daysUntilExpiry} />
                    </div>
                    <p className="mt-0.5 text-[13px] text-muted-foreground">
                      {totalQty} unit{totalQty === 1 ? "" : "s"} across {group.lines.length}{" "}
                      {group.lines.length === 1 ? "batch" : "batches"} · earliest{" "}
                      {formatExpiryDate(soonest.expiryDate)}
                    </p>
                  </div>
                  {group.productId ? (
                    <Link
                      href={`/dashboard/products/${group.productId}/edit`}
                      className="shrink-0 rounded-xl bg-[#006c49]/10 px-4 py-2 text-[13px] font-semibold text-[#006c49] hover:bg-[#006c49]/15 dark:text-[#6ffbbe]"
                    >
                      Open product
                    </Link>
                  ) : null}
                </div>

                <ul className="divide-y divide-border dark:divide-white/10">
                  {group.lines.map((line) => (
                    <li
                      key={line.lineId}
                      className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex min-w-0 items-start gap-3">
                        <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
                          <Calendar className="size-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-[14px] font-medium">
                            Expires {formatExpiryDate(line.expiryDate)}
                          </p>
                          <p className="text-[12px] text-muted-foreground">
                            {line.quantityTotal} units
                            {line.batchNo ? ` · Batch ${line.batchNo}` : ""}
                            {line.orderReference ? ` · Order ${line.orderReference}` : ""}
                          </p>
                        </div>
                      </div>
                      <ExpiryBadge days={line.daysUntilExpiry} />
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>
      )}
    </ProductsPageShell>
  );
}
