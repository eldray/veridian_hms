// main.cjs — Veridian HMS Electron main process
//
// Packaged app flow:
//   1. First run: show the setup window (PostgreSQL connection + administrator password).
//   2. Create the database if needed, apply the SQL migrations, seed reference data + the admin account.
//   3. Start the bundled backend with Electron's own Node runtime (no Node.js install needed on the PC).
//   4. Load the UI from the backend (http://127.0.0.1:<port>).
// Settings live in the per-user data folder, never in the install folder, so upgrades keep them.
//
// Development (not packaged): loads http://localhost:3000 and expects `npm start` to be running.

const { app, BrowserWindow, ipcMain, dialog, Menu, shell, safeStorage } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');
const net = require('net');
const os = require('os');
const crypto = require('crypto');

const APP_TITLE = 'Veridian HMS';
const PREFERRED_PORT = 5000; // kept stable when possible: the browser origin (and saved login) depends on it
const HEALTH_TIMEOUT_MS = 90_000;
const LOG_FILE_NAME = 'veridian-hms.log';

let mainWindow = null;
let setupWindow = null;
let serverProcess = null;
let activePort = PREFERRED_PORT;
let backendReady = false;
let quitting = false;
let starting = false;

// ==================== LOGGING ====================
let logStream = null;
function logFilePath() {
  return path.join(app.getPath('logs'), LOG_FILE_NAME);
}
function initLog() {
  try {
    fs.mkdirSync(app.getPath('logs'), { recursive: true });
    const file = logFilePath();
    // keep the log from growing forever
    if (fs.existsSync(file) && fs.statSync(file).size > 5 * 1024 * 1024) {
      fs.renameSync(file, file + '.old');
    }
    logStream = fs.createWriteStream(file, { flags: 'a' });
  } catch (e) {
    console.error('Could not open log file:', e.message);
  }
}
function log(...args) {
  const line = `${new Date().toISOString()} ${args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ')}`;
  console.log(line);
  if (logStream) logStream.write(line + '\n');
}

// ==================== PATHS ====================
function getBackendDir() {
  return app.isPackaged ? path.join(process.resourcesPath, 'backend') : path.join(__dirname, 'backend');
}
// Everything the backend writes with a relative path (uploads/, backups/ ...) lands here, so it must be writable
function getDataDir() {
  const dir = path.join(app.getPath('userData'), 'data');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}
function getConfigPath() {
  return path.join(app.getPath('userData'), 'config.json');
}

// ==================== CONFIG (database settings) ====================
function encryptSecret(plain) {
  if (safeStorage.isEncryptionAvailable()) {
    return { enc: true, value: safeStorage.encryptString(plain).toString('base64') };
  }
  return { enc: false, value: plain };
}
function decryptSecret(obj) {
  if (!obj) return '';
  if (obj.enc) {
    try {
      return safeStorage.decryptString(Buffer.from(obj.value, 'base64'));
    } catch (e) {
      log('Could not decrypt the stored database password:', e.message);
      return '';
    }
  }
  return obj.value || '';
}
function loadConfig() {
  try {
    const raw = JSON.parse(fs.readFileSync(getConfigPath(), 'utf8'));
    if (!raw || !raw.db) return null;
    return {
      db: {
        host: raw.db.host,
        port: Number(raw.db.port) || 5432,
        database: raw.db.database,
        user: raw.db.user,
        password: decryptSecret(raw.db.password),
      },
      bootstrapDone: !!raw.bootstrapDone,
    };
  } catch {
    return null;
  }
}
function saveConfig(cfg) {
  const out = {
    db: {
      host: cfg.db.host,
      port: cfg.db.port,
      database: cfg.db.database,
      user: cfg.db.user,
      password: encryptSecret(cfg.db.password || ''),
    },
    bootstrapDone: !!cfg.bootstrapDone,
  };
  fs.mkdirSync(path.dirname(getConfigPath()), { recursive: true });
  fs.writeFileSync(getConfigPath(), JSON.stringify(out, null, 2), { mode: 0o600 });
}

// JWT secret (persistent so logins survive restarts)
function getOrCreateJwtSecret() {
  const secretPath = path.join(app.getPath('userData'), '.jwt-secret');
  try {
    if (fs.existsSync(secretPath)) {
      const existing = fs.readFileSync(secretPath, 'utf8').trim();
      if (existing.length >= 32) return existing;
    }
  } catch {
    /* fall through and create a new one */
  }
  const secret = crypto.randomBytes(64).toString('hex');
  try {
    fs.mkdirSync(path.dirname(secretPath), { recursive: true });
    fs.writeFileSync(secretPath, secret, { mode: 0o600 });
  } catch (e) {
    log('Could not persist JWT secret:', e.message);
  }
  return secret;
}

