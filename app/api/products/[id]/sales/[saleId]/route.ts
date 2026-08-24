import { NextResponse } from "next/server";
import { requireUserAuth } from "@/server/auth/api-request-auth";
import { db } from "@/server/db";
import { sales, saleItems, salePaymentLines } from "@/server/db/schema/sales";
import { users } from "@/server/db/schema/users";
import { customers } from "@/server/db/schema/customers";
import { branches } from "@/server/db/schema/branches";
import { businesses } from "@/server/db/schema/businesses";
import { eq, and, asc, sql } from "drizzle-orm";

/** Receipt payload for a sale that includes this product. */
export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string; saleId: string }> },
) {
    try {
        const auth = await requireUserAuth(req);
        if (auth instanceof NextResponse) return auth;
        const { payload } = auth;
        const { id: productId, saleId } = await params;

        const [lineHit] = await db
            .select({ id: saleItems.id })
            .from(saleItems)
            .innerJoin(sales, eq(saleItems.saleId, sales.id))
            .where(
                and(
                    eq(saleItems.saleId, saleId),
                    eq(saleItems.productId, productId),
                    eq(sales.businessId, payload.bid),
                ),
            )
            .limit(1);

        if (!lineHit) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        const [saleRow] = await db
            .select({
                id: sales.id,
                invoiceId: sales.invoiceId,
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
            .where(and(eq(sales.id, saleId), eq(sales.businessId, payload.bid)))
            .limit(1);

        if (!saleRow) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        const [lines, payments] = await Promise.all([
            db
                .select({
                    productName: saleItems.productName,
                    quantity: saleItems.quantity,
                    unitPriceGhs: saleItems.unitPriceGhs,
                    lineTotalGhs: saleItems.lineTotalGhs,
                })
                .from(saleItems)
                .where(eq(saleItems.saleId, saleId))
                .orderBy(asc(saleItems.id)),
            db
                .select({
                    paymentMethod: salePaymentLines.paymentMethod,
                    amountGhs: salePaymentLines.amountGhs,
                })
                .from(salePaymentLines)
                .where(eq(salePaymentLines.saleId, saleId))
                .orderBy(asc(salePaymentLines.sortOrder)),
        ]);

        return NextResponse.json(
            { sale: saleRow, lines, payments },
            { headers: { "Cache-Control": "no-store" } },
        );
    } catch (error) {
        console.error("GET /api/products/[id]/sales/[saleId] failed:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
