-- Add product_type enum + column on products and broadcasts table for admin email blasts.

CREATE TYPE "public"."product_type" AS ENUM('regular', 'scholarship');

ALTER TABLE "products"
  ADD COLUMN "product_type" "product_type" DEFAULT 'regular' NOT NULL;

CREATE TABLE IF NOT EXISTS "broadcasts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "subject" text NOT NULL,
  "message" text NOT NULL,
  "recipient_count" integer NOT NULL,
  "sent_success_count" integer NOT NULL,
  "sent_failure_count" integer DEFAULT 0 NOT NULL,
  "sent_by" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "broadcasts_created_at_idx"
  ON "broadcasts" USING btree ("created_at");
