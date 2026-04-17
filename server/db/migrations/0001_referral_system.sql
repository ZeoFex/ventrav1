CREATE TYPE "public"."business_plan" AS ENUM('starter', 'growth', 'pro');--> statement-breakpoint
CREATE TYPE "public"."report_status" AS ENUM('sent', 'failed', 'pending');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('active', 'past_due', 'canceled');--> statement-breakpoint
CREATE TABLE "pending_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(320) NOT NULL,
	"plan" varchar(50) NOT NULL,
	"cycle" varchar(20) NOT NULL,
	"reference" varchar(100) NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"amount" varchar(50),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pending_subscriptions_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "product_variations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" varchar(100) NOT NULL,
	"price_ghs" numeric(12, 2),
	"stock" integer DEFAULT 0 NOT NULL,
	"sku" varchar(100),
	"barcode" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "referral_qualifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"referrer_business_id" uuid NOT NULL,
	"referee_business_id" uuid NOT NULL,
	"first_charge_reference" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"report_date" timestamp with time zone DEFAULT now() NOT NULL,
	"type" varchar(50) DEFAULT 'weekly_summary' NOT NULL,
	"stats" jsonb NOT NULL,
	"status" "report_status" DEFAULT 'pending' NOT NULL,
	"error_message" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "subscription_status" "subscription_status" DEFAULT 'past_due' NOT NULL;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "current_period_end" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "referral_code" varchar(32);--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "referred_by_business_id" uuid;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "referral_reward_bps" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "referral_discount_reserved_bps" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "sale_items" ADD COLUMN "variation_id" uuid;--> statement-breakpoint
ALTER TABLE "product_variations" ADD CONSTRAINT "product_variations_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_qualifications" ADD CONSTRAINT "referral_qualifications_referrer_business_id_businesses_id_fk" FOREIGN KEY ("referrer_business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_qualifications" ADD CONSTRAINT "referral_qualifications_referee_business_id_businesses_id_fk" FOREIGN KEY ("referee_business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "product_variations_product_id_idx" ON "product_variations" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "product_variations_barcode_idx" ON "product_variations" USING btree ("barcode");--> statement-breakpoint
CREATE UNIQUE INDEX "referral_qualifications_referee_unique" ON "referral_qualifications" USING btree ("referee_business_id");--> statement-breakpoint
CREATE INDEX "referral_qualifications_referrer_idx" ON "referral_qualifications" USING btree ("referrer_business_id");--> statement-breakpoint
CREATE INDEX "reports_business_id_idx" ON "reports" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "reports_report_date_idx" ON "reports" USING btree ("report_date");--> statement-breakpoint
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_referred_by_business_id_businesses_id_fk" FOREIGN KEY ("referred_by_business_id") REFERENCES "public"."businesses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_items" ADD CONSTRAINT "sale_items_variation_id_product_variations_id_fk" FOREIGN KEY ("variation_id") REFERENCES "public"."product_variations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "businesses_referral_code_idx" ON "businesses" USING btree ("referral_code");--> statement-breakpoint
CREATE INDEX "businesses_referred_by_idx" ON "businesses" USING btree ("referred_by_business_id");--> statement-breakpoint
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_referral_code_unique" UNIQUE("referral_code");