import { eq, and, sql, gte, lte, inArray } from "drizzle-orm";
import { db } from "../db";
import { sales, saleItems, REVENUE_SALE_STATUSES } from "../db/schema/sales";
import { products } from "../db/schema/products";

export interface ProductPerformanceMetrics {
    qtySold: number;
    revenue: number;
    profit: number;
}

export interface ProductAnalyticsResult {
    product: {
        id: string;
        name: string;
        sku: string;
        barcode: string | null;
        imageSrc: string | null;
        stock: number;
        costPriceGhs: number;
        sellingPriceGhs: number;
        createdAt: string;
    };
    referenceDate: string;
    daily: ProductPerformanceMetrics;
    weekly: ProductPerformanceMetrics;
    monthly: ProductPerformanceMetrics;
    overall: ProductPerformanceMetrics;
}

export function accraDateKey(date = new Date()): string {
    return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Accra" }).format(date);
}

/** Monday-based week start in Accra (YYYY-MM-DD). */
export function accraWeekStartKey(dateKey: string): string {
    const d = new Date(`${dateKey}T12:00:00.000Z`);
    const day = d.getUTCDay();
    const diff = (day + 6) % 7;
    d.setUTCDate(d.getUTCDate() - diff);
    return d.toISOString().slice(0, 10);
}

export function accraWeekEndKey(weekStartKey: string): string {
    const d = new Date(`${weekStartKey}T12:00:00.000Z`);
    d.setUTCDate(d.getUTCDate() + 6);
    return d.toISOString().slice(0, 10);
}

export function accraMonthStartKey(dateKey: string): string {
    return `${dateKey.slice(0, 7)}-01`;
}

