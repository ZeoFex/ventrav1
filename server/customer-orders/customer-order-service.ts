import { eq, and, desc, ne, sql } from "drizzle-orm";
import { db } from "../db";
import {
    customerOrders,
    customerOrderLines,
    customerOrderPaymentLines,
} from "../db/schema/customer-orders";
import { products, productVariations } from "../db/schema/products";
import { customers } from "../db/schema/customers";
import { sales, saleItems, salePaymentLines } from "../db/schema/sales";
import { notifications } from "../db/schema/notifications";
import { sellableUnits } from "../stock/sellable-stock";
import { invalidatePosBusinessCaches } from "../pos/pos-service";

function roundMoney(n: number): number {
    return Math.round(n * 100) / 100;
}

export type CustomerOrderLineInput = {
    productId: string;
    variationId?: string | null;
    quantity: number;
    productName: string;
    unitPriceGhs: number;
    lineTotalGhs: number;
};

export type CustomerOrderPaymentLineInput = {
    paymentMethod: string;
    amountGhs: number;
};

export type CreateCustomerOrderInput = {
    invoiceId?: string;
    /** Money fields from POS totals (already computed). */
    subtotalGhs: number;
    taxGhs: number;
    discountGhs: number;
    totalGhs: number;
    customerId: string;
    lines: CustomerOrderLineInput[];
    /** Optional initial payment(s); may be empty (order still reserves stock). */
    paymentLines?: CustomerOrderPaymentLineInput[];
};

function normalizePaymentLines(
    paymentLines: CustomerOrderPaymentLineInput[] | undefined,
): { paymentMethod: string; amountGhs: number }[] {
    if (!paymentLines || paymentLines.length === 0) return [];
    return paymentLines.map((l) => ({
        paymentMethod: l.paymentMethod.trim(),
        amountGhs: roundMoney(Number(l.amountGhs)),
    }));
}

function assertPositiveMoneyLines(
    lines: { paymentMethod: string; amountGhs: number }[],
) {
    for (const pl of lines) {
        if (!pl.paymentMethod || pl.paymentMethod.length > 30) {
            throw new Error("Invalid payment method");
        }
        if (!Number.isFinite(pl.amountGhs) || pl.amountGhs <= 0) {
            throw new Error("Each payment amount must be positive");
        }
    }
}

