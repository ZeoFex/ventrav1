import { NextResponse } from "next/server";
import { requireUserAuthFromContext } from "@/server/auth/api-request-auth";
import {
    deleteExpense,
    updateExpenseStatus,
    getExpenseById,
    updateExpense,
} from "@/server/finance/finance-service";
import { z } from "zod";

const statusOnlySchema = z.object({
    status: z.enum(["Paid", "Pending"]),
});

const fullUpdateSchema = z.object({
    description: z.string().min(1),
    amountGhs: z.number().nonnegative(),
    category: z.string().min(1),
    /** ISO date string (date portion). */
    date: z.string().min(1),
    status: z.enum(["Paid", "Pending"]),
    vendor: z.string().optional().nullable(),
    paymentMethod: z.string().optional().nullable(),
    receiptUrl: z.string().optional().nullable(),
});

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const auth = await requireUserAuthFromContext();
        if (auth instanceof NextResponse) return auth;
        const { payload } = auth;
        const { id } = await params;
        const row = await getExpenseById(payload.bid, id);
        if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
        return NextResponse.json(row);
    } catch (e) {
        console.error("GET /api/finance/expenses/[id]", e);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const auth = await requireUserAuthFromContext();
        if (auth instanceof NextResponse) return auth;
        const { payload } = auth;
        const { id } = await params;
        const json = await req.json();

        if (json && typeof json === "object" && "description" in json) {
            const parsed = fullUpdateSchema.safeParse(json);
            if (!parsed.success) {
                return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
            }
            const b = parsed.data;
            const date = new Date(b.date);
            if (Number.isNaN(date.getTime())) {
                return NextResponse.json({ error: "Invalid date" }, { status: 400 });
            }
            const result = await updateExpense(payload.bid, id, {
                date,
                description: b.description,
                category: b.category,
                amountGhs: b.amountGhs,
                status: b.status,
                vendor: b.vendor ?? null,
                paymentMethod: b.paymentMethod ?? null,
                receiptUrl: b.receiptUrl ?? null,
            });
            if (!result) {
                return NextResponse.json({ error: "Expense not found" }, { status: 404 });
            }
            return NextResponse.json({ success: true });
        }

        const parsed = statusOnlySchema.safeParse(json);
        if (!parsed.success) {
            return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
        }

        const result = await updateExpenseStatus(payload.bid, id, parsed.data.status);
        if (!result) {
            return NextResponse.json({ error: "Expense not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("PATCH /api/finance/expenses/[id] failed:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function DELETE(
    _req: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const auth = await requireUserAuthFromContext();
        if (auth instanceof NextResponse) return auth;
        const { payload } = auth;
        const { id } = await params;

        const ok = await deleteExpense(payload.bid, id);
        if (!ok) {
            return NextResponse.json({ error: "Expense not found" }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("DELETE /api/finance/expenses/[id] failed:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
