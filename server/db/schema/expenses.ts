import {
    pgTable,
    uuid,
    varchar,
    decimal,
    text,
    timestamp,
    index,
    pgEnum,
} from "drizzle-orm/pg-core";
import { businesses } from "./businesses";
import { branches } from "./branches";

export const expenseStatusEnum = pgEnum("expense_status", ["Paid", "Pending"]);

export const expenses = pgTable(
    "expenses",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        businessId: uuid("business_id")
            .notNull()
            .references(() => businesses.id, { onDelete: "cascade" }),
        branchId: uuid("branch_id")
            .references(() => branches.id, { onDelete: "set null" }),
        date: timestamp("date", { withTimezone: true }).defaultNow().notNull(),
        description: varchar("description", { length: 255 }).notNull(),
        category: varchar("category", { length: 100 }).notNull(),
        amountGhs: decimal("amount_ghs", { precision: 12, scale: 2 }).notNull(),
        status: expenseStatusEnum("status").default("Paid").notNull(),
        paymentMethod: varchar("payment_method", { length: 30 }),
        vendor: varchar("vendor", { length: 255 }),
        receiptUrl: text("receipt_url"),
        createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    },
    (t) => [
        index("expenses_business_id_idx").on(t.businessId),
        index("expenses_branch_id_idx").on(t.branchId),
        index("expenses_date_idx").on(t.date),
        index("expenses_category_idx").on(t.category),
        index("expenses_vendor_idx").on(t.vendor),
    ]
);