// ==================== POSTGRES SETUP ====================
function loadPg() {
  // pg ships with the bundled backend (resources/backend/node_modules)
  return require(path.join(getBackendDir(), 'node_modules', 'pg'));
}

const IDENT = /^[A-Za-z0-9_]+$/;

function validateDbSettings(db) {
  if (!db.host || !String(db.host).trim()) return 'Enter the database server (host).';
  const port = Number(db.port);
  if (!Number.isInteger(port) || port < 1 || port > 65535) return 'The port must be a number between 1 and 65535.';
  if (!db.database || !IDENT.test(db.database)) return 'The database name may only contain letters, numbers and underscores.';
  if (!db.user || !String(db.user).trim()) return 'Enter the database user.';
  return null;
}

function friendlyPgError(err, db) {
  const code = err && err.code;
  if (code === 'ECONNREFUSED') return `Cannot reach PostgreSQL at ${db.host}:${db.port}. Check that PostgreSQL is installed and running, and that the host and port are right.`;
  if (code === 'ENOTFOUND') return `The server name "${db.host}" could not be found.`;
  if (code === 'ETIMEDOUT' || /timeout/i.test(err.message || '')) return `Timed out connecting to ${db.host}:${db.port}. Check the address and that no firewall is blocking port ${db.port}.`;
  if (code === '28P01') return `PostgreSQL rejected the user name or password for "${db.user}".`;
  if (code === '28000') return `PostgreSQL does not allow "${db.user}" to connect from this PC (pg_hba.conf).`;
  if (code === '42501') return `The user "${db.user}" is not allowed to create the database "${db.database}". Create it first in pgAdmin, or use a user with CREATEDB rights.`;
  return err.message || String(err);
}

async function withClient(db, database, fn) {
  const { Client } = loadPg();
  const client = new Client({
    host: db.host,
    port: Number(db.port),
    user: db.user,
    password: db.password,
    database,
    connectionTimeoutMillis: 8000,
  });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end().catch(() => {});
  }
}

async function databaseExists(db) {
  return withClient(db, 'postgres', async (c) => {
    const r = await c.query('SELECT 1 FROM pg_database WHERE datname = $1', [db.database]);
    return r.rowCount > 0;
  });
}

async function createDatabaseIfMissing(db) {
  if (await databaseExists(db)) return false;
  await withClient(db, 'postgres', (c) => c.query(`CREATE DATABASE "${db.database}"`));
  log(`Created database ${db.database}`);
  return true;
}

// Applies bundled schema/migration scripts. Returns true when this call changed the schema.
//
// sql/full-schema.sql is only for empty databases. Existing databases receive the
// versioned files in sql/migrations in filename order. Each applied file is
// recorded with a SHA-256 checksum so silent drift or tampering is detected.
function sha256File(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function compareVersions(a, b) {
  const pa = String(a).split('.').map((n) => parseInt(n, 10) || 0);
  const pb = String(b).split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) - (pb[i] || 0);
  }
  return 0;
}

function readSqlManifest() {
  try {
    return JSON.parse(fs.readFileSync(path.join(getBackendDir(), 'sql', 'manifest.json'), 'utf8'));
  } catch {
    return null;
  }
}

