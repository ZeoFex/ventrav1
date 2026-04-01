import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAccessToken } from "@/server/auth/token-service";
import { COOKIE_NAMES } from "@/server/config/auth-config";
import { getExpensesList, createExpense } from "@/server/finance/finance-service";
import { getActiveBranchId } from "@/server/auth/get-branch-id";

export async function GET() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get(COOKIE_NAMES.ACCESS)?.value;
        if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const payload = await verifyAccessToken(token);
        const branchId = getActiveBranchId(cookieStore);
        const list = await getExpensesList(payload.bid, branchId);

        return NextResponse.json(list);
    } catch (error) {
        console.error("GET /api/finance/expenses failed:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get(COOKIE_NAMES.ACCESS)?.value;
        if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const payload = await verifyAccessToken(token);
        const branchId = getActiveBranchId(cookieStore);
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
