-- Store new-case vs old-case classification per diagnosis, as needed for HMIS/DHIMS morbidity reporting.
ALTER TABLE "AttendanceDiagnosis"
  ADD COLUMN "classification" "DiagnosisClassification";

-- Preserve legacy visit-level classification for the primary diagnosis only.
-- We intentionally do not copy it to every diagnosis because co-morbid diagnoses may differ.
UPDATE "AttendanceDiagnosis" AS ad
SET "classification" = a."diagnosisClassification"
FROM "Attendance" AS a
WHERE ad."attendanceId" = a."id"
  AND ad."diagnosisType" = 'primary'
  AND a."diagnosisClassification" IS NOT NULL;

CREATE INDEX "AttendanceDiagnosis_classification_createdAt_idx"
  ON "AttendanceDiagnosis"("classification", "createdAt");
