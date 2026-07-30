-- Espelho de src/lib/db/migrations/0010_add_broadcast_content.sql

ALTER TABLE "broadcasts" ADD COLUMN IF NOT EXISTS "content" jsonb;
