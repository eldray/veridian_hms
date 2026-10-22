-- Structured residence fields support HMIS/DHIMS catchment and geographic reporting.
-- Nullable columns preserve compatibility with existing patient records.
ALTER TABLE "Patient"
  ADD COLUMN "residenceCommunity" TEXT,
  ADD COLUMN "residenceDistrict" TEXT,
  ADD COLUMN "residenceRegion" TEXT;

CREATE INDEX "Patient_residenceDistrict_idx" ON "Patient"("residenceDistrict");
CREATE INDEX "Patient_residenceRegion_idx" ON "Patient"("residenceRegion");
