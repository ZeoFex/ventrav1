import { eq, sql, and, gte, lte, desc, inArray } from "drizzle-orm";
import { db } from "../db";
import { products, categories, productVariations } from "../db/schema/products";
import { sales, saleItems, salePaymentLines, REVENUE_SALE_STATUSES } from "../db/schema/sales";
import { customers } from "../db/schema/customers";
import { customerAccountEntries } from "../db/schema/customer-account-entries";
import { notifications } from "../db/schema/notifications";
import { redis } from "../lib/redis";
import { invalidateCustomerCaches } from "../customers/customer-account-service";
import { sellableUnits } from "../stock/sellable-stock";
import { countReadyForPickupOrders } from "../customer-orders/customer-order-service";
import { getExpiringInventory } from "../inventory/expiring-service";
import {
    accraDateKey,
    accraDayBounds,
    enumerateAccraDateKeys,
    previousSalesOverviewPeriod,
    resolveSalesOverviewPeriod,
    type SalesOverviewPeriod,
} from "../reports/product-analytics-service";
import {
    buildSalesInsights,
    pctChange,
} from "../reports/reports-dashboard-service";

export type SalesSummaryReportOptions = {
    periodDays?: number;
    fromKey?: string;
    toKey?: string;
};

function formatSalesSummaryPeriodLabel(fromKey: string, toKey: string, dayCount: number): string {
    const fmt = (key: string) =>
        new Date(`${key}T12:00:00.000Z`).toLocaleDateString("en-GH", {
            month: "short",
            day: "numeric",
            year: "numeric",
            timeZone: "Africa/Accra",
        });
    if (fromKey === toKey) return fmt(fromKey);
    return `${fmt(fromKey)} – ${fmt(toKey)} (${dayCount} day${dayCount === 1 ? "" : "s"})`;
}

function resolveSalesSummaryPeriod(options?: SalesSummaryReportOptions) {
    if (options?.fromKey && options?.toKey) {
        return resolveSalesOverviewPeriod(options.fromKey, options.toKey);
    }
    const days = options?.periodDays ?? 30;
    const toKey = accraDateKey();
    const fromDate = new Date(`${toKey}T12:00:00.000Z`);
    fromDate.setUTCDate(fromDate.getUTCDate() - (days - 1));
    return resolveSalesOverviewPeriod(fromDate.toISOString().slice(0, 10), toKey);
}

const CACHE_KEYS = {
    PRODUCTS_LIST: (bizId: string, brn?: string | null) => `products:biz_${bizId}:brn_${brn || 'all'}:list`,
    SALES_OVERVIEW: (bizId: string, brn?: string | null, from?: string, to?: string) =>
        `sales:biz_${bizId}:brn_${brn || 'all'}:overview:${from || 'default'}:${to || 'default'}`,
    DASHBOARD_HOME: (bizId: string, brn?: string | null) => `dashboard:biz_${bizId}:brn_${brn || 'all'}:home`,
};

/** Shared with return flow — invalidates product list, sales overview, and dashboard home caches. */
export async function invalidatePosBusinessCaches(businessId: string, branchId?: string | null) {
    await Promise.all([
        redis.del(CACHE_KEYS.PRODUCTS_LIST(businessId, branchId)),
        redis.del(CACHE_KEYS.SALES_OVERVIEW(businessId, branchId)),
        redis.del(CACHE_KEYS.DASHBOARD_HOME(businessId, branchId)),
        redis.del(CACHE_KEYS.PRODUCTS_LIST(businessId)),
        redis.del(CACHE_KEYS.SALES_OVERVIEW(businessId)),
        redis.del(CACHE_KEYS.DASHBOARD_HOME(businessId)),
    ]);
}

/** Returns an eq() filter for branchId when set, or undefined (skipped by `and()`). */
function branchFilter(branchId?: string | null) {
    return branchId ? eq(sales.branchId, branchId) : undefined;
}

export interface CheckoutLine {
    productId: string;
    variationId?: string | null;
    quantity: number;
    productName: string;
    unitPriceGhs: number;
    lineTotalGhs: number;
}

export interface CheckoutPaymentLine {
    paymentMethod: string;
    amountGhs: number;
}

export interface CheckoutInput {
    lines: CheckoutLine[];
    invoiceId: string;
    subtotalGhs: number;
    taxGhs: number;
    discountGhs: number;
    totalGhs: number;
    /** Legacy / primary label; ignored when paymentLines is provided. */
    paymentMethod: string;
    /** When set, amounts are what was tendered per method (may exceed total; excess is change). */
    paymentLines?: CheckoutPaymentLine[];
    customerId?: string | null;
}

function roundMoney(n: number): number {
    return Math.round(n * 100) / 100;
}

/**
 * Completes a POS checkout:
 * 1. Deducts stock for all items
 * 2. Records the sale + line items + payment lines (split tender)
 * 3. Optional: posts customer balance (credit) when amount paid &lt; total
 * All in a single atomic transaction.
 */
