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
- Accepting or rejecting an estimate, and reading one by ID, now require the
  roles the rest of the estimate workflow already uses. Before this they only
  required a signed-in session, so any account could mark an estimate approved
  and have the approval recorded against its own user.
- A waiver approval or rejection is always attributed to the signed-in
  administrator. The caller-supplied `approvedById` field is no longer read, so
  one account could previously record an approval under another person's ID.
- Resetting a password now closes every session of that account and is written
  to the audit chain with the administrator who did it. The audit entry records
  that the reset happened, never the password or its hash.
- `POST /auth/forgot-password` no longer writes a random reset token to the user
  row. Nothing in this deployment can deliver a link — there is no mail or SMS
  transport and no endpoint consumed the token — so the value sat in the
  database as a plaintext credential that would become live the moment a
  consumer was written. Any token left by an earlier release is now cleared.
- Staff identity and payroll data are no longer readable by every signed-in
  account. `GET` and `PATCH /users/:id/full-profile` (bank details, SSNIT
  number, contract dates) had no role guard at all, and
  `GET /users/:id/payslips` and `GET /users/:id/documents` were open the same
  way. All four are now limited to the account's owner, an administrator or the
  HR officer, matching the `/users/:id` and `/users/:id/documents` POST guards.
- Hard-deleting a patient is administrator-only. `DELETE /patients/:id`
  previously inherited the patient-management role list, so a records officer or
  midwife could erase a patient with all of their history.
- `PATCH /stock-transfers/:id/receive` required only authentication, so any
  account could book a receipt against a department it does not work in. It now
  needs the same roles that may request a transfer.
- `POST /bills/generate/:encounterId` required only authentication and now needs
  one of the revenue or clinical roles that may create or amend a bill.
- `POST /notifications` and `POST /notifications/message` required only
  authentication, letting any account push a notice into anyone else's feed. Both
  are now administrator-only, like the bulk and role broadcasts beside them.
- The nursing MAR endpoints dropped `hr_officer` from their read list; the
  medication record is patient data with no HR purpose.
- The GHS report endpoints and the referral statistics endpoint refused roles that
  the Reports and Referrals pages are open to (nurse; nurse, doctor, midwife),
  so those users got a 403 for data their own screen loads on mount. The
  insurance-claim tracking list likewise hid itself from doctors.

### Added

- Operational reports are now declared instead of hand-built. `frontend/src/config/reportRegistry.ts`
  describes a report — which API helper loads it, where its summary figures and its rows live,
  which columns it prints and which filters its own endpoint honours — and
  `frontend/src/components/reports/reportShell.tsx` plus `GenericReportPage.tsx` render any entry
  alike: sortable, paginated tables, totals that are either server-computed or an explicit sum of
  the rows the endpoint actually sent, and a footer that admits when the server capped the list.
  Their pills appear on the existing Financial tab. The statutory GHS returns (Form A, malaria,
  morbidity, IDSR, the consulting-room register) keep their own views because those must reproduce
  a printed form, and stock keeps its own screen because its lines are a physical count.
  Three reports came with the shell and twelve more are declared in it now, so the Reports
  screen generates every operational report the API already answers: **Financial Summary**,
  **Revenue Analysis**, **Collections**, **Revenue Lines**, **Claims Detail** (the insurance
  claims report that showed three summary cards and no claims at all now shows them) on the
  money side; **Clinical Statistics**, **Attendance**, **Demographic**, **Laboratory**,
  **Radiology**, **Procedures**, **Medications** and **Vitals** on the care side; and
  **NHIS Expiry** and **NHIS Claims** under NHIS. Each one exports to CSV, Excel and PDF like
  the rest of the screen, and each pill only appears for the roles its own endpoint answers to —
  a pill that returns 403 for the officer reading the screen is worse than no pill. The entries
  reuse the keys the hand-built views used, so exported filenames and the backend titles that map
  to them are unchanged.
