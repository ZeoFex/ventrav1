ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone_normalized" varchar(20);

CREATE INDEX IF NOT EXISTS "users_phone_normalized_idx" ON "users" ("phone_normalized");

-- Backfill phone_normalized for existing staff (non-owner roles)
UPDATE "users" u
SET "phone_normalized" = regexp_replace(
  CASE
    WHEN u.phone LIKE '+233%' THEN u.phone
    WHEN u.phone LIKE '0%' THEN '+233' || substring(u.phone from 2)
    ELSE u.phone
  END,
  '[^0-9]',
  '',
  'g'
)
FROM "user_roles" ur
INNER JOIN "roles" r ON r.id = ur.role_id
WHERE u.id = ur.user_id
  AND r.name <> 'owner'
  AND u.phone IS NOT NULL
  AND u.phone_normalized IS NULL;
