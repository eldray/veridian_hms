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
- Audit-chain verification walks the log in pages instead of loading every row
  into memory, so the check stays bounded as the audit table grows.
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
- Medical entries now edits the whole clinical assessment — presenting complaints,
  history of presenting complaint, ODQ, physical examination and both structured
  system lists — in one modal, the same way diagnoses, labs, scans and medications
  are added. The page and the sidebar show a read-only summary with an
  "Edit assessment" button, and nothing reaches the database until Save Clinical.
- The medical entries sidebar leads with a read-only "Clinical notes" block
  (assessment plus working impression) above the physician notes and treatment plan.
- Bill responses now carry the visit and insurer details the billing screen needs:
  the attendance number, type and date, and the insurance provider with its
  coverage percentage.

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
- Back buttons on the patient-facing entry screens (medical entries, vitals, lab
  results, scans, dispensing, theatre, antenatal and patient billing) return to
  the page the user came from. They only fall back to the module queue or billing
  list when the screen was opened directly, so a referral from the ward no longer
  dumps the clinician on a waiting list they never used.
- Patient billing is read per visit again. The shared patient/attendance selector
  drives the list, the header names the selected visit and its date, and each bill
  chip shows the visit it belongs to. `normalizeResponse` lowercases the first
  letter of PascalCase relation keys, so the API client now re-exposes `Attendance`,
  `BillLineItem`, `Patient`, `Payment`, `InsuranceProvider`, `Admission` and
  `CorporateAccount` on bill payloads; without that the visit label, line items,
  insurance details and the miscellaneous-charge picker rendered empty.
- The patient billing screen uses the same theme variables as the rest of the app
  instead of a hardcoded light palette, so it stays readable in dark mode and
  matches the billing list it opens from.
- A billing page for a patient whose records are already loaded no longer shows
  "Patient Not Found", which previously hid the attendance selector.
- The shared patient/attendance selector no longer logs the loaded patient list and
  the selected patient object to the browser console. The billing store and the
  patient billing page no longer log bill payloads, bill numbers or resolved patient
  ids either; console output is limited to errors.
- Collection loading in the renderer goes through one shared helper
  (`frontend/src/store/streamCollection.ts`). A store action asks for a collection,
  gets the first page written to the store immediately, and the remaining pages
  stream in three requests at a time while the list is already usable. Simultaneous
  readers of the same collection share one walk, a completed walk is cached for 30
  seconds, and a superseded walk can no longer overwrite the store. This replaces
  the serial 50-100 request `while (hasMore)` loops that saturated the four-GET
  concurrency limit and made the inventory, requisition, invoice, stock-transaction
  and medical-services screens appear to freeze. Stock data is deliberately cached
  for zero seconds: dispensing, lab and theatre change quantities through endpoints
  outside the stock store, so an out-of-date quantity must never be shown.
- Writes in the stock and medical-services stores invalidate the cached walk, so a
  saved item, allocation, requisition status change, purchase invoice, diagnosis,
  template or catalog entry no longer gets hidden again by a pre-write page load.
- Medical services management reads its tab badges from the paging metadata of one
  row per table instead of downloading every diagnosis, lab test, procedure and scan
  and counting them in the browser, and no longer issues a second full-table load of
  all four tables on mount.
- Admissions, beds and departments walk their pages four and three at a time instead
  of one after another, and the API client no longer logs raw diagnosis, vitals,
  admission, detention and inpatient-list responses (patient data) to the console.
- Single-record screens ask for the one record they show. Nursing patient workspace
  opens with `GET /encounters/:id` plus that patient's admission history instead of
  downloading every attendance, admission, patient and stock item in the hospital;
  admission details, attendance details and patient billing resolve their patient
  with one `GET /patients/:id` when the visit row carries no name. Mount cost on
  those pages drops from tens of requests to one or three.
- Post-action refreshes are per-record. Saving vitals, admitting, converting a
  detention to a formal admission and discharging in medical entries, antenatal,
  vitals and the admission detail screen now re-fetch only the affected visit
  (`refreshAttendance(id)`) instead of re-walking the whole encounter or admission
  table, so the four-GET limit is free again for the next click. The three antenatal
  bed assignments ended with a full admission-table load whose result no part of that
  screen ever read.
- Worklists are filtered server-side. Insurance claims ask for completed visits of
  the tab's payment mode within the selected date range (200 rows) rather than the
  entire live encounter set, which also makes completed visits older than 72 hours
  claimable; admissions, antenatal, medical entries, vitals, dispensing and the
  attendance register ask for the narrow set they display (admitted, or the live
  worklist capped at 500) instead of an unbounded sweep.