export function accraMonthEndKey(dateKey: string): string {
    const year = Number(dateKey.slice(0, 4));
    const month = Number(dateKey.slice(5, 7));
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    return `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
}

/** Accra is UTC+0 — midnight/end-of-day map directly to Zulu timestamps. */
export function accraDayBounds(dateKey: string): { start: Date; end: Date } {
    return {
        start: new Date(`${dateKey}T00:00:00.000Z`),
        end: new Date(`${dateKey}T23:59:59.999Z`),
    };
}

export function accraWeekBounds(dateKey: string): { start: Date; end: Date } {
    const weekStartKey = accraWeekStartKey(dateKey);
    const weekEndKey = accraWeekEndKey(weekStartKey);
    return {
        start: accraDayBounds(weekStartKey).start,
        end: accraDayBounds(weekEndKey).end,
    };
}

export function accraMonthBounds(dateKey: string): { start: Date; end: Date } {
    const monthStartKey = accraMonthStartKey(dateKey);
    const monthEndKey = accraMonthEndKey(dateKey);
    return {
        start: accraDayBounds(monthStartKey).start,
        end: accraDayBounds(monthEndKey).end,
    };
}

/** Parse ISO timestamp or YYYY-MM-DD into an Accra calendar day key. */
export function parseReferenceDateKey(referenceDate?: string | Date | null): string {
    if (!referenceDate) return accraDateKey();
    if (referenceDate instanceof Date) return accraDateKey(referenceDate);
    const str = referenceDate.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
    const parsed = new Date(str);
    if (!Number.isNaN(parsed.getTime())) return accraDateKey(parsed);
    return accraDateKey();
}

function branchSalesFilter(branchId?: string | null) {
    return branchId && branchId !== "all" ? eq(sales.branchId, branchId) : undefined;
}

function parseMetricsRow(row?: {
    qtySold: number | null;
    revenue: string | null;
    profit: string | null;
} | null): ProductPerformanceMetrics {
    return {
        qtySold: Number(row?.qtySold ?? 0),
        revenue: Number(row?.revenue ?? 0),
        profit: Number(row?.profit ?? 0),
    };
}

async function aggregateProductPeriod(
    businessId: string,
    productId: string,
    branchId: string | null | undefined,
    periodStart: Date,
    periodEnd: Date,
): Promise<ProductPerformanceMetrics> {
    const sellableQty = sql<number>`(${saleItems.quantity} - ${saleItems.quantityReturned})::int`;
    const unitSellingPrice = sql<string>`COALESCE(${saleItems.unitPriceGhs}::numeric, ${products.priceGhs}::numeric, 0)`;
    const unitCost = sql<string>`COALESCE(${products.costPriceGhs}::numeric, 0)`;
    const lineRevenue = sql<string>`(${sellableQty})::numeric * ${unitSellingPrice}`;
    const lineProfit = sql<string>`(${sellableQty})::numeric * (${unitSellingPrice} - ${unitCost})`;

    const filters = [
        eq(sales.businessId, businessId),
        eq(saleItems.productId, productId),
        inArray(sales.status, REVENUE_SALE_STATUSES),
        gte(sales.createdAt, periodStart),
        lte(sales.createdAt, periodEnd),
        branchSalesFilter(branchId),
    ].filter(Boolean);

    const [row] = await db
        .select({
            qtySold: sql<number>`COALESCE(SUM(${sellableQty}), 0)::int`,
            revenue: sql<string>`COALESCE(SUM(${lineRevenue}), 0)`,
            profit: sql<string>`COALESCE(SUM(${lineProfit}), 0)`,
        })
        .from(saleItems)
        .innerJoin(sales, eq(saleItems.saleId, sales.id))
        .innerJoin(products, eq(saleItems.productId, products.id))
        .where(and(...filters));

    return parseMetricsRow(row);
}

async function aggregateProductLifetime(
    businessId: string,
    productId: string,
    branchId: string | null | undefined,
): Promise<ProductPerformanceMetrics> {
    const sellableQty = sql<number>`(${saleItems.quantity} - ${saleItems.quantityReturned})::int`;
    const unitSellingPrice = sql<string>`COALESCE(${saleItems.unitPriceGhs}::numeric, ${products.priceGhs}::numeric, 0)`;
    const unitCost = sql<string>`COALESCE(${products.costPriceGhs}::numeric, 0)`;
    const lineRevenue = sql<string>`(${sellableQty})::numeric * ${unitSellingPrice}`;
    const lineProfit = sql<string>`(${sellableQty})::numeric * (${unitSellingPrice} - ${unitCost})`;

    const filters = [
        eq(sales.businessId, businessId),
        eq(saleItems.productId, productId),
        inArray(sales.status, REVENUE_SALE_STATUSES),
        branchSalesFilter(branchId),
    ].filter(Boolean);

    const [row] = await db
        .select({
            qtySold: sql<number>`COALESCE(SUM(${sellableQty}), 0)::int`,
            revenue: sql<string>`COALESCE(SUM(${lineRevenue}), 0)`,
            profit: sql<string>`COALESCE(SUM(${lineProfit}), 0)`,
        })
        .from(saleItems)
        .innerJoin(sales, eq(saleItems.saleId, sales.id))
        .innerJoin(products, eq(saleItems.productId, products.id))
        .where(and(...filters));

    return parseMetricsRow(row);
}

/**
 * Aggregates sale-line performance for a single product.
 * Each period queries sales.created_at within exact Accra timestamp windows.
 */
export async function getProductAnalytics(
    businessId: string,
    productId: string,
    branchId?: string | null,
    referenceDate?: string | Date | null,
): Promise<ProductAnalyticsResult | null> {
    const [product] = await db
        .select({
            id: products.id,
            name: products.name,
            sku: products.sku,
            barcode: products.barcode,
            imageSrc: products.imageSrc,
            stock: products.stock,
            costPriceGhs: products.costPriceGhs,
            priceGhs: products.priceGhs,
            createdAt: products.createdAt,
            businessId: products.businessId,
        })
        .from(products)
        .where(and(eq(products.id, productId), eq(products.businessId, businessId)))
        .limit(1);

    if (!product) {
        return null;
    }

    const referenceDateKey = parseReferenceDateKey(referenceDate);
    const dailyBounds = accraDayBounds(referenceDateKey);
    const weeklyBounds = accraWeekBounds(referenceDateKey);
    const monthlyBounds = accraMonthBounds(referenceDateKey);

    const [daily, weekly, monthly, overall] = await Promise.all([
        aggregateProductPeriod(
            businessId,
            productId,
            branchId,
            dailyBounds.start,
            dailyBounds.end,
        ),
        aggregateProductPeriod(
            businessId,
            productId,
            branchId,
            weeklyBounds.start,
            weeklyBounds.end,
        ),
        aggregateProductPeriod(
            businessId,
            productId,
            branchId,
            monthlyBounds.start,
            monthlyBounds.end,
        ),
        aggregateProductLifetime(businessId, productId, branchId),
    ]);

    return {
        product: {
            id: product.id,
            name: product.name,
            sku: product.sku,
            barcode: product.barcode,
            imageSrc: product.imageSrc,
            stock: product.stock,
            costPriceGhs: Number(product.costPriceGhs ?? 0),
            sellingPriceGhs: Number(product.priceGhs),
            createdAt: product.createdAt.toISOString(),
        },
        referenceDate: referenceDateKey,
        daily,
        weekly,
        monthly,
        overall,
    };
}
