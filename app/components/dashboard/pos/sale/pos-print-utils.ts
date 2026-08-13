/** Client-only helpers for receipt download / print. */
import type { PosReceiptData } from "./pos-receipt-data";
import { buildReceiptVerificationUrl, formatCurrency } from "./pos-receipt-data";

export function downloadTextFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Opens a minimal window with monospace receipt and triggers the print dialog. */
export function printReceiptPlainText(plainText: string): void {
  const w = window.open("", "_blank", "noopener,noreferrer");
  if (!w) return;
  const safe = escapeHtml(plainText);
  w.document.write(
    `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Receipt</title>
    <style>
      @page { size: 58mm auto; margin: 4mm; }
      * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      body { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 13px; line-height: 1.4; color: #000; margin: 0; padding: 12px; max-width: 58mm; background: #fff; }
      pre { white-space: pre-wrap; word-break: break-word; margin: 0; color: #000; font-weight: 600; }
    </style></head><body><pre>${safe}</pre></body></html>`,
  );
  w.document.close();
  w.focus();
  w.print();
}

/**
 * Prints the classic thermal receipt layout (invoice box, order details, QR).
 * TOKEN label removed; all text forced black for printer visibility.
 */
export async function printReceiptHtml(data: PosReceiptData): Promise<void> {
  const w = window.open("", "_blank", "width=400,height=600");
  if (!w) return;

  let verifyQrHtml = "";
  const sid = data.saleId?.trim();
  if (sid) {
    try {
      const QRCode = (await import("qrcode")).default;
      const verifyUrl = buildReceiptVerificationUrl(sid);
      const dataUrl = await QRCode.toDataURL(verifyUrl, {
        width: 100,
        margin: 1,
        errorCorrectionLevel: "M",
        color: { dark: "#000000", light: "#ffffff" },
      });
      verifyQrHtml = `<div style="margin-top: 14px; text-align: center;"><img src="${dataUrl}" width="100" height="100" alt="" /></div>`;
    } catch {
      verifyQrHtml = "";
    }
  }

  const sym = data.currencySymbol || "GHS";
  const dateStr = data.date.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  const e = escapeHtml;
  const linesHtml = data.lines
    .map(
      (l) => `
    <div class="flex-between" style="margin: 2px 0;">
      <span style="flex: 1; text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${e(l.name)} x${l.qty}</span>
      <span class="bold">${e(formatCurrency(l.lineTotalGhs, sym))}</span>
    </div>
  `,
    )
    .join("");

  const headerExtra = data.receiptHeader
    ? `<div style="font-size: 12px; font-weight: 700; margin-bottom: 6px; white-space: pre-wrap; max-width: 100%; color: #000;">${e(data.receiptHeader)}</div>`
    : "";

  const branchBlock = `<div style="font-size: 13px; font-weight: 800; margin-bottom: 2px; color: #000;">${e(data.branchName)}</div>`;

  const locationBlock = data.branchLocation
    ? `<div style="font-size: 12px; font-weight: 700; line-height: 1.35; margin-bottom: 8px; white-space: pre-wrap; text-align: center; color: #000;">${e(data.branchLocation)}</div>`
    : `<div style="margin-bottom: 8px;"></div>`;

  const footerBlock = data.receiptFooter
    ? `<div style="margin-top: 14px; font-size: 12px; font-weight: 800; line-height: 1.4; white-space: pre-wrap; text-align: center; color: #000;">${e(data.receiptFooter)}</div>`
    : "";

  const op = e(data.operatorName || "SYSTEM");
  const orderIdPart = data.invoiceId.includes("-")
    ? data.invoiceId.slice(data.invoiceId.indexOf("-") + 1)
    : data.invoiceId;

  const paymentHtml =
    data.paymentLines && data.paymentLines.length > 0
      ? `
          <div style="font-size: 12px; font-weight: 800; margin-bottom: 4px; text-align: left;">Payments</div>
          ${data.paymentLines
            .map(
              (pl) => `
            <div class="flex-between" style="font-size: 12px;">
              <span>${e(pl.label)}</span>
              <span class="bold">${e(formatCurrency(pl.amountGhs, sym))}</span>
            </div>`,
            )
            .join("")}
          ${
            data.balanceDueGhs != null && data.balanceDueGhs > 0.01
              ? `<div class="flex-between" style="font-size: 12px; margin-top: 4px;">
            <span>Balance due</span>
            <span class="bold">${e(formatCurrency(data.balanceDueGhs, sym))}</span>
          </div>`
              : ""
          }
          <div class="flex-between" style="font-size: 12px; margin-top: 6px;">
            <span>Total collected</span>
            <span class="bold">${e(formatCurrency(data.amountTenderedGhs, sym))}</span>
          </div>
          `
      : `
          <div class="flex-between" style="font-size: 12px;">
            <span>Payment</span>
            <span class="bold">${e(data.paymentMethodLabel)}</span>
          </div>
          <div class="flex-between" style="font-size: 12px;">
            <span>Amount paid</span>
            <span class="bold">${e(formatCurrency(data.amountTenderedGhs, sym))}</span>
          </div>
          <div class="flex-between" style="font-size: 12px;">
            <span>Change</span>
            <span class="bold">${e(formatCurrency(data.changeGhs, sym))}</span>
          </div>
          `;

  w.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8"/>
      <title>Receipt ${e(data.invoiceId)}</title>
      <style>
        @page { size: 58mm auto; margin: 0; }
        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
          color: #000 !important;
        }
        body {
          font-family: 'Courier New', Courier, monospace;
          font-size: 12px;
          line-height: 1.25;
          color: #000;
          margin: 0;
          padding: 8mm 4mm;
          width: 58mm;
          text-align: center;
          background: #fff;
          font-weight: 600;
        }
        .bold { font-weight: 800; }
        .divider { border-top: 1.5px dashed #000; margin: 8px 0; }
        .invoice-box {
          border: 2px dashed #000;
          padding: 10px 5px;
          margin: 12px 0 16px;
        }
        .flex-between { display: flex; justify-content: space-between; gap: 6px; text-align: left; }
        .total-row {
          font-size: 14px;
          font-weight: 900;
          border-top: 1.5px solid #000;
          padding-top: 5px;
          margin-top: 5px;
        }
      </style>
    </head>
    <body>
      <div style="font-size: 16px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 2px;">${e(data.storeName)}</div>
      ${headerExtra}
      ${branchBlock}
      ${locationBlock}
      <div style="font-size: 12px; font-weight: 700; margin-bottom: 10px;">${e(dateStr)}</div>

      <div class="invoice-box">
        <div style="font-size: 14px; font-weight: 900; letter-spacing: 0.12em; word-break: break-all;">${e(data.invoiceId)}</div>
      </div>

      <div class="flex-between" style="font-size: 12px;">
        <span>Customer Name</span>
        <span class="bold">${e(data.customerName || "Walk-in")}</span>
      </div>
      <div class="divider"></div>
      <div class="flex-between" style="font-size: 12px;">
        <span>Order ID</span>
        <span class="bold">${e(orderIdPart)}</span>
      </div>
      <div class="divider"></div>

      <div style="text-align: left; font-weight: 900; border-bottom: 1.5px solid #000; padding-bottom: 2px; margin-bottom: 5px;">
        <div class="flex-between"><span>Item</span><span>Total</span></div>
      </div>
      ${linesHtml}

      <div class="divider"></div>

      <div class="flex-between"><span>Amount</span><span class="bold">${e(formatCurrency(data.subtotal, sym))}</span></div>
      <div class="flex-between"><span>Tax</span><span class="bold">${e(formatCurrency(data.tax, sym))}</span></div>
      <div class="flex-between"><span>Discount</span><span class="bold">-${e(formatCurrency(data.discount, sym))}</span></div>

      <div class="flex-between total-row">
        <span>TOTAL</span>
        <span>${e(formatCurrency(data.total, sym))}</span>
      </div>

      <div class="divider"></div>

      ${paymentHtml}

      <div class="divider"></div>

      <div class="flex-between" style="font-size: 12px;">
        <span>Operator</span>
        <span class="bold">${op}</span>
      </div>

      ${footerBlock}

      ${verifyQrHtml}
    </body>
    </html>
  `);

  w.document.close();
  w.focus();

  setTimeout(() => {
    w.print();
  }, 250);
}
