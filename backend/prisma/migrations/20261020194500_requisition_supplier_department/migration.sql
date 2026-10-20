-- Explicit supplying department for each internal requisition.
ALTER TABLE "Requisition" ADD COLUMN IF NOT EXISTS "supplyingDepartmentId" TEXT;

ALTER TABLE "Requisition"
  ADD CONSTRAINT "Requisition_supplyingDepartmentId_fkey"
  FOREIGN KEY ("supplyingDepartmentId") REFERENCES "departments"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "Requisition_supplyingDepartmentId_idx"
  ON "Requisition"("supplyingDepartmentId");
