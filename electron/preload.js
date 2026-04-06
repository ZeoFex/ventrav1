const { contextBridge, ipcRenderer } = require("electron");

/**
 * Secure bridge — exposes ONLY window-control APIs to the renderer.
 * Context isolation is enabled so the Next.js app cannot access Node.js.
 */
contextBridge.exposeInMainWorld("electronAPI", {
  minimize: () => ipcRenderer.invoke("window:minimize"),
  maximize: () => ipcRenderer.invoke("window:maximize"),
  close: () => ipcRenderer.invoke("window:close"),
  isElectron: true,
});
