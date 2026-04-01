import { pgTable, varchar, timestamp, pgEnum, uuid, index } from "drizzle-orm/pg-core";
import { businesses } from "./businesses";
import { branches } from "./branches";

export const customerStatusEnum = pgEnum("customer_status", ["active", "inactive"]);

export const customers = pgTable(
    "customers",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        businessId: uuid("business_id")
            .notNull()
            .references(() => businesses.id, { onDelete: "cascade" }),
        branchId: uuid("branch_id")
            .references(() => branches.id, { onDelete: "set null" }),
        name: varchar("name", { length: 255 }).notNull(),
        phone: varchar("phone", { length: 50 }).notNull(),
        email: varchar("email", { length: 255 }),
        status: customerStatusEnum("status").default("active").notNull(),
        createdAt: timestamp("created_at")
            .defaultNow()
            .notNull(),
        updatedAt: timestamp("updated_at")
            .defaultNow()
            .notNull(),
    },
    (t) => [
        index("customers_business_id_idx").on(t.businessId),
        index("customers_branch_id_idx").on(t.branchId),
    ]
);
