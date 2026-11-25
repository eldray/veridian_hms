-- HIV Testing Services records. Values are stored as controlled strings to
-- preserve local HTS terminology while allowing reporting mappings to evolve.
CREATE TABLE "HIVTestingRecord" (
  "id" TEXT NOT NULL,
  "patientId" TEXT NOT NULL,
  "attendanceId" TEXT,
  "testedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "entryPoint" TEXT NOT NULL,
  "testingApproach" TEXT,
  "consentGiven" BOOLEAN NOT NULL DEFAULT false,
  "consentRecordedAt" TIMESTAMP(3),
  "counsellingPreTest" BOOLEAN NOT NULL DEFAULT false,
  "counsellingPostTest" BOOLEAN NOT NULL DEFAULT false,
  "testingStatus" TEXT NOT NULL DEFAULT 'not_started',
  "result" TEXT NOT NULL DEFAULT 'pending',
  "resultConfirmed" BOOLEAN NOT NULL DEFAULT false,
  "testAlgorithm" TEXT,
  "testKit" TEXT,
  "firstTimeTester" BOOLEAN,
  "previousTesting" TEXT,
  "previouslyKnownPositive" BOOLEAN NOT NULL DEFAULT false,
  "newlyIdentifiedPositive" BOOLEAN NOT NULL DEFAULT false,
  "indexTesting" BOOLEAN NOT NULL DEFAULT false,
  "stiRelated" BOOLEAN NOT NULL DEFAULT false,
  "keyPopulationCategory" TEXT,
  "linkageStatus" TEXT NOT NULL DEFAULT 'not_assessed',
  "linkedToCareAt" TIMESTAMP(3),
  "referralFacility" TEXT,
  "referralOutcome" TEXT,
  "notes" TEXT,
  "counsellorId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "HIVTestingRecord_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "HIVTestingRecord_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "HIVTestingRecord_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "Attendance"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "HIVTestingRecord_counsellorId_fkey" FOREIGN KEY ("counsellorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "HIVTestingRecord_testedAt_idx" ON "HIVTestingRecord"("testedAt");
CREATE INDEX "HIVTestingRecord_patientId_testedAt_idx" ON "HIVTestingRecord"("patientId", "testedAt");
CREATE INDEX "HIVTestingRecord_attendanceId_idx" ON "HIVTestingRecord"("attendanceId");
CREATE INDEX "HIVTestingRecord_entryPoint_testedAt_idx" ON "HIVTestingRecord"("entryPoint", "testedAt");
CREATE INDEX "HIVTestingRecord_result_testedAt_idx" ON "HIVTestingRecord"("result", "testedAt");
CREATE INDEX "HIVTestingRecord_linkageStatus_testedAt_idx" ON "HIVTestingRecord"("linkageStatus", "testedAt");
