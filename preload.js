const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    getServerOptions: () => ipcRenderer.invoke('getServerOptions'),
    getProfileOptions: (server) => ipcRenderer.invoke('getProfileOptions', server),
    getAccountOptions: (server, profile) => ipcRenderer.invoke('getAccountOptions', { server, profile }),
    getCharacterOptions: (server, profile) => ipcRenderer.invoke('getCharacterOptions', { server, profile }),
    copySettings: (from, to) => ipcRenderer.invoke('copySettings', from, to)
});
