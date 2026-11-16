import { NextRequest, NextResponse } from "next/server";
import { requireUserAuth } from "@/server/auth/api-request-auth";
import { getActiveBranchIdFromContext } from "@/server/auth/get-branch-id";
import { db } from "@/server/db";
import { sales } from "@/server/db/schema/sales";
import { users } from "@/server/db/schema/users";
import { customers } from "@/server/db/schema/customers";
import { branches } from "@/server/db/schema/branches";
import { resolveSalesOverviewPeriod } from "@/server/reports/product-analytics-service";
import { eq, desc, and, sql, gte, lte, ilike, or } from "drizzle-orm";

/**
 * GET /api/sales/transactions
 * Recent / dated sales for the authenticated business (branch-scoped when a branch is active).
 *
 * Query: from, to (Accra YYYY-MM-DD), staffId, q (invoice / customer / staff), limit (default 100, max 500)
 */
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const staffIdParam = searchParams.get("staffId");
        const fromKey = searchParams.get("from");
        const toKey = searchParams.get("to");
        const q = searchParams.get("q")?.trim() ?? "";
        const limitRaw = Number(searchParams.get("limit") ?? "100");
        const limit = Number.isFinite(limitRaw)
            ? Math.min(Math.max(Math.floor(limitRaw), 1), 500)
            : 100;

        const auth = await requireUserAuth(req);
        if (auth instanceof NextResponse) return auth;
        const { payload } = auth;
        const isAdmin = payload.role === "owner";
        const branchId = await getActiveBranchIdFromContext();

        let period: ReturnType<typeof resolveSalesOverviewPeriod> | null = null;
        try {
            if (fromKey || toKey) {
                period = resolveSalesOverviewPeriod(fromKey, toKey);
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Invalid date range";
            return NextResponse.json({ error: msg }, { status: 400 });
        }

        const conditions = [
            eq(sales.businessId, payload.bid),
            !isAdmin
                ? eq(sales.userId, payload.sub)
                : staffIdParam
                  ? eq(sales.userId, staffIdParam)
                  : undefined,
            branchId ? eq(sales.branchId, branchId) : undefined,
            period ? gte(sales.createdAt, period.start) : undefined,
            period ? lte(sales.createdAt, period.end) : undefined,
        ];

        if (q) {
            // Strip LIKE wildcards from user input; keep the search literal.
            const safe = q.replace(/[%_]/g, "");
            if (safe) {
                const pattern = `%${safe}%`;
                conditions.push(
                    or(
                        ilike(sales.invoiceId, pattern),
                        ilike(customers.name, pattern),
                        sql`(${users.firstName} || ' ' || ${users.lastName}) ILIKE ${pattern}`,
                    ),
                );
            }
        }

        const where = and(...conditions.filter((c): c is NonNullable<typeof c> => c != null));

        const rows = await db
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
                branchId: sales.branchId,
                branchName: branches.name,
                staffName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
                customerName: customers.name,
            })
            .from(sales)
            .leftJoin(users, eq(sales.userId, users.id))
            .leftJoin(customers, eq(sales.customerId, customers.id))
            .leftJoin(branches, eq(sales.branchId, branches.id))
            .where(where)
            .orderBy(desc(sales.createdAt))
            .limit(period ? limit : Math.min(limit, 50));

        return NextResponse.json(rows, {
            headers: { "Cache-Control": "no-store" },
        });
    } catch (error) {
        console.error("GET /api/sales/transactions failed:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
