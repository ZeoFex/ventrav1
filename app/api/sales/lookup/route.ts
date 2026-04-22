import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/server/auth/token-service";
import { COOKIE_NAMES } from "@/server/config/auth-config";
import { getActiveBranchId } from "@/server/auth/get-branch-id";
import { db } from "@/server/db";
import { sales, saleItems } from "@/server/db/schema/sales";
import { users } from "@/server/db/schema/users";
import { customers } from "@/server/db/schema/customers";
import { products, productVariations } from "@/server/db/schema/products";
import { eq, and, asc, desc, sql } from "drizzle-orm";

/**
 * GET /api/sales/lookup?invoice=...
 * Resolve a sale by invoice for returns (same access rules as transactions list + branch cookie).
 */
export async function GET(req: NextRequest) {
    try {
        const invoice = new URL(req.url).searchParams.get("invoice")?.trim();
        if (!invoice) {
            return NextResponse.json({ error: "invoice query parameter is required" }, { status: 400 });
        }

        const cookieStore = await cookies();
        const token = cookieStore.get(COOKIE_NAMES.ACCESS)?.value;
        if (!token) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const payload = await verifyAccessToken(token);
        const isAdmin = payload.role === "owner";
        const branchId = getActiveBranchId(cookieStore);

        const access = and(
            eq(sales.businessId, payload.bid),
            eq(sales.invoiceId, invoice),
            !isAdmin ? eq(sales.userId, payload.sub) : undefined,
            branchId ? eq(sales.branchId, branchId) : undefined,
        );

        const [saleRow] = await db
            .select({
                id: sales.id,
                invoiceId: sales.invoiceId,
                branchId: sales.branchId,
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
            .orderBy(desc(sales.createdAt))
            .limit(1);

        if (!saleRow) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        const saleId = saleRow.id;

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

        const canReturn = saleRow.status === "completed" || saleRow.status === "partially_refunded";

        return NextResponse.json(
            { sale: saleRow, lines, eligibility: { canReturn } },
            { headers: { "Cache-Control": "no-store" } },
        );
    } catch (error) {
        console.error("GET /api/sales/lookup failed:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
