CREATE TYPE "public"."kitchen_ticket_status" AS ENUM('queued', 'preparing', 'ready', 'done');--> statement-breakpoint
ALTER TYPE "public"."sale_status" ADD VALUE 'partially_refunded' BEFORE 'refunded';--> statement-breakpoint
CREATE TABLE "kitchen_order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kitchen_order_id" uuid NOT NULL,
	"product_id" uuid,
	"variation_id" uuid,
	"product_name" varchar(255) NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price_ghs" numeric(12, 2) NOT NULL,
	"line_total_ghs" numeric(12, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kitchen_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"branch_id" uuid,
	"user_id" uuid,
	"kitchen_status" "kitchen_ticket_status" DEFAULT 'queued' NOT NULL,
	"sale_id" uuid,
	"display_label" varchar(80),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "businesses" DROP CONSTRAINT "businesses_referred_by_business_id_businesses_id_fk";
--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "onboarding_progress" jsonb;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "unit" varchar(20) DEFAULT 'piece' NOT NULL;--> statement-breakpoint
ALTER TABLE "sale_items" ADD COLUMN "quantity_returned" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "kitchen_order_items" ADD CONSTRAINT "kitchen_order_items_kitchen_order_id_kitchen_orders_id_fk" FOREIGN KEY ("kitchen_order_id") REFERENCES "public"."kitchen_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kitchen_order_items" ADD CONSTRAINT "kitchen_order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kitchen_order_items" ADD CONSTRAINT "kitchen_order_items_variation_id_product_variations_id_fk" FOREIGN KEY ("variation_id") REFERENCES "public"."product_variations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kitchen_orders" ADD CONSTRAINT "kitchen_orders_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kitchen_orders" ADD CONSTRAINT "kitchen_orders_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kitchen_orders" ADD CONSTRAINT "kitchen_orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kitchen_orders" ADD CONSTRAINT "kitchen_orders_sale_id_sales_id_fk" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "kitchen_order_items_order_id_idx" ON "kitchen_order_items" USING btree ("kitchen_order_id");--> statement-breakpoint
CREATE INDEX "kitchen_orders_business_id_idx" ON "kitchen_orders" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "kitchen_orders_branch_id_idx" ON "kitchen_orders" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "kitchen_orders_sale_id_idx" ON "kitchen_orders" USING btree ("sale_id");--> statement-breakpoint
CREATE INDEX "kitchen_orders_created_idx" ON "kitchen_orders" USING btree ("created_at");