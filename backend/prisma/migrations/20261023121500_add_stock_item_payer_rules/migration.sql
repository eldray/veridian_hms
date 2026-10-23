-- CreateTable
CREATE TABLE "stock_item_payer_rules" (
    "id" TEXT NOT NULL,
    "stockItemId" TEXT NOT NULL,
    "insuranceProviderId" TEXT NOT NULL,
    "isCovered" BOOLEAN,
    "authorizationRequired" BOOLEAN,
    "prescribingLevel" TEXT,
    "tariffPrice" DECIMAL(15,2),
    "sourceFile" TEXT,
    "sourceVersion" TEXT,
    "effectiveFrom" TIMESTAMP(3),
    "effectiveTo" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_item_payer_rules_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "stock_item_payer_rules_stockItemId_insuranceProviderId_key"
ON "stock_item_payer_rules"("stockItemId", "insuranceProviderId");

CREATE INDEX "stock_item_payer_rules_insuranceProviderId_isCovered_idx"
ON "stock_item_payer_rules"("insuranceProviderId", "isCovered");

CREATE INDEX "stock_item_payer_rules_stockItemId_authorizationRequired_idx"
ON "stock_item_payer_rules"("stockItemId", "authorizationRequired");

ALTER TABLE "stock_item_payer_rules"
ADD CONSTRAINT "stock_item_payer_rules_stockItemId_fkey"
FOREIGN KEY ("stockItemId") REFERENCES "StockItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "stock_item_payer_rules"
ADD CONSTRAINT "stock_item_payer_rules_insuranceProviderId_fkey"
FOREIGN KEY ("insuranceProviderId") REFERENCES "insurance_providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
