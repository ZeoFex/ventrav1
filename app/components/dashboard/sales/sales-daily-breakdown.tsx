"use client";

import useSWR from "swr";
import { Loader2 } from "lucide-react";
import { useSalesOverviewDate } from "./sales-overview-date-context";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function formatGhs(n: number): string {
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
    minimumFractionDigits: 2,
  }).format(n);
}

type DailyRow = {
  dateKey: string;
  date: string;
  revenue: number;
  transactions: number;
};

export function SalesDailyBreakdown() {
  const { overviewUrl } = useSalesOverviewDate();
  const { data, isLoading } = useSWR(overviewUrl, fetcher);
  const rows: DailyRow[] = data?.dailyBreakdown ?? [];

  const totals = rows.reduce(
    (acc, row) => ({
      revenue: acc.revenue + row.revenue,
      transactions: acc.transactions + row.transactions,
    }),
    { revenue: 0, transactions: 0 },
  );

  return (
    <div className="flex w-full flex-col rounded-2xl border border-[#eef0f2] bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] dark:border-white/[0.08] dark:bg-[#111]">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="font-[family-name:var(--font-display)] text-[16px] font-semibold text-foreground">
            Daily breakdown
          </h3>
          <p className="text-[13px] text-muted-foreground">
            Revenue and transactions for each day in the selected range
          </p>
        </div>
        {data?.period && (
          <p className="text-[12px] font-medium text-muted-foreground">
            {data.period.from} → {data.period.to}
          </p>
        )}
      </div>

      {isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground opacity-40" />
        </div>
      ) : rows.length === 0 ? (
        <p className="py-10 text-center text-[13px] text-muted-foreground">
          No sales in this period yet.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-left text-[14px]">
            <thead className="border-b border-[#f0f2f4] text-[11px] uppercase tracking-wide text-muted-foreground dark:border-white/[0.06]">
              <tr>
                <th className="pb-3 pr-4 font-semibold">Day</th>
                <th className="pb-3 pr-4 text-right font-semibold">Transactions</th>
                <th className="pb-3 text-right font-semibold">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f0f2f4] dark:divide-white/[0.06]">
              {rows.map((row) => (
                <tr key={row.dateKey} className="group">
                  <td className="py-2.5 pr-4">
                    <span className="font-medium text-foreground">{row.date}</span>
                    <span className="ml-2 hidden text-[11px] text-muted-foreground sm:inline">
                      {row.dateKey}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4 text-right tabular-nums text-muted-foreground">
                    {row.transactions.toLocaleString()}
                  </td>
                  <td className="py-2.5 text-right font-[family-name:var(--font-display)] font-semibold tabular-nums text-foreground">
                    {formatGhs(row.revenue)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-[#eef0f2] dark:border-white/[0.08]">
              <tr>
                <td className="pt-3 pr-4 text-[13px] font-semibold text-foreground">Total</td>
                <td className="pt-3 pr-4 text-right text-[13px] font-semibold tabular-nums text-foreground">
                  {totals.transactions.toLocaleString()}
                </td>
                <td className="pt-3 text-right font-[family-name:var(--font-display)] text-[13px] font-bold tabular-nums text-[#006c49] dark:text-[#6ffbbe]">
                  {formatGhs(totals.revenue)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
