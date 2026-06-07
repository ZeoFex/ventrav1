"use client";

import useSWR from "swr";
import Link from "next/link";
import { SalesDetailLayout } from "./sales-detail-layout";
import { Search, Download, Loader2, Users, User, X, ChevronDown, Check, Printer, FileText, Table as TableIcon, Package, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { useSession } from "../../auth/use-session";
import { exportToExcel, exportToCSV } from "@/app/utils/export-utils";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { CatalogProductImage } from "../products/catalog-product-image";
import { ProductAnalyticsModal } from "../reports/product-analytics-modal";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type TransactionDetailSale = {
    id: string;
    invoiceId: string;
    subtotalGhs: string;
    taxGhs: string;
    discountGhs: string;
    totalGhs: string;
    paymentMethod: string;
    itemCount: number;
    status: string;
    createdAt: string;
    staffName?: string | null;
    customerName?: string | null;
};

type TransactionDetailLine = {
    id: string;
    productId: string | null;
    variationId: string | null;
    productName: string;
    quantity: number;
    quantityReturned: number;
    unitPriceGhs: string;
    lineTotalGhs: string;
    sku: string | null;
    barcode: string | null;
    imageSrc: string | null;
};

async function fetchTransactionDetail(url: string) {
    const r = await fetch(url);
    if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || "Could not load sale");
    }
    return r.json() as Promise<{ sale: TransactionDetailSale; lines: TransactionDetailLine[] }>;
}

function formatGhs(n: number): string {
    return new Intl.NumberFormat("en-GH", {
        style: "currency",
        currency: "GHS",
        minimumFractionDigits: 2,
    }).format(n);
}

