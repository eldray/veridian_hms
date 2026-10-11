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

// Applies backend/sql/*.sql in order, once each. Returns true when this call applied anything.
async function applyMigrations(db, onProgress) {
  const sqlDir = path.join(getBackendDir(), 'sql');
  if (!fs.existsSync(sqlDir)) throw new Error(`Database scripts not found at ${sqlDir}. The installer is incomplete.`);
  const files = fs.readdirSync(sqlDir).filter((f) => f.endsWith('.sql')).sort();
  if (files.length === 0) throw new Error('No database scripts were bundled with this installer.');

  return withClient(db, db.database, async (c) => {
    await c.query('CREATE TABLE IF NOT EXISTS _veridian_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
    const done = new Set((await c.query('SELECT name FROM _veridian_migrations')).rows.map((r) => r.name));

    // A database that was built another way (e.g. `prisma db push` during development) already has the tables.
    // Treat the first script as applied instead of failing with "type already exists".
    if (done.size === 0) {
      const existing = await c.query(`SELECT to_regclass('"User"') AS t`);
      if (existing.rows[0].t) {
        await c.query('INSERT INTO _veridian_migrations (name) VALUES ($1) ON CONFLICT DO NOTHING', [files[0]]);
        done.add(files[0]);
        log(`Existing database detected, baselined ${files[0]}`);
      }
    }

    let applied = false;
    for (const file of files) {
      if (done.has(file)) continue;
      onProgress && onProgress(`Creating database tables (${file})...`);
      const sql = fs.readFileSync(path.join(sqlDir, file), 'utf8');
      try {
        await c.query('BEGIN');
        await c.query(sql);
        await c.query('INSERT INTO _veridian_migrations (name) VALUES ($1)', [file]);
        await c.query('COMMIT');
      } catch (e) {
        await c.query('ROLLBACK').catch(() => {});
        throw new Error(`Applying ${file} failed: ${e.message}`);
      }
      applied = true;
      log(`Applied ${file}`);
    }
    return applied;
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
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true,
      devTools: !app.isPackaged,
      allowRunningInsecureContent: false,
    },
  });

  createMenu();

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });
  // Never let the app window navigate away to an arbitrary site
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const allowed = url.startsWith(`http://127.0.0.1:${activePort}`) || url.startsWith('http://localhost:3000') || url.startsWith('file://');
    if (!allowed) {
      event.preventDefault();
      if (/^https?:/.test(url)) shell.openExternal(url);
    }
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });
  mainWindow.on('closed', () => { mainWindow = null; });
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
