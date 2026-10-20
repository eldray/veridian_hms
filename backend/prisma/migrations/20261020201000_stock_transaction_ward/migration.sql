ALTER TABLE "StockTransaction" ADD COLUMN IF NOT EXISTS "wardId" TEXT;
ALTER TABLE "StockTransaction"
  ADD CONSTRAINT "StockTransaction_wardId_fkey"
  FOREIGN KEY ("wardId") REFERENCES "Ward"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "StockTransaction_wardId_idx" ON "StockTransaction"("wardId");
