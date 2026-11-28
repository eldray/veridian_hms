-- Persist the pharmacist's start event separately from stock deduction.
ALTER TABLE "Medication"
  ADD COLUMN "dispensingStartedAt" TIMESTAMP(3),
  ADD COLUMN "dispensingStartedById" TEXT;

CREATE INDEX "Medication_dispensingStartedAt_idx"
  ON "Medication"("dispensingStartedAt");
