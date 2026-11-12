#!/usr/bin/env node
// build-win.js - builds the Windows installer.
//   node build-win.js                    -> release/standalone/VeridianHMS-Setup-<version>-x64.exe   (one PC runs everything)
//   node build-win.js --target=server    -> release/server/VeridianHMS Server-Setup-...exe          (hospital server: API + DB link)
//   node build-win.js --target=client    -> release/client/VeridianHMS Client-Setup-...exe          (workstation: window only)
//   add --dir to any of them             -> unpacked app only (fast check, no installer)
// Install ONE server per hospital and a client on every other PC. Clients never start a backend or the
// scheduled jobs, which is what makes many workstations safe.
// Run on Windows (or any OS with network access to npm, Prisma and electron-builder downloads).

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const BACKEND = path.join(ROOT, 'backend');
const FRONTEND = path.join(ROOT, 'frontend');
const STAGE = path.join(ROOT, 'build', 'backend');
const dirOnly = process.argv.includes('--dir');
const targetArg = (process.argv.find((a) => a.startsWith('--target=')) || '--target=standalone').split('=')[1];
if (!['standalone', 'server', 'client'].includes(targetArg)) { console.error(`Unknown --target "${targetArg}". Use standalone, server or client.`); process.exit(1); }
const target = targetArg;
const builderConfig = { standalone: 'electron-builder.yml', server: 'electron-builder.server.yml', client: 'electron-builder.client.yml' }[target];
const outDir = path.join(ROOT, 'release', target);
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
need(path.join(ROOT, builderConfig), 'Builder config is missing.');
need(path.join(ROOT, 'build', 'icon.ico'), 'The installer icon is required.');

step('1/7 Installing dependencies');
run('npm install', ROOT);
if (target !== 'client') {
run('npm ci || npm install', BACKEND);
run('npm ci || npm install', FRONTEND);

step('2/7 Building the frontend');
// Demo logins on the sign-in page are for development only. Force them off for the installer even if a
// frontend/.env file (or the build machine's environment) turns them on.
run('npm run build', FRONTEND, { VITE_ENABLE_DEMO_ACCOUNTS: 'false' });
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

step('6/7 Copying reference data (no demo/sample data)');
// Only the reference data the first-run bootstrap reads. Sample content (corporate accounts with fake
// employees) and the large source spreadsheets used by developer scripts stay out of the installer.
const DATA_EXCLUDE = new Set(['corporateAccounts.json']);
const dataSrc = path.join(BACKEND, 'src', 'data');
const dataDest = path.join(STAGE, 'data');
fs.mkdirSync(dataDest, { recursive: true });
for (const f of fs.readdirSync(dataSrc)) {
  if (DATA_EXCLUDE.has(f) || /\.(xlsx|xls|csv|pdf)$/i.test(f)) continue;
  fs.copyFileSync(path.join(dataSrc, f), path.join(dataDest, f));
}
for (const required of ['diagnoses.json', 'departments.json', 'gdrgTariffs.json', 'labTests.json', 'scans.json', 'procedures.json', 'servicePricing.json', 'medications1.json', 'medications2.json', 'nhismedicines.json', 'consumables.json', 'insuranceProviders.json']) {
  need(path.join(dataDest, required), 'Reference data file is missing from backend/src/data.');
}
for (const banned of DATA_EXCLUDE) {
  if (fs.existsSync(path.join(dataDest, banned))) { console.error(`Sample data file ${banned} must not ship.`); process.exit(1); }
}
rm(path.join(STAGE, 'prisma')); // client already generated; the schema file is not needed at run time
}

step(`7/7 Packaging the ${target} app with electron-builder`);
// The role is baked into the installer: main.cjs reads build/app-mode.json to know what it is.
fs.writeFileSync(path.join(ROOT, 'build', 'app-mode.json'), JSON.stringify({ mode: target }));
rm(outDir);
run(`npx electron-builder --config ${builderConfig} --win ${dirOnly ? '--dir' : 'nsis'} --x64 --publish never -c.directories.output="${outDir}"`, ROOT, { CSC_IDENTITY_AUTO_DISCOVERY: 'false' });

console.log(`\nDone. ${target} output in ${outDir}`);
