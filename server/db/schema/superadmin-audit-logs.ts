import {
    pgTable,
    uuid,
    varchar,
    text,
    timestamp,
    jsonb,
    index,
} from "drizzle-orm/pg-core";
import { superadmins } from "./superadmins";

export const superadminAuditLogs = pgTable(
    "superadmin_audit_logs",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        superadminId: uuid("superadmin_id").references(() => superadmins.id, {
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
        index("superadmin_audit_logs_superadmin_id_idx").on(t.superadminId),
        index("superadmin_audit_logs_action_idx").on(t.action),
        index("superadmin_audit_logs_created_at_idx").on(t.createdAt),
    ]
);
