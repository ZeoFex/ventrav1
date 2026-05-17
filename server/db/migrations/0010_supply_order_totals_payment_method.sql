ALTER TABLE "supply_orders" ADD COLUMN IF NOT EXISTS "total_units_supplied" integer DEFAULT 0 NOT NULL;
ALTER TABLE "supply_orders" ADD COLUMN IF NOT EXISTS "payment_method" varchar(30);

UPDATE "supply_orders" o
SET "total_units_supplied" = COALESCE((
  SELECT SUM(l.quantity_total)::int FROM "supply_order_lines" l WHERE l.supply_order_id = o.id
), 0)
WHERE "total_units_supplied" = 0;
