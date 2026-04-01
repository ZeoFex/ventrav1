import {
    pgTable,
    uuid,
    varchar,
    text,
    timestamp,
    jsonb,
    index,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { businesses } from "./businesses";

/**
 * Immutable audit trail for auth-related events.
 * Never update or delete rows — append only.
 */
export const auditLogs = pgTable(
    "audit_logs",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        userId: uuid("user_id").references(() => users.id, {
            onDelete: "set null",
        }),
        businessId: uuid("business_id").references(() => businesses.id, {
            onDelete: "set null",
        }),
        action: varchar("action", { length: 100 }).notNull(),
        resource: varchar("resource", { length: 100 }),
        resourceId: varchar("resource_id", { length: 255 }),
        metadata: jsonb("metadata"),
        ipAddress: varchar("ip_address", { length: 45 }),
        userAgent: text("user_agent"),
        createdAt: timestamp("created_at", { withTimezone: true })
            .defaultNow()
            .notNull(),
    },
    (t) => [
        index("audit_logs_user_id_idx").on(t.userId),
        index("audit_logs_business_id_idx").on(t.businessId),
        index("audit_logs_action_idx").on(t.action),
        index("audit_logs_created_at_idx").on(t.createdAt),
    ]
);
