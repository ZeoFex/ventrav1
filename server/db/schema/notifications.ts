/** Notifications database schema */
import {
    pgTable,
    uuid,
    varchar,
    text,
    boolean,
    timestamp,
    index,
    pgEnum,
} from "drizzle-orm/pg-core";
import { businesses } from "./businesses";
import { branches } from "./branches";

export const notificationIconEnum = pgEnum("notification_icon", [
    "package",
    "receipt",
    "settings",
    "info",
    "alert"
]);

export const notifications = pgTable(
    "notifications",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        businessId: uuid("business_id")
            .notNull()
            .references(() => businesses.id, { onDelete: "cascade" }),
        branchId: uuid("branch_id").references(() => branches.id, {
            onDelete: "cascade",
        }),
        title: varchar("title", { length: 255 }).notNull(),
        body: text("body").notNull(),
        icon: notificationIconEnum("icon").notNull().default("info"),
        isRead: boolean("is_read").notNull().default(false),
        createdAt: timestamp("created_at", { withTimezone: true })
            .defaultNow()
            .notNull(),
    },
    (t) => [
        index("notifications_business_id_idx").on(t.businessId),
        index("notifications_branch_id_idx").on(t.branchId),
    ]
);

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
