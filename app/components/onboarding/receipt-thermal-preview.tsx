import type { OnboardingData } from "./types";

function formatMoney(n: number, currency: string): string {
  const s = n.toFixed(2);
  return currency === "GHS" ? `₵${s}` : `${currency} ${s}`;
}

function DashedDivider() {
  return <div className="my-2 border-t border-dashed border-black/20" />;
}

export function ReceiptThermalPreview({ data }: { data: OnboardingData }) {
  const store =
    data.storeName.trim() ||
    data.legalName.trim() ||
    "Your store name";
  const headerLines = data.receiptHeader
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const footerLines = data.receiptFooter
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const subtotal = 45.0;
  const rate = parseFloat(data.taxRate.replace(",", ".")) || 0;
  const taxAmt =
    data.taxRegistered && !Number.isNaN(rate) ? subtotal * (rate / 100) : 0;
  const total = subtotal + taxAmt;

  const now = new Date();
  const dateStr = now.toLocaleString("en-GH", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <section
      className="mx-auto w-full max-w-[20rem] bg-white p-6 shadow-xl"
      aria-label="Thermal receipt preview"
      style={{
        fontFamily: "'Courier New', Courier, monospace",
        color: "black",
        backgroundColor: "white",
      }}
    >

      <div className="flex flex-col items-center text-center">
        {/* Header Logo/Name */}
        <div className="text-xl font-bold uppercase tracking-widest mb-1">
          {store}
        </div>
        <div className="text-[11px] mb-4">{dateStr}</div>

        {/* Token Section */}
        <div className="w-full border-2 border-dashed border-black/40 p-3 mb-6 relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-white px-2 text-[12px] font-bold uppercase tracking-wider">
            Token
          </div>
          <div className="text-[15px] font-bold tracking-[0.2em] break-all leading-relaxed">
            INV-MND1Z6QJ
          </div>
        </div>

        {/* Info Pairs */}
        <div className="w-full space-y-1.5 text-[12px]">
          {headerLines.length > 0 && (
            <div className="text-center mb-4 space-y-1">
              {headerLines.map((line, i) => (
                <div key={i} className="text-[10px] uppercase font-bold text-black/70 italic">
                  {line}
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-between gap-4">
            <span className="text-black/60">Customer Name</span>
            <span className="font-bold">Walk-in</span>
          </div>
          <DashedDivider />
          <div className="flex justify-between gap-4">
            <span className="text-black/60">Order ID</span>
            <span className="font-bold">MND1Z6QJ</span>
          </div>
          <DashedDivider />

          {/* Items Section */}
          <div className="pt-2">
            <div className="flex justify-between font-bold mb-1 border-b border-black/10 pb-1">
              <span>Item</span>
              <span>Total</span>
            </div>
            {[
              ["Milo 400g", 12.0],
              ["Bread loaf", 8.5],
              ["Water 1.5L", 24.5],
            ].map(([name, price], i) => (
              <div key={i} className="flex justify-between gap-2 py-0.5">
                <span className="truncate flex-1 text-left">
                  {name as string} x1
                </span>
                <span className="shrink-0 font-bold">
                  {formatMoney(price as number, data.currency)}
                </span>
              </div>
            ))}
          </div>

          <DashedDivider />

          {/* Totals */}
          <div className="space-y-1 pt-1 text-left">
            <div className="flex justify-between">
              <span>Amount</span>
              <span className="font-bold">{formatMoney(subtotal, data.currency)}</span>
            </div>
            {data.taxRegistered && rate > 0 && (
              <div className="flex justify-between">
                <span>Tax ({rate}%)</span>
                <span className="font-bold">{formatMoney(taxAmt, data.currency)}</span>
              </div>
            )}
            <div className="flex justify-between text-[14px] font-black border-t border-black/20 pt-2 mt-2">
              <span>TOTAL</span>
              <span>{formatMoney(total, data.currency)}</span>
            </div>
          </div>

          <DashedDivider />

          {/* Footer Section */}
          {footerLines.length > 0 && (
            <div className="text-center mt-2 space-y-1 pt-2">
              {footerLines.map((line, i) => (
                <div key={i} className="text-[10px] font-bold text-black/60">
                  {line}
                </div>
              ))}
            </div>
          )}

          {/* Footer Info */}
          <div className="flex justify-between text-[11px] pt-4">
            <span>Operator</span>
            <span className="font-bold">SYSTEM</span>
          </div>
        </div>

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
