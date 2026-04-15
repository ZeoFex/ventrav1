import type { PosReceiptData } from "./pos-receipt-data";
import { formatCurrency } from "./pos-receipt-data";
import { ReceiptVerificationBlock } from "./receipt-verify-qr";

function DashedDivider() {
  return <div className="my-2 border-t border-dashed border-black/20" />;
}

/** 58mm-style thermal preview for completed POS sales. Optimized for physical printing look. */
export function PosSaleReceiptThermal({ data }: { data: PosReceiptData }) {
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

  return (
    <section
      id="pos-sale-receipt-thermal"
      className="mx-auto w-full max-w-[20rem] bg-white p-6 shadow-xl"
      style={{
        fontFamily: "'Courier New', Courier, monospace",
        color: "black",
        backgroundColor: "white",
      }}
    >
      <div className="flex flex-col items-center text-center">
        {/* Header Logo/Name */}
        <div className="text-xl font-bold uppercase tracking-widest mb-1">
          {data.storeName}
        </div>
        {data.receiptHeader ? (
          <div className="mb-2 max-w-full whitespace-pre-wrap text-[11px] font-semibold leading-snug text-black/80">
            {data.receiptHeader}
          </div>
        ) : null}
        <div className="text-[12px] font-bold text-black">{data.branchName}</div>
        {data.branchLocation ? (
          <div className="mb-3 max-w-full whitespace-pre-wrap text-[10px] leading-snug text-black/65">
            {data.branchLocation}
          </div>
        ) : (
          <div className="mb-3" />
        )}
        <div className="text-[11px] mb-4">{dateStr}</div>

        {/* Token Section */}
        <div className="w-full border-2 border-dashed border-black/40 p-3 mb-6 relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white px-2 text-[12px] font-bold uppercase tracking-wider">
            Token
          </div>
          <div className="text-[15px] font-bold tracking-[0.2em] break-all leading-relaxed">
            {data.invoiceId}
          </div>
        </div>

        {/* Info Pairs */}
        <div className="w-full space-y-1.5 text-[12px]">
          <div className="flex justify-between gap-4">
            <span className="text-black/60">Customer Name</span>
            <span className="font-bold">{data.customerName || "Walk-in"}</span>
          </div>
          <DashedDivider />
          <div className="flex justify-between gap-4">
            <span className="text-black/60">Order ID</span>
            <span className="font-bold">{data.invoiceId.split('-')[1]}</span>
          </div>
          <DashedDivider />
          
          {/* Items Section */}
          <div className="pt-2">
            <div className="flex justify-between font-bold mb-1 border-b border-black/10 pb-1">
              <span>Item</span>
              <span>Total</span>
            </div>
            {data.lines.map((line, i) => (
              <div key={i} className="flex justify-between gap-2 py-0.5">
                <span className="truncate flex-1 text-left">
                  {line.name} x{line.qty}
                </span>
                <span className="shrink-0 font-bold">
                  {formatCurrency(line.lineTotalGhs, data.currencySymbol)}
                </span>
              </div>
            ))}
          </div>

          <DashedDivider />

          {/* Totals */}
          <div className="space-y-1 pt-1">
            <div className="flex justify-between">
              <span>Amount</span>
              <span className="font-bold">{formatCurrency(data.subtotal, data.currencySymbol)}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax</span>
              <span className="font-bold">{formatCurrency(data.tax, data.currencySymbol)}</span>
            </div>
            <div className="flex justify-between">
              <span>Discount</span>
              <span className="font-bold">-{formatCurrency(data.discount, data.currencySymbol)}</span>
            </div>
            <div className="flex justify-between text-[14px] font-black border-t border-black/20 pt-2 mt-2">
              <span>TOTAL</span>
              <span>{formatCurrency(data.total, data.currencySymbol)}</span>
            </div>
          </div>

          <DashedDivider />

          <div className="space-y-1 pt-1 text-[12px]">
            <div className="flex justify-between">
              <span>Payment</span>
              <span className="font-bold">{data.paymentMethodLabel}</span>
            </div>
            <div className="flex justify-between">
              <span>Amount paid</span>
              <span className="font-bold">{formatCurrency(data.amountTenderedGhs, data.currencySymbol)}</span>
            </div>
            <div className="flex justify-between">
              <span>Change</span>
              <span className="font-bold">{formatCurrency(data.changeGhs, data.currencySymbol)}</span>
            </div>
          </div>

          <DashedDivider />

          {/* Footer Info */}
          <div className="flex justify-between text-[11px] pt-2">
            <span>Operator</span>
            <span className="font-bold">{data.operatorName || "SYSTEM"}</span>
          </div>
        </div>

        {data.receiptFooter && (
          <div className="mt-6 text-[10px] text-center leading-relaxed font-bold opacity-70 whitespace-pre-wrap">
            {data.receiptFooter}
          </div>
        )}

        <ReceiptVerificationBlock data={data} />

        {/* Bottom Logo */}
        <div className="mt-8 text-2xl font-black italic tracking-tighter opacity-80">
          VENTRA
        </div>
        <div className="mt-1 text-[9px] uppercase tracking-[0.3em] font-bold opacity-40">
          POS SYSTEM
        </div>
      </div>
    </section>
  );
}
