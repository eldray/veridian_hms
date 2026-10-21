-- Persist the Client Confirmation Code returned by NHIS.
ALTER TABLE "patients" ADD COLUMN "cccId" TEXT;
