import { and, asc, count, desc, eq, sql } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePlatformAccess } from "@/server/auth/api-request-auth";
import { db } from "@/server/db";
import { businesses } from "@/server/db/schema/businesses";
import { sales, saleItems, salePaymentLines } from "@/server/db/schema/sales";
import { customers } from "@/server/db/schema/customers";
import { users } from "@/server/db/schema/users";
import { branches } from "@/server/db/schema/branches";
import {
    platformDeleteBusinessSales,
    platformWipeBusinessSales,
} from "@/server/platform/platform-sale-delete-service";

export const dynamic = "force-dynamic";

const uuidParam = z.string().uuid();
const wipeBody = z.object({
    confirmSlug: z.string().min(1),
    confirmPhrase: z.literal("DELETE SALES"),
    restock: z.boolean().optional().default(false),
});
const selectiveBody = z.object({
    ids: z.array(z.string().uuid()).min(1).max(200),
    restock: z.boolean().optional().default(false),
});

/**
 * DELETE /api/platform/businesses/[id]/sales
 * - Selective: { ids, restock? }
 * - Wipe all: { confirmSlug, confirmPhrase: "DELETE SALES", restock? }
 *
 * restock=true restores sellable units (qty − already returned) back onto product stock before delete.
 */
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const gate = await requirePlatformAccess(req);
    if (gate !== true) return gate;

    const { id } = await params;
    if (!uuidParam.safeParse(id).success) {
        return NextResponse.json({ error: "Invalid business id" }, { status: 400 });
    }

    let body: unknown;
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const [row] = await db
        .select({ id: businesses.id, slug: businesses.slug })
        .from(businesses)
        .where(eq(businesses.id, id))
        .limit(1);
    if (!row) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const selective = selectiveBody.safeParse(body);
    if (selective.success) {
        const result = await platformDeleteBusinessSales({
            businessId: id,
            saleIds: selective.data.ids,
            restock: selective.data.restock,
        });
        return NextResponse.json({ success: true, ...result });
    }

    const wipe = wipeBody.safeParse(body);
    if (!wipe.success) {
        return NextResponse.json(
            {
                error:
                    'Provide either { ids: uuid[], restock? } or { confirmSlug, confirmPhrase: "DELETE SALES", restock? }',
                details: wipe.error.flatten(),
            },
            { status: 400 },
        );
    }

    if (row.slug.trim() !== wipe.data.confirmSlug.trim()) {
        return NextResponse.json(
            { error: "confirmSlug does not match this business" },
            { status: 400 },
        );
    }

    const result = await platformWipeBusinessSales({
        businessId: id,
        restock: wipe.data.restock,
    });

    return NextResponse.json({ success: true, ...result });
}

/**
 * GET /api/platform/businesses/[id]/sales
 * - Default: { salesCount }
 * - ?detail=1&saleId=uuid → full sale + lines + payments for history view
 * - ?list=1&limit=&offset=&q= → paginated sale history for this shop
 */
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    const gate = await requirePlatformAccess(req);
    if (gate !== true) return gate;

    const { id } = await params;
    if (!uuidParam.safeParse(id).success) {
        return NextResponse.json({ error: "Invalid business id" }, { status: 400 });
    }

    const [biz] = await db
        .select({ id: businesses.id })
        .from(businesses)
        .where(eq(businesses.id, id))
        .limit(1);
    if (!biz) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const saleId = searchParams.get("saleId")?.trim();
    const list = searchParams.get("list") === "1" || searchParams.get("list") === "true";

    if (saleId) {
        if (!uuidParam.safeParse(saleId).success) {
            return NextResponse.json({ error: "Invalid sale id" }, { status: 400 });
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
                branchName: branches.name,
                customerName: customers.name,
                staffName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
            })
            .from(sales)
            .leftJoin(branches, eq(sales.branchId, branches.id))
            .leftJoin(customers, eq(sales.customerId, customers.id))
            .leftJoin(users, eq(sales.userId, users.id))
            .where(and(eq(sales.id, saleId), eq(sales.businessId, id)))
            .limit(1);

        if (!saleRow) {
            return NextResponse.json({ error: "Sale not found" }, { status: 404 });
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
            })
            .from(saleItems)
            .where(eq(saleItems.saleId, saleId))
            .orderBy(asc(saleItems.id));

        const payments = await db
            .select({
                paymentMethod: salePaymentLines.paymentMethod,
                amountGhs: salePaymentLines.amountGhs,
                sortOrder: salePaymentLines.sortOrder,
            })
            .from(salePaymentLines)
            .where(eq(salePaymentLines.saleId, saleId))
            .orderBy(asc(salePaymentLines.sortOrder), asc(salePaymentLines.id));

        return NextResponse.json({ sale: saleRow, lines, payments });
    }

    if (list) {
        const limit = Math.min(
            200,
            Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10) || 50),
        );
        const offset = Math.max(0, parseInt(searchParams.get("offset") ?? "0", 10) || 0);
        const q = searchParams.get("q")?.trim() ?? "";

        const conditions = [eq(sales.businessId, id)];
        if (q) {
            const safe = q.replace(/[%_]/g, "");
            if (safe) {
                conditions.push(sql`${sales.invoiceId} ILIKE ${`%${safe}%`}`);
            }
        }

        const where = and(...conditions);
        const [countRow] = await db.select({ n: count() }).from(sales).where(where);
        const items = await db
            .select({
                id: sales.id,
                invoiceId: sales.invoiceId,
                totalGhs: sales.totalGhs,
                paymentMethod: sales.paymentMethod,
                itemCount: sales.itemCount,
                status: sales.status,
                createdAt: sales.createdAt,
                branchName: branches.name,
                customerName: customers.name,
                staffName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
            })
            .from(sales)
            .leftJoin(branches, eq(sales.branchId, branches.id))
            .leftJoin(customers, eq(sales.customerId, customers.id))
            .leftJoin(users, eq(sales.userId, users.id))
            .where(where)
            .orderBy(desc(sales.createdAt))
            .limit(limit)
            .offset(offset);

        return NextResponse.json({
            total: Number(countRow?.n ?? 0),
            items,
            limit,
            offset,
        });
    }

    const [stats] = await db
        .select({ total: count() })
        .from(sales)
        .where(and(eq(sales.businessId, id)));

    return NextResponse.json({ salesCount: Number(stats?.total ?? 0) });
}
