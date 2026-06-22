"use client";

import { useBranchContext } from "../branch-context";
import { SalesOverviewMetrics } from "./sales-overview-metrics";
import { SalesFluidChart } from "./sales-fluid-chart";
import { SalesTopProducts } from "./sales-top-products";
import { SalesOverviewSWRProvider } from "./sales-overview-provider";
import { SalesOverviewDateProvider } from "./sales-overview-date-context";
import { SalesDateRangeControls } from "./sales-date-range-controls";
import { SalesDailyBreakdown } from "./sales-daily-breakdown";

export function SalesOverviewContent({ fallback }: { fallback: unknown }) {
  const { branchId } = useBranchContext();

  return (
    <SalesOverviewDateProvider branchId={branchId}>
      <SalesOverviewSWRProvider fallback={{ "/api/sales/overview": fallback }}>
        <div className="flex flex-col gap-6">
          <SalesDateRangeControls />
          <SalesOverviewMetrics />

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <div className="xl:col-span-2">
              <SalesFluidChart />
            </div>
            <div className="xl:col-span-1">
              <SalesTopProducts />
            </div>
          </div>

          <SalesDailyBreakdown />
        </div>
      </SalesOverviewSWRProvider>
    </SalesOverviewDateProvider>
  );
}
