-- Persist the nurse's start event separately from the completed Vitals record.
ALTER TABLE "Attendance"
  ADD COLUMN "vitalsStartedAt" TIMESTAMP(3),
  ADD COLUMN "vitalsStartedById" TEXT;

CREATE INDEX "Attendance_vitalsStartedAt_idx"
  ON "Attendance"("vitalsStartedAt");
