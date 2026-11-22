-- Keep the original prescribed quantity intact and record the actual
-- quantity handed out separately. Existing dispensed rows historically
-- overwrote quantity with the amount dispensed, so preserve that value.
ALTER TABLE "Medication"
ADD COLUMN "dispensedQuantity" INTEGER;

UPDATE "Medication"
SET "dispensedQuantity" = "quantity"
WHERE "status" IN ('dispensed', 'administered');
