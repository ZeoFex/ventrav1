import { NextResponse } from "next/server";
import { hasMinRole, requireUserAuth, requireUserAuthFromContext } from "@/server/auth/api-request-auth";
import { getActiveBranchIdFromContext } from "@/server/auth/get-branch-id";
import { createReminder, listReminders } from "@/server/reminders/reminder-service";
import { z } from "zod";

const createSchema = z.object({
    title: z.string().min(1).max(200),
    notes: z.string().optional().nullable(),
    remindAt: z.string().min(1),
});

export async function GET() {
    try {
        const auth = await requireUserAuthFromContext();
        if (auth instanceof NextResponse) return auth;
        const { payload } = auth;
        if (!hasMinRole(payload, "manager")) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        const branchId = await getActiveBranchIdFromContext();
        const rows = await listReminders(payload.bid, branchId);
        return NextResponse.json(rows, { headers: { "Cache-Control": "no-store" } });
    } catch (e) {
        console.error("GET /api/reminders", e);
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
        const d = new Date(parsed.data.remindAt);
        if (Number.isNaN(d.getTime())) {
            return NextResponse.json({ error: "Invalid remindAt" }, { status: 400 });
        }
        const row = await createReminder({
            businessId: payload.bid,
            branchId: branchId ?? null,
            title: parsed.data.title,
            notes: parsed.data.notes ?? null,
            remindAt: d,
        });
        if (!row) return NextResponse.json({ error: "Failed" }, { status: 500 });
        return NextResponse.json(row, { status: 201 });
    } catch (e) {
        console.error("POST /api/reminders", e);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
