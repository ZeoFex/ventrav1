import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/server/auth/token-service";
import { COOKIE_NAMES } from "@/server/config/auth-config";
import { db } from "@/server/db";
import { sales, saleItems } from "@/server/db/schema/sales";
import { users } from "@/server/db/schema/users";
import { products } from "@/server/db/schema/products";
import { customers } from "@/server/db/schema/customers";
import { eq, and, asc, sql } from "drizzle-orm";

/**
 * GET /api/sales/transactions/[saleId]
 * Sale header + line items for the authenticated business (same access rules as list).
 */
export async function GET(
    _req: NextRequest,
    { params }: { params: Promise<{ saleId: string }> },
) {
    try {
        const { saleId } = await params;

        const cookieStore = await cookies();
        const token = cookieStore.get(COOKIE_NAMES.ACCESS)?.value;

        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const payload = await verifyAccessToken(token);
        const isAdmin = payload.role === "owner";

        const access = and(
            eq(sales.id, saleId),
            eq(sales.businessId, payload.bid),
            !isAdmin ? eq(sales.userId, payload.sub) : undefined,
        );

        const [saleRow] = await db
            .select({
                id: sales.id,
                invoiceId: sales.invoiceId,
                subtotalGhs: sales.subtotalGhs,
                taxGhs: sales.taxGhs,
                discountGhs: sales.discountGhs,
                totalGhs: sales.totalGhs,
                paymentMethod: sales.paymentMethod,
                itemCount: sales.itemCount,
                status: sales.status,
                createdAt: sales.createdAt,
                staffName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
                customerName: customers.name,
            })
            .from(sales)
            .leftJoin(users, eq(sales.userId, users.id))
            .leftJoin(customers, eq(sales.customerId, customers.id))
            .where(access)
            .limit(1);

        if (!saleRow) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        const lines = await db
            .select({
                id: saleItems.id,
                productId: saleItems.productId,
                variationId: saleItems.variationId,
                productName: saleItems.productName,
                quantity: saleItems.quantity,
                unitPriceGhs: saleItems.unitPriceGhs,
                lineTotalGhs: saleItems.lineTotalGhs,
                sku: products.sku,
                imageSrc: products.imageSrc,
            })
            .from(saleItems)
            .leftJoin(products, eq(saleItems.productId, products.id))
            .where(eq(saleItems.saleId, saleId))
            .orderBy(asc(saleItems.id));

        return NextResponse.json(
            { sale: saleRow, lines },
            { headers: { "Cache-Control": "no-store" } },
        );
    } catch (error) {
        console.error("GET /api/sales/transactions/[saleId] failed:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
