import { and, desc, eq, gte, inArray, isNull, lte, or, sql } from "drizzle-orm";
import { db } from "../db";
import { products, categories } from "../db/schema/products";
import { sales, REVENUE_SALE_STATUSES } from "../db/schema/sales";
import { accraDateKey, enumerateAccraDateKeys } from "./product-analytics-service";

export type ReportInsight = {
    type: "positive" | "neutral" | "warning";
    title: string;
    detail: string;
};

function branchSalesFilter(branchId?: string | null) {
    return branchId && branchId !== "all" ? eq(sales.branchId, branchId) : undefined;
}

function branchProductsFilter(branchId?: string | null) {
    if (!branchId || branchId === "all") return undefined;
    return or(eq(products.branchId, branchId), isNull(products.branchId));
}

function pctChange(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 1000) / 10;
}

function formatPeriodLabel(days: number): string {
    if (days === 7) return "Last 7 days";
    if (days === 30) return "Last 30 days";
    if (days === 90) return "Last 90 days";
    return `Last ${days} days`;
}

/** Ghana composite levy split ratios (VAT + NHIL + GETFund + Covid) for estimated filing breakdown. */
const GHANA_TAX_SPLIT = [
    { name: "VAT (15%)", ratio: 15 / 21.9 },
    { name: "NHIL (2.5%)", ratio: 2.5 / 21.9 },
    { name: "GETFund (2.5%)", ratio: 2.5 / 21.9 },
    { name: "Covid-19 Levy (1%)", ratio: 1 / 21.9 },
] as const;

export function buildSalesInsights(input: {
    periodDays: number;
    kpis: {
        netSales: number;
        grossProfit: number;
        marginPercent: number;
        transactionCount: number;
        discounts: number;
    };
    trends: Record<string, number>;
    avgOrderValue: number;
    topCategory?: { category: string; sales: number; percentage: number } | null;
    topPayment?: { name: string; value: number; share: number } | null;
    bestDay?: { date: string; revenue: number } | null;
    topProduct?: { name: string; revenue: number } | null;
}): ReportInsight[] {
    const insights: ReportInsight[] = [];
    const { kpis, trends, periodDays } = input;

    const netTrend = trends.netSales ?? 0;
    if (netTrend !== 0) {
        insights.push({
            type: netTrend > 0 ? "positive" : "warning",
            title: netTrend > 0 ? "Revenue is growing" : "Revenue dipped",
            detail: `Net sales are ${Math.abs(netTrend).toFixed(1)}% ${netTrend > 0 ? "higher" : "lower"} than the previous ${periodDays} days.`,
        });
    }

    if (input.bestDay && input.bestDay.revenue > 0) {
        insights.push({
            type: "neutral",
            title: "Peak sales day",
            detail: `${input.bestDay.date} generated ${input.bestDay.revenue.toLocaleString("en-GH", { style: "currency", currency: "GHS", maximumFractionDigits: 0 })} — your strongest day in this period.`,
        });
    }

    if (input.topCategory) {
        insights.push({
            type: "neutral",
            title: "Leading category",
            detail: `${input.topCategory.category} drives ${input.topCategory.percentage}% of revenue (${input.topCategory.sales.toLocaleString("en-GH", { style: "currency", currency: "GHS", maximumFractionDigits: 0 })}).`,
        });
    }

    if (input.topPayment) {
        insights.push({
            type: "neutral",
            title: "Preferred payment method",
            detail: `${input.topPayment.name} accounts for ${input.topPayment.share}% of collected revenue.`,
        });
    }

    if (input.topProduct) {
        insights.push({
            type: "positive",
            title: "Top performer",
            detail: `${input.topProduct.name} leads with ${input.topProduct.revenue.toLocaleString("en-GH", { style: "currency", currency: "GHS", maximumFractionDigits: 0 })} in sales.`,
        });
    }

    if (kpis.marginPercent >= 30) {
        insights.push({
            type: "positive",
            title: "Healthy gross margin",
            detail: `Gross margin is ${kpis.marginPercent.toFixed(1)}% with ${kpis.grossProfit.toLocaleString("en-GH", { style: "currency", currency: "GHS", maximumFractionDigits: 0 })} profit on ${kpis.netSales.toLocaleString("en-GH", { style: "currency", currency: "GHS", maximumFractionDigits: 0 })} net sales.`,
        });
    } else if (kpis.netSales > 0) {
        insights.push({
            type: "warning",
            title: "Margin under pressure",
            detail: `Gross margin is ${kpis.marginPercent.toFixed(1)}%. Review pricing or supplier costs to protect profitability.`,
        });
    }

    if (input.avgOrderValue > 0) {
        const aovTrend = trends.avgOrderValue ?? 0;
        insights.push({
            type: aovTrend >= 0 ? "neutral" : "warning",
            title: "Average order value",
            detail: `Customers spend ${input.avgOrderValue.toLocaleString("en-GH", { style: "currency", currency: "GHS", maximumFractionDigits: 0 })} per transaction${aovTrend !== 0 ? ` (${aovTrend > 0 ? "+" : ""}${aovTrend.toFixed(1)}% vs prior period)` : ""}.`,
        });
    }

    if (kpis.discounts > 0 && kpis.netSales > 0) {
        const discountRate = (kpis.discounts / (kpis.netSales + kpis.discounts)) * 100;
        if (discountRate > 8) {
            insights.push({
                type: "warning",
                title: "Elevated discounting",
                detail: `Discounts represent ${discountRate.toFixed(1)}% of gross sales. Monitor promotion impact on margins.`,
            });
        }
    }

    return insights.slice(0, 6);
}

