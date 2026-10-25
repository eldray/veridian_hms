#!/usr/bin/env node
// build-win.js - builds the Windows installer.
//   node build-win.js          -> release/VeridianHMS-Setup-<version>-x64.exe
//   node build-win.js --dir    -> unpacked app only (fast check, no installer)
// Run on Windows (or any OS with network access to npm, Prisma and electron-builder downloads).

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const BACKEND = path.join(ROOT, 'backend');
const FRONTEND = path.join(ROOT, 'frontend');
const STAGE = path.join(ROOT, 'build', 'backend');
const dirOnly = process.argv.includes('--dir');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function step(msg) { console.log(`\n=== ${msg}`); }
function run(cmd, cwd = ROOT, env = {}) {
  console.log(`  > ${cmd}`);
  execSync(cmd, { cwd, stdio: 'inherit', env: { ...process.env, ...env } });
}
function rm(p) { fs.rmSync(p, { recursive: true, force: true }); }
function copyDir(src, dest) { fs.cpSync(src, dest, { recursive: true }); }
function need(p, hint) { if (!fs.existsSync(p)) { console.error(`Missing ${path.relative(ROOT, p)}. ${hint}`); process.exit(1); } }
function sha256(file) { return require('crypto').createHash('sha256').update(fs.readFileSync(file)).digest('hex'); }
function parseVersion(v) { return String(v).split('.').map((n) => parseInt(n, 10) || 0); }
function compareVersions(a, b) {
  const pa = parseVersion(a);
  const pb = parseVersion(b);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) - (pb[i] || 0);
  }
  return 0;
}
function findPreviousBaseline(dir, currentVersion) {
  if (!fs.existsSync(dir)) return null;
  const versions = fs.readdirSync(dir)
    .filter((f) => f.endsWith('.prisma'))
    .map((f) => ({ version: f.replace(/\.prisma$/, ''), file: path.join(dir, f) }))
    .filter((b) => compareVersions(b.version, currentVersion) < 0)
    .sort((a, b) => compareVersions(a.version, b.version));
  return versions.length ? versions[versions.length - 1] : null;
}

need(path.join(BACKEND, 'package.json'), 'Run this from the project root.');
need(path.join(ROOT, 'build', 'icon.ico'), 'The installer icon is required.');

step('1/7 Installing dependencies');
run('npm install', ROOT);
run('npm ci || npm install', BACKEND);
run('npm ci || npm install', FRONTEND);

step('2/7 Building the frontend');
run('npm run build', FRONTEND);
need(path.join(FRONTEND, 'dist', 'index.html'), 'Frontend build produced no index.html.');

step('3/7 Bundling the backend (esbuild)');
rm(STAGE);
fs.mkdirSync(STAGE, { recursive: true });
run(`node scripts/bundle.mjs "${STAGE}"`, BACKEND);
need(path.join(STAGE, 'server.mjs'), 'Backend bundle failed.');
need(path.join(STAGE, 'bootstrap.mjs'), 'Bootstrap bundle failed.');

step('4/7 Installing production dependencies for the backend');
const pkg = JSON.parse(fs.readFileSync(path.join(BACKEND, 'package.json'), 'utf8'));
fs.writeFileSync(path.join(STAGE, 'package.json'), JSON.stringify({
  name: 'veridian-backend', version: pkg.version || '1.0.0', private: true, type: 'module',
  dependencies: pkg.dependencies,
}, null, 2));
if (fs.existsSync(path.join(BACKEND, 'package-lock.json'))) fs.copyFileSync(path.join(BACKEND, 'package-lock.json'), path.join(STAGE, 'package-lock.json'));
run(`${npm} install --omit=dev --no-audit --no-fund --ignore-scripts`, STAGE);

step('5/7 Generating the Prisma client (Windows engine) and versioned database scripts');
fs.mkdirSync(path.join(STAGE, 'prisma'), { recursive: true });
fs.copyFileSync(path.join(BACKEND, 'prisma', 'schema.prisma'), path.join(STAGE, 'prisma', 'schema.prisma'));
run('npx prisma generate --schema prisma/schema.prisma', STAGE);