// Best effort pre-upgrade snapshot. PostgreSQL client tools are not bundled, so
// a missing pg_dump is reported and the upgrade continues; an installed but
// failing pg_dump aborts the upgrade rather than risk data loss.
function preUpgradeSnapshot(db) {
  return new Promise((resolve) => {
    const dir = path.join(getDataDir(), 'backups', 'pre-upgrade');
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `pre-upgrade-${new Date().toISOString().replace(/[:.]/g, '-')}.backup`);
    const pgDump = process.env.PG_DUMP_PATH || 'pg_dump';
    const child = spawn(pgDump, [
      '-h', db.host, '-p', String(db.port), '-U', db.user, '-d', db.database,
      '-f', file, '--format=custom', '--no-owner', '--no-privileges',
    ], { env: { ...process.env, PGPASSWORD: db.password || '' }, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', (b) => { stderr += b.toString(); });
    child.on('error', (e) => resolve({ ok: false, unavailable: e.code === 'ENOENT', error: e.message }));
    child.on('close', (code) => resolve(
      code === 0 ? { ok: true, file } : { ok: false, error: stderr.trim() || `pg_dump exited with code ${code}` },
    ));
  });
}

async function applyMigrations(db, onProgress) {
  const sqlDir = path.join(getBackendDir(), 'sql');
  if (!fs.existsSync(sqlDir)) throw new Error(`Database scripts not found at ${sqlDir}. The installer is incomplete.`);

  const fullSchemaPath = path.join(sqlDir, 'full-schema.sql');
  if (!fs.existsSync(fullSchemaPath)) throw new Error('sql/full-schema.sql is missing. The installer is incomplete.');

  const migrationsDir = path.join(sqlDir, 'migrations');
  const files = fs.existsSync(migrationsDir)
    ? fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort()
    : [];
  const manifest = readSqlManifest();
  const fullSchemaSql = fs.readFileSync(fullSchemaPath, 'utf8');

  return withClient(db, db.database, async (c) => {
    await c.query('CREATE TABLE IF NOT EXISTS _veridian_migrations (name text PRIMARY KEY, checksum text, applied_at timestamptz NOT NULL DEFAULT now())');
    await c.query('ALTER TABLE _veridian_migrations ADD COLUMN IF NOT EXISTS checksum text');
    await c.query('CREATE TABLE IF NOT EXISTS _veridian_meta (key text PRIMARY KEY, value text NOT NULL)');

    const recorded = new Map(
      (await c.query('SELECT name, checksum FROM _veridian_migrations')).rows.map((r) => [r.name, r.checksum]),
    );
    const hasUserTable = !!(await c.query(`SELECT to_regclass('"User"') AS t`)).rows[0].t;
    const isFresh = !hasUserTable && recorded.size === 0;
    let changed = false;

    const markApplied = async (name, checksum) => {
      await c.query(
        'INSERT INTO _veridian_migrations (name, checksum) VALUES ($1, $2) ON CONFLICT (name) DO UPDATE SET checksum = EXCLUDED.checksum',
        [name, checksum],
      );
      recorded.set(name, checksum);
    };

    const setSchemaVersion = async (version) => {
      await c.query(
        "INSERT INTO _veridian_meta (key, value) VALUES ('schema_version', $1) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value",
        [version],
      );
    };

    if (isFresh) {
      onProgress && onProgress('Creating the database schema...');
      try {
        await c.query('BEGIN');
        await c.query(fullSchemaSql);
        await c.query('INSERT INTO _veridian_migrations (name, checksum) VALUES ($1, $2)', ['full-schema.sql', sha256File(fullSchemaPath)]);
        await c.query('COMMIT');
      } catch (e) {
        await c.query('ROLLBACK').catch(() => {});
        throw new Error(`Creating the database schema failed: ${e.message}`);
      }
      recorded.set('full-schema.sql', sha256File(fullSchemaPath));
      // The full script already contains every migration; record them so they
      // are not replayed on the next start.
      for (const file of files) await markApplied(file, sha256File(path.join(migrationsDir, file)));
      if (manifest && manifest.version) await setSchemaVersion(manifest.version);
      log('Created database schema from full-schema.sql');
      return true;
    }

    const versionRow = await c.query("SELECT value FROM _veridian_meta WHERE key = 'schema_version'");
    const recordedVersion = (versionRow.rows[0] && versionRow.rows[0].value) || null;

    if (!recordedVersion) {
      // Created by the old single-script installer, or by `prisma db push`.
      // There is no version stamp, so the schema is only adopted after checking
      // that every table this release expects actually exists.
      const expectedTables = [...fullSchemaSql.matchAll(
        /CREATE TABLE (?:IF NOT EXISTS )?"?(?:public"?\.)?"?([A-Za-z_][A-Za-z0-9_]*)"?/g,
      )].map((m) => m[1]);

      if (expectedTables.length > 0) {
        const liveTables = new Set(
          (await c.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public'")).rows.map((r) => r.tablename),
        );
        const missing = expectedTables.filter((t) => !liveTables.has(t));
        if (missing.length > 0) {
          const shown = missing.slice(0, 5).join(', ') + (missing.length > 5 ? ', …' : '');
          throw new Error(
            `This database was created by an older Veridian HMS release and is missing ${missing.length} table(s) this version needs (${shown}). ` +
            'Install the release that created it first, or restore a database backup made by this version.',
          );
        }
      }

      if (files.some((f) => !recorded.has(f))) {
        throw new Error(
          'This database was created before schema version tracking and needs migrations whose starting point cannot be verified. ' +
          'Open this database once with the previous Veridian HMS release, then start this version again.',
        );
      }

      if (manifest && manifest.version) {
        await setSchemaVersion(manifest.version);
        log(`Adopted the existing database as schema version ${manifest.version}`);
      }
      return changed;
    }

    if (manifest && manifest.version && compareVersions(recordedVersion, manifest.version) > 0) {
      throw new Error(`The database schema (${recordedVersion}) is newer than this application (${manifest.version}). Install the newer application version instead of downgrading.`);
    }

    const pending = files.filter((f) => !recorded.has(f));
    if (pending.length > 0) {
      // Files are named NNNN_<from>_to_<to>.sql. If the first pending file does
      // not start at the recorded version, a release was skipped and applying
      // it could alter columns that do not exist yet.
      const firstStep = /^\d{4}_(.+)_to_(.+)\.sql$/.exec(pending[0]);
      if (firstStep && compareVersions(firstStep[1], recordedVersion) !== 0) {
        throw new Error(
          `This database is at schema version ${recordedVersion}, but the next migration starts from ${firstStep[1]}. ` +
          'Install the intermediate Veridian HMS release first so no schema step is skipped.',
        );
      }

      const snapshot = await preUpgradeSnapshot(db);
      if (snapshot.ok) log(`Pre-upgrade backup: ${snapshot.file}`);
      else if (snapshot.unavailable) log('WARNING: pg_dump was not found. Upgrading without a pre-upgrade backup; install PostgreSQL client tools or set PG_DUMP_PATH.');
      else throw new Error(`Pre-upgrade backup failed; upgrade aborted. ${snapshot.error}`);
    }

    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      const checksum = sha256File(filePath);
      if (recorded.has(file)) {
        const previousChecksum = recorded.get(file);
        if (previousChecksum && previousChecksum !== checksum) {
          throw new Error(`Migration ${file} changed after it was applied (checksum mismatch). Refusing to start with a drifted schema.`);
        }
        if (!previousChecksum) await markApplied(file, checksum);
        continue;
      }

      onProgress && onProgress(`Applying database migration (${file})...`);
      const sql = fs.readFileSync(filePath, 'utf8');
      try {
        await c.query('BEGIN');
        await c.query(sql);
        await c.query('INSERT INTO _veridian_migrations (name, checksum) VALUES ($1, $2)', [file, checksum]);
        await c.query('COMMIT');
      } catch (e) {
        await c.query('ROLLBACK').catch(() => {});
        throw new Error(`Applying ${file} failed: ${e.message}`);
      }
      recorded.set(file, checksum);
      changed = true;
      log(`Applied ${file}`);
    }

    if (manifest && manifest.version) await setSchemaVersion(manifest.version);

    return changed;
  });
}

