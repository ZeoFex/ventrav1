import {
    pgTable,
    uuid,
    varchar,
    decimal,
    boolean,
    integer,
    timestamp,
    index,
} from "drizzle-orm/pg-core";
import { businesses } from "./businesses";
import { branches } from "./branches";
import { expenseStatusEnum } from "./expenses";

export const expenseSchedules = pgTable(
    "expense_schedules",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        businessId: uuid("business_id")
            .notNull()
            .references(() => businesses.id, { onDelete: "cascade" }),
        branchId: uuid("branch_id").references(() => branches.id, { onDelete: "set null" }),
        category: varchar("category", { length: 100 }).notNull(),
        description: varchar("description", { length: 255 }).notNull(),
        vendor: varchar("vendor", { length: 255 }),
        paymentMethod: varchar("payment_method", { length: 30 }),
        amountGhs: decimal("amount_ghs", { precision: 12, scale: 2 }).notNull(),
        statusDefault: expenseStatusEnum("status_default").default("Paid").notNull(),
        recurrence: varchar("recurrence", { length: 20 }).default("monthly").notNull(),
        dayOfMonth: integer("day_of_month").default(1).notNull(),
        nextRunAt: timestamp("next_run_at", { withTimezone: true }).notNull(),
        active: boolean("active").default(true).notNull(),
        createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    },
    (t) => [
        index("expense_schedules_business_id_idx").on(t.businessId),
        index("expense_schedules_next_run_idx").on(t.nextRunAt),
        index("expense_schedules_active_idx").on(t.active),
    ],
);
