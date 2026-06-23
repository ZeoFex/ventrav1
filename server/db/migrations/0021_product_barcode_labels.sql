CREATE TABLE IF NOT EXISTS "product_barcode_labels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"branch_id" uuid,
	"product_id" uuid NOT NULL,
	"label_name" varchar(255) NOT NULL,
	"label_description" text NOT NULL,
	"image_src" text NOT NULL,
	"sku" varchar(100) NOT NULL,
	"price_ghs" numeric(12, 2) NOT NULL,
	"unit" varchar(20),
	"quantity" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "product_barcode_labels" ADD CONSTRAINT "product_barcode_labels_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "product_barcode_labels" ADD CONSTRAINT "product_barcode_labels_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "product_barcode_labels" ADD CONSTRAINT "product_barcode_labels_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_barcode_labels_business_id_idx" ON "product_barcode_labels" USING btree ("business_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_barcode_labels_branch_id_idx" ON "product_barcode_labels" USING btree ("branch_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_barcode_labels_product_id_idx" ON "product_barcode_labels" USING btree ("product_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_barcode_labels_created_at_idx" ON "product_barcode_labels" USING btree ("created_at");
