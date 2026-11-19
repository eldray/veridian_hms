ALTER TABLE "immunization_records" ADD COLUMN "stockTransactionId" TEXT;
CREATE UNIQUE INDEX "immunization_records_stockTransactionId_key" ON "immunization_records"("stockTransactionId");
ALTER TABLE "immunization_records" ADD CONSTRAINT "immunization_records_stockTransactionId_fkey" FOREIGN KEY ("stockTransactionId") REFERENCES "StockTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
