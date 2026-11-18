# Veridian HMS - Security review (login, roles and permissions, audit trail)

Reviewed against `origin/main` at `44155f92`. Findings come from reading the code and from offline tests that run
without a database. Nothing here was exercised against a running server or a real PostgreSQL, so treat "verified"
as "verified in code and unit tests".

What a review like this **cannot** settle: whether a role list is the *right* one for your hospital, and whether a
rule matches Ghana's data-protection obligations. Those are decisions for you; they are listed under "Decisions".

## Fixed in this change

| # | Severity | Finding | Fix | Test |
|---|----------|---------|-----|------|
| F1 | **High** | `PATCH /users/:id/full-profile` copied every key of the request body into `prisma.user.update` for any "admin-like" actor, and `hr_officer` counts as admin-like. An HR officer could set `role: 'admin'` (on anyone, themselves included), `isActive`, `seniority`, or write a `password` hash directly (account takeover that skips the password policy and the admin-only reset route). Even a plain admin could write columns such as `password` and `resetToken`. | Explicit allow-lists in `UserService.updateFullProfile`: self (name, email, phone, image); admin-like (+ licence, specialization, department); **admin only**: role, seniority, isActive. Unchanged values are ignored (the staff screen re-sends the whole form); a real change by someone not allowed is refused with 403; anything outside the lists is ignored. | `user-full-profile-privileges.test.ts` (17 tests; 13 fail on the old code) |
| F2 | Low | Authorization refusals in `UserService` were plain `Error`s, so the API answered **500** and, in production, replaced the message with "Internal server error". | 7 refusals now throw `ForbiddenError` (403, message kept). | `user-authorization-status.test.ts` (6 tests; all fail on the old code) |
| F3 | Guard | `route-authorization.test.ts` only proved a guard appears *somewhere* in a route file. | New per-route test: every data-changing route needs a role/permission guard or an explained entry in an allow-list. Verified by planting an unguarded route. | `route-authorization-per-route.test.ts` |

## Checked and found sound

- **Authentication middleware**: reloads the user from the database on every request (deactivation and role changes
  apply immediately), rejects refresh tokens as access tokens, requires a 32+ character secret, fails closed (503).
- **Login**: bcrypt with 12 rounds; refresh tokens stored hashed; rotation with reuse detection; password change
  revokes other sessions; forgot-password does not reveal whether a user exists.
- **Rate limiting**: per user+IP and per-IP limits on login, a general limiter on all of `/api`, buckets swept every minute.
- **Route coverage**: of 582 routes, only `/login`, `/refresh-token` and `/forgot-password` are public. 11 data-changing
  routes rely on authentication alone; each was checked by hand (see the allow-list in the per-route test).
- **Super-admin protection**: an admin cannot create, promote to, modify, deactivate or reset the password of a super_admin.
- **Profile self-edit** (`/auth/profile`): the service allow-lists name, email, phone and image. A `seniority` sent in
  the body is dropped (the controller destructures it; harmless but misleading).
- **Notifications**: the owner is part of the database `where`, so another user's id gives 404.
- **Uploaded files**: live account re-check per request, per-category authorization, path guard, `nosniff`, `httpOnly` +
  `SameSite=Strict` cookie.
- **SQL**: all raw queries are tagged templates (parameterised) or validated identifiers.
- **Frontend**: no `dangerouslySetInnerHTML`, `innerHTML` or `eval`; the realtime stream sends its token in a header, not the URL.
- **Audit log over HTTP**: read-only, admin and super_admin only; no write or delete endpoint.

## Decisions for you (not changed)