- The patient register is no longer loaded just to fill a picker. The estimate form
  searches patients as you type (25 server-matched rows) and resolves a saved
  estimate's patient directly; billing list, admissions list and the referral form
  either read the patient name already carried on their rows or defer the register
  until the form is actually opened.
- `fetchAllPages` adapts to endpoints that cap a page below the requested size (it
  re-reads the server's own page size instead of assuming the walk finished) and
  brakes when a page returns no new rows, so an endpoint that ignores `page` can no
  longer burn requests forever. Streamed collections accept a `pageSize` and the
  inventory, diagnosis, lab, procedure and scan catalogs use 500, which is what
  those endpoints actually serve.
- Full patient records are no longer written to the browser console. The patient
  store's request/response logging for search, get, create and update is gone,
  leaving only error output.
- A live-update event can no longer stack refreshes on top of each other. Every write
  in the hospital announces a changed topic on the shared SSE stream, and a busy
  clinic produces one every few seconds; a screen whose refresh was still walking its
  lists used to start a second copy as soon as the next event arrived. Each screen now
  gets at most one refresh in flight, and a change arriving inside the 10-second gap
  re-arms a trailing timer instead of being dropped or duplicated. A screen's refresh
  promise is now returned to the dispatcher so it can tell when it actually finished.
- The nursing station asks for its inpatient board with an explicit bound (admitted
  visits and active admissions, 500 rows) instead of the unbounded 5,000-row walk that
  ran on open and again on every live event.
- Loops that made one request per row are gone.
  - `GET /encounters/vitals/batch?ids=…` returns every reading for up to 200 visits in
    one query; the patient history tab used to ask once per visit, so a patient with 40
    visits cost 40 requests each time it opened.
  - `POST /encounters/:id/services/bulk` adds a whole selection of services in one
    write, re-validating the encounter once and rejecting the batch if any catalog entry
    is missing or inactive. The billing screen used to POST once per service, so a
    failure half-way left the bill part-updated with no way to tell what was saved.
  - Department staff assignment issues its writes together instead of one after another
    and reports how many succeeded, and the three refreshes that follow run in parallel.
- The mobile-money status wait is bounded: it polls every 2 s for the first 30 s, then
  every 5 s, gives up after a minute with the existing "still pending, do not collect
  payment again" guidance, and stops when the screen unmounts. The old fixed 24 × 5 s
  loop held the payment button for two minutes and kept polling after the staff left.
- The payment screen no longer downloads the patient register to print a name; the bill
  row carries its patient, and one patient record is fetched if it does not.
- Screens keep showing their rows while a refresh runs. Stock management, departments,
  notifications, appointments and the estimate form gated the whole list on `isLoading`,
  which wiped a usable table on every refresh and every live update; skeletons now stand
  in only for the first paint, when there is genuinely nothing to show.
- Search pickers render at most 50 rows. The patient/attendance selector, the medication
  section and the diagnosis, investigation, service, medicine and procedure dropdowns in
  the three claim editors used to mount every catalogue match: opening the list, and each
  keystroke in the search box, rebuilt thousands of buttons and left the window unresponsive.
  A short footer states how many matches are hidden so the cap is visible, not silent.
- The medication section filtered the formulary inside an effect that wrote a new array into
  state on every render, so each render re-triggered the effect. Typing in that box looped the
  panel until the browser froze; the list is now derived with `useMemo` instead of stored.
- Register and formulary lookups are indexed. Attendance, admissions, nursing, appointments
  and billing searched the patient list (or the stock list) linearly for every row while
  filtering and rendering, which is thousands of rows times thousands of patients per keystroke;
  each now builds one `Map` and reads from it.
- The estimate form paints as soon as the saved estimate arrives. Its pickers (service
  catalogue, corporate accounts) still stream in behind the form, and the line items are
  labelled from the estimate payload so nothing reads as an empty row while they load.
- Errors that were swallowed now reach the operator. A failed notification load and a failed
  vitals load reported nothing, and `appointmentStore` recorded its failure in state that no
  screen read, so an outage looked like an empty list; the appointments screen now reports it,
  and a pharmacy-stock failure on the dispensing screen no longer hides the prescriptions
  behind "patient not found".
- The attendance list no longer waits for the patient register before painting. The visit
  rows arrive with their own patient attached, so the register is only a name-search fallback
  and used to delay the table by however long it took to stream.
