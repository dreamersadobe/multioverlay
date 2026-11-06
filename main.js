const { app, BrowserWindow, globalShortcut, Tray, Menu, screen, ipcMain, nativeImage, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { t } = require('./i18n');
const { normalizeBookmarks, fitBounds, presetBounds } = require('./overlay-utils');
const { configureProfile } = require('./app-profile');

configureProfile(app);
if (process.platform === 'win32') app.setAppUserModelId('com.gameoverlay.app');
let settingsOpen = false;

const GITHUB_REPO = 'dreamersadobe/multioverlay';

let overlayWindow = null;
let tray = null;
let isActive = true; // Overlay interactive status (capturing mouse or not)
let cachedUpdateInfo = null;

const DEFAULT_CONFIG = {
  hotkey: 'F2',
  hideMode: 'hide', // 'hide' (fully hidden) or 'clickthrough' (visible HUD, clicks pass through)
  opacity: 85,
  url: 'https://dbdfog.ru/survivor-builds',
  width: 1280,
  height: 720,
  x: null,
  y: null,
  showNotifications: true,
  autoLaunch: false,
  language: 'ru',
  onboardingComplete: false,
};

function getUserConfigPath() {
  return path.join(app.getPath('userData'), 'config.json');
}

function loadConfig() {
  const userPath = getUserConfigPath();
  const localPath = path.join(__dirname, 'config.json');

  let loaded = {};
  if (fs.existsSync(userPath)) {
    try {
      loaded = JSON.parse(fs.readFileSync(userPath, 'utf-8'));
    } catch (e) {
      console.warn('Failed to load user config.json:', e.message);
    }
  } else if (fs.existsSync(localPath)) {
    try {
      loaded = JSON.parse(fs.readFileSync(localPath, 'utf-8'));
    } catch (e) {
      console.warn('Failed to load local config.json:', e.message);
    }
  }

  return { ...DEFAULT_CONFIG, ...loaded, bookmarks: normalizeBookmarks(loaded.bookmarks), language: loaded.language === 'en' ? 'en' : 'ru' };
}

let config = loadConfig();

function saveConfig(updates = {}) {
  config = { ...config, ...updates };
  const userPath = getUserConfigPath();
  try {
    fs.mkdirSync(path.dirname(userPath), { recursive: true });
    fs.writeFileSync(userPath, JSON.stringify(config, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Failed to write user config:', e.message);
  }
}

function setAutoLaunch(enable) {
  try {
    if (process.platform === 'win32' && app.isPackaged) {
      app.setLoginItemSettings({ name: 'Game Overlay', openAtLogin: false });
    }
    app.setLoginItemSettings({
      openAtLogin: !!enable,
      path: process.execPath,
    });
  } catch (e) {
    console.warn('Failed to set auto-launch:', e.message);
  }
}

function createOverlayWindow() {
  const savedBounds = { x: config.x, y: config.y, width: config.width, height: config.height };
  const display = Number.isFinite(config.x) && Number.isFinite(config.y)
    ? screen.getDisplayMatching({ x: config.x, y: config.y, width: config.width, height: config.height })
    : screen.getPrimaryDisplay();
  const initialBounds = fitBounds(savedBounds, display.workArea);

  overlayWindow = new BrowserWindow({
    ...initialBounds,
    minWidth: 320,
    minHeight: 320,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: true,
    minimizable: false,
    maximizable: false,
    focusable: true,
    hasShadow: false,
    title: 'Nimbo',
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
    },
  });

  // Remove X-Frame-Options and CSP headers so external sites load in iframe
  overlayWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    const responseHeaders = { ...details.responseHeaders };
    delete responseHeaders['X-Frame-Options'];
    delete responseHeaders['x-frame-options'];
    delete responseHeaders['Content-Security-Policy'];
    delete responseHeaders['content-security-policy'];
    callback({ responseHeaders });
  });

  overlayWindow.setAlwaysOnTop(true, 'screen-saver');
  overlayWindow.setOpacity((config.opacity || 85) / 100);

  // Initial state: active and capturing mouse immediately
  isActive = true;
  overlayWindow.setIgnoreMouseEvents(false);

  overlayWindow.loadFile('overlay.html');

  // Track window movements and resizes to persist position and dimensions
  let boundsTimer = null;
  const onBoundsChanged = () => {
    if (boundsTimer) clearTimeout(boundsTimer);
    boundsTimer = setTimeout(() => {
      if (!overlayWindow || overlayWindow.isDestroyed()) return;
      const bounds = overlayWindow.getBounds();
      saveConfig({
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
      });
    }, 400);
  };

  overlayWindow.on('moved', onBoundsChanged);
  overlayWindow.on('resized', onBoundsChanged);

  // Prevent closing when user clicks native close, just deactivate
  overlayWindow.on('close', (e) => {
    e.preventDefault();
    deactivateOverlay();
  });

  overlayWindow.on('closed', () => {
    overlayWindow = null;
  });
}

