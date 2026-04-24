ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "unit" varchar(20) DEFAULT 'piece' NOT NULL;
