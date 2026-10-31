CREATE TABLE IF NOT EXISTS shoppers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email varchar(320) NOT NULL UNIQUE,
    email_normalized varchar(320) NOT NULL UNIQUE,
    password_hash text NOT NULL,
    phone varchar(30) NOT NULL,
    region varchar(100) NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS shoppers_email_normalized_idx ON shoppers (email_normalized);
