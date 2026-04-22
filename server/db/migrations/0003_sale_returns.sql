ALTER TYPE "public"."sale_status" ADD VALUE IF NOT EXISTS 'partially_refunded';--> statement-breakpoint
ALTER TABLE "sale_items" ADD COLUMN IF NOT EXISTS "quantity_returned" integer DEFAULT 0 NOT NULL;
