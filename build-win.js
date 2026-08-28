#!/usr/bin/env node
// build-win.js — Full Windows Installer Build Script
// Run with: node build-win.js
// Output:   release/VeridianHMS-Setup-<version>-x64.exe

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const BACKEND_DIR = path.join(ROOT, 'backend');
const FRONTEND_DIR = path.join(ROOT, 'frontend');
const BACKEND_DIST = path.join(BACKEND_DIR, 'dist');
const FRONTEND_DIST = path.join(FRONTEND_DIR, 'dist');
const BUILD_BACKEND = path.join(ROOT, 'build', 'backend');
const RELEASE_DIR = path.join(ROOT, 'release');

// ─── Helpers ────────────────────────────────────────────────────────────────
function log(emoji, msg) {
  console.log(`\n${emoji}  ${msg}`);
}

function run(cmd, cwd = ROOT, label = '') {
  console.log(`\n  ▶ ${label || cmd}`);
  execSync(cmd, { cwd, stdio: 'inherit', shell: true });
}

function rmrf(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
    console.log(`  🗑  Removed: ${path.relative(ROOT, dir)}`);
  }
}

function copyDir(src, dest, exclude = []) {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    if (exclude.some(ex => entry.name === ex || entry.name.endsWith(ex))) continue;
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath, exclude);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// ─── STEP 0: Pre-flight checks ───────────────────────────────────────────────
log('🔍', 'Running pre-flight checks...');

if (!fs.existsSync(path.join(BACKEND_DIR, 'package.json'))) {
  console.error('❌ backend/package.json not found. Are you in the project root?');
  process.exit(1);
}
if (!fs.existsSync(path.join(FRONTEND_DIR, 'package.json'))) {
  console.error('❌ frontend/package.json not found.');
  process.exit(1);
}
if (!fs.existsSync(path.join(ROOT, 'main.cjs'))) {
  console.error('❌ main.cjs not found.');
  process.exit(1);
}
if (!fs.existsSync(path.join(ROOT, 'node_modules', 'electron'))) {
  console.error('❌ Electron not installed. Run: npm install');
  process.exit(1);
}

console.log('  ✅ All pre-flight checks passed');

// ─── STEP 1: Clean previous build artifacts ──────────────────────────────────
log('🧹', 'Cleaning previous build artifacts...');
rmrf(path.join(ROOT, 'release'));
rmrf(path.join(ROOT, 'build', 'backend'));
rmrf(BACKEND_DIST);
rmrf(FRONTEND_DIST);

// ─── STEP 2: Install backend dependencies (production only) ──────────────────
log('📦', 'Installing backend production dependencies...');
if (!fs.existsSync(path.join(BACKEND_DIR, 'node_modules'))) {
  run('npm install', BACKEND_DIR, 'npm install (backend)');
}
// Ensure prisma client is generated
log('🔧', 'Generating Prisma client...');
run('npx prisma generate', BACKEND_DIR, 'prisma generate');

// ─── STEP 3: Compile backend TypeScript ──────────────────────────────────────
log('🏗 ', 'Compiling backend TypeScript → JavaScript...');
run('npx tsc --project tsconfig.json', BACKEND_DIR, 'tsc (backend)');

if (!fs.existsSync(path.join(BACKEND_DIST, 'server.js'))) {
  console.error('❌ Backend compilation failed — dist/server.js not found');
  process.exit(1);
}
console.log('  ✅ Backend compiled → backend/dist/');

// ─── STEP 4: Install frontend dependencies ───────────────────────────────────
log('📦', 'Installing frontend dependencies...');
if (!fs.existsSync(path.join(FRONTEND_DIR, 'node_modules'))) {
  run('npm install', FRONTEND_DIR, 'npm install (frontend)');
}

// ─── STEP 5: Build frontend (Vite) ───────────────────────────────────────────
log('⚛ ', 'Building frontend (Vite)...');
run('npm run build', FRONTEND_DIR, 'vite build');

if (!fs.existsSync(path.join(FRONTEND_DIST, 'index.html'))) {
  console.error('❌ Frontend build failed — dist/index.html not found');
  process.exit(1);
}
console.log('  ✅ Frontend built → frontend/dist/');

// ─── STEP 6: Stage compiled backend + node_modules for packaging ─────────────
log('📋', 'Staging compiled backend for packaging...');

// Copy compiled JS output
copyDir(BACKEND_DIST, BUILD_BACKEND, []);

