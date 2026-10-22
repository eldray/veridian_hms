-- Structured OPD clinical documentation. Nullable fields/defaults preserve existing records.
CREATE TYPE "ClinicalNoteStatus" AS ENUM ('draft', 'finalized', 'amended');
CREATE TYPE "ClinicalOutcome" AS ENUM ('treated_and_discharged', 'admitted', 'referred', 'transferred', 'left_against_medical_advice', 'left_without_being_seen', 'absconded', 'died', 'other');
CREATE TYPE "AllergyReviewStatus" AS ENUM ('not_reviewed', 'no_known_allergies', 'known_allergies');

ALTER TABLE "Attendance"
  ADD COLUMN "historyPresentingComplaint" TEXT,
  ADD COLUMN "reviewOfSystems" JSONB,
  ADD COLUMN "physicalExamination" JSONB,
  ADD COLUMN "physicalExaminationNotes" TEXT,
  ADD COLUMN "assessment" TEXT,
  ADD COLUMN "treatmentPlan" TEXT,
  ADD COLUMN "allergyReviewStatus" "AllergyReviewStatus" NOT NULL DEFAULT 'not_reviewed',
  ADD COLUMN "allergyReviewNotes" TEXT,
  ADD COLUMN "clinicalNoteStatus" "ClinicalNoteStatus" NOT NULL DEFAULT 'draft',
  ADD COLUMN "clinicalOutcome" "ClinicalOutcome",
  ADD COLUMN "clinicalProviderId" TEXT,
  ADD COLUMN "clinicalFinalizedById" TEXT,
  ADD COLUMN "clinicalFinalizedAt" TIMESTAMP(3);

CREATE INDEX "Attendance_clinicalNoteStatus_dateTime_idx" ON "Attendance"("clinicalNoteStatus", "dateTime");
CREATE INDEX "Attendance_clinicalOutcome_dateTime_idx" ON "Attendance"("clinicalOutcome", "dateTime");

ALTER TABLE "Attendance"
  ADD CONSTRAINT "Attendance_clinicalProviderId_fkey"
  FOREIGN KEY ("clinicalProviderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "Attendance_clinicalFinalizedById_fkey"
  FOREIGN KEY ("clinicalFinalizedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
