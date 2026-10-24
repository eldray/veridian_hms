-- Prevent an approved patient waiver from being applied more than once.
ALTER TABLE "patient_waivers" ADD COLUMN "appliedAt" TIMESTAMP(3);