-- Add an idempotency key to make payment submissions safe to retry.
-- Existing payment rows remain valid because the new column is nullable.
ALTER TABLE "Payment" ADD COLUMN "idempotencyKey" TEXT;
CREATE UNIQUE INDEX "Payment_idempotencyKey_key" ON "Payment"("idempotencyKey");
