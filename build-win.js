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

step('5/7 Generating the Prisma client (Windows engine) and database script');
fs.mkdirSync(path.join(STAGE, 'prisma'), { recursive: true });
fs.copyFileSync(path.join(BACKEND, 'prisma', 'schema.prisma'), path.join(STAGE, 'prisma', 'schema.prisma'));
run('npx prisma generate --schema prisma/schema.prisma', STAGE);
fs.mkdirSync(path.join(STAGE, 'sql'), { recursive: true });
// The repo ignores prisma/migrations, so the full schema is generated as one SQL script.
const sql = execSync('npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script', { cwd: STAGE, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
if (!/CREATE TABLE/i.test(sql)) { console.error('Generated database script has no tables.'); process.exit(1); }
fs.writeFileSync(path.join(STAGE, 'sql', '0001_schema.sql'), sql);
console.log(`  schema script: ${(sql.length / 1024).toFixed(0)} KB`);

step('6/7 Copying seed data');
copyDir(path.join(BACKEND, 'src', 'data'), path.join(STAGE, 'data'));
rm(path.join(STAGE, 'prisma')); // client already generated; the schema file is not needed at run time

step('7/7 Packaging with electron-builder');
rm(path.join(ROOT, 'release'));
run(`npx electron-builder --win ${dirOnly ? '--dir' : 'nsis'} --x64 --publish never`, ROOT, { CSC_IDENTITY_AUTO_DISCOVERY: 'false' });

console.log(`\nDone. Output in ${path.join(ROOT, 'release')}`);