- The Reports screen no longer carries its own copy of every operational report. Twelve
  hand-written renderers (financial, revenue, claims, attendance, demographic, lab, scans,
  procedures, medications, vitals and both NHIS reports) are gone, and the page dropped
  from 1213 to about 720 lines; those reports now come from the registry through the shared
  shell, which also adds a **Clinical Statistics** pill for the diagnosis report that had no
  view of its own. What the page fetches itself is only the nine statutory GHS returns. Three display
  defects went with them: the NHIS expiry "Last Visit" column, which read a field the service
  never returned and printed "—" for every patient; the claims view with totals and no rows;
  and the "Showing 50 of 100 of 142" truncations, since the shell pages the whole response and
  says so when the server itself capped the list. Export is limited to admin, accounts and
  records — the guard on `POST /reports/export` — so the button is hidden for other roles
  instead of being left to fail. A role that may open none of the returns on the default GHS tab
  is moved to the first tab whose reports answer to it. Two filter controls no endpoint could read
  (order status and a registered/walk-in toggle) are removed with their option lists, so the shared
  filter catalogue only offers what a report actually declares.
- `GET /billing/line-items` answers the revenue-lines report: every unvoided bill line inside a
  closed date window, each carrying its bill, payment mode and whoever it was raised for — a
  counter ticket is labelled as a walk-in rather than dropped, because it has no patient folder.
  Money is summed in whole cents, never by adding Prisma decimals. The window is required rather
  than optional, and `limit` is a stated guard rail the response reports hitting, so a short
  total cannot be mistaken for the whole picture. The read is `protect`-only, mirroring
  `/billing/collections`: any signed-in role may see money figures, and the route adds no new
  patient search or listing.

- Waiver, estimate and nursing writes now run through shared Zod request
  schemas at the route (`WaiverValidators`, `ProformaInvoiceValidators`,
  `NursingValidators`), the same layer already used for EMR, claim and
  communication writes. A waiver amount that is not a number, an estimate line
  with no quantity or price, a task priority outside `low/medium/high` or a
  nursing-note type that does not exist are now rejected with the field name
  before any row is touched.
- The route-authorization test now checks money and care routes one by one
  instead of only proving that `requireRole` appears somewhere in the file,
  which is how the unguarded estimate-approval route stayed hidden.

- A themed prompt dialog (`promptDialog`, mounted with the confirmation host)
  replaces the four remaining native `window.prompt` boxes: the waiver rejection
  reason and approved amount in billing, the estimate rejection reason and the
  medication-record variance reason in the nursing workspace. The native box
  cannot be themed, styled or keyboard-navigated consistently, and it conflated
  Cancel with an empty answer — on the estimate screen that meant pressing OK
  without typing silently did nothing at all. Cancelling now returns `null`,
  and an empty answer is only accepted where the API allows one. The waiver
  amount is now parsed and checked (`> 0`, or empty for the full requested
  amount) instead of handed to `parseFloat` and forwarded whatever it produced.

- An administrator can set a new password for a member of staff who cannot sign
  in: `PATCH /api/users/:id/password` (admin or super-admin), with a **Reset
  password** action on each row of Staff management. The chosen password passes
  the same policy as any other, only an administrator of equal or higher standing
  may reset a super-admin, and the login screen points staff at this path instead
  of promising a link. Until now there was no password reset path at all: the
  account could only be recovered by editing the database by hand.

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
- `frontend/src/config/access.ts` is the one place that says which role opens which
  page. Each entry lists the paths and `:param` patterns it owns, the roles that may
  open it, and optionally the narrower set that gets a sidebar link. The route guard
  in `App.tsx` and the sidebar in `DashboardLayout.tsx` both read this table, so the
  menu, the guard and the API role lists can be reviewed against one another. Backend
  route guards mirror it by hand and each divergence is commented where it lives.
- The visit page is a complete record of one attendance. It has a Scans tab built from
  the study rows the encounter already returns, and a result viewer that renders a lab
  test's recorded parameters (name, value, units, normal range) or a scan's findings,
  impression, notes and images. The previous table printed the raw `JSON.stringify` of
  the result blob.
- Documents can be produced from the visit itself. The result viewer prints the lab
  sheet or scan report, and each bill in the billing tab can print its statement, print
  a receipt for its most recent recorded payment, and — for the roles
  `POST /api/documents/receipt/:billId` admits — send that receipt to the patient by
  SMS or WhatsApp. Everything the print actions need is already loaded, so no role hits
  a diagnostic or billing endpoint it cannot call.
