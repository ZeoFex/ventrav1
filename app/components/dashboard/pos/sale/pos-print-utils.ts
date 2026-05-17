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
      body { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 11px; line-height: 1.35; color: #111; margin: 0; padding: 12px; max-width: 58mm; }
      pre { white-space: pre-wrap; word-break: break-word; margin: 0; }
    </style></head><body><pre>${safe}</pre></body></html>`,
  );
  w.document.close();
  w.focus();
  w.print();
}

/**
 * Prints a structured thermal receipt by rendering HTML to a new window.
 * Content is aligned with PosSaleReceiptThermal + buildReceiptPlainText (header, footer, payments).
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
    <div style="display: flex; justify-content: space-between; margin: 2px 0;">
      <span style="flex: 1; text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${e(l.name)} x${l.qty}</span>
      <span style="font-weight: bold;">${e(formatCurrency(l.lineTotalGhs, sym))}</span>
    </div>
  `,
    )
    .join("");

  const headerExtra = data.receiptHeader
    ? `<div style="font-size: 11px; font-weight: 600; margin-bottom: 6px; white-space: pre-wrap; max-width: 100%;">${e(data.receiptHeader)}</div>`
    : "";

  const branchBlock = `<div style="font-size: 12px; font-weight: bold; margin-bottom: 2px;">${e(data.branchName)}</div>`;

  const locationBlock = data.branchLocation
    ? `<div style="font-size: 10px; line-height: 1.35; margin-bottom: 8px; white-space: pre-wrap; opacity: 0.85; text-align: center;">${e(data.branchLocation)}</div>`
    : `<div style="margin-bottom: 8px;"></div>`;

  const footerBlock = data.receiptFooter
    ? `<div style="margin-top: 16px; font-size: 10px; font-weight: bold; line-height: 1.4; white-space: pre-wrap; opacity: 0.75; text-align: center;">${e(data.receiptFooter)}</div>`
    : "";

  const op = e(data.operatorName || "SYSTEM");
  const orderIdPart = data.invoiceId.split("-")[1] || data.invoiceId;

  w.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8"/>
      <title>Receipt ${e(data.invoiceId)}</title>
      <style>
        @page { size: 58mm auto; margin: 0; }
        body { 
          font-family: 'Courier New', Courier, monospace; 
          font-size: 12px; 
          line-height: 1.2; 
          color: #000; 
          margin: 0; 
          padding: 8mm 4mm;
          width: 58mm;
          box-sizing: border-box;
          text-align: center;
          background: #fff;
        }
        .bold { font-weight: bold; }
        .divider { border-top: 1px dashed #000; margin: 8px 0; }
        .token-box { 
          border: 2px dashed #000; 
          padding: 10px 5px; 
          margin: 15px 0; 
          position: relative; 
        }
        .token-label { 
          position: absolute; 
          top: -10px; 
          left: 50%; 
          transform: translateX(-50%); 
          background: #fff; 
          padding: 0 5px; 
          font-size: 11px; 
          font-weight: bold;
          text-transform: uppercase;
        }
        .flex-between { display: flex; justify-content: space-between; }
        .total-row { font-size: 14px; font-weight: 900; border-top: 1px solid #000; padding-top: 5px; margin-top: 5px; }
      </style>
    </head>
    <body>
      <div style="font-size: 16px; font-weight: bold; text-transform: uppercase; margin-bottom: 2px;">${e(data.storeName)}</div>
      ${headerExtra}
      ${branchBlock}
      ${locationBlock}
      <div style="font-size: 11px; margin-bottom: 10px;">${e(dateStr)}</div>

      <div class="token-box">
        <span class="token-label">Token</span>
        <div style="font-size: 14px; font-weight: bold; letter-spacing: 1px; word-break: break-all;">${e(data.invoiceId)}</div>
      </div>

      <div class="flex-between" style="font-size: 11px;">
        <span>Customer Name</span>
        <span class="bold">${e(data.customerName || "Walk-in")}</span>
      </div>
      <div class="divider"></div>
      <div class="flex-between" style="font-size: 11px;">
        <span>Order ID</span>
        <span class="bold">${e(orderIdPart)}</span>
      </div>
      <div class="divider"></div>

      <div style="text-align: left; font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 2px; margin-bottom: 5px;">
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

          ${data.paymentLines && data.paymentLines.length > 0
            ? `
          <div style="font-size: 11px; font-weight: bold; margin-bottom: 4px;">Payments</div>
          ${data.paymentLines
            .map(
              (pl) => `
            <div class="flex-between" style="font-size: 11px;">
              <span>${e(pl.label)}</span>
              <span class="bold">${e(formatCurrency(pl.amountGhs, sym))}</span>
            </div>`,
            )
            .join("")}
          ${
            data.balanceDueGhs != null && data.balanceDueGhs > 0.01
              ? `<div class="flex-between" style="font-size: 11px; margin-top: 4px;">
            <span>Balance due</span>
            <span class="bold">${e(formatCurrency(data.balanceDueGhs, sym))}</span>
          </div>`
              : ""
          }
          <div class="flex-between" style="font-size: 11px; margin-top: 6px;">
            <span>Total collected</span>
            <span class="bold">${e(formatCurrency(data.amountTenderedGhs, sym))}</span>
          </div>
          `
            : `
          <div class="flex-between" style="font-size: 11px;">
            <span>Payment</span>
            <span class="bold">${e(data.paymentMethodLabel)}</span>
          </div>
          <div class="flex-between" style="font-size: 11px;">
            <span>Amount paid</span>
            <span class="bold">${e(formatCurrency(data.amountTenderedGhs, sym))}</span>
          </div>
          <div class="flex-between" style="font-size: 11px;">
            <span>Change</span>
            <span class="bold">${e(formatCurrency(data.changeGhs, sym))}</span>
          </div>
          `}

      <div class="divider"></div>

      <div class="flex-between" style="font-size: 11px;">
        <span>Operator</span>
        <span class="bold">${op}</span>
      </div>

      ${footerBlock}

      ${verifyQrHtml}

      <div style="margin-top: 20px; font-size: 24px; font-weight: 900; font-style: italic; letter-spacing: -1px;">VENTRA</div>
      <div style="font-size: 9px; font-weight: bold; letter-spacing: 3px; opacity: 0.6;">POS SYSTEM</div>
    </body>
    </html>
  `);

  w.document.close();
  w.focus();

  setTimeout(() => {
    w.print();
  }, 250);
}
