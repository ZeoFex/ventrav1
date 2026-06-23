"use client";

import { useSalesOverviewDate } from "./sales-overview-date-context";

export function SalesDateRangeControls() {
  const { from, to, setFrom, setTo } = useSalesOverviewDate();

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-[#eef0f2] bg-white p-4 dark:border-white/[0.08] dark:bg-[#111] sm:flex-row sm:flex-wrap sm:items-end">
      <div>
        <label
          htmlFor="sales-from"
          className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground"
        >
          From
        </label>
        <input
          id="sales-from"
          type="date"
          value={from}
          max={to}
          onChange={(e) => setFrom(e.target.value)}
          className="rounded-xl border border-[#eef0f2] bg-transparent px-3 py-2 text-[14px] dark:border-white/10"
        />
      </div>
      <div>
        <label
          htmlFor="sales-to"
          className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted-foreground"
        >
          To
        </label>
        <input
          id="sales-to"
          type="date"
          value={to}
          min={from}
          onChange={(e) => setTo(e.target.value)}
          className="rounded-xl border border-[#eef0f2] bg-transparent px-3 py-2 text-[14px] dark:border-white/10"
        />
      </div>
      <p className="text-[12px] text-muted-foreground sm:pb-2">
        Dates use Accra (GMT) calendar days
      </p>
    </div>
  );
}
