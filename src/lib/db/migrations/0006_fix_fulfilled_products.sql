-- Backfill: mark products as fulfilled where current_amount has reached target_amount
UPDATE "products"
SET "is_fulfilled" = true
WHERE "target_amount" IS NOT NULL
  AND "current_amount" >= "target_amount"
  AND "is_fulfilled" = false;
