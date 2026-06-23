ALTER TABLE "product_barcode_labels" ALTER COLUMN "product_id" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "product_barcode_labels" ALTER COLUMN "price_ghs" DROP NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_barcode_labels_sku_idx" ON "product_barcode_labels" USING btree ("business_id", "sku");
