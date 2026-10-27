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

### Fixed

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
