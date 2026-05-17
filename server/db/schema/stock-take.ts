import {
    pgTable,
    uuid,
    text,
    integer,
    timestamp,
    index,
    uniqueIndex,
    pgEnum,
} from "drizzle-orm/pg-core";
import { businesses } from "./businesses";
import { branches } from "./branches";
import { users } from "./users";
import { products } from "./products";

export const stockTakeSessionStatusEnum = pgEnum("stock_take_session_status", [
    "draft",
    "completed",
    "cancelled",
]);

export const stockTakeSessions = pgTable(
    "stock_take_sessions",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        businessId: uuid("business_id")
            .notNull()
            .references(() => businesses.id, { onDelete: "cascade" }),
        branchId: uuid("branch_id")
            .notNull()
            .references(() => branches.id, { onDelete: "cascade" }),
        userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
        status: stockTakeSessionStatusEnum("status").default("draft").notNull(),
        note: text("note"),
        completedAt: timestamp("completed_at", { withTimezone: true }),
        createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    },
    (t) => [
        index("stock_take_sessions_business_id_idx").on(t.businessId),
        index("stock_take_sessions_branch_id_idx").on(t.branchId),
        index("stock_take_sessions_status_idx").on(t.status),
    ],
);

export const stockTakeLines = pgTable(
    "stock_take_lines",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        sessionId: uuid("session_id")
            .notNull()
            .references(() => stockTakeSessions.id, { onDelete: "cascade" }),
        productId: uuid("product_id")
            .notNull()
            .references(() => products.id, { onDelete: "cascade" }),
        systemQtySnapshot: integer("system_qty_snapshot").notNull(),
        countedQty: integer("counted_qty").notNull(),
        createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    },
    (t) => [
        index("stock_take_lines_session_id_idx").on(t.sessionId),
        index("stock_take_lines_product_id_idx").on(t.productId),
        uniqueIndex("stock_take_lines_session_product_unique").on(t.sessionId, t.productId),
    ],
);
