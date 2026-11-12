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

const { app, BrowserWindow, ipcMain, dialog, Menu, Tray, nativeImage, shell, safeStorage } = require('electron');
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

// ==================== APP ROLE (fixed when the installer is built) ====================
// build/app-mode.json is written by build-win.js. Three installers come from this one codebase:
//   standalone - one PC runs everything (the original behaviour; default when the file is missing)
//   server     - the hospital server: runs the API and the database link (and the scheduled jobs), keeps
//                running in the tray when its window is closed, and always accepts other PCs
//   client     - a workstation: only a window onto the server. It never starts a backend, never touches
//                PostgreSQL and never runs scheduled jobs, so any number of clients can be installed safely.
function readAppMode() {
  try {
    const m = JSON.parse(fs.readFileSync(path.join(__dirname, 'build', 'app-mode.json'), 'utf8')).mode;
    return ['standalone', 'server', 'client'].includes(m) ? m : 'standalone';
  } catch {
    return 'standalone';
  }
}
const APP_MODE = readAppMode();
const IS_CLIENT = APP_MODE === 'client';
const IS_SERVER = APP_MODE === 'server';
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
// ==================== CLIENT: which server to connect to ====================
function readRawConfig() {
  try { return JSON.parse(fs.readFileSync(getConfigPath(), 'utf8')) || {}; } catch { return {}; }
}
function getClientServerUrl() {
  const u = readRawConfig().client && readRawConfig().client.serverUrl;
  return typeof u === 'string' ? u : '';
}
function saveClientServerUrl(serverUrl) {
  const raw = readRawConfig();
  raw.client = { serverUrl };
  fs.mkdirSync(path.dirname(getConfigPath()), { recursive: true });
  fs.writeFileSync(getConfigPath(), JSON.stringify(raw, null, 2), { mode: 0o600 });
}
// "192.168.1.10" -> http://192.168.1.10:5000 ; keeps only protocol + host + port.
function normalizeServerUrl(input) {
  const text = String(input || '').trim();
  if (!text) throw new Error('Enter the address of the Veridian HMS server.');
  const hadScheme = /^https?:\/\//i.test(text);
  let u;
  try { u = new URL(hadScheme ? text : `http://${text}`); } catch { throw new Error('That is not a valid server address. Example: 192.168.1.10:5000'); }
  if (!u.hostname) throw new Error('That is not a valid server address. Example: 192.168.1.10:5000');
  if (!hadScheme && !u.port) u.port = String(PREFERRED_PORT);
  return u.origin;
}
// The origin the main window is allowed to show: this PC's own backend, or the chosen server (client).
function appOrigin() {
  try { return new URL(IS_CLIENT ? getClientServerUrl() : `http://127.0.0.1:${activePort}`).origin; } catch { return ''; }
}
function isAppUrl(u) {
  if (typeof u !== 'string') return false;
  const o = appOrigin();
  return (!!o && (u === o || u.startsWith(o + '/'))) || u.startsWith('http://localhost:3000');
}
function probeServer(serverUrl) {
  return new Promise((resolve, reject) => {
    let u;
    try { u = new URL('/api/health', serverUrl); } catch (e) { return reject(e); }
    const lib = u.protocol === 'https:' ? require('https') : http;
    const req = lib.request({ hostname: u.hostname, port: u.port || (u.protocol === 'https:' ? 443 : 80), path: u.pathname, method: 'GET', timeout: 4000 }, (res) => {
      res.resume();
      res.statusCode >= 200 && res.statusCode < 400 ? resolve(true) : reject(new Error(`The server answered with HTTP ${res.statusCode}.`));
    });
    req.on('error', (e) => reject(new Error(`Could not reach ${serverUrl} (${e.code || e.message}). Check the address, that the server PC is on and running Veridian HMS Server, and that its firewall allows the port.`)));
    req.on('timeout', () => req.destroy(Object.assign(new Error('timeout'), { code: 'timeout' })));
    req.end();
  });
}