export async function completeCheckout(businessId: string, input: CheckoutInput, branchId?: string | null, userId?: string | null) {
    const normalizedLines =
        input.paymentLines && input.paymentLines.length > 0
            ? input.paymentLines.map((l) => ({
                  paymentMethod: l.paymentMethod.trim(),
                  amountGhs: roundMoney(Number(l.amountGhs)),
              }))
            : [
                  {
                      paymentMethod: input.paymentMethod.trim(),
                      amountGhs: roundMoney(Number(input.totalGhs)),
                  },
              ];

    for (const pl of normalizedLines) {
        if (!pl.paymentMethod || pl.paymentMethod.length > 30) {
            throw new Error("Invalid payment method");
        }
        if (!Number.isFinite(pl.amountGhs) || pl.amountGhs <= 0) {
            throw new Error("Each payment amount must be positive");
        }
    }

    const amountCollected = roundMoney(
        normalizedLines.reduce((s, l) => s + l.amountGhs, 0),
    );
    const totalDue = roundMoney(Number(input.totalGhs));

    /** Amount that settles this invoice (tender may be higher — difference is change). */
    const amountAppliedToInvoice = roundMoney(Math.min(amountCollected, totalDue));
    const balanceDue = roundMoney(Math.max(0, totalDue - amountCollected));

    if (balanceDue > 0.02 && !input.customerId) {
        throw new Error("Select a customer for partial / credit payment");
    }

    const paymentMethodSummary =
        normalizedLines.length > 1 ? "split" : normalizedLines[0].paymentMethod;

    const result = await db.transaction(async (tx) => {
        // 1. Deduct stock (must not exceed sellable = stock − reserved)
        for (const line of input.lines) {
            if (line.quantity <= 0) continue;

            if (line.variationId) {
                const [vr] = await tx
                    .select({
                        stock: productVariations.stock,
                        stockReserved: productVariations.stockReserved,
                    })
                    .from(productVariations)
                    .where(eq(productVariations.id, line.variationId))
                    .limit(1);
                if (!vr) {
                    throw new Error("Invalid product variation");
                }
                const avail = sellableUnits(
                    Number(vr.stock),
                    Number(vr.stockReserved ?? 0),
                );
                if (avail < line.quantity) {
                    throw new Error(
                        `Insufficient available stock for ${line.productName}`,
                    );
                }
                await tx
                    .update(productVariations)
                    .set({
                        stock: sql`${productVariations.stock} - ${line.quantity}`,
                        updatedAt: new Date(),
                    })
                    .where(eq(productVariations.id, line.variationId));
            } else {
                const [pr] = await tx
                    .select({
                        stock: products.stock,
                        stockReserved: products.stockReserved,
                    })
                    .from(products)
                    .where(
                        and(
                            eq(products.id, line.productId),
                            eq(products.businessId, businessId),
                        ),
                    )
                    .limit(1);
                if (!pr) {
                    throw new Error("Product not found");
                }
                const avail = sellableUnits(
                    Number(pr.stock),
                    Number(pr.stockReserved ?? 0),
                );
                if (avail < line.quantity) {
                    throw new Error(
                        `Insufficient available stock for ${line.productName}`,
                    );
                }
                await tx
                    .update(products)
                    .set({
                        stock: sql`${products.stock} - ${line.quantity}`,
                        updatedAt: new Date(),
                    })
                    .where(
                        and(
                            eq(products.id, line.productId),
                            eq(products.businessId, businessId),
                        ),
                    );
            }
        }

        const [sale] = await tx
            .insert(sales)
            .values({
                businessId,
                branchId: branchId ?? null,
                userId: userId ?? null,
                invoiceId: input.invoiceId,
                subtotalGhs: String(input.subtotalGhs),
                taxGhs: String(input.taxGhs),
                discountGhs: String(input.discountGhs),
                totalGhs: String(input.totalGhs),
                paymentMethod: paymentMethodSummary,
                amountPaidGhs: String(amountAppliedToInvoice),
                balanceDueGhs: String(balanceDue),
                itemCount: input.lines.reduce((s, l) => s + l.quantity, 0),
                customerId: input.customerId ?? null,
            })
            .returning({ id: sales.id });

        await tx.insert(saleItems).values(
            input.lines.map((l) => ({
                saleId: sale.id,
                productId: l.productId,
                variationId: l.variationId || null,
                productName: l.productName,
                quantity: l.quantity,
                unitPriceGhs: String(l.unitPriceGhs),
                lineTotalGhs: String(l.lineTotalGhs),
            })),
        );

        await tx.insert(salePaymentLines).values(
            normalizedLines.map((l, i) => ({
                saleId: sale.id,
                paymentMethod: l.paymentMethod,
                amountGhs: String(l.amountGhs),
                sortOrder: i,
            })),
        );

        if (balanceDue > 0.02 && input.customerId) {
            await tx
                .update(customers)
                .set({
                    accountsReceivableGhs: sql`${customers.accountsReceivableGhs}::numeric + ${String(balanceDue)}`,
                    updatedAt: new Date(),
                })
                .where(
                    and(
                        eq(customers.id, input.customerId),
                        eq(customers.businessId, businessId),
                    ),
                );

            await tx.insert(customerAccountEntries).values({
                businessId,
                branchId: branchId ?? null,
                customerId: input.customerId,
                saleId: sale.id,
                kind: "sale_charge",
                amountGhs: String(balanceDue),
                note: `Balance from invoice ${input.invoiceId}`,
            });
        }

        const notifyBody =
            balanceDue > 0.02
                ? `Sale ${input.invoiceId} — GHS ${totalDue} (paid GHS ${amountAppliedToInvoice}, balance GHS ${balanceDue}).`
                : `Sale ${input.invoiceId} for GHS ${input.totalGhs} has been recorded.`;

        await tx.insert(notifications).values({
            businessId,
            branchId: branchId ?? null,
            title: "New Sale Completed",
            body: notifyBody,
            icon: "receipt",
        });

        return { saleId: sale.id };
    });

    await invalidatePosBusinessCaches(businessId, branchId);
    if (input.customerId) {
        await invalidateCustomerCaches(businessId, input.customerId);
    }

    return result;
}

