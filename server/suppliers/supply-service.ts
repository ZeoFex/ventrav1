import { eq, and, desc, sql } from "drizzle-orm";
import { db } from "../db";
import { supplyOrders, supplyOrderLines } from "../db/schema/suppliers";
import { products } from "../db/schema/products";
import { invalidatePosBusinessCaches } from "../pos/pos-service";

export async function getSupplierOutstandingGhs(businessId: string, supplierId: string): Promise<number> {
    const [row] = await db
        .select({
            owed: sql<string>`COALESCE(SUM((${supplyOrders.totalCostGhs}::numeric) - (${supplyOrders.amountPaidGhs}::numeric)), 0)`,
        })
        .from(supplyOrders)
        .where(
            and(eq(supplyOrders.businessId, businessId), eq(supplyOrders.supplierId, supplierId)),
        );
    return Number(row?.owed ?? 0);
}

export type SupplyLineInput = {
    productId: string | null;
    productName: string;
    categoryName?: string | null;
    cartons: number;
    itemsPerCarton: number;
    quantityTotal: number;
    unitCostGhs: number;
    lineTotalGhs: number;
    batchNo?: string | null;
    expiryDate?: string | null;
    notes?: string | null;
};

function derivePaymentStatus(total: number, paid: number): "unpaid" | "partial" | "paid" {
    if (paid <= 0) return "unpaid";
    if (paid + 0.009 >= total) return "paid";
    return "partial";
}

/**
 * Create a supply (GRN): persist order + lines and increase product stock in one transaction.
 * Idempotent when idempotencyKey is set and matches an existing order for the business.
 */
export async function createSupplyOrder(input: {
    businessId: string;
    branchId?: string | null;
    supplierId: string;
    reference: string;
    amountPaidGhs: number;
    notes?: string | null;
    paymentMethod?: string | null;
    idempotencyKey?: string | null;
    lines: SupplyLineInput[];
}) {
    const lines = input.lines.filter((l) => l.quantityTotal > 0);
    if (lines.length === 0) throw new Error("EMPTY_LINES");

    const totalCost = lines.reduce((s, l) => s + l.lineTotalGhs, 0);
    const totalUnitsSupplied = lines.reduce((s, l) => s + Math.floor(l.quantityTotal), 0);
    const paid = Math.max(0, input.amountPaidGhs);
    const paymentStatus = derivePaymentStatus(totalCost, paid);

    const result = await db.transaction(async (tx) => {
        if (input.idempotencyKey?.trim()) {
            const [dup] = await tx
                .select({ id: supplyOrders.id })
                .from(supplyOrders)
                .where(
                    and(
                        eq(supplyOrders.businessId, input.businessId),
                        eq(supplyOrders.idempotencyKey, input.idempotencyKey.trim()),
                    ),
                )
                .limit(1);
            if (dup) {
                return { orderId: dup.id, idempotent: true as const };
            }
        }

        const [order] = await tx
            .insert(supplyOrders)
            .values({
                businessId: input.businessId,
                branchId: input.branchId ?? null,
                supplierId: input.supplierId,
                reference: input.reference.trim().slice(0, 80),
                paymentStatus,
                amountPaidGhs: String(paid),
                totalCostGhs: String(totalCost),
                totalLineItems: lines.length,
                totalUnitsSupplied,
                notes: input.notes?.trim() || null,
                paymentMethod: input.paymentMethod?.trim().slice(0, 30) || null,
                idempotencyKey: input.idempotencyKey?.trim() || null,
            })
            .returning({ id: supplyOrders.id });

        if (!order) throw new Error("ORDER_INSERT_FAILED");

        await tx.insert(supplyOrderLines).values(
            lines.map((l) => ({
                supplyOrderId: order.id,
                productId: l.productId,
                productName: l.productName.slice(0, 255),
                categoryName: l.categoryName?.slice(0, 100) || null,
                cartons: Math.max(0, Math.floor(l.cartons)),
                itemsPerCarton: Math.max(1, Math.floor(l.itemsPerCarton)),
                quantityTotal: Math.floor(l.quantityTotal),
                unitCostGhs: String(l.unitCostGhs),
                lineTotalGhs: String(l.lineTotalGhs),
                batchNo: l.batchNo?.slice(0, 80) || null,
                expiryDate: l.expiryDate ? l.expiryDate.slice(0, 10) : null,
                notes: l.notes?.trim() || null,
            })),
        );

        for (const l of lines) {
            if (!l.productId) continue;
            await tx
                .update(products)
                .set({
                    stock: sql`${products.stock} + ${Math.floor(l.quantityTotal)}`,
                    updatedAt: new Date(),
                })
                .where(and(eq(products.id, l.productId), eq(products.businessId, input.businessId)));
        }

        return { orderId: order.id, idempotent: false as const };
    });

    if (!result.idempotent) {
        await invalidatePosBusinessCaches(input.businessId, input.branchId);
    }

    return result;
}

export async function listSupplyOrdersForSupplier(
    businessId: string,
    supplierId: string,
    limit = 50,
) {
    return db
        .select()
        .from(supplyOrders)
        .where(and(eq(supplyOrders.businessId, businessId), eq(supplyOrders.supplierId, supplierId)))
        .orderBy(desc(supplyOrders.orderedAt))
        .limit(limit);
}

export async function getSupplyOrderDetail(businessId: string, orderId: string) {
    const [order] = await db
        .select()
        .from(supplyOrders)
        .where(and(eq(supplyOrders.id, orderId), eq(supplyOrders.businessId, businessId)))
        .limit(1);

    if (!order) return null;

    const lines = await db
        .select()
        .from(supplyOrderLines)
        .where(eq(supplyOrderLines.supplyOrderId, orderId));

    return { order, lines };
}
