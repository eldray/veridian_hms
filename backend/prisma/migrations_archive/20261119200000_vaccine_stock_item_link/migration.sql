-- Link immunization schedule entries to the existing pharmacy/inventory medicine catalogue.
ALTER TABLE "vaccines" ADD COLUMN "stockItemId" TEXT;
ALTER TABLE "vaccines" ADD CONSTRAINT "vaccines_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "StockItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "vaccines_stockItemId_idx" ON "vaccines"("stockItemId");
