const { app, BrowserWindow, Tray, Menu } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');

let mainWindow = null;
let tray = null;

function createWindow() {
  // Kill existing window if open
  if (mainWindow) {
    mainWindow.close();
  }

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,  // Security: Disable for production
      contextIsolation: true,  // Security: Enable context isolation
      enableRemoteModule: false,  // Security: Disable remote
      preload: path.join(__dirname, 'preload.js')  // Optional: Create preload.js for safe IPC
    },
    // CSP to fix security warning
    webSecurity: true,
    // Icon (skip if file missing)
    icon: (() => {
      try {
        return path.join(__dirname, 'public', 'icon.ico');
      } catch {
        return undefined;
      }
    })()
  });

  // Load content
  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();  // Open DevTools in dev
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Auto-updates
  autoUpdater.checkForUpdatesAndNotify();

  autoUpdater.on('update-available', () => {
    mainWindow?.webContents.send('update_available');
  });

  autoUpdater.on('update-downloaded', () => {
    mainWindow?.webContents.send('update_downloaded');
    autoUpdater.quitAndInstall();
  });
}

// Preload script for secure IPC (create this file)
const preloadPath = path.join(__dirname, 'preload.js');
if (!require('fs').existsSync(preloadPath)) {
  require('fs').writeFileSync(preloadPath, `
    const { contextBridge, ipcRenderer } = require('electron');

    contextBridge.exposeInMainWorld('electronAPI', {
      onUpdateAvailable: (callback) => ipcRenderer.on('update_available', callback),
      onUpdateDownloaded: (callback) => ipcRenderer.on('update_downloaded', callback)
    });
  `);
}

app.whenReady().then(() => {
  createWindow();

  // System Tray (with error handling)
  try {
    const iconPath = path.join(__dirname, 'public', 'icon.ico');
    tray = new Tray(iconPath);
    const contextMenu = Menu.buildFromTemplate([
      { label: 'Show SavorySync', click: () => mainWindow?.show() },
      { type: 'separator' },
      { label: 'Quit', click: () => app.quit() }
    ]);
    tray.setToolTip('SavorySync Restaurant');
    tray.setContextMenu(contextMenu);
    tray.on('click', () => mainWindow?.show());
  } catch (error) {
    console.warn('Tray icon missing, skipping tray:', error.message);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});