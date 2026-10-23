ALTER TABLE "admissions"
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN "cancelledAt" TIMESTAMP(3),
  ADD COLUMN "cancelledById" TEXT,
  ADD COLUMN "cancellationReason" TEXT;

CREATE INDEX "admissions_status_idx" ON "admissions"("status");
