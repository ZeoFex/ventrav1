import { and, eq, gte, lte, sql, inArray, isNotNull, or, isNull } from "drizzle-orm";
import { db } from "../db";
import { products, categories } from "../db/schema/products";
import { sales, saleItems, REVENUE_SALE_STATUSES } from "../db/schema/sales";
import { saleReturnEvents } from "../db/schema/sale-return-events";
import { supplyOrders, supplyOrderLines } from "../db/schema/suppliers";
import { stockTakeSessions, stockTakeLines } from "../db/schema/stock-take";
import {
    accraDayBounds,
    accraWeekBounds,
    accraMonthBounds,
    parseReferenceDateKey,
} from "./product-analytics-service";

export type ReportPeriodType = "all" | "daily" | "weekly" | "monthly" | "custom";

export type ResolvedReportPeriod = {
    type: ReportPeriodType;
    referenceDate: string;
    fromKey: string;
    toKey: string;
    start: Date;
    end: Date;
    label: string;
};

export type ProductReportRow = {
    id: string;
    name: string;
    sku: string;
    barcode: string | null;
    imageSrc: string | null;
    categoryId: string | null;
    categoryName: string | null;
    stock: number;
    priceGhs: number;
    costPriceGhs: number;
    /** Units sold in the selected period. */
    qtySold: number;
    /** Units added to stock in the period (supply, returns, stock-take gains). */
    qtyAdded: number;
    revenue: number;
    profit: number;
};

export type ProductReportActivityFilter = "all" | "sold" | "added" | "activity";

export type ProductReportResult = {
    period: ResolvedReportPeriod;
    products: ProductReportRow[];
};

function branchProductsFilter(branchId?: string | null) {
    if (!branchId || branchId === "all") return undefined;
    return or(eq(products.branchId, branchId), isNull(products.branchId));
}

function branchSalesFilter(branchId?: string | null) {
    return branchId && branchId !== "all" ? eq(sales.branchId, branchId) : undefined;
}

function branchSupplyFilter(branchId?: string | null) {
    return branchId && branchId !== "all" ? eq(supplyOrders.branchId, branchId) : undefined;
}

function branchReturnFilter(branchId?: string | null) {
    return branchId && branchId !== "all" ? eq(saleReturnEvents.branchId, branchId) : undefined;
}

function branchStockTakeFilter(branchId?: string | null) {
    return branchId && branchId !== "all" ? eq(stockTakeSessions.branchId, branchId) : undefined;
}

function formatPeriodLabel(fromKey: string, toKey: string): string {
    const fmt = (key: string) =>
        new Date(`${key}T12:00:00.000Z`).toLocaleDateString("en-GH", {
            month: "short",
            day: "numeric",
            year: "numeric",
            timeZone: "Africa/Accra",
        });
    if (fromKey === toKey) return fmt(fromKey);
    return `${fmt(fromKey)} – ${fmt(toKey)}`;
}

export function resolveReportPeriod(
    period: ReportPeriodType,
    referenceDate?: string | null,
    customFrom?: string | null,
    customTo?: string | null,
): ResolvedReportPeriod {
    const refKey = parseReferenceDateKey(referenceDate);

    if (period === "all") {
        const todayBounds = accraDayBounds(refKey);
        return {
            type: "all",
            referenceDate: refKey,
            fromKey: "all",
            toKey: refKey,
            start: new Date("1970-01-01T00:00:00.000Z"),
            end: todayBounds.end,
            label: "All time",
        };
    }

    if (period === "custom") {
        const fromKey = customFrom?.trim() && /^\d{4}-\d{2}-\d{2}$/.test(customFrom.trim())
            ? customFrom.trim()
            : refKey;
        const toKey = customTo?.trim() && /^\d{4}-\d{2}-\d{2}$/.test(customTo.trim())
            ? customTo.trim()
            : fromKey;
        const fromBounds = accraDayBounds(fromKey);
        const toBounds = accraDayBounds(toKey);
        const start = fromBounds.start;
        const end = toBounds.end;
        const [sortedFrom, sortedTo] =
            start.getTime() <= end.getTime() ? [fromKey, toKey] : [toKey, fromKey];
        const resolvedStart =
            start.getTime() <= end.getTime() ? start : accraDayBounds(sortedFrom).start;
        const resolvedEnd =
            start.getTime() <= end.getTime() ? end : accraDayBounds(sortedTo).end;

        return {
            type: "custom",
            referenceDate: refKey,
            fromKey: sortedFrom,
            toKey: sortedTo,
            start: resolvedStart,
            end: resolvedEnd,
            label: formatPeriodLabel(sortedFrom, sortedTo),
        };
    }

    if (period === "weekly") {
        const bounds = accraWeekBounds(refKey);
        const fromKey = bounds.start.toISOString().slice(0, 10);
        const toKey = bounds.end.toISOString().slice(0, 10);
        return {
            type: "weekly",
            referenceDate: refKey,
            fromKey,
            toKey,
            start: bounds.start,
            end: bounds.end,
            label: formatPeriodLabel(fromKey, toKey),
        };
    }

    if (period === "monthly") {
        const bounds = accraMonthBounds(refKey);
        const fromKey = bounds.start.toISOString().slice(0, 10);
        const toKey = bounds.end.toISOString().slice(0, 10);
        return {
            type: "monthly",
            referenceDate: refKey,
            fromKey,
            toKey,
            start: bounds.start,
            end: bounds.end,
            label: formatPeriodLabel(fromKey, toKey),
        };
    }

    const bounds = accraDayBounds(refKey);
    return {
        type: "daily",
        referenceDate: refKey,
        fromKey: refKey,
        toKey: refKey,
        start: bounds.start,
        end: bounds.end,
        label: formatPeriodLabel(refKey, refKey),
    };
}

