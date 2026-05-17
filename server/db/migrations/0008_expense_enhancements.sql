-- Optional payment / vendor / receipt metadata on expenses
ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "payment_method" varchar(30);
ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "vendor" varchar(255);
ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "receipt_url" text;
CREATE INDEX IF NOT EXISTS "expenses_vendor_idx" ON "expenses" ("vendor");

-- Recurring expense templates (e.g. monthly salaries)
CREATE TABLE IF NOT EXISTS "expense_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
	"branch_id" uuid REFERENCES "branches"("id") ON DELETE SET NULL,
	"category" varchar(100) NOT NULL,
	"description" varchar(255) NOT NULL,
	"vendor" varchar(255),
	"payment_method" varchar(30),
	"amount_ghs" numeric(12, 2) NOT NULL,
	"status_default" "expense_status" DEFAULT 'Paid' NOT NULL,
	"recurrence" varchar(20) DEFAULT 'monthly' NOT NULL,
	"day_of_month" integer DEFAULT 1 NOT NULL,
	"next_run_at" timestamp with time zone NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "expense_schedules_day_chk" CHECK ("day_of_month" >= 1 AND "day_of_month" <= 28)
);

CREATE INDEX IF NOT EXISTS "expense_schedules_business_id_idx" ON "expense_schedules" ("business_id");
CREATE INDEX IF NOT EXISTS "expense_schedules_next_run_idx" ON "expense_schedules" ("next_run_at");
CREATE INDEX IF NOT EXISTS "expense_schedules_active_idx" ON "expense_schedules" ("active");
