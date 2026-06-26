import {
    pgTable,
    uuid,
    varchar,
    text,
    boolean,
    integer,
    timestamp,
    jsonb,
    pgEnum,
    index,
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
    /**
     * Partial onboarding state persisted between sessions. Lets a user
     * resume the wizard from where they left off after closing the tab
     * or switching devices. Cleared when onboarding completes.
     */
    onboardingProgress: jsonb("onboarding_progress"),
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

    /** Public code for ?ref= links (unique, stable). */
    referralCode: varchar("referral_code", { length: 32 }).unique(),
    /** Set at signup if the business registered via a valid referral link. FK in migrations. */
    referredByBusinessId: uuid("referred_by_business_id"),
    /** Banked discount in basis points (200 = 2%), capped in app at REFERRAL_MAX_REWARD_BPS. */
    referralRewardBps: integer("referral_reward_bps").default(0).notNull(),
    /** Reserved for the next successful subscription charge (claim). */
    referralDiscountReservedBps: integer("referral_discount_reserved_bps")
        .default(0)
        .notNull(),
    /** Extra branches granted by platform admin (GHS 50/month each). */
    paidExtraBranches: integer("paid_extra_branches").default(0).notNull(),
}, (t) => [
    index("businesses_referral_code_idx").on(t.referralCode),
    index("businesses_referred_by_idx").on(t.referredByBusinessId),
]);