const sqlDir = path.join(STAGE, 'sql');
const migrationsDir = path.join(sqlDir, 'migrations');
fs.mkdirSync(migrationsDir, { recursive: true });

// Full schema: only used when the target database is empty. It must never be
// re-applied to an existing install.
const fullSqlPath = path.join(sqlDir, 'full-schema.sql');
const fullSql = execSync('npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script', { cwd: STAGE, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
if (!/CREATE TABLE/i.test(fullSql)) { console.error('Generated database script has no tables.'); process.exit(1); }
fs.writeFileSync(fullSqlPath, fullSql);
console.log(`  full schema: ${(fullSql.length / 1024).toFixed(0)} KB`);

// Incremental migrations: diff the previous release's schema against the
// current one. Without this, every upgrade would reuse a single file name and
// be skipped by the installer (the original upgrade bug).
const currentVersion = pkg.version || '1.0.0';
const baselinesDir = path.join(BACKEND, 'prisma', 'baselines');
const previous = findPreviousBaseline(baselinesDir, currentVersion);
const migrationEntries = [];

if (!previous) {
  console.log(`  no previous schema baseline found; this build has no incremental migration for ${currentVersion}`);
} else {
  const diffSql = execSync(
    `npx prisma migrate diff --from-schema-datamodel "${previous.file}" --to-schema-datamodel prisma/schema.prisma --script`,
    { cwd: STAGE, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 },
  );
  const hasChanges = /(ALTER|CREATE|DROP)\s/i.test(diffSql);
  if (!hasChanges) {
    console.log(`  schema unchanged since ${previous.version}; no migration needed`);
  } else {
    const baselineDir = path.join(BACKEND, 'prisma', 'baselines');
    const baselineCount = fs.existsSync(baselineDir)
      ? fs.readdirSync(baselineDir).filter((f) => f.endsWith('.prisma') && compareVersions(f.replace(/\.prisma$/, ''), currentVersion) < 0).length
      : 1;
    const name = `${String(baselineCount).padStart(4, '0')}_${previous.version}_to_${currentVersion}.sql`;
    fs.writeFileSync(path.join(migrationsDir, name), diffSql);
    migrationEntries.push({ name, sha256: sha256(path.join(migrationsDir, name)) });
    console.log(`  migration: ${name} (${(diffSql.length / 1024).toFixed(0)} KB)`);
  }
}

// Record the baseline for the next release. Committing it with the release is
// what allows future builds to produce another incremental diff.
fs.mkdirSync(baselinesDir, { recursive: true });
const currentBaseline = path.join(baselinesDir, `${currentVersion}.prisma`);
if (!fs.existsSync(currentBaseline)) {
  fs.copyFileSync(path.join(BACKEND, 'prisma', 'schema.prisma'), currentBaseline);
  console.log(`  wrote new schema baseline ${path.relative(ROOT, currentBaseline)} (commit it with this release)`);
}

fs.writeFileSync(path.join(sqlDir, 'manifest.json'), JSON.stringify({
  version: currentVersion,
  generatedAt: new Date().toISOString(),
  fullSchema: { name: 'full-schema.sql', sha256: sha256(fullSqlPath) },
  migrations: migrationEntries,
}, null, 2));

step('6/7 Copying seed data');
copyDir(path.join(BACKEND, 'src', 'data'), path.join(STAGE, 'data'));
rm(path.join(STAGE, 'prisma')); // client already generated; the schema file is not needed at run time

step('7/7 Packaging with electron-builder');
rm(path.join(ROOT, 'release'));
run(`npx electron-builder --win ${dirOnly ? '--dir' : 'nsis'} --x64 --publish never`, ROOT, { CSC_IDENTITY_AUTO_DISCOVERY: 'false' });

console.log(`\nDone. Output in ${path.join(ROOT, 'release')}`);
