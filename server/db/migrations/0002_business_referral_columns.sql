-- Idempotent: adds referral columns + table if 0001 failed partway (e.g. duplicate enums).
-- Safe to run when columns or table already exist.

ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "referral_code" varchar(32);
ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "referred_by_business_id" uuid;
ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "referral_reward_bps" integer DEFAULT 0 NOT NULL;
ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "referral_discount_reserved_bps" integer DEFAULT 0 NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "businesses_referral_code_unique" ON "businesses" ("referral_code");
CREATE INDEX IF NOT EXISTS "businesses_referral_code_idx" ON "businesses" USING btree ("referral_code");
CREATE INDEX IF NOT EXISTS "businesses_referred_by_idx" ON "businesses" USING btree ("referred_by_business_id");

DO $$ BEGIN
  ALTER TABLE "businesses" ADD CONSTRAINT "businesses_referred_by_business_id_businesses_id_fk"
    FOREIGN KEY ("referred_by_business_id") REFERENCES "public"."businesses"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "referral_qualifications" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "referrer_business_id" uuid NOT NULL,
  "referee_business_id" uuid NOT NULL,
  "first_charge_reference" varchar(255) NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

DO $$ BEGIN
  ALTER TABLE "referral_qualifications" ADD CONSTRAINT "referral_qualifications_referrer_business_id_businesses_id_fk"
    FOREIGN KEY ("referrer_business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "referral_qualifications" ADD CONSTRAINT "referral_qualifications_referee_business_id_businesses_id_fk"
    FOREIGN KEY ("referee_business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "referral_qualifications_referee_unique" ON "referral_qualifications" USING btree ("referee_business_id");
CREATE INDEX IF NOT EXISTS "referral_qualifications_referrer_idx" ON "referral_qualifications" USING btree ("referrer_business_id");