export async function getInventoryValuationReport(businessId: string, branchId?: string | null) {
    const productFilters = [
        eq(products.businessId, businessId),
        eq(products.status, "active"),
        branchProductsFilter(branchId),
    ].filter(Boolean);

    const [summary] = await db
        .select({
            totalProducts: sql<number>`COUNT(*)::int`,
            totalUnits: sql<number>`COALESCE(SUM(${products.stock}), 0)::int`,
            costValue: sql<number>`COALESCE(SUM(${products.stock}::numeric * ${products.costPriceGhs}::numeric), 0)`,
            retailValue: sql<number>`COALESCE(SUM(${products.stock}::numeric * ${products.priceGhs}::numeric), 0)`,
            lowStockCount: sql<number>`COUNT(*) FILTER (WHERE ${products.stock} <= COALESCE(${products.reorderAt}, 5))::int`,
            outOfStockCount: sql<number>`COUNT(*) FILTER (WHERE ${products.stock} <= 0)::int`,
        })
        .from(products)
        .where(and(...productFilters));

    const lowStockItems = await db
        .select({
            id: products.id,
            name: products.name,
            stock: products.stock,
            reorder: products.reorderAt,
            priceGhs: products.priceGhs,
            costPriceGhs: products.costPriceGhs,
            categoryName: categories.name,
        })
        .from(products)
        .leftJoin(categories, eq(products.categoryId, categories.id))
        .where(
            and(
                ...productFilters,
                sql`${products.stock} <= COALESCE(${products.reorderAt}, 5)`,
            ),
        )
        .orderBy(products.stock)
        .limit(8);

    const categoryRows = await db
        .select({
            category: categories.name,
            units: sql<number>`COALESCE(SUM(${products.stock}), 0)::int`,
            costValue: sql<number>`COALESCE(SUM(${products.stock}::numeric * ${products.costPriceGhs}::numeric), 0)`,
            retailValue: sql<number>`COALESCE(SUM(${products.stock}::numeric * ${products.priceGhs}::numeric), 0)`,
        })
        .from(products)
        .leftJoin(categories, eq(products.categoryId, categories.id))
        .where(and(...productFilters))
        .groupBy(categories.name)
        .orderBy(desc(sql`COALESCE(SUM(${products.stock}::numeric * ${products.priceGhs}::numeric), 0)`))
        .limit(8);

    const costValue = Number(summary?.costValue ?? 0);
    const retailValue = Number(summary?.retailValue ?? 0);
    const potentialProfit = retailValue - costValue;
    const marginPercent = retailValue > 0 ? (potentialProfit / retailValue) * 100 : 0;

    const categoryBreakdown = categoryRows.map((row) => ({
        category: row.category || "Uncategorized",
        units: Number(row.units ?? 0),
        costValue: Number(row.costValue ?? 0),
        retailValue: Number(row.retailValue ?? 0),
        percentage: retailValue > 0 ? Math.round((Number(row.retailValue ?? 0) / retailValue) * 100) : 0,
    }));

    const insights: ReportInsight[] = [];
    const lowCount = Number(summary?.lowStockCount ?? 0);
    const outCount = Number(summary?.outOfStockCount ?? 0);

    if (outCount > 0) {
        insights.push({
            type: "warning",
            title: "Out-of-stock items",
            detail: `${outCount} active product${outCount === 1 ? "" : "s"} have zero stock and cannot be sold until restocked.`,
        });
    }
    if (lowCount > 0) {
        insights.push({
            type: "warning",
            title: "Reorder attention needed",
            detail: `${lowCount} product${lowCount === 1 ? "" : "s"} at or below reorder level. Create purchase orders to avoid lost sales.`,
        });
    }
    if (marginPercent >= 25) {
        insights.push({
            type: "positive",
            title: "Strong inventory margin",
            detail: `Portfolio carries ${marginPercent.toFixed(1)}% potential margin (${potentialProfit.toLocaleString("en-GH", { style: "currency", currency: "GHS", maximumFractionDigits: 0 })} unrealized profit).`,
        });
    }
    if (categoryBreakdown[0]) {
        insights.push({
            type: "neutral",
            title: "Largest stock category",
            detail: `${categoryBreakdown[0].category} holds ${categoryBreakdown[0].percentage}% of retail inventory value.`,
        });
    }

    return {
        summary: {
            totalProducts: Number(summary?.totalProducts ?? 0),
            totalUnits: Number(summary?.totalUnits ?? 0),
            costValue,
            retailValue,
            potentialProfit,
            marginPercent: Math.round(marginPercent * 10) / 10,
            lowStockCount: lowCount,
            outOfStockCount: outCount,
        },
        lowStockItems: lowStockItems.map((item) => ({
            id: item.id,
            name: item.name,
            stock: item.stock ?? 0,
            reorder: item.reorder ?? 5,
            category: item.categoryName || "Uncategorized",
            retailValue: Number(item.priceGhs ?? 0) * (item.stock ?? 0),
        })),
        categoryBreakdown,
        insights,
    };
}