async function userCount(db) {
  return withClient(db, db.database, async (c) => {
    const r = await c.query('SELECT count(*)::int AS n FROM "User"');
    return r.rows[0].n;
  });
}

function databaseUrl(db) {
  const enc = encodeURIComponent;
  return `postgresql://${enc(db.user)}:${enc(db.password || '')}@${db.host}:${db.port}/${db.database}?schema=public`;
}

// ==================== CHILD PROCESSES (Electron's own Node runtime) ====================
function backendEnv(db, extra) {
  return {
    ...process.env,
    ELECTRON_RUN_AS_NODE: '1', // run process.execPath as plain Node: PCs do not need Node.js installed
    NODE_ENV: 'production',
    ELECTRON: 'true',
    HOST: '127.0.0.1',
    PORT: String(activePort),
    DATABASE_URL: databaseUrl(db),
    JWT_SECRET: getOrCreateJwtSecret(),
    SEED_DATA_DIR: path.join(getBackendDir(), 'data'),
    ...extra,
  };
}

function runNodeScript(scriptName, env, { onLine } = {}) {
  return new Promise((resolve, reject) => {
    const script = path.join(getBackendDir(), scriptName);
    if (!fs.existsSync(script)) return reject(new Error(`${scriptName} not found at ${script}`));
    const child = spawn(process.execPath, [script], { cwd: getDataDir(), env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let tail = '';
    const feed = (buf, isErr) => {
      const text = buf.toString();
      tail = (tail + text).split('\n').slice(-15).join('\n');
      text.split('\n').filter(Boolean).forEach((l) => {
        log(`[${scriptName}${isErr ? ' ERR' : ''}] ${l}`);
        onLine && onLine(l);
      });
    };
    child.stdout.on('data', (b) => feed(b, false));
    child.stderr.on('data', (b) => feed(b, true));
    child.on('error', reject);
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`${scriptName} exited with code ${code}\n${tail.trim()}`))));
  });
}

