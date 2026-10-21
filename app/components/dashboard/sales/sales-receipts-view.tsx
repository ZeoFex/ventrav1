"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import useSWR from "swr";
import {
  CalendarDays,
  Loader2,
  Printer,
  Receipt,
  Search,
  RefreshCw,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useBranchContext } from "../branch-context";
import {
  buildReceiptDataFromCompletedSale,
  type PosReceiptData,
} from "../pos/sale/pos-receipt-data";
import { PosSaleReceiptThermal } from "../pos/sale/pos-sale-receipt";
import { printReceiptHtml } from "../pos/sale/pos-print-utils";
import { Button } from "@/components/ui/button";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type SaleRow = {
  id: string;
  invoiceId: string;
  totalGhs: string;
  amountPaidGhs?: string;
  balanceDueGhs?: string;
  paymentMethod: string;
  itemCount: number;
  status: string;
  createdAt: string;
  branchId?: string | null;
  branchName?: string | null;
  staffName?: string | null;
  customerName?: string | null;
};

type SaleDetailPayload = {
  sale: {
    id: string;
    invoiceId: string;
    subtotalGhs: string;
    taxGhs: string;
    discountGhs: string;
    totalGhs: string;
    amountPaidGhs?: string;
    balanceDueGhs?: string;
    paymentMethod: string;
    createdAt: string;
    staffName?: string | null;
    customerName?: string | null;
    storeName?: string | null;
    branchName?: string | null;
    branchAddress?: string | null;
    branchRegion?: string | null;
    branchPhone?: string | null;
    receiptHeader?: string | null;
    receiptFooter?: string | null;
    currencySymbol?: string | null;
    status: string;
    itemCount: number;
  };
  lines: {
    id: string;
    productName: string;
    quantity: number;
    quantityReturned: number;
    unitPriceGhs: string;
    lineTotalGhs: string;
  }[];
  payments?: {
    paymentMethod: string;
    amountGhs: string;
  }[];
};

function todayKey(): string {
  return new Date().toLocaleDateString("en-CA");
}

function daysAgoKey(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toLocaleDateString("en-CA");
}

function formatGhs(n: number): string {
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
    minimumFractionDigits: 2,
  }).format(n);
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-GH", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDayHeading(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GH", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function statusLabel(status: string): string {
  switch (status) {
    case "completed":
      return "Completed";
    case "partially_refunded":
      return "Partial";
    case "refunded":
      return "Returned";
    case "voided":
      return "Voided";
    default:
      return status;
  }
}

function statusTone(status: string): string {
  switch (status) {
    case "completed":
      return "text-[#006c49] dark:text-[#6ffbbe]";
    case "partially_refunded":
      return "text-amber-700 dark:text-amber-400";
    case "refunded":
    case "voided":
      return "text-red-700 dark:text-red-400";
    default:
      return "text-muted-foreground";
  }
}

const PRESETS = [
  { id: "today", label: "Today", from: () => todayKey(), to: () => todayKey() },
  { id: "7", label: "7 days", from: () => daysAgoKey(6), to: () => todayKey() },
  { id: "30", label: "30 days", from: () => daysAgoKey(29), to: () => todayKey() },
] as const;

const tableGrid =
  "grid grid-cols-[4.5rem_minmax(7rem,1.2fr)_minmax(5rem,1fr)_minmax(5rem,1fr)_3.5rem_5.5rem_5rem] gap-2 sm:grid-cols-[5rem_minmax(8rem,1.3fr)_minmax(6rem,1fr)_minmax(6rem,1fr)_4rem_6.5rem_5.5rem] sm:gap-3";

async function fetchSaleDetail(url: string): Promise<SaleDetailPayload> {
  const r = await fetch(url);
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || "Could not load sale");
  }
  return r.json();
}

