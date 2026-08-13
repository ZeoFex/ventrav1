import type { PosReceiptData } from "./pos-receipt-data";
import { formatCurrency } from "./pos-receipt-data";
import { ReceiptVerificationBlock } from "./receipt-verify-qr";

function DashedDivider() {
  return <div className="my-2 border-t border-dashed border-black/40" />;
}

/** 58mm-style thermal preview for completed POS sales. */
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

  const orderIdPart = data.invoiceId.includes("-")
    ? data.invoiceId.slice(data.invoiceId.indexOf("-") + 1)
    : data.invoiceId;

  return (
    <section
      id="pos-sale-receipt-thermal"
      className="mx-auto w-full max-w-[20rem] bg-white p-6 shadow-xl"
      style={{
        fontFamily: "'Courier New', Courier, monospace",
        color: "#000",
        backgroundColor: "#fff",
      }}
    >
      <div className="flex flex-col items-center text-center text-black">
        <div className="mb-1 text-xl font-black uppercase tracking-widest text-black">
          {data.storeName}
        </div>
        {data.receiptHeader ? (
          <div className="mb-2 max-w-full whitespace-pre-wrap text-[12px] font-bold leading-snug text-black">
            {data.receiptHeader}
          </div>
        ) : null}
        <div className="text-[13px] font-bold text-black">{data.branchName}</div>
        {data.branchLocation ? (
          <div className="mb-3 max-w-full whitespace-pre-wrap text-[12px] font-semibold leading-snug text-black">
            {data.branchLocation}
          </div>
        ) : (
          <div className="mb-3" />
        )}
        <div className="mb-4 text-[12px] font-semibold text-black">{dateStr}</div>

        {/* Invoice box — same dashed frame as before, without the TOKEN label */}
        <div className="relative mb-6 w-full border-2 border-dashed border-black p-3">
          <div className="break-all text-[15px] font-black tracking-[0.18em] leading-relaxed text-black">
            {data.invoiceId}
          </div>
        </div>

        <div className="w-full space-y-1.5 text-[13px] text-black">
          <div className="flex justify-between gap-4">
            <span className="font-semibold">Customer Name</span>
            <span className="font-bold">{data.customerName || "Walk-in"}</span>
          </div>
          <DashedDivider />
          <div className="flex justify-between gap-4">
            <span className="font-semibold">Order ID</span>
            <span className="break-all text-right font-bold">{orderIdPart}</span>
          </div>
          <DashedDivider />

          <div className="pt-2">
            <div className="mb-1 flex justify-between border-b border-black pb-1 font-black">
              <span>Item</span>
              <span>Total</span>
            </div>
            {data.lines.map((line, i) => (
              <div key={i} className="flex justify-between gap-2 py-0.5">
                <span className="flex-1 truncate text-left font-semibold">
                  {line.name} x{line.qty}
                </span>
                <span className="shrink-0 font-bold">
                  {formatCurrency(line.lineTotalGhs, data.currencySymbol)}
                </span>
              </div>
            ))}
          </div>

          <DashedDivider />

          <div className="space-y-1 pt-1">
            <div className="flex justify-between font-semibold">
              <span>Amount</span>
              <span className="font-bold">
                {formatCurrency(data.subtotal, data.currencySymbol)}
              </span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Tax</span>
              <span className="font-bold">
                {formatCurrency(data.tax, data.currencySymbol)}
              </span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Discount</span>
              <span className="font-bold">
                -{formatCurrency(data.discount, data.currencySymbol)}
              </span>
            </div>
            <div className="mt-2 flex justify-between border-t border-black pt-2 text-[15px] font-black">
              <span>TOTAL</span>
              <span>{formatCurrency(data.total, data.currencySymbol)}</span>
            </div>
          </div>

          <DashedDivider />

          <div className="space-y-1 pt-1 text-[13px]">
            {data.paymentLines && data.paymentLines.length > 0 ? (
              <>
                <div className="mb-1 font-black">Payments</div>
                {data.paymentLines.map((pl, i) => (
                  <div key={i} className="flex justify-between gap-2 font-semibold">
                    <span>{pl.label}</span>
                    <span className="font-bold">
                      {formatCurrency(pl.amountGhs, data.currencySymbol)}
                    </span>
                  </div>
                ))}
                {data.balanceDueGhs != null && data.balanceDueGhs > 0.01 ? (
                  <div className="flex justify-between gap-2 font-black">
                    <span>Balance due</span>
                    <span>
                      {formatCurrency(data.balanceDueGhs, data.currencySymbol)}
                    </span>
                  </div>
                ) : null}
                <div className="mt-1 flex justify-between gap-2 border-t border-black/30 pt-1 font-semibold">
                  <span>Total collected</span>
                  <span className="font-bold">
                    {formatCurrency(data.amountTenderedGhs, data.currencySymbol)}
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between font-semibold">
                  <span>Payment</span>
                  <span className="font-bold">{data.paymentMethodLabel}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Amount paid</span>
                  <span className="font-bold">
                    {formatCurrency(data.amountTenderedGhs, data.currencySymbol)}
                  </span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Change</span>
                  <span className="font-bold">
                    {formatCurrency(data.changeGhs, data.currencySymbol)}
                  </span>
                </div>
              </>
            )}
          </div>

          <DashedDivider />

          <div className="flex justify-between pt-2 text-[12px] font-semibold">
            <span>Operator</span>
            <span className="font-bold">{data.operatorName || "SYSTEM"}</span>
          </div>
        </div>

        {data.receiptFooter ? (
          <div className="mt-5 whitespace-pre-wrap text-center text-[12px] font-bold leading-relaxed text-black">
            {data.receiptFooter}
          </div>
        ) : null}

        <ReceiptVerificationBlock data={data} />
      </div>
    </section>
  );
}
