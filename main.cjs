// main.cjs - PostgreSQL Electron Main Process
const { app, BrowserWindow, ipcMain, dialog, Menu, shell } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');
const os = require('os');
const crypto = require('crypto');

let mainWindow = null;
let serverProcess = null;

// ==================== JWT SECRET (Persistent) ====================
function getOrCreateJwtSecret() {
  const secretPath = path.join(app.getPath('userData'), '.jwt-secret');
  try {
    if (fs.existsSync(secretPath)) {
      const existing = fs.readFileSync(secretPath, 'utf8').trim();
      if (existing.length >= 32) return existing;
    }
  } catch (e) {
    // File read failed, generate new one
  }
  const secret = crypto.randomBytes(64).toString('hex');
  try {
    const dir = path.dirname(secretPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(secretPath, secret, { mode: 0o600 });
  } catch (e) {
    console.error('Could not persist JWT secret:', e.message);
  }
  return secret;
}

// ==================== APPLICATION MENU ====================
function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Database Connection Info',
          click: () => {
            const dbInfo = getDatabaseInfo();
            dialog.showMessageBox({
              type: 'info',
              title: 'Database Connection',
              message: 'PostgreSQL Connection',
              detail: `Host: ${dbInfo.host}\nPort: ${dbInfo.port}\nDatabase: ${dbInfo.database}\nUser: ${dbInfo.user}\n\nStatus: ${dbInfo.status}`,
              buttons: ['OK']
            });
          }
        },
        { type: 'separator' },
        {
          label: 'Restart Backend',
          click: () => restartBackend()
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: 'CmdOrCtrl+Q',
          click: () => app.quit()
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'close' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About PharmacyPOS',
          click: () => {
            dialog.showMessageBox({
              type: 'info',
              title: 'About PharmacyPOS',
              message: 'Pharmacy Point of Sale System',
              detail: `Version ${app.getVersion()}\n\nDeveloped by Emmanuel Appiah\n\nA complete pharmacy management solution with inventory, sales, and reporting.\n\nDatabase: PostgreSQL`,
              buttons: ['OK']
            });
          }
        },
        {
          label: 'View Logs',
          click: () => {
            const logPath = path.join(app.getPath('logs'), 'pharmacy-pos.log');
            if (fs.existsSync(logPath)) {
              shell.openPath(logPath);
            } else {
              shell.openPath(app.getPath('logs'));
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Report Issue',
          click: () => {
            shell.openExternal('mailto:emk.appiah@gmail.com?subject=PharmacyPOS%20Issue%20Report');
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// ==================== DATABASE INFO ====================
function getDatabaseInfo() {
  const envPath = getEnvPath();
  const defaults = {
    host: 'localhost',
    port: '5432',
    database: 'pharmacy_pos',
    user: 'postgres',
    status: 'Not configured'
  };

  if (!fs.existsSync(envPath)) return { ...defaults, status: '.env file not found' };

  try {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const getVal = (key) => {
      const match = envContent.match(new RegExp(`^${key}= (.+)$`, 'm'));
      return match ? match[1].trim().replace(/^["']|["']$/g, '') : null;
    };

    return {
      host: getVal('DB_HOST') || defaults.host,
      port: getVal('DB_PORT') || defaults.port,
      database: getVal('DB_NAME') || defaults.database,
      user: getVal('DB_USER') || defaults.user,
      status: 'Configured (verify connection in app)'
    };
  } catch (e) {
    return { ...defaults, status: `Error reading .env: ${e.message}` };
  }
}

// ==================== PATHS ====================
function getIconPath() {
  const iconBase = 'build/icon';
  if (process.platform === 'win32') return path.join(__dirname, `${iconBase}.ico`);
  if (process.platform === 'darwin') return path.join(__dirname, `${iconBase}.icns`);
  return path.join(__dirname, `${iconBase}.png`);
}

function getBackendPath() {
  if (app.isPackaged) {
    // Packaged: extraResources places compiled backend at resources/backend
    return path.join(process.resourcesPath, 'backend');
  }
  // Development: use the raw backend source (run via tsx)
  return path.join(__dirname, 'backend');
}

function getServerJsPath() {
  if (app.isPackaged) {
    // Packaged: tsc compiled output → resources/backend/server.js
    return path.join(process.resourcesPath, 'backend', 'server.js');
  }
  // Development: point to compiled dist/ if available, otherwise use tsx
  const distServer = path.join(__dirname, 'backend', 'dist', 'server.js');
  const srcServer = path.join(__dirname, 'backend', 'src', 'server.ts');
  return fs.existsSync(distServer) ? distServer : srcServer;
}

function getEnvPath() {
  return path.join(getBackendPath(), '.env');
}

// ==================== BACKEND SERVER ====================
function startBackendServer() {
  return new Promise((resolve, reject) => {
    let resolved = false;
    const markResolved = (fn, ...args) => {
      if (!resolved) {
        resolved = true;
        fn(...args);
      }
    };

    // ✅ Capture all stderr output
    let stderrOutput = '';

    try {
      console.log('=== Starting Backend Server (PostgreSQL) ===');

      const backendPath = getBackendPath();
      const serverJsPath = getServerJsPath();
      console.log('Backend path:', backendPath);
      console.log('Server entry:', serverJsPath);

      if (!fs.existsSync(backendPath)) {
        markResolved(reject, new Error(`Backend directory not found at: ${backendPath}`));
        return;
      }

      if (!fs.existsSync(serverJsPath)) {
        markResolved(reject, new Error(
          `Backend entry point not found at: ${serverJsPath}\n\n` +
          `If running a development build, compile the backend first:\n` +
          `  cd backend && npx tsc`
        ));
        return;
      }

      const envPath = getEnvPath();
      console.log('Env path:', envPath);
      console.log('Env exists:', fs.existsSync(envPath));

      const env = {
        ...process.env,
        NODE_ENV: 'production',
        PORT: '5000',
        HOST: '127.0.0.1',
        ELECTRON: 'true',
        JWT_SECRET: getOrCreateJwtSecret()
      };

      console.log('Starting backend with env:', {
        PORT: env.PORT,
        NODE_ENV: env.NODE_ENV,
        ELECTRON: env.ELECTRON
      });

      // Determine if we need to run via tsx (dev TS) or node (compiled JS)
      const isTypeScript = serverJsPath.endsWith('.ts');
      const nodeCmd = isTypeScript ? 'npx' : 'node';
      const nodeArgs = isTypeScript
        ? ['tsx', serverJsPath]
        : [serverJsPath];

      console.log(`Spawning: ${nodeCmd} ${nodeArgs.join(' ')}`);

      serverProcess = spawn(nodeCmd, nodeArgs, {
        cwd: backendPath,
        env: env,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      serverProcess.stdout.on('data', (data) => {
        const message = data.toString().trim();
        console.log(`[Backend]: ${message}`);

        if (!resolved && (
          message.includes('Server running') ||
          message.includes('Listening') ||
          message.includes('port 5000') ||
          message.includes('listening on') ||
          message.includes('Hospital Management System API running') ||
          message.includes('running on port')
        )) {
          console.log('✅ Backend server started successfully');
          setTimeout(() => markResolved(resolve, true), 500);
        }
      });

      serverProcess.stderr.on('data', (data) => {
        const error = data.toString().trim();
        console.error(`[Backend Error]: ${error}`);
        stderrOutput += error + '\n';
      });

      serverProcess.on('error', (error) => {
        console.error('Failed to spawn backend process:', error);
        markResolved(reject, error);
      });

      serverProcess.on('close', (code) => {
        console.log(`Backend process exited with code ${code}`);
        console.log('Stderr captured:', stderrOutput);
        serverProcess = null;

        if (!resolved && code !== null && code !== 0) {
          // ✅ Include the ACTUAL error in the rejection
          const realError = stderrOutput.trim()
            ? stderrOutput.trim().split('\n').slice(-10).join('\n')
            : 'No error output captured';

          markResolved(reject, new Error(
            `Exit code ${code}\n\n` +
            `--- Backend Error Output ---\n${realError}\n` +
            `--- End Error Output ---`
          ));
        }
      });

      setTimeout(() => {
        if (!resolved) {
          console.log('No startup message detected, testing HTTP connection...');
          testBackendConnection()
            .then(() => {
              console.log('✅ Backend confirmed running via HTTP check');
              markResolved(resolve, true);
            })
            .catch((err) => {
              // ✅ Also include stderr in timeout errors
              const stderrInfo = stderrOutput.trim()
                ? `\n\n--- Backend Output ---\n${stderrOutput.trim().split('\n').slice(-10).join('\n')}`
                : '';

              markResolved(reject, new Error(
                `Backend did not start within timeout.\n` +
                `HTTP check: ${err.message}${stderrInfo}`
              ));
            });
        }
      }, 8000);

    } catch (error) {
      console.error('Error starting backend:', error);
      markResolved(reject, error);
    }
  });
}

function testBackendConnection() {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: '127.0.0.1',
      port: 5000,
      path: '/api/health',
      method: 'GET',
      timeout: 10000
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        console.log(`Backend health check: ${res.statusCode}`, body);
        if (res.statusCode >= 200 && res.statusCode < 400) {
          resolve(true);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on('error', (err) => {
      console.error('Backend connection failed:', err.message);
      reject(err);
    });

    req.on('timeout', () => {
      console.error('Backend connection timeout');
      req.destroy();
      reject(new Error('Connection timeout - server not responding'));
    });

    req.end();
  });
}

function restartBackend() {
  if (serverProcess) {
    console.log('Stopping backend server...');
    serverProcess.kill('SIGTERM');

    setTimeout(() => {
      console.log('Restarting backend server...');
      startBackendServer().then(() => {
        if (mainWindow) {
          mainWindow.webContents.send('backend-restarted');
        }
        dialog.showMessageBox(mainWindow, {
          type: 'info',
          message: 'Backend Restarted',
          detail: 'The backend server has been restarted successfully.'
        });
      }).catch(error => {
        dialog.showErrorBox('Backend Restart Failed', error.message);
      });
    }, 2000);
  }
}

// ==================== WINDOW ====================
function createWindow() {
  const icon = getIconPath();

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true,
      devTools: !app.isPackaged,
      allowRunningInsecureContent: false
    },
    icon: icon,
    show: false,
    backgroundColor: '#f5f5f5',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    frame: true,
    autoHideMenuBar: false
  });

  createMenu();
  loadFrontend();

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ==================== LOAD FRONTEND ====================
function loadFrontend() {
  if (app.isPackaged) {
    // ✅ FIXED: Load from the backend server (http://) instead of file://
    // This avoids Electron's strict file:// security blocks on Vite JS modules
    console.log('Production mode: Loading UI from http://127.0.0.1:5000');
    mainWindow.loadURL('http://127.0.0.1:5000')
      .then(() => console.log('✅ Frontend loaded successfully'))
      .catch(err => {
        console.error('Failed to load frontend from backend:', err);
        showErrorPage(`Failed to load UI from backend server: ${err.message}`);
      });
  } else {
    // Development mode: Load from Vite dev server
    console.log('Development mode: Loading from http://localhost:3000');
    mainWindow.loadURL('http://localhost:3000')
      .catch(err => {
        console.error('Failed to load dev server:', err);
        showErrorPage('Development server not running.\n\nPlease start with: npm run dev');
      });
  }
}

// ==================== ERROR PAGE ====================
function showErrorPage(message) {
  const errorHTML = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>PharmacyPOS - Error</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0; padding: 40px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white; min-height: 100vh;
            display: flex; align-items: center; justify-content: center;
          }
          .container {
            background: rgba(255,255,255,0.1); backdrop-filter: blur(10px);
            padding: 40px; border-radius: 15px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
            max-width: 600px; width: 90%; text-align: center;
            border: 1px solid rgba(255,255,255,0.2);
          }
          h1 { color: white; margin-top: 0; font-size: 24px; }
          .error {
            background: rgba(255,255,255,0.2); color: white;
            padding: 20px; border-radius: 10px; margin: 20px 0;
            text-align: left; border-left: 4px solid #ff6b6b;
            word-break: break-word; white-space: pre-line;
          }
          .button {
            display: inline-block; padding: 12px 24px;
            background: rgba(255,255,255,0.3); color: white;
            border: none; border-radius: 8px; cursor: pointer;
            margin: 10px; text-decoration: none; font-weight: 500;
            transition: all 0.3s ease;
            border: 1px solid rgba(255,255,255,0.3);
          }
          .button:hover { background: rgba(255,255,255,0.4); transform: translateY(-2px); }
          .button-primary { background: #4CAF50; border-color: #4CAF50; }
          .button-primary:hover { background: #45a049; }
          .info { color: rgba(255,255,255,0.8); margin-top: 30px; font-size: 14px; }
          .logo { font-size: 32px; font-weight: bold; margin-bottom: 20px; }
          .pg-hint {
            background: rgba(255,200,0,0.2); border-left: 4px solid #ffc107;
            padding: 15px; border-radius: 8px; margin: 15px 0;
            text-align: left; font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">💊 PharmacyPOS</div>
          <h1>⚠️ Application Error</h1>
          <div class="error">${message}</div>
          <div class="pg-hint">
            <strong>📡 PostgreSQL Requirements:</strong><br>
            • PostgreSQL server must be running<br>
            • Database <code>pharmacy_pos</code> must exist<br>
            • Connection settings are in <code>backend/.env</code>
          </div>
          <div>
            <button class="button button-primary" onclick="location.reload()">🔄 Retry</button>
          </div>
          <div class="info">
            <strong>Debug:</strong><br>
            Version: ${app.getVersion()} | Platform: ${process.platform} ${os.release()}<br>
            Electron: ${process.versions.electron} | ${app.isPackaged ? 'Production' : 'Development'} Mode
          </div>
        </div>
      </body>
    </html>
  `;

  if (mainWindow) {
    mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(errorHTML)}`);
  }
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
}

// ==================== APP STARTUP ====================
app.whenReady().then(async () => {
  console.log('=== PharmacyPOS Starting ===');
  console.log('Version:', app.getVersion());
  console.log('App path:', app.getAppPath());
  console.log('Resources path:', process.resourcesPath || 'N/A (dev mode)');
  console.log('Is packaged:', app.isPackaged);
  console.log('Platform:', process.platform, os.release());
  console.log('User data:', app.getPath('userData'));
  console.log('Backend path:', getBackendPath());
  console.log('Env path:', getEnvPath());

  createWindow();

  if (app.isPackaged) {
    try {
      console.log('Starting backend server...');
      await startBackendServer();
      console.log('✅ Backend initialization complete');

      if (mainWindow) {
        mainWindow.webContents.send('backend-ready');
      }
    } catch (error) {
      console.error('❌ Failed to start backend:', error.message);

      // Show error but don't crash - let user see the error page
      setTimeout(() => {
        if (mainWindow) {
          showErrorPage(
            `Backend Server Failed to Start\n\n${error.message}\n\n` +
            `Make sure:\n` +
            `1. PostgreSQL is installed and running\n` +
            `2. The database 'pharmacy_pos' has been created\n` +
            `3. The .env file in the backend folder has correct credentials\n\n` +
            `To check PostgreSQL on Windows:\n` +
            `  • Open Services → look for "postgresql-x64-XX"\n` +
            `  • Or run: net start postgresql-x64-XX\n\n` +
            `To create the database:\n` +
            `  • Open pgAdmin or psql\n` +
            `  • Run: CREATE DATABASE pharmacy_pos;`
          );
        }
      }, 500);
    }
  } else {
    console.log('Development mode: Backend should be running on localhost:5000');
  }
});

// ==================== CLEANUP ====================
app.on('window-all-closed', () => {
  if (serverProcess) {
    console.log('Stopping backend server...');
    try {
      serverProcess.kill('SIGTERM');
    } catch (e) {
      try { serverProcess.kill(); } catch (e2) { }
    }
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (serverProcess) {
    console.log('Stopping backend server (before-quit)...');
    try {
      serverProcess.kill('SIGTERM');
    } catch (e) {
      try { serverProcess.kill(); } catch (e2) { }
    }
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// ==================== IPC HANDLERS ====================
ipcMain.handle('get-backend-status', () => {
  return serverProcess ? 'running' : 'stopped';
});

ipcMain.handle('restart-backend', async () => {
  try {
    await restartBackend();
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-db-info', () => {
  return getDatabaseInfo();
});

// ==================== ERROR HANDLERS ====================
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  const logDir = path.join(app.getPath('logs'));
  if (!fs.existsSync(logDir)) {
    try { fs.mkdirSync(logDir, { recursive: true }); } catch (e) { }
  }
  try {
    fs.appendFileSync(
      path.join(logDir, 'pharmacy-pos.log'),
      `${new Date().toISOString()} - Uncaught Exception: ${error.stack}\n`
    );
  } catch (e) { }

  if (app.isPackaged && mainWindow) {
    dialog.showErrorBox('Application Error', error.toString());
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});