function formatDate(iso: string): string {
    return new Date(iso).toLocaleString("en-GH", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

type Transaction = {
    id: string;
    invoiceId: string;
    totalGhs: string;
    paymentMethod: string;
    itemCount: number;
    status: string;
    createdAt: string;
    staffName?: string;
};

export function TransactionsDetailView() {
    const { user } = useSession();
    const isAdmin = user?.role === "owner";
    const [staffId, setStaffId] = useState<string>("");
    const [staffOpen, setStaffOpen] = useState(false);
    const [exportOpen, setExportOpen] = useState(false);
    const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [analyticsTarget, setAnalyticsTarget] = useState<{
        productId: string;
        referenceDate: string;
    } | null>(null);

    // Fetch transactions with staff filter
    const { data, isLoading } = useSWR(`/api/sales/transactions${staffId ? `?staffId=${staffId}` : ""}`, fetcher);
    const transactions: Transaction[] = Array.isArray(data) ? data : [];

    const filteredTransactions = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return transactions;
        return transactions.filter(
            (t) =>
                t.invoiceId.toLowerCase().includes(q) ||
                t.paymentMethod.toLowerCase().includes(q) ||
                (t.staffName || "").toLowerCase().includes(q) ||
                t.status.toLowerCase().includes(q),
        );
    }, [transactions, searchQuery]);

    const {
        data: detailData,
        error: detailError,
        isLoading: detailLoading,
    } = useSWR(
        selectedSaleId ? `/api/sales/transactions/${selectedSaleId}` : null,
        fetchTransactionDetail,
    );

    const saleDetail =
        selectedSaleId && detailData?.sale?.id === selectedSaleId ? detailData : null;

    // Fetch staff list for filter (only for admin)
    const { data: staffData } = useSWR(isAdmin ? "/api/staff" : null, fetcher);
    const staffList: { id: string, name: string }[] = Array.isArray(staffData) ? staffData : [];

    const handleExportExcel = async () => {
        setExportOpen(false);
        const columns = [
            { header: "Invoice ID", key: "invoiceId", width: 25 },
            { header: "Date", key: "date", width: 25 },
            { header: "Staff", key: "staff", width: 25 },
            { header: "Items", key: "items", width: 10 },
            { header: "Total (GHS)", key: "total", width: 20, isCurrency: true },
            { header: "Method", key: "method", width: 15 },
            { header: "Status", key: "status", width: 15 },
        ];

        const exportData = filteredTransactions.map(t => ({
            invoiceId: t.invoiceId,
            date: formatDate(t.createdAt),
            staff: t.staffName || "System",
            items: t.itemCount,
            total: Number(t.totalGhs),
            method: t.paymentMethod,
            status: t.status
        }));

        await exportToExcel({
            data: exportData,
            columns,
            filename: `transactions_${new Date().toISOString().split('T')[0]}.xlsx`,
            sheetName: "Transactions"
        });
    };

    const handleExportCSV = () => {
        setExportOpen(false);
        const columns = [
            { header: "Invoice ID", key: "invoiceId" },
            { header: "Date", key: "date" },
            { header: "Staff", key: "staff" },
            { header: "Items", key: "items" },
            { header: "Total", key: "total" },
            { header: "Method", key: "method" },
            { header: "Status", key: "status" },
        ];

        const exportData = filteredTransactions.map(t => ({
            invoiceId: t.invoiceId,
            date: formatDate(t.createdAt),
            staff: t.staffName || "System",
            items: t.itemCount,
            total: Number(t.totalGhs),
            method: t.paymentMethod,
            status: t.status
        }));

        exportToCSV(exportData, columns, `transactions_${new Date().toISOString().split('T')[0]}.csv`);
    };

    return (
        <>
        <SalesDetailLayout
            title="Total Transactions"
            description="A complete log of every transaction processed through the system. Click a row to see items sold."
            actions={
                <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
                    <button
                        type="button"
                        onClick={() => window.print()}
                        className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#eef0f2] bg-white px-4 text-[13px] font-semibold text-foreground hover:bg-muted/50 sm:w-auto dark:border-white/[0.08] dark:bg-[#111]"
                    >
                        <Printer className="size-4 shrink-0" />
                        Print
                    </button>
                    <div className="relative w-full sm:w-auto">
                        <button
                            type="button"
                            onClick={() => setExportOpen(!exportOpen)}
                            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#006c49] px-4 text-[13px] font-semibold text-white shadow-lg hover:brightness-110 sm:w-auto"
                        >
                            <Download className="size-4 shrink-0" />
                            Export Data
                            <ChevronDown className={`size-3.5 shrink-0 transition-transform ${exportOpen ? "rotate-180" : ""}`} />
                        </button>

                        {exportOpen && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setExportOpen(false)} />
                                <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-48 overflow-hidden rounded-2xl border border-[#eef0f2] bg-white p-1.5 shadow-2xl dark:border-white/[0.08] dark:bg-[#1a1a1a]">
                                    <button
                                        onClick={handleExportExcel}
                                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-medium text-foreground hover:bg-muted/50 transition-colors"
                                    >
                                        <TableIcon className="size-4 text-emerald-600" />
                                        Export as Excel
                                    </button>
                                    <button
                                        onClick={handleExportCSV}
                                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-medium text-foreground hover:bg-muted/50 transition-colors"
                                    >
                                        <FileText className="size-4 text-blue-600" />
                                        Export as CSV
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            }
        >
            <div className="flex flex-col gap-4 print-container">
                {/* FILTERS — stack on phone, row on tablet+ */}
                <div className="flex flex-col gap-3 md:flex-row md:items-stretch md:gap-4">
                    <div className="relative min-w-0 flex-1">
                        <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                            type="search"
                            enterKeyHint="search"
                            autoComplete="off"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Invoice, payment method, staff…"
                            className="h-11 w-full min-w-0 rounded-2xl border border-[#eef0f2] bg-white pl-10 pr-4 text-[14px] outline-none focus:border-[#006c49]/40 focus:ring-4 focus:ring-[#006c49]/05 dark:border-white/[0.08] dark:bg-[#111]"
                        />
                    </div>

                    {isAdmin && (
                        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center md:w-auto md:shrink-0">
                            <div className="relative w-full sm:min-w-[200px] md:w-[220px]">
                                <button
                                    type="button"
                                    onClick={() => setStaffOpen((v) => !v)}
                                    className="flex h-11 w-full items-center gap-2.5 rounded-2xl border border-[#eef0f2] bg-white px-4 text-[14px] font-semibold text-foreground outline-none hover:border-[#006c49]/30 focus:border-[#006c49]/40 focus:ring-4 focus:ring-[#006c49]/05 dark:border-white/[0.08] dark:bg-[#111] cursor-pointer transition-all"
                                >
                                    <Users className="size-4 shrink-0 text-[#006c49] dark:text-[#6ffbbe]" />
                                    <span className="flex-1 truncate text-left">
                                        {staffId
                                            ? staffList.find((s) => s.id === staffId)
                                                ? staffList.find((s) => s.id === staffId)!.name
                                                : "Loading..."
                                            : "All Staff"}
                                    </span>
                                    <ChevronDown className={`size-4 shrink-0 text-muted-foreground transition-transform ${staffOpen ? "rotate-180" : ""}`} />
                                </button>

                                {staffOpen && (
                                    <>
                                        <div className="fixed inset-0 z-40" onClick={() => setStaffOpen(false)} />
                                        <div className="absolute right-0 top-[calc(100%+6px)] z-50 min-w-[220px] overflow-hidden rounded-2xl border border-[#eef0f2] bg-white shadow-xl dark:border-white/[0.08] dark:bg-[#1a1a1a]">
                                            <div className="max-h-64 overflow-y-auto p-1.5">
                                                <button
                                                    type="button"
                                                    onClick={() => { setStaffId(""); setStaffOpen(false); }}
                                                    className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-colors ${!staffId ? "bg-[#006c49]/10 text-[#006c49] dark:bg-[#6ffbbe]/10 dark:text-[#6ffbbe]" : "text-foreground hover:bg-muted/50"}`}
                                                >
                                                    <Users className="size-3.5 opacity-60" />
                                                    All Staff
                                                    {!staffId && <Check className="ml-auto size-3.5" />}
                                                </button>
                                                {staffList.map((s) => (
                                                    <button
                                                        key={s.id}
                                                        type="button"
                                                        onClick={() => { setStaffId(s.id); setStaffOpen(false); }}
                                                        className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-colors ${staffId === s.id ? "bg-[#006c49]/10 text-[#006c49] dark:bg-[#6ffbbe]/10 dark:text-[#6ffbbe]" : "text-foreground hover:bg-muted/50"}`}
                                                    >
                                                        <User className="size-3.5 opacity-60" />
                                                        {s.name}
                                                        {staffId === s.id && <Check className="ml-auto size-3.5" />}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                            {staffId && (
                                <button
                                    type="button"
                                    onClick={() => setStaffId("")}
                                    className="flex h-11 w-full shrink-0 items-center justify-center rounded-2xl border border-red-100 bg-red-50 text-red-500 hover:bg-red-100 transition-colors sm:size-11 sm:w-11 dark:border-red-900/30 dark:bg-red-900/20"
                                    title="Clear filter"
                                >
                                    <X className="size-4" />
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* MOBILE + TABLET: cards through md; DESKTOP: table */}
                <div className="overflow-hidden rounded-2xl border border-[#eef0f2] bg-white dark:border-white/[0.08] dark:bg-[#111]">
                    {isLoading ? (
                        <div className="flex h-64 items-center justify-center">
                            <Loader2 className="size-6 animate-spin text-muted-foreground opacity-30" />
                        </div>
                    ) : transactions.length === 0 ? (
                        <div className="flex h-64 items-center justify-center px-4 text-center text-sm text-muted-foreground">
                            No transactions yet. Complete a sale to see it here.
                        </div>
                    ) : filteredTransactions.length === 0 ? (
                        <div className="flex h-48 items-center justify-center px-4 text-center text-sm text-muted-foreground">
                            No transactions match your search. Try a different invoice or keyword.
                        </div>
                    ) : (
                        <>
                            <ul className="divide-y divide-[#f0f2f4] md:hidden dark:divide-white/[0.06]">
                                {filteredTransactions.map((trx) => (
                                    <li key={trx.id}>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedSaleId(trx.id)}
                                            className="flex w-full items-stretch gap-3 p-4 text-left transition-colors hover:bg-muted/30 active:bg-muted/50 dark:hover:bg-white/[0.03]"
                                        >
                                            <div className="min-w-0 flex-1 space-y-2">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <span className="font-mono text-[13px] font-semibold text-foreground">
                                                        {trx.invoiceId}
                                                    </span>
                                                    <span
                                                        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${trx.status === "completed"
                                                            ? "bg-[#006c49]/10 text-[#006c49] dark:bg-[#6ffbbe]/10 dark:text-[#6ffbbe]"
                                                            : trx.status === "refunded"
                                                              ? "bg-red-500/10 text-red-600 dark:text-red-400"
                                                              : "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                                                            }`}
                                                    >
                                                        {trx.status}
                                                    </span>
                                                </div>
                                                <p className="text-[12px] text-muted-foreground">
                                                    {formatDate(trx.createdAt)}
                                                </p>
                                                <p className="text-[12px] text-muted-foreground">
                                                    <span className="capitalize">{trx.paymentMethod}</span>
                                                    {" · "}
                                                    {trx.itemCount} items
                                                </p>
                                                <p className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#006c49] dark:text-[#6ffbbe]">
                                                    <User className="size-3.5 opacity-80" />
                                                    <span className="truncate">{trx.staffName || "Owner / System"}</span>
                                                </p>
                                            </div>
                                            <div className="flex shrink-0 flex-col items-end justify-between gap-2">
                                                <p className="font-[family-name:var(--font-display)] text-base font-bold tabular-nums text-foreground">
                                                    {formatGhs(Number(trx.totalGhs))}
                                                </p>
                                                <ChevronRight className="size-5 text-muted-foreground opacity-50" aria-hidden />
                                            </div>
                                        </button>
                                    </li>
                                ))}
                            </ul>

                            <div className="hidden md:block md:overflow-x-auto">
                                <table className="w-full min-w-[720px] text-left text-[14px]">
                                    <thead className="border-b border-[#f0f2f4] bg-muted/10 text-[11px] uppercase tracking-wider text-muted-foreground dark:border-white/[0.04]">
                                        <tr>
                                            <th className="px-4 py-3 font-semibold whitespace-nowrap lg:px-6 lg:py-4">Invoice</th>
                                            <th className="px-4 py-3 font-semibold whitespace-nowrap lg:px-6 lg:py-4">Date</th>
                                            <th className="px-4 py-3 font-semibold whitespace-nowrap lg:px-6 lg:py-4">Staff</th>
                                            <th className="px-4 py-3 font-semibold whitespace-nowrap lg:px-6 lg:py-4">Items</th>
                                            <th className="px-4 py-3 text-right font-semibold whitespace-nowrap lg:px-6 lg:py-4">Total</th>
                                            <th className="px-4 py-3 font-semibold whitespace-nowrap lg:px-6 lg:py-4">Method</th>
                                            <th className="px-4 py-3 font-semibold whitespace-nowrap lg:px-6 lg:py-4">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#f0f2f4] dark:divide-white/[0.04]">
                                        {filteredTransactions.map((trx) => (
                                            <tr
                                                key={trx.id}
                                                role="button"
                                                tabIndex={0}
                                                onClick={() => setSelectedSaleId(trx.id)}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter" || e.key === " ") {
                                                        e.preventDefault();
                                                        setSelectedSaleId(trx.id);
                                                    }
                                                }}
                                                className="group cursor-pointer transition-colors hover:bg-surface-elevated/50 dark:hover:bg-white/[0.02] focus-visible:bg-surface-elevated/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#006c49]/30 dark:focus-visible:ring-[#6ffbbe]/30"
                                            >
                                                <td className="px-4 py-3 font-medium text-foreground lg:px-6 lg:py-4">{trx.invoiceId}</td>
                                                <td className="px-4 py-3 text-[13px] text-muted-foreground lg:px-6 lg:py-4">{formatDate(trx.createdAt)}</td>
                                                <td className="px-4 py-3 lg:px-6 lg:py-4">
                                                    <span className="inline-flex max-w-[140px] items-center truncate rounded-lg bg-[#006c49]/5 px-2 py-1 text-[11px] font-bold text-[#006c49] border border-[#006c49]/10 dark:bg-[#6ffbbe]/10 dark:text-[#6ffbbe] dark:border-[#6ffbbe]/20 lg:max-w-[180px] lg:text-[12px]">
                                                        <User className="mr-1 size-3 shrink-0 opacity-70" />
                                                        <span className="truncate">{trx.staffName || "Owner / System"}</span>
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-muted-foreground lg:px-6 lg:py-4">{trx.itemCount} items</td>
                                                <td className="px-4 py-3 text-right font-[family-name:var(--font-display)] text-[13px] font-semibold text-foreground lg:px-6 lg:py-4 lg:text-[14px]">
                                                    {formatGhs(Number(trx.totalGhs))}
                                                </td>
                                                <td className="px-4 py-3 lg:px-6 lg:py-4">
                                                    <span className="capitalize text-[13px] text-muted-foreground">
                                                        {trx.paymentMethod}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 lg:px-6 lg:py-4">
                                                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold lg:text-[11px] ${trx.status === "completed"
                                                        ? "bg-[#006c49]/10 text-[#006c49] dark:bg-[#6ffbbe]/10 dark:text-[#6ffbbe]"
                                                        : trx.status === "refunded"
                                                            ? "bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400"
                                                            : "bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400"
                                                        }`}>
                                                        {trx.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </SalesDetailLayout>

        <Dialog open={!!selectedSaleId} onOpenChange={(open) => !open && setSelectedSaleId(null)}>
            <DialogContent className="max-h-[min(90dvh,720px)] overflow-y-auto sm:max-w-lg" showCloseButton>
                <DialogHeader>
                    <DialogTitle className="font-[family-name:var(--font-display)] text-lg">
                        {saleDetail?.sale.invoiceId ?? "Sale details"}
                    </DialogTitle>
                    <DialogDescription className="text-left text-[13px]">
                        {saleDetail?.sale
                            ? `${formatDate(saleDetail.sale.createdAt)} · ${saleDetail.sale.paymentMethod} · ${saleDetail.sale.status}`
                            : detailLoading
                              ? "Loading…"
                              : "Items in this sale."}
                    </DialogDescription>
                </DialogHeader>

                {selectedSaleId && detailLoading && !saleDetail && (
                    <div className="flex justify-center py-12">
                        <Loader2 className="size-8 animate-spin text-muted-foreground opacity-40" />
                    </div>
                )}

                {detailError && (
                    <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-800 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200">
                        {detailError instanceof Error ? detailError.message : "Something went wrong."}
                    </p>
                )}

                {saleDetail && (
                    <div className="space-y-5">
                        <div className="grid grid-cols-2 gap-3 rounded-xl border border-[#eef0f2] bg-muted/20 p-4 text-[13px] dark:border-white/[0.08]">
                            <div>
                                <p className="text-muted-foreground">Staff</p>
                                <p className="font-medium text-foreground">
                                    {(saleDetail.sale.staffName || "").trim() || "—"}
                                </p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">Customer</p>
                                <p className="font-medium text-foreground">
                                    {saleDetail.sale.customerName?.trim() || "Walk-in"}
                                </p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">Subtotal</p>
                                <p className="font-medium tabular-nums">{formatGhs(Number(saleDetail.sale.subtotalGhs))}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">Tax</p>
                                <p className="font-medium tabular-nums">{formatGhs(Number(saleDetail.sale.taxGhs))}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">Discount</p>
                                <p className="font-medium tabular-nums">{formatGhs(Number(saleDetail.sale.discountGhs))}</p>
                            </div>
                            <div>
                                <p className="text-muted-foreground">Total</p>
                                <p className="font-semibold tabular-nums text-[#006c49] dark:text-[#6ffbbe]">
                                    {formatGhs(Number(saleDetail.sale.totalGhs))}
                                </p>
                            </div>
                        </div>

                        {(saleDetail.sale.status === "completed" || saleDetail.sale.status === "partially_refunded") && (
                            <Link
                                href={`/dashboard/sales/refunds?saleId=${saleDetail.sale.id}`}
                                className="inline-flex w-full items-center justify-center rounded-xl border border-[#006c49]/30 bg-[#006c49]/10 px-4 py-2.5 text-[13px] font-medium text-[#006c49] transition hover:bg-[#006c49]/15 dark:border-[#6ffbbe]/25 dark:bg-[#6ffbbe]/10 dark:text-[#6ffbbe]"
                            >
                                Process return
                            </Link>
                        )}

                        <div>
                            <p className="mb-2 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
                                <Package className="size-3.5" aria-hidden />
                                Products
                            </p>
                            <ul className="divide-y divide-[#eef0f2] rounded-xl border border-[#eef0f2] dark:divide-white/[0.06] dark:border-white/[0.08]">
                                {saleDetail.lines.map((line) => (
                                    <li key={line.id}>
                                        <button
                                            type="button"
                                            disabled={!line.productId}
                                            onClick={() => {
                                                if (line.productId && saleDetail) {
                                                    setAnalyticsTarget({
                                                        productId: line.productId,
                                                        referenceDate: saleDetail.sale.createdAt,
                                                    });
                                                }
                                            }}
                                            className={`flex w-full gap-3 p-3 text-left first:rounded-t-[inherit] last:rounded-b-[inherit] ${
                                                line.productId
                                                    ? "cursor-pointer transition-colors hover:bg-muted/30 active:bg-muted/50 dark:hover:bg-white/[0.03]"
                                                    : "cursor-default opacity-90"
                                            }`}
                                        >
                                        <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                                            {line.imageSrc ? (
                                                <CatalogProductImage
                                                    src={line.imageSrc}
                                                    alt={line.productName}
                                                    className="size-full object-cover"
                                                />
                                            ) : (
                                                <div className="flex size-full items-center justify-center text-muted-foreground">
                                                    <Package className="size-6 opacity-40" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="font-medium leading-snug text-foreground">{line.productName}</p>
                                            {line.sku ? (
                                                <p className="mt-0.5 text-[12px] text-muted-foreground">SKU {line.sku}</p>
                                            ) : null}
                                            {line.barcode ? (
                                                <p className="mt-0.5 text-[12px] text-muted-foreground">Barcode {line.barcode}</p>
                                            ) : null}
                                            <p className="mt-1 text-[12px] text-muted-foreground">
                                                {line.quantity - (line.quantityReturned ?? 0)} sellable · {line.quantityReturned ?? 0} returned ·{" "}
                                                {formatGhs(Number(line.unitPriceGhs))} each
                                            </p>
                                        </div>
                                        <div className="shrink-0 text-right">
                                            <p className="font-[family-name:var(--font-display)] font-semibold tabular-nums text-foreground">
                                                {formatGhs(Number(line.lineTotalGhs))}
                                            </p>
                                        </div>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>

        <ProductAnalyticsModal
            open={!!analyticsTarget}
            onOpenChange={(open) => !open && setAnalyticsTarget(null)}
            productId={analyticsTarget?.productId ?? null}
            referenceDate={analyticsTarget?.referenceDate ?? null}
        />
        </>
    );
}
