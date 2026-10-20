// setup-preload.cjs — the only things the database setup window may do
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('setupAPI', {
  getSettings: () => ipcRenderer.invoke('setup:get'),
  testConnection: (db) => ipcRenderer.invoke('setup:test', db),
  save: (payload) => ipcRenderer.invoke('setup:save', payload),
  onProgress: (callback) => {
    const handler = (_event, message) => callback(message);
    ipcRenderer.on('setup:progress', handler);
    return () => ipcRenderer.removeListener('setup:progress', handler);
  },
});
