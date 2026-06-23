CREATE TABLE IF NOT EXISTS "global_barcode_catalog" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "barcode" varchar(100) NOT NULL,
  "product_name" varchar(255) NOT NULL,
  "description" text,
  "image_src" text,
  "unit" varchar(20),
  "source_business_id" uuid,
  "source_business_name" varchar(255),
  "contribution_count" integer DEFAULT 1 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "global_barcode_catalog_barcode_unique" UNIQUE("barcode")
);

DO $$ BEGIN
  ALTER TABLE "global_barcode_catalog"
    ADD CONSTRAINT "global_barcode_catalog_source_business_id_businesses_id_fk"
    FOREIGN KEY ("source_business_id") REFERENCES "public"."businesses"("id")
    ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE INDEX IF NOT EXISTS "global_barcode_catalog_barcode_idx" ON "global_barcode_catalog" ("barcode");
CREATE INDEX IF NOT EXISTS "global_barcode_catalog_product_name_idx" ON "global_barcode_catalog" ("product_name");
CREATE INDEX IF NOT EXISTS "global_barcode_catalog_updated_at_idx" ON "global_barcode_catalog" ("updated_at");
