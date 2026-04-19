import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/server/db";
import { products } from "@/server/db/schema/products";
import { sales, saleItems } from "@/server/db/schema/sales";

function branchFilter(branchId?: string | null) {
  return branchId ? eq(sales.branchId, branchId) : undefined;
}

/** Matches dashboard analytics: dates in Africa/Accra. */
const dayKeySql = sql<string>`TO_CHAR(${sales.createdAt} AT TIME ZONE 'Africa/Accra', 'YYYY-MM-DD')`;

export type MerchantAnalyticsQuery =
  | "all_time_top_products"
  | "daily_revenue_trend_90d"
  | "best_store_sales_days"
  | "slow_moving_products"
  | "top_product_peak_day";

export type AllTimeTopProduct = {
  productId: string | null;
  name: string;
  totalRevenueGhs: number;
  unitsSold: number;
};

export type DailyRevenueRow = { date: string; revenueGhs: number };

export type BestDayRow = { date: string; revenueGhs: number };

export type SlowMoverRow = {
  productId: string;
  name: string;
  stock: number;
  revenueLast60DaysGhs: number;
};

export type TopProductPeakDay = {
  productName: string;
  productId: string | null;
  bestDate: string;
  revenueGhsOnThatDay: number;
};

/**
 * Deeper sales analytics for Ventra Copilot (trends, hero SKUs, slow movers).
 */
export async function getMerchantAnalytics(
  businessId: string,
  branchId: string | null | undefined,
  query: MerchantAnalyticsQuery,
): Promise<unknown> {
  switch (query) {
    case "all_time_top_products":
      return { topProducts: await fetchAllTimeTopProducts(businessId, branchId) };
    case "daily_revenue_trend_90d":
      return { daily: await fetchDailyRevenueTrend90d(businessId, branchId) };
    case "best_store_sales_days":
      return { bestDays: await fetchBestStoreSalesDays(businessId, branchId) };
    case "slow_moving_products":
      return { slowMovers: await fetchSlowMovingProducts(businessId, branchId) };
    case "top_product_peak_day":
      return { peak: await fetchTopProductPeakDay(businessId, branchId) };
    default:
      return { error: "unknown query" };
  }
}

async function fetchAllTimeTopProducts(
  businessId: string,
  branchId: string | null | undefined,
): Promise<AllTimeTopProduct[]> {
  const rows = await db
    .select({
      productId: saleItems.productId,
      name: saleItems.productName,
      revenue: sql<string>`COALESCE(SUM(${saleItems.lineTotalGhs}::numeric), 0)`,
      units: sql<number>`COALESCE(SUM(${saleItems.quantity})::int, 0)`,
    })
    .from(saleItems)
    .innerJoin(sales, eq(saleItems.saleId, sales.id))
    .where(
      and(
        eq(sales.businessId, businessId),
        branchFilter(branchId),
        eq(sales.status, "completed"),
      ),
    )
    .groupBy(saleItems.productId, saleItems.productName)
    .orderBy(desc(sql`SUM(${saleItems.lineTotalGhs}::numeric)`))
    .limit(15);

  return rows.map((r) => ({
    productId: r.productId,
    name: r.name,
    totalRevenueGhs: Number(r.revenue),
    unitsSold: r.units,
  }));
}

async function fetchDailyRevenueTrend90d(
  businessId: string,
  branchId: string | null | undefined,
): Promise<DailyRevenueRow[]> {
  const start = new Date();
  start.setDate(start.getDate() - 90);

  const rows = await db
    .select({
      dateKey: dayKeySql,
      revenue: sql<string>`COALESCE(SUM(${sales.totalGhs}::numeric), 0)`,
    })
    .from(sales)
    .where(
      and(
        eq(sales.businessId, businessId),
        branchFilter(branchId),
        gte(sales.createdAt, start),
        eq(sales.status, "completed"),
      ),
    )
    .groupBy(dayKeySql)
    .orderBy(dayKeySql);

  return rows.map((r) => ({
    date: r.dateKey,
    revenueGhs: Number(r.revenue),
  }));
}