/**
 * Fetch sales overview analytics for the dashboard.
 * Computes metrics, daily revenue, and top products from real data.
 */
export async function getSalesOverview(
    businessId: string,
    branchId?: string | null,
    opts?: { fromKey?: string | null; toKey?: string | null },
) {
    let period: SalesOverviewPeriod;
    try {
        period = resolveSalesOverviewPeriod(opts?.fromKey, opts?.toKey);
    } catch {
        period = resolveSalesOverviewPeriod();
    }
    const prevPeriod = previousSalesOverviewPeriod(period);

    const cacheKey = CACHE_KEYS.SALES_OVERVIEW(
        businessId,
        branchId,
        period.fromKey,
        period.toKey,
    );
    const cached = await redis.get(cacheKey);
    if (cached) {
        try { return JSON.parse(cached); } catch { /* fall through */ }
    }

    const periodFilter = and(
        eq(sales.businessId, businessId),
        branchFilter(branchId),
        gte(sales.createdAt, period.start),
        lte(sales.createdAt, period.end),
        inArray(sales.status, REVENUE_SALE_STATUSES),
    );

    const prevPeriodFilter = and(
        eq(sales.businessId, businessId),
        branchFilter(branchId),
        gte(sales.createdAt, prevPeriod.start),
        lte(sales.createdAt, prevPeriod.end),
        inArray(sales.status, REVENUE_SALE_STATUSES),
    );

    // Fetch all analytics data in parallel for "instant" speed
    const [
        [currentMetrics],
        [prevMetrics],
        dailyRevenue,
        topProducts
    ] = await Promise.all([
        // 1. Current period metrics
        db.select({
            totalRevenue: sql<string>`COALESCE(SUM(${sales.totalGhs}::numeric), 0)`,
            totalTransactions: sql<number>`COUNT(*)::int`,
            avgOrderValue: sql<string>`COALESCE(AVG(${sales.totalGhs}::numeric), 0)`,
        })
            .from(sales)
            .where(periodFilter),

        // 2. Previous period metrics (for trend)
        db.select({
            totalRevenue: sql<string>`COALESCE(SUM(${sales.totalGhs}::numeric), 0)`,
            totalTransactions: sql<number>`COUNT(*)::int`,
            avgOrderValue: sql<string>`COALESCE(AVG(${sales.totalGhs}::numeric), 0)`,
        })
            .from(sales)
            .where(prevPeriodFilter),

        // 3. Daily revenue for chart (selected range, Accra calendar days)
        db.select({
            dateKey: sql<string>`TO_CHAR(${sales.createdAt} AT TIME ZONE 'Africa/Accra', 'YYYY-MM-DD')`,
            revenue: sql<string>`COALESCE(SUM(${sales.totalGhs}::numeric), 0)`,
            transactions: sql<number>`COUNT(*)::int`,
        })
            .from(sales)
            .where(periodFilter)
            .groupBy(sql`TO_CHAR(${sales.createdAt} AT TIME ZONE 'Africa/Accra', 'YYYY-MM-DD')`)
            .orderBy(sql`TO_CHAR(${sales.createdAt} AT TIME ZONE 'Africa/Accra', 'YYYY-MM-DD')`),

        // 4. Top selling products — join products for image
        db.select({
            productId: saleItems.productId,
            productName: saleItems.productName,
            unitsSold: sql<number>`SUM((${saleItems.quantity} - ${saleItems.quantityReturned})::int)`,
            revenue: sql<string>`SUM(${saleItems.lineTotalGhs}::numeric)`,
            imageSrc: products.imageSrc,
        })
            .from(saleItems)
            .innerJoin(sales, eq(saleItems.saleId, sales.id))
            .leftJoin(products, eq(saleItems.productId, products.id))
            .where(periodFilter)
            .groupBy(saleItems.productId, saleItems.productName, products.imageSrc)
            .orderBy(desc(sql`SUM(${saleItems.lineTotalGhs}::numeric)`))
            .limit(5)
    ]);

    function trend(current: number, previous: number): number {
        if (previous === 0) return current > 0 ? 100 : 0;
        return Math.round(((current - previous) / previous) * 1000) / 10;
    }

    const curRev = Number(currentMetrics.totalRevenue);
    const prevRev = Number(prevMetrics.totalRevenue);
    const curTrans = currentMetrics.totalTransactions;
    const prevTrans = prevMetrics.totalTransactions;
    const curAov = Number(currentMetrics.avgOrderValue);
    const prevAov = Number(prevMetrics.avgOrderValue);

    const dailyByKey = new Map(
        dailyRevenue.map((d) => [
            d.dateKey,
            { revenue: Number(d.revenue), transactions: d.transactions },
        ]),
    );

    const dayFormatter = new Intl.DateTimeFormat("en-GH", {
        timeZone: "Africa/Accra",
        weekday: "short",
        month: "short",
        day: "numeric",
    });

    const allDayKeys = enumerateAccraDateKeys(period.fromKey, period.toKey);
    const dailyBreakdown = allDayKeys.map((dateKey) => {
        const row = dailyByKey.get(dateKey);
        const labelDate = new Date(`${dateKey}T12:00:00.000Z`);
        return {
            dateKey,
            date: dayFormatter.format(labelDate),
            revenue: row?.revenue ?? 0,
            transactions: row?.transactions ?? 0,
        };
    });

    const trendLabel =
        period.dayCount === 7 && period.toKey === accraDateKey()
            ? "vs previous 7 days"
            : `vs previous ${period.dayCount} days`;

    const overview = {
        period: {
            from: period.fromKey,
            to: period.toKey,
            dayCount: period.dayCount,
        },
        metrics: [
            { label: "Total Revenue", value: curRev, trend: trend(curRev, prevRev), timeframe: trendLabel },
            { label: "Total Transactions", value: curTrans, trend: trend(curTrans, prevTrans), timeframe: trendLabel },
            { label: "Average Order Value", value: curAov, trend: trend(curAov, prevAov), timeframe: trendLabel },
        ],
        chartData: dailyBreakdown.map((d) => ({
            date: d.date,
            dateKey: d.dateKey,
            revenue: d.revenue,
        })),
        dailyBreakdown,
        topProducts: topProducts.map((p) => ({
            id: p.productId,
            name: p.productName,
            unitsSold: p.unitsSold,
            revenue: Number(p.revenue),
            imageSrc: p.imageSrc || null,
        })),
    };

    await redis.setex(cacheKey, 30, JSON.stringify(overview));
    return overview;
}

