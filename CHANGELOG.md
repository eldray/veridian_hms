# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
semantic versioning.

## [Unreleased]

### Security

- Uploaded patient, scan, and document files are no longer served by
  `express.static`. They require an authenticated request and are resolved
  through a path-traversal-safe handler.
- Database restore uploads are written to `backups/restore`, not `uploads/`, and
  the uploaded dump is deleted after the restore finishes.
- CORS now uses an explicit allowlist instead of reflecting every origin.
- Refresh tokens are rejected by the access-token middleware and are stored as
  SHA-256 hashes with replay revocation. Existing sessions are invalidated once
  by this change, so every user signs in again after upgrading.
- Access logs record the request path without its query string, so patient
  searches do not end up in log files.
- Uploaded files no longer keep the extension from the client filename. The
  extension is derived from the accepted MIME type, so a file named `x.html`
  submitted as an image cannot be served back as executable HTML.
- API responses are sent with `Cache-Control: no-store`, and every request
  carries an `X-Request-Id` that also appears in logs and error responses.
- Uploaded files are no longer tracked in git, and `test.txt` (which contained
  credentials) has been removed from the working tree.
- Uploaded files are served only when a database record still references them
  and the requesting role may read that record. Patient photographs and scan
  images are limited to clinical roles, staff documents to their owner, HR and
  admins, and generated receipts/discharge summaries to the staff who work on
  the underlying bill, referral, encounter or admission. The file-access cookie
  is re-checked against the live account on every request, so deactivation and
  role changes take effect immediately. Legacy files with browser-executable
  extensions such as `.html` are no longer served.
- Audit entries are now hash-chained: each row commits to the previous row, so
  edits, deletions and reordering are detectable. `GET /audit/logs/verify`
  (admin) walks the chain and reports the first entry that no longer matches.
  Rows written before this change have no link and are skipped until the first
  chained entry.
- Uploaded files are no longer served unless their leading bytes match the
  declared MIME type. A renamed HTML/executable file is deleted and the request
  is rejected with `400`, and the base64 patient-photo endpoint applies the same
  check. Upload routes now return a `400` for rejected multipart requests
  instead of falling through to a generic server error.
- Patient allergy and medical-history endpoints validate their payloads with a
  shared Zod middleware. Blank allergens or conditions, unknown severities and
  malformed dates return `400`, values are trimmed, and unknown fields are
  dropped instead of reaching Prisma. Claim-generation endpoints use the same
  middleware.
- New and changed passwords must be at least 12 characters and at most 72
  bytes (bcrypt's limit), cannot match the username or email, and cannot be a
  common password. Existing passwords stay valid until they are next changed.
- SMS, WhatsApp, bulk-message and communication-template requests are validated
  before dispatch. A blank recipient, an empty message with no template, an
  empty bulk recipient list and an unknown channel or template type now return
  `400` instead of reaching the provider or the database.
- List endpoints no longer pass a caller-supplied `limit` straight to Prisma.
  Antenatal, corporate, referral, requisition, stock-usage, scan-template,
  proforma-invoice, recent-patient and user lists now clamp the page size, so a
  crafted request cannot force a full-table scan and an oversized response.
- The Electron main window now runs with `sandbox: true`. Permission requests
  are denied except for notifications and clipboard access, webview attachment
  is blocked, page links never open a second Electron window, and navigation is
  limited to the exact API/UI origins instead of any URL that starts with the
  host string.

### Added

- `backend/.env.example`.
- Unit tests for file-access tokens, cookie parsing, and upload path resolution.
- Gitleaks configuration and a CI secret-scan job.
- A PostgreSQL-backed CI job creates the schema and runs integration tests
  against a real database, starting with concurrent audit-chain appends and
  tamper detection.
- `LICENSE`, `SECURITY.md`, `CODEOWNERS`, and operations documentation.
- A single `ConfirmDialogHost` renders every confirmation with the themed,
  keyboard-accessible modal. All 30 native `window.confirm`/`confirm` calls now
  use `confirmDialog(...)` with a title, action-specific button text and a
  danger/warning/info style; multi-line messages keep their line breaks.
- Medical entries, vitals, dispensing and theatre show a shared allergy banner.
  Recorded allergens (reaction and severity) are always listed; the banner also
  warns when the current visit has not reviewed allergy status, records
  allergies as present without details, or could not load the allergy list. It
  fetches allergies by patient id because the paginated patient list omits them.

### Changed

- Packaged upgrades use versioned SQL scripts with checksums instead of a
  single file name that was skipped on every release. Databases from older
  releases are adopted only after a table check.
- Backup and restore invoke `pg_dump`, `pg_restore`, and `psql` with argument
  arrays (no shell interpolation) and verify dump checksums.
- Health checks report database connectivity; the API shuts down gracefully on
  SIGINT/SIGTERM.
- Pages load on demand (route-level code splitting) and render errors are caught
  by an error boundary instead of blanking the window.
- Switching patient or clearing the worklist in medical entries asks for
  confirmation before discarding an unsaved progress note.
- Stock transfers page, claim-batch eligibility, the payment page patient list,
  the NHIS claim editor, the admin notification panel and the message recipient
  picker now call store actions that actually exist. The missing `CheckCircle`
  import that broke the admission status badge and a stale `updateReferral`
  export were removed, so those screens no longer fail at runtime.
