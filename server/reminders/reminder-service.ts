import { eq, and, desc } from "drizzle-orm";
import { db } from "../db";
import { reminders } from "../db/schema/reminders";

export async function listReminders(businessId: string, branchId: string | null) {
    const conditions = [eq(reminders.businessId, businessId)];
    if (branchId) {
        conditions.push(eq(reminders.branchId, branchId));
    }

    return db
        .select()
        .from(reminders)
        .where(and(...conditions))
        .orderBy(desc(reminders.remindAt));
}

export async function createReminder(input: {
    businessId: string;
    branchId?: string | null;
    title: string;
    notes?: string | null;
    remindAt: Date;
}) {
    const [row] = await db
        .insert(reminders)
        .values({
            businessId: input.businessId,
            branchId: input.branchId ?? null,
            title: input.title.trim().slice(0, 200),
            notes: input.notes?.trim() || null,
            remindAt: input.remindAt,
        })
        .returning();
    return row ?? null;
}

export async function deleteReminder(businessId: string, id: string): Promise<boolean> {
    const res = await db
        .delete(reminders)
        .where(and(eq(reminders.id, id), eq(reminders.businessId, businessId)))
        .returning({ id: reminders.id });
    return res.length > 0;
}

export async function setReminderCompleted(
    businessId: string,
    id: string,
    completed: boolean,
): Promise<typeof reminders.$inferSelect | null> {
    const [row] = await db
        .update(reminders)
        .set({
            completedAt: completed ? new Date() : null,
            updatedAt: new Date(),
        })
        .where(and(eq(reminders.id, id), eq(reminders.businessId, businessId)))
        .returning();
    return row ?? null;
}
