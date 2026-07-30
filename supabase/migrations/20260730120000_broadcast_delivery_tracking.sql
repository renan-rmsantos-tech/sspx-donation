-- Espelho de src/lib/db/migrations/0012_add_broadcast_delivery_tracking.sql

ALTER TABLE "broadcasts"
  ADD COLUMN IF NOT EXISTS "bcc_email" text;

ALTER TABLE "broadcasts"
  ADD COLUMN IF NOT EXISTS "failed_recipients" jsonb;
