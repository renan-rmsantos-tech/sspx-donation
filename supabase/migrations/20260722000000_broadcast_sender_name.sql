-- Espelho de src/lib/db/migrations/0009_add_broadcast_sender_name.sql
-- (mantém o Postgres local do Supabase CLI em dia com o schema de produção)
ALTER TABLE "broadcasts" ADD COLUMN IF NOT EXISTS "sender_name" text;
