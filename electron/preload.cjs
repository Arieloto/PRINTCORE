/**
 * Preload bridge.
 *
 * Runs with contextIsolation, so the renderer gets exactly these window
 * operations and nothing else — no Node, no ipcRenderer, no fs.
 *
 * The `__printcore_desktop` flag is set synchronously by main.cjs before the
 * document parses, so the renderer can paint the custom title bar on the very
 * first frame without waiting for an IPC round-trip.
 */

const { contextBridge, ipcRenderer } = require('electron');

// Synchronous main-world flag: available before the document parses.
contextBridge.exposeInMainWorld('__printcore_desktop', { platform: process.platform });

contextBridge.exposeInMainWorld('printcore', {
  isDesktop: true,
  platform: process.platform,
  window: {
    minimize: () => ipcRenderer.send('win:minimize'),
    toggleMaximize: () => ipcRenderer.send('win:maximize'),
    close: () => ipcRenderer.send('win:close'),
    isMaximized: () => ipcRenderer.invoke('win:is-maximized'),
    onMaximizeChange: (callback) => {
      const listener = (_event, maximized) => callback(maximized);
      ipcRenderer.on('win:maximized', listener);
      return () => ipcRenderer.removeListener('win:maximized', listener);
    }
  }
});
