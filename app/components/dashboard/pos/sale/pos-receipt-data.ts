export type PosReceiptLine = {
  name: string;
  qty: number;
  unitPriceGhs: number;
  lineTotalGhs: number;
};

export type PosReceiptData = {
  storeName: string;
  branchName: string;
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
};

export function formatCurrency(n: number, symbol: string = "GHS"): string {
  return `${symbol} ${n.toFixed(2)}`;
}

export function buildReceiptPlainText(d: PosReceiptData): string {
  const symbol = d.currencySymbol || "GHS";

  const lines = [
    d.storeName.toUpperCase(),
    d.branchName,
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
    d.receiptFooter || "Thank you — VentraPOS",
  ];
  return lines.join("\n");
}
