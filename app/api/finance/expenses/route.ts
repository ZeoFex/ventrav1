import { NextResponse } from "next/server";
import { requireUserAuth, requireUserAuthFromContext } from "@/server/auth/api-request-auth";
import { getExpensesList, createExpense } from "@/server/finance/finance-service";
import { getActiveBranchIdFromContext } from "@/server/auth/get-branch-id";

export async function GET(req: Request) {
    try {
        const auth = await requireUserAuthFromContext();
        if (auth instanceof NextResponse) return auth;
        const { payload } = auth;
        const branchId = await getActiveBranchIdFromContext();
        const { searchParams } = new URL(req.url);

        const fromStr = searchParams.get("from");
        const toStr = searchParams.get("to");
        const category = searchParams.get("category") || undefined;
        const vendor = searchParams.get("vendor") || undefined;
        const search = searchParams.get("q") || searchParams.get("search") || undefined;

        const filters =
            fromStr || toStr || category || vendor || search
                ? {
                      from: fromStr ? new Date(fromStr) : undefined,
                      to: toStr ? new Date(toStr) : undefined,
                      category: category && category !== "all" ? category : undefined,
                      vendor,
                      search,
                  }
                : undefined;

        const list = await getExpensesList(payload.bid, branchId, filters);

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

        const expense = await createExpense(
            payload.bid,
            {
                date: new Date(body.date),
                description: body.description,
                category: body.category,
                amountGhs: Number(body.amountGhs),
                status: body.status,
                paymentMethod: body.paymentMethod ?? null,
                vendor: body.vendor ?? null,
                receiptUrl: body.receiptUrl ?? null,
            },
            branchId,
        );

        return NextResponse.json({ success: true, expenseId: expense.id });
    } catch (error) {
        console.error("POST /api/finance/expenses failed:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
