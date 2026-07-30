ALTER TABLE "broadcasts"
  ADD COLUMN IF NOT EXISTS "signature_text" text;

CREATE TABLE IF NOT EXISTS "broadcast_drafts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "admin_username" text NOT NULL,
  "composer_id" uuid NOT NULL,
  "subject" text DEFAULT '' NOT NULL,
  "sender_name" text DEFAULT '' NOT NULL,
  "signature_text" text NOT NULL,
  "bcc_email" text,
  "test_email" text,
  "content" jsonb NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "broadcast_drafts_admin_username_unique" UNIQUE("admin_username")
);