function activateOverlay() {
  if (!overlayWindow) return;

  isActive = true;
  overlayWindow.show();
  overlayWindow.setAlwaysOnTop(true, 'screen-saver');
  overlayWindow.setIgnoreMouseEvents(false);
  overlayWindow.focus();

  overlayWindow.webContents.send('overlay-state-changed', {
    isActive: true,
    hideMode: config.hideMode,
    hotkey: config.hotkey,
  });

  updateTrayMenu();
}

function parseSemver(v) {
  if (!v || typeof v !== 'string') return [0, 0, 0];
  const cleaned = v.trim().replace(/^[vV]/, '');
  const match = cleaned.match(/^(\d+)(?:\.(\d+))?(?:\.(\d+))?/);
  if (!match) return [0, 0, 0];
  return [
    parseInt(match[1], 10) || 0,
    parseInt(match[2], 10) || 0,
    parseInt(match[3], 10) || 0,
  ];
}

function isNewerVersion(remote, local) {
  const r = parseSemver(remote);
  const l = parseSemver(local);
  for (let i = 0; i < 3; i++) {
    if (r[i] > l[i]) return true;
    if (r[i] < l[i]) return false;
  }
  return false;
}

async function checkForUpdates() {
  const currentVersion = app.getVersion();
  try {
    const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
      headers: {
        'User-Agent': 'Nimbo-App',
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        cachedUpdateInfo = {
          success: true,
          hasUpdate: false,
          currentVersion,
          message: 'Релизы пока не найдены на GitHub',
        };
        return cachedUpdateInfo;
      }
      throw new Error(`GitHub API вернул статус ${response.status}`);
    }

    const data = await response.json();
    const latestTag = data.tag_name || '';
    const releaseUrl = data.html_url || `https://github.com/${GITHUB_REPO}/releases/latest`;
    const releaseName = data.name || latestTag;
    const body = data.body || '';

    let portableUrl = null;
    let installerUrl = null;

    if (Array.isArray(data.assets)) {
      const portableAsset = data.assets.find(
        (a) => a.name.endsWith('.exe') && !a.name.toLowerCase().includes('setup')
      );
      if (portableAsset) portableUrl = portableAsset.browser_download_url;

      const installerAsset = data.assets.find(
        (a) => a.name.endsWith('.exe') && a.name.toLowerCase().includes('setup')
      );
      if (installerAsset) installerUrl = installerAsset.browser_download_url;
    }

    const downloadUrl = installerUrl || portableUrl || releaseUrl;
    const hasUpdate = isNewerVersion(latestTag, currentVersion);

    cachedUpdateInfo = {
      success: true,
      hasUpdate,
      currentVersion,
      latestVersion: latestTag,
      releaseUrl,
      downloadUrl,
      portableUrl,
      installerUrl,
      releaseName,
      releaseNotes: body,
    };

    return cachedUpdateInfo;
  } catch (err) {
    return {
      success: false,
      error: err.message || 'Ошибка подключения к GitHub',
      currentVersion,
    };
  }
}

function deactivateOverlay() {
  settingsOpen = false;
  if (overlayWindow) overlayWindow.setOpacity(config.opacity / 100);
  if (!overlayWindow) return;

  isActive = false;
  overlayWindow.webContents.send('overlay-state-changed', {
    isActive: false,
    hideMode: config.hideMode,
    hotkey: config.hotkey,
  });

  if (config.hideMode === 'clickthrough') {
    // HUD mode: remains visible, but all mouse clicks pass through into the game
    overlayWindow.show();
    overlayWindow.setIgnoreMouseEvents(true, { forward: true });
  } else {
    // Hide mode: completely hidden from screen
    overlayWindow.setIgnoreMouseEvents(true, { forward: true });
    overlayWindow.hide();
  }

  updateTrayMenu();
}

function toggleOverlay() {
  if (isActive) {
    deactivateOverlay();
  } else {
    activateOverlay();
  }
}

