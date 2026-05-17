import { eq, and, desc, sql } from "drizzle-orm";
import { db } from "../db";
import { customers } from "../db/schema/customers";
import { customerAccountEntries } from "../db/schema/customer-account-entries";
import { redis } from "../lib/redis";

const CACHE_KEYS = {
    CUSTOMERS_LIST: (bizId: string) => `customers:biz_${bizId}:list`,
    CUSTOMER_DETAIL: (bizId: string, id: string) => `customers:biz_${bizId}:id_${id}`,
};

export async function invalidateCustomerCaches(businessId: string, customerId?: string) {
    const keys = [CACHE_KEYS.CUSTOMERS_LIST(businessId)];
    if (customerId) keys.push(CACHE_KEYS.CUSTOMER_DETAIL(businessId, customerId));
    await Promise.all(keys.map((k) => redis.del(k)));
}

export async function recordCustomerAccountPayment(
    businessId: string,
    customerId: string,
    input: {
        amountGhs: number;
        paymentMethod: string;
        note?: string | null;
        branchId?: string | null;
    },
) {
    const amount = Math.round(input.amountGhs * 100) / 100;
    if (amount <= 0) throw new Error("Amount must be positive");

    await db.transaction(async (tx) => {
        const [cust] = await tx
            .select({ ar: customers.accountsReceivableGhs })
            .from(customers)
            .where(and(eq(customers.id, customerId), eq(customers.businessId, businessId)))
            .limit(1);

        if (!cust) throw new Error("Customer not found");

        const ar = Number(cust.ar);
        if (amount > ar + 0.02) {
            throw new Error("Payment is greater than outstanding balance");
        }

        await tx
            .update(customers)
            .set({
                accountsReceivableGhs: sql`GREATEST(0::numeric, (${customers.accountsReceivableGhs}::numeric - ${String(amount)}))`,
                updatedAt: new Date(),
            })
            .where(eq(customers.id, customerId));

        await tx.insert(customerAccountEntries).values({
            businessId,
            branchId: input.branchId ?? null,
            customerId,
            saleId: null,
            kind: "payment_received",
            amountGhs: String(amount),
            note:
                input.note?.trim() ||
                `Payment received (${input.paymentMethod})`,
        });
    });

    await invalidateCustomerCaches(businessId, customerId);
}

export async function listCustomerAccountEntries(
    businessId: string,
    customerId: string,
    limit = 50,
) {
    return db
        .select()
        .from(customerAccountEntries)
        .where(
            and(
                eq(customerAccountEntries.customerId, customerId),
                eq(customerAccountEntries.businessId, businessId),
            ),
        )
        .orderBy(desc(customerAccountEntries.createdAt))
        .limit(Math.min(100, Math.max(1, limit)));
}