function isPortFree(port) {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.once('error', () => resolve(false));
    srv.once('listening', () => srv.close(() => resolve(true)));
    srv.listen(port, '127.0.0.1');
  });
}
async function findFreePort(start) {
  for (let p = start; p < start + 20; p++) {
    if (await isPortFree(p)) return p;
  }
  throw new Error(`No free port found between ${start} and ${start + 19}.`);
}

function healthCheck(port) {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: '127.0.0.1', port, path: '/api/health', method: 'GET', timeout: 3000 }, (res) => {
      res.resume();
      res.statusCode >= 200 && res.statusCode < 400 ? resolve(true) : reject(new Error(`HTTP ${res.statusCode}`));
    });
    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.end();
  });
}

function stopBackend() {
  return new Promise((resolve) => {
    backendReady = false;
    if (!serverProcess) return resolve();
    const proc = serverProcess;
    serverProcess = null;
    const t = setTimeout(() => {
      try { proc.kill('SIGKILL'); } catch { /* already gone */ }
      resolve();
    }, 4000);
    proc.once('close', () => { clearTimeout(t); resolve(); });
    try { proc.kill(); } catch { clearTimeout(t); resolve(); }
  });
}

async function startBackend(cfg) {
  await stopBackend();
  activePort = await findFreePort(PREFERRED_PORT);
  if (activePort !== PREFERRED_PORT) log(`Port ${PREFERRED_PORT} is busy, using ${activePort}`);

  const script = path.join(getBackendDir(), 'server.mjs');
  if (!fs.existsSync(script)) throw new Error(`Backend not found at ${script}. The installer is incomplete.`);

  await new Promise((resolve, reject) => {
    let settled = false;
    let tail = '';
    const proc = spawn(process.execPath, [script], { cwd: getDataDir(), env: backendEnv(cfg.db), windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    serverProcess = proc;

    const feed = (buf, isErr) => {
      const text = buf.toString();
      tail = (tail + text).split('\n').slice(-15).join('\n');
      text.split('\n').filter(Boolean).forEach((l) => log(`[backend${isErr ? ' ERR' : ''}] ${l}`));
    };
    proc.stdout.on('data', (b) => feed(b, false));
    proc.stderr.on('data', (b) => feed(b, true));
    proc.on('error', (e) => { if (!settled) { settled = true; reject(e); } });
    proc.on('close', (code) => {
      log(`Backend exited with code ${code}`);
      const wasReady = backendReady;
      if (serverProcess === proc) serverProcess = null;
      backendReady = false;
      if (!settled) {
        settled = true;
        reject(new Error(`The backend stopped during start-up (exit code ${code}).\n\n${tail.trim() || 'No error output was captured.'}`));
      } else if (wasReady && !quitting && mainWindow) {
        showStatusPage('error', 'The Veridian HMS backend stopped unexpectedly.\n\n' + (tail.trim() || 'See the log for details.'));
      }
    });

    // poll the health endpoint instead of waiting for a fixed time (first start can be slow)
    const started = Date.now();
    const poll = async () => {
      if (settled) return;
      try {
        await healthCheck(activePort);
        settled = true;
        backendReady = true;
        resolve();
      } catch {
        if (Date.now() - started > HEALTH_TIMEOUT_MS) {
          settled = true;
          reject(new Error(`The backend did not become ready within ${HEALTH_TIMEOUT_MS / 1000} seconds.\n\n${tail.trim()}`));
          stopBackend();
        } else {
          setTimeout(poll, 500);
        }
      }
    };
    setTimeout(poll, 800);
  });
}

// ==================== SETUP WINDOW ====================
let setupResolver = null;

function openSetupWindow({ firstRun }) {
  return new Promise((resolve) => {
    if (setupWindow) { setupWindow.focus(); return resolve(false); }
    setupResolver = resolve;
    setupWindow = new BrowserWindow({
      width: 560,
      height: 720,
      resizable: false,
      minimizable: false,
      maximizable: false,
      parent: firstRun ? undefined : mainWindow || undefined,
      modal: !firstRun && !!mainWindow,
      title: `${APP_TITLE} - Database setup`,
      icon: getIconPath(),
      autoHideMenuBar: true,
      webPreferences: {
        preload: path.join(__dirname, 'setup-preload.cjs'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });
    setupWindow.setMenu(null);
    setupWindow.loadFile(path.join(__dirname, 'setup.html'), { query: { firstRun: firstRun ? '1' : '0' } });
    setupWindow.on('closed', () => {
      setupWindow = null;
      const r = setupResolver;
      setupResolver = null;
      if (r) r(false); // closed without saving
    });
  });
}

function finishSetup() {
  const r = setupResolver;
  setupResolver = null;
  if (setupWindow) { const w = setupWindow; setupWindow = null; w.destroy(); }
  if (r) r(true);
}

let setupBusy = false;

ipcMain.handle('setup:get', () => {
  const cfg = loadConfig();
  return {
    host: cfg?.db.host || 'localhost',
    port: cfg?.db.port || 5432,
    database: cfg?.db.database || 'veridian_hms',
    user: cfg?.db.user || 'postgres',
    hasPassword: !!cfg?.db.password,
    bootstrapDone: !!cfg?.bootstrapDone,
  };
});

ipcMain.handle('setup:test', async (_e, db) => {
  const bad = validateDbSettings(db);
  if (bad) return { ok: false, message: bad };
  try {
    const exists = await databaseExists(db);
    return { ok: true, message: exists ? 'Connected. The database already exists.' : `Connected. The database "${db.database}" will be created.` };
  } catch (e) {
    return { ok: false, message: friendlyPgError(e, db) };
  }
});

ipcMain.handle('setup:save', async (event, payload) => {
  if (setupBusy) return { ok: false, message: 'Setup is already running.' };
  setupBusy = true;
  const progress = (msg) => { try { event.sender.send('setup:progress', msg); } catch { /* window closed */ } };
  try {
    const previous = loadConfig();
    const db = { ...payload.db };
    // blank password while editing = keep the stored one
    if (!db.password && previous && previous.db.host === db.host && previous.db.user === db.user) db.password = previous.db.password;

    const bad = validateDbSettings(db);
    if (bad) return { ok: false, message: bad };

    progress('Connecting to PostgreSQL...');
    await createDatabaseIfMissing(db);
    const applied = await applyMigrations(db, progress);
    const users = await userCount(db);

    let bootstrapDone = users > 0 || (previous && previous.bootstrapDone && sameDb(previous.db, db));
    if (!bootstrapDone) {
      const adminPassword = payload.adminPassword || '';
      if (adminPassword.length < 8) {
        return { ok: false, message: 'This is a new database. Choose an administrator password of at least 8 characters.' };
      }
      progress('Loading hospital reference data (diagnoses, tariffs, services, stock). This takes about a minute...');
      await runNodeScript('bootstrap.mjs', backendEnv(db, { INITIAL_ADMIN_PASSWORD: adminPassword }), { onLine: (l) => l.startsWith('BOOTSTRAP') && progress(l.replace(/^BOOTSTRAP:?\s*/, '')) });
      bootstrapDone = true;
    }

    saveConfig({ db, bootstrapDone });
    log(`Database settings saved (${db.host}:${db.port}/${db.database}), migrations applied: ${applied}`);
    progress('Done.');
    setImmediate(finishSetup);
    return { ok: true };
  } catch (e) {
    log('Setup failed:', e.stack || e.message);
    return { ok: false, message: friendlyPgError(e, payload.db || {}) };
  } finally {
    setupBusy = false;
  }
});

function sameDb(a, b) {
  return a.host === b.host && Number(a.port) === Number(b.port) && a.database === b.database;
}

// ==================== STARTUP FLOW ====================
async function startApplication() {
  if (starting) return;
  starting = true;
  try {
    showStatusPage('starting', 'Starting Veridian HMS...');

    let cfg = loadConfig();
    if (!cfg || !cfg.bootstrapDone) {
      const saved = await openSetupWindow({ firstRun: true });
      if (!saved) {
        // closed without finishing setup on a brand-new install: nothing to run
        if (!loadConfig()) { app.quit(); return; }
      }
      cfg = loadConfig();
      if (!cfg) { app.quit(); return; }
    }

    showStatusPage('starting', 'Checking the database...');
    try {
      await createDatabaseIfMissing(cfg.db);
      await applyMigrations(cfg.db, (m) => showStatusPage('starting', m));
    } catch (e) {
      throw new Error(friendlyPgError(e, cfg.db));
    }

    showStatusPage('starting', 'Starting the Veridian HMS server...');
    await startBackend(cfg);

    log(`Backend ready on port ${activePort}`);
    await mainWindow.loadURL(`http://127.0.0.1:${activePort}`);
    mainWindow.webContents.send('backend-ready');
  } catch (e) {
    log('Startup failed:', e.stack || e.message);
    showStatusPage('error', e.message || String(e));
  } finally {
    starting = false;
  }
}

function showStatusPage(state, message) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.loadFile(path.join(__dirname, 'status.html'), { query: { state, msg: message || '' } }).catch((e) => log('Could not show status page:', e.message));
}

// ==================== WINDOW & MENU ====================
function getIconPath() {
  const base = path.join(__dirname, 'build');
  if (process.platform === 'win32') return path.join(base, 'icon.ico');
  return path.join(base, 'icon.png');
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    title: APP_TITLE,
    icon: getIconPath(),
    show: false,
    backgroundColor: '#f5f5f5',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true,
      devTools: !app.isPackaged,
      allowRunningInsecureContent: false,
    },
  });

  createMenu();

  // The renderer never needs a camera, microphone, geolocation or MIDI. Only
  // desktop notifications and clipboard access are allowed; everything else is
  // denied so a compromised page cannot ask the operating system for devices.
  const ALLOWED_PERMISSIONS = new Set([
    'notifications',
    'clipboard-read',
    'clipboard-sanitized-write',
  ]);
  const session = mainWindow.webContents.session;
  session.setPermissionRequestHandler((_contents, permission, callback) => {
    callback(ALLOWED_PERMISSIONS.has(permission));
  });
  session.setPermissionCheckHandler((_contents, permission) => ALLOWED_PERMISSIONS.has(permission));

  mainWindow.webContents.on('will-attach-webview', (event) => {
    event.preventDefault();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) {
      shell.openExternal(url);
    }
    // Never let a page open a second Electron window with its own preferences.
    return { action: 'deny' };
  });
  // Never let the app window navigate away to an arbitrary site. Compare full
  // origins so look-alike hosts such as 127.0.0.1:5000.example.com are rejected.
  mainWindow.webContents.on('will-navigate', (event, url) => {
    let origin;
    try {
      origin = new URL(url).origin;
    } catch {
      event.preventDefault();
      return;
    }
    const allowed = origin === `http://127.0.0.1:${activePort}` || origin === 'http://localhost:3000';
    if (!allowed) {
      event.preventDefault();
      if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    }
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });
  mainWindow.on('closed', () => { mainWindow = null; });

  // ---- Self-recovery: a frozen page used to need a full quit + restart ----
  const wc = mainWindow.webContents;
  const isAppUrl = (u) => typeof u === 'string' && (u.startsWith(`http://127.0.0.1:${activePort}`) || u.startsWith('http://localhost:3000'));

  // F5 / Ctrl+F5 / Ctrl+Shift+R reload even if the menu is hidden
  wc.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return;
    const key = input.key.toLowerCase();
    if (key === 'f5' || (key === 'r' && (input.control || input.meta) && input.shift)) {
      event.preventDefault();
      input.control || input.shift ? wc.reloadIgnoringCache() : wc.reload();
    }
  });

  // The page process hung: wait a little, then kill and reload it instead of leaving a dead window
  let hangTimer = null;
  wc.on('unresponsive', () => {
    log('Window is unresponsive');
    clearTimeout(hangTimer);
    hangTimer = setTimeout(() => {
      log('Window still unresponsive after 15s: restarting its page process');
      try { wc.forcefullyCrashRenderer(); } catch (e) { log('forcefullyCrashRenderer failed:', e.message); }
    }, 15_000);
  });
  wc.on('responsive', () => { clearTimeout(hangTimer); });

  // The page process crashed or was killed (out of memory etc.): reload the app page
  wc.on('render-process-gone', (_e, details) => {
    clearTimeout(hangTimer);
    log(`Page process gone (${details.reason}, exit ${details.exitCode})`);
    if (quitting || !mainWindow || mainWindow.isDestroyed()) return;
    if (backendReady) setTimeout(() => { if (mainWindow && !mainWindow.isDestroyed()) mainWindow.loadURL(`http://127.0.0.1:${activePort}`).catch(() => {}); }, 500);
    else showStatusPage('error', 'The page stopped working and the server is not running.');
  });

  // The app page failed to load (backend busy or briefly unreachable): retry instead of staying blank
  let loadRetries = 0;
  wc.on('did-fail-load', (_e, code, desc, url, isMainFrame) => {
    if (!isMainFrame || code === -3 /* aborted: a newer navigation replaced it */ || !isAppUrl(url)) return;
    log(`Page failed to load (${code} ${desc})`);
    if (quitting || !mainWindow || mainWindow.isDestroyed()) return;
    if (loadRetries++ < 5) setTimeout(() => { if (mainWindow && !mainWindow.isDestroyed()) mainWindow.loadURL(url).catch(() => {}); }, 1500 * loadRetries);
    else showStatusPage('error', 'The page could not be loaded from the server.\n\nUse File > Restart server.');
  });
  wc.on('did-finish-load', () => { if (isAppUrl(wc.getURL())) loadRetries = 0; });
}

