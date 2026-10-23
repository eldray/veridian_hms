-- Explicit, nullable links from family-planning services to local maternal events.
-- Existing records remain intact and unlinked; no historical event is inferred automatically.
ALTER TABLE "family_planning_services"
  ADD COLUMN "postpartumDeliveryRecordId" TEXT,
  ADD COLUMN "postnatalRecordId" TEXT,
  ADD COLUMN "postAbortionRecordId" TEXT;

CREATE INDEX "family_planning_services_postpartumDeliveryRecordId_idx"
  ON "family_planning_services"("postpartumDeliveryRecordId");
CREATE INDEX "family_planning_services_postnatalRecordId_idx"
  ON "family_planning_services"("postnatalRecordId");
CREATE INDEX "family_planning_services_postAbortionRecordId_idx"
  ON "family_planning_services"("postAbortionRecordId");

ALTER TABLE "family_planning_services"
  ADD CONSTRAINT "family_planning_services_postpartumDeliveryRecordId_fkey"
  FOREIGN KEY ("postpartumDeliveryRecordId") REFERENCES "delivery_records"("id")
  ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "family_planning_services_postnatalRecordId_fkey"
  FOREIGN KEY ("postnatalRecordId") REFERENCES "postnatal_records"("id")
  ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "family_planning_services_postAbortionRecordId_fkey"
  FOREIGN KEY ("postAbortionRecordId") REFERENCES "abortion_records"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