export function SalesReceiptsView() {
  const { branchId } = useBranchContext();
  const [from, setFrom] = useState(todayKey);
  const [to, setTo] = useState(todayKey);
  const [activePreset, setActivePreset] = useState<string>("today");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [printing, setPrinting] = useState(false);

  // Debounce search so typing does not hit the API on every keystroke.
  useEffect(() => {
    const id = window.setTimeout(() => {
      setSearchQuery(searchInput.trim());
    }, 250);
    return () => window.clearTimeout(id);
  }, [searchInput]);

  const listUrl = useMemo(() => {
    const q = new URLSearchParams();
    q.set("from", from);
    q.set("to", to);
    q.set("limit", "300");
    if (searchQuery) q.set("q", searchQuery);
    if (branchId && branchId !== "all") q.set("b", branchId);
    return `/api/sales/transactions?${q.toString()}`;
  }, [from, to, searchQuery, branchId]);

  const { data, error, isLoading, isValidating, mutate } = useSWR(listUrl, fetcher, {
    keepPreviousData: true,
  });
  const sales = useMemo<SaleRow[]>(
    () => (Array.isArray(data) ? data : []),
    [data],
  );

  const {
    data: detail,
    error: detailError,
    isLoading: detailLoading,
  } = useSWR(
    selectedSaleId ? `/api/sales/transactions/${selectedSaleId}` : null,
    fetchSaleDetail,
  );

  const receiptData: PosReceiptData | null = useMemo(() => {
    if (!detail?.sale || detail.sale.id !== selectedSaleId) return null;
    return buildReceiptDataFromCompletedSale({
      sale: detail.sale,
      lines: detail.lines,
      payments: detail.payments,
    });
  }, [detail, selectedSaleId]);

  const grouped = useMemo(() => {
    const map = new Map<string, SaleRow[]>();
    for (const sale of sales) {
      const key = new Date(sale.createdAt).toLocaleDateString("en-CA");
      const list = map.get(key) ?? [];
      list.push(sale);
      map.set(key, list);
    }
    return Array.from(map.entries());
  }, [sales]);

  const dayTotal = useMemo(
    () => sales.reduce((sum, s) => sum + Number(s.totalGhs), 0),
    [sales],
  );

  const applyPreset = (id: (typeof PRESETS)[number]["id"]) => {
    const preset = PRESETS.find((p) => p.id === id)!;
    setActivePreset(id);
    setFrom(preset.from());
    setTo(preset.to());
  };

  const submitSearch = (e: FormEvent) => {
    e.preventDefault();
    setSearchQuery(searchInput.trim());
  };

  const handleReprint = async () => {
    if (!receiptData) return;
    setPrinting(true);
    try {
      await printReceiptHtml(receiptData);
      toast.success("Receipt sent to printer");
    } catch {
      toast.error("Could not open print dialog");
    } finally {
      setPrinting(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#F8F9FA] dark:bg-[#0a0a0a]">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-[1600px] flex-col gap-3 px-3 py-3 pb-[calc(5.5rem+env(safe-area-inset-bottom))] sm:px-4 sm:py-4 lg:gap-4 lg:px-6 lg:pb-4">
        {/* Compact toolbar — stays fixed; page does not scroll */}
        <header className="shrink-0 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                Reprint receipts
              </h1>
              <p className="mt-0.5 text-[13px] text-muted-foreground sm:text-[14px]">
                Search by day or invoice · live sales from your branch
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="h-9 shrink-0 rounded-xl"
              onClick={() => mutate()}
              disabled={isValidating}
            >
              {isValidating ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              Sync
            </Button>
          </div>

          <div className="rounded-xl border border-[#eef0f2] bg-white px-3 py-3 dark:border-white/[0.08] dark:bg-[#111] sm:px-4">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                {PRESETS.map((p) => {
                  const active = activePreset === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => applyPreset(p.id)}
                      className={`rounded-lg px-3 py-1.5 text-[12px] font-semibold transition-colors sm:text-[13px] ${
                        active
                          ? "bg-[#006c49] text-white dark:bg-[#6ffbbe] dark:text-[#00382a]"
                          : "bg-[#f4f5f6] text-foreground hover:bg-[#eef0f2] dark:bg-white/[0.06] dark:hover:bg-white/[0.1]"
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
                <div className="flex items-center gap-2">
                  <input
                    id="receipts-from"
                    type="date"
                    aria-label="From date"
                    value={from}
                    max={to}
                    onChange={(e) => {
                      setActivePreset("custom");
                      setFrom(e.target.value);
                    }}
                    className="h-9 rounded-lg border border-[#eef0f2] bg-transparent px-2.5 text-[13px] dark:border-white/10"
                  />
                  <span className="text-[12px] text-muted-foreground">to</span>
                  <input
                    id="receipts-to"
                    type="date"
                    aria-label="To date"
                    value={to}
                    min={from}
                    onChange={(e) => {
                      setActivePreset("custom");
                      setTo(e.target.value);
                    }}
                    className="h-9 rounded-lg border border-[#eef0f2] bg-transparent px-2.5 text-[13px] dark:border-white/10"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                <form onSubmit={submitSearch} className="relative w-full sm:w-64 lg:w-72">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Invoice, customer, cashier…"
                    className="h-9 w-full rounded-lg border border-[#eef0f2] bg-transparent pl-9 pr-9 text-[13px] outline-none focus:border-[#006c49]/40 focus:ring-4 focus:ring-[#006c49]/05 dark:border-white/10"
                  />
                  {searchInput ? (
                    <button
                      type="button"
                      aria-label="Clear search"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        setSearchInput("");
                        setSearchQuery("");
                      }}
                    >
                      <X className="size-3.5" />
                    </button>
                  ) : null}
                </form>
                <p className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                  <CalendarDays className="size-3.5 shrink-0" />
                  <span className="font-semibold text-foreground">{sales.length}</span>
                  <span>· {formatGhs(dayTotal)}</span>
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Panes: table scrolls, preview scrolls — page does not */}
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden lg:flex-row lg:gap-4">
          <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-[#eef0f2] bg-white dark:border-white/[0.08] dark:bg-[#111]">
            <div
              className={`${tableGrid} shrink-0 border-b border-[#e5e7eb] bg-[#f7f8f9] px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground sm:px-4 sm:text-[12px] dark:border-white/[0.08] dark:bg-[#141414]`}
            >
              <span>Time</span>
              <span>Invoice</span>
              <span>Customer</span>
              <span>Cashier</span>
              <span className="text-right">Items</span>
              <span className="text-right">Total</span>
              <span className="text-right">Status</span>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {isLoading && sales.length === 0 ? (
                <div className="flex h-full min-h-[240px] items-center justify-center text-muted-foreground">
                  <Loader2 className="size-6 animate-spin opacity-40" />
                </div>
              ) : error || (data && !Array.isArray(data) && data.error) ? (
                <div className="flex h-full min-h-[240px] flex-col items-center justify-center gap-2 px-6 text-center">
                  <p className="font-medium text-foreground">Could not load sales</p>
                  <p className="text-[13px] text-muted-foreground">
                    {(data as { error?: string })?.error || "Try syncing again."}
                  </p>
                </div>
              ) : sales.length === 0 ? (
                <div className="flex h-full min-h-[240px] flex-col items-center justify-center gap-3 px-6 text-center">
                  <div className="flex size-12 items-center justify-center rounded-full bg-[#006c49]/10 dark:bg-[#6ffbbe]/10">
                    <Receipt className="size-5 text-[#006c49] dark:text-[#6ffbbe]" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">No sales in this range</p>
                    <p className="mt-1 max-w-sm text-[13px] text-muted-foreground">
                      Pick another day or search by invoice to reprint a receipt.
                    </p>
                  </div>
                </div>
              ) : (
                grouped.map(([dayKey, rows]) => (
                  <div key={dayKey}>
                    <div className="sticky top-0 z-[1] border-b border-[#eef0f2] bg-[#f8f9fa]/95 px-3 py-2 backdrop-blur sm:px-4 dark:border-white/[0.06] dark:bg-[#111]/95">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                        {formatDayHeading(rows[0]!.createdAt)}
                        <span className="ml-2 font-medium normal-case tracking-normal text-muted-foreground/80">
                          {rows.length} sale{rows.length === 1 ? "" : "s"}
                        </span>
                      </p>
                    </div>
                    {rows.map((sale) => {
                      const selected = sale.id === selectedSaleId;
                      return (
                        <button
                          key={sale.id}
                          type="button"
                          onClick={() => setSelectedSaleId(sale.id)}
                          className={`${tableGrid} w-full border-b border-[#eef0f2] px-3 py-2.5 text-left text-[13px] transition-colors sm:px-4 sm:text-[14px] dark:border-white/[0.06] ${
                            selected
                              ? "bg-[#006c49]/[0.07] dark:bg-[#6ffbbe]/10"
                              : "hover:bg-[#f8f9fa] dark:hover:bg-white/[0.03]"
                          }`}
                        >
                          <span className="tabular-nums text-muted-foreground">
                            {formatTime(sale.createdAt)}
                          </span>
                          <span className="min-w-0 truncate font-semibold text-foreground">
                            {sale.invoiceId}
                          </span>
                          <span className="min-w-0 truncate text-muted-foreground">
                            {sale.customerName || "Walk-in"}
                          </span>
                          <span className="min-w-0 truncate text-muted-foreground">
                            {sale.staffName || "Staff"}
                          </span>
                          <span className="text-right tabular-nums text-muted-foreground">
                            {sale.itemCount}
                          </span>
                          <span className="text-right font-semibold tabular-nums text-foreground">
                            {formatGhs(Number(sale.totalGhs))}
                          </span>
                          <span
                            className={`text-right text-[12px] font-semibold ${statusTone(sale.status)}`}
                          >
                            {statusLabel(sale.status)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </section>

          <aside className="flex max-h-[42vh] min-h-[280px] w-full shrink-0 flex-col overflow-hidden rounded-xl border border-[#eef0f2] bg-white dark:border-white/[0.08] dark:bg-[#111] lg:max-h-none lg:h-full lg:w-[340px] xl:w-[380px]">
            {!selectedSaleId ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
                <Printer className="size-7 text-muted-foreground/40" />
                <div>
                  <p className="font-semibold text-foreground">Select a sale</p>
                  <p className="mt-1 max-w-xs text-[13px] text-muted-foreground">
                    Click a row to preview and reprint the receipt.
                  </p>
                </div>
              </div>
            ) : detailLoading && !receiptData ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="size-6 animate-spin text-muted-foreground opacity-40" />
              </div>
            ) : detailError || !receiptData ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
                <p className="font-medium text-foreground">Could not load receipt</p>
                <p className="text-[13px] text-muted-foreground">
                  {detailError instanceof Error ? detailError.message : "Try another sale."}
                </p>
              </div>
            ) : (
              <>
                <div className="flex shrink-0 items-center justify-between gap-3 border-b border-[#eef0f2] px-4 py-3 dark:border-white/[0.06]">
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Receipt preview
                    </p>
                    <p className="truncate text-[14px] font-semibold text-foreground">
                      {receiptData.invoiceId}
                    </p>
                  </div>
                  <Button
                    type="button"
                    onClick={handleReprint}
                    disabled={printing}
                    className="h-9 shrink-0 rounded-xl bg-[#006c49] text-white hover:bg-[#005a3d] dark:bg-[#6ffbbe] dark:text-[#00382a] dark:hover:bg-[#5ae9ad]"
                  >
                    {printing ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Printer className="size-4" />
                    )}
                    Reprint
                  </Button>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[#f4f5f6] p-4 dark:bg-[#0a0a0a]">
                  <div className="mx-auto w-full max-w-[280px] shadow-sm">
                    <PosSaleReceiptThermal data={receiptData} />
                  </div>
                </div>
              </>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
