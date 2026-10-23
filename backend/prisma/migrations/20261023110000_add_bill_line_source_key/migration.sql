-- Stable identity for a clinical/ward source item already represented on a bill.
-- NULL values remain allowed for manually entered and historical line items.
ALTER TABLE "bill_line_items" ADD COLUMN "sourceKey" TEXT;
CREATE UNIQUE INDEX "bill_line_items_billId_sourceKey_key"
  ON "bill_line_items"("billId", "sourceKey");
