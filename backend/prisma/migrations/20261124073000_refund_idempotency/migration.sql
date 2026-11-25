-- Add a globally unique retry key to refund ledger entries.
-- NULL is retained for historical refunds; all newly submitted refunds carry a UUID.
ALTER TABLE "refunds" ADD COLUMN "idempotencyKey" TEXT;

CREATE UNIQUE INDEX "refunds_idempotencyKey_key" ON "refunds"("idempotencyKey");
