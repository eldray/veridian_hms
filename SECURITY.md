# Security policy

Veridian HMS handles protected health information. Treat every deployment as a
production clinical system.

## Reporting a vulnerability

Do not open a public issue for a security problem. Report it privately to the
maintainer listed in `package.json` with:

- affected version and component,
- reproduction steps,
- impact (data exposure, privilege escalation, availability),
- any suggested remediation.

You should receive an acknowledgement within 3 business days. Please give us a
reasonable window to ship a fix before public disclosure.

## Supported versions

Only the latest release receives security fixes. Upgrade instructions are in
[docs/OPERATIONS.md](docs/OPERATIONS.md).

## Handling secrets and patient data

- Never commit `.env`, `test.txt`-style credential notes, database dumps, or
  anything under `backend/uploads/`.
- The packaged desktop app generates a per-install JWT secret and encrypts the
  database password with Electron `safeStorage`; do not copy those files
  between machines.
- If a secret was ever committed, rotate it. Removing the file from the current
  commit does not remove it from git history; the history must be purged and
  every credential treated as compromised.
- Backups contain the entire database. Store them encrypted and outside the
  installation directory, and restrict access to super administrators.

## Built-in controls

- Authentication: JWT access tokens, hashed refresh tokens with replay
  revocation, login rate limiting.
- Authorization: `protect` + role guards on every module; backup restore is
  super-admin only.
- Files: uploads are served only through an authenticated route with path
  traversal checks; restores are written outside the upload directory.
- Transport: CORS allowlist, Helmet headers, configurable secure cookies.
- Auditing: write operations are recorded by `auditWrites` middleware.

These controls reduce risk; they do not replace a deployment-specific threat
model, TLS termination, OS hardening, or an independent penetration test.
