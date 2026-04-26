import { count, desc, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { parsePlatformListRequest } from "@/server/platform/platform-list";
import { db } from "@/server/db";
import { customers } from "@/server/db/schema/customers";

export const dynamic = "force-dynamic";

const row = {
    id: customers.id,
    businessId: customers.businessId,
    branchId: customers.branchId,
    name: customers.name,
    phone: customers.phone,
    email: customers.email,
    status: customers.status,
    createdAt: customers.createdAt,
    updatedAt: customers.updatedAt,
} as const;

export async function GET(req: NextRequest) {
    const g = parsePlatformListRequest(req);
    if (!g.ok) {
        return g.response;
    }
    const { limit, offset, businessId } = g.params;
    const cond = businessId ? eq(customers.businessId, businessId) : undefined;

    const [countRow] = cond
        ? await db.select({ n: count() }).from(customers).where(cond)
        : await db.select({ n: count() }).from(customers);

    const items = cond
        ? await db
              .select(row)
              .from(customers)
              .where(cond)
              .orderBy(desc(customers.createdAt))
              .limit(limit)
              .offset(offset)
        : await db
              .select(row)
              .from(customers)
              .orderBy(desc(customers.createdAt))
              .limit(limit)
              .offset(offset);

    return NextResponse.json({ total: countRow?.n ?? 0, items, limit, offset });
}
