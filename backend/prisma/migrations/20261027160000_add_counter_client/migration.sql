-- The counter: a self-pay customer who buys drugs or has one lab test or scan done and
-- nothing else. They are held OUTSIDE the patient register on purpose, so an Attendance
-- and its Bill can name a CounterClient instead of a Patient.

-- 1. The counter customer. One free-text name, age and phone optional.
CREATE TABLE "CounterClient" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ageYears" INTEGER,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "registeredPatientId" TEXT,

    CONSTRAINT "CounterClient_pkey" PRIMARY KEY ("id")
);

-- Set once the customer registers properly, so their counter history follows the folder.
ALTER TABLE "CounterClient" ADD CONSTRAINT "CounterClient_registeredPatientId_fkey"
    FOREIGN KEY ("registeredPatientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE UNIQUE INDEX "CounterClient_registeredPatientId_key" ON "CounterClient"("registeredPatientId");
CREATE INDEX "CounterClient_name_idx" ON "CounterClient"("name");
CREATE INDEX "CounterClient_phone_idx" ON "CounterClient"("phone");
CREATE INDEX "CounterClient_createdAt_idx" ON "CounterClient"("createdAt");

-- 2. A visit may belong to a counter customer instead of a patient.
ALTER TABLE "Attendance" ALTER COLUMN "patientId" DROP NOT NULL;
ALTER TABLE "Attendance" ADD COLUMN "counterClientId" TEXT;
CREATE INDEX "Attendance_counterClientId_idx" ON "Attendance"("counterClientId");
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_counterClientId_fkey"
    FOREIGN KEY ("counterClientId") REFERENCES "CounterClient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 3. So may its bill.
ALTER TABLE "Bill" ALTER COLUMN "patientId" DROP NOT NULL;
ALTER TABLE "Bill" ADD COLUMN "counterClientId" TEXT;
CREATE INDEX "Bill_counterClientId_idx" ON "Bill"("counterClientId");
ALTER TABLE "Bill" ADD CONSTRAINT "Bill_counterClientId_fkey"
    FOREIGN KEY ("counterClientId") REFERENCES "CounterClient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 4. Exactly one identity per row, never both and never neither. Prisma cannot express a
--    CHECK, so this lives in the migration and the service layer enforces the same rule
--    (CI builds its database with `prisma db push`, which never runs this file).
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_one_identity_check"
    CHECK (("patientId" IS NULL) <> ("counterClientId" IS NULL));
ALTER TABLE "Bill" ADD CONSTRAINT "Bill_one_identity_check"
    CHECK (("patientId" IS NULL) <> ("counterClientId" IS NULL));

-- 5. The counter ticket is its own visit type, so the visit list can badge and filter it
--    instead of hiding self-pay work among general consultations.
ALTER TYPE "AttendanceType" ADD VALUE IF NOT EXISTS 'walk_in';
