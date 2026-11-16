ALTER TABLE shoppers ALTER COLUMN email DROP NOT NULL;
ALTER TABLE shoppers ALTER COLUMN email_normalized DROP NOT NULL;

ALTER TABLE shoppers ADD COLUMN IF NOT EXISTS phone_normalized varchar(20);

UPDATE shoppers
SET phone_normalized = CASE
    WHEN regexp_replace(phone, '\s+', '', 'g') LIKE '+233%' THEN regexp_replace(phone, '\D', '', 'g')
    WHEN regexp_replace(phone, '\s+', '', 'g') LIKE '233%'
        AND length(regexp_replace(phone, '\D', '', 'g')) >= 12 THEN regexp_replace(phone, '\D', '', 'g')
    WHEN regexp_replace(phone, '\s+', '', 'g') LIKE '0%' THEN '233' || substring(regexp_replace(phone, '\D', '', 'g') from 2)
    ELSE regexp_replace(phone, '\D', '', 'g')
END
WHERE phone_normalized IS NULL;

ALTER TABLE shoppers ALTER COLUMN phone_normalized SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS shoppers_phone_normalized_uidx ON shoppers (phone_normalized);

CREATE TABLE IF NOT EXISTS shopper_notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    shopper_id uuid NOT NULL REFERENCES shoppers(id) ON DELETE CASCADE,
    title varchar(255) NOT NULL,
    body text NOT NULL,
    href varchar(255),
    is_read boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS shopper_notifications_shopper_id_idx ON shopper_notifications (shopper_id);
