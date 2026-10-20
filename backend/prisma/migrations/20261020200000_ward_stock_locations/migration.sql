-- Track stock physically held by a ward separately from department and unassigned stock.
ALTER TABLE "stock_batches" ADD COLUMN IF NOT EXISTS "wardId" TEXT;
ALTER TABLE "stock_batches"
  ADD CONSTRAINT "stock_batches_wardId_fkey"
  FOREIGN KEY ("wardId") REFERENCES "Ward"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
DROP INDEX IF EXISTS "stock_batches_stockItemId_batchNumber_departmentId_key";
CREATE UNIQUE INDEX IF NOT EXISTS "stock_batches_stockItemId_batchNumber_departmentId_wardId_key"
  ON "stock_batches"("stockItemId", "batchNumber", "departmentId", "wardId");
CREATE INDEX IF NOT EXISTS "stock_batches_wardId_stockItemId_idx"
  ON "stock_batches"("wardId", "stockItemId");

ALTER TABLE "stock_item_department_balances" ADD COLUMN IF NOT EXISTS "wardId" TEXT;
ALTER TABLE "stock_item_department_balances"
  ADD CONSTRAINT "stock_item_department_balances_wardId_fkey"
  FOREIGN KEY ("wardId") REFERENCES "Ward"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "stock_item_department_balances_wardId_stockItemId_idx"
  ON "stock_item_department_balances"("wardId", "stockItemId");
