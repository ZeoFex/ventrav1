import {
    pgTable,
    uuid,
    varchar,
    text,
    boolean,
    timestamp,
    jsonb,
    index,
    pgEnum,
} from "drizzle-orm/pg-core";
import { businesses } from "./businesses";

export const platformNotificationTypeEnum = pgEnum("platform_notification_type", [
    "shop_created",
    "shop_onboarded",
    "subscription_past_due",
    "subscription_expiring",
    "product_added",
    "products_bulk_added",
]);

export const platformNotifications = pgTable(
    "platform_notifications",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        type: platformNotificationTypeEnum("type").notNull(),
        title: varchar("title", { length: 255 }).notNull(),
        body: text("body").notNull(),
        businessId: uuid("business_id").references(() => businesses.id, {
            onDelete: "set null",
        }),
        productId: uuid("product_id"),
        metadata: jsonb("metadata"),
        isRead: boolean("is_read").default(false).notNull(),
        createdAt: timestamp("created_at", { withTimezone: true })
            .defaultNow()
            .notNull(),
    },
    (t) => [
        index("platform_notifications_created_at_idx").on(t.createdAt),
        index("platform_notifications_is_read_idx").on(t.isRead),
        index("platform_notifications_business_id_idx").on(t.businessId),
    ]
);

export type PlatformNotification = typeof platformNotifications.$inferSelect;
