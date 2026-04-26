import { NextResponse } from "next/server";
import { requireUserAuth, requireUserAuthFromContext } from "@/server/auth/api-request-auth";
import { getExpensesList, createExpense } from "@/server/finance/finance-service";
import { getActiveBranchIdFromContext } from "@/server/auth/get-branch-id";

export async function GET() {
    try {
        const auth = await requireUserAuthFromContext();
        if (auth instanceof NextResponse) return auth;
        const { payload } = auth;
        const branchId = await getActiveBranchIdFromContext();
        const list = await getExpensesList(payload.bid, branchId);

        return NextResponse.json(list);
    } catch (error) {
        console.error("GET /api/finance/expenses failed:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const auth = await requireUserAuth(req);
        if (auth instanceof NextResponse) return auth;
        const { payload } = auth;
        const branchId = await getActiveBranchIdFromContext();
        const body = await req.json();

        const expense = await createExpense(payload.bid, {
            ...body,
            date: new Date(body.date),
        }, branchId);

        return NextResponse.json({ success: true, expenseId: expense.id });
    } catch (error) {
        console.error("POST /api/finance/expenses failed:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
