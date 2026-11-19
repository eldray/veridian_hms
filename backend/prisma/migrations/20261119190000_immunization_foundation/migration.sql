ALTER TYPE "AttendanceType" ADD VALUE IF NOT EXISTS 'immunization';

-- Immunization catalogue and administration history
CREATE TABLE "vaccines" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "diseaseTargets" TEXT[] NOT NULL,
  "recommendedAge" TEXT,
  "doseSchedule" JSONB,
  "defaultDoseVolume" TEXT,
  "defaultRoute" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "vaccines_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "vaccines_code_key" ON "vaccines"("code");
CREATE INDEX "vaccines_name_idx" ON "vaccines"("name");
CREATE INDEX "vaccines_isActive_idx" ON "vaccines"("isActive");

CREATE TABLE "immunization_records" (
  "id" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "attendanceId" TEXT NOT NULL,
  "vaccineId" TEXT NOT NULL,
  "doseNumber" TEXT NOT NULL,
  "administeredAt" TIMESTAMP(3) NOT NULL,
  "doseVolume" TEXT,
  "route" TEXT,
  "administrationSite" TEXT,
  "batchNumber" TEXT,
  "expiryDate" TIMESTAMP(3),
  "nextDoseDue" TIMESTAMP(3),
  "adverseReaction" TEXT,
  "notes" TEXT,
  "administeredById" TEXT,
  "recordedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "immunization_records_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "immunization_records_patientId_administeredAt_idx" ON "immunization_records"("patientId", "administeredAt");
CREATE INDEX "immunization_records_attendanceId_idx" ON "immunization_records"("attendanceId");
CREATE INDEX "immunization_records_vaccineId_administeredAt_idx" ON "immunization_records"("vaccineId", "administeredAt");
CREATE INDEX "immunization_records_nextDoseDue_idx" ON "immunization_records"("nextDoseDue");
CREATE INDEX "immunization_records_batchNumber_idx" ON "immunization_records"("batchNumber");
ALTER TABLE "immunization_records" ADD CONSTRAINT "immunization_records_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "immunization_records" ADD CONSTRAINT "immunization_records_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "attendances"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "immunization_records" ADD CONSTRAINT "immunization_records_vaccineId_fkey" FOREIGN KEY ("vaccineId") REFERENCES "vaccines"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "immunization_records" ADD CONSTRAINT "immunization_records_administeredById_fkey" FOREIGN KEY ("administeredById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "immunization_records" ADD CONSTRAINT "immunization_records_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
