ALTER TABLE "broadcasts"
  ADD COLUMN IF NOT EXISTS "bcc_email" text;

ALTER TABLE "broadcasts"
  ADD COLUMN IF NOT EXISTS "failed_recipients" jsonb;