// Drizzle transaction type varies by adapter; keep helpers loosely typed.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function reserveLinesInTxn(tx: any, businessId: string, lines: CustomerOrderLineInput[]) {
    for (const line of lines) {
        if (line.quantity <= 0) continue;
        if (line.variationId) {
            const [vr] = await tx
                .select({
                    stock: productVariations.stock,
                    stockReserved: productVariations.stockReserved,
                    productId: productVariations.productId,
                })
                .from(productVariations)
                .where(eq(productVariations.id, line.variationId))
                .limit(1);
            if (!vr) throw new Error("Invalid product variation");
            const [p] = await tx
                .select({ businessId: products.businessId })
                .from(products)
                .where(eq(products.id, vr.productId))
                .limit(1);
            if (!p || p.businessId !== businessId) {
                throw new Error("Product does not belong to this business");
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
                    stockReserved: sql`${productVariations.stockReserved} + ${line.quantity}`,
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
            if (!pr) throw new Error("Product not found");
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
                    stockReserved: sql`${products.stockReserved} + ${line.quantity}`,
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
}

async function releaseReservationForLines(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    tx: any,
    businessId: string,
    lines: { productId: string | null; variationId: string | null; quantity: number }[],
) {
    for (const line of lines) {
        if (line.quantity <= 0) continue;
        if (line.variationId) {
            await tx
                .update(productVariations)
                .set({
                    stockReserved: sql`GREATEST(0, ${productVariations.stockReserved} - ${line.quantity})`,
                    updatedAt: new Date(),
                })
                .where(eq(productVariations.id, line.variationId));
        } else if (line.productId) {
            await tx
                .update(products)
                .set({
                    stockReserved: sql`GREATEST(0, ${products.stockReserved} - ${line.quantity})`,
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
}

export async function createCustomerOrder(
    businessId: string,
    branchId: string | null,
    userId: string | null,
    input: CreateCustomerOrderInput,
): Promise<{
    orderId: string;
    invoiceId: string;
    amountPaidGhs: number;
    balanceDueGhs: number;
    totalGhs: number;
}> {
    if (!input.customerId?.trim()) {
        throw new Error("Customer is required for customer orders");
    }
    if (!input.lines || input.lines.length === 0) {
        throw new Error("Order must include at least one line");
    }

    const normalizedPay = normalizePaymentLines(input.paymentLines);
    assertPositiveMoneyLines(normalizedPay);

    const totalDue = roundMoney(Number(input.totalGhs));
    const collected = roundMoney(
        normalizedPay.reduce((s, l) => s + l.amountGhs, 0),
    );
    const amountApplied = roundMoney(Math.min(collected, totalDue));
    const balanceDue = roundMoney(Math.max(0, totalDue - collected));

    const invoiceId =
        input.invoiceId?.trim() ||
        `ORD-${Date.now().toString(36).toUpperCase()}`;

    const initialStatus =
        balanceDue <= 0.02 ? "ready_for_pickup" : "open";

    const orderId = await db.transaction(async (tx) => {
        const [cust] = await tx
            .select({ id: customers.id })
            .from(customers)
            .where(
                and(
                    eq(customers.id, input.customerId),
                    eq(customers.businessId, businessId),
                ),
            )
            .limit(1);
        if (!cust) throw new Error("Customer not found");

        await reserveLinesInTxn(tx, businessId, input.lines);

        const now = new Date();
        const [order] = await tx
            .insert(customerOrders)
            .values({
                businessId,
                branchId,
                customerId: input.customerId,
                userId,
                invoiceId,
                status: initialStatus,
                subtotalGhs: String(input.subtotalGhs),
                taxGhs: String(input.taxGhs),
                discountGhs: String(input.discountGhs),
                totalGhs: String(totalDue),
                amountPaidGhs: String(amountApplied),
                balanceDueGhs: String(balanceDue),
                updatedAt: now,
            })
            .returning({ id: customerOrders.id });

        await tx.insert(customerOrderLines).values(
            input.lines.map((l) => ({
                customerOrderId: order.id,
                productId: l.productId,
                variationId: l.variationId || null,
                productName: l.productName,
                quantity: l.quantity,
                unitPriceGhs: String(l.unitPriceGhs),
                lineTotalGhs: String(l.lineTotalGhs),
            })),
        );

        if (normalizedPay.length > 0) {
            await tx.insert(customerOrderPaymentLines).values(
                normalizedPay.map((l, i) => ({
                    customerOrderId: order.id,
                    paymentMethod: l.paymentMethod,
                    amountGhs: String(l.amountGhs),
                    sortOrder: i,
                })),
            );
        }

        await tx.insert(notifications).values({
            businessId,
            branchId,
            title: "Customer order created",
            body: `${invoiceId} — GHS ${totalDue} (${initialStatus === "ready_for_pickup" ? "paid, awaiting pickup" : `GHS ${balanceDue} balance`}).`,
            icon: "receipt",
        });

        return order.id;
    });

    await invalidatePosBusinessCaches(businessId, branchId);
    return {
        orderId,
        invoiceId,
        amountPaidGhs: amountApplied,
        balanceDueGhs: balanceDue,
        totalGhs: totalDue,
    };
}

export async function addCustomerOrderPayment(
    businessId: string,
    branchId: string | null,
    orderId: string,
    paymentLines: CustomerOrderPaymentLineInput[],
): Promise<{
    invoiceId: string;
    amountPaidGhs: number;
    balanceDueGhs: number;
    totalGhs: number;
}> {
    const normalizedPay = normalizePaymentLines(paymentLines);
    if (normalizedPay.length === 0) {
        throw new Error("No payment lines provided");
    }
    assertPositiveMoneyLines(normalizedPay);

    const extra = roundMoney(
        normalizedPay.reduce((s, l) => s + l.amountGhs, 0),
    );

    const summary = await db.transaction(async (tx) => {
        const [order] = await tx
            .select()
            .from(customerOrders)
            .where(
                and(
                    eq(customerOrders.id, orderId),
                    eq(customerOrders.businessId, businessId),
                ),
            )
            .limit(1);
        if (!order) throw new Error("Order not found");
        if (order.status !== "open") {
            throw new Error("Payments can only be added to open orders");
        }

        const totalDue = roundMoney(Number(order.totalGhs));
        const paidSoFar = roundMoney(Number(order.amountPaidGhs));
        const balance = roundMoney(Number(order.balanceDueGhs));

        if (extra > balance + 0.02) {
            throw new Error("Payment exceeds balance due");
        }

        const existingPayRows = await tx
            .select({ sortOrder: customerOrderPaymentLines.sortOrder })
            .from(customerOrderPaymentLines)
            .where(eq(customerOrderPaymentLines.customerOrderId, orderId));
        const startSort =
            existingPayRows.length === 0
                ? 0
                : Math.max(...existingPayRows.map((r) => r.sortOrder)) + 1;

        await tx.insert(customerOrderPaymentLines).values(
            normalizedPay.map((l, i) => ({
                customerOrderId: orderId,
                paymentMethod: l.paymentMethod,
                amountGhs: String(l.amountGhs),
                sortOrder: startSort + i,
            })),
        );

        const newPaid = roundMoney(paidSoFar + extra);
        const newBalance = roundMoney(Math.max(0, totalDue - newPaid));
        const newStatus = newBalance <= 0.02 ? "ready_for_pickup" : "open";

        await tx
            .update(customerOrders)
            .set({
                amountPaidGhs: String(newPaid),
                balanceDueGhs: String(newBalance),
                status: newStatus,
                updatedAt: new Date(),
            })
            .where(eq(customerOrders.id, orderId));

        return {
            invoiceId: order.invoiceId,
            amountPaidGhs: newPaid,
            balanceDueGhs: newBalance,
            totalGhs: totalDue,
        };
    });

    await invalidatePosBusinessCaches(businessId, branchId);
    return summary;
}

export async function finalizeCustomerOrder(
    businessId: string,
    branchId: string | null,
    userId: string | null,
    orderId: string,
): Promise<{ saleId: string }> {
    const saleInvoice = `INV-${Date.now().toString(36).toUpperCase()}`;

    const { saleId } = await db.transaction(async (tx) => {
        const [order] = await tx
            .select()
            .from(customerOrders)
            .where(
                and(
                    eq(customerOrders.id, orderId),
                    eq(customerOrders.businessId, businessId),
                ),
            )
            .limit(1);
        if (!order) throw new Error("Order not found");
        if (order.status !== "ready_for_pickup") {
            throw new Error("Order must be fully paid before pickup");
        }
        if (roundMoney(Number(order.balanceDueGhs)) > 0.02) {
            throw new Error("Order still has a balance due");
        }

        const lines = await tx
            .select()
            .from(customerOrderLines)
            .where(eq(customerOrderLines.customerOrderId, orderId));

        for (const line of lines) {
            const qty = line.quantity;
            if (qty <= 0) continue;
            if (line.variationId) {
                const [vr] = await tx
                    .select({
                        stock: productVariations.stock,
                        stockReserved: productVariations.stockReserved,
                    })
                    .from(productVariations)
                    .where(eq(productVariations.id, line.variationId))
                    .limit(1);
                if (!vr) throw new Error("Variation missing");
                if (Number(vr.stock) < qty || Number(vr.stockReserved) < qty) {
                    throw new Error(
                        `Stock mismatch for ${line.productName} — cannot complete pickup`,
                    );
                }
                await tx
                    .update(productVariations)
                    .set({
                        stock: sql`${productVariations.stock} - ${qty}`,
                        stockReserved: sql`${productVariations.stockReserved} - ${qty}`,
                        updatedAt: new Date(),
                    })
                    .where(eq(productVariations.id, line.variationId));
            } else if (line.productId) {
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
                if (!pr) throw new Error("Product missing");
                if (Number(pr.stock) < qty || Number(pr.stockReserved) < qty) {
                    throw new Error(
                        `Stock mismatch for ${line.productName} — cannot complete pickup`,
                    );
                }
                await tx
                    .update(products)
                    .set({
                        stock: sql`${products.stock} - ${qty}`,
                        stockReserved: sql`${products.stockReserved} - ${qty}`,
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

        const totalGhs = roundMoney(Number(order.totalGhs));
        const itemCount = lines.reduce((s, l) => s + l.quantity, 0);

        const [sale] = await tx
            .insert(sales)
            .values({
                businessId,
                branchId: order.branchId,
                userId,
                invoiceId: saleInvoice,
                subtotalGhs: order.subtotalGhs,
                taxGhs: order.taxGhs,
                discountGhs: order.discountGhs,
                totalGhs: order.totalGhs,
                paymentMethod: "prepaid_order",
                amountPaidGhs: String(totalGhs),
                balanceDueGhs: "0",
                itemCount,
                customerId: order.customerId,
            })
            .returning({ id: sales.id });

        await tx.insert(saleItems).values(
            lines.map((l) => ({
                saleId: sale.id,
                productId: l.productId,
                variationId: l.variationId,
                productName: l.productName,
                quantity: l.quantity,
                unitPriceGhs: l.unitPriceGhs,
                lineTotalGhs: l.lineTotalGhs,
            })),
        );

        await tx.insert(salePaymentLines).values({
            saleId: sale.id,
            paymentMethod: "prepaid_order",
            amountGhs: String(totalGhs),
            sortOrder: 0,
        });

        await tx
            .update(customerOrders)
            .set({
                status: "completed",
                completedSaleId: sale.id,
                updatedAt: new Date(),
            })
            .where(eq(customerOrders.id, orderId));

        await tx.insert(notifications).values({
            businessId,
            branchId: order.branchId,
            title: "Customer order completed",
            body: `${order.invoiceId} fulfilled — sale ${saleInvoice}.`,
            icon: "receipt",
        });

        return { saleId: sale.id };
    });

    await invalidatePosBusinessCaches(businessId, branchId);
    return { saleId };
}

export async function cancelCustomerOrder(
    businessId: string,
    branchId: string | null,
    orderId: string,
) {
    await db.transaction(async (tx) => {
        const [order] = await tx
            .select()
            .from(customerOrders)
            .where(
                and(
                    eq(customerOrders.id, orderId),
                    eq(customerOrders.businessId, businessId),
                ),
            )
            .limit(1);
        if (!order) throw new Error("Order not found");
        if (order.status === "completed" || order.status === "cancelled") {
            throw new Error("Order cannot be cancelled");
        }

        const lines = await tx
            .select()
            .from(customerOrderLines)
            .where(eq(customerOrderLines.customerOrderId, orderId));

        await releaseReservationForLines(
            tx,
            businessId,
            lines.map((l) => ({
                productId: l.productId,
                variationId: l.variationId,
                quantity: l.quantity,
            })),
        );

        await tx
            .update(customerOrders)
            .set({
                status: "cancelled",
                updatedAt: new Date(),
            })
            .where(eq(customerOrders.id, orderId));

        await tx.insert(notifications).values({
            businessId,
            branchId: order.branchId,
            title: "Customer order cancelled",
            body: `${order.invoiceId} was cancelled; stock reservation released.`,
            icon: "receipt",
        });
    });

    await invalidatePosBusinessCaches(businessId, branchId);
}

/** Count layaway orders paid in full and awaiting pickup (branch-scoped when set). */
export async function countReadyForPickupOrders(
    businessId: string,
    branchId?: string | null,
): Promise<number> {
    const conditions = [
        eq(customerOrders.businessId, businessId),
        eq(customerOrders.status, "ready_for_pickup"),
    ];
    if (branchId && branchId !== "all") {
        conditions.push(eq(customerOrders.branchId, branchId));
    }

    const [row] = await db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(customerOrders)
        .where(and(...conditions));

    return row?.count ?? 0;
}

export async function listCustomerOrdersForBranch(
    businessId: string,
    branchId: string,
    opts?: { customerId?: string; includeCompleted?: boolean },
) {
    const conditions = [
        eq(customerOrders.businessId, businessId),
        eq(customerOrders.branchId, branchId),
    ];
    if (opts?.customerId) {
        conditions.push(eq(customerOrders.customerId, opts.customerId));
    }
    if (!opts?.includeCompleted) {
        conditions.push(ne(customerOrders.status, "completed"));
        conditions.push(ne(customerOrders.status, "cancelled"));
    }

    return db
        .select({
            id: customerOrders.id,
            invoiceId: customerOrders.invoiceId,
            status: customerOrders.status,
            customerId: customerOrders.customerId,
            customerName: customers.name,
            totalGhs: customerOrders.totalGhs,
            amountPaidGhs: customerOrders.amountPaidGhs,
            balanceDueGhs: customerOrders.balanceDueGhs,
            createdAt: customerOrders.createdAt,
        })
        .from(customerOrders)
        .leftJoin(customers, eq(customerOrders.customerId, customers.id))
        .where(and(...conditions))
        .orderBy(desc(customerOrders.createdAt));
}

export async function getCustomerOrderDetail(
    businessId: string,
    orderId: string,
) {
    const [order] = await db
        .select()
        .from(customerOrders)
        .where(
            and(
                eq(customerOrders.id, orderId),
                eq(customerOrders.businessId, businessId),
            ),
        )
        .limit(1);
    if (!order) return null;

    const lines = await db
        .select()
        .from(customerOrderLines)
        .where(eq(customerOrderLines.customerOrderId, orderId));

    const payments = await db
        .select()
        .from(customerOrderPaymentLines)
        .where(eq(customerOrderPaymentLines.customerOrderId, orderId))
        .orderBy(customerOrderPaymentLines.sortOrder);

    const [cust] = await db
        .select({ name: customers.name })
        .from(customers)
        .where(eq(customers.id, order.customerId))
        .limit(1);

    return { order, lines, payments, customerName: cust?.name ?? null };
}
