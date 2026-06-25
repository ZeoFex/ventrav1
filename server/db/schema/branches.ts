import {
    pgTable,
    uuid,
    varchar,
    text,
    boolean,
    timestamp,
    pgEnum,
    index,
} from "drizzle-orm/pg-core";
import { businesses } from "./businesses";

export const branchStatusEnum = pgEnum("branch_status", [
    "active",
    "inactive",
]);

export const branches = pgTable(
    "branches",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        businessId: uuid("business_id")
            .notNull()
            .references(() => businesses.id, { onDelete: "cascade" }),
        name: varchar("name", { length: 255 }).notNull(),
        /** Shop type slug for this branch (defaults to business type when unset). */
        businessType: varchar("business_type", { length: 100 }),
        code: varchar("code", { length: 20 }),
        region: varchar("region", { length: 100 }),
        address: text("address"),
        phone: varchar("phone", { length: 30 }),
        isMain: boolean("is_main").default(false),
        managerId: uuid("manager_id"), // FK to users, set later
        status: branchStatusEnum("status").default("active").notNull(),
        createdAt: timestamp("created_at", { withTimezone: true })
            .defaultNow()
            .notNull(),
        updatedAt: timestamp("updated_at", { withTimezone: true })
            .defaultNow()
            .notNull(),
    },
    (t) => [index("branches_business_id_idx").on(t.businessId)]
);