| # | Severity | Finding | Options |
|---|----------|---------|---------|
| D1 | **High (design)** | LAN mode serves **plain HTTP** on `0.0.0.0`. Passwords at login, bearer tokens and patient data cross the hospital network unencrypted (`hsts` is off, `secure` cookies are off). | Add TLS (an internal certificate that the Electron clients trust), or accept the risk with network segregation and write it down. |
| D2 | Medium | **One refresh token per user** (`@@unique([userId])`) combined with reuse detection: signing in on a second PC replaces the first token, and when PC 1 later refreshes it is read as theft and **all sessions are revoked, including PC 2's**. Shared nurse-station logins will log each other out. | Allow several sessions per user (a token per device/family). Needs a schema migration. |
| D3 | Medium-High (compliance) | Audit gaps: no record of **reads** of patient data or exports; **failed logins**, password changes, session revocation and 403s are not audited; the audit write is fire-and-forget **after** the response and failures are only logged, so an action can succeed with no audit row; a *failed* financial request is stored with the same action name as a successful one (only `metadata.statusCode` differs). | Decide the scope (at least failed logins and sensitive reads), and write audit rows inside the same transaction for money and clinical changes. |
| D4 | Medium | The audit chain uses plain SHA-256: anyone who can write to the database can recompute it from an edited row onward, and deleting the newest rows is undetectable. It is tamper-*evident* against casual edits only. | HMAC with a key kept outside the database, plus periodic anchoring (record the latest hash somewhere else). |
| D5 | Medium | No per-account lockout beyond the rate limiter; the two login error messages differ and the unknown-user path skips bcrypt (user enumeration and a timing difference). No `trust proxy` setting, so behind a reverse proxy or ngrok every client shares one IP. | Same message and a dummy bcrypt compare; set `trust proxy` if a proxy is used. |
| D6 | Medium | Installer defaults to the `postgres` **superuser**, so any bug in the app runs with full database rights. | Create a limited role that owns only the application database. |
| D7 | Low-Medium | Access token lifetime defaults to 24 h. | 15-60 minutes (the refresh flow already exists). |
| D8 | Low-Medium | Tokens live in `localStorage` (readable by any XSS). Mitigated: no raw-HTML rendering found, helmet CSP active. | `httpOnly` cookies, if you want to remove the risk. |
| D9 | Low | `.jwt-secret` is stored as plain text (the DB password uses Windows DPAPI); `0o600` has no effect on Windows. | Encrypt it with `safeStorage` like the DB password. |
| D10 | Low | No separation of duties: admins can reset other admins' passwords, and are also the only people who can read the audit log. | An auditor role; require super_admin to reset an admin. |
| D11 | Privacy | Every doctor, nurse and midwife can list **all** staff leave requests, free-text `reason` included (can contain medical details). | Hide `reason` from non-HR, or limit to the caller's department. |
| D12 | Low | `requireAllRoles` behaves as "any of" (a user has one role); `jwt.verify` does not pin `algorithms`; logout needs a valid access token, so an expired one cannot revoke its refresh token; the audit CSV export does not neutralise leading `=`/`+`/`@`; the password blocklist has 7 entries; `admin` and `super_admin` bypass every `requirePermission` check, so fine-grained permissions only ever constrain the other roles. | Housekeeping; confirm the bypass is intended. |
| D13 | Low | The login page loads its background photo from `images.unsplash.com`: a third party learns every time a login screen opens, and on an offline LAN it simply fails (the production CSP may block it anyway). | Ship the image with the app. |

## Dependencies (`npm audit --omit=dev`)

| Package set | Critical | High | Fix available without a major upgrade |
|-------------|----------|------|----------------------------------------|
| backend | 2 | 12 | 18 of 19 |
| frontend | 0 | 12 | 13 of 13 |
| root (`concurrently`/`shell-quote`, a dev launcher) | 2 | 0 | 2 of 2 |

- `jws` 3.2.2 (used by `jsonwebtoken` to verify login tokens) is on the list: "improperly verifies HMAC signature".
  Whether it is exploitable in this app was **not** established; upgrade it regardless.
- `xlsx` 0.18.5 has no npm fix. The app only **writes** reports with it (`reportExport.ts`) and never parses an uploaded
  spreadsheet, so its read-side advisories are not reachable.
- Not applied here: changing lockfiles without a real database to run the app against is not safe. Do it on a branch:
  `npm audit fix` in `backend`, `frontend` and the root, then run the test suites and start the app.

## Not reviewed

Backup and restore endpoints, MoMo payment callbacks, upload size and type validation, the realtime events endpoint,
patient-level access (any clinical role can open any patient: there is no "need to know" or break-glass), the frontend
route guards, and every clinical and billing rule (those belong to the next review areas).
