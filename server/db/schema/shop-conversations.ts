import { pgTable, uuid, varchar, text, timestamp, index } from "drizzle-orm/pg-core";
import { businesses } from "./businesses";
import { branches } from "./branches";
import { customerOrders } from "./customer-orders";
import { shoppers } from "./shoppers";

export const shopConversations = pgTable(
    "shop_conversations",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        businessId: uuid("business_id")
            .notNull()
            .references(() => businesses.id, { onDelete: "cascade" }),
        branchId: uuid("branch_id").references(() => branches.id, { onDelete: "set null" }),
        customerOrderId: uuid("customer_order_id")
            .notNull()
            .references(() => customerOrders.id, { onDelete: "cascade" }),
        shopperId: uuid("shopper_id")
            .notNull()
            .references(() => shoppers.id, { onDelete: "cascade" }),
        invoiceId: varchar("invoice_id", { length: 50 }).notNull(),
        shopName: varchar("shop_name", { length: 255 }).notNull(),
        customerName: varchar("customer_name", { length: 255 }).notNull(),
        customerPhone: varchar("customer_phone", { length: 30 }).notNull(),
        customerRegion: varchar("customer_region", { length: 100 }).notNull(),
        totalGhs: varchar("total_ghs", { length: 20 }).notNull(),
        createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    },
    (t) => [
        index("shop_conversations_business_id_idx").on(t.businessId),
        index("shop_conversations_shopper_id_idx").on(t.shopperId),
        index("shop_conversations_order_id_idx").on(t.customerOrderId),
    ],
);

export const shopMessages = pgTable(
    "shop_messages",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        conversationId: uuid("conversation_id")
            .notNull()
            .references(() => shopConversations.id, { onDelete: "cascade" }),
        sender: varchar("sender", { length: 16 }).notNull(),
        senderName: varchar("sender_name", { length: 255 }).notNull(),
        body: text("body").notNull(),
        createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    },
    (t) => [index("shop_messages_conversation_id_idx").on(t.conversationId)],
);
