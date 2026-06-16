CREATE TABLE IF NOT EXISTS "master_catalog_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_type" varchar(100) NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "master_catalog_categories_shop_type_slug_uidx" ON "master_catalog_categories" ("shop_type","slug");
CREATE INDEX IF NOT EXISTS "master_catalog_categories_shop_type_idx" ON "master_catalog_categories" ("shop_type");
CREATE INDEX IF NOT EXISTS "master_catalog_categories_name_idx" ON "master_catalog_categories" ("name");

CREATE TABLE IF NOT EXISTS "master_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"normalized_name" varchar(255) NOT NULL,
	"shop_type" varchar(100) NOT NULL,
	"category_id" uuid,
	"category_name" varchar(255) DEFAULT 'Uncategorized' NOT NULL,
	"source_product_id" uuid,
	"source_business_id" uuid,
	"description" text,
	"image_src" text,
	"unit" varchar(20),
	"sku" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "master_products_dedup_uidx" ON "master_products" ("normalized_name","shop_type","category_name");
CREATE INDEX IF NOT EXISTS "master_products_name_idx" ON "master_products" ("name");
CREATE INDEX IF NOT EXISTS "master_products_normalized_name_idx" ON "master_products" ("normalized_name");
CREATE INDEX IF NOT EXISTS "master_products_shop_type_idx" ON "master_products" ("shop_type");
CREATE INDEX IF NOT EXISTS "master_products_category_id_idx" ON "master_products" ("category_id");
CREATE INDEX IF NOT EXISTS "master_products_category_name_idx" ON "master_products" ("category_name");
CREATE INDEX IF NOT EXISTS "master_products_source_product_id_idx" ON "master_products" ("source_product_id");
CREATE INDEX IF NOT EXISTS "master_products_source_business_id_idx" ON "master_products" ("source_business_id");

CREATE TABLE IF NOT EXISTS "master_catalog_sync_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"action" varchar(50) NOT NULL,
	"master_product_id" uuid,
	"source_product_id" uuid,
	"source_business_id" uuid,
	"shop_type" varchar(100),
	"product_name" varchar(255),
	"status" varchar(20) NOT NULL,
	"message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "master_catalog_sync_logs_created_at_idx" ON "master_catalog_sync_logs" ("created_at");
CREATE INDEX IF NOT EXISTS "master_catalog_sync_logs_shop_type_idx" ON "master_catalog_sync_logs" ("shop_type");
CREATE INDEX IF NOT EXISTS "master_catalog_sync_logs_status_idx" ON "master_catalog_sync_logs" ("status");

DO $$ BEGIN
 ALTER TABLE "master_products" ADD CONSTRAINT "master_products_category_id_master_catalog_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."master_catalog_categories"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