const QUICK_SALE_LIMIT = 20;
const QUICK_SALE_PERIOD_DAYS = 30;
const HOME_EXPIRY_ALERT_DAYS = 14;

/**
 * Top product IDs by net units sold in the last 30 days (branch-scoped when set).
 */
async function getTopSellingProductIds(
    businessId: string,
    branchId?: string | null,
    limit = QUICK_SALE_LIMIT,
): Promise<{ productId: string; qtySold: number }[]> {
    const periodStart = new Date(Date.now() - QUICK_SALE_PERIOD_DAYS * 24 * 60 * 60 * 1000);
    const sellableQty = sql<number>`(${saleItems.quantity} - ${saleItems.quantityReturned})::int`;

    const filters = [
        eq(sales.businessId, businessId),
        inArray(sales.status, REVENUE_SALE_STATUSES),
        gte(sales.createdAt, periodStart),
        branchFilter(branchId),
    ].filter(Boolean);

    const rows = await db
        .select({
            productId: saleItems.productId,
            qtySold: sql<number>`COALESCE(SUM(${sellableQty}), 0)::int`,
        })
        .from(saleItems)
        .innerJoin(sales, eq(saleItems.saleId, sales.id))
        .where(and(...filters))
        .groupBy(saleItems.productId)
        .having(sql`COALESCE(SUM(${sellableQty}), 0) > 0`)
        .orderBy(desc(sql`COALESCE(SUM(${sellableQty}), 0)`))
        .limit(limit);

    return rows.flatMap((r) =>
        r.productId != null ? [{ productId: r.productId, qtySold: Number(r.qtySold) }] : [],
    );
}

function productHasSellableStock(p: {
    stock?: number;
    stockAvailable?: number;
    variations?: { stock: number; stockAvailable?: number }[];
}): boolean {
    if ((p.stockAvailable ?? p.stock ?? 0) > 0) return true;
    return Boolean(p.variations?.some((v) => (v.stockAvailable ?? v.stock) > 0));
}

/** Active in-stock products ordered by recent sales volume, with catalog fallback. */
async function resolveQuickSaleProducts(businessId: string, branchId?: string | null) {
    const { getProducts } = await import("../products/product-service");
    const catalog = (await getProducts(businessId, branchId)) as Array<{
        id: string;
        name: string;
        status: string;
        stock?: number;
        stockAvailable?: number;
        variations?: { stock: number; stockAvailable?: number }[];
    }>;

    const activeInStock = catalog.filter(
        (p) => p.status === "active" && productHasSellableStock(p),
    );

    const topIds = await getTopSellingProductIds(businessId, branchId);
    const rankById = new Map(topIds.map((t, i) => [t.productId, i]));

    const ranked = activeInStock
        .filter((p) => rankById.has(p.id))
        .sort((a, b) => (rankById.get(a.id) ?? 999) - (rankById.get(b.id) ?? 999));

    if (ranked.length >= 6) {
        return ranked.slice(0, QUICK_SALE_LIMIT);
    }

    const rankedIds = new Set(ranked.map((p) => p.id));
    const fillers = activeInStock
        .filter((p) => !rankedIds.has(p.id))
        .sort((a, b) => a.name.localeCompare(b.name));

    return [...ranked, ...fillers].slice(0, QUICK_SALE_LIMIT);
}

/**
 * Fetch data for the dashboard home landing page:
 * - Today's total sales and transaction count
 * - Comparison with yesterday
 * - 10 most recent transactions
 * - Quick-sale carousel products (best sellers, last 30 days)
 */
