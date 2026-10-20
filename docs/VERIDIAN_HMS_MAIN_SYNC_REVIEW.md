# Veridian HMS — Main-branch review and change log

Date: 2026-10-20

## Scope and branch safety

This review was rebased onto the current `main` branch by creating `audit/main-sync-2026-10-20`.
The earlier `audit/phase-1-baseline` branch was not merged because its implementation predates changes in the current main branch.

All changes in this branch are targeted edits to current-main files. The repository's default branch has not been changed by this review.

## Changes ported or adapted

- Added a configurable frontend currency formatter, defaulting to Ghana cedis (`GHS`) and locale `en-GH`.
- Updated the current Process Payment page to use the shared formatter rather than hardcoded dollar symbols.
- Cleaned up `.gitignore`, removed malformed fence lines, stopped ignoring Prisma migration directories by a broad pattern, and added ignore rules for local backups, logs, and the known root-level `all.xml` export.
- Added positive whole-number validation for stock adjustments, batch receipts, and stock transactions.
- Added batch receipt validation for batch number, expiry/received dates, quantity, cost price, and optional department assignment.
- Prevented an opening stock quantity from being counted twice when a new item is created with an opening batch; the API now rejects conflicting positive values for both inputs and returns the refreshed stock item after batch receipt.
- Restricted stock transaction history and requisition transaction list routes to admin, pharmacist, and accounts roles, while preserving the existing create/update/delete role rules.
- Hardened encounter dispensing: quantity validation, verifies medication belongs to the requested attendance/encounter, guards aggregate stock decrement, and uses an active unexpired batch from the dispensing user's department when batch tracking exists for the item. Batch and aggregate quantities are decremented in the same database transaction. Legacy aggregate-only items remain supported only when the item has no batch records.

## Important design limitations

- Dispensing currently requires a single eligible batch to contain the entire requested quantity. It does not split one dispense across multiple batches because the Medication model stores one dispensed batch number and expiry date.
- Department scope comes from the authenticated user's database record. If the user has no department, only batches with a null department are eligible. Ensure pharmacy/store users have their department configured before enabling department-specific stock operations.
- Existing non-batch inventory can continue through the legacy aggregate-stock path. Migration/reconciliation of historical stock into batch records must be planned and verified separately.
- `.gitignore` only prevents future untracked files from being added. It does not remove already tracked sensitive exports, backups, logs, or their Git history.

## Critical data-exposure follow-up

A previous source inspection identified a root-level `all.xml` export and files under backup/log paths that appeared to contain patient-linked claims or clinical data. Treat these as potentially real sensitive health information until verified otherwise.

Actions for the repository owner:
1. Consider making the repository private while investigating.
2. Determine whether exposed records are real, synthetic, or de-identified and follow the applicable organizational and Ghana data-protection incident procedure if real.
3. Remove sensitive tracked files from the active tree and plan a careful history cleanup if appropriate; rewriting history is destructive and should be done only with an agreed recovery plan.
4. Review forks, clones, CI artifacts, releases, downloaded archives, and backups; rotate credentials if any secrets were present.
5. Keep only synthetic test fixtures in source control.

## Verification status

These are source-level edits through the GitHub file API. No local dependency install, TypeScript build, lint run, database migration, integration test, or live dispensing/payment test has been executed in this environment. Run those checks in a controlled development environment before merging.

Recommended validation:
- Frontend: typecheck/build and verify currency display on payment summary, history, amount input, and success toast.
- Backend: typecheck/build and test stock item creation with and without opening batches; reject invalid dates, zero/negative/fractional quantities, and duplicate batch identifiers.
- Pharmacy: test department isolation, expired/inactive batches, concurrent dispenses, and a quantity requiring more than one batch.
- Security: test role-denied responses for stock transaction history and requisition transaction endpoints.
- Database: inspect existing stock aggregate vs batch totals before turning on batch-based dispensing for all items.
