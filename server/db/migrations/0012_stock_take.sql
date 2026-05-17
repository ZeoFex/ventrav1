CREATE TYPE "public"."stock_take_session_status" AS ENUM('draft', 'completed', 'cancelled');

CREATE TABLE "stock_take_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
	"branch_id" uuid NOT NULL REFERENCES "branches"("id") ON DELETE CASCADE,
	"user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
	"status" "stock_take_session_status" DEFAULT 'draft' NOT NULL,
	"note" text,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "stock_take_sessions_business_id_idx" ON "stock_take_sessions" ("business_id");
CREATE INDEX IF NOT EXISTS "stock_take_sessions_branch_id_idx" ON "stock_take_sessions" ("branch_id");
CREATE INDEX IF NOT EXISTS "stock_take_sessions_status_idx" ON "stock_take_sessions" ("status");

CREATE TABLE "stock_take_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL REFERENCES "stock_take_sessions"("id") ON DELETE CASCADE,
	"product_id" uuid NOT NULL REFERENCES "products"("id") ON DELETE CASCADE,
	"system_qty_snapshot" integer NOT NULL,
	"counted_qty" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stock_take_lines_session_product_unique" UNIQUE("session_id", "product_id")
);

CREATE INDEX IF NOT EXISTS "stock_take_lines_session_id_idx" ON "stock_take_lines" ("session_id");
CREATE INDEX IF NOT EXISTS "stock_take_lines_product_id_idx" ON "stock_take_lines" ("product_id");
