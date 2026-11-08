// client-setup-preload.cjs - the only things the "server address" window may do
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('clientSetupAPI', {
  get: () => ipcRenderer.invoke('client:get'),
  test: (serverUrl) => ipcRenderer.invoke('client:test', serverUrl),
  save: (serverUrl) => ipcRenderer.invoke('client:save', serverUrl),
});