function registerTriggerShortcut(hotkey) {
  globalShortcut.unregisterAll();

  if (!hotkey) return false;

  try {
    const registered = globalShortcut.register(hotkey, () => {
      toggleOverlay();
    });

    if (!registered) {
      console.warn(`Failed to register trigger hotkey: ${hotkey}`);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error during globalShortcut.register:', err);
    return false;
  }
}

function applyWindowPreset(preset) {
  if (!overlayWindow) return null;
  const display = screen.getDisplayMatching(overlayWindow.getBounds());
  const bounds = presetBounds(preset, display.workArea);
  overlayWindow.setBounds(bounds);
  saveConfig(bounds);
  overlayWindow.webContents.send('settings-updated', { ...config, isActive });
  return bounds;
}

function resetPosition() {
  return applyWindowPreset('center');
}

function recoverWindowBounds() {
  if (!overlayWindow || overlayWindow.isDestroyed()) return;
  const bounds = overlayWindow.getBounds();
  const display = screen.getDisplayMatching(bounds);
  const fitted = fitBounds(bounds, display.workArea);
  overlayWindow.setBounds(fitted);
  saveConfig(fitted);
  overlayWindow.webContents.send('settings-updated', { ...config, isActive });
}

function createTray() {
  const iconPath = path.join(__dirname, 'assets', 'tray-icon.png');
  let trayIcon;
  try {
    trayIcon = nativeImage.createFromPath(iconPath);
    if (trayIcon.isEmpty()) {
      trayIcon = createDefaultTrayIcon();
    }
  } catch {
    trayIcon = createDefaultTrayIcon();
  }

  tray = new Tray(trayIcon);
  tray.setToolTip('Nimbo');
  updateTrayMenu();

  tray.on('click', () => {
    toggleOverlay();
  });
}

function createDefaultTrayIcon() {
  const size = 16;
  const canvas = Buffer.alloc(size * size * 4);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const dist = Math.sqrt((x - 8) ** 2 + (y - 8) ** 2);
      if (dist < 7) {
        canvas[idx] = 100;     // R
        canvas[idx + 1] = 140; // G
        canvas[idx + 2] = 255; // B
        canvas[idx + 3] = 255; // A
      } else {
        canvas[idx + 3] = 0;   // Transparent
      }
    }
  }

  return nativeImage.createFromBuffer(canvas, { width: size, height: size });
}

function updateTrayMenu() {
  if (!tray) return;

  const triggerLabel = isActive
    ? t(`👁️ Скрыть оверлей (${config.hotkey})`, config.language)
    : t(`👁️ Открыть оверлей (${config.hotkey})`, config.language);

  const menuTemplate = [
    {
      label: `Nimbo v${app.getVersion()}`,
      enabled: false,
    },
    { type: 'separator' },
  ];

  if (cachedUpdateInfo && cachedUpdateInfo.hasUpdate) {
    menuTemplate.push({
      label: t(`🎉 Новая версия ${cachedUpdateInfo.latestVersion}! (Скачать)`, config.language),
      click: () => {
        shell.openExternal(cachedUpdateInfo.downloadUrl || cachedUpdateInfo.releaseUrl);
      },
    });
    menuTemplate.push({ type: 'separator' });
  }

  menuTemplate.push(
    {
      label: triggerLabel,
      click: toggleOverlay,
      accelerator: config.hotkey,
    },
    {
      label: t('⚙️ Настройки...', config.language),
      click: () => {
        activateOverlay();
        if (overlayWindow) {
          overlayWindow.webContents.send('open-settings');
        }
      },
    },
    {
      label: t('🔄 Перезагрузить страницу', config.language),
      click: () => {
        if (overlayWindow) {
          overlayWindow.webContents.send('reload-webview');
        }
      },
    },
    {
      label: t('🔍 Проверить обновления', config.language),
      click: async () => {
        const info = await checkForUpdates();
        updateTrayMenu();
        if (overlayWindow) {
          activateOverlay();
          overlayWindow.webContents.send('open-settings');
          overlayWindow.webContents.send('update-check-result', info);
        }
      },
    },
    {
      label: t('📍 Сбросить размер и положение', config.language),
      click: resetPosition,
    },
    { type: 'separator' },
    {
      label: t('❌ Выход', config.language),
      click: () => {
        if (overlayWindow) {
          overlayWindow.removeAllListeners('close');
        }
        app.quit();
      },
    }
  );

  const contextMenu = Menu.buildFromTemplate(menuTemplate);
  tray.setContextMenu(contextMenu);
}

// IPC Handlers
ipcMain.handle('get-settings', () => {
  return {
    ...config,
    isActive,
  };
});

