-- Email verification magic links (stored as SHA-256 hash)
ALTER TABLE email_verifications
  ADD COLUMN IF NOT EXISTS link_token_hash varchar(128);

CREATE INDEX IF NOT EXISTS email_verifications_link_token_hash_idx
  ON email_verifications (link_token_hash)
  WHERE link_token_hash IS NOT NULL;

-- Per-branch shop type (for multi-type operators)
ALTER TABLE branches
  ADD COLUMN IF NOT EXISTS business_type varchar(100);

-- Admin-granted extra branches (GHS 50/month each)
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS paid_extra_branches integer NOT NULL DEFAULT 0;
