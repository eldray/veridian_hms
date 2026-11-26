-- Add EPI monthly stock/commodity return capture and disaggregation fields.
ALTER TABLE "immunization_records"
  ADD COLUMN "underlyingCondition" BOOLEAN,
  ADD COLUMN "healthWorker" BOOLEAN,
  ADD COLUMN "pregnancyStatus" TEXT;

CREATE TABLE "epi_monthly_returns" (
  "id" TEXT NOT NULL,
  "periodStart" DATE NOT NULL,
  "periodEnd" DATE NOT NULL,
  "facility" TEXT,
  "notes" TEXT,
  "createdById" TEXT NOT NULL,
  "updatedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "epi_monthly_returns_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "epi_monthly_returns_periodStart_periodEnd_key"
  ON "epi_monthly_returns"("periodStart", "periodEnd");
CREATE INDEX "epi_monthly_returns_periodStart_periodEnd_idx"
  ON "epi_monthly_returns"("periodStart", "periodEnd");

CREATE TABLE "epi_monthly_return_lines" (
  "id" TEXT NOT NULL,
  "monthlyReturnId" TEXT NOT NULL,
  "section" TEXT NOT NULL,
  "itemKey" TEXT NOT NULL,
  "itemLabel" TEXT NOT NULL,
  "beginningBalance" INTEGER,
  "quantityReceived" INTEGER,
  "quantityUsed" INTEGER,
  "dosesOpened" INTEGER,
  "vvmStatusChange" INTEGER,
  "quantityExpired" INTEGER,
  "otherLosses" INTEGER,
  "stockAtEnd" INTEGER,
  "stockoutDays" INTEGER,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "epi_monthly_return_lines_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "epi_monthly_return_lines_monthlyReturnId_fkey"
    FOREIGN KEY ("monthlyReturnId") REFERENCES "epi_monthly_returns"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "epi_monthly_return_lines_monthlyReturnId_section_itemKey_key"
  ON "epi_monthly_return_lines"("monthlyReturnId", "section", "itemKey");
CREATE INDEX "epi_monthly_return_lines_section_itemKey_idx"
  ON "epi_monthly_return_lines"("section", "itemKey");
