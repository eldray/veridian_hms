-- Track insurer claim submission, adjudication and remittance events without
-- overwriting the original claim-finalization record.
CREATE TABLE "insurance_claim_tracking_events" (
  "id" TEXT NOT NULL,
  "claimId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "status" TEXT,
  "submissionDate" TIMESTAMP(3),
  "payerReference" TEXT,
  "amount" DECIMAL(15,2),
  "paymentReference" TEXT,
  "paymentMethod" TEXT,
  "notes" TEXT,
  "recordedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "insurance_claim_tracking_events_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "insurance_claim_tracking_events_paymentReference_key"
  ON "insurance_claim_tracking_events"("paymentReference");
CREATE INDEX "insurance_claim_tracking_events_claimId_createdAt_idx"
  ON "insurance_claim_tracking_events"("claimId", "createdAt");
CREATE INDEX "insurance_claim_tracking_events_eventType_createdAt_idx"
  ON "insurance_claim_tracking_events"("eventType", "createdAt");
CREATE INDEX "insurance_claim_tracking_events_status_idx"
  ON "insurance_claim_tracking_events"("status");
ALTER TABLE "insurance_claim_tracking_events"
  ADD CONSTRAINT "insurance_claim_tracking_events_claimId_fkey"
  FOREIGN KEY ("claimId") REFERENCES "InsuranceClaim"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "insurance_claim_tracking_events"
  ADD CONSTRAINT "insurance_claim_tracking_events_recordedById_fkey"
  FOREIGN KEY ("recordedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
