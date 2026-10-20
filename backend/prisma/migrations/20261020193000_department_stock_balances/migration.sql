-- Department-level inventory balances.
-- Existing batches are the best available source for department stock. Any remaining
-- aggregate stock is retained as an explicit unassigned balance rather than silently
-- assigning it to an arbitrary department.
CREATE TABLE "stock_item_department_balances" (
  "id" TEXT NOT NULL,
  "stockItemId" TEXT NOT NULL,
  "departmentId" TEXT,
  "locationKey" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "stock_item_department_balances_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "stock_item_department_balances_stockItemId_fkey"
    FOREIGN KEY ("stockItemId") REFERENCES "StockItem"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "stock_item_department_balances_departmentId_fkey"
    FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "stock_item_department_balances_quantity_nonnegative" CHECK ("quantity" >= 0)
);

CREATE UNIQUE INDEX "stock_item_department_balances_stockItemId_locationKey_key"
  ON "stock_item_department_balances"("stockItemId", "locationKey");
CREATE INDEX "stock_item_department_balances_departmentId_stockItemId_idx"
  ON "stock_item_department_balances"("departmentId", "stockItemId");

-- Seed one balance per item and department from the existing batch ledger.
INSERT INTO "stock_item_department_balances"
  ("id", "stockItemId", "departmentId", "locationKey", "quantity", "createdAt", "updatedAt")
SELECT
  'seed_' || md5("stockItemId" || ':' || "departmentId"),
  "stockItemId",
  "departmentId",
  "departmentId",
  SUM("quantity"),
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "stock_batches"
WHERE "departmentId" IS NOT NULL
GROUP BY "stockItemId", "departmentId"
ON CONFLICT ("stockItemId", "locationKey") DO UPDATE
SET "quantity" = EXCLUDED."quantity", "updatedAt" = CURRENT_TIMESTAMP;

-- Preserve any aggregate stock not represented by department-assigned batches.
-- It appears in the hospital total but remains visibly unassigned until reconciled.
INSERT INTO "stock_item_department_balances"
  ("id", "stockItemId", "departmentId", "locationKey", "quantity", "createdAt", "updatedAt")
SELECT
  'legacy_' || md5(s."id"),
  s."id",
  NULL,
  '__UNASSIGNED__',
  GREATEST(0, s."currentStock" - COALESCE(b."batchTotal", 0)),
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "StockItem" s
LEFT JOIN (
  SELECT "stockItemId", SUM("quantity") AS "batchTotal"
  FROM "stock_batches"
  GROUP BY "stockItemId"
) b ON b."stockItemId" = s."id"
WHERE GREATEST(0, s."currentStock" - COALESCE(b."batchTotal", 0)) > 0
ON CONFLICT ("stockItemId", "locationKey") DO UPDATE
SET "quantity" = EXCLUDED."quantity", "updatedAt" = CURRENT_TIMESTAMP;

-- Reconcile the legacy aggregate cache to the newly seeded physical balance ledger.
-- This is necessary where historic batch quantities and currentStock had drifted apart.
UPDATE "StockItem" s
SET "currentStock" = COALESCE((
  SELECT SUM(b."quantity")
  FROM "stock_item_department_balances" b
  WHERE b."stockItemId" = s."id"
), 0);
