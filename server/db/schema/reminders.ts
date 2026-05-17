import {
    pgTable,
    uuid,
    varchar,
    text,
    timestamp,
    index,
} from "drizzle-orm/pg-core";
import { businesses } from "./businesses";
import { branches } from "./branches";

export const reminders = pgTable(
    "reminders",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        businessId: uuid("business_id")
            .notNull()
            .references(() => businesses.id, { onDelete: "cascade" }),
        branchId: uuid("branch_id").references(() => branches.id, { onDelete: "set null" }),
        title: varchar("title", { length: 200 }).notNull(),
        notes: text("notes"),
        remindAt: timestamp("remind_at", { withTimezone: true }).notNull(),
        completedAt: timestamp("completed_at", { withTimezone: true }),
        createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    },
    (t) => [
        index("reminders_business_id_idx").on(t.businessId),
        index("reminders_branch_id_idx").on(t.branchId),
        index("reminders_remind_at_idx").on(t.remindAt),
    ],
);
