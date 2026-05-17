CREATE TYPE "public"."supplier_type" AS ENUM('individual', 'business');
CREATE TYPE "public"."supply_order_payment_status" AS ENUM('unpaid', 'partial', 'paid');

CREATE TABLE "suppliers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
	"branch_id" uuid REFERENCES "branches"("id") ON DELETE SET NULL,
	"type" "supplier_type" DEFAULT 'business' NOT NULL,
	"name" varchar(255) NOT NULL,
	"truck_number" varchar(50),
	"email" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "suppliers_business_id_idx" ON "suppliers" ("business_id");
CREATE INDEX IF NOT EXISTS "suppliers_branch_id_idx" ON "suppliers" ("branch_id");

CREATE TABLE "supplier_phones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"supplier_id" uuid NOT NULL REFERENCES "suppliers"("id") ON DELETE CASCADE,
	"phone" varchar(50) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);

CREATE INDEX IF NOT EXISTS "supplier_phones_supplier_id_idx" ON "supplier_phones" ("supplier_id");

CREATE TABLE "supply_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
	"branch_id" uuid REFERENCES "branches"("id") ON DELETE SET NULL,
	"supplier_id" uuid NOT NULL REFERENCES "suppliers"("id") ON DELETE CASCADE,
	"reference" varchar(80) NOT NULL,
	"ordered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"payment_status" "supply_order_payment_status" DEFAULT 'unpaid' NOT NULL,
	"amount_paid_ghs" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total_cost_ghs" numeric(12, 2) NOT NULL,
	"total_line_items" integer DEFAULT 0 NOT NULL,
	"notes" text,
	"idempotency_key" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "supply_orders_business_idempotency_unique" UNIQUE("business_id", "idempotency_key")
);

CREATE INDEX IF NOT EXISTS "supply_orders_business_id_idx" ON "supply_orders" ("business_id");
CREATE INDEX IF NOT EXISTS "supply_orders_supplier_id_idx" ON "supply_orders" ("supplier_id");
CREATE INDEX IF NOT EXISTS "supply_orders_ordered_at_idx" ON "supply_orders" ("ordered_at");

CREATE TABLE "supply_order_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"supply_order_id" uuid NOT NULL REFERENCES "supply_orders"("id") ON DELETE CASCADE,
	"product_id" uuid REFERENCES "products"("id") ON DELETE SET NULL,
	"product_name" varchar(255) NOT NULL,
	"category_name" varchar(100),
	"cartons" integer DEFAULT 0 NOT NULL,
	"items_per_carton" integer DEFAULT 1 NOT NULL,
	"quantity_total" integer NOT NULL,
	"unit_cost_ghs" numeric(12, 4) NOT NULL,
	"line_total_ghs" numeric(12, 2) NOT NULL,
	"batch_no" varchar(80),
	"expiry_date" date,
	"notes" text
);

CREATE INDEX IF NOT EXISTS "supply_order_lines_order_id_idx" ON "supply_order_lines" ("supply_order_id");
CREATE INDEX IF NOT EXISTS "supply_order_lines_product_id_idx" ON "supply_order_lines" ("product_id");
