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
  controller may register only login, refresh-token and forgot-password without
  `protect`.
- The guard catches missing wiring, not an incorrect role list. Runtime
  allowed/denied checks against a running API remain a manual or future
  integration-test task.
