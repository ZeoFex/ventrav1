import { and, eq, lte, asc } from "drizzle-orm";
import { db } from "../db";
import { expenseSchedules } from "../db/schema/expense-schedules";
import { createExpense } from "./finance-service";

function addMonthsClampDay(d: Date, months: number, dayOfMonth: number): Date {
    const y = d.getUTCFullYear();
    const m = d.getUTCMonth() + months;
    const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
    const day = Math.min(dayOfMonth, lastDay);
    return new Date(Date.UTC(y, m, day, 12, 0, 0));
}

/**
 * Create recurring expense rows for schedules whose next_run_at is due.
 * Intended for daily cron (CRON_SECRET).
 */
export async function processDueExpenseSchedules(now: Date = new Date()) {
    const due = await db
        .select()
        .from(expenseSchedules)
        .where(and(eq(expenseSchedules.active, true), lte(expenseSchedules.nextRunAt, now)))
        .orderBy(asc(expenseSchedules.nextRunAt));

    let created = 0;
    for (const row of due) {
        try {
            await createExpense(
                row.businessId,
                {
                    date: now,
                    description: row.description,
                    category: row.category,
                    amountGhs: Number(row.amountGhs),
                    status: row.statusDefault,
                    paymentMethod: row.paymentMethod ?? undefined,
                    vendor: row.vendor ?? undefined,
                    receiptUrl: undefined,
                },
                row.branchId ?? null,
            );

            const next =
                row.recurrence === "monthly"
                    ? addMonthsClampDay(row.nextRunAt, 1, row.dayOfMonth)
                    : new Date(row.nextRunAt.getTime() + 30 * 24 * 60 * 60 * 1000);

            await db
                .update(expenseSchedules)
                .set({ nextRunAt: next, updatedAt: new Date() })
                .where(eq(expenseSchedules.id, row.id));

            created++;
        } catch (e) {
            console.error(`[expense-schedules] failed for schedule ${row.id}:`, e);
        }
    }

    return { processed: due.length, createdExpenseRows: created };
}

export async function createExpenseSchedule(input: {
    businessId: string;
    branchId?: string | null;
    category: string;
    description: string;
    vendor?: string | null;
    paymentMethod?: string | null;
    amountGhs: number;
    statusDefault: "Paid" | "Pending";
    dayOfMonth: number;
    firstRunAt: Date;
}) {
    const day = Math.min(28, Math.max(1, Math.floor(input.dayOfMonth)));
    const [row] = await db
        .insert(expenseSchedules)
        .values({
            businessId: input.businessId,
            branchId: input.branchId ?? null,
            category: input.category,
            description: input.description,
            vendor: input.vendor?.trim() || null,
            paymentMethod: input.paymentMethod?.trim() || null,
            amountGhs: String(input.amountGhs),
            statusDefault: input.statusDefault,
            recurrence: "monthly",
            dayOfMonth: day,
            nextRunAt: input.firstRunAt,
            active: true,
        })
        .returning();

    return row;
}

export async function listExpenseSchedules(businessId: string) {
    return db
        .select()
        .from(expenseSchedules)
        .where(eq(expenseSchedules.businessId, businessId))
        .orderBy(asc(expenseSchedules.nextRunAt));
}