// ==================== NETWORK (optional access from other PCs) ====================
// Default: the app only listens on this PC (127.0.0.1). With `lan` on, it listens on every network
// adapter so other PCs can open http://<this PC's address>:<port> in a browser. The database stays
// private to this PC either way - other PCs only ever talk to the app, never to PostgreSQL.
function normalizeNetwork(n) {
  const port = Number(n && n.port);
  return { lan: IS_SERVER || !!(n && n.lan), port: Number.isInteger(port) && port >= 1024 && port <= 65535 ? port : PREFERRED_PORT };
}
function lanAddresses() {
  const out = [];
  for (const list of Object.values(os.networkInterfaces())) {
    for (const i of list || []) {
      if (i.family === 'IPv4' && !i.internal && !i.address.startsWith('169.254.')) out.push(i.address);
    }
  }
  return out;
}
// Windows blocks inbound connections until a firewall rule exists. Adding one needs administrator
// rights, so Windows shows its own UAC prompt; declining it is not fatal (the setup screen says so).
function ensureFirewallRule(port) {
  if (process.platform !== 'win32') return Promise.resolve({ ok: true, skipped: true });
  const inner = `/c netsh advfirewall firewall delete rule name=VeridianHMS & netsh advfirewall firewall add rule name=VeridianHMS dir=in action=allow protocol=TCP localport=${Number(port)} profile=private,domain`;
  const ps = `Start-Process -FilePath cmd.exe -Verb RunAs -WindowStyle Hidden -Wait -ArgumentList '${inner}'`;
  return new Promise((resolve) => {
    const child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', ps], { windowsHide: true, stdio: 'ignore' });
    child.on('error', () => resolve({ ok: false }));
    child.on('close', (code) => resolve({ ok: code === 0 }));
  });
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
      network: normalizeNetwork(raw.network),
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
    network: normalizeNetwork(cfg.network),
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

// Erases everything in the configured database so it can be rebuilt from scratch (applyMigrations then
// sees a fresh database). The caller must have stopped the backend first.
//
// Two ways, chosen BEFORE anything is destroyed so a missing privilege can never leave the PC with nothing:
//   1. drop and re-create the database (cleanest; needs the CREATEDB right to be able to re-create it)
//   2. empty the public schema inside ONE transaction, so if re-creating it is refused, nothing is lost
// A thrown error has `dataLost = true` only when the old data is already gone.
async function wipeDatabase(db) {
  if (!db.database || !IDENT.test(db.database)) throw new Error('Refusing to erase a database with an unusual name.');

  const canRecreate = await withClient(db, 'postgres', async (c) => {
    const r = await c.query('SELECT (rolsuper OR rolcreatedb) AS ok FROM pg_roles WHERE rolname = current_user');
    return !!(r.rows[0] && r.rows[0].ok);
  });

  if (canRecreate) {
    let dropped = false;
    try {
      await withClient(db, 'postgres', (c) => c.query(`DROP DATABASE IF EXISTS "${db.database}" WITH (FORCE)`));
      dropped = true;
    } catch (e) {
      if (e.code !== '42501') throw e; // not the owner: nothing was dropped, use the schema route
      log(`Not allowed to drop database ${db.database}; emptying its public schema instead.`);
    }
    if (dropped) {
      try {
        await createDatabaseIfMissing(db);
      } catch (e) {
        e.dataLost = true;
        throw e;
      }
      return 'recreated';
    }
  }

  try {
    await withClient(db, db.database, async (c) => {
      await c.query('BEGIN');
      try {
        await c.query('DROP SCHEMA IF EXISTS public CASCADE');
        await c.query('CREATE SCHEMA public');
        await c.query('COMMIT');
      } catch (e) {
        await c.query('ROLLBACK').catch(() => {});
        throw e;
      }
    });
  } catch (e) {
    if (e.code === '42501') {
      throw new Error(`The database user "${db.user}" is not allowed to erase this database (it needs the CREATEDB right, or to own the public schema and have CREATE on the database). Nothing was erased.`);
    }
    throw e;
  }
  return 'schema-emptied';
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

// Best effort pg_dump snapshot. PostgreSQL client tools are not bundled, so
// a missing pg_dump is reported and the caller decides whether to continue; an installed but
// failing pg_dump is reported as an error so the caller can stop rather than risk data loss.
// `label` names the folder and file: 'pre-upgrade' (schema upgrades) or 'pre-reset' (database reset).
function dumpDatabase(db, label) {
  return new Promise((resolve) => {
    const dir = path.join(getDataDir(), 'backups', label);
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `${label}-${new Date().toISOString().replace(/[:.]/g, '-')}.backup`);
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
const preUpgradeSnapshot = (db) => dumpDatabase(db, 'pre-upgrade');

// True when pg_dump can be started, so the reset window can say up front whether a backup is possible.
function pgDumpAvailable() {
  return new Promise((resolve) => {
    const child = spawn(process.env.PG_DUMP_PATH || 'pg_dump', ['--version'], { windowsHide: true, stdio: 'ignore' });
    child.on('error', () => resolve(false));
    child.on('close', (code) => resolve(code === 0));
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
  const net = normalizeNetwork((loadConfig() || {}).network);
  const lanOrigins = net.lan ? lanAddresses().map((ip) => `http://${ip}:${activePort}`) : [];
  return {
    ...process.env,
    ELECTRON_RUN_AS_NODE: '1', // run process.execPath as plain Node: PCs do not need Node.js installed
    NODE_ENV: 'production',
    ELECTRON: 'true',
    HOST: net.lan ? '0.0.0.0' : '127.0.0.1',
    CORS_ALLOWED_ORIGINS: [process.env.CORS_ALLOWED_ORIGINS, ...lanOrigins].filter(Boolean).join(','),
    PORT: String(activePort),
    DATABASE_URL: databaseUrl(db),
    JWT_SECRET: getOrCreateJwtSecret(),
    SEED_DATA_DIR: path.join(getBackendDir(), 'data'),
    // Production must never write demo data or advertise demo logins, even if these happen to be set
    // in the PC's own environment (process.env is inherited above).
    RUN_SEED: 'false',
    ENABLE_SEEDING: 'false',
    SHOW_DEV_CREDENTIALS: 'false',
    ...extra,
  };
}

function runNodeScript(scriptName, env, { onLine } = {}) {
  return runNode(path.join(getBackendDir(), scriptName), [], { cwd: getDataDir(), env, onLine, label: scriptName });
}

function bindHost() {
  return normalizeNetwork((loadConfig() || {}).network).lan ? '0.0.0.0' : '127.0.0.1';
}
function isPortFree(port) {
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.once('error', () => resolve(false));
    srv.once('listening', () => srv.close(() => resolve(true)));
    srv.listen(port, bindHost());
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
  const wantedPort = normalizeNetwork((loadConfig() || {}).network).port;
  activePort = await findFreePort(wantedPort);
  if (activePort !== wantedPort) {
    // Other PCs are told one fixed address, so the server must not quietly move to another port.
    if (IS_SERVER) throw new Error(`Port ${wantedPort} is already used by another program. Other PCs connect to this port, so the server will not use a different one. Close the other program, or choose another port in Database settings.`);
    log(`Port ${wantedPort} is busy, using ${activePort}`);
  }

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

function openSetupWindow({ firstRun, client = false }) {
  return new Promise((resolve) => {
    if (setupWindow) { setupWindow.focus(); return resolve(false); }
    setupResolver = resolve;
    setupWindow = new BrowserWindow({
      width: 560,
      height: client ? 360 : 780,
      resizable: false,
      minimizable: false,
      maximizable: false,
      parent: firstRun ? undefined : mainWindow || undefined,
      modal: !firstRun && !!mainWindow,
      title: client ? `${APP_TITLE} - Server address` : `${APP_TITLE} - Database setup`,
      icon: getIconPath(),
      autoHideMenuBar: true,
      webPreferences: {
        preload: path.join(__dirname, client ? 'client-setup-preload.cjs' : 'setup-preload.cjs'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });
    setupWindow.setMenu(null);
    setupWindow.loadFile(path.join(__dirname, client ? 'client-setup.html' : 'setup.html'), { query: { firstRun: firstRun ? '1' : '0' } });
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
    lan: !!(cfg && cfg.network.lan),
    appPort: cfg ? cfg.network.port : PREFERRED_PORT,
    addresses: lanAddresses(),
    mode: APP_MODE,
  };
});

// ---- client: choose the server ----
ipcMain.handle('client:get', () => ({ serverUrl: getClientServerUrl() }));
ipcMain.handle('client:test', async (_e, input) => {
  try {
    const url = normalizeServerUrl(input);
    await probeServer(url);
    return { ok: true, message: `Connected to ${url}.` };
  } catch (e) {
    return { ok: false, message: e.message };
  }
});
ipcMain.handle('client:save', async (_e, input) => {
  try {
    const url = normalizeServerUrl(input);
    saveClientServerUrl(url); // saved even if the server is down right now, so it can be started later
    log(`Client will connect to ${url}`);
    setImmediate(finishSetup);
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e.message };
  }
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

    const network = normalizeNetwork(payload.network || (previous && previous.network));
    if (payload.network && Number(payload.network.port) !== network.port) {
      return { ok: false, message: 'The app port must be a number between 1024 and 65535.' };
    }

    progress('Connecting to PostgreSQL...');
    await createDatabaseIfMissing(db);
    const applied = await applyMigrations(db, progress);
    const users = await userCount(db);

    // "users exist" is not proof that setup finished: an interrupted first run leaves users behind with
    // the reference data half loaded. Only a recorded, completed bootstrap for this same database skips
    // it; otherwise bootstrap.mjs runs and decides (it is a no-op on a complete database).
    let bootstrapDone = !!(previous && previous.bootstrapDone && sameDb(previous.db, db));
    if (!bootstrapDone) {
      const adminPassword = payload.adminPassword || '';
      if (users === 0 && adminPassword.length < 8) {
        return { ok: false, message: 'This is a new database. Choose an administrator password of at least 8 characters.' };
      }
      progress('Loading hospital reference data (diagnoses, tariffs, services, stock). This takes about a minute...');
      await runNodeScript('bootstrap.mjs', backendEnv(db, { INITIAL_ADMIN_PASSWORD: adminPassword }), { onLine: (l) => l.startsWith('BOOTSTRAP') && progress(l.replace(/^BOOTSTRAP:?\s*/, '')) });
      bootstrapDone = true;
    }

    saveConfig({ db, bootstrapDone, network });
    let firewallNote = '';
    if (network.lan) {
      progress('Allowing other PCs through the Windows firewall (approve the Windows prompt)...');
      const fw = await ensureFirewallRule(network.port);
      if (!fw.ok) {
        firewallNote = 'The firewall rule was not added, so Windows may block other PCs. Re-save and approve the prompt, or allow TCP port ' + network.port + ' in Windows Firewall.';
        log('Firewall rule not added:', firewallNote);
      }
    }
    log(`Network access: ${network.lan ? `other PCs allowed on port ${network.port}` : 'this PC only'}`);
    log(`Database settings saved (${db.host}:${db.port}/${db.database}), migrations applied: ${applied}`);
    progress(firewallNote || 'Done.');
    setImmediate(finishSetup);
    return { ok: true, note: firewallNote };
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
async function startClient() {
  let url = getClientServerUrl();
  if (!url) {
    await openSetupWindow({ firstRun: true, client: true });
    url = getClientServerUrl();
    if (!url) { app.quit(); return; }
  }
  showStatusPage('starting', `Connecting to the Veridian HMS server (${url})...`);
  try {
    await probeServer(url);
  } catch (e) {
    log('Server not reachable:', e.message);
    showStatusPage('error', e.message);
    return;
  }
  log(`Connected to ${url}`);
  await mainWindow.loadURL(url);
}

async function startApplication() {
  if (starting) return;
  starting = true;
  try {
    showStatusPage('starting', 'Starting Veridian HMS...');
    if (IS_CLIENT) { await startClient(); return; }

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
  mainWindow.loadFile(path.join(__dirname, 'status.html'), { query: { state, msg: message || '', mode: APP_MODE } }).catch((e) => log('Could not show status page:', e.message));
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

  // Print previews, receipts and PDFs open as pop-up windows (window.open('') + document.write, or a blob:
  // URL). They must be allowed or nothing can be printed. They are the app's own pages only, with the same
  // locked-down preferences as the main window (no Node, no preload, sandboxed). Anything else on the
  // internet opens in the user's normal browser instead.
  const isOwnPopupUrl = (u) =>
    !u || u === 'about:blank' || u.startsWith(`blob:${appOrigin()}/`) || u.startsWith('blob:http://localhost:3000/') || isAppUrl(u);
  const handlePopup = ({ url }) => {
    if (isOwnPopupUrl(url)) {
      return {
        action: 'allow',
        overrideBrowserWindowOptions: {
          width: 900,
          height: 700,
          autoHideMenuBar: true,
          icon: getIconPath(),
          webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true, webSecurity: true, devTools: !app.isPackaged },
        },
      };
    }
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  };
  const guardNavigation = (event, url) => {
    if (isOwnPopupUrl(url)) return;
    event.preventDefault();
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
  };
  mainWindow.webContents.setWindowOpenHandler(handlePopup);
  mainWindow.webContents.on('did-create-window', (child) => {
    child.setMenuBarVisibility(false);
    child.webContents.setWindowOpenHandler(handlePopup);
    child.webContents.on('will-navigate', guardNavigation);
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
    const allowed = origin === appOrigin() || origin === 'http://localhost:3000';
    if (!allowed) {
      event.preventDefault();
      if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    }
  });

  mainWindow.once('ready-to-show', () => {
    // The server starts with Windows (minimised to the tray); everything else opens normally.
    if (IS_SERVER && process.argv.includes('--hidden')) return;
    mainWindow.show();
    mainWindow.focus();
  });
  // Closing the server's window must not stop the server for every other PC: hide it to the tray instead.
  mainWindow.on('close', (event) => {
    if (IS_SERVER && !quitting) { event.preventDefault(); mainWindow.hide(); }
  });
  mainWindow.on('closed', () => { mainWindow = null; });

  // ---- Self-recovery: a frozen page used to need a full quit + restart ----
  const wc = mainWindow.webContents;

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
    if (backendReady || IS_CLIENT) setTimeout(() => { if (mainWindow && !mainWindow.isDestroyed()) mainWindow.loadURL(IS_CLIENT ? getClientServerUrl() : `http://127.0.0.1:${activePort}`).catch(() => {}); }, 500);
    else showStatusPage('error', 'The page stopped working and the server is not running.');
  });

  // The app page failed to load (backend busy or briefly unreachable): retry instead of staying blank
  let loadRetries = 0;
  wc.on('did-fail-load', (_e, code, desc, url, isMainFrame) => {
    if (!isMainFrame || code === -3 /* aborted: a newer navigation replaced it */ || !isAppUrl(url)) return;
    log(`Page failed to load (${code} ${desc})`);
    if (quitting || !mainWindow || mainWindow.isDestroyed()) return;
    if (loadRetries++ < 5) setTimeout(() => { if (mainWindow && !mainWindow.isDestroyed()) mainWindow.loadURL(url).catch(() => {}); }, 1500 * loadRetries);
    else showStatusPage('error', IS_CLIENT ? 'The page could not be loaded from the server. Check that the server PC is on and running Veridian HMS Server.' : 'The page could not be loaded from the server.\n\nUse File > Restart server.');
  });
  wc.on('did-finish-load', () => { if (isAppUrl(wc.getURL())) loadRetries = 0; });
}

function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        ...(IS_CLIENT
          ? [
              { label: 'Server address...', click: () => changeDatabaseSettings() },
              { label: 'Reconnect', click: () => restartAll() },
            ]
          : [
              { label: 'Database settings...', enabled: app.isPackaged, click: () => changeDatabaseSettings() },
              { label: 'Restart server', click: () => restartAll() },
              { type: 'separator' },
              { label: 'Reset database...', click: () => resetDatabase() },
            ]),
        { type: 'separator' },
        { label: 'Open log folder', click: () => shell.openPath(app.getPath('logs')) },
        { type: 'separator' },
        { label: IS_SERVER ? 'Quit server' : 'Exit', accelerator: 'CmdOrCtrl+Q', click: () => quitApp() },
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
            const where = IS_CLIENT
              ? `Server: ${getClientServerUrl() || 'not set'}`
              : `Database: ${info.user}@${info.host}:${info.port}/${info.database}\nStatus: ${info.status}`;
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: `About ${APP_TITLE}`,
              message: 'Veridian Hospital Management System',
              detail: `Version ${app.getVersion()} (${APP_MODE})\nDeveloped by Emmanuel Appiah\n\n${where}`,
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
  const saved = await openSetupWindow({ firstRun: false, client: IS_CLIENT });
  if (saved) restartAll();
}

// Restarts the server. Returns true when the app is back up (clients: true once the reconnect has started).
//   packaged   - stop and start the bundled backend this app owns
//   dev        - the backend belongs to `npm run dev` (tsx watch), so ask it to reload (see restartDevBackend)
async function restartAll() {
  if (resetBusy) { log('Restart ignored: a database reset is running.'); return false; }
  if (!IS_CLIENT && !app.isPackaged) {
    try {
      await restartDevBackend();
      return true;
    } catch (e) {
      log('Development restart failed:', e.message);
      showStatusPage('error', e.message);
      return false;
    }
  }
  if (!IS_CLIENT) await stopBackend();
  await startApplication();
  return IS_CLIENT || backendReady;
}

// ==================== RESTART (dev) & RESET DATABASE ====================
// Reset is destructive, so it can only be started from the native menu / tray (never from the web page:
// preload.js deliberately exposes no reset call). The packaged app asks for the database name and a new
// administrator password in its own window; the dev build only runs against a database on this PC.
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const DEV_UI_URL = 'http://localhost:3000';
const DEV_RESTART_TIMEOUT_MS = 180_000; // a dev restart may re-run the seed check before it listens
let resetBusy = false;
let resetWindow = null;

// Minimal .env reader (KEY=value, optional quotes, # comments): enough for PORT and DATABASE_URL.
function readDevEnv() {
  const out = {};
  try {
    for (const line of fs.readFileSync(path.join(getBackendDir(), '.env'), 'utf8').split(/\r?\n/)) {
      if (/^\s*#/.test(line)) continue;
      const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (!m) continue;
      let v = m[2];
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      out[m[1]] = v;
    }
  } catch { /* no backend/.env */ }
  return out;
}

function devBackendPort() {
  return Number(process.env.PORT || readDevEnv().PORT) || 5000;
}

// The database `prisma` and the seed would use in dev: a shell variable wins over backend/.env, as it does for Prisma.
function devDatabaseUrl() {
  return process.env.DATABASE_URL || readDevEnv().DATABASE_URL || '';
}
function describeDevDatabase() {
  const url = devDatabaseUrl();
  if (!url) return null;
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^\[|\]$/g, '');
    return {
      host,
      port: u.port || '5432',
      name: decodeURIComponent(u.pathname.replace(/^\//, '')),
      local: ['localhost', '127.0.0.1', '::1'].includes(host.toLowerCase()),
    };
  } catch {
    return null;
  }
}

function healthInfo(port) {
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: '127.0.0.1', port, path: '/api/health', method: 'GET', timeout: 3000 }, (res) => {
      let body = '';
      res.on('data', (d) => { body += d; });
      res.on('end', () => {
        if (res.statusCode < 200 || res.statusCode >= 400) return reject(new Error(`HTTP ${res.statusCode}`));
        try { resolve(JSON.parse(body)); } catch { resolve({}); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.end();
  });
}

function showDevUi() {
  if (!mainWindow || mainWindow.isDestroyed()) return Promise.resolve();
  return mainWindow.loadURL(DEV_UI_URL).then(() => mainWindow.webContents.send('backend-ready'));
}

// In dev the backend runs under `tsx watch`, which reloads when a source file changes. Electron does not own
// that process, so "restart" means touching src/server.ts and waiting until the API has really come back
// (it went down and up again, or its uptime reset) instead of assuming the reload happened.
async function restartDevBackend() {
  const port = devBackendPort();
  const serverFile = path.join(getBackendDir(), 'src', 'server.ts');
  if (!fs.existsSync(serverFile)) throw new Error(`Cannot find ${serverFile}, so the development server cannot be restarted from here.`);
  showStatusPage('starting', 'Restarting the development server...');

  let before = null;
  try { before = await healthInfo(port); } catch { /* not running: just wait for it to come up */ }
  if (before) {
    const now = new Date();
    fs.utimesSync(serverFile, now, now);
    log(`Dev restart requested (touched ${serverFile}); waiting for port ${port}.`);
  }

  const started = Date.now();
  let sawDown = !before;
  while (Date.now() - started < DEV_RESTART_TIMEOUT_MS) {
    await sleep(500);
    let now;
    try { now = await healthInfo(port); } catch { sawDown = true; continue; }
    const uptimeReset = !!before && typeof now.uptime === 'number' && typeof before.uptime === 'number' && now.uptime < before.uptime;
    if (sawDown || uptimeReset) {
      log('Development server is back.');
      await showDevUi();
      return;
    }
    if (Date.now() - started > 12_000) {
      throw new Error('The development server did not restart. It only reloads by itself when it was started with "npm run dev" (tsx watch). Stop it and start it again manually.');
    }
  }
  throw new Error(`The development server did not become ready within ${DEV_RESTART_TIMEOUT_MS / 1000} seconds. Check the terminal running it for errors.`);
}

// Runs a Node script with Electron's own runtime (no Node.js needed on the PC). Rejects with the output tail on failure.
function runNode(scriptPath, args, { cwd, env, onLine, label }) {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(scriptPath)) return reject(new Error(`${label || path.basename(scriptPath)} not found at ${scriptPath}`));
    const child = spawn(process.execPath, [scriptPath, ...args], {
      cwd,
      env: { ...process.env, ELECTRON_RUN_AS_NODE: '1', ...env },
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let tail = '';
    const feed = (buf, isErr) => {
      const text = buf.toString();
      tail = (tail + text).split('\n').slice(-15).join('\n');
      text.split('\n').filter(Boolean).forEach((l) => {
        log(`[${label || path.basename(scriptPath)}${isErr ? ' ERR' : ''}] ${l}`);
        onLine && onLine(l);
      });
    };
    child.stdout.on('data', (b) => feed(b, false));
    child.stderr.on('data', (b) => feed(b, true));
    child.on('error', reject);
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`${label || path.basename(scriptPath)} exited with code ${code}\n${tail.trim()}`))));
  });
}

// ---- reset: development build ----
async function resetDevDatabase() {
  if (resetBusy) return;
  const dev = describeDevDatabase();
  if (!dev) {
    dialog.showErrorBox('Reset database', 'No DATABASE_URL was found (backend/.env or the environment), so there is nothing to reset.');
    return;
  }
  if (!dev.local) {
    dialog.showErrorBox('Reset database', `The development database is on "${dev.host}", not on this PC. The in-app reset only works on a local database. Reset it from that server instead.`);
    return;
  }
  const parent = mainWindow && !mainWindow.isDestroyed() ? mainWindow : undefined;
  const { response } = await dialog.showMessageBox(parent, {
    type: 'warning',
    buttons: ['Cancel', 'Erase and re-seed'],
    defaultId: 0,
    cancelId: 0,
    title: 'Reset development database',
    message: `Erase ALL data in the database "${dev.name}" (${dev.host}:${dev.port})?`,
    detail: 'Every table is dropped and rebuilt from prisma/schema.prisma, then the demo data is seeded again. This takes a few minutes and the development server restarts. It cannot be undone.',
  });
  if (response !== 1) return;

  resetBusy = true;
  const backendDir = getBackendDir();
  const env = { DATABASE_URL: devDatabaseUrl(), NODE_ENV: 'development' };
  let lastStatus = 0;
  const onSeedLine = (l) => {
    const m = l.match(/STEP[^:]*:\s*(.+)$/);
    if (m && Date.now() - lastStatus > 1000) {
      lastStatus = Date.now();
      showStatusPage('starting', `Seeding data: ${m[1].replace(/[^\x20-\x7E]/g, '').trim()}...`);
    }
  };
  try {
    log(`Dev reset: erasing ${dev.name}@${dev.host}:${dev.port}`);
    showStatusPage('starting', `Erasing the development database "${dev.name}" and rebuilding its tables...`);
    await runNode(
      path.join(backendDir, 'node_modules', 'prisma', 'build', 'index.js'),
      ['db', 'push', '--force-reset', '--accept-data-loss', '--skip-generate', '--schema=prisma/schema.prisma'],
      { cwd: backendDir, env, label: 'prisma db push' },
    );
    showStatusPage('starting', 'Seeding reference and demo data. This can take a few minutes...');
    await runNode(
      path.join(backendDir, 'node_modules', 'tsx', 'dist', 'cli.mjs'),
      ['src/seed/seedData.ts'],
      { cwd: backendDir, env, onLine: onSeedLine, label: 'seed' },
    );
    await restartDevBackend();
    log('Development database reset complete.');
  } catch (e) {
    log('Dev reset failed:', e.stack || e.message);
    showStatusPage('error', `Resetting the database failed.\n\n${e.message}`);
  } finally {
    resetBusy = false;
  }
}

// ---- reset: packaged app ----
function openResetWindow() {
  if (resetWindow) { resetWindow.focus(); return; }
  if (resetBusy) return;
  if (starting) {
    dialog.showMessageBox(mainWindow || undefined, { type: 'info', message: 'The server is still starting. Try again in a moment.' });
    return;
  }
  if (!loadConfig()) {
    dialog.showErrorBox('Reset database', 'The database has not been configured yet. Use Database settings first.');
    return;
  }
  resetWindow = new BrowserWindow({
    width: 560,
    height: 720,
    resizable: false,
    minimizable: false,
    maximizable: false,
    parent: mainWindow && !mainWindow.isDestroyed() ? mainWindow : undefined,
    modal: !!(mainWindow && !mainWindow.isDestroyed()),
    title: `${APP_TITLE} - Reset database`,
    icon: getIconPath(),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'reset-preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  resetWindow.setMenu(null);
  resetWindow.loadFile(path.join(__dirname, 'reset.html'));
  // The window cannot be closed while the database is being rebuilt.
  resetWindow.on('close', (e) => { if (resetBusy) e.preventDefault(); });
  resetWindow.on('closed', () => {
    resetWindow = null;
    // Whatever happened (cancelled, failed before erasing, finished, or failed after erasing), bring the app back:
    // a stopped backend is restarted, and an unfinished reset (bootstrapDone=false) reopens the setup window.
    if (!quitting && !resetBusy && !starting && !serverProcess) restartAll();
  });
}

const fromResetWindow = (event) => !!resetWindow && event.sender === resetWindow.webContents;

ipcMain.handle('reset:info', async (event) => {
  if (!fromResetWindow(event)) return null;
  const cfg = loadConfig();
  return {
    database: cfg ? cfg.db.database : '',
    host: cfg ? cfg.db.host : '',
    port: cfg ? cfg.db.port : '',
    isServer: IS_SERVER || !!(cfg && cfg.network && cfg.network.lan), // other PCs depend on this one
    pgDump: await pgDumpAvailable(),
  };
});

ipcMain.handle('reset:cancel', (event) => {
  if (fromResetWindow(event) && !resetBusy) resetWindow.close();
});

ipcMain.handle('reset:run', async (event, payload) => {
  if (!fromResetWindow(event)) return { ok: false, message: 'Not allowed.' };
  if (resetBusy) return { ok: false, message: 'A reset is already running.' };
  const cfg = loadConfig();
  if (!cfg) return { ok: false, message: 'The database is not configured.' };

  // Validated here, not just in the window: the window is only a form.
  const confirmName = String((payload && payload.confirmName) || '').trim();
  const adminPassword = String((payload && payload.adminPassword) || '');
  if (confirmName !== cfg.db.database) return { ok: false, message: `Type the database name exactly (${cfg.db.database}) to confirm.` };
  if (adminPassword.length < 8) return { ok: false, message: 'Choose an administrator password of at least 8 characters.' };

  resetBusy = true;
  const progress = (msg) => { try { event.sender.send('reset:progress', msg); } catch { /* window closed */ } };
  let erased = false;
  try {
    log(`Database reset requested for ${cfg.db.database}@${cfg.db.host}:${cfg.db.port}`);
    progress('Stopping the server...');
    await stopBackend();

    progress('Backing up the database first...');
    const backup = await dumpDatabase(cfg.db, 'pre-reset');
    if (backup.ok) {
      log(`Pre-reset backup: ${backup.file}`);
      progress(`Backup saved: ${backup.file}`);
    } else if (backup.unavailable) {
      if (!payload.acceptNoBackup) return { ok: false, message: 'pg_dump was not found, so no backup can be made. Tick the box to continue without a backup.' };
      log('WARNING: resetting without a backup (pg_dump not found; confirmed by the user).');
    } else {
      return { ok: false, message: `The backup failed, so nothing was erased.\n${backup.error}` };
    }

    progress('Erasing the database...');
    // Until the rebuild finishes, mark setup as incomplete so a crash or a failure lands in the setup window
    // on the next start instead of a half-empty database (undone below if nothing was actually erased).
    saveConfig({ db: cfg.db, bootstrapDone: false, network: cfg.network });
    try {
      const how = await wipeDatabase(cfg.db);
      erased = true;
      log(`Database erased (${how}).`);
    } catch (e) {
      if (e.dataLost) erased = true;
      else saveConfig({ db: cfg.db, bootstrapDone: cfg.bootstrapDone, network: cfg.network }); // nothing was erased: undo the marker
      throw e;
    }

    const applied = await applyMigrations(cfg.db, progress);
    log(`Schema rebuilt (changed: ${applied}).`);

    progress('Loading hospital reference data (diagnoses, tariffs, services, stock). This takes about a minute...');
    await runNodeScript('bootstrap.mjs', backendEnv(cfg.db, { INITIAL_ADMIN_PASSWORD: adminPassword }), {
      onLine: (l) => l.startsWith('BOOTSTRAP') && progress(l.replace(/^BOOTSTRAP:?\s*/, '')),
    });

    saveConfig({ db: cfg.db, bootstrapDone: true, network: cfg.network });
    log('Database reset complete.');
    progress('Done. Restarting the server...');
    // closing the window restarts the server (see the 'closed' handler)
    setImmediate(() => { if (resetWindow) resetWindow.destroy(); });
    return { ok: true };
  } catch (e) {
    log('Database reset failed:', e.stack || e.message);
    const message = friendlyPgError(e, cfg.db);
    return {
      ok: false,
      message: erased
        ? `The database was erased but could not be rebuilt:\n${message}\n\nClose this window. The app will offer the setup screen so you can finish the rebuild.`
        : message,
    };
  } finally {
    resetBusy = false;
  }
});

function resetDatabase() {
  if (IS_CLIENT) return;
  return app.isPackaged ? openResetWindow() : resetDevDatabase();
}

// Quitting the server takes every other PC offline, so ask first.
async function quitApp() {
  if (IS_SERVER && !quitting) {
    const { response } = await dialog.showMessageBox(mainWindow && mainWindow.isVisible() ? mainWindow : undefined, {
      type: 'warning',
      buttons: ['Keep running', 'Quit server'],
      defaultId: 0,
      cancelId: 0,
      title: 'Quit Veridian HMS Server',
      message: 'Other PCs will lose access to Veridian HMS until the server is started again.',
    });
    if (response !== 1) return;
  }
  app.quit();
}

// ==================== SERVER TRAY ====================
let tray = null;
function showMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}
function createTray() {
  if (tray) return;
  const icon = nativeImage.createFromPath(path.join(__dirname, 'build', 'icon.png'));
  tray = new Tray(icon.isEmpty() ? icon : icon.resize({ width: 16, height: 16 }));
  const addresses = () => {
    const net = normalizeNetwork((loadConfig() || {}).network);
    const list = lanAddresses().map((ip) => `http://${ip}:${activePort || net.port}`);
    return list.length ? list.join('\n') : 'No network connection found.';
  };
  tray.setToolTip(`${APP_TITLE} Server`);
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Open Veridian HMS', click: showMainWindow },
    { label: 'Show address for other PCs', click: () => dialog.showMessageBox({ type: 'info', title: 'Server address', message: 'Type one of these into a browser or the Veridian HMS Client on other PCs:', detail: addresses() }) },
    { label: 'Database settings...', click: () => changeDatabaseSettings() },
    { label: 'Restart server', click: () => restartAll() },
    { label: 'Reset database...', click: () => resetDatabase() },
    { label: 'Open log folder', click: () => shell.openPath(app.getPath('logs')) },
    { type: 'separator' },
    { label: 'Quit server', click: () => quitApp() },
  ]));
  tray.on('double-click', showMainWindow);
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
      mainWindow.show();
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
    if (IS_SERVER && app.isPackaged) {
      createTray();
      // start with Windows so the server comes back by itself after a power cut or reboot
      try { app.setLoginItemSettings({ openAtLogin: true, args: ['--hidden'] }); } catch (e) { log('Could not enable start-with-Windows:', e.message); }
    }

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
    const ok = await restartAll();
    return ok ? { success: true } : { success: false, error: 'The server did not come back. See the window or the log for details.' };
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