/** Top calendar days by total store revenue (all-time, capped at 20 rows). */
async function fetchBestStoreSalesDays(
  businessId: string,
  branchId: string | null | undefined,
): Promise<BestDayRow[]> {
  const rows = await db
    .select({
      dateKey: dayKeySql,
      revenue: sql<string>`COALESCE(SUM(${sales.totalGhs}::numeric), 0)`,
    })
    .from(sales)
    .where(
      and(
        eq(sales.businessId, businessId),
        branchFilter(branchId),
        eq(sales.status, "completed"),
      ),
    )
    .groupBy(dayKeySql)
    .orderBy(desc(sql`SUM(${sales.totalGhs}::numeric)`))
    .limit(20);

  return rows.map((r) => ({
    date: r.dateKey,
    revenueGhs: Number(r.revenue),
  }));
}

async function fetchSlowMovingProducts(
  businessId: string,
  branchId: string | null | undefined,
): Promise<SlowMoverRow[]> {
  const sixtyAgo = new Date();
  sixtyAgo.setDate(sixtyAgo.getDate() - 60);

  const revenueRows = await db
    .select({
      productId: saleItems.productId,
      revenue: sql<string>`COALESCE(SUM(${saleItems.lineTotalGhs}::numeric), 0)`,
    })
    .from(saleItems)
    .innerJoin(sales, eq(saleItems.saleId, sales.id))
    .where(
      and(
        eq(sales.businessId, businessId),
        branchFilter(branchId),
        gte(sales.createdAt, sixtyAgo),
        eq(sales.status, "completed"),
      ),
    )
    .groupBy(saleItems.productId);

  const revByProduct = new Map<string, number>();
  for (const r of revenueRows) {
    if (r.productId) {
      revByProduct.set(r.productId, Number(r.revenue));
    }
  }

  const prods = await db
    .select({
      id: products.id,
      name: products.name,
      stock: products.stock,
    })
    .from(products)
    .where(
      and(
        eq(products.businessId, businessId),
        eq(products.status, "active"),
        sql`${products.stock} > 0`,
      ),
    );

  const merged = prods.map((p) => ({
    productId: p.id,
    name: p.name,
    stock: Number(p.stock),
    revenueLast60DaysGhs: revByProduct.get(p.id) ?? 0,
  }));

  merged.sort((a, b) => a.revenueLast60DaysGhs - b.revenueLast60DaysGhs);
  return merged.slice(0, 15);
}

const dayKeyForItemsSql = sql<string>`TO_CHAR(${sales.createdAt} AT TIME ZONE 'Africa/Accra', 'YYYY-MM-DD')`;

/** For the top all-time product by revenue, find the single best calendar day (Accra). */
async function fetchTopProductPeakDay(
  businessId: string,
  branchId: string | null | undefined,
): Promise<TopProductPeakDay | null> {
  const top = await db
    .select({
      productId: saleItems.productId,
      name: saleItems.productName,
      revenue: sql<string>`COALESCE(SUM(${saleItems.lineTotalGhs}::numeric), 0)`,
    })
    .from(saleItems)
    .innerJoin(sales, eq(saleItems.saleId, sales.id))
    .where(
      and(
        eq(sales.businessId, businessId),
        branchFilter(branchId),
        eq(sales.status, "completed"),
      ),
    )
    .groupBy(saleItems.productId, saleItems.productName)
    .orderBy(desc(sql`SUM(${saleItems.lineTotalGhs}::numeric)`))
    .limit(1);

  const head = top[0];
  if (!head) return null;

  const productPredicate = head.productId
    ? eq(saleItems.productId, head.productId)
    : eq(saleItems.productName, head.name);

  const dayRows = await db
    .select({
      dateKey: dayKeyForItemsSql,
      revenue: sql<string>`COALESCE(SUM(${saleItems.lineTotalGhs}::numeric), 0)`,
    })
    .from(saleItems)
    .innerJoin(sales, eq(saleItems.saleId, sales.id))
    .where(
      and(
        eq(sales.businessId, businessId),
        branchFilter(branchId),
        eq(sales.status, "completed"),
        productPredicate,
      ),
    )
    .groupBy(dayKeyForItemsSql)
    .orderBy(desc(sql`SUM(${saleItems.lineTotalGhs}::numeric)`))
    .limit(1);

  const d = dayRows[0];
  if (!d) return null;

  return {
    productId: head.productId,
    productName: head.name,
    bestDate: d.dateKey,
    revenueGhsOnThatDay: Number(d.revenue),
  };
}
