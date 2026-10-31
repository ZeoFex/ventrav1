import { NextResponse } from "next/server";
import { requireUserAuth } from "@/server/auth/api-request-auth";
import { db } from "@/server/db";
import { sales, saleItems, salePaymentLines } from "@/server/db/schema/sales";
import { users } from "@/server/db/schema/users";
import { products, productVariations } from "@/server/db/schema/products";
import { customers } from "@/server/db/schema/customers";
import { branches } from "@/server/db/schema/branches";
import { businesses } from "@/server/db/schema/businesses";
import { eq, and, asc, sql } from "drizzle-orm";

/**
 * Sale + lines + payments for reprint, scoped to this customer.
 */
export async function GET(
    _req: Request,
    { params }: { params: Promise<{ id: string; saleId: string }> },
) {
    try {
        const auth = await requireUserAuth(_req);
        if (auth instanceof NextResponse) return auth;
        const { payload } = auth;
        const { id: customerId, saleId } = await params;

        const [saleRow] = await db
            .select({
                id: sales.id,
                invoiceId: sales.invoiceId,
                branchId: sales.branchId,
                subtotalGhs: sales.subtotalGhs,
                taxGhs: sales.taxGhs,
                discountGhs: sales.discountGhs,
                totalGhs: sales.totalGhs,
                amountPaidGhs: sales.amountPaidGhs,
                balanceDueGhs: sales.balanceDueGhs,
                paymentMethod: sales.paymentMethod,
                itemCount: sales.itemCount,
                status: sales.status,
                createdAt: sales.createdAt,
                staffName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
                customerName: customers.name,
                branchName: branches.name,
                branchAddress: branches.address,
                branchRegion: branches.region,
                branchPhone: branches.phone,
                storeName: businesses.name,
                currencySymbol: businesses.currency,
                receiptHeader: businesses.receiptHeader,
                receiptFooter: businesses.receiptFooter,
            })
            .from(sales)
            .leftJoin(users, eq(sales.userId, users.id))
            .leftJoin(customers, eq(sales.customerId, customers.id))
            .leftJoin(branches, eq(sales.branchId, branches.id))
            .innerJoin(businesses, eq(sales.businessId, businesses.id))
            .where(
                and(
                    eq(sales.id, saleId),
                    eq(sales.businessId, payload.bid),
                    eq(sales.customerId, customerId),
                ),
            )
            .limit(1);

        if (!saleRow) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        const [lines, payments] = await Promise.all([
            db
                .select({
                    id: saleItems.id,
                    productName: saleItems.productName,
                    quantity: saleItems.quantity,
                    quantityReturned: saleItems.quantityReturned,
                    unitPriceGhs: saleItems.unitPriceGhs,
                    lineTotalGhs: saleItems.lineTotalGhs,
                    sku: sql<string | null>`COALESCE(${productVariations.sku}, ${products.sku})`,
                })
                .from(saleItems)
                .leftJoin(products, eq(saleItems.productId, products.id))
                .leftJoin(productVariations, eq(saleItems.variationId, productVariations.id))
                .where(eq(saleItems.saleId, saleId))
                .orderBy(asc(saleItems.id)),
            db
                .select({
                    paymentMethod: salePaymentLines.paymentMethod,
                    amountGhs: salePaymentLines.amountGhs,
                    sortOrder: salePaymentLines.sortOrder,
                })
                .from(salePaymentLines)
                .where(eq(salePaymentLines.saleId, saleId))
                .orderBy(asc(salePaymentLines.sortOrder), asc(salePaymentLines.id)),
        ]);

        return NextResponse.json(
            { sale: saleRow, lines, payments },
            { headers: { "Cache-Control": "no-store" } },
        );
    } catch (error) {
        console.error("GET /api/customers/[id]/sales/[saleId] failed:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