ipcMain.handle('save-settings', (event, updates) => {
  updates = { ...updates };
  if (updates.language !== undefined) updates.language = updates.language === 'en' ? 'en' : 'ru';
  if (updates.bookmarks !== undefined) updates.bookmarks = normalizeBookmarks(updates.bookmarks);
  if (updates.opacity !== undefined) updates.opacity = Math.max(20, Math.min(100, Number(updates.opacity) || 85));
  saveConfig(updates);

  if (updates.opacity !== undefined && overlayWindow) {
    overlayWindow.setOpacity(settingsOpen ? 1 : updates.opacity / 100);
  }

  if (updates.width !== undefined && updates.height !== undefined && overlayWindow) {
    const currentBounds = overlayWindow.getBounds();
    const bounds = fitBounds({ ...currentBounds, width: Number(updates.width), height: Number(updates.height) }, screen.getDisplayMatching(currentBounds).workArea);
    overlayWindow.setBounds(bounds);
    saveConfig(bounds);
  }

  if (updates.autoLaunch !== undefined) {
    setAutoLaunch(updates.autoLaunch);
  }

  if (updates.hideMode !== undefined && !isActive && overlayWindow) {
    if (updates.hideMode === 'clickthrough') {
      overlayWindow.show();
      overlayWindow.setIgnoreMouseEvents(true, { forward: true });
    } else {
      overlayWindow.setIgnoreMouseEvents(true, { forward: true });
      overlayWindow.hide();
    }
  }

  updateTrayMenu();
  return config;
});

ipcMain.handle('set-settings-open', (event, open) => {
  if (event.sender !== overlayWindow?.webContents) return;
  settingsOpen = !!open;
  overlayWindow.setOpacity(settingsOpen ? 1 : config.opacity / 100);
});

ipcMain.handle('apply-window-preset', (event, preset) => {
  if (event.sender !== overlayWindow?.webContents || !['left', 'right', 'center', 'compact'].includes(preset)) return null;
  return applyWindowPreset(preset);
});

ipcMain.handle('set-hotkey', (event, newHotkey) => {
  const previousHotkey = config.hotkey;
  const success = registerTriggerShortcut(newHotkey);

  if (success) {
    saveConfig({ hotkey: newHotkey });
    updateTrayMenu();
    return { success: true, hotkey: newHotkey };
  } else {
    // Re-register previous hotkey if new one failed
    if (previousHotkey) {
      registerTriggerShortcut(previousHotkey);
    }
    return {
      success: false,
      hotkey: previousHotkey,
      error: `Не удалось назначить горячую клавишу ${newHotkey}. Возможно, она уже используется Windows или другой программой.`,
    };
  }
});

ipcMain.handle('reset-position', () => {
  const bounds = resetPosition();
  return bounds;
});

ipcMain.handle('set-autolaunch', (event, enable) => {
  setAutoLaunch(enable);
  saveConfig({ autoLaunch: !!enable });
  return config.autoLaunch;
});

ipcMain.on('deactivate-overlay', () => {
  deactivateOverlay();
});

ipcMain.on('reload-webview', () => {
  if (overlayWindow) {
    overlayWindow.webContents.send('reload-webview');
  }
});

ipcMain.handle('get-version', () => {
  return app.getVersion();
});

ipcMain.handle('check-for-updates', async () => {
  const info = await checkForUpdates();
  updateTrayMenu();
  return info;
});

ipcMain.handle('open-external', async (event, url) => {
  if (url && typeof url === 'string' && /^https?:\/\//i.test(url)) {
    await shell.openExternal(url);
    return true;
  }
  return false;
});

// In-app updater handlers
let currentDownloadAbortController = null;
let downloadedUpdatePath = null;

