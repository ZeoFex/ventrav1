import { NextRequest, NextResponse } from "next/server";
import { requireUserAuth } from "@/server/auth/api-request-auth";
import { db } from "@/server/db";
import { sales, saleItems } from "@/server/db/schema/sales";
import { users } from "@/server/db/schema/users";
import { products, productVariations } from "@/server/db/schema/products";
import { customers } from "@/server/db/schema/customers";
import { eq, and, asc, sql } from "drizzle-orm";

/**
 * GET /api/sales/transactions/[saleId]
 * Sale header + line items for the authenticated business (same access rules as list).
 */
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ saleId: string }> },
) {
    try {
        const { saleId } = await params;

        const auth = await requireUserAuth(req);
        if (auth instanceof NextResponse) return auth;
        const { payload } = auth;
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
                quantityReturned: saleItems.quantityReturned,
                unitPriceGhs: saleItems.unitPriceGhs,
                lineTotalGhs: saleItems.lineTotalGhs,
                sku: sql<string | null>`COALESCE(${productVariations.sku}, ${products.sku})`,
                barcode: sql<string | null>`COALESCE(${productVariations.barcode}, ${products.barcode})`,
                imageSrc: products.imageSrc,
            })
            .from(saleItems)
            .leftJoin(products, eq(saleItems.productId, products.id))
            .leftJoin(productVariations, eq(saleItems.variationId, productVariations.id))
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
