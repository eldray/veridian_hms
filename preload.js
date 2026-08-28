const { contextBridge, ipcRenderer } = require('electron');

// Safe IPC handler
const safeIpcHandler = (channel, callback) => {
  const subscription = (event, ...args) => callback(...args);
  ipcRenderer.on(channel, subscription);
  return () => ipcRenderer.removeListener(channel, subscription);
};

try {
  contextBridge.exposeInMainWorld('electronAPI', {
    platform: process.platform,
    isPackaged: process.env.NODE_ENV === 'production',
    isElectron: true,
    
    versions: {
      node: process.versions.node,
      chrome: process.versions.chrome,
      electron: process.versions.electron
    },
    
    // Application info
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),
    getDBPath: () => ipcRenderer.invoke('get-db-path'),
    getBackendStatus: () => ipcRenderer.invoke('get-backend-status'),
    
    // Backend control
    restartBackend: () => ipcRenderer.invoke('restart-backend'),
    
    // Event listeners
    onBackendReady: (callback) => safeIpcHandler('backend-ready', callback),
    onBackendRestarted: (callback) => safeIpcHandler('backend-restarted', callback),
    onUpdateAvailable: (callback) => safeIpcHandler('update_available', callback),
    onUpdateDownloaded: (callback) => safeIpcHandler('update_downloaded', callback),
    
    // Remove listeners
    removeAllListeners: () => {
      ipcRenderer.removeAllListeners('backend-ready');
      ipcRenderer.removeAllListeners('backend-restarted');
      ipcRenderer.removeAllListeners('update_available');
      ipcRenderer.removeAllListeners('update_downloaded');
    },
    
    // Platform-specific features
    isWindows: process.platform === 'win32',
    isMacOS: process.platform === 'darwin',
    isLinux: process.platform === 'linux'
  });
  
  console.log('Preload script initialized successfully');
} catch (error) {
  console.error('Error in preload script:', error);
}