async function aggregateSoldByProduct(
    businessId: string,
    branchId: string | null | undefined,
    periodStart: Date,
    periodEnd: Date,
): Promise<Map<string, { qtySold: number; revenue: number; profit: number }>> {
    const sellableQty = sql<number>`(${saleItems.quantity} - ${saleItems.quantityReturned})::int`;
    const unitSellingPrice = sql<string>`COALESCE(${saleItems.unitPriceGhs}::numeric, ${products.priceGhs}::numeric, 0)`;
    const unitCost = sql<string>`COALESCE(${products.costPriceGhs}::numeric, 0)`;
    const lineRevenue = sql<string>`(${sellableQty})::numeric * ${unitSellingPrice}`;
    const lineProfit = sql<string>`(${sellableQty})::numeric * (${unitSellingPrice} - ${unitCost})`;

    const filters = [
        eq(sales.businessId, businessId),
        inArray(sales.status, REVENUE_SALE_STATUSES),
        gte(sales.createdAt, periodStart),
        lte(sales.createdAt, periodEnd),
        isNotNull(saleItems.productId),
        branchSalesFilter(branchId),
    ].filter(Boolean);

    const rows = await db
        .select({
            productId: saleItems.productId,
            qtySold: sql<number>`COALESCE(SUM(${sellableQty}), 0)::int`,
            revenue: sql<string>`COALESCE(SUM(${lineRevenue}), 0)`,
            profit: sql<string>`COALESCE(SUM(${lineProfit}), 0)`,
        })
        .from(saleItems)
        .innerJoin(sales, eq(saleItems.saleId, sales.id))
        .leftJoin(products, eq(saleItems.productId, products.id))
        .where(and(...filters))
        .groupBy(saleItems.productId);

    const map = new Map<string, { qtySold: number; revenue: number; profit: number }>();
    for (const row of rows) {
        if (!row.productId) continue;
        map.set(row.productId, {
            qtySold: Number(row.qtySold ?? 0),
            revenue: Number(row.revenue ?? 0),
            profit: Number(row.profit ?? 0),
        });
    }
    return map;
}