export async function getDashboardHomeData(businessId: string, branchId?: string | null) {
    const cacheKey = CACHE_KEYS.DASHBOARD_HOME(businessId, branchId);
    const cached = await redis.get(cacheKey);
    if (cached) {
        try { return JSON.parse(cached); } catch { /* fall through */ }
    }

    // Define time ranges in Africa/Accra (UTC+0)
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);

    // Fetch in parallel
    const [
        [todayTotals],
        [yesterdayTotals],
        recentSales,
        quickSaleProducts,
        readyForPickupCount,
        expiringLines,
    ] = await Promise.all([
        // 1. Today's stats
        db.select({
            totalRevenue: sql<string>`COALESCE(SUM(${sales.totalGhs}::numeric), 0)`,
            totalTransactions: sql<number>`COUNT(*)::int`,
        })
            .from(sales)
            .where(and(
                eq(sales.businessId, businessId),
                branchFilter(branchId),
                gte(sales.createdAt, todayStart),
                inArray(sales.status, REVENUE_SALE_STATUSES),
            )),

        // 2. Yesterday's stats (for trend)
        db.select({
            totalRevenue: sql<string>`COALESCE(SUM(${sales.totalGhs}::numeric), 0)`,
        })
            .from(sales)
            .where(and(
                eq(sales.businessId, businessId),
                branchFilter(branchId),
                gte(sales.createdAt, yesterdayStart),
                lte(sales.createdAt, todayStart),
                inArray(sales.status, REVENUE_SALE_STATUSES),
            )),

        // 3. Recent activity (last 10)
        db.select({
            id: sales.id,
            invoiceId: sales.invoiceId,
            totalGhs: sales.totalGhs,
            createdAt: sales.createdAt,
        })
            .from(sales)
            .where(and(eq(sales.businessId, businessId), branchFilter(branchId)))
            .orderBy(desc(sales.createdAt))
            .limit(10),

        // 4. Quick-sale carousel (best sellers in last 30 days)
        resolveQuickSaleProducts(businessId, branchId),

        // 5. Layaway orders awaiting pickup
        countReadyForPickupOrders(businessId, branchId),

        // 6. Supply lines nearing expiry
        getExpiringInventory(businessId, HOME_EXPIRY_ALERT_DAYS, branchId),
    ]);

    const todayRev = Number(todayTotals.totalRevenue);
    const yesterdayRev = Number(yesterdayTotals.totalRevenue);
    const vsYesterdayDiffGhs = todayRev - yesterdayRev;

    let vsYesterdayPercent = 0;
    if (yesterdayRev > 0) {
        vsYesterdayPercent = Math.round(((todayRev - yesterdayRev) / yesterdayRev) * 100);
    } else if (todayRev > 0) {
        vsYesterdayPercent = 100;
    }

    const expiringProductCount = new Set(
        expiringLines.map((line) => line.productId ?? line.productName),
    ).size;

    const homeData = {
        todaySalesGhs: todayRev,
        yesterdaySalesGhs: yesterdayRev,
        transactionCount: todayTotals.totalTransactions,
        vsYesterdayDiffGhs,
        vsYesterdayPercent,
        recentSales: recentSales.map(s => ({
            id: s.id,
            invoiceId: s.invoiceId,
            totalGhs: Number(s.totalGhs),
            createdAt: s.createdAt,
        })),
        quickSaleProducts,
        readyForPickupCount,
        expiringAlert:
            expiringLines.length > 0
                ? {
                      lineCount: expiringLines.length,
                      productCount: expiringProductCount,
                      days: HOME_EXPIRY_ALERT_DAYS,
                  }
                : null,
    };

    await redis.setex(cacheKey, 30, JSON.stringify(homeData));
    return homeData;
}

/**
 * Fetch detailed metrics strictly for the Revenue detail page.
 * Correlates real channels, expected takings, and creates quick dynamic insights.
 */
export async function getRevenueDetails(businessId: string, periodDays: number = 7, branchId?: string | null) {
    const cacheKey = `sales:biz_${businessId}:brn_${branchId || 'all'}:revenue-details:${periodDays}d`;
    const cached = await redis.get(cacheKey);
    if (cached) {
        try { return JSON.parse(cached); } catch { /* fall through */ }
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const periodStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);
    const prevPeriodStart = new Date(now.getTime() - periodDays * 2 * 24 * 60 * 60 * 1000);

    const [
        [todayTotals],
        paymentChannels,
        [currentPeriod],
        [prevPeriod]
    ] = await Promise.all([
        db.select({
            totalRevenue: sql<string>`COALESCE(SUM(${sales.totalGhs}::numeric), 0)`,
        })
            .from(sales)
            .where(and(
                eq(sales.businessId, businessId),
                branchFilter(branchId),
                gte(sales.createdAt, todayStart),
                inArray(sales.status, REVENUE_SALE_STATUSES)
            )),

        db.select({
            paymentMethod: sales.paymentMethod,
            total: sql<string>`COALESCE(SUM(${sales.totalGhs}::numeric), 0)`,
        })
            .from(sales)
            .where(and(
                eq(sales.businessId, businessId),
                branchFilter(branchId),
                gte(sales.createdAt, periodStart),
                inArray(sales.status, REVENUE_SALE_STATUSES)
            ))
            .groupBy(sales.paymentMethod),

        db.select({
            totalRevenue: sql<string>`COALESCE(SUM(${sales.totalGhs}::numeric), 0)`,
        })
            .from(sales)
            .where(and(
                eq(sales.businessId, businessId),
                branchFilter(branchId),
                gte(sales.createdAt, periodStart),
                inArray(sales.status, REVENUE_SALE_STATUSES)
            )),

        db.select({
            totalRevenue: sql<string>`COALESCE(SUM(${sales.totalGhs}::numeric), 0)`,
        })
            .from(sales)
            .where(and(
                eq(sales.businessId, businessId),
                branchFilter(branchId),
                gte(sales.createdAt, prevPeriodStart),
                lte(sales.createdAt, periodStart),
                inArray(sales.status, REVENUE_SALE_STATUSES)
            )),
    ]);

    const todayRev = Number(todayTotals?.totalRevenue || 0);
    const totalSelectedTime = paymentChannels.reduce((sum, c) => sum + Number(c.total), 0) || 1;

    const channelMapping: Record<string, string> = {
        "cash": "In-store POS (Cash)",
        "mtn_momo": "Mobile Money",
        "vodafone_cash": "Mobile Money",
        "atmoney": "Mobile Money",
        "card": "Card Payment",
    };

    const channels = paymentChannels.map(c => ({
        label: channelMapping[c.paymentMethod] || c.paymentMethod,
        value: Number(c.total),
        percent: Math.round((Number(c.total) / totalSelectedTime) * 100)
    }));

    const groupedChannelsMap = new Map<string, { label: string, value: number, percent: number }>();
    channels.forEach(ch => {
        if (!groupedChannelsMap.has(ch.label)) {
            groupedChannelsMap.set(ch.label, { ...ch });
        } else {
            const existing = groupedChannelsMap.get(ch.label)!;
            existing.value += ch.value;
            existing.percent += ch.percent;
        }
    });

    const cp = Number(currentPeriod?.totalRevenue || 0);
    const pp = Number(prevPeriod?.totalRevenue || 0);
    const growthPercent = pp === 0 ? (cp > 0 ? 100 : 0) : Math.round(((cp - pp) / pp) * 100);

    const details = {
        expectedToday: todayRev,
        collectedToday: todayRev,
        receivables: 0,
        channels: Array.from(groupedChannelsMap.values()).sort((a, b) => b.value - a.value),
        insights: {
            growthPercent,
            trendText: `Revenue is ${growthPercent >= 0 ? 'up' : 'down'} ${Math.abs(growthPercent)}% compared to the previous ${periodDays} days.`,
            momoDominance: groupedChannelsMap.get("Mobile Money")?.percent || 0
        }
    };

    await redis.setex(cacheKey, 30, JSON.stringify(details));
    return details;
}

