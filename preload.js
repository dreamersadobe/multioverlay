const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('overlayAPI', {
  // Config & state methods
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  setHotkey: (hotkey) => ipcRenderer.invoke('set-hotkey', hotkey),
  setSettingsOpen: (open) => ipcRenderer.invoke('set-settings-open', open),
  applyWindowPreset: (preset) => ipcRenderer.invoke('apply-window-preset', preset),
  resetPosition: () => ipcRenderer.invoke('reset-position'),
  deactivate: () => ipcRenderer.send('deactivate-overlay'),
  reloadWebview: () => ipcRenderer.send('reload-webview'),
  setAutoLaunch: (enable) => ipcRenderer.invoke('set-autolaunch', enable),

  // Updates & external links
  getVersion: () => ipcRenderer.invoke('get-version'),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  getUpdateState: () => ipcRenderer.invoke('get-update-state'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  cancelDownload: () => ipcRenderer.invoke('cancel-download'),
  applyUpdate: () => ipcRenderer.invoke('apply-update'),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),

  // Events from main process
  onOverlayStateChanged: (callback) => {
    ipcRenderer.on('overlay-state-changed', (_, state) => callback(state));
  },
  onSettingsUpdated: (callback) => {
    ipcRenderer.on('settings-updated', (_, settings) => callback(settings));
  },
  onOpenSettings: (callback) => {
    ipcRenderer.on('open-settings', (_, page) => callback(page));
  },
  onReloadWebview: (callback) => {
    ipcRenderer.on('reload-webview', () => callback());
  },
  onUpdateState: (callback) => {
    ipcRenderer.on('update-state', (_, state) => callback(state));
  },
});