async function aggregateRestockedByProduct(
    businessId: string,
    branchId: string | null | undefined,
    periodStart: Date,
    periodEnd: Date,
): Promise<Map<string, number>> {
    const map = new Map<string, number>();

    const addQty = (productId: string | null, qty: number) => {
        if (!productId || qty <= 0) return;
        map.set(productId, (map.get(productId) ?? 0) + qty);
    };

    const supplyFilters = [
        eq(supplyOrders.businessId, businessId),
        gte(supplyOrders.orderedAt, periodStart),
        lte(supplyOrders.orderedAt, periodEnd),
        isNotNull(supplyOrderLines.productId),
        branchSupplyFilter(branchId),
    ].filter(Boolean);

    const supplyRows = await db
        .select({
            productId: supplyOrderLines.productId,
            qty: sql<number>`COALESCE(SUM(${supplyOrderLines.quantityTotal}), 0)::int`,
        })
        .from(supplyOrderLines)
        .innerJoin(supplyOrders, eq(supplyOrderLines.supplyOrderId, supplyOrders.id))
        .where(and(...supplyFilters))
        .groupBy(supplyOrderLines.productId);

    for (const row of supplyRows) {
        addQty(row.productId, Number(row.qty ?? 0));
    }

    try {
        const returnFilters = [
            eq(saleReturnEvents.businessId, businessId),
            gte(saleReturnEvents.createdAt, periodStart),
            lte(saleReturnEvents.createdAt, periodEnd),
            isNotNull(saleReturnEvents.productId),
            branchReturnFilter(branchId),
        ].filter(Boolean);

        const returnRows = await db
            .select({
                productId: saleReturnEvents.productId,
                qty: sql<number>`COALESCE(SUM(${saleReturnEvents.quantity}), 0)::int`,
            })
            .from(saleReturnEvents)
            .where(and(...returnFilters))
            .groupBy(saleReturnEvents.productId);

        for (const row of returnRows) {
            addQty(row.productId, Number(row.qty ?? 0));
        }
    } catch (err) {
        console.warn("[product-report] sale_return_events unavailable:", err);
    }

    const positiveAdjustment = sql<number>`GREATEST((${stockTakeLines.countedQty} - ${stockTakeLines.systemQtySnapshot})::int, 0)`;

    const stockTakeFilters = [
        eq(stockTakeSessions.businessId, businessId),
        eq(stockTakeSessions.status, "completed"),
        isNotNull(stockTakeSessions.completedAt),
        gte(stockTakeSessions.completedAt, periodStart),
        lte(stockTakeSessions.completedAt, periodEnd),
        branchStockTakeFilter(branchId),
    ].filter(Boolean);

    const stockTakeRows = await db
        .select({
            productId: stockTakeLines.productId,
            qty: sql<number>`COALESCE(SUM(${positiveAdjustment}), 0)::int`,
        })
        .from(stockTakeLines)
        .innerJoin(stockTakeSessions, eq(stockTakeLines.sessionId, stockTakeSessions.id))
        .where(and(...stockTakeFilters))
        .groupBy(stockTakeLines.productId);

    for (const row of stockTakeRows) {
        addQty(row.productId, Number(row.qty ?? 0));
    }

    return map;
}

async function fetchProductRowsByIds(
    businessId: string,
    productIds: string[],
): Promise<
    {
        id: string;
        name: string;
        sku: string;
        barcode: string | null;
        imageSrc: string | null;
        categoryId: string | null;
        categoryName: string | null;
        stock: number;
        priceGhs: string;
        costPriceGhs: string | null;
    }[]
> {
    if (productIds.length === 0) return [];
    return db
        .select({
            id: products.id,
            name: products.name,
            sku: products.sku,
            barcode: products.barcode,
            imageSrc: products.imageSrc,
            categoryId: products.categoryId,
            categoryName: categories.name,
            stock: products.stock,
            priceGhs: products.priceGhs,
            costPriceGhs: products.costPriceGhs,
        })
        .from(products)
        .leftJoin(categories, eq(products.categoryId, categories.id))
        .where(and(eq(products.businessId, businessId), inArray(products.id, productIds)));
}

/** Product rows for IDs seen on sales but missing from catalog (deleted/archived). */
async function fetchSaleLineProductFallbacks(
    businessId: string,
    productIds: string[],
): Promise<
    {
        id: string;
        name: string;
        sku: string;
        barcode: string | null;
        imageSrc: string | null;
        categoryId: string | null;
        categoryName: string | null;
        stock: number;
        priceGhs: string;
        costPriceGhs: string | null;
    }[]
