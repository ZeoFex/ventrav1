import { eq, and, desc } from "drizzle-orm";
import { db } from "../db";
import { customers } from "../db/schema/customers";
import { redis } from "../lib/redis";

const CACHE_KEYS = {
    CUSTOMERS_LIST: (bizId: string) => `customers:biz_${bizId}:list`,
    CUSTOMER_DETAIL: (bizId: string, id: string) => `customers:biz_${bizId}:id_${id}`,
};

export interface CustomerInput {
    name: string;
    phone: string;
    email?: string;
    status: "active" | "inactive";
}

export async function getCustomers(businessId: string) {
    const cacheKey = CACHE_KEYS.CUSTOMERS_LIST(businessId);
    const cached = await redis.get(cacheKey);
    if (cached) {
        try { return JSON.parse(cached); } catch { /* fall through */ }
    }

    const result = await db
        .select()
        .from(customers)
        .where(eq(customers.businessId, businessId))
        .orderBy(desc(customers.createdAt));

    await redis.setex(cacheKey, 60, JSON.stringify(result)); // 1 min cache
    return result;
}

export async function getCustomerById(businessId: string, id: string) {
    const cacheKey = CACHE_KEYS.CUSTOMER_DETAIL(businessId, id);
    const cached = await redis.get(cacheKey);
    if (cached) {
        try { return JSON.parse(cached); } catch { /* fall through */ }
    }

    const [customer] = await db
        .select()
        .from(customers)
        .where(and(eq(customers.id, id), eq(customers.businessId, businessId)))
        .limit(1);

    if (customer) {
        await redis.setex(cacheKey, 300, JSON.stringify(customer));
    }
    return customer;
}

export async function createCustomer(businessId: string, input: CustomerInput) {
    const [newCustomer] = await db
        .insert(customers)
        .values({
            businessId,
            ...input,
        })
        .returning();

    // Invalidate list cache
    await redis.del(CACHE_KEYS.CUSTOMERS_LIST(businessId));
    return newCustomer;
}

export async function updateCustomer(businessId: string, id: string, input: Partial<CustomerInput>) {
    const [updated] = await db
        .update(customers)
        .set({
            ...input,
            updatedAt: new Date(),
        })
        .where(and(eq(customers.id, id), eq(customers.businessId, businessId)))
        .returning();

    if (updated) {
        await Promise.all([
            redis.del(CACHE_KEYS.CUSTOMERS_LIST(businessId)),
            redis.del(CACHE_KEYS.CUSTOMER_DETAIL(businessId, id)),
        ]);
    }
    return updated;
}
