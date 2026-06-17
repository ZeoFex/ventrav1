ALTER TABLE "master_products" ADD COLUMN IF NOT EXISTS "barcode" varchar(100);
ALTER TABLE "master_products" ADD COLUMN IF NOT EXISTS "source_business_name" varchar(255);

CREATE INDEX IF NOT EXISTS "master_products_barcode_idx" ON "master_products" ("barcode");
CREATE INDEX IF NOT EXISTS "master_products_source_business_name_idx" ON "master_products" ("source_business_name");
