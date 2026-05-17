import { NextResponse } from "next/server";
import { hasMinRole, requireUserAuth, requireUserAuthFromContext } from "@/server/auth/api-request-auth";
import { getActiveBranchIdFromContext } from "@/server/auth/get-branch-id";
import { createSupplyOrder, getSupplyOrderDetail } from "@/server/suppliers/supply-service";
import { z } from "zod";

const lineSchema = z.object({
    productId: z.string().uuid().optional().nullable(),
    productName: z.string().min(1),
    categoryName: z.string().optional().nullable(),
    cartons: z.number().int().min(0).default(0),
    itemsPerCarton: z.number().int().min(1).default(1),
    quantityTotal: z.number().int().min(1),
    unitCostGhs: z.number().nonnegative(),
    lineTotalGhs: z.number().nonnegative(),
    batchNo: z.string().optional().nullable(),
    expiryDate: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
});

const createSchema = z.object({
    supplierId: z.string().uuid(),
    reference: z.string().min(1).max(80),
    amountPaidGhs: z.number().nonnegative().default(0),
    notes: z.string().optional().nullable(),
    paymentMethod: z.string().max(30).optional().nullable(),
    idempotencyKey: z.string().max(100).optional().nullable(),
    lines: z.array(lineSchema).min(1),
});

export async function GET(req: Request) {
    try {
        const auth = await requireUserAuthFromContext();
        if (auth instanceof NextResponse) return auth;
        const { payload } = auth;
        if (!hasMinRole(payload, "manager")) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        const { searchParams } = new URL(req.url);
        const orderId = searchParams.get("orderId");
        if (orderId) {
            const detail = await getSupplyOrderDetail(payload.bid, orderId);
            if (!detail) return NextResponse.json({ error: "Not found" }, { status: 404 });
            return NextResponse.json(detail);
        }
        return NextResponse.json({ error: "orderId required" }, { status: 400 });
    } catch (e) {
        console.error("GET /api/supply-orders", e);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const auth = await requireUserAuth(req);
        if (auth instanceof NextResponse) return auth;
        const { payload } = auth;
        if (!hasMinRole(payload, "manager")) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        const branchId = await getActiveBranchIdFromContext();
        const json = await req.json();
        const parsed = createSchema.safeParse(json);
        if (!parsed.success) {
            return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
        }
        const b = parsed.data;
        const result = await createSupplyOrder({
            businessId: payload.bid,
            branchId: branchId === "all" ? null : branchId,
            supplierId: b.supplierId,
            reference: b.reference,
            amountPaidGhs: b.amountPaidGhs,
            notes: b.notes ?? null,
            paymentMethod: b.paymentMethod ?? null,
            idempotencyKey: b.idempotencyKey ?? null,
            lines: b.lines.map((l) => ({
                productId: l.productId ?? null,
                productName: l.productName,
                categoryName: l.categoryName ?? null,
                cartons: l.cartons,
                itemsPerCarton: l.itemsPerCarton,
                quantityTotal: l.quantityTotal,
                unitCostGhs: l.unitCostGhs,
                lineTotalGhs: l.lineTotalGhs,
                batchNo: l.batchNo ?? null,
                expiryDate: l.expiryDate ?? null,
                notes: l.notes ?? null,
            })),
        });
        return NextResponse.json({
            success: true,
            orderId: result.orderId,
            idempotent: result.idempotent,
        });
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Internal Server Error";
        if (msg === "EMPTY_LINES") {
            return NextResponse.json({ error: msg }, { status: 400 });
        }
        console.error("POST /api/supply-orders", e);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
