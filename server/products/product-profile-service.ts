import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db";
import { customers } from "../db/schema/customers";
import {
    products,
    productVariations,
    categories,
    subcategories,
} from "../db/schema/products";
import { sales, saleItems, REVENUE_SALE_STATUSES } from "../db/schema/sales";
import { getProductAnalytics } from "../reports/product-analytics-service";
import { sellableUnits } from "../stock/sellable-stock";

function branchFilter(branchId?: string | null) {
    return branchId && branchId !== "all" ? eq(sales.branchId, branchId) : undefined;
}

function money(v: unknown): number {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
}

function qty(v: unknown): number {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
}

export async function getProductProfile(
    businessId: string,
    productId: string,
    branchId?: string | null,
) {
    const analytics = await getProductAnalytics(businessId, productId, branchId);
    if (!analytics) return null;

    const sellableQty = sql<number>`(${saleItems.quantity} - ${saleItems.quantityReturned})::int`;
    const lineRevenue = sql<string>`(${sellableQty})::numeric * ${saleItems.unitPriceGhs}::numeric`;
    const scope = and(
        eq(sales.businessId, businessId),
        eq(saleItems.productId, productId),
        inArray(sales.status, REVENUE_SALE_STATUSES),
        branchFilter(branchId),
    );

    const [countRow, receipts, buyers, catalog, variations] = await Promise.all([
        db
            .select({
                salesCount: sql<number>`count(distinct ${sales.id})::int`,
                lastSoldAt: sql<string | null>`max(${sales.createdAt})`,
                firstSoldAt: sql<string | null>`min(${sales.createdAt})`,
            })
            .from(saleItems)
            .innerJoin(sales, eq(saleItems.saleId, sales.id))
            .where(scope)
            .then((rows) => rows[0]),
        db
            .select({
                id: sales.id,
                invoiceId: sales.invoiceId,
                createdAt: sales.createdAt,
                status: sales.status,
                quantity: sql<number>`(${saleItems.quantity} - ${saleItems.quantityReturned})::int`,
                unitPriceGhs: saleItems.unitPriceGhs,
                lineTotalGhs: sql<string>`((${saleItems.quantity} - ${saleItems.quantityReturned})::numeric * ${saleItems.unitPriceGhs}::numeric)`,
                customerName: customers.name,
            })
            .from(saleItems)
            .innerJoin(sales, eq(saleItems.saleId, sales.id))
            .leftJoin(customers, eq(sales.customerId, customers.id))
            .where(scope)
            .orderBy(desc(sales.createdAt))
            .limit(150),
        db
            .select({
                customerId: sales.customerId,
                customerName: customers.name,
                salesCount: sql<number>`count(distinct ${sales.id})::int`,
                quantity: sql<number>`coalesce(sum(${sellableQty}), 0)::int`,
                spentGhs: sql<string>`coalesce(sum(${lineRevenue}), 0)`,
            })
            .from(saleItems)
            .innerJoin(sales, eq(saleItems.saleId, sales.id))
            .innerJoin(customers, eq(sales.customerId, customers.id))
            .where(scope)
            .groupBy(sales.customerId, customers.name)
            .orderBy(sql`sum(${sellableQty}) desc`)
            .limit(30),
        db
            .select({
                unit: products.unit,
                description: products.description,
                stock: products.stock,
                stockReserved: products.stockReserved,
                reorderAt: products.reorderAt,
                priceGhs: products.priceGhs,
                costPriceGhs: products.costPriceGhs,
                categoryName: categories.name,
                subcategoryName: subcategories.name,
            })
            .from(products)
            .leftJoin(categories, eq(products.categoryId, categories.id))
            .leftJoin(subcategories, eq(products.subcategoryId, subcategories.id))
            .where(and(eq(products.id, productId), eq(products.businessId, businessId)))
            .then((rows) => rows[0] ?? null),
        db
            .select({
                id: productVariations.id,
                name: productVariations.name,
                type: productVariations.type,
                priceGhs: productVariations.priceGhs,
                stock: productVariations.stock,
                stockReserved: productVariations.stockReserved,
                sku: productVariations.sku,
                barcode: productVariations.barcode,
            })
            .from(productVariations)
            .where(eq(productVariations.productId, productId)),
    ]);

    const stock = qty(catalog?.stock ?? analytics.product.stock);
    const stockReserved = qty(catalog?.stockReserved);
    const variationRows = variations.map((v) => {
        const vStock = qty(v.stock);
        const vReserved = qty(v.stockReserved);
        return {
            id: v.id,
            name: v.name,
            type: v.type,
            sku: v.sku,
            barcode: v.barcode,
            priceGhs: v.priceGhs != null ? money(v.priceGhs) : null,
            stock: vStock,
            stockReserved: vReserved,
            stockAvailable: sellableUnits(vStock, vReserved),
        };
    });
    const variationStock = variationRows.reduce((sum, v) => sum + v.stock, 0);
    const displayStock = variationRows.length > 0 ? variationStock : stock;
    const sellingPrice = money(catalog?.priceGhs ?? analytics.product.sellingPriceGhs);
    const costPrice = money(catalog?.costPriceGhs ?? analytics.product.costPriceGhs);

    return {
        ...analytics,
        product: {
            ...analytics.product,
            stock: displayStock,
            stockOnHand: stock,
            stockReserved,
            stockAvailable: sellableUnits(stock, stockReserved),
            costPriceGhs: costPrice,
            sellingPriceGhs: sellingPrice,
            priceGhs: sellingPrice,
            unit: catalog?.unit ?? "piece",
            description: catalog?.description ?? null,
            reorderAt: catalog?.reorderAt ?? 5,
            categoryName: catalog?.categoryName ?? null,
            subcategoryName: catalog?.subcategoryName ?? null,
        },
        variations: variationRows,
        salesCount: qty(countRow?.salesCount),
        lastSoldAt: countRow?.lastSoldAt ?? null,
        firstSoldAt: countRow?.firstSoldAt ?? null,
        receipts: receipts.map((r) => ({
            id: r.id,
            invoiceId: r.invoiceId,
            createdAt: r.createdAt,
            status: r.status,
            quantity: qty(r.quantity),
            unitPriceGhs: money(r.unitPriceGhs),
            lineTotalGhs: money(r.lineTotalGhs),
            customerName: r.customerName,
        })),
        buyers: buyers.map((b) => ({
            customerId: b.customerId,
            customerName: b.customerName,
            salesCount: qty(b.salesCount),
            quantity: qty(b.quantity),
            spentGhs: money(b.spentGhs),
        })),
    };
}