function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        { label: 'Database settings...', enabled: app.isPackaged, click: () => changeDatabaseSettings() },
        { label: 'Restart server', enabled: app.isPackaged, click: () => restartAll() },
        { type: 'separator' },
        { label: 'Open log folder', click: () => shell.openPath(app.getPath('logs')) },
        { type: 'separator' },
        { label: 'Exit', accelerator: 'CmdOrCtrl+Q', click: () => app.quit() },
      ],
    },
    { label: 'Edit', submenu: [{ role: 'undo' }, { role: 'redo' }, { type: 'separator' }, { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }] },
    {
      label: 'View',
      submenu: [
        { role: 'reload' }, { role: 'forceReload' }, { type: 'separator' },
        { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }, { type: 'separator' },
        { role: 'togglefullscreen' },
        ...(app.isPackaged ? [] : [{ type: 'separator' }, { role: 'toggleDevTools' }]),
      ],
    },
    { label: 'Window', submenu: [{ role: 'minimize' }, { role: 'close' }] },
    {
      label: 'Help',
      submenu: [
        {
          label: `About ${APP_TITLE}`,
          click: () => {
            const info = getDatabaseInfo();
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: `About ${APP_TITLE}`,
              message: 'Veridian Hospital Management System',
              detail: `Version ${app.getVersion()}\nDeveloped by Emmanuel Appiah\n\nDatabase: ${info.user}@${info.host}:${info.port}/${info.database}\nStatus: ${info.status}`,
              buttons: ['OK'],
            });
          },
        },
        { label: 'Report an issue', click: () => shell.openExternal('mailto:emk.appiah@gmail.com?subject=Veridian%20HMS%20issue') },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

