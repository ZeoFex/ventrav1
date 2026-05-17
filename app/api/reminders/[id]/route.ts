import { NextResponse } from "next/server";
import { hasMinRole, requireUserAuthFromContext } from "@/server/auth/api-request-auth";
import {
    deleteReminder,
    setReminderCompleted,
} from "@/server/reminders/reminder-service";
import { z } from "zod";

const patchSchema = z.object({
    completed: z.boolean(),
});

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const auth = await requireUserAuthFromContext();
        if (auth instanceof NextResponse) return auth;
        const { payload } = auth;
        if (!hasMinRole(payload, "manager")) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        const { id } = await params;
        const json = await req.json();
        const parsed = patchSchema.safeParse(json);
        if (!parsed.success) {
            return NextResponse.json({ error: "Invalid body" }, { status: 400 });
        }
        const row = await setReminderCompleted(payload.bid, id, parsed.data.completed);
        if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
        return NextResponse.json(row);
    } catch (e) {
        console.error("PATCH /api/reminders/[id]", e);
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
        if (!hasMinRole(payload, "manager")) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        const { id } = await params;
        const ok = await deleteReminder(payload.bid, id);
        if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
        return NextResponse.json({ success: true });
    } catch (e) {
        console.error("DELETE /api/reminders/[id]", e);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