> {
    if (productIds.length === 0) return [];

    const rows = await db
        .select({
            productId: saleItems.productId,
            productName: saleItems.productName,
            unitPriceGhs: saleItems.unitPriceGhs,
        })
        .from(saleItems)
        .innerJoin(sales, eq(saleItems.saleId, sales.id))
        .where(
            and(
                eq(sales.businessId, businessId),
                inArray(saleItems.productId, productIds),
                isNotNull(saleItems.productId),
            ),
        )
        .orderBy(sql`${sales.createdAt} DESC`);

    const seen = new Set<string>();
    const out: {
        id: string;
        name: string;
        sku: string;
        barcode: string | null;
        imageSrc: string | null;
        categoryId: string | null;
        categoryName: string | null;
        stock: number;
        priceGhs: string;
        costPriceGhs: string | null;
    }[] = [];

    for (const row of rows) {
        if (!row.productId || seen.has(row.productId)) continue;
        seen.add(row.productId);
        out.push({
            id: row.productId,
            name: row.productName,
            sku: "—",
            barcode: null,
            imageSrc: null,
            categoryId: null,
            categoryName: null,
            stock: 0,
            priceGhs: row.unitPriceGhs,
            costPriceGhs: null,
        });
    }
    return out;
}

function passesActivityFilter(
    row: ProductReportRow,
    filter: ProductReportActivityFilter,
): boolean {
    if (filter === "sold") return row.qtySold > 0;
    if (filter === "added") return row.qtyAdded > 0;
    if (filter === "activity") return row.qtySold > 0 || row.qtyAdded > 0;
    return true;
}

export async function getProductReport(
    businessId: string,
    branchId: string | null | undefined,
    period: ReportPeriodType,
    referenceDate?: string | null,
    customFrom?: string | null,
    customTo?: string | null,
    categoryId?: string | null,
    activityFilter: ProductReportActivityFilter = "all",
): Promise<ProductReportResult> {
    const resolved = resolveReportPeriod(period, referenceDate, customFrom, customTo);

    const productFilters = [
        eq(products.businessId, businessId),
        branchProductsFilter(branchId),
        categoryId && categoryId !== "all" ? eq(products.categoryId, categoryId) : undefined,
    ].filter(Boolean);

    const catalogRows = await db
        .select({
            id: products.id,
            name: products.name,
            sku: products.sku,
            barcode: products.barcode,
            imageSrc: products.imageSrc,
            categoryId: products.categoryId,
            categoryName: categories.name,
            stock: products.stock,
            priceGhs: products.priceGhs,
            costPriceGhs: products.costPriceGhs,
        })
        .from(products)
        .leftJoin(categories, eq(products.categoryId, categories.id))
        .where(and(...productFilters))
        .orderBy(products.name);

    const [soldMap, addedMap] = await Promise.all([
        aggregateSoldByProduct(businessId, branchId, resolved.start, resolved.end),
        aggregateRestockedByProduct(businessId, branchId, resolved.start, resolved.end),
    ]);

    const catalogIds = new Set(catalogRows.map((p) => p.id));
    const extraIds = [
        ...soldMap.keys(),
        ...addedMap.keys(),
    ].filter((id) => !catalogIds.has(id));
    const uniqueExtra = [...new Set(extraIds)];
    const extraRows = await fetchProductRowsByIds(businessId, uniqueExtra);
    const foundExtraIds = new Set(extraRows.map((r) => r.id));
    const fallbackRows = await fetchSaleLineProductFallbacks(
        businessId,
        uniqueExtra.filter((id) => !foundExtraIds.has(id)),
    );
    const extraById = new Map<string, (typeof catalogRows)[number]>();
    for (const row of [...extraRows, ...fallbackRows]) {
        if (!extraById.has(row.id)) extraById.set(row.id, row);
    }
    const allRows = [...catalogRows, ...extraById.values()];

    const productsOut: ProductReportRow[] = allRows
        .map((p) => {
            const sold = soldMap.get(p.id);
            return {
                id: p.id,
                name: p.name,
                sku: p.sku,
                barcode: p.barcode,
                imageSrc: p.imageSrc,
                categoryId: p.categoryId,
                categoryName: p.categoryName,
                stock: p.stock,
                priceGhs: Number(p.priceGhs),
                costPriceGhs: Number(p.costPriceGhs ?? 0),
                qtySold: sold?.qtySold ?? 0,
                qtyAdded: addedMap.get(p.id) ?? 0,
                revenue: sold?.revenue ?? 0,
                profit: sold?.profit ?? 0,
            };
        })
        .filter((row) => passesActivityFilter(row, activityFilter))
        .sort((a, b) => {
            const aActivity = a.qtySold + a.qtyAdded;
            const bActivity = b.qtySold + b.qtyAdded;
            if (bActivity !== aActivity) return bActivity - aActivity;
            return a.name.localeCompare(b.name);
        });

    return {
        period: resolved,
        products: productsOut,
    };
}
