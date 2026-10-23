-- New family-planning records must not imply consent unless staff explicitly record it.
-- Existing clinical records are intentionally left unchanged.
ALTER TABLE "family_planning_services"
  ALTER COLUMN "informedConsent" SET DEFAULT false;
