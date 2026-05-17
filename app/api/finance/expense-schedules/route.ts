import { NextResponse } from "next/server";
import { hasMinRole, requireUserAuth, requireUserAuthFromContext } from "@/server/auth/api-request-auth";
import { getActiveBranchIdFromContext } from "@/server/auth/get-branch-id";
import {
    createExpenseSchedule,
    listExpenseSchedules,
} from "@/server/finance/expense-schedule-service";
import { z } from "zod";

const createSchema = z.object({
    category: z.string().min(1),
    description: z.string().min(1),
    vendor: z.string().optional().nullable(),
    paymentMethod: z.string().optional().nullable(),
    amountGhs: z.number().positive(),
    statusDefault: z.enum(["Paid", "Pending"]),
    dayOfMonth: z.number().int().min(1).max(28),
    firstRunAt: z.string().min(1),
});

export async function GET() {
    try {
        const auth = await requireUserAuthFromContext();
        if (auth instanceof NextResponse) return auth;
        const { payload } = auth;
        if (!hasMinRole(payload, "manager")) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        const rows = await listExpenseSchedules(payload.bid);
        return NextResponse.json(rows);
    } catch (error) {
        console.error("GET /api/finance/expense-schedules failed:", error);
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
            return NextResponse.json({ error: "Invalid body" }, { status: 400 });
        }
        const row = await createExpenseSchedule({
            businessId: payload.bid,
            branchId: branchId === "all" ? null : branchId,
            category: parsed.data.category,
            description: parsed.data.description,
            vendor: parsed.data.vendor ?? null,
            paymentMethod: parsed.data.paymentMethod ?? null,
            amountGhs: parsed.data.amountGhs,
            statusDefault: parsed.data.statusDefault,
            dayOfMonth: parsed.data.dayOfMonth,
            firstRunAt: new Date(parsed.data.firstRunAt),
        });
        return NextResponse.json({ success: true, id: row?.id });
    } catch (error) {
        console.error("POST /api/finance/expense-schedules failed:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