async function changeDatabaseSettings() {
  const saved = await openSetupWindow({ firstRun: false });
  if (saved) restartAll();
}

async function restartAll() {
  await stopBackend();
  startApplication();
}

function getDatabaseInfo() {
  const cfg = loadConfig();
  if (!cfg) return { host: '-', port: '-', database: '-', user: '-', status: app.isPackaged ? 'Not configured' : 'Development mode (uses backend/.env)' };
  return { host: cfg.db.host, port: cfg.db.port, database: cfg.db.database, user: cfg.db.user, status: backendReady ? 'Connected' : 'Not running' };
}

// ==================== SINGLE INSTANCE ====================
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  // ==================== APP LIFECYCLE ====================
  app.whenReady().then(async () => {
    initLog();
    log(`=== ${APP_TITLE} ${app.getVersion()} starting ===`);
    log('Packaged:', app.isPackaged, '| Platform:', process.platform, os.release(), '| Electron:', process.versions.electron);
    log('User data:', app.getPath('userData'));

    createWindow();

    if (app.isPackaged) {
      startApplication();
    } else {
      log('Development mode: expecting Vite on http://localhost:3000 and the backend on http://localhost:5000');
      mainWindow.loadURL('http://localhost:3000').catch(() => {
        showStatusPage('error', 'The development server is not running.\n\nStart it with: npm start');
      });
    }
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });

  app.on('before-quit', () => {
    quitting = true;
    if (serverProcess) {
      try { serverProcess.kill(); } catch { /* already gone */ }
    }
  });

  app.on('activate', () => {
    if (mainWindow === null && app.isReady()) {
      createWindow();
      app.isPackaged ? startApplication() : mainWindow.loadURL('http://localhost:3000').catch(() => {});
    }
  });
}

// ==================== IPC ====================
ipcMain.handle('get-app-version', () => app.getVersion());
ipcMain.handle('get-db-path', () => getDataDir());
ipcMain.handle('get-backend-status', () => (serverProcess && backendReady ? 'running' : 'stopped'));
ipcMain.handle('get-db-info', () => getDatabaseInfo());
ipcMain.handle('restart-backend', async () => {
  try {
    await restartAll();
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
});
ipcMain.handle('app:retry', () => restartAll());
ipcMain.handle('app:open-settings', () => changeDatabaseSettings());
ipcMain.handle('app:open-logs', () => shell.openPath(app.getPath('logs')));

// ==================== SAFETY NETS ====================
process.on('uncaughtException', (error) => {
  log('Uncaught exception:', error.stack || String(error));
  if (app.isPackaged && mainWindow) dialog.showErrorBox('Application error', error.toString());
});
process.on('unhandledRejection', (reason) => {
  log('Unhandled rejection:', reason && reason.stack ? reason.stack : String(reason));
});