- Medical Entries accepts `?entry=diagnosis|lab|scan|medication|procedure|consumable`
  and opens that entry once the visit is loaded. The visit page's clinical shortcuts use
  it, so "Request a lab test" lands on the lab request form instead of a generic screen.
- Counter tickets: a walk-in who only buys drugs or has one lab or scan is served without
  creating a patient. `CounterClient` (`name`, optional `ageYears` and `phone`) holds the
  identity, and the ticket itself is an ordinary `Attendance` with `attendanceType: walk_in`
  pointing at that client instead of a `Patient`. Because `LabTest`, `Scan`, `Medication`,
  `Procedure` and `BillLineItem` are keyed on `attendanceId` alone, ordering a test, entering
  its result, dispensing a drug, raising the bill and printing all reuse the existing
  encounter, billing and document pipelines — only the name on the paper changes. `Attendance`
  and `Bill` now carry exactly one of `patientId` / `counterClientId`, enforced by a database
  CHECK and mirrored in the service layer (CI resets the schema with `db push`, which never
  runs the migration's constraints). Under `POST /api/counter/tickets`, staff create a ticket
  from a new name, an existing customer, or a registered patient search; add medicine lines,
  lab and scan orders; raise the ticket's bill; and close it once nothing is
  outstanding. A customer who later needs a folder is linked to a registered patient
  (`POST /api/counter/clients/:id/link`), which keeps the ticket's history readable under
  both identities instead of duplicating the person. Counter tickets are excluded from ANC,
  vitals and medical worklists, GHS returns, and claim submission, and cannot be discharged —
  they print a bill statement, receipt, prescription or lab/scan report instead.
- A **Counter** page at `/dashboard/counter` (pharmacist, lab tech, sonographer, accounts,
  records) drives those routes: three identity modes with the register check that
  `/api/patients` will not answer for bench staff, a Sell / Labs & scans / Bill & print
  workspace, and printing straight from the ticket. Dispensing is pharmacist-only and
  deducts stock through the pharmacy's own earliest-expiry batch allocation, so the browser
  never chooses a batch. Results are still entered by the lab or scan room on their own
  screens — the ticket appears in their queue with the customer's name. Sale lines are
  limited to stock marked as medicine with an active medication price, because dispensing
  and stock deduction require `StockItem.isMedication` and the service catalog has no
  consumable type; anything else is refused when it is added, with the reason. The billing
  screens no longer assume every bill has a patient: the collections report names whoever
  paid (`walk_in` for a ticket, with no folder number), and the visit list tags walk-ins.
- Claim batching now reads a month end to end.
  `GET /api/insurance-claims/batches/period-claims` answers every claim whose visit fell in
  `periodYear`/`periodMonth` — batched or not, draft or finalized — with that month's count,
  value, per-status split, and what a batch would still take from it. The batching screen is
  built around that period: choose September 2026 and the claim ledger, the month totals and the
  batch cards all describe September, whether or not a batch has been generated for it yet. Each
  claim row links to the batch it already sits in, and a batch's own total is checked against the
  claims inside it, with a warning when they have drifted apart.

### Changed

- Waiver, estimate and nursing records that do not exist, a waiver that is
  already decided, a draft estimate that has moved on, and a note or task that
  belongs to another author now answer 404, 409 or 403 instead of an
  unexpected-server-error page, because those services raise typed errors like
  the rest of the API.

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
- Lists that stopped at a server page size now walk it. The staff register answered 50
  people per request by default, so user management, and the role, department and shift
  pickers built on it, were missing everyone past the 50th member of staff; the roster and
  leave registers capped at 500 rows while their screens asked for 1000 and 2000. All three
  now page through what they asked for, and a caller that names a page still gets exactly
  that page.
- The stock requisition form reads the formulary from the shared inventory store instead of
  downloading its own 1000-row slice, so items beyond that line can be requisitioned, and the
  item picker is searchable and capped: every requisition line used to mount the entire
  formulary as `<option>` rows.
- The shared patient picker searches the register on the server as the operator types, the
  way the estimate form already did. It used to match only against the pages of the register
  that had already streamed in, so a patient further down the list could not be found at all.
- The payment screen follows the hospital's theme. It was built before the colour tokens
  existed, so it stayed white-and-blue in a dark theme, and its header band hid the patient
  name in one scheme and the amount figures in another. Cards, inputs, the payment-method
  tiles and both action buttons now read from the same variables every other billing screen
  uses, and the primary action is the standard accent button.
- The remaining primary buttons and status chips in scans, estimates, claims and attendance
  detail use the accent tokens too, so one click target no longer looks different depending
  on which screen the operator came from.
- The estimate list, estimate detail, insurance claims, claim tracking and the shared
  insurance section tabs read from the theme variables. These screens were written before
  the tokens existed and still asked for `bg-white`, `text-gray-900` and Tailwind's blue,
  green, purple and amber shades, so in a dark scheme they appeared as a bright white panel
  with black text, and their status chips were unreadable. Surfaces use `--bg-card`, borders
  `--border-color`, body copy `--text-primary/secondary/tertiary`, and each status keeps its
  meaning through the matching `--icon-*` pair: approved green, rejected red, submitted or
  converted purple, draft and expired yellow-to-orange, paid and informational cyan.
  Solid action buttons take the accent fill with `hover:opacity-90`, the same shape the rest
  of the app uses. A page that sets no text colour at all inherits black, so each of these
  screens now declares its own base colour instead of leaving table cells and modal copy to
  the browser default.
- Five more screens are on the tokens as well: the service-catalogue settings
  tab, the vitals history panel, the visit selector shared by nine entry screens, and both
  official report sheets (Form A midwives return and the monthly malaria returns). Each of
  them used the raw palette throughout — the catalogue tab alone asked for 284 hardcoded
  classes — so a dark scheme rendered them as bright white forms with black text and status
  chips that no longer matched any other screen. The catalogue's six service-type chips keep
  six distinct hues, since the token set has exactly one accent per meaning.
- The last four reachable screens that had never heard of the theme are converted:
  the department worklist drawer, the shared "Send to patient" dialog used by five
  entry screens, the vitals summary card on the antenatal page and the NHIA claim-form
  building blocks behind the three claim editors. The claim editors keep the teal form
  bars and the printed-form button outlines, because those reproduce the paper NHIA
  claim; the sheet, labels, inputs and status chips follow the scheme. Text inputs now
  declare their own background: nothing in the app sets `color-scheme`, so a native
  control left unstyled paints a white field even when the card around it is dark.
- The sidebar is rebuilt from the access matrix, so the links a role is offered are the
  links that role can use. Patients disappears for laboratory, pharmacy, imaging, accounts
  and HR (their screens reach patients through their own worklists), Settings disappears for
  doctors (the page only rendered "Access Restricted" for them), and Antenatal, Stock
  Transactions and the dispensing queue appear or go where the guard actually agrees.
  Attendance appears for lab technicians, sonographers and accounts, as agreed.
- The user-registration role picker offers HR Officer. `UserRole` has had that value since
  the schema defined it, but it was not selectable, so no account could ever be given the
  role the HR pages check for.
- An estimate no longer requires a patient. A quote is something a walk-in client asks for
  before anyone opens a file — "what will this scan cost" — and the form refused to save
  without a register search, which for the Accounts role that owns the screen is a dead end,
  because the patient register guard does not include them. `ProformaInvoice.patientId` is
  nullable (migration `20261027120000_estimate_allows_walk_in_client`), the header field is
  labelled optional, and an unattached quote prints as "Walk-in client" instead of grouping
  every walk-in under one "Unknown Patient". A visit page now carries an Estimate action for
  the roles that own the screen, which attaches the patient from the visit record itself
  instead of requiring a register search the guard would refuse.
- The estimate line's pricing basis picks the matching catalog tariff. `ServicePricing` keeps
  a cash, NHIS, private-insurance and corporate price, but the form read the first row of the
  historical pricing array and always took its cash price, so a line marked NHIS or corporate
  printed the cash figure. The row's four tiers are now held on the line and switching the
  basis re-prices it; choosing a service takes the newest active pricing row rather than
  whichever row the API happened to return first. The same rule is applied server-side when a
  line arrives without a price, so the stored total matches what the form showed.

### Fixed

- Claim batching is monthly, and it did not behave like it. The batching screen asked the API for
  `status=submitted` — which is not a `ClaimStatus` value, so the request is rejected and the
  account swallowed the error — then summed only the rows it happened to load, so the eligible
  count and the Generate button described a page instead of a month. It now calls
  `GET /api/insurance-claims/batches/eligible`, scoped by the provider or corporate account the
  batch will use. The preview also used to bucket corporate claims by `corporateAccountId` while
  the query that fills a batch filtered by provider type, so the number on screen was not the
  batch that got built; both readings now come from one eligibility rule. And the batch list
  totalled the current page, so a month holding more batches than the page size reported a
  smaller value than it actually did — the cards are now an aggregate over the whole filter.
- Insurance claims list: the Download XML and Print actions, the status filter and the "submitted"
  tile tested a status the enum does not have, so a finalized claim offered no actions and could
  not be filtered for. The accounts dashboard made the same invalid request and its error handler
  turned it into an empty list, so it reported no finalized claims at all.
- Collections and Revenue Lines lost the last day of every window. `GET /billing/collections`
  and `GET /billing/line-items` parsed `dateFrom`/`dateTo` with `new Date(...)`, and a plain date
  like `2026-10-27` is the first instant of that day, so `lte` stopped at midnight and excluded
  every payment and charged line taken on the end date — on the range the Reports screen opens
  with, that meant today's takings were missing entirely. Both routes now go through the shared
  report-range parser, which runs to the last millisecond of the final day, exactly as the
  `/reports/*` services already did.
- The visit page's Medications, Lab Tests and Procedures tabs always said "none recorded",
  even on visits full of them, and the counts on the tabs, the summary tiles and the
  diagnoses card agreed with the empty list. `GET /api/encounters/:id` answers with Prisma's
  relation names (`Medication`, `LabTest`, `Procedure`, `Scan`, `AttendanceDiagnosis`) while
  this screen read the camelCase names the frontend `Attendance` type claims. The page now
  reads whichever key the payload carries.
- Two shortcuts on the visit page went nowhere. "Billing" pointed at
  `/dashboard/billing/patient/:id` and the clinical quick actions at
  `/dashboard/attendance/:id/clinical/:type`; neither route is registered, so the catch-all
  bounced the user back to the dashboard. They now go to `/dashboard/patients/:id/billing`
  and to Medical Entries for that visit with the entry to open named in the query string.
- A visit no longer offers a link its own access matrix refuses. Every cross-screen action —
  Medical Entries, Vitals, Billing, Estimates, the laboratory and radiology worklists — is
  checked against `config/access.ts`, so lab technicians, sonographers and accounts get the
  screens they may actually open instead of an Access Denied page. The two result screens are
  keyed on the patient, so the visit passes the patient and the attendance through route
  state rather than sending an id they cannot resolve.
- Clinical shortcuts match the guards that save them. Every order on a visit (diagnosis, lab
  test, scan, procedure, prescription) is POST-guarded to admin and doctor, so the "quick
  clinical actions" panel no longer offers a nurse a form whose save button returns 403. The
  panel follows Medical Entries' own rule for a live visit — pending or admitted, not pending
  only — so an admitted patient can still be ordered investigations.

- Printing produced a blank sheet. The print stylesheet hid every element on the page and
  then revealed `#anc-report-content` — an id no component renders, because the ANC form
  container is `#form-a-report-content`. Nothing matched, so the Print button on the
  Form A report, and the Print buttons on the clinical-entries, vitals and pharmacy screens
  (which call `window.print()` on their own page) all printed nothing at all. The extract-
  the-report rule is now driven by a `printable-report` class on the two report sheets and
  only applies when one of them is on screen; other screens print their own page with the
  dashboard header and sidebar removed.
- A themed report no longer prints in screen colours. Dark schemes set light text, which is
  invisible on paper, so `.printable-report` is forced to black-on-white with neutral table
  borders inside the print stylesheet while the screen keeps following the theme.
- Laboratory and imaging results can be recorded again. `LabResultEntry` and `ScansEntry`
  loaded the patient register while opening their worklist, and a lab technician or
  sonographer has no read access to it, so the whole initial load failed. The register is
  now optional on both screens — the patient arrives from the worklist row, not a search box.
- The appointments list no longer fails for lab technicians and sonographers, for the same
  reason: one rejected register call inside `Promise.all` discarded the appointments that
  had loaded and reported "Load Failed".
- Scan templates are readable by the sonographer who uses them. Every
  `/scan-templates` route, including the category and body-part metadata the entry form
  needs, excluded that role.
- Requisitions and the visit list reach the roles that work them. The requisition endpoints
  refused lab and imaging staff although both roles own the page, attendance was missing
  from the sonographer and accounts lists, and the dispensing queue was the reverse case: it
  was open to midwives, who cannot dispense (`PUT /encounters/:id/medications/:id/dispense`
  is pharmacist-only), so every action on it would have failed.
- Action buttons now match the guard behind them. A midwife can save a visit
  (`PUT /encounters/:id`) but the attendance screens hid the edit controls, and the
  attendance detail page showed a "Sync bill" button to roles that `POST
  /bills/generate/:encounterId` refuses. Patient hard-delete is offered only to
  administrators, matching the API.
- The HR officer's User Management page loads. It is in the sidebar for that role, but
  `GET /users` was administrator-only, so the page rendered an error instead of the staff list.
- A lab technician or sonographer opening Medical Services no longer lands on a scans tab
  their own template read now allows.
- The NHIS claim "Edit member" button is hidden from roles that cannot save it: the write is
  `PUT /patients/:id`, which the patient-register guard refuses for accounts. Billing's
  "View Profile" shortcut is hidden for the same reason instead of bouncing to Access Denied.
- Creating an estimate tells accounts why the patient list is empty rather than showing a
  blank dropdown: the register search answers 403 for that role, and the hint names Records
  or an administrator as the role that can raise the estimate.

### Removed

- The unused second rate-limiter implementation (`backend/src/middleware/rateLimiter.ts`) is
  deleted. Nothing imported it: the live limiter is `backend/src/middleware/apiLimits.ts`,
  mounted app-wide and again on `POST /login`. Keeping two limiters in the tree invited the
  wrong one to be wired up later — that version counted per IP with unbounded keys and never
  released its cleanup interval, which on a hospital network means one busy router locks out
  the whole building.
- The limits that remain are in-process on purpose. This deployment is one Node process behind
  the packaged app, so per-user counters in that process cannot drift between workers, and the
  API limit (1,500 requests per minute per signed-in user) is deliberately generous so it
  cannot reintroduce the page freezes it was reported against. `apiLimits.ts` documents the
  one change needed if the server is ever split across processes: put a shared store such as
  Redis behind `hit()`.
- The marketing landing page (`frontend/src/pages/LandingPage.tsx`) is deleted. Nothing
  imported it and no route reached it — `/` redirects to the dashboard — and it advertised a
  self-service SaaS this product is not: `/register`, `/pricing`, `/demo`, `/blog`,
  `/careers`, `/about`, "Start Free Trial", "Trusted by 50+ Hospitals", `support@hms.app` and
  a 2025 copyright, on a single-facility application that is installed locally and whose
  accounts are created by an administrator. Leaving it in the tree meant leaving a screen of
  dead links one refactor or stray route away from being reachable.
- The two hand-maintained role tables in the frontend are deleted: `rolePermissions` plus
  `routeMap`/`dynamicRoutes` in `App.tsx` and `navigationItems`/`NAV_GROUPS` in
  `DashboardLayout.tsx`. They were two halves of the same answer written independently, and
  they disagreed — the sidebar offered a role a link the guard then refused, or hid a page the
  guard allowed. All of it now comes from `config/access.ts`.
- "Convert to Bill" is removed from estimates (`POST /estimates/:id/convert`, the service and
  repository methods behind it, the API client call, the store action and the button plus its
  payment-mode dialog). A quote records what someone asked to be priced; a bill has to carry
  the labs that were resulted, the drugs that were dispensed and the procedures that were
  rendered, and those line items are written by their own clinical routes. Converting produced
  a second, understated bill beside the real one, which is how a patient ends up billed twice
  or billed less than the care cost. Estimates now end at accepted or rejected and the bill is
  generated from the encounter. Estimates converted before still show and link their bill.
