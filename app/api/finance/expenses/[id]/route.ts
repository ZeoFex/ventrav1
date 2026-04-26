import { NextResponse } from "next/server";
import { requireUserAuthFromContext } from "@/server/auth/api-request-auth";
import {
    deleteExpense,
    updateExpenseStatus,
} from "@/server/finance/finance-service";

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const auth = await requireUserAuthFromContext();
        if (auth instanceof NextResponse) return auth;
        const { payload } = auth;
        const { id } = await params;
        const { status } = await req.json();

        if (status !== "Paid" && status !== "Pending") {
            return NextResponse.json({ error: "Invalid status" }, { status: 400 });
        }

        const result = await updateExpenseStatus(payload.bid, id, status);
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
