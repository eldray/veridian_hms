-- Structured medication prescriptions and immutable insurance-claim prescription snapshots.
-- All new fields are nullable/defaulted so existing prescriptions and claim history remain readable.
ALTER TABLE "Medication"
  ADD COLUMN "doseAmount" DECIMAL(12,4),
  ADD COLUMN "doseUnit" TEXT,
  ADD COLUMN "frequencyCode" TEXT,
  ADD COLUMN "frequencyIntervalHours" INTEGER,
  ADD COLUMN "durationValue" INTEGER,
  ADD COLUMN "durationUnit" TEXT,
  ADD COLUMN "quantityUnit" TEXT,
  ADD COLUMN "prnIndication" TEXT,
  ADD COLUMN "prnMaxDosesPerDay" INTEGER,
  ADD COLUMN "prnMinimumIntervalHours" INTEGER,
  ADD COLUMN "prescriptionVersion" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "medication_doses"
  ADD COLUMN "doseAmount" DECIMAL(12,4),
  ADD COLUMN "doseUnit" TEXT,
  ADD COLUMN "administrationReason" TEXT,
  ADD COLUMN "recordedAt" TIMESTAMP(3);

ALTER TABLE "insurance_claim_items"
  ADD COLUMN "prescriptionSnapshot" JSONB,
  ADD COLUMN "prescriptionSnapshotAt" TIMESTAMP(3),
  ADD COLUMN "prescriptionSnapshotVersion" INTEGER;

-- Backfill only unambiguous, common frequency aliases. Original text remains untouched.
UPDATE "Medication"
SET "frequencyCode" = CASE LOWER(TRIM("frequency"))
  WHEN 'od' THEN 'OD' WHEN 'once' THEN 'OD' WHEN 'once daily' THEN 'OD'
  WHEN 'bd' THEN 'BD' WHEN 'bid' THEN 'BD' WHEN 'twice daily' THEN 'BD'
  WHEN 'tds' THEN 'TDS' WHEN 'tid' THEN 'TDS' WHEN 'three times daily' THEN 'TDS'
  WHEN 'qid' THEN 'QID' WHEN 'qds' THEN 'QID' WHEN 'four times daily' THEN 'QID'
  WHEN 'stat' THEN 'STAT' WHEN 'prn' THEN 'PRN' WHEN 'sos' THEN 'PRN'
  WHEN 'nocte' THEN 'NOCTE' WHEN 'mane' THEN 'MANE'
  ELSE NULL END
WHERE "frequency" IS NOT NULL AND "frequencyCode" IS NULL;

-- Parse common duration values conservatively; ambiguous/free-text values remain null.
UPDATE "Medication"
SET "durationValue" = (regexp_match(LOWER(TRIM("duration")), '^([0-9]+)\s*(day|days|d)$'))[1]::INTEGER,
    "durationUnit" = 'days'
WHERE "duration" ~* '^[0-9]+\s*(day|days|d)$';

UPDATE "Medication"
SET "durationValue" = (regexp_match(LOWER(TRIM("duration")), '^([0-9]+)\s*(week|weeks|wk|wks)$'))[1]::INTEGER,
    "durationUnit" = 'weeks'
WHERE "duration" ~* '^[0-9]+\s*(week|weeks|wk|wks)$';

UPDATE "Medication"
SET "doseAmount" = (regexp_match(LOWER(TRIM("dosage")), '^([0-9]+(\.[0-9]+)?)\s*(mcg|μg|ug|mg|g|ml|iu|units?)$'))[1]::DECIMAL(12,4),
    "doseUnit" = CASE LOWER((regexp_match(LOWER(TRIM("dosage")), '^([0-9]+(\.[0-9]+)?)\s*(mcg|μg|ug|mg|g|ml|iu|units?)$'))[3])
      WHEN 'μg' THEN 'mcg' WHEN 'ug' THEN 'mcg' ELSE LOWER((regexp_match(LOWER(TRIM("dosage")), '^([0-9]+(\.[0-9]+)?)\s*(mcg|μg|ug|mg|g|ml|iu|units?)$'))[3]) END
WHERE "dosage" ~* '^[0-9]+(\.[0-9]+)?\s*(mcg|μg|ug|mg|g|ml|iu|units?)$';

UPDATE "Medication"
SET "frequencyIntervalHours" = (regexp_match(LOWER(TRIM("frequency")), '^(?:q\s*|every\s+)([0-9]+)\s*h(?:ours?)?$'))[1]::INTEGER,
    "frequencyCode" = 'INTERVAL'
WHERE "frequency" ~* '^(?:q\s*|every\s+)[0-9]+\s*h(?:ours?)?$';

UPDATE "Medication" AS medication
SET "quantityUnit" = stock."unitOfMeasure"
FROM "StockItem" AS stock
WHERE medication."stockItemId" = stock."id"
  AND medication."quantityUnit" IS NULL;
