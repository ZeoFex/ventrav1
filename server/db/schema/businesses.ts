import {
    pgTable,
    uuid,
    varchar,
    text,
    boolean,
    timestamp,
    jsonb,
    pgEnum,
} from "drizzle-orm/pg-core";

export const businessStatusEnum = pgEnum("business_status", [
    "active",
    "suspended",
    "deactivated",
]);

export const subscriptionStatusEnum = pgEnum("subscription_status", [
    "active",
    "past_due",
    "canceled",
]);

export const businessPlanEnum = pgEnum("business_plan", [
    "starter",
    "growth",
    "pro",
]);

export const businesses = pgTable("businesses", {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).unique().notNull(),
    businessType: varchar("business_type", { length: 100 }),
    legalName: varchar("legal_name", { length: 255 }),
    registrationId: varchar("registration_id", { length: 100 }),
    contactEmail: varchar("contact_email", { length: 320 }),
    phone: varchar("phone", { length: 30 }),
    address: text("address"),
    city: varchar("city", { length: 100 }),
    region: varchar("region", { length: 100 }),
    currency: varchar("currency", { length: 10 }).default("GHS").notNull(),
    locale: varchar("locale", { length: 20 }).default("en-GH"),
    timezone: varchar("timezone", { length: 50 })
        .default("Africa/Accra")
        .notNull(),
    taxRegistered: boolean("tax_registered").default(false),
    taxType: varchar("tax_type", { length: 50 }).default("none"),
    taxRate: varchar("tax_rate", { length: 10 }).default("0"),
    logoUrl: text("logo_url"),
    receiptHeader: text("receipt_header"),
    receiptFooter: text("receipt_footer"),
    schedule: jsonb("schedule"),
    structure: varchar("structure", { length: 20 }),
    onboardingCompleted: boolean("onboarding_completed").default(false),
    status: businessStatusEnum("status").default("active").notNull(),
    plan: businessPlanEnum("plan").default("starter").notNull(),
    subscriptionStatus: subscriptionStatusEnum("subscription_status").default("past_due").notNull(),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
});
