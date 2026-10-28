# Schema baselines

Each file is a copy of `schema.prisma` as it shipped in that version. The
Windows build diffs the current schema against the newest baseline that is older
than the version being built, so it can emit an incremental SQL migration for
existing installations.

Rules:

- Never edit a baseline that has already shipped; add a new file instead.
- Commit the baseline that the build writes for the new version together with
  the release.
- The first baseline (`1.0.0.prisma`) matches the schema that shipped with the
  original full-schema installer.
