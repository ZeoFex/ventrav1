import { db } from "@/server/db";
import { supplyOrders, supplyOrderLines } from "@/server/db/schema/suppliers";
import { and, eq, isNotNull, lte, sql } from "drizzle-orm";

export type ExpiringLine = {
    lineId: string;
    productId: string | null;
    productName: string;
    expiryDate: string;
    quantityTotal: number;
    batchNo: string | null;
    orderReference: string;
    daysUntilExpiry: number;
};

export async function getExpiringInventory(
    businessId: string,
    days: number,
    branchId?: string | null,
): Promise<ExpiringLine[]> {
    const safeDays = Math.max(1, Math.min(days, 365));
    const cutoff = sql`CURRENT_DATE + ${safeDays}::int`;

    const filters = [
        eq(supplyOrders.businessId, businessId),
        isNotNull(supplyOrderLines.expiryDate),
        lte(supplyOrderLines.expiryDate, cutoff),
    ];

    if (branchId && branchId !== "all") {
        filters.push(eq(supplyOrders.branchId, branchId));
    }

    const rows = await db
        .select({
            lineId: supplyOrderLines.id,
            productId: supplyOrderLines.productId,
            productName: supplyOrderLines.productName,
            expiryDate: supplyOrderLines.expiryDate,
            quantityTotal: supplyOrderLines.quantityTotal,
            batchNo: supplyOrderLines.batchNo,
            orderReference: supplyOrders.reference,
            daysUntilExpiry: sql<number>`(${supplyOrderLines.expiryDate} - CURRENT_DATE)::int`,
        })
        .from(supplyOrderLines)
        .innerJoin(supplyOrders, eq(supplyOrderLines.supplyOrderId, supplyOrders.id))
        .where(and(...filters))
        .orderBy(supplyOrderLines.expiryDate);

    return rows.map((r) => ({
        lineId: r.lineId,
        productId: r.productId,
        productName: r.productName,
        expiryDate: r.expiryDate!,
        quantityTotal: r.quantityTotal,
        batchNo: r.batchNo,
        orderReference: r.orderReference,
        daysUntilExpiry: r.daysUntilExpiry,
    }));
}
