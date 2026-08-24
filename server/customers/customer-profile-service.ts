import { and, desc, eq, ne, sql } from "drizzle-orm";
import { db } from "../db";
import { customers } from "../db/schema/customers";
import { customerAccountEntries } from "../db/schema/customer-account-entries";
import { customerOrders } from "../db/schema/customer-orders";
import { sales, saleItems } from "../db/schema/sales";
import { users } from "../db/schema/users";
import { pruneOrphanedCustomerLedger } from "./customer-account-service";

const COUNTED_SALE = and(ne(sales.status, "voided"), ne(sales.status, "refunded"));

export async function getCustomerProfile(businessId: string, customerId: string) {
    const [customer] = await db
        .select()
        .from(customers)
        .where(and(eq(customers.id, customerId), eq(customers.businessId, businessId)))
        .limit(1);

    if (!customer) return null;

    await pruneOrphanedCustomerLedger(businessId, customerId);

    const [fresh] = await db
        .select()
        .from(customers)
        .where(and(eq(customers.id, customerId), eq(customers.businessId, businessId)))
        .limit(1);
    const current = fresh ?? customer;

    const saleScope = and(eq(sales.businessId, businessId), eq(sales.customerId, customerId));
    const countedScope = and(saleScope, COUNTED_SALE);

    const [statsRow] = await db
        .select({
            visits: sql<number>`count(*)::int`,
            spentGhs: sql<string>`coalesce(sum(${sales.totalGhs}::numeric), 0)`,
            paidGhs: sql<string>`coalesce(sum(${sales.amountPaidGhs}::numeric), 0)`,
            itemsBought: sql<number>`coalesce(sum(${sales.itemCount}), 0)::int`,
            lastVisitAt: sql<string | null>`max(${sales.createdAt})`,
            firstVisitAt: sql<string | null>`min(${sales.createdAt})`,
        })
        .from(sales)
        .where(countedScope);

    const visits = Number(statsRow?.visits ?? 0);
    const spentGhs = Number(statsRow?.spentGhs ?? 0);
    const paidGhs = Number(statsRow?.paidGhs ?? 0);
    const owedGhs = Number(current.accountsReceivableGhs ?? 0);

    const [receipts, products, entries, orders] = await Promise.all([
        db
            .select({
                id: sales.id,
                invoiceId: sales.invoiceId,
                totalGhs: sales.totalGhs,
                amountPaidGhs: sales.amountPaidGhs,
                balanceDueGhs: sales.balanceDueGhs,
                paymentMethod: sales.paymentMethod,
                itemCount: sales.itemCount,
                status: sales.status,
                createdAt: sales.createdAt,
                staffName: sql<string | null>`nullif(trim(coalesce(${users.firstName}, '') || ' ' || coalesce(${users.lastName}, '')), '')`,
            })
            .from(sales)
            .leftJoin(users, eq(sales.userId, users.id))
            .where(saleScope)
            .orderBy(desc(sales.createdAt))
            .limit(200),
        db
            .select({
                productId: saleItems.productId,
                productName: saleItems.productName,
                quantity: sql<number>`coalesce(sum(${saleItems.quantity} - ${saleItems.quantityReturned}), 0)::int`,
                spentGhs: sql<string>`coalesce(sum(${saleItems.lineTotalGhs}::numeric), 0)`,
                lastBoughtAt: sql<string | null>`max(${sales.createdAt})`,
            })
            .from(saleItems)
            .innerJoin(sales, eq(saleItems.saleId, sales.id))
            .where(countedScope)
            .groupBy(saleItems.productId, saleItems.productName)
            .orderBy(sql`sum(${saleItems.quantity} - ${saleItems.quantityReturned}) desc`)
            .limit(50),
        db
            .select({
                id: customerAccountEntries.id,
                kind: customerAccountEntries.kind,
                amountGhs: customerAccountEntries.amountGhs,
                note: customerAccountEntries.note,
                createdAt: customerAccountEntries.createdAt,
                saleId: customerAccountEntries.saleId,
            })
            .from(customerAccountEntries)
            .where(
                and(
                    eq(customerAccountEntries.customerId, customerId),
                    eq(customerAccountEntries.businessId, businessId),
                ),
            )
            .orderBy(desc(customerAccountEntries.createdAt))
            .limit(80),
        db
            .select({
                id: customerOrders.id,
                invoiceId: customerOrders.invoiceId,
                status: customerOrders.status,
                totalGhs: customerOrders.totalGhs,
                amountPaidGhs: customerOrders.amountPaidGhs,
                balanceDueGhs: customerOrders.balanceDueGhs,
                createdAt: customerOrders.createdAt,
            })
            .from(customerOrders)
            .where(
                and(eq(customerOrders.businessId, businessId), eq(customerOrders.customerId, customerId)),
            )
            .orderBy(desc(customerOrders.createdAt))
            .limit(40),
    ]);

    return {
        customer: current,
        stats: {
            visits,
            spentGhs,
            paidGhs,
            owedGhs,
            avgSaleGhs: visits > 0 ? Math.round((spentGhs / visits) * 100) / 100 : 0,
            itemsBought: Number(statsRow?.itemsBought ?? 0),
            lastVisitAt: statsRow?.lastVisitAt ?? null,
            firstVisitAt: statsRow?.firstVisitAt ?? null,
        },
        products: products
            .filter((p) => Number(p.quantity) > 0)
            .map((p) => ({
                productId: p.productId,
                productName: p.productName,
                quantity: Number(p.quantity),
                spentGhs: Number(p.spentGhs),
                lastBoughtAt: p.lastBoughtAt,
            })),
        receipts,
        entries,
        orders,
    };
}