// Copy backend node_modules (runtime deps only — devDeps excluded via npm ci)
const backendNM = path.join(BACKEND_DIR, 'node_modules');
const buildNM = path.join(BUILD_BACKEND, 'node_modules');
if (fs.existsSync(backendNM)) {
  log('📋', 'Copying backend node_modules (this may take a moment)...');
  copyDir(backendNM, buildNM, ['.cache', '.yarn-integrity']);
}

// Copy backend .env if it exists (users must configure their DB credentials)
const backendEnv = path.join(BACKEND_DIR, '.env');
const buildEnv = path.join(BUILD_BACKEND, '.env');
if (fs.existsSync(backendEnv)) {
  fs.copyFileSync(backendEnv, buildEnv);
  console.log('  ✅ Copied backend/.env → build/backend/.env');
} else {
  console.log('  ⚠️  No backend/.env found — users must configure it after install');
}

// Copy Prisma schema & migrations (needed for prisma migrate deploy in production)
const prismaDir = path.join(BACKEND_DIR, 'prisma');
const buildPrisma = path.join(BUILD_BACKEND, 'prisma');
if (fs.existsSync(prismaDir)) {
  copyDir(prismaDir, buildPrisma, []);
  console.log('  ✅ Copied prisma/ schema and migrations');
}

// Copy uploads folder structure (empty, just for the directory)
const uploadsDir = path.join(BUILD_BACKEND, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

console.log('  ✅ Backend staged → build/backend/');

// ─── STEP 7: Write a production server.js entry wrapper ──────────────────────
// The compiled dist/server.js uses ESM imports but we need a CJS bridge
// for the electron main.cjs spawner to call `node server.js`
log('📝', 'Writing production backend entry wrapper...');

const serverWrapperPath = path.join(BUILD_BACKEND, 'server.js');
const serverWrapper = `// Production entry point for Electron packaging
// This wraps the compiled ESM TypeScript output
import('./server.js').catch(err => {
  console.error('Failed to start backend server:', err);
  process.exit(1);
});
`;

// Check if dist/server.js already exists from tsc output
// If so, rename it and create a CJS wrapper
const compiledServer = path.join(BUILD_BACKEND, 'server.js');
if (fs.existsSync(compiledServer)) {
  // tsc already outputs server.js — check if it has import/export (ESM)
  const content = fs.readFileSync(compiledServer, 'utf8');
  const isESM = content.includes('import ') || content.includes('export ');
  if (isESM) {
    // Rename compiled output and create a CJS bootstrap
    fs.renameSync(compiledServer, path.join(BUILD_BACKEND, 'server.mjs'));
    fs.writeFileSync(compiledServer, `// CJS bootstrap for Electron\nrequire = require('module').createRequire(import.meta.url);\nimport('./server.mjs').catch(e => { console.error(e); process.exit(1); });\n`);
  }
}

console.log('  ✅ Backend entry point ready');

// ─── STEP 8: Package with electron-builder ───────────────────────────────────
log('📦', 'Packaging with electron-builder (Windows NSIS installer)...');
log('⏳', 'This will take several minutes...');

run(
  'npx electron-builder --win --x64 --config electron-builder.yml',
  ROOT,
  'electron-builder --win --x64'
);

// ─── STEP 9: Report results ───────────────────────────────────────────────────
log('🔍', 'Checking output...');

if (!fs.existsSync(RELEASE_DIR)) {
  console.error('❌ Release directory not created — build may have failed');
  process.exit(1);
}

const releaseFiles = fs.readdirSync(RELEASE_DIR).filter(f =>
  f.endsWith('.exe') || f.endsWith('.zip') || f.endsWith('.yml')
);

console.log('\n');
console.log('═'.repeat(60));
console.log('  ✅  BUILD SUCCESSFUL!');
console.log('═'.repeat(60));
console.log('\n  📁 Output directory: release/');
releaseFiles.forEach(f => {
  const stats = fs.statSync(path.join(RELEASE_DIR, f));
  const sizeMB = (stats.size / 1024 / 1024).toFixed(1);
  const isExe = f.endsWith('.exe');
  console.log(`  ${isExe ? '🎉' : '📄'} ${f}  (${sizeMB} MB)`);
});
console.log('\n  ⚠️  IMPORTANT: The installer does NOT include PostgreSQL.');
console.log('     Users must have PostgreSQL installed and configured.');
console.log('     Database credentials go in: backend/.env inside the install dir.');
console.log('═'.repeat(60));
console.log('');
