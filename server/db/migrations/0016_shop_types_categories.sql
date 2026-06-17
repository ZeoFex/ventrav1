CREATE TABLE IF NOT EXISTS "shop_types" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "name" varchar(255) NOT NULL,
    "slug" varchar(100) NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT "shop_types_slug_unique" UNIQUE("slug")
);

CREATE INDEX IF NOT EXISTS "shop_types_slug_idx" ON "shop_types" ("slug");

CREATE TABLE IF NOT EXISTS "subcategories" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "business_id" uuid NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
    "category_id" uuid NOT NULL REFERENCES "categories"("id") ON DELETE CASCADE,
    "branch_id" uuid REFERENCES "branches"("id") ON DELETE SET NULL,
    "name" varchar(255) NOT NULL,
    "slug" varchar(255) NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "subcategories_business_id_idx" ON "subcategories" ("business_id");
CREATE INDEX IF NOT EXISTS "subcategories_category_id_idx" ON "subcategories" ("category_id");
CREATE INDEX IF NOT EXISTS "subcategories_branch_id_idx" ON "subcategories" ("branch_id");

ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "subcategory_id" uuid REFERENCES "subcategories"("id") ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS "products_subcategory_id_idx" ON "products" ("subcategory_id");

-- Seed shop types (idempotent)
INSERT INTO "shop_types" ("slug", "name") VALUES
    ('pharmacy', 'Pharmacy'),
    ('agrochemical_shop', 'Agrochemical Shop'),
    ('building_construction', 'Building & Construction Materials'),
    ('boutique_fashion', 'Boutique / Fashion Store'),
    ('supermarket', 'Supermarket'),
    ('cold_store', 'Cold Store'),
    ('electronics_store', 'Electronics Store'),
    ('hardware_store', 'Hardware Store'),
    ('stationery_bookshop', 'Stationery & Bookshop'),
    ('furniture_store', 'Furniture Store'),
    ('cosmetics_beauty', 'Cosmetics & Beauty Shop'),
    ('general_retail_store', 'General Retail Store')
ON CONFLICT ("slug") DO NOTHING;

-- Map legacy business_type values to new shop type slugs
UPDATE "businesses" SET "business_type" = 'pharmacy' WHERE "business_type" = 'pharmacy';
UPDATE "businesses" SET "business_type" = 'agrochemical_shop' WHERE "business_type" = 'agro_chemicals';
UPDATE "businesses" SET "business_type" = 'boutique_fashion' WHERE "business_type" = 'boutique';
UPDATE "businesses" SET "business_type" = 'supermarket' WHERE "business_type" IN ('supermarket', 'mini_mart');
UPDATE "businesses" SET "business_type" = 'electronics_store' WHERE "business_type" = 'electronics';
UPDATE "businesses" SET "business_type" = 'cold_store' WHERE "business_type" = 'cold_store';
UPDATE "businesses" SET "business_type" = 'general_retail_store' WHERE "business_type" IN ('retail', 'other');
