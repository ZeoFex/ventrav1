import {
  getPaymentMethod,
  type GhanaPaymentMethodId,
} from "./pos-payment-methods";

export type PosReceiptLine = {
  name: string;
  qty: number;
  unitPriceGhs: number;
  lineTotalGhs: number;
};

export type PosReceiptData = {
  storeName: string;
  branchName: string;
  /** Optional multiline address / region / phone for the active branch */
  branchLocation?: string;
  invoiceId: string;
  date: Date;
  lines: PosReceiptLine[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethodLabel: string;
  customerName?: string;
  /** For cash single-tender: amount customer gave. For splits: total tendered across methods (may exceed total). */
  amountTenderedGhs: number;
  /** Change due back to the customer (cash single-tender, or split when tendered &gt; total). */
  changeGhs: number;
  /** Itemized amounts when paying with more than one method. */
  paymentLines?: { label: string; amountGhs: number }[];
  /** When customer did not pay full invoice at checkout (on-account). */
  balanceDueGhs?: number;
  receiptHeader?: string;
  receiptFooter?: string;
  operatorName?: string;
  currencySymbol?: string;
  /** Set after online checkout — enables QR + `/receipt/verify/{saleId}` (opaque UUID). */
  saleId?: string | null;
};

/** Absolute URL for receipt verification (uses current origin in the browser). */
export function buildReceiptVerificationUrl(saleId: string): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}/receipt/verify/${encodeURIComponent(saleId)}`;
  }
  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";
  return base ? `${base}/receipt/verify/${saleId}` : `/receipt/verify/${saleId}`;
}

/** Build a display string from branch record fields (non-empty parts joined by newlines). */
export function formatBranchLocation(branch: {
  address?: string | null;
  region?: string | null;
  phone?: string | null;
}): string | undefined {
  const parts = [branch.address, branch.region, branch.phone]
    .map((s) => (typeof s === "string" ? s.trim() : ""))
    .filter(Boolean);
  return parts.length > 0 ? parts.join("\n") : undefined;
}

export type BranchRowLite = {
  id: string;
  name: string;
  isMain?: boolean | null;
  address?: string | null;
  region?: string | null;
  phone?: string | null;
};

/** Pick active branch for receipt header (matches POS branch context). */
export function resolveBranchReceiptMeta(
  branches: BranchRowLite[],
  branchId: string | null,
): { name: string; location?: string } {
  if (!branches.length) {
    return { name: "Store", location: undefined };
  }
  if (branchId && branchId !== "all") {
    const b = branches.find((x) => x.id === branchId);
    if (b) {
      return { name: b.name, location: formatBranchLocation(b) };
    }
  }
  const main = branches.find((b) => b.isMain);
  const b = main || branches[0];
  return {
    name: b?.name ?? "Store",
    location: b ? formatBranchLocation(b) : undefined,
  };
}

export function formatCurrency(n: number, symbol: string = "GHS"): string {
  return `${symbol} ${n.toFixed(2)}`;
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

function paymentMethodShortLabel(methodId: string): string {
  const m = getPaymentMethod(methodId as GhanaPaymentMethodId);
  return m?.shortLabel ?? m?.label ?? methodId;
}

export type CustomerOrderReceiptOrderTotals = {
  invoiceId: string;
  subtotalGhs: number;
  taxGhs: number;
  discountGhs: number;
  totalGhs: number;
};

/** Thermal receipt for a single advance-payment installment on a customer (layaway) order. */
export function buildCustomerOrderAdvancePaymentReceiptData(opts: {
  order: CustomerOrderReceiptOrderTotals;
  orderLines: { productName: string; quantity: number; lineTotalGhs: number }[];
  /** Amounts collected in this transaction only */
  paymentLines: { paymentMethod: string; amountGhs: number }[];
  balanceDueGhs: number;
  customerName?: string | null;
  storeName: string;
  branchName: string;
  branchLocation?: string;
  receiptHeader?: string;
  receiptFooter?: string;
  operatorName?: string;
  currencySymbol?: string;
}): PosReceiptData {
  const symbol = opts.currencySymbol || "GHS";
  const lines: PosReceiptLine[] = opts.orderLines.map((l) => ({
    name: l.productName,
    qty: l.quantity,
    unitPriceGhs:
      l.quantity > 0
        ? roundMoney(l.lineTotalGhs / l.quantity)
        : l.lineTotalGhs,
    lineTotalGhs: roundMoney(l.lineTotalGhs),
  }));

  const subtotal = roundMoney(opts.order.subtotalGhs);
  const tax = roundMoney(opts.order.taxGhs);
  const discount = roundMoney(opts.order.discountGhs);
  const total = roundMoney(opts.order.totalGhs);

  const normalizedPay = opts.paymentLines.map((p) => ({
    paymentMethod: p.paymentMethod,
    amountGhs: roundMoney(p.amountGhs),
  }));
  const tendered = roundMoney(
    normalizedPay.reduce((s, p) => s + p.amountGhs, 0),
  );

  let paymentMethodLabel: string;
  let amountTenderedGhs: number;
  let changeGhs: number;
  let paymentLines: PosReceiptData["paymentLines"] | undefined;

  if (normalizedPay.length === 0) {
    paymentMethodLabel = "—";
    amountTenderedGhs = 0;
    changeGhs = 0;
  } else if (normalizedPay.length === 1) {
    const pl = normalizedPay[0]!;
    paymentMethodLabel = paymentMethodShortLabel(pl.paymentMethod);
    amountTenderedGhs = tendered;
    changeGhs = 0;
  } else {
    paymentMethodLabel = "Split payment";
    amountTenderedGhs = tendered;
    changeGhs = roundMoney(Math.max(0, tendered - total));
    paymentLines = normalizedPay.map((p) => ({
      label: paymentMethodShortLabel(p.paymentMethod),
      amountGhs: p.amountGhs,
    }));
  }

  const balanceDueGhs =
    opts.balanceDueGhs > 0.02 ? roundMoney(opts.balanceDueGhs) : undefined;

  const headerExtras = [
    opts.receiptHeader?.trim(),
    "Customer order — advance payment",
  ]
    .filter(Boolean)
    .join("\n");

  return {
    invoiceId: opts.order.invoiceId,
    date: new Date(),
    lines,
    subtotal,
    tax,
    discount,
    total,
    paymentMethodLabel,
    amountTenderedGhs,
    changeGhs,
    paymentLines,
    balanceDueGhs,
    customerName: opts.customerName ?? undefined,
    storeName: opts.storeName,
    branchName: opts.branchName,
    branchLocation: opts.branchLocation,
    receiptHeader: headerExtras || undefined,
    receiptFooter: opts.receiptFooter || "Thank you — VentraPOS",
    operatorName: opts.operatorName,
    currencySymbol: symbol,
    saleId: undefined,
  };
}

export function buildReceiptPlainText(d: PosReceiptData): string {
  const symbol = d.currencySymbol || "GHS";

  const lines = [
    d.storeName.toUpperCase(),
    d.branchName,
    ...(d.branchLocation ? ["", d.branchLocation] : []),
    ...(d.receiptHeader ? ["", d.receiptHeader] : []),
    "--------------------------------",
    d.date.toLocaleString("en-GH", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
    `Invoice: ${d.invoiceId}`,
    `Operator: ${d.operatorName || "SYSTEM"}`,
    `Customer: ${d.customerName || "Walk-in Customer"}`,
    "--------------------------------",
    ...d.lines.flatMap((l) => [
      `${l.name} x${l.qty}`,
      `  ${formatCurrency(l.lineTotalGhs, symbol)}`,
    ]),
    "--------------------------------",
    `Subtotal     ${formatCurrency(d.subtotal, symbol)}`,
    `Tax          ${formatCurrency(d.tax, symbol)}`,
    `Discount     -${formatCurrency(d.discount, symbol)}`,
    `TOTAL        ${formatCurrency(d.total, symbol)}`,
    "--------------------------------",
    ...(d.paymentLines && d.paymentLines.length > 0
      ? [
          "Payments:",
          ...d.paymentLines.flatMap((pl) => [
            `  ${pl.label}  ${formatCurrency(pl.amountGhs, symbol)}`,
          ]),
          ...(d.balanceDueGhs != null && d.balanceDueGhs > 0.01
            ? [`Balance due   ${formatCurrency(d.balanceDueGhs, symbol)}`]
            : []),
          ...(d.changeGhs > 0.01
            ? [`Change       ${formatCurrency(d.changeGhs, symbol)}`]
            : []),
        ]
      : [
          `Payment: ${d.paymentMethodLabel}`,
          `Amount paid  ${formatCurrency(d.amountTenderedGhs, symbol)}`,
          `Change       ${formatCurrency(d.changeGhs, symbol)}`,
        ]),
    "--------------------------------",
    ...(d.saleId
      ? [
          "",
          `Receipt verify ID: ${d.saleId}`,
          "(Scan QR or ask merchant for the verification page.)",
        ]
      : []),
    "--------------------------------",
    d.receiptFooter || "Thank you — VentraPOS",
  ];
  return lines.join("\n");
}
