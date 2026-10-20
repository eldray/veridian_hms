-- Run only after `npx prisma db push` and `npx prisma generate`.
-- Backfills canonical location balances from existing stock batches and legacy aggregate stock.
-- Review the resulting totals before allowing staff to transact against the new ledger.
BEGIN;

INSERT INTO "stock_item_department_balances"
  ("id", "stockItemId", "departmentId", "wardId", "locationKey", "quantity", "createdAt", "updatedAt")
SELECT
  'seed_' || md5("stockItemId" || ':' || COALESCE("departmentId", '') || ':' || COALESCE("wardId", '')),
  "stockItemId",
  "departmentId",
  "wardId",
  CASE
    WHEN "departmentId" IS NOT NULL THEN "departmentId"
    WHEN "wardId" IS NOT NULL THEN 'WARD:' || "wardId"
    ELSE '__UNASSIGNED__'
  END,
  SUM(GREATEST("quantity", 0)),
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "stock_batches"
GROUP BY "stockItemId", "departmentId", "wardId"
ON CONFLICT ("stockItemId", "locationKey") DO UPDATE
SET "quantity" = EXCLUDED."quantity", "departmentId" = EXCLUDED."departmentId",
    "wardId" = EXCLUDED."wardId", "updatedAt" = CURRENT_TIMESTAMP;

-- Retain any legacy aggregate quantity not represented by a physical batch.
INSERT INTO "stock_item_department_balances"
  ("id", "stockItemId", "departmentId", "wardId", "locationKey", "quantity", "createdAt", "updatedAt")
SELECT
  'legacy_' || md5(s."id"),
  s."id",
  NULL,
  NULL,
  '__UNASSIGNED__',
  GREATEST(0, s."currentStock" - COALESCE(b."batchTotal", 0)),
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "StockItem" s
LEFT JOIN (
  SELECT "stockItemId", SUM(GREATEST("quantity", 0)) AS "batchTotal"
  FROM "stock_batches"
  GROUP BY "stockItemId"
) b ON b."stockItemId" = s."id"
WHERE GREATEST(0, s."currentStock" - COALESCE(b."batchTotal", 0)) > 0
ON CONFLICT ("stockItemId", "locationKey") DO UPDATE
SET "quantity" = "stock_item_department_balances"."quantity" + EXCLUDED."quantity",
    "updatedAt" = CURRENT_TIMESTAMP;

-- Synchronize the legacy aggregate cache to the location ledger.
UPDATE "StockItem" s
SET "currentStock" = COALESCE((
  SELECT SUM(b."quantity")
  FROM "stock_item_department_balances" b
  WHERE b."stockItemId" = s."id"
), 0);

COMMIT;
