# Departmental Stock Ledger Rollout

The inventory ledger now stores balances per stock location. Department balances and ward balances are the source of truth; `StockItem.currentStock` remains a synchronized hospital-wide aggregate cache for existing reports and compatibility.

## Rollout sequence

1. **Back up the PostgreSQL database first.** The rollout adds a balance table, ward location fields, and stock transfer transaction types.
2. From `backend/`, ensure `DATABASE_URL` points at the intended database, then apply the Prisma schema and regenerate the client:

   ```bash
   npx prisma db push
   npx prisma generate
   ```

3. Backfill the new balance table from existing batch quantities and legacy aggregate stock. Run this SQL file once, after step 2:

   ```bash
   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f prisma/departmental-stock-backfill.sql
   ```

4. Build and test before opening the application to staff:

   ```bash
   npm run build
   npm test
   ```

5. Verify the ledger totals. This query should return no rows after backfill:

   ```sql
   SELECT s."id", s."name", s."currentStock",
          COALESCE(SUM(b."quantity"), 0) AS "locationTotal"
   FROM "StockItem" s
   LEFT JOIN "stock_item_department_balances" b ON b."stockItemId" = s."id"
   GROUP BY s."id", s."name", s."currentStock"
   HAVING s."currentStock" <> COALESCE(SUM(b."quantity"), 0);
   ```

## Stock movement rules

- A purchase or stock receipt increases the receiving location and hospital total.
- Dispensing/sale reduces the issuing department and hospital total in one transaction.
- Expiry/damage write-offs require a reason and reduce the affected department and hospital total in one transaction.
- A department-to-department transfer reduces the origin and increases the destination; the hospital total is unchanged.
- A requisition to a ward moves stock into a ward balance and keeps the hospital total unchanged.
- Legacy unassigned stock can be allocated to a department by an administrator without changing the hospital total.
- Requisition fulfilment is all-or-nothing. A missing supplier, missing destination, invalid quantity, or insufficient eligible batch stock aborts the complete transaction.
- Department and ward stock batches are kept separate. Expired/inactive batches are not eligible for sale, dispensing, or ordinary transfer.

## Important deployment note

The migrations directory currently contains **incremental SQL migrations, not a complete initial schema baseline**. A brand-new database cannot be created from those migration files alone. Do not treat a successful Prisma schema validation/client generation as proof that `prisma migrate deploy` works on a fresh database.

For the current departmental-stock rollout, use the documented `prisma db push` + backfill procedure only after taking a backup and confirming the target database. Do not then run `prisma migrate deploy` against that same database until a complete, reconciled migration baseline has been prepared; otherwise the incremental migrations may try to add columns that `db push` already created. Existing installations should first have their current schema and `_prisma_migrations` state reviewed by an administrator before choosing a deployment path.

The patient CCC column and stock changes also need to be reconciled into the eventual baseline. Never create a baseline by marking migrations as applied without checking the actual database schema.

Do not run the backfill script twice as a routine operation. It adds any residual legacy quantity to the unassigned balance on conflict. Take a backup and inspect the ledger before repeating it.
