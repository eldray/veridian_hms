-- Add optional ward receiving location to purchase invoices.
-- The application validates that exactly one of receivedAtDepartmentId or
-- receivedAtWardId is supplied for new purchase invoices.
ALTER TABLE "Invoice"
  ADD COLUMN "receivedAtWardId" TEXT;

CREATE INDEX "Invoice_receivedAtWardId_idx"
  ON "Invoice"("receivedAtWardId");

ALTER TABLE "Invoice"
  ADD CONSTRAINT "Invoice_receivedAtWardId_fkey"
  FOREIGN KEY ("receivedAtWardId")
  REFERENCES "Ward"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;