ipcMain.handle('download-update', async (event, customUrl) => {
  try {
    const url = customUrl || (cachedUpdateInfo && cachedUpdateInfo.downloadUrl);
    if (!url) {
      throw new Error('Ссылка для скачивания обновления не найдена');
    }

    currentDownloadAbortController = new AbortController();
    const { signal } = currentDownloadAbortController;

    const res = await fetch(url, {
      headers: { 'User-Agent': 'Nimbo-App' },
      signal,
    });

    if (!res.ok) {
      throw new Error(`Сервер вернул код ${res.status}: ${res.statusText}`);
    }

    const totalBytes = parseInt(res.headers.get('content-length') || '0', 10);
    const parsedUrl = new URL(url);
    const rawFileName = path.basename(parsedUrl.pathname);
    const fileName = (rawFileName && rawFileName.endsWith('.exe'))
      ? rawFileName
      : `Nimbo-Setup-${cachedUpdateInfo ? cachedUpdateInfo.latestVersion : 'Update'}.exe`;
    const tempDir = app.getPath('temp');
    downloadedUpdatePath = path.join(tempDir, fileName);

    const { Readable } = require('stream');
    const nodeReadable = Readable.fromWeb(res.body);
    const fileStream = fs.createWriteStream(downloadedUpdatePath);

    let downloadedBytes = 0;
    let lastTime = Date.now();
    let bytesSinceLast = 0;
    let lastSpeed = '0.0';

    nodeReadable.on('data', (chunk) => {
      downloadedBytes += chunk.length;
      bytesSinceLast += chunk.length;

      const now = Date.now();
      if (now - lastTime >= 250) {
        const speedMBps = (bytesSinceLast / (1024 * 1024)) / ((now - lastTime) / 1000);
        lastSpeed = speedMBps.toFixed(1);
        lastTime = now;
        bytesSinceLast = 0;

        const percent = totalBytes > 0 ? Math.min(100, Math.round((downloadedBytes / totalBytes) * 100)) : 0;
        const transferredMB = (downloadedBytes / (1024 * 1024)).toFixed(1);
        const totalMB = totalBytes > 0 ? (totalBytes / (1024 * 1024)).toFixed(1) : '?';

        if (overlayWindow && !overlayWindow.isDestroyed()) {
          overlayWindow.webContents.send('download-progress', {
            status: 'downloading',
            percent,
            transferredMB,
            totalMB,
            speed: `${lastSpeed} МБ/с`,
          });
        }
      }
    });

    await new Promise((resolve, reject) => {
      fileStream.on('finish', resolve);
      fileStream.on('error', reject);
      nodeReadable.on('error', reject);
      nodeReadable.pipe(fileStream);
    });

    currentDownloadAbortController = null;

    if (overlayWindow && !overlayWindow.isDestroyed()) {
      overlayWindow.webContents.send('download-progress', {
        status: 'completed',
        percent: 100,
        filePath: downloadedUpdatePath,
      });
    }

    return { success: true, filePath: downloadedUpdatePath };
  } catch (err) {
    currentDownloadAbortController = null;
    if (err.name === 'AbortError') {
      return { success: false, cancelled: true };
    }
    return { success: false, error: err.message || 'Ошибка при загрузке файла' };
  }
});

ipcMain.handle('cancel-download', () => {
  if (currentDownloadAbortController) {
    currentDownloadAbortController.abort();
    currentDownloadAbortController = null;
    if (overlayWindow && !overlayWindow.isDestroyed()) {
      overlayWindow.webContents.send('download-progress', {
        status: 'cancelled',
      });
    }
    return true;
  }
  return false;
});

ipcMain.handle('apply-update', async () => {
  if (!downloadedUpdatePath || !fs.existsSync(downloadedUpdatePath)) {
    return { success: false, error: 'Файл обновления не найден' };
  }

  try {
    const { spawn } = require('child_process');
    if (process.platform === 'win32') {
      const child = spawn(downloadedUpdatePath, [], {
        detached: true,
        stdio: 'ignore',
      });
      await new Promise((resolve, reject) => {
        child.once('spawn', resolve);
        child.once('error', reject);
      });
      child.unref();
      overlayWindow?.removeAllListeners('close');
      app.quit();
    } else {
      const error = await shell.openPath(downloadedUpdatePath);
      if (error) throw new Error(error);
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('show-downloaded-file', () => {
  if (downloadedUpdatePath && fs.existsSync(downloadedUpdatePath)) {
    shell.showItemInFolder(downloadedUpdatePath);
    return true;
  }
  return false;
});

// App Lifecycle
app.whenReady().then(() => {
  createOverlayWindow();
  screen.on('display-removed', recoverWindowBounds);
  screen.on('display-metrics-changed', recoverWindowBounds);
  registerTriggerShortcut(config.hotkey);
  createTray();
  setAutoLaunch(config.autoLaunch);

  // Background check for updates after startup
  setTimeout(async () => {
    const info = await checkForUpdates();
    if (info && info.hasUpdate) {
      updateTrayMenu();
      if (overlayWindow && !overlayWindow.isDestroyed()) {
        overlayWindow.webContents.send('update-available', info);
      }
    } else if (overlayWindow && !overlayWindow.isDestroyed()) {
      overlayWindow.webContents.send('update-check-result', info);
    }
  }, 3500);
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  // Keep running in tray
});

// Single instance prevention
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    activateOverlay();
  });
}
