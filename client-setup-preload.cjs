// client-setup-preload.cjs - the only things the "server address" window may do.
// The certificate itself never reaches the page: main.cjs keeps it and the page only ever sees the short code.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('clientSetupAPI', {
  get: () => ipcRenderer.invoke('client:get'),
  pairStart: (serverUrl) => ipcRenderer.invoke('client:pair-start', serverUrl),
  pairConfirm: () => ipcRenderer.invoke('client:pair-confirm'),
  pairCancel: () => ipcRenderer.invoke('client:pair-cancel'),
});