/**
 * Fetch detailed metrics for the Sales Summary Report
 */
export async function getSalesSummaryReport(
    businessId: string,
    branchId?: string | null,
    options?: SalesSummaryReportOptions,
) {
    const period = resolveSalesSummaryPeriod(options);
    const prevPeriod = previousSalesOverviewPeriod(period);
    const todayKey = accraDateKey();
    const includesToday = period.toKey === todayKey;

    const cacheKey = `sales:biz_${businessId}:brn_${branchId || "all"}:summary:${period.fromKey}:${period.toKey}`;
    const cached = await redis.get(cacheKey);
    if (cached) {
        try { return JSON.parse(cached); } catch { /* fall through */ }
    }

    const baseFilter = [
        eq(sales.businessId, businessId),
        branchFilter(branchId),
        inArray(sales.status, REVENUE_SALE_STATUSES),
    ].filter(Boolean);

    const periodFilter = and(
        ...baseFilter,
        gte(sales.createdAt, period.start),
        lte(sales.createdAt, period.end),
    );
    const prevPeriodFilter = and(
        ...baseFilter,
        gte(sales.createdAt, prevPeriod.start),
        lte(sales.createdAt, prevPeriod.end),
    );

    const todayBounds = accraDayBounds(todayKey);
    const hourlyPromise = includesToday
        ? db
              .select({
                  hour: sql<string>`TO_CHAR(${sales.createdAt} AT TIME ZONE 'Africa/Accra', 'HH24:00')`,
                  sales: sql<number>`COALESCE(SUM(${sales.totalGhs}::numeric), 0)`,
                  transactions: sql<number>`COUNT(*)::int`,
              })
              .from(sales)
              .where(
                  and(
                      ...baseFilter,
                      gte(sales.createdAt, todayBounds.start),
                      lte(sales.createdAt, todayBounds.end),
                  ),
              )
              .groupBy(sql`TO_CHAR(${sales.createdAt} AT TIME ZONE 'Africa/Accra', 'HH24:00')`)
              .orderBy(sql`TO_CHAR(${sales.createdAt} AT TIME ZONE 'Africa/Accra', 'HH24:00')`)
        : Promise.resolve([] as { hour: string; sales: number; transactions: number }[]);

    const [
        [kpis],
        [prevKpis],
        trendQuery,
        dailyQuery,
        paymentQuery,
        topItemsQuery,
        categoryPerformanceQuery,
        [cogsQueryResult],
        [prevCogsResult],
    ] = await Promise.all([
        db.select({
            grossSales: sql<number>`COALESCE(SUM(${sales.subtotalGhs}::numeric), 0)`,
            discounts: sql<number>`COALESCE(SUM(${sales.discountGhs}::numeric), 0)`,
            netSales: sql<number>`COALESCE(SUM(${sales.totalGhs}::numeric), 0)`,
            transactionCount: sql<number>`COUNT(*)::int`,
            avgOrderValue: sql<number>`COALESCE(AVG(${sales.totalGhs}::numeric), 0)`,
        })
            .from(sales)
            .where(periodFilter),

        db.select({
            grossSales: sql<number>`COALESCE(SUM(${sales.subtotalGhs}::numeric), 0)`,
            discounts: sql<number>`COALESCE(SUM(${sales.discountGhs}::numeric), 0)`,
            netSales: sql<number>`COALESCE(SUM(${sales.totalGhs}::numeric), 0)`,
            transactionCount: sql<number>`COUNT(*)::int`,
            avgOrderValue: sql<number>`COALESCE(AVG(${sales.totalGhs}::numeric), 0)`,
        })
            .from(sales)
            .where(prevPeriodFilter),

        hourlyPromise,

        db.select({
            dateKey: sql<string>`TO_CHAR(${sales.createdAt} AT TIME ZONE 'Africa/Accra', 'YYYY-MM-DD')`,
            sales: sql<number>`COALESCE(SUM(${sales.totalGhs}::numeric), 0)`,
            transactions: sql<number>`COUNT(*)::int`,
            discounts: sql<number>`COALESCE(SUM(${sales.discountGhs}::numeric), 0)`,
        })
            .from(sales)
            .where(periodFilter)
            .groupBy(sql`TO_CHAR(${sales.createdAt} AT TIME ZONE 'Africa/Accra', 'YYYY-MM-DD')`)
            .orderBy(sql`TO_CHAR(${sales.createdAt} AT TIME ZONE 'Africa/Accra', 'YYYY-MM-DD')`),

        db.select({
            method: sales.paymentMethod,
            revenue: sql<number>`COALESCE(SUM(${sales.totalGhs}::numeric), 0)`,
        })
            .from(sales)
            .where(periodFilter)
            .groupBy(sales.paymentMethod),

        db.select({
            id: saleItems.productId,
            name: saleItems.productName,
            qty: sql<number>`SUM((${saleItems.quantity} - ${saleItems.quantityReturned})::int)`,
            revenue: sql<number>`COALESCE(SUM(${saleItems.lineTotalGhs}::numeric), 0)`,
        })
            .from(saleItems)
            .innerJoin(sales, eq(saleItems.saleId, sales.id))
            .where(periodFilter)
            .groupBy(saleItems.productId, saleItems.productName)
            .orderBy(desc(sql`SUM(${saleItems.lineTotalGhs}::numeric)`))
            .limit(10),

        db.select({
            category: categories.name,
            revenue: sql<number>`COALESCE(SUM(${saleItems.lineTotalGhs}::numeric), 0)`,
        })
            .from(saleItems)
            .innerJoin(sales, eq(saleItems.saleId, sales.id))
            .leftJoin(products, eq(saleItems.productId, products.id))
            .leftJoin(categories, eq(products.categoryId, categories.id))
            .where(periodFilter)
            .groupBy(categories.name)
            .orderBy(desc(sql`SUM(${saleItems.lineTotalGhs}::numeric)`)),

        db.select({
            totalCogs: sql<number>`COALESCE(SUM((${saleItems.quantity} - ${saleItems.quantityReturned})::numeric * ${products.costPriceGhs}::numeric), 0)`,
        })
            .from(saleItems)
            .innerJoin(sales, eq(saleItems.saleId, sales.id))
            .innerJoin(products, eq(saleItems.productId, products.id))
            .where(periodFilter),

        db.select({
            totalCogs: sql<number>`COALESCE(SUM((${saleItems.quantity} - ${saleItems.quantityReturned})::numeric * ${products.costPriceGhs}::numeric), 0)`,
        })
            .from(saleItems)
            .innerJoin(sales, eq(saleItems.saleId, sales.id))
            .innerJoin(products, eq(saleItems.productId, products.id))
            .where(prevPeriodFilter),
    ]);

    const netValue = Number(kpis?.netSales || 0);
    const prevNetValue = Number(prevKpis?.netSales || 0);
    const cogsValue = Number(cogsQueryResult?.totalCogs || 0);
    const prevCogsValue = Number(prevCogsResult?.totalCogs || 0);
    const grossProfit = netValue - cogsValue;
    const prevGrossProfit = prevNetValue - prevCogsValue;
    const marginValue = netValue > 0 ? (grossProfit / netValue) * 100 : 0;
    const prevMargin = prevNetValue > 0 ? (prevGrossProfit / prevNetValue) * 100 : 0;
    const avgOrderValue = Number(kpis?.avgOrderValue || 0);
    const prevAvgOrderValue = Number(prevKpis?.avgOrderValue || 0);

    const reportKpis = {
        grossSales: Number(kpis?.grossSales || 0),
        discounts: Number(kpis?.discounts || 0),
        netSales: netValue,
        totalCogs: cogsValue,
        grossProfit,
        marginPercent: marginValue,
        transactionCount: kpis?.transactionCount || 0,
        avgOrderValue,
    };

    const trends = {
        grossSales: pctChange(reportKpis.grossSales, Number(prevKpis?.grossSales || 0)),
        discounts: pctChange(reportKpis.discounts, Number(prevKpis?.discounts || 0)),
        netSales: pctChange(netValue, prevNetValue),
        totalCogs: pctChange(cogsValue, prevCogsValue),
        grossProfit: pctChange(grossProfit, prevGrossProfit),
        marginPercent: pctChange(marginValue, prevMargin),
        transactionCount: pctChange(reportKpis.transactionCount, prevKpis?.transactionCount || 0),
        avgOrderValue: pctChange(avgOrderValue, prevAvgOrderValue),
    };

    const dayFormatter = new Intl.DateTimeFormat("en-GH", {
        timeZone: "Africa/Accra",
        ...(period.dayCount <= 14 ? { weekday: "short" as const } : {}),
        month: "short",
        day: "numeric",
    });

    const dailyByKey = new Map(
        dailyQuery.map((d) => [
            d.dateKey,
            {
                sales: Number(d.sales),
                transactions: d.transactions,
                discounts: Number(d.discounts),
            },
        ]),
    );

    const dailyTrend = enumerateAccraDateKeys(period.fromKey, period.toKey).map((dateKey) => {
        const row = dailyByKey.get(dateKey);
        return {
            dateKey,
            date: dayFormatter.format(new Date(`${dateKey}T12:00:00.000Z`)),
            sales: row?.sales ?? 0,
            transactions: row?.transactions ?? 0,
            discounts: row?.discounts ?? 0,
        };
    });

    const salesTrend = trendQuery.map((t) => ({
        time: t.hour,
        sales: Number(t.sales),
        transactions: t.transactions,
    }));

    const paymentMapping: Record<string, { name: string; color: string }> = {
        cash: { name: "Cash", color: "#006c49" },
        mtn_momo: { name: "Mobile Money", color: "#f59e0b" },
        vodafone_cash: { name: "Mobile Money", color: "#f59e0b" },
        atmoney: { name: "Mobile Money", color: "#f59e0b" },
        card: { name: "Card", color: "#8b5cf6" },
    };

    const paymentMethodsMap = new Map<string, { name: string; value: number; color: string }>();
    paymentQuery.forEach((p) => {
        const config = paymentMapping[p.method] || { name: p.method, color: "#64748b" };
        const existing = paymentMethodsMap.get(config.name);
        if (existing) {
            existing.value += Number(p.revenue);
        } else {
            paymentMethodsMap.set(config.name, { name: config.name, value: Number(p.revenue), color: config.color });
        }
    });

    const paymentMethods = Array.from(paymentMethodsMap.values());
    const totalPaymentRev = paymentMethods.reduce((s, p) => s + p.value, 0) || 1;
    const topPayment = paymentMethods.length
        ? paymentMethods.reduce((best, p) => (p.value > best.value ? p : best))
        : null;

    const topItems = topItemsQuery.map((i) => ({
        id: i.id || Math.random().toString(),
        name: i.name,
        qty: Number(i.qty),
        revenue: Number(i.revenue),
    }));

    const totalCategoryRev = categoryPerformanceQuery.reduce((s: number, c) => s + Number(c.revenue), 0) || 1;
    const categoryPerformance = categoryPerformanceQuery.map((c) => ({
        category: c.category || "Uncategorized",
        sales: Number(c.revenue),
        percentage: Math.round((Number(c.revenue) / totalCategoryRev) * 100),
    }));

    const bestDay = dailyTrend.reduce(
        (best, d) => (d.sales > best.revenue ? { date: d.date, revenue: d.sales } : best),
        { date: "", revenue: 0 },
    );

    const insights = buildSalesInsights({
        periodDays: period.dayCount,
        kpis: reportKpis,
        trends,
        avgOrderValue,
        topCategory: categoryPerformance[0] ?? null,
        topPayment: topPayment
            ? { name: topPayment.name, value: topPayment.value, share: Math.round((topPayment.value / totalPaymentRev) * 100) }
            : null,
        bestDay: bestDay.revenue > 0 ? bestDay : null,
        topProduct: topItems[0] ? { name: topItems[0].name, revenue: topItems[0].revenue } : null,
    });

    const result = {
        period: {
            days: period.dayCount,
            fromKey: period.fromKey,
            toKey: period.toKey,
            label: formatSalesSummaryPeriodLabel(period.fromKey, period.toKey, period.dayCount),
        },
        kpis: reportKpis,
        trends,
        insights,
        dailyTrend,
        salesTrend,
        paymentMethods,
        topItems,
        categoryPerformance,
    };

    await redis.setex(cacheKey, 30, JSON.stringify(result));
    return result;
}

