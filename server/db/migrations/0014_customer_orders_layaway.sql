ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "stock_reserved" integer DEFAULT 0 NOT NULL;
ALTER TABLE "product_variations" ADD COLUMN IF NOT EXISTS "stock_reserved" integer DEFAULT 0 NOT NULL;

CREATE TABLE "customer_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
	"branch_id" uuid REFERENCES "branches"("id") ON DELETE SET NULL,
	"customer_id" uuid NOT NULL REFERENCES "customers"("id") ON DELETE CASCADE,
	"user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL,
	"invoice_id" varchar(50) NOT NULL,
	"status" varchar(24) NOT NULL,
	"subtotal_ghs" numeric(12, 2) NOT NULL,
	"tax_ghs" numeric(12, 2) NOT NULL,
	"discount_ghs" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total_ghs" numeric(12, 2) NOT NULL,
	"amount_paid_ghs" numeric(12, 2) DEFAULT '0' NOT NULL,
	"balance_due_ghs" numeric(12, 2) DEFAULT '0' NOT NULL,
	"completed_sale_id" uuid REFERENCES "sales"("id") ON DELETE SET NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX "customer_orders_business_id_idx" ON "customer_orders" ("business_id");
CREATE INDEX "customer_orders_branch_id_idx" ON "customer_orders" ("branch_id");
CREATE INDEX "customer_orders_customer_id_idx" ON "customer_orders" ("customer_id");
CREATE INDEX "customer_orders_status_idx" ON "customer_orders" ("status");
CREATE INDEX "customer_orders_invoice_id_idx" ON "customer_orders" ("invoice_id");

CREATE TABLE "customer_order_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_order_id" uuid NOT NULL REFERENCES "customer_orders"("id") ON DELETE CASCADE,
	"product_id" uuid REFERENCES "products"("id") ON DELETE SET NULL,
	"variation_id" uuid REFERENCES "product_variations"("id") ON DELETE SET NULL,
	"product_name" varchar(255) NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price_ghs" numeric(12, 2) NOT NULL,
	"line_total_ghs" numeric(12, 2) NOT NULL
);

CREATE INDEX "customer_order_lines_order_id_idx" ON "customer_order_lines" ("customer_order_id");

CREATE TABLE "customer_order_payment_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_order_id" uuid NOT NULL REFERENCES "customer_orders"("id") ON DELETE CASCADE,
	"payment_method" varchar(30) NOT NULL,
	"amount_ghs" numeric(12, 2) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX "customer_order_payment_lines_order_id_idx" ON "customer_order_payment_lines" ("customer_order_id");
