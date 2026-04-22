"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2, Package } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CatalogProductImage } from "../products/catalog-product-image";

type LookupSale = {
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

type LookupLine = {
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

const RETURN_REASONS = [
    { value: "damaged", label: "Damaged" },
    { value: "customer_return", label: "Customer return" },
    { value: "wrong_item", label: "Wrong item" },
    { value: "other", label: "Other" },
] as const;

function formatGhs(n: number): string {
    return new Intl.NumberFormat("en-GH", {
        style: "currency",
        currency: "GHS",
        minimumFractionDigits: 2,
    }).format(n);
}

const fieldInputClass =
    "h-11 w-full min-w-0 rounded-2xl border border-[#eef0f2] bg-white px-4 text-[14px] tabular-nums outline-none focus:border-[#006c49]/40 focus:ring-4 focus:ring-[#006c49]/05 dark:border-white/[0.08] dark:bg-[#111]";

export function SalesRefundsView() {
    const searchParams = useSearchParams();
    const saleIdParam = searchParams.get("saleId");

    const [step, setStep] = useState<"invoice" | "lines">(() => (saleIdParam ? "lines" : "invoice"));
    const [invoiceInput, setInvoiceInput] = useState("");

    const [loading, setLoading] = useState(!!saleIdParam);
    const [submitting, setSubmitting] = useState(false);
    const [sale, setSale] = useState<LookupSale | null>(null);
    const [lines, setLines] = useState<LookupLine[]>([]);
    const [canReturn, setCanReturn] = useState(false);
    const [returnQty, setReturnQty] = useState<Record<string, number>>({});
    const [reason, setReason] = useState<string>(RETURN_REASONS[0].value);

    const resetToInvoice = useCallback(() => {
        setStep("invoice");
        setSale(null);
        setLines([]);
        setReturnQty({});
        setCanReturn(false);
        setInvoiceInput("");
    }, []);

    const applyPayload = useCallback((payload: { sale: LookupSale; lines: LookupLine[]; eligibility?: { canReturn: boolean } }) => {
        setSale(payload.sale);
        setLines(payload.lines);
        const eligible = payload.eligibility?.canReturn ?? (
            payload.sale.status === "completed" || payload.sale.status === "partially_refunded"
        );
        setCanReturn(eligible);
        const init: Record<string, number> = {};
        for (const l of payload.lines) {
            init[l.id] = 0;
        }
        setReturnQty(init);
        setStep("lines");
    }, []);

    useEffect(() => {
        if (!saleIdParam) return;
        let cancelled = false;
        setLoading(true);
        fetch(`/api/sales/transactions/${saleIdParam}`)
            .then(async (r) => {
                if (!r.ok) {
                    const err = await r.json().catch(() => ({}));
                    throw new Error((err as { error?: string }).error || "Could not load sale");
                }
                return r.json() as Promise<{ sale: LookupSale; lines: LookupLine[] }>;
            })
            .then((data) => {
                if (cancelled) return;
                applyPayload({ ...data, eligibility: { canReturn: data.sale.status === "completed" || data.sale.status === "partially_refunded" } });
            })
            .catch((e) => {
                if (!cancelled) toast.error(e instanceof Error ? e.message : "Load failed");
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [saleIdParam, applyPayload]);

    const lookupByInvoice = useCallback(async () => {
        const inv = invoiceInput.trim();
        if (!inv) {
            toast.error("Enter an invoice number");
            return;
        }
        setLoading(true);
        try {
            const r = await fetch(`/api/sales/lookup?invoice=${encodeURIComponent(inv)}`);
            if (!r.ok) {
                const err = await r.json().catch(() => ({}));
                throw new Error((err as { error?: string }).error || "Sale not found");
            }
            const data = await r.json() as { sale: LookupSale; lines: LookupLine[]; eligibility: { canReturn: boolean } };
            applyPayload(data);
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Lookup failed");
        } finally {
            setLoading(false);
        }
    }, [invoiceInput, applyPayload]);

    const linesPayload = useMemo(() => {
        return Object.entries(returnQty)
            .filter(([, q]) => q > 0)
            .map(([saleItemId, quantity]) => ({ saleItemId, quantity }));
    }, [returnQty]);

    const submitReturn = useCallback(async () => {
        if (!sale || linesPayload.length === 0) {
            toast.error("Enter return quantities for at least one line");
            return;
        }
        setSubmitting(true);
        try {
            const r = await fetch("/api/sales/returns", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    saleId: sale.id,
                    lines: linesPayload,
                    reason,
                }),
            });
            const data = await r.json().catch(() => ({}));
            if (!r.ok) {
                throw new Error((data as { error?: string }).error || "Return failed");
            }
            toast.success("Return recorded — stock restored and sale updated.");
            const nextStatus = (data as { sale?: { status?: string } }).sale?.status;
            if (nextStatus === "refunded") {
                resetToInvoice();
            } else {
                const ref = await fetch(`/api/sales/transactions/${sale.id}`);
                if (ref.ok) {
                    const fresh = await ref.json() as { sale: LookupSale; lines: LookupLine[] };
                    applyPayload({
                        ...fresh,
                        eligibility: { canReturn: fresh.sale.status === "completed" || fresh.sale.status === "partially_refunded" },
                    });
                }
            }
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Return failed");
        } finally {
            setSubmitting(false);
        }
    }, [sale, linesPayload, reason, applyPayload, resetToInvoice]);

    return (
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <div className="flex flex-col gap-2">
                <Link
                    href="/dashboard/sales/overview"
                    className="inline-flex w-fit items-center gap-1.5 text-[13px] text-muted-foreground transition hover:text-foreground"
                >
                    <ArrowLeft className="size-3.5" aria-hidden />
                    Sales
                </Link>
                <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-foreground">
                    Returns / refunds
                </h1>
                <p className="text-[14px] text-muted-foreground">
                    Look up a completed sale by invoice, enter quantities to return, and restock inventory.{" "}
                    <span className="text-foreground/80">Voided</span> sales are not the same as post-sale returns.
                </p>
            </div>

            {step === "invoice" && !saleIdParam && (
                <div className="space-y-4 rounded-xl border border-[#eef0f2] bg-card p-5 dark:border-white/[0.08]">
                    <div className="space-y-2">
                        <label htmlFor="invoice" className="text-[13px] font-medium text-foreground">
                            Invoice number
                        </label>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                            <input
                                id="invoice"
                                value={invoiceInput}
                                onChange={(e) => setInvoiceInput(e.target.value)}
                                placeholder="e.g. INV-B1-0001"
                                className={`${fieldInputClass} sm:max-w-md`}
                                onKeyDown={(e) => e.key === "Enter" && lookupByInvoice()}
                            />
                            <Button type="button" onClick={lookupByInvoice} disabled={loading}>
                                {loading ? <Loader2 className="size-4 animate-spin" /> : "Look up sale"}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {(loading && step === "lines") || (saleIdParam && loading && !sale) ? (
                <div className="flex justify-center py-16">
                    <Loader2 className="size-10 animate-spin text-muted-foreground opacity-40" aria-label="Loading" />
                </div>
            ) : null}

            {step === "lines" && sale && (
                <div className="space-y-6">
                    {!canReturn ? (
                        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
                            This sale cannot accept further returns ({sale.status}).
                        </p>
                    ) : null}

                    <div className="rounded-xl border border-[#eef0f2] bg-muted/20 p-4 text-[13px] dark:border-white/[0.08]">
                        <p className="font-[family-name:var(--font-display)] text-base font-semibold text-foreground">{sale.invoiceId}</p>
                        <p className="mt-1 text-muted-foreground">
                            {new Date(sale.createdAt).toLocaleString("en-GH")} · {sale.paymentMethod} · {sale.status}
                        </p>
                        <p className="mt-2 font-medium tabular-nums text-foreground">Total {formatGhs(Number(sale.totalGhs))}</p>
                    </div>

                    <div className="space-y-3">
                        <p className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
                            <Package className="size-3.5" aria-hidden />
                            Lines — return qty
                        </p>
                        <ul className="divide-y divide-[#eef0f2] rounded-xl border border-[#eef0f2] dark:divide-white/[0.06] dark:border-white/[0.08]">
                            {lines.map((line) => {
                                const max = line.quantity - line.quantityReturned;
                                const q = returnQty[line.id] ?? 0;
                                return (
                                    <li key={line.id} className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
                                        <div className="flex min-w-0 flex-1 gap-3">
                                            <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                                                {line.imageSrc ? (
                                                    <CatalogProductImage src={line.imageSrc} alt={line.productName} className="size-full object-cover" />
                                                ) : (
                                                    <div className="flex size-full items-center justify-center text-muted-foreground">
                                                        <Package className="size-6 opacity-40" />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-medium leading-snug text-foreground">{line.productName}</p>
                                                <p className="mt-0.5 text-[12px] text-muted-foreground">
                                                    Sold {line.quantity} · Returned {line.quantityReturned} · Remaining {max}
                                                </p>
                                                {(line.sku || line.barcode) && (
                                                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                                                        {[line.sku ? `SKU ${line.sku}` : null, line.barcode ? `Barcode ${line.barcode}` : null].filter(Boolean).join(" · ")}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 sm:w-40">
                                            <label htmlFor={`rq-${line.id}`} className="sr-only">
                                                Return qty
                                            </label>
                                            <input
                                                id={`rq-${line.id}`}
                                                type="number"
                                                min={0}
                                                max={max}
                                                value={q}
                                                disabled={!canReturn || max <= 0}
                                                onChange={(e) => {
                                                    const n = parseInt(e.target.value, 10);
                                                    if (!Number.isFinite(n) || n < 0) {
                                                        setReturnQty((prev) => ({ ...prev, [line.id]: 0 }));
                                                    } else {
                                                        setReturnQty((prev) => ({ ...prev, [line.id]: Math.min(max, n) }));
                                                    }
                                                }}
                                                className={fieldInputClass}
                                            />
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>

                    {canReturn ? (
                        <div className="space-y-4 rounded-xl border border-[#eef0f2] bg-card p-5 dark:border-white/[0.08]">
                            <div className="space-y-2">
                                <span className="block text-[13px] font-medium text-foreground">Reason (optional)</span>
                                <select
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    className={`${fieldInputClass} max-w-md cursor-pointer`}
                                >
                                    {RETURN_REASONS.map((r) => (
                                        <option key={r.value} value={r.value}>
                                            {r.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Button type="button" onClick={submitReturn} disabled={submitting || linesPayload.length === 0}>
                                    {submitting ? <Loader2 className="size-4 animate-spin" /> : "Confirm return"}
                                </Button>
                                {!saleIdParam ? (
                                    <Button type="button" variant="outline" onClick={resetToInvoice} disabled={submitting}>
                                        Different invoice
                                    </Button>
                                ) : null}
                            </div>
                        </div>
                    ) : null}
                </div>
            )}
        </div>
    );
}
