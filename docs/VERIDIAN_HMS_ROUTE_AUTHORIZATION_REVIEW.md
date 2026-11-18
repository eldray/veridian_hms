# Veridian HMS — Route and authorization review

Review date: 2026-10-20
Reviewed branch: `audit/main-sync-2026-10-20`, created from the current `main`.

## Changes made in this branch

- Stock transaction history list and detail routes now require one of `admin`, `pharmacist`, or `accounts`.
- The requisition transaction listing now uses the same role gate.
- Existing create/update/delete role rules were preserved rather than replaced by rules from the older audit branch.
- Encounter dispensing keeps the current route-level roles (`admin`, `super_admin`, and `pharmacist`). Service-level checks validate positive whole-number quantity and ensure the medication belongs to the attendance ID in the URL.
- Department selection for batch dispensing is derived from the dispensing user's database record, not a caller-supplied department ID.

## Remaining review points

- `protect` currently constructs the request user from JWT claims. The role and permissions are not reloaded from the database on each request, so account/role changes may not take effect until the token expires unless a separate revocation mechanism is used.
- The auth request type currently does not expose `departmentId` in the token payload. Dispensing therefore loads the current department directly from the database, which is intentional for this operation.
- Confirm whether the `accounts` role should see all stock transaction details, including requisition-related notes, under the facility's least-privilege policy.
- Stock item transaction history now requires admin, pharmacist, or accounts; medication-linked history requires admin, pharmacist, doctor, nurse, or midwife. Other stock catalogue/detail reads remain authenticated-only and need a role-policy decision.
- Draft requisition updates/deletes now require the original requester or admin. Requisition detail access is limited to admin/super_admin, the original requester, or a user in the requesting/supplying department. Requisition list access now applies a server-enforced scope from the authenticated user's current database role and department; client filters only narrow that scope. Users without a department can see their own requisitions, while admin/super_admin can list across departments.
- The global `super_admin` bypass in `requireRole` remains as defined by the current application policy. Verify that this is deliberate and documented.
- The requisition workflow has separate business actions and statuses; route-level role checks do not replace service-level validation of who may fulfill or reverse a requisition.

## Verification status

This is a source review and a record of targeted changes, not a runtime security test. No automated authorization tests, API integration tests, or end-to-end tests were run in this environment. Before merging, test allowed and denied roles for each changed endpoint using non-production accounts.

## Update (2026-10-26)

- `protect` now reloads role, seniority, department, active flag and permissions
  from the database on every request, so deactivation and role changes take
  effect immediately instead of waiting for the access token to expire.
- `backend/tests/route-authorization.test.ts` adds a static regression guard:
  every module router except the public auth endpoints must apply `protect`,
  mutating route files must reference a role/permission guard, and the auth
  controller may register only login, refresh-token, forgot-password and logout
  without `protect`. Logout revokes only the exact supplied refresh-token hash.
- The guard catches missing wiring, not an incorrect role list. Runtime
  allowed/denied checks against a running API remain a manual or future
  integration-test task.


## Update (2026-11-18) — role and sensitive-action hardening

- Leave list queries are now scoped server-side: HR Officer, System Admin and Super Admin may review facility requests; other staff can only list their own. A caller-supplied `userId` filter cannot broaden visibility.
- Individual leave reads enforce the same owner-or-HR/admin rule.
- Non-HR staff may only cancel their own pending leave request. They cannot amend another person's request, change approval status, or edit the reason field. HR and administrators retain review/decision workflows.
- Billing invoice lists, collection totals, statistics and revenue-line reports are now restricted to Accounts and administrators. Clinical and Records staff may still read individual bills and their line items for patient-facing workflows.
- The legacy bill endpoints now apply the same separation between facility-wide financial reporting and individual bill reads.
- These changes complement the RBAC catalogue and platform-permission boundary described in `ROLE_PERMISSION_MATRIX.md`.
- Stock catalogue list, category and detail reads now require an operational, clinical or finance role (`admin`, `super_admin`, `accounts`, `pharmacist`, `doctor`, `nurse`, `midwife`, `records`, `lab_tech`, or `sonographer`). HR Officer is excluded because the role has no stock workflow. Existing department scoping remains in the controller/service; this route guard prevents unrelated authenticated roles from reading stock catalogue and pricing data.
- Requisition fulfilment is now restricted in the service layer to Pharmacy or administrators, in addition to requiring the authenticated user to belong to the supplying department. This closes the shared status-route gap where any clinical role in the supplier department could otherwise mark a requisition fulfilled.
- The shared dashboard endpoint now redacts finance totals for non-finance roles, low-stock counts for users outside Pharmacy/Accounts/administration, and top-diagnosis aggregates for non-clinical roles. The response is cloned before redaction so role-specific filtering cannot mutate the shared dashboard cache.

## Verification status (2026-11-18)

Source changes were reviewed after writing, but automated tests and API integration checks were not executed in this GitHub-only session. Validate the leave owner/HR cases and billing allowed/denied role cases against a non-production database before merging.
