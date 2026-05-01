import { eq, and, desc, or, isNull, ilike } from "drizzle-orm";
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

function branchMatchCustomers(branchId: string | null) {
  if (!branchId) return undefined;
  return or(isNull(customers.branchId), eq(customers.branchId, branchId));
}

/** Escape `%` and `_` for SQL ILIKE patterns. */
function escapeIlikeFragment(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

export type CopilotCustomerRow = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  status: string;
  branchId: string | null;
  createdAt: string;
};

/**
 * Search customers by name/phone or list most recently added (Zuri read path; not cached).
 */
export async function searchCustomersForCopilot(
  businessId: string,
  branchId: string | null,
  options: { query: string | null; limit: number },
): Promise<CopilotCustomerRow[]> {
  const limit = Math.min(25, Math.max(1, Math.floor(options.limit)));
  const branchCond = branchMatchCustomers(branchId);
  const byBiz = branchCond
    ? and(eq(customers.businessId, businessId), branchCond)
    : eq(customers.businessId, businessId);
  const q = options.query?.trim() ?? "";

  if (q.length < 1) {
    const rows = await db
      .select()
      .from(customers)
      .where(byBiz)
      .orderBy(desc(customers.createdAt))
      .limit(limit);
    return rows.map(mapCustomerRow);
  }

  const frag = escapeIlikeFragment(q.slice(0, 100));
  const pattern = `%${frag}%`;
  const rows = await db
    .select()
    .from(customers)
    .where(
      and(
        byBiz,
        or(ilike(customers.name, pattern), ilike(customers.phone, pattern)),
      ),
    )
    .orderBy(desc(customers.createdAt))
    .limit(limit);
  return rows.map(mapCustomerRow);
}

function mapCustomerRow(r: {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  status: string;
  branchId: string | null;
  createdAt: Date;
}): CopilotCustomerRow {
  return {
    id: r.id,
    name: r.name,
    phone: r.phone,
    email: r.email,
    status: r.status,
    branchId: r.branchId,
    createdAt: r.createdAt.toISOString(),
  };
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
