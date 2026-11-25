// reset-preload.cjs - the only things the "Reset database" window may do.
// main.cjs ignores these calls from any other window and re-validates every value it receives.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('resetAPI', {
  info: () => ipcRenderer.invoke('reset:info'),
  run: (payload) => ipcRenderer.invoke('reset:run', payload),
  cancel: () => ipcRenderer.invoke('reset:cancel'),
  onProgress: (callback) => {
    const handler = (_event, message) => callback(message);
    ipcRenderer.on('reset:progress', handler);
    return () => ipcRenderer.removeListener('reset:progress', handler);
  },
});