export async function getTaxLiabilitiesReport(
    businessId: string,
    periodDays: number = 30,
    branchId?: string | null,
) {
    const now = new Date();
    const periodStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);
    const prevStart = new Date(periodStart.getTime() - periodDays * 24 * 60 * 60 * 1000);

    const baseFilter = [
        eq(sales.businessId, businessId),
        branchSalesFilter(branchId),
        inArray(sales.status, REVENUE_SALE_STATUSES),
    ].filter(Boolean);

    const [[current], [previous], dailyRows] = await Promise.all([
        db
            .select({
                taxableSales: sql<number>`COALESCE(SUM(${sales.subtotalGhs}::numeric), 0)`,
                totalTax: sql<number>`COALESCE(SUM(${sales.taxGhs}::numeric), 0)`,
                netSales: sql<number>`COALESCE(SUM(${sales.totalGhs}::numeric), 0)`,
                transactions: sql<number>`COUNT(*)::int`,
            })
            .from(sales)
            .where(and(...baseFilter, gte(sales.createdAt, periodStart))),

        db
            .select({
                totalTax: sql<number>`COALESCE(SUM(${sales.taxGhs}::numeric), 0)`,
            })
            .from(sales)
            .where(and(...baseFilter, gte(sales.createdAt, prevStart), lte(sales.createdAt, periodStart))),

        db
            .select({
                dateKey: sql<string>`TO_CHAR(${sales.createdAt} AT TIME ZONE 'Africa/Accra', 'YYYY-MM-DD')`,
                tax: sql<number>`COALESCE(SUM(${sales.taxGhs}::numeric), 0)`,
                taxable: sql<number>`COALESCE(SUM(${sales.subtotalGhs}::numeric), 0)`,
            })
            .from(sales)
            .where(and(...baseFilter, gte(sales.createdAt, periodStart)))
            .groupBy(sql`TO_CHAR(${sales.createdAt} AT TIME ZONE 'Africa/Accra', 'YYYY-MM-DD')`)
            .orderBy(sql`TO_CHAR(${sales.createdAt} AT TIME ZONE 'Africa/Accra', 'YYYY-MM-DD')`),
    ]);

    const totalTax = Number(current?.totalTax ?? 0);
    const taxableSales = Number(current?.taxableSales ?? 0);
    const prevTax = Number(previous?.totalTax ?? 0);
    const taxTrend = pctChange(totalTax, prevTax);

    const toKey = accraDateKey();
    const fromDate = new Date(periodStart);
    const fromKey = accraDateKey(fromDate);
    const dayFormatter = new Intl.DateTimeFormat("en-GH", {
        timeZone: "Africa/Accra",
        month: "short",
        day: "numeric",
    });

    const dailyByKey = new Map(
        dailyRows.map((d) => [d.dateKey, { tax: Number(d.tax), taxable: Number(d.taxable) }]),
    );

    const dailyTrend = enumerateAccraDateKeys(fromKey, toKey).map((dateKey) => {
        const row = dailyByKey.get(dateKey);
        return {
            dateKey,
            date: dayFormatter.format(new Date(`${dateKey}T12:00:00.000Z`)),
            tax: row?.tax ?? 0,
            taxable: row?.taxable ?? 0,
        };
    });

    const taxBreakdown = GHANA_TAX_SPLIT.map((levy) => ({
        name: levy.name,
        amount: Math.round(totalTax * levy.ratio * 100) / 100,
        estimated: true as const,
    }));

    const periodLabel = new Intl.DateTimeFormat("en-GH", {
        timeZone: "Africa/Accra",
        month: "long",
        year: "numeric",
    }).format(now);

    const insights: ReportInsight[] = [];
    if (totalTax > 0) {
        insights.push({
            type: taxTrend >= 0 ? "neutral" : "positive",
            title: "Tax collection trend",
            detail: `Collected ${totalTax.toLocaleString("en-GH", { style: "currency", currency: "GHS", maximumFractionDigits: 0 })} in taxes — ${taxTrend >= 0 ? "+" : ""}${taxTrend.toFixed(1)}% vs prior ${periodDays} days.`,
        });
        const effectiveRate = taxableSales > 0 ? (totalTax / taxableSales) * 100 : 0;
        insights.push({
            type: "neutral",
            title: "Effective tax rate",
            detail: `Tax represents ${effectiveRate.toFixed(1)}% of taxable sales (${taxableSales.toLocaleString("en-GH", { style: "currency", currency: "GHS", maximumFractionDigits: 0 })} subtotal).`,
        });
    } else {
        insights.push({
            type: "neutral",
            title: "No tax collected",
            detail: "No taxable sales recorded in this period. Confirm tax settings on products if applicable.",
        });
    }

    return {
        period: {
            days: periodDays,
            label: periodLabel,
            fromKey,
            toKey,
        },
        summary: {
            totalTaxableSales: taxableSales,
            totalTax,
            netSales: Number(current?.netSales ?? 0),
            transactions: current?.transactions ?? 0,
            taxTrend,
        },
        taxBreakdown,
        dailyTrend,
        insights,
    };
}

export { pctChange, formatPeriodLabel };
