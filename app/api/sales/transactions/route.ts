import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/server/auth/token-service";
import { COOKIE_NAMES } from "@/server/config/auth-config";
import { db } from "@/server/db";
import { sales } from "@/server/db/schema/sales";
import { users } from "@/server/db/schema/users";
import { eq, desc, and, sql } from "drizzle-orm";

/**
 * GET /api/sales/transactions
 * Returns recent transactions for the authenticated business.
 */
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const staffIdParam = searchParams.get("staffId");

        const cookieStore = await cookies();
        const token = cookieStore.get(COOKIE_NAMES.ACCESS)?.value;

        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const payload = await verifyAccessToken(token);
        const isAdmin = payload.role === "owner";

        const query = db
            .select({
                id: sales.id,
                invoiceId: sales.invoiceId,
                totalGhs: sales.totalGhs,
                paymentMethod: sales.paymentMethod,
                itemCount: sales.itemCount,
                status: sales.status,
                createdAt: sales.createdAt,
                staffName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
            })
            .from(sales)
            .leftJoin(users, eq(sales.userId, users.id))
            .where(
                and(
                    eq(sales.businessId, payload.bid),
                    // If not admin, force filter to self
                    // If admin, filter by staffId if provided
                    !isAdmin
                        ? eq(sales.userId, payload.sub)
                        : (staffIdParam ? eq(sales.userId, staffIdParam) : undefined)
                )
            )
            .orderBy(desc(sales.createdAt))
            .limit(50);

        const rows = await query;

        return NextResponse.json(rows, {
            headers: { "Cache-Control": "no-store" },
        });
    } catch (error) {
        console.error("GET /api/sales/transactions failed:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
