-- Persist the start of each maternal attendance task separately from its clinical record.
ALTER TABLE "Attendance"
  ADD COLUMN "maternalStartedAt" TIMESTAMP(3),
  ADD COLUMN "maternalStartedById" TEXT;

CREATE INDEX "Attendance_maternalStartedAt_idx"
  ON "Attendance"("maternalStartedAt");
