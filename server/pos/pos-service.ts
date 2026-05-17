import { eq, sql, and, gte, lte, desc, inArray } from "drizzle-orm";
import { db } from "../db";
import { products, categories, productVariations } from "../db/schema/products";
import { sales, saleItems, salePaymentLines, REVENUE_SALE_STATUSES } from "../db/schema/sales";
import { customers } from "../db/schema/customers";
import { customerAccountEntries } from "../db/schema/customer-account-entries";
import { notifications } from "../db/schema/notifications";
import { redis } from "../lib/redis";
import { invalidateCustomerCaches } from "../customers/customer-account-service";

const CACHE_KEYS = {
    PRODUCTS_LIST: (bizId: string, brn?: string | null) => `products:biz_${bizId}:brn_${brn || 'all'}:list`,
    SALES_OVERVIEW: (bizId: string, brn?: string | null) => `sales:biz_${bizId}:brn_${brn || 'all'}:overview`,
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
        // 1. Deduct stock
        for (const line of input.lines) {
            if (line.quantity <= 0) continue;

            if (line.variationId) {
                await tx
                    .update(productVariations)
                    .set({
                        stock: sql`${productVariations.stock} - ${line.quantity}`,
                        updatedAt: new Date(),
                    })
                    .where(eq(productVariations.id, line.variationId));
            } else {
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
export async function getSalesOverview(businessId: string, branchId?: string | null) {
    const cacheKey = CACHE_KEYS.SALES_OVERVIEW(businessId, branchId);
    const cached = await redis.get(cacheKey);
    if (cached) {
        try { return JSON.parse(cached); } catch { /* fall through */ }
    }

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

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
            .where(and(
                eq(sales.businessId, businessId),
                branchFilter(branchId),
                gte(sales.createdAt, sevenDaysAgo),
                inArray(sales.status, REVENUE_SALE_STATUSES),
            )),

        // 2. Previous period metrics (for trend)
        db.select({
            totalRevenue: sql<string>`COALESCE(SUM(${sales.totalGhs}::numeric), 0)`,
            totalTransactions: sql<number>`COUNT(*)::int`,
            avgOrderValue: sql<string>`COALESCE(AVG(${sales.totalGhs}::numeric), 0)`,
        })
            .from(sales)
            .where(and(
                eq(sales.businessId, businessId),
                branchFilter(branchId),
                gte(sales.createdAt, fourteenDaysAgo),
                lte(sales.createdAt, sevenDaysAgo),
                inArray(sales.status, REVENUE_SALE_STATUSES),
            )),

        // 3. Daily revenue for chart (last 7 days)
        db.select({
            date: sql<string>`TO_CHAR(${sales.createdAt} AT TIME ZONE 'Africa/Accra', 'Dy')`,
            dateKey: sql<string>`TO_CHAR(${sales.createdAt} AT TIME ZONE 'Africa/Accra', 'YYYY-MM-DD')`,
            revenue: sql<string>`COALESCE(SUM(${sales.totalGhs}::numeric), 0)`,
        })
            .from(sales)
            .where(and(
                eq(sales.businessId, businessId),
                branchFilter(branchId),
                gte(sales.createdAt, sevenDaysAgo),
                inArray(sales.status, REVENUE_SALE_STATUSES),
            ))
            .groupBy(
                sql`TO_CHAR(${sales.createdAt} AT TIME ZONE 'Africa/Accra', 'Dy')`,
                sql`TO_CHAR(${sales.createdAt} AT TIME ZONE 'Africa/Accra', 'YYYY-MM-DD')`,
            )
            .orderBy(sql`TO_CHAR(${sales.createdAt} AT TIME ZONE 'Africa/Accra', 'YYYY-MM-DD')`),

        // 4. Top selling products (last 7 days) — join products for image
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
            .where(and(
                eq(sales.businessId, businessId),
                branchFilter(branchId),
                gte(sales.createdAt, sevenDaysAgo),
                inArray(sales.status, REVENUE_SALE_STATUSES),
            ))
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

    const overview = {
        metrics: [
            { label: "Total Revenue", value: curRev, trend: trend(curRev, prevRev), timeframe: "vs last 7 days" },
            { label: "Total Transactions", value: curTrans, trend: trend(curTrans, prevTrans), timeframe: "vs last 7 days" },
            { label: "Average Order Value", value: curAov, trend: trend(curAov, prevAov), timeframe: "vs last 7 days" },
        ],
        chartData: dailyRevenue.map((d) => ({
            date: d.date,
            revenue: Number(d.revenue),
        })),
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

/**
 * Fetch data for the dashboard home landing page:
 * - Today's total sales and transaction count
 * - Comparison with yesterday
 * - 10 most recent transactions
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
        recentSales
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
            .limit(10)
    ]);

    const todayRev = Number(todayTotals.totalRevenue);
    const yesterdayRev = Number(yesterdayTotals.totalRevenue);

    let vsYesterdayPercent = 0;
    if (yesterdayRev > 0) {
        vsYesterdayPercent = Math.round(((todayRev - yesterdayRev) / yesterdayRev) * 100);
    } else if (todayRev > 0) {
        vsYesterdayPercent = 100;
    }

    const homeData = {
        todaySalesGhs: todayRev,
        transactionCount: todayTotals.totalTransactions,
        vsYesterdayPercent,
        recentSales: recentSales.map(s => ({
            id: s.id,
            invoiceId: s.invoiceId,
            totalGhs: Number(s.totalGhs),
            createdAt: s.createdAt,
        })),
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
export async function getSalesSummaryReport(businessId: string, periodDays: number = 30, branchId?: string | null) {
    const cacheKey = `sales:biz_${businessId}:brn_${branchId || 'all'}:summary-details:${periodDays}d`;
    const cached = await redis.get(cacheKey);
    if (cached) {
        try { return JSON.parse(cached); } catch { /* fall through */ }
    }

    const now = new Date();
    const periodStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);

    const [
        [kpis],
        trendQuery,
        paymentQuery,
        topItemsQuery,
        categoryPerformanceQuery,
        [cogsQueryResult]
    ] = await Promise.all([
        db.select({
            grossSales: sql<number>`COALESCE(SUM(${sales.subtotalGhs}::numeric), 0)`,
            discounts: sql<number>`COALESCE(SUM(${sales.discountGhs}::numeric), 0)`,
            netSales: sql<number>`COALESCE(SUM(${sales.totalGhs}::numeric), 0)`,
            transactionCount: sql<number>`COUNT(*)::int`,
        })
            .from(sales)
            .where(and(
                eq(sales.businessId, businessId),
                branchFilter(branchId),
                gte(sales.createdAt, periodStart),
                inArray(sales.status, REVENUE_SALE_STATUSES)
            )),

        db.select({
            hour: sql<string>`TO_CHAR(${sales.createdAt} AT TIME ZONE 'Africa/Accra', 'HH24:00')`,
            sales: sql<number>`COALESCE(SUM(${sales.totalGhs}::numeric), 0)`,
        })
            .from(sales)
            .where(and(
                eq(sales.businessId, businessId),
                branchFilter(branchId),
                gte(sales.createdAt, new Date(now.getFullYear(), now.getMonth(), now.getDate())),
                inArray(sales.status, REVENUE_SALE_STATUSES)
            ))
            .groupBy(sql`TO_CHAR(${sales.createdAt} AT TIME ZONE 'Africa/Accra', 'HH24:00')`)
            .orderBy(sql`TO_CHAR(${sales.createdAt} AT TIME ZONE 'Africa/Accra', 'HH24:00')`),

        db.select({
            method: sales.paymentMethod,
            revenue: sql<number>`COALESCE(SUM(${sales.totalGhs}::numeric), 0)`,
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
            id: saleItems.productId,
            name: saleItems.productName,
            qty: sql<number>`SUM((${saleItems.quantity} - ${saleItems.quantityReturned})::int)`,
            revenue: sql<number>`COALESCE(SUM(${saleItems.lineTotalGhs}::numeric), 0)`,
        })
            .from(saleItems)
            .innerJoin(sales, eq(saleItems.saleId, sales.id))
            .where(and(
                eq(sales.businessId, businessId),
                branchFilter(branchId),
                gte(sales.createdAt, periodStart),
                inArray(sales.status, REVENUE_SALE_STATUSES)
            ))
            .groupBy(saleItems.productId, saleItems.productName)
            .orderBy(desc(sql`SUM(${saleItems.lineTotalGhs}::numeric)`))
            .limit(5),

        db.select({
            category: categories.name,
            revenue: sql<number>`COALESCE(SUM(${saleItems.lineTotalGhs}::numeric), 0)`,
        })
            .from(saleItems)
            .innerJoin(sales, eq(saleItems.saleId, sales.id))
            .leftJoin(products, eq(saleItems.productId, products.id))
            .leftJoin(categories, eq(products.categoryId, categories.id))
            .where(and(
                eq(sales.businessId, businessId),
                branchFilter(branchId),
                gte(sales.createdAt, periodStart),
                inArray(sales.status, REVENUE_SALE_STATUSES)
            ))
            .groupBy(categories.name)
            .orderBy(desc(sql`SUM(${saleItems.lineTotalGhs}::numeric)`)),

        // 6. Real COGS Calculation
        db.select({
            totalCogs: sql<number>`COALESCE(SUM((${saleItems.quantity} - ${saleItems.quantityReturned})::numeric * ${products.costPriceGhs}::numeric), 0)`,
        })
            .from(saleItems)
            .innerJoin(sales, eq(saleItems.saleId, sales.id))
            .innerJoin(products, eq(saleItems.productId, products.id))
            .where(and(
                eq(sales.businessId, businessId),
                branchFilter(branchId),
                gte(sales.createdAt, periodStart),
                inArray(sales.status, REVENUE_SALE_STATUSES)
            ))
    ]);

    const netValue = Number(kpis?.netSales || 0);
    const cogsValue = Number(cogsQueryResult?.totalCogs || 0);
    const marginValue = netValue > 0 ? ((netValue - cogsValue) / netValue) * 100 : 0;

    const reportKpis = {
        grossSales: Number(kpis?.grossSales || 0),
        discounts: Number(kpis?.discounts || 0),
        netSales: netValue,
        totalCogs: cogsValue,
        grossProfit: netValue - cogsValue,
        marginPercent: marginValue,
        transactionCount: kpis?.transactionCount || 0,
    };

    const salesTrend = trendQuery.map(t => ({
        time: t.hour,
        sales: Number(t.sales)
    }));

    const paymentMapping: Record<string, { name: string, color: string }> = {
        "cash": { name: "Cash", color: "#006c49" },
        "mtn_momo": { name: "Mobile Money", color: "#f59e0b" },
        "vodafone_cash": { name: "Mobile Money", color: "#f59e0b" },
        "atmoney": { name: "Mobile Money", color: "#f59e0b" },
        "card": { name: "Card", color: "#8b5cf6" },
    };

    const paymentMethodsMap = new Map<string, { name: string, value: number, color: string }>();
    paymentQuery.forEach(p => {
        const config = paymentMapping[p.method] || { name: p.method, color: "#64748b" };
        const existing = paymentMethodsMap.get(config.name);
        if (existing) {
            existing.value += Number(p.revenue);
        } else {
            paymentMethodsMap.set(config.name, { name: config.name, value: Number(p.revenue), color: config.color });
        }
    });

    const topItems = topItemsQuery.map(i => ({
        id: i.id || Math.random().toString(),
        name: i.name,
        qty: Number(i.qty),
        revenue: Number(i.revenue)
    }));

    const totalCategoryRev = categoryPerformanceQuery.reduce((s: number, c: any) => s + Number(c.revenue), 0) || 1;
    const categoryPerformance = categoryPerformanceQuery.map((c: any) => ({
        category: c.category || "Uncategorized",
        sales: Number(c.revenue),
        percentage: Math.round((Number(c.revenue) / totalCategoryRev) * 100)
    }));

    const result = {
        kpis: reportKpis,
        salesTrend,
        paymentMethods: Array.from(paymentMethodsMap.values()),
        topItems,
        categoryPerformance
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
