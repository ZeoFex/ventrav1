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
  /** For cash: amount customer gave. For MoMo/card: same as total or recorded amount. */
  amountTenderedGhs: number;
  /** Cash change due; 0 for exact electronic payments. */
  changeGhs: number;
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
    `Payment: ${d.paymentMethodLabel}`,
    `Amount paid  ${formatCurrency(d.amountTenderedGhs, symbol)}`,
    `Change       ${formatCurrency(d.changeGhs, symbol)}`,
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
