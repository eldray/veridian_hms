-- Persist the Client Confirmation Code returned by NHIS.
ALTER TABLE "Patient" ADD COLUMN "cccId" TEXT;
