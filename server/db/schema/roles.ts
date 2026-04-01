import {
    pgTable,
    uuid,
    varchar,
    boolean,
    timestamp,
    index,
    primaryKey,
} from "drizzle-orm/pg-core";
import { businesses } from "./businesses";
import { users } from "./users";
import { branches } from "./branches";

/** Roles table — each business has its own roles + system defaults */
export const roles = pgTable(
    "roles",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        businessId: uuid("business_id").references(() => businesses.id, {
            onDelete: "cascade",
        }),
        name: varchar("name", { length: 100 }).notNull(),
        isSystem: boolean("is_system").default(false).notNull(),
        createdAt: timestamp("created_at", { withTimezone: true })
            .defaultNow()
            .notNull(),
    },
    (t) => [index("roles_business_id_idx").on(t.businessId)]
);

/** Global permission keys */
export const permissions = pgTable("permissions", {
    id: uuid("id").primaryKey().defaultRandom(),
    key: varchar("key", { length: 100 }).unique().notNull(),
    label: varchar("label", { length: 255 }).notNull(),
});

/** Many-to-many: role ↔ permission */
export const rolePermissions = pgTable(
    "role_permissions",
    {
        roleId: uuid("role_id")
            .notNull()
            .references(() => roles.id, { onDelete: "cascade" }),
        permissionId: uuid("permission_id")
            .notNull()
            .references(() => permissions.id, { onDelete: "cascade" }),
    },
    (t) => [primaryKey({ columns: [t.roleId, t.permissionId] })]
);

/** Assignment: user ↔ role, optionally scoped to a branch */
export const userRoles = pgTable(
    "user_roles",
    {
        id: uuid("id").primaryKey().defaultRandom(),
        userId: uuid("user_id")
            .notNull()
            .references(() => users.id, { onDelete: "cascade" }),
        roleId: uuid("role_id")
            .notNull()
            .references(() => roles.id, { onDelete: "cascade" }),
        branchId: uuid("branch_id").references(() => branches.id, {
            onDelete: "set null",
        }),
        assignedAt: timestamp("assigned_at", { withTimezone: true })
            .defaultNow()
            .notNull(),
    },
    (t) => [
        index("user_roles_user_id_idx").on(t.userId),
        index("user_roles_role_id_idx").on(t.roleId),
        index("user_roles_branch_id_idx").on(t.branchId),
    ]
);
