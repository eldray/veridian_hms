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

### Added

- `backend/.env.example`.
- Unit tests for file-access tokens, cookie parsing, and upload path resolution.
- Gitleaks configuration and a CI secret-scan job.
- `LICENSE`, `SECURITY.md`, `CODEOWNERS`, and operations documentation.

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
