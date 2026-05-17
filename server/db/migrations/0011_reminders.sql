CREATE TABLE "reminders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
	"branch_id" uuid REFERENCES "branches"("id") ON DELETE SET NULL,
	"title" varchar(200) NOT NULL,
	"notes" text,
	"remind_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "reminders_business_id_idx" ON "reminders" ("business_id");
CREATE INDEX IF NOT EXISTS "reminders_branch_id_idx" ON "reminders" ("branch_id");
CREATE INDEX IF NOT EXISTS "reminders_remind_at_idx" ON "reminders" ("remind_at");
