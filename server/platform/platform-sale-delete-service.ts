import { and, count, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { db } from "../db";
import { products, productVariations } from "../db/schema/products";
import { sales, saleItems } from "../db/schema/sales";
import { customers } from "../db/schema/customers";
import { customerAccountEntries } from "../db/schema/customer-account-entries";
import { invalidatePosBusinessCaches } from "../pos/pos-service";
import { invalidateBusinessConfig } from "../businesses/business-service";
import { invalidateCustomerCaches } from "../customers/customer-account-service";

export type PlatformDeleteSalesResult = {
    deletedSales: number;
    deletedIds: string[];
    restockedUnits: number;
    restockedLines: {
        saleId: string;
        productId: string | null;
        productName: string;
        quantityRestored: number;
    }[];
};

/**
 * Hard-delete selected sales for a business.
 * When `restock` is true, restore sellable units (quantity − already returned) to product/variation stock.
 */
export async function platformDeleteBusinessSales(opts: {
    businessId: string;
    saleIds: string[];
    restock: boolean;
}): Promise<PlatformDeleteSalesResult> {
    const ids = Array.from(new Set(opts.saleIds));
    if (ids.length === 0) {
        return { deletedSales: 0, deletedIds: [], restockedUnits: 0, restockedLines: [] };
    }

    const restockedLines: PlatformDeleteSalesResult["restockedLines"] = [];
    let restockedUnits = 0;
    const affectedCustomerIds: string[] = [];

    const deletedIds = await db.transaction(async (tx) => {
        const owned = await tx
            .select({
                id: sales.id,
                customerId: sales.customerId,
                invoiceId: sales.invoiceId,
            })
            .from(sales)
            .where(and(eq(sales.businessId, opts.businessId), inArray(sales.id, ids)));

        const ownedIds = owned.map((s) => s.id);
        if (ownedIds.length === 0) return [] as string[];

        const invoiceNotes = owned.map((s) => `Balance from invoice ${s.invoiceId}`);
        const linkedEntries = await tx
            .select({
                id: customerAccountEntries.id,
                customerId: customerAccountEntries.customerId,
            })
            .from(customerAccountEntries)
            .where(
                and(
                    eq(customerAccountEntries.businessId, opts.businessId),
                    or(
                        inArray(customerAccountEntries.saleId, ownedIds),
                        invoiceNotes.length
                            ? inArray(customerAccountEntries.note, invoiceNotes)
                            : sql`false`,
                    ),
                ),
            );

        for (const row of [...owned, ...linkedEntries]) {
            if (row.customerId && !affectedCustomerIds.includes(row.customerId)) {
                affectedCustomerIds.push(row.customerId);
            }
        }

        const linkedIds = linkedEntries.map((e) => e.id);
        if (linkedIds.length > 0) {
            await tx
                .delete(customerAccountEntries)
                .where(inArray(customerAccountEntries.id, linkedIds));
        }

        if (opts.restock) {
            const lines = await tx
                .select({
                    saleId: saleItems.saleId,
                    productId: saleItems.productId,
                    variationId: saleItems.variationId,
                    productName: saleItems.productName,
                    quantity: saleItems.quantity,
                    quantityReturned: saleItems.quantityReturned,
                })
                .from(saleItems)
                .where(inArray(saleItems.saleId, ownedIds));

            for (const line of lines) {
                const restoreQty = Math.max(0, line.quantity - (line.quantityReturned ?? 0));
                if (restoreQty <= 0) continue;

                if (line.variationId) {
                    await tx
                        .update(productVariations)
                        .set({
                            stock: sql`${productVariations.stock} + ${restoreQty}`,
                            updatedAt: new Date(),
                        })
                        .where(eq(productVariations.id, line.variationId));
                } else if (line.productId) {
                    await tx
                        .update(products)
                        .set({
                            stock: sql`${products.stock} + ${restoreQty}`,
                            updatedAt: new Date(),
                        })
                        .where(
                            and(
                                eq(products.id, line.productId),
                                eq(products.businessId, opts.businessId),
                            ),
                        );
                }

                restockedUnits += restoreQty;
                restockedLines.push({
                    saleId: line.saleId,
                    productId: line.productId,
                    productName: line.productName,
                    quantityRestored: restoreQty,
                });
            }
        }

        const deleted = await tx
            .delete(sales)
            .where(and(eq(sales.businessId, opts.businessId), inArray(sales.id, ownedIds)))
            .returning({ id: sales.id });

        await reconcileCustomerLedgers(tx, opts.businessId, affectedCustomerIds);

        return deleted.map((d) => d.id);
    });

    if (deletedIds.length > 0) {
        await invalidatePosBusinessCaches(opts.businessId);
        if (opts.restock) {
            await invalidateBusinessConfig(opts.businessId);
        }
        await invalidateCustomerCaches(opts.businessId);
        await Promise.all(
            affectedCustomerIds.map((customerId) =>
                invalidateCustomerCaches(opts.businessId, customerId),
            ),
        );
    }

    return {
        deletedSales: deletedIds.length,
        deletedIds,
        restockedUnits,
        restockedLines,
    };
}

/**
 * Wipe every sale for a business (optional restock of all remaining sellable units).
 */
export async function platformWipeBusinessSales(opts: {
    businessId: string;
    restock: boolean;
}): Promise<PlatformDeleteSalesResult> {
    const all = await db
        .select({ id: sales.id })
        .from(sales)
        .where(eq(sales.businessId, opts.businessId));

    return platformDeleteBusinessSales({
        businessId: opts.businessId,
        saleIds: all.map((s) => s.id),
        restock: opts.restock,
    });
}

/**
 * After sales are gone: drop orphaned charges and leftover payments so the
 * customer Account ledger matches remaining sales (including empty).
 */
async function reconcileCustomerLedgers(
    tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
    businessId: string,
    customerIds: string[],
) {
    for (const customerId of customerIds) {
        const [remainingSales] = await tx
            .select({ n: count() })
            .from(sales)
            .where(and(eq(sales.businessId, businessId), eq(sales.customerId, customerId)));

        const noSalesLeft = Number(remainingSales?.n ?? 0) === 0;

        if (noSalesLeft) {
            await tx
                .delete(customerAccountEntries)
                .where(
                    and(
                        eq(customerAccountEntries.businessId, businessId),
                        eq(customerAccountEntries.customerId, customerId),
                    ),
                );
            await tx
                .update(customers)
                .set({ accountsReceivableGhs: "0", updatedAt: new Date() })
                .where(and(eq(customers.id, customerId), eq(customers.businessId, businessId)));
            continue;
        }

        // Charges whose sale was deleted land here as sale_id NULL (FK SET NULL).
        await tx
            .delete(customerAccountEntries)
            .where(
                and(
                    eq(customerAccountEntries.businessId, businessId),
                    eq(customerAccountEntries.customerId, customerId),
                    eq(customerAccountEntries.kind, "sale_charge"),
                    isNull(customerAccountEntries.saleId),
                ),
            );

        const [remainingCharge] = await tx
            .select({ id: customerAccountEntries.id })
            .from(customerAccountEntries)
            .where(
                and(
                    eq(customerAccountEntries.businessId, businessId),
                    eq(customerAccountEntries.customerId, customerId),
                    eq(customerAccountEntries.kind, "sale_charge"),
                ),
            )
            .limit(1);

        if (!remainingCharge) {
            await tx
                .delete(customerAccountEntries)
                .where(
                    and(
                        eq(customerAccountEntries.businessId, businessId),
                        eq(customerAccountEntries.customerId, customerId),
                    ),
                );
            await tx
                .update(customers)
                .set({ accountsReceivableGhs: "0", updatedAt: new Date() })
                .where(and(eq(customers.id, customerId), eq(customers.businessId, businessId)));
            continue;
        }

        const [agg] = await tx
            .select({
                charges: sql<string>`coalesce(sum(case when ${customerAccountEntries.kind} = 'sale_charge' then ${customerAccountEntries.amountGhs}::numeric else 0 end), 0)`,
                payments: sql<string>`coalesce(sum(case when ${customerAccountEntries.kind} = 'payment_received' then ${customerAccountEntries.amountGhs}::numeric else 0 end), 0)`,
            })
            .from(customerAccountEntries)
            .where(
                and(
                    eq(customerAccountEntries.businessId, businessId),
                    eq(customerAccountEntries.customerId, customerId),
                ),
            );

        const ar =
            Math.round(
                Math.max(0, Number(agg?.charges ?? 0) - Number(agg?.payments ?? 0)) * 100,
            ) / 100;

        await tx
            .update(customers)
            .set({ accountsReceivableGhs: String(ar), updatedAt: new Date() })
            .where(and(eq(customers.id, customerId), eq(customers.businessId, businessId)));
    }
}