/**
 * Fetch Average Order Value (AOV) data for the specialized detail view.
 * Includes global AOV and AOV breakdown by category.
 */
export async function getAverageOrderValueData(businessId: string, branchId?: string | null) {
    const cacheKey = `sales:biz_${businessId}:brn_${branchId || 'all'}:aov-details`;
    const cached = await redis.get(cacheKey);
    if (cached) {
        try { return JSON.parse(cached); } catch { /* fall through */ }
    }

    const [
        [globalMetrics],
        categoryAovs
    ] = await Promise.all([
        // 1. Global AOV
        db.select({
            avgOrderValue: sql<number>`COALESCE(AVG(${sales.totalGhs}::numeric), 0)`,
        })
            .from(sales)
            .where(and(
                eq(sales.businessId, businessId),
                branchFilter(branchId),
                inArray(sales.status, REVENUE_SALE_STATUSES)
            )),

        // 2. AOV by Category
        // Note: We calculate the average total order value for orders containing items from a category.
        db.select({
            category: categories.name,
            aov: sql<number>`COALESCE(AVG(${sales.totalGhs}::numeric), 0)`,
        })
            .from(saleItems)
            .innerJoin(sales, eq(saleItems.saleId, sales.id))
            .leftJoin(products, eq(saleItems.productId, products.id))
            .leftJoin(categories, eq(products.categoryId, categories.id))
            .where(and(
                eq(sales.businessId, businessId),
                branchFilter(branchId),
                inArray(sales.status, REVENUE_SALE_STATUSES)
            ))
            .groupBy(categories.name)
            .orderBy(desc(sql`AVG(${sales.totalGhs}::numeric)`))
    ]);

    const result = {
        currentAov: Number(globalMetrics?.avgOrderValue || 0),
        byCategory: categoryAovs.map(c => ({
            label: c.category || "Uncategorized",
            value: Number(c.aov)
        }))
    };

    await redis.setex(cacheKey, 30, JSON.stringify(result));
    return result;
}
