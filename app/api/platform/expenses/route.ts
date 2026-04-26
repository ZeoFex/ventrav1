import { count, desc, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { parsePlatformListRequest } from "@/server/platform/platform-list";
import { db } from "@/server/db";
import { expenses } from "@/server/db/schema/expenses";

export const dynamic = "force-dynamic";

const row = {
    id: expenses.id,
    businessId: expenses.businessId,
    branchId: expenses.branchId,
    date: expenses.date,
    description: expenses.description,
    category: expenses.category,
    amountGhs: expenses.amountGhs,
    status: expenses.status,
    createdAt: expenses.createdAt,
    updatedAt: expenses.updatedAt,
} as const;

export async function GET(req: NextRequest) {
    const g = parsePlatformListRequest(req);
    if (!g.ok) {
        return g.response;
    }
    const { limit, offset, businessId } = g.params;
    const cond = businessId ? eq(expenses.businessId, businessId) : undefined;

    const [countRow] = cond
        ? await db.select({ n: count() }).from(expenses).where(cond)
        : await db.select({ n: count() }).from(expenses);

    const items = cond
        ? await db
              .select(row)
              .from(expenses)
              .where(cond)
              .orderBy(desc(expenses.date))
              .limit(limit)
              .offset(offset)
        : await db
              .select(row)
              .from(expenses)
              .orderBy(desc(expenses.date))
              .limit(limit)
              .offset(offset);

    return NextResponse.json({ total: countRow?.n ?? 0, items, limit, offset });
}
