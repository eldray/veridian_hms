-- Expand Attendance with structured OPD clinical documentation fields.
-- All new fields are nullable to preserve legacy encounters and permit drafts.
CREATE TYPE "ClinicalConditionOutcome" AS ENUM ('improved', 'stable', 'unchanged', 'deteriorated', 'deceased', 'unknown');
CREATE TYPE "AllergyReviewStatus" AS ENUM ('not_reviewed', 'no_known_allergies', 'allergies_present');

ALTER TABLE "Attendance"
  ADD COLUMN "historyPresentingComplaint" TEXT,
  ADD COLUMN "reviewOfSystems" JSONB,
  ADD COLUMN "physicalExamination" TEXT,
  ADD COLUMN "physicalExamStructured" JSONB,
  ADD COLUMN "assessment" TEXT,
  ADD COLUMN "treatmentPlan" TEXT,
  ADD COLUMN "clinicalOutcome" "ClinicalConditionOutcome",
  ADD COLUMN "allergyReviewStatus" "AllergyReviewStatus",
  ADD COLUMN "allergyReviewNotes" TEXT,
  ADD COLUMN "allergyReviewedAt" TIMESTAMP(3),
  ADD COLUMN "allergyReviewedById" TEXT,
  ADD COLUMN "providerId" TEXT,
  ADD COLUMN "finalizedAt" TIMESTAMP(3),
  ADD COLUMN "finalizedById" TEXT;

-- Preserve existing SOAP/clinicalNotes JSON values in the new queryable fields.
-- COALESCE protects any values that may already have been entered into the new columns.
UPDATE "Attendance"
SET
  "historyPresentingComplaint" = COALESCE("historyPresentingComplaint", "clinicalNotes"->>'historyPresentingComplaint'),
  "physicalExamination" = COALESCE("physicalExamination", "clinicalNotes"->>'physicalExamination'),
  "assessment" = COALESCE("assessment", "clinicalNotes"->>'assessment'),
  "treatmentPlan" = COALESCE("treatmentPlan", "clinicalNotes"->>'treatmentPlan'),
  "reviewOfSystems" = COALESCE("reviewOfSystems", "clinicalNotes"->'reviewOfSystems'),
  "physicalExamStructured" = COALESCE("physicalExamStructured", "clinicalNotes"->'physicalExamStructured');

ALTER TABLE "Attendance"
  ADD CONSTRAINT "Attendance_allergyReviewedById_fkey"
    FOREIGN KEY ("allergyReviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "Attendance_providerId_fkey"
    FOREIGN KEY ("providerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "Attendance_finalizedById_fkey"
    FOREIGN KEY ("finalizedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Attendance_providerId_idx" ON "Attendance"("providerId");
CREATE INDEX "Attendance_finalizedAt_idx" ON "Attendance"("finalizedAt");
CREATE INDEX "Attendance_clinicalOutcome_idx" ON "Attendance"("clinicalOutcome");
