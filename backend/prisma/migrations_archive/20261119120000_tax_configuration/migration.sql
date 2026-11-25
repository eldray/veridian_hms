-- Ghana VAT + levies configuration and component-level tax audit trails.

CREATE TABLE "tax_configuration" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "defaultExempt" BOOLEAN NOT NULL DEFAULT true,
    "taxId" TEXT,
    "payerModes" TEXT[] NOT NULL DEFAULT ARRAY['cash']::TEXT[],
    "components" JSONB NOT NULL,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "tax_configuration_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Bill" ADD COLUMN "taxBreakdown" JSONB;
ALTER TABLE "bill_line_items" ADD COLUMN "taxBreakdown" JSONB;
ALTER TABLE "ProformaInvoice" ADD COLUMN "taxBreakdown" JSONB;
ALTER TABLE "ProformaInvoiceItem" ADD COLUMN "taxBreakdown" JSONB;

-- Healthcare is exempt unless an item is deliberately marked taxable. Existing
-- rows that never carried a rate were implicitly untaxed, so they become exempt
-- explicitly; rows with a configured rate keep their existing treatment.
ALTER TABLE "service_pricing" ALTER COLUMN "isTaxable" SET DEFAULT false;
ALTER TABLE "Ward" ALTER COLUMN "isTaxable" SET DEFAULT false;
ALTER TABLE "LabTestTemplate" ALTER COLUMN "isTaxable" SET DEFAULT false;
ALTER TABLE "ScanTemplate" ALTER COLUMN "isTaxable" SET DEFAULT false;
ALTER TABLE "ProcedureTemplate" ALTER COLUMN "isTaxable" SET DEFAULT false;
ALTER TABLE "StockItem" ALTER COLUMN "isTaxable" SET DEFAULT false;

UPDATE "service_pricing" SET "isTaxable" = false WHERE "vatRate" = 0;
UPDATE "Ward" SET "isTaxable" = false WHERE "vatRate" = 0;
UPDATE "LabTestTemplate" SET "isTaxable" = false WHERE "vatRate" = 0;
UPDATE "ScanTemplate" SET "isTaxable" = false WHERE "vatRate" = 0;
UPDATE "ProcedureTemplate" SET "isTaxable" = false WHERE "vatRate" = 0;
UPDATE "StockItem" SET "isTaxable" = false WHERE "vatRate" = 0;
