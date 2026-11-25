# Operations guide

## Supported deployment modes

1. **Windows desktop installer (primary).** `npm run build:win` produces an
   Electron installer. The app manages a local PostgreSQL database, applies
   bundled migrations, and serves the UI and API from `127.0.0.1`. Settings,
   uploads, backups, and logs live under the per-user application data folder.
2. **Server deployment (advanced).** Run PostgreSQL and the backend behind a
   TLS-terminating reverse proxy, and serve the built frontend from the same
   origin (or add the frontend origin to `CORS_ALLOWED_ORIGINS`). The API must
   not be exposed directly to the internet.

`vercel.json` and the former `server:public` shortcut were not a working server
deployment: the platform cannot run Express, PostgreSQL, or the scheduler.
Use one of the modes above instead.

## Database upgrades

The packaged installer ships:

- `sql/full-schema.sql` — applied only when the database is empty (fresh
  install),
- `sql/migrations/*.sql` — applied in filename order on every existing
  database.

`_veridian_migrations` records each applied file, its SHA-256 checksum, and the
time it ran. The desktop shell refuses to start if an already-applied migration
file no longer matches its recorded checksum (schema drift or tampering).

Databases created before schema version tracking (anything without
`_veridian_meta.schema_version`) are adopted only after a table check: if every
table in the bundled schema exists and there is no migration to apply, the shell
stamps the current version. If tables are missing, or migrations would run
without a known starting point, it refuses to start and asks the operator to
open the database once with the previous release. An old database is never
silently marked as up to date.

Building a release:

1. Bump `backend/package.json` `version`.
2. Ensure `backend/prisma/baselines/<previous-version>.prisma` exists. The build
   writes the current schema to `backend/prisma/baselines/<current-version>.prisma`
   so the next release can diff against it.
3. Run `npm run build:win`. The build generates:
   - the full schema script for new installs,
   - an incremental `migrations/NNNN_<from>_to_<to>.sql` when the schema changed,
   - `sql/manifest.json` with checksums.
4. Commit the new baseline file together with the release.

Recommended release checks:

- Install the previous release into a test database, then install the new build
  over it and verify the app starts and data is intact.
- Take a verified backup before upgrading a real facility.
- Never edit a migration that has already shipped; add a new one.

Upgrades run each migration inside a transaction. The desktop shell attempts a
`pg_dump` snapshot before applying migrations when those tools are available;
otherwise it logs a warning and relies on the transaction. PostgreSQL client
tools are not bundled with the installer, so set `PG_DUMP_PATH`,
`PG_RESTORE_PATH`, and `PG_PSQL_PATH` (or install them on the host) to enable
backups and restores.

## Backup and restore policy

- Backups are custom-format PostgreSQL dumps written to `backups/` with a
  `.sha256` checksum file.
- Restores validate the checksum, support custom-format dumps (`pg_restore`) and
  plain SQL files (`psql`), and run in a single transaction where possible.
- Store copies off the machine, encrypted. A backup that has never been
  restored is not a backup: perform and record a restore drill at least
  quarterly.
- Backup restore is restricted to super administrators and is destructive.

Suggested targets for a single facility: RPO ≤ 15 minutes (scheduled dump +
off-box copy), RTO ≤ 2 hours (documented restore and verification steps).

## Secrets and sensitive data

- Generate `JWT_SECRET` per installation/environment (at least 32 characters).
  Rotating it invalidates access tokens and file-access cookies; refresh tokens
  are hashed and do not survive a rotation either.
- Rotate the database password if it was ever committed or shared.
- Uploads, backups, logs, and `.env` files must never be committed. Run
  `npm run secret-scan` (gitleaks) before publishing.
- The repository history still contains files that were previously tracked
  under `backend/uploads/` and `test.txt`. Removing them from the current tree
  does not remove them from history; a history purge with `git filter-repo` or
  BFG and a coordinated force-push is required, followed by credential
  rotation.

## Health and logging

- `GET /api/health` checks the database and returns 503 when it is unreachable;
  `GET /api/health/live` only proves the process is running.
- Every response carries `X-Request-Id`; the same id prefixes the server log
  line and appears as `requestId` in error responses. Ask a user for that id
  instead of a screenshot containing patient data.
- API responses are sent with `Cache-Control: no-store`. Uploaded files use a
  short private cache header instead.
- Uploaded files are authorized against the record that references them on
  every request, not just the file-access cookie. A file whose record was
  deleted, and files with browser-executable extensions such as `.html`, return
  404. A user whose role cannot read the record gets 403; the check uses the
  current account, so deactivating a user or changing their role takes effect
  immediately without waiting for the cookie to expire.
- The backend handles SIGINT/SIGTERM by stopping new connections, closing the
  HTTP server, and disconnecting Prisma.
- Audit entries are hash-chained. `GET /api/audit/logs/verify` (admin) walks the
  chain in insertion order and returns `{ ok, checked, brokenAtId }`. The walk
  reads the table in batches, so its memory use stays bounded as the log grows.
  A failure means a row was edited, deleted, or reordered in the database; treat
  it as a security incident and preserve a database snapshot before
  investigating. Entries written before chaining was introduced have no link and
  are skipped until the first chained row.
- Desktop logs are written to the Electron logs directory and are capped at
  5 MB with one rotated file.

## Known gaps

- The installer is unsigned and has no auto-update channel.
- PostgreSQL client tools are not bundled (see above).
- There is no staging channel or schema-version negotiation between app and
  database beyond the migration checksums.
- A supported multi-workstation/LAN topology is not documented yet; the current
  desktop design expects one backend process per database.
- There is no second authentication factor. One refresh token is stored per
  user, so users cannot see or revoke individual sessions.
- Data is not partitioned by facility; every administrator sees the whole
  database. Multi-facility deployments need a `facilityId` on both users and
  records before that can be enforced.
- Password resets are an administrator action, not a self-service one. Staff who
  cannot sign in are reset from **Staff management** (`PATCH
  /api/users/:id/password`, admin or super-admin only): the new password must
  satisfy the same 12-character policy as any other, the account's sessions are
  revoked immediately, and the reset is recorded in the audit chain. There is no
  email or SMS delivery, so `POST /api/auth/forgot-password` only answers with
  those instructions and clears any token left by an older release; a genuine
  link-based reset needs a delivery channel and a token consumer first.
