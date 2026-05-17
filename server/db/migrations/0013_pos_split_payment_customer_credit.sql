ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "accounts_receivable_ghs" numeric(12, 2) DEFAULT '0' NOT NULL;

ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "amount_paid_ghs" numeric(12, 2);
ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "balance_due_ghs" numeric(12, 2);
UPDATE "sales" SET "amount_paid_ghs" = "total_ghs"::numeric, "balance_due_ghs" = '0' WHERE "amount_paid_ghs" IS NULL;
ALTER TABLE "sales" ALTER COLUMN "amount_paid_ghs" SET NOT NULL;
ALTER TABLE "sales" ALTER COLUMN "balance_due_ghs" SET NOT NULL;

CREATE TABLE "sale_payment_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sale_id" uuid NOT NULL REFERENCES "sales"("id") ON DELETE CASCADE,
	"payment_method" varchar(30) NOT NULL,
	"amount_ghs" numeric(12, 2) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX "sale_payment_lines_sale_id_idx" ON "sale_payment_lines" ("sale_id");

CREATE TABLE "customer_account_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
	"branch_id" uuid REFERENCES "branches"("id") ON DELETE SET NULL,
	"customer_id" uuid NOT NULL REFERENCES "customers"("id") ON DELETE CASCADE,
	"sale_id" uuid REFERENCES "sales"("id") ON DELETE SET NULL,
	"kind" varchar(24) NOT NULL,
	"amount_ghs" numeric(12, 2) NOT NULL,
	"note" varchar(500),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX "customer_account_entries_customer_id_idx" ON "customer_account_entries" ("customer_id");
CREATE INDEX "customer_account_entries_business_id_idx" ON "customer_account_entries" ("business_id");
