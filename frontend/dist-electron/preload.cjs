"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
electron_1.contextBridge.exposeInMainWorld('electronAPI', {
    // Platform information
    platform: process.platform,
    // Example methods for future use
    // These can be expanded as needed for the application
    openExternal: (url) => {
        electron_1.ipcRenderer.invoke('open-external', url);
    },
    // File system operations (if needed)
    // readFile: (path: string) => ipcRenderer.invoke('read-file', path),
    // writeFile: (path: string, data: string) => ipcRenderer.invoke('write-file', path, data),
    // Window controls (if needed)
    // minimize: () => ipcRenderer.invoke('window-minimize'),
    // maximize: () => ipcRenderer.invoke('window-maximize'),
    // close: () => ipcRenderer.invoke('window-close'),
});
//# sourceMappingURL=preload.js.map