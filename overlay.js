const { t, setText, getSource } = window.overlayI18n;
window.overlayI18n.capture(document);

// DOM Elements
const statusBadge = document.getElementById('status-badge');
const opacityBadge = document.getElementById('opacity-badge');
const notification = document.getElementById('notification');
const notificationText = document.getElementById('notification-text');
const siteFrame = document.getElementById('site-frame');
const welcomeDialog = document.getElementById('welcome-dialog');

// Title Bar Buttons
const btnSettings = document.getElementById('btn-settings');
const btnReload = document.getElementById('btn-reload');
const btnClose = document.getElementById('btn-close');

// Modal Elements
const settingsModal = document.getElementById('settings-modal');
const btnModalClose = document.getElementById('btn-modal-close');
const btnModalDone = document.getElementById('btn-modal-done');

// Setting Controls
const hotkeyRecordBtn = document.getElementById('hotkey-record-btn');
const hotkeyBtnText = document.getElementById('hotkey-btn-text');
const hotkeyRecordHint = document.getElementById('hotkey-record-hint');
const presetKeys = document.querySelectorAll('.preset-key');
const { normalizeUrl, normalizeBookmarks } = window.overlayUtils;

const modeRadios = document.querySelectorAll('input[name="hideMode"]');
const opacitySlider = document.getElementById('opacity-slider');
const opacitySliderVal = document.getElementById('opacity-slider-val');

const inputWidth = document.getElementById('input-width');
const inputHeight = document.getElementById('input-height');
const btnApplySize = document.getElementById('btn-apply-size');
const btnResetPos = document.getElementById('btn-reset-pos');

const inputUrl = document.getElementById('input-url');
const btnSaveUrl = document.getElementById('btn-save-url');

const chkAutoLaunch = document.getElementById('chk-autolaunch');
const chkNotifications = document.getElementById('chk-notifications');

// Update Elements
const btnUpdateBadge = document.getElementById('btn-update-badge');
const appVersionLabel = document.getElementById('app-version-label');
const updateStatusText = document.getElementById('update-status-text');
const btnCheckUpdates = document.getElementById('btn-check-updates');

const updateProgressContainer = document.getElementById('update-progress-container');
const updateProgressLabel = document.getElementById('update-progress-label');
const updateProgressPercent = document.getElementById('update-progress-percent');
const updateProgressFill = document.getElementById('update-progress-fill');
const updateProgressDetails = document.getElementById('update-progress-details');
const updateProgressSpeed = document.getElementById('update-progress-speed');

const btnStartDownload = document.getElementById('btn-start-download');
const btnCancelDownload = document.getElementById('btn-cancel-download');
const btnInstallRestart = document.getElementById('btn-install-restart');
const btnShowInFolder = document.getElementById('btn-show-in-folder');
const btnOpenRelease = document.getElementById('btn-open-release');

// State
let currentSettings = {
  hotkey: 'F2',
  hideMode: 'hide',
  opacity: 85,
  url: '',
  width: 1280,
  height: 720,
  showNotifications: true,
  autoLaunch: false,
  language: 'ru',
  bookmarks: normalizeBookmarks(),
};

let isRecordingHotkey = false;
let notificationTimeout = null;

// ============ Notification Toast ============
function showNotification(text, duration = 2200) {
  if (!currentSettings.showNotifications && !text.includes('Ошибка')) return;

  setText(notificationText, text);
  notification.classList.remove('hidden');
  notification.classList.add('visible');

  if (notificationTimeout) clearTimeout(notificationTimeout);
  notificationTimeout = setTimeout(() => {
    notification.classList.remove('visible');
    notification.classList.add('hidden');
  }, duration);
}

// ============ UI Update Functions ============
function updateStatusBadge(isActive, hotkey, hideMode) {
  const keyLabel = hotkey || currentSettings.hotkey || 'F2';
  if (isActive) {
    setText(statusBadge, `Мышь активна [${keyLabel}]`);
    statusBadge.className = 'badge active';
    statusBadge.title = t(`Нажмите ${keyLabel} или Esc, чтобы вернуть управление в игру`);
  } else {
    setText(statusBadge, `HUD [${keyLabel}]`);
    statusBadge.className = 'badge hud';
    statusBadge.title = t(`Нажмите ${keyLabel}, чтобы захватить мышь`);
  }
}

function updateOpacityUI(value) {
  setText(opacityBadge, `${value}%`);
  setText(opacitySliderVal, `${value}%`);
  opacitySlider.value = value;
  document.getElementById('quick-opacity-slider').value = value;
  setText(document.getElementById('quick-opacity-value'), `${value}%`);
}

function populateSettingsUI(settings) {
  const previousUrl = currentSettings.url;
  currentSettings = { ...currentSettings, ...settings };
  window.overlayI18n.setLanguage(currentSettings.language);
  document.getElementById('language-select').value = currentSettings.language;
  document.getElementById('welcome-language').value = currentSettings.language;
  document.getElementById('welcome-hotkey').textContent = currentSettings.hotkey;

  // Hotkey
  setText(hotkeyBtnText, currentSettings.hotkey);

  // Status Badge
  updateStatusBadge(currentSettings.isActive ?? true, currentSettings.hotkey, currentSettings.hideMode);

  // Hide Mode
  modeRadios.forEach((radio) => {
    radio.checked = radio.value === currentSettings.hideMode;
  });

  // Opacity
  updateOpacityUI(currentSettings.opacity);

  // Dimensions
  if (currentSettings.width) inputWidth.value = currentSettings.width;
  if (currentSettings.height) inputHeight.value = currentSettings.height;

  // URL & iframe
  if (currentSettings.url) {
    inputUrl.value = currentSettings.url;
    if (siteFrame.src === 'about:blank' || previousUrl !== currentSettings.url) {
      siteFrame.src = currentSettings.url;
    }
  }

  renderBookmarks();

  // Checkboxes
  chkAutoLaunch.checked = !!currentSettings.autoLaunch;
  chkNotifications.checked = currentSettings.showNotifications !== false;
}

// ============ Hotkey Recording ============
function startRecordingHotkey() {
  if (isRecordingHotkey) return;
  isRecordingHotkey = true;
  hotkeyRecordBtn.classList.add('recording');
  setText(hotkeyBtnText, 'Нажмите клавишу...');
  setText(hotkeyRecordHint, 'Нажмите любую клавишу или комбинацию (Esc для отмены)');
}

function stopRecordingHotkey() {
  if (!isRecordingHotkey) return;
  isRecordingHotkey = false;
  hotkeyRecordBtn.classList.remove('recording');
  setText(hotkeyBtnText, currentSettings.hotkey);
  setText(hotkeyRecordHint, 'Нажмите на кнопку выше, чтобы изменить клавишу');
}

function parseKeyEventToAccelerator(e) {
  if (e.key === 'Escape') {
    return { isEscape: true };
  }

  if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) {
    return { isModifierOnly: true };
  }

  const modifiers = [];
  if (e.ctrlKey) modifiers.push('Ctrl');
  if (e.altKey) modifiers.push('Alt');
  if (e.shiftKey) modifiers.push('Shift');
  if (e.metaKey) modifiers.push('Super');

  let key = '';

  // Function keys F1 - F24
  if (/^F([1-9]|1[0-9]|2[0-4])$/i.test(e.code) || /^F([1-9]|1[0-9]|2[0-4])$/i.test(e.key)) {
    key = e.code.startsWith('F') ? e.code : e.key;
  }
  // Standard letters: using e.code avoids issues with Russian keyboard layouts
  else if (e.code.startsWith('Key')) {
    key = e.code.slice(3).toUpperCase();
  }
  // Digit keys
  else if (e.code.startsWith('Digit')) {
    key = e.code.slice(5);
  }
  // Numpad digits
  else if (e.code.startsWith('Numpad')) {
    const np = e.code.slice(6);
    key = /^\d$/.test(np) ? `num${np}` : np;
  }
  // Special keys mapping
  else {
    const specialMap = {
      Backquote: '`',
      Space: 'Space',
      Tab: 'Tab',
      Minus: '-',
      Equal: '=',
      BracketLeft: '[',
      BracketRight: ']',
      Backslash: '\\',
      Semicolon: ';',
      Quote: '\'',
      Comma: ',',
      Period: '.',
      Slash: '/',
      Insert: 'Insert',
      Delete: 'Delete',
      Home: 'Home',
      End: 'End',
      PageUp: 'PageUp',
      PageDown: 'PageDown',
      ArrowUp: 'Up',
      ArrowDown: 'Down',
      ArrowLeft: 'Left',
      ArrowRight: 'Right',
      ScrollLock: 'ScrollLock',
      Pause: 'Pause',
      PrintScreen: 'PrintScreen',
    };

    if (specialMap[e.code]) {
      key = specialMap[e.code];
    } else {
      key = e.key.length === 1 ? e.key.toUpperCase() : e.key;
    }
  }

  return { accelerator: [...modifiers, key].join('+') };
}

async function applyNewHotkey(accelerator) {
  if (!accelerator) return;

  const result = await window.overlayAPI.setHotkey(accelerator);
  if (result.success) {
    currentSettings.hotkey = result.hotkey;
    setText(hotkeyBtnText, result.hotkey);
    updateStatusBadge(true, result.hotkey, currentSettings.hideMode);
    showNotification(`Клавиша триггера установлена: [${result.hotkey}]`);
  } else {
    showNotification(result.error || 'Ошибка при установке клавиши', 3500);
    setText(hotkeyBtnText, currentSettings.hotkey);
  }
  stopRecordingHotkey();
}

// Global key listener for recording hotkeys & Esc to close
window.addEventListener('keydown', (e) => {
  if (isRecordingHotkey) {
    e.preventDefault();
    e.stopPropagation();

    const parsed = parseKeyEventToAccelerator(e);
    if (parsed.isEscape) {
      stopRecordingHotkey();
      return;
    }
    if (parsed.isModifierOnly) {
      return;
    }
    if (parsed.accelerator) {
      applyNewHotkey(parsed.accelerator);
    }
    return;
  }

  // If not recording, Esc deactivates the overlay or closes settings modal
  if (e.key === 'Escape') {
    if (welcomeDialog.open) return; // Let the dialog's cancel handler finish the guide.
    if (!document.getElementById('opacity-popover').classList.contains('hidden')) {
      e.preventDefault();
      e.stopPropagation();
      closeOpacityPopover();
      opacityBadge.focus();
      return;
    }
    if (!settingsModal.classList.contains('hidden')) {
      closeSettingsModal();
    } else {
      window.overlayAPI.deactivate();
    }
  }
}, true);

// ============ Settings Modal Open/Close ============
let settingsReturnFocus = null;
function openSettingsModal(page) {
  if (welcomeDialog.open) welcomeDialog.close();
  if (settingsModal.classList.contains('hidden')) settingsReturnFocus = document.activeElement;
  settingsModal.classList.remove('hidden');
  document.getElementById('main-content').inert = true;
  document.getElementById('title-bar').inert = true;
  document.getElementById('bookmarks-bar').inert = true;
  closeOpacityPopover();
  if (typeof page === 'string') selectSettingsTab(page);
  window.overlayAPI.setSettingsOpen(true);
  document.querySelector('.settings-tabs [aria-selected="true"]').focus();
}

function closeSettingsModal() {
  stopRecordingHotkey();
  settingsModal.classList.add('hidden');
  document.getElementById('main-content').inert = false;
  document.getElementById('title-bar').inert = false;
  document.getElementById('bookmarks-bar').inert = false;
  window.overlayAPI.setSettingsOpen(false);
  settingsReturnFocus?.focus();
}

btnSettings.addEventListener('click', () => {
  if (settingsModal.classList.contains('hidden')) {
    openSettingsModal();
  } else {
    closeOpacityPopover();
    closeSettingsModal();
  }
});

btnModalClose.addEventListener('click', closeSettingsModal);
btnModalDone.addEventListener('click', closeSettingsModal);

settingsModal.addEventListener('click', (e) => {
  if (e.target === settingsModal) {
    closeSettingsModal();
  }
});

// Titlebar buttons
btnClose.addEventListener('click', () => {
  window.overlayAPI.deactivate();
});

btnReload.addEventListener('click', () => {
  siteFrame.src = currentSettings.url || 'about:blank';
  showNotification('Перезагрузка страницы...');
});

// Hotkey recorder button
hotkeyRecordBtn.addEventListener('click', () => {
  if (isRecordingHotkey) {
    stopRecordingHotkey();
  } else {
    startRecordingHotkey();
  }
});

// Hotkey Presets
presetKeys.forEach((btn) => {
  btn.addEventListener('click', () => {
    const key = btn.getAttribute('data-key');
    applyNewHotkey(key);
  });
});

// Hide Mode
modeRadios.forEach((radio) => {
  radio.addEventListener('change', async (e) => {
    if (e.target.checked) {
      const mode = e.target.value;
      currentSettings.hideMode = mode;
      await window.overlayAPI.saveSettings({ hideMode: mode });
      showNotification(
        mode === 'hide'
          ? 'Режим: Полное скрытие оверлея'
          : 'Режим: Сквозной HUD поверх игры'
      );
    }
  });
});

// Opacity Slider
opacitySlider.addEventListener('input', (e) => {
  setOpacity(Number(e.target.value));
});

// Size and Position
btnApplySize.addEventListener('click', async () => {
  const width = Math.max(320, Math.min(2560, Number(inputWidth.value) || 1280));
  const height = Math.max(320, Math.min(1440, Number(inputHeight.value) || 720));

  inputWidth.value = width;
  inputHeight.value = height;

  const saved = await window.overlayAPI.saveSettings({ width, height });
  currentSettings = { ...currentSettings, ...saved };
  inputWidth.value = saved.width;
  inputHeight.value = saved.height;
  showNotification(`Размер окна изменен: ${saved.width}×${saved.height}`);
});

btnResetPos.addEventListener('click', async () => {
  const bounds = await window.overlayAPI.resetPosition();
  if (bounds) {
    inputWidth.value = bounds.width;
    inputHeight.value = bounds.height;
  }
  showNotification('Позиция и размер сброшены');
});

// URL — open button
btnSaveUrl.addEventListener('click', async () => {
  try {
    await navigateTo(inputUrl.value);
    closeSettingsModal();
  } catch (error) {
    setText(document.getElementById('bookmark-error'), error.message || 'Проверьте адрес сайта');
  }
});

// Also allow pressing Enter in URL input to navigate
inputUrl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    btnSaveUrl.click();
  }
});

// Checkboxes
chkAutoLaunch.addEventListener('change', async (e) => {
  const val = e.target.checked;
  currentSettings.autoLaunch = val;
  await window.overlayAPI.setAutoLaunch(val);
  showNotification(val ? 'Автозапуск с Windows включен' : 'Автозапуск отключен');
});

chkNotifications.addEventListener('change', async (e) => {
  const val = e.target.checked;
  currentSettings.showNotifications = val;
  await window.overlayAPI.saveSettings({ showNotifications: val });
  if (val) {
    showNotification('Уведомления включены');
  }
});

// ============ Updates Management ============
let currentUpdateInfo = null;

function renderUpdateInfo(info) {
  if (!info) return;
  currentUpdateInfo = info;

  if (info.currentVersion && appVersionLabel) {
    setText(appVersionLabel, `Текущая версия: v${info.currentVersion}`);
  }

  if (!info.success && info.error) {
    if (updateStatusText) {
      setText(updateStatusText, `${info.error}`);
      updateStatusText.className = 'update-status-text error';
    }
    if (btnStartDownload) btnStartDownload.classList.add('hidden');
    if (btnCancelDownload) btnCancelDownload.classList.add('hidden');
    if (btnInstallRestart) btnInstallRestart.classList.add('hidden');
    if (btnShowInFolder) btnShowInFolder.classList.add('hidden');
    if (btnOpenRelease) btnOpenRelease.classList.add('hidden');
    if (updateProgressContainer) updateProgressContainer.classList.add('hidden');
    return;
  }

  if (info.hasUpdate) {
    if (updateStatusText) {
      setText(updateStatusText, `Доступна новая версия: ${info.latestVersion}`);
      updateStatusText.className = 'update-status-text has-update';
    }

    if (btnUpdateBadge) {
      btnUpdateBadge.classList.remove('hidden');
      setText(btnUpdateBadge, `Доступно ${info.latestVersion}`);
    }

    if (btnStartDownload) {
      btnStartDownload.classList.remove('hidden');
      btnStartDownload.disabled = false;
      setText(btnStartDownload, `Скачать установщик ${info.latestVersion}`);
    }

    if (btnOpenRelease) {
      if (info.releaseUrl) {
        btnOpenRelease.classList.remove('hidden');
        btnOpenRelease.onclick = () => window.overlayAPI.openExternal(info.releaseUrl);
      }
    }

    if (btnCancelDownload) btnCancelDownload.classList.add('hidden');
    if (btnInstallRestart) btnInstallRestart.classList.add('hidden');
    if (btnShowInFolder) btnShowInFolder.classList.add('hidden');
    if (updateProgressContainer) updateProgressContainer.classList.add('hidden');

    showNotification(`Доступно обновление ${info.latestVersion}! Откройте настройки для скачивания`, 4000);
  } else {
    if (updateStatusText) {
      setText(updateStatusText, `У вас установлена актуальная версия (v${info.currentVersion || ''})`);
      updateStatusText.className = 'update-status-text';
    }
    if (btnStartDownload) btnStartDownload.classList.add('hidden');
    if (btnCancelDownload) btnCancelDownload.classList.add('hidden');
    if (btnInstallRestart) btnInstallRestart.classList.add('hidden');
    if (btnShowInFolder) btnShowInFolder.classList.add('hidden');
    if (btnOpenRelease) btnOpenRelease.classList.add('hidden');
    if (btnUpdateBadge) btnUpdateBadge.classList.add('hidden');
    if (updateProgressContainer) updateProgressContainer.classList.add('hidden');
  }
}

if (btnCheckUpdates) {
  btnCheckUpdates.addEventListener('click', async () => {
    btnCheckUpdates.disabled = true;
    const oldText = getSource(btnCheckUpdates);
    setText(btnCheckUpdates, 'Проверка...');
    if (updateStatusText) {
      setText(updateStatusText, 'Проверяем релизы на GitHub...');
      updateStatusText.className = 'update-status-text';
    }

    try {
      const info = await window.overlayAPI.checkForUpdates();
      renderUpdateInfo(info);
      if (!info.hasUpdate && info.success) {
        showNotification('У вас установлена актуальная версия');
      }
    } catch (err) {
      if (updateStatusText) {
        setText(updateStatusText, `Ошибка: ${err.message}`);
        updateStatusText.className = 'update-status-text error';
      }
    } finally {
      btnCheckUpdates.disabled = false;
      setText(btnCheckUpdates, oldText);
    }
  });
}

// In-App Direct Download Actions
if (btnStartDownload) {
  btnStartDownload.addEventListener('click', async () => {
    if (!currentUpdateInfo || !currentUpdateInfo.downloadUrl) {
      showNotification('Ссылка для загрузки не найдена');
      return;
    }

    btnStartDownload.classList.add('hidden');
    btnCheckUpdates.disabled = true;
    if (btnCancelDownload) btnCancelDownload.classList.remove('hidden');
    if (updateProgressContainer) updateProgressContainer.classList.remove('hidden');

    setText(updateProgressPercent, '0%');
    updateProgressFill.style.width = '0%';
    setText(updateProgressDetails, 'Подключение к GitHub...');
    setText(updateProgressSpeed, '');
    setText(updateStatusText, 'Загрузка обновления...');
    updateStatusText.className = 'update-status-text';

    try {
      const res = await window.overlayAPI.downloadUpdate(currentUpdateInfo.downloadUrl);
      if (!res.success && !res.cancelled) {
        throw new Error(res.error || 'Ошибка скачивания файла');
      }
    } catch (err) {
      setText(updateStatusText, `${err.message}`);
      updateStatusText.className = 'update-status-text error';
      btnStartDownload.classList.remove('hidden');
      if (btnCancelDownload) btnCancelDownload.classList.add('hidden');
      if (updateProgressContainer) updateProgressContainer.classList.add('hidden');
    } finally {
      btnCheckUpdates.disabled = false;
    }
  });
}

if (btnCancelDownload) {
  btnCancelDownload.addEventListener('click', async () => {
    await window.overlayAPI.cancelDownload();
    if (updateProgressContainer) updateProgressContainer.classList.add('hidden');
    if (btnCancelDownload) btnCancelDownload.classList.add('hidden');
    if (btnStartDownload) btnStartDownload.classList.remove('hidden');
    setText(updateStatusText, 'Загрузка отменена.');
    showNotification('Загрузка обновления отменена');
  });
}

if (btnInstallRestart) {
  btnInstallRestart.addEventListener('click', async () => {
    const res = await window.overlayAPI.applyUpdate();
    if (!res.success) {
      showNotification(`${res.error || 'Не удалось применить обновление'}`);
    }
  });
}

if (btnShowInFolder) {
  btnShowInFolder.addEventListener('click', async () => {
    await window.overlayAPI.showDownloadedFile();
  });
}

// Download progress listener from main process
window.overlayAPI.onDownloadProgress((data) => {
  if (data.status === 'downloading') {
    if (updateProgressContainer) updateProgressContainer.classList.remove('hidden');
    setText(updateProgressPercent, `${data.percent}%`);
    updateProgressFill.style.width = `${data.percent}%`;
    setText(updateProgressDetails, `${data.transferredMB} МБ / ${data.totalMB} МБ`);
    setText(updateProgressSpeed, data.speed);
  } else if (data.status === 'completed') {
    setText(updateProgressPercent, '100%');
    updateProgressFill.style.width = '100%';
    setText(updateStatusText, 'Обновление скачано и готово к установке');
    updateStatusText.className = 'update-status-text has-update';

    if (btnCancelDownload) btnCancelDownload.classList.add('hidden');
    if (btnStartDownload) btnStartDownload.classList.add('hidden');
    if (btnInstallRestart) btnInstallRestart.classList.remove('hidden');
    if (btnShowInFolder) btnShowInFolder.classList.remove('hidden');

    showNotification('Установщик готов! Нажмите «Запустить установщик»', 5000);
  } else if (data.status === 'cancelled') {
    if (updateProgressContainer) updateProgressContainer.classList.add('hidden');
    if (btnCancelDownload) btnCancelDownload.classList.add('hidden');
    if (btnStartDownload) btnStartDownload.classList.remove('hidden');
  }
});

if (btnUpdateBadge) {
  btnUpdateBadge.addEventListener('click', () => {
    openSettingsModal('updates');
    const section = document.getElementById('section-updates');
    if (section) {
      section.scrollIntoView({ behavior: 'smooth' });
    }
  });
}

// ============ IPC Subscriptions ============
window.overlayAPI.onOverlayStateChanged(({ isActive, hideMode, hotkey }) => {
  currentSettings.isActive = isActive;
  if (hotkey) currentSettings.hotkey = hotkey;
  if (hideMode) currentSettings.hideMode = hideMode;

  updateStatusBadge(isActive, currentSettings.hotkey, currentSettings.hideMode);

  if (isActive) {
    showNotification(`Оверлей активен (${currentSettings.hotkey} — скрыть)`);
  } else {
    if (welcomeDialog.open) welcomeDialog.close();
    closeOpacityPopover();
    closeSettingsModal();
    if (currentSettings.hideMode === 'clickthrough') {
      showNotification('Мышь освобождена — клики идут в игру');
    }
  }
});

window.overlayAPI.onSettingsUpdated((settings) => {
  populateSettingsUI(settings);
});

window.overlayAPI.onOpenSettings(() => {
  openSettingsModal();
});

window.overlayAPI.onReloadWebview(() => {
  siteFrame.src = currentSettings.url || 'about:blank';
  showNotification('Перезагрузка страницы...');
});

window.overlayAPI.onUpdateAvailable((info) => {
  renderUpdateInfo(info);
});

window.overlayAPI.onUpdateCheckResult((info) => {
  renderUpdateInfo(info);
});

// ============ Quick controls and settings navigation ============
function selectSettingsTab(name) {
  stopRecordingHotkey();
  document.querySelectorAll('[data-tab]').forEach(tab => {
    const active = tab.dataset.tab === name;
    tab.setAttribute('aria-selected', String(active));
    tab.tabIndex = active ? 0 : -1;
    document.getElementById(`panel-${tab.dataset.tab}`).classList.toggle('hidden', !active);
  });
  document.querySelector('.modal-body').scrollTop = 0;
}
document.querySelectorAll('[data-tab]').forEach((tab, index, tabs) => {
  tab.addEventListener('click', () => selectSettingsTab(tab.dataset.tab));
  tab.addEventListener('keydown', event => {
    let next;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % tabs.length;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index + tabs.length - 1) % tabs.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = tabs.length - 1;
    if (next === undefined) return;
    event.preventDefault();
    selectSettingsTab(tabs[next].dataset.tab);
    tabs[next].focus();
  });
});
settingsModal.addEventListener('keydown', event => {
  if (event.key !== 'Tab') return;
  const controls = [...settingsModal.querySelectorAll('button, input, select, a[href], [tabindex="0"]')]
    .filter(element => !element.disabled && element.tabIndex >= 0 && element.getClientRects().length);
  const first = controls[0], last = controls[controls.length - 1];
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
});
function closeOpacityPopover() {
  document.getElementById('opacity-popover').classList.add('hidden');
  opacityBadge.setAttribute('aria-expanded', 'false');
}
opacityBadge.addEventListener('click', () => {
  const popover = document.getElementById('opacity-popover');
  const opening = popover.classList.contains('hidden');
  popover.classList.toggle('hidden', !opening);
  opacityBadge.setAttribute('aria-expanded', String(opening));
  if (opening) document.getElementById('quick-opacity-slider').focus();
});
document.addEventListener('pointerdown', event => {
  if (!event.target.closest('#quick-opacity')) closeOpacityPopover();
});
document.getElementById('quick-opacity').addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    event.preventDefault();
    closeOpacityPopover();
    opacityBadge.focus();
  }
});
function setOpacity(value) {
  currentSettings.opacity = value;
  updateOpacityUI(value);
  window.overlayAPI.saveSettings({ opacity: value });
}
document.getElementById('quick-opacity-slider').addEventListener('input', event => setOpacity(Number(event.target.value)));
document.querySelectorAll('[data-window-preset]').forEach(button => {
  button.addEventListener('click', async () => {
    const bounds = await window.overlayAPI.applyWindowPreset(button.dataset.windowPreset);
    if (!bounds) return;
    inputWidth.value = bounds.width;
    inputHeight.value = bounds.height;
    showNotification(`Положение: ${t({left: 'Слева', right: 'Справа', center: 'По центру', compact: 'Компактное'}[button.dataset.windowPreset])}`);
  });
});

// ============ Personal bookmarks ============
let editingBookmark = null;
const bookmarkName = document.getElementById('bookmark-name');
const bookmarkUrl = document.getElementById('bookmark-url');
const bookmarkError = document.getElementById('bookmark-error');
function resetBookmarkEditor() {
  editingBookmark = null;
  document.getElementById('bookmark-form').reset();
  setText(document.getElementById('btn-save-bookmark'), 'Добавить');
  document.getElementById('btn-cancel-bookmark').classList.add('hidden');
  setText(bookmarkError, '');
}
async function navigateTo(value) {
  const url = normalizeUrl(value);
  await window.overlayAPI.saveSettings({ url });
  currentSettings.url = url;
  inputUrl.value = url;
  siteFrame.src = url;
  renderBookmarks();
}
async function saveBookmarks(items) {
  const bookmarks = normalizeBookmarks(items);
  await window.overlayAPI.saveSettings({ bookmarks });
  currentSettings.bookmarks = bookmarks;
  renderBookmarks();
}
function renderBookmarks() {
  const shortcuts = document.getElementById('bookmark-shortcuts');
  const list = document.getElementById('bookmark-list');
  shortcuts.replaceChildren();
  list.replaceChildren();
  const bookmarks = normalizeBookmarks(currentSettings.bookmarks);
  let activeUrl;
  try { activeUrl = normalizeUrl(currentSettings.url); } catch { activeUrl = ''; }
  bookmarks.forEach((bookmark, index) => {
    const shortcut = document.createElement('button');
    shortcut.className = 'bookmark-shortcut dock-item';
    shortcut.setAttribute('aria-label', bookmark.name);
    const number = document.createElement('span'); number.className = 'bookmark-number'; number.textContent = String(index + 1).padStart(2, '0'); number.setAttribute('aria-hidden', 'true');
    const label = document.createElement('span'); label.className = 'bookmark-label'; label.textContent = bookmark.name;
    shortcut.append(number, label);
    shortcut.title = bookmark.url;
    shortcut.setAttribute('aria-current', bookmark.url === activeUrl ? 'page' : 'false');
    shortcut.addEventListener('click', () => navigateTo(bookmark.url).catch(error => showNotification(error.message)));
    shortcuts.append(shortcut);
    const row = document.createElement('div');
    row.className = 'bookmark-row';
    const info = document.createElement('div');
    const name = document.createElement('strong'); name.textContent = bookmark.name;
    const address = document.createElement('span'); address.textContent = bookmark.url;
    info.append(name, address);
    const edit = document.createElement('button');
    edit.className = 'toolbar-button'; setText(edit, 'Изменить');
    edit.setAttribute('aria-label', t(`Изменить ${bookmark.name}`));
    edit.addEventListener('click', () => {
      editingBookmark = index;
      bookmarkName.value = bookmark.name; bookmarkUrl.value = bookmark.url;
      setText(document.getElementById('btn-save-bookmark'), 'Сохранить');
      document.getElementById('btn-cancel-bookmark').classList.remove('hidden');
      bookmarkName.focus();
    });
    const remove = document.createElement('button');
    remove.className = 'toolbar-button'; setText(remove, '×');
    remove.setAttribute('aria-label', t(`Удалить ${bookmark.name}`));
    remove.addEventListener('click', async () => {
      try {
        await saveBookmarks(bookmarks.filter((_, i) => i !== index));
        resetBookmarkEditor();
        document.getElementById('btn-bookmark-current').focus();
      } catch { setText(bookmarkError, 'Не удалось сохранить закладки'); }
    });
    row.append(info, edit, remove); list.append(row);
  });
  if (!bookmarks.length) {
    const empty = document.createElement('span');
    empty.className = 'setting-desc'; setText(empty, 'Добавьте любимые сайты через ＋'); shortcuts.append(empty);
    const hint = document.createElement('p'); hint.className = 'bookmark-empty';
    setText(hint, 'Здесь появятся ваши любимые сайты. Добавьте первую закладку выше.'); list.append(hint);
  }
}
document.getElementById('bookmark-form').addEventListener('submit', async event => {
  event.preventDefault();
  try {
    const url = normalizeUrl(bookmarkUrl.value);
    const bookmarks = normalizeBookmarks(currentSettings.bookmarks);
    if (bookmarks.some((bookmark, index) => bookmark.url === url && index !== editingBookmark)) throw new Error('Этот адрес уже есть в закладках');
    if (editingBookmark === null && bookmarks.length >= 30) throw new Error('Можно сохранить до 30 закладок');
    const bookmark = { name: bookmarkName.value.trim() || new URL(url).hostname, url };
    if (editingBookmark === null) bookmarks.push(bookmark);
    else bookmarks[editingBookmark] = bookmark;
    await saveBookmarks(bookmarks);
    resetBookmarkEditor();
    bookmarkName.focus();
  } catch (error) { setText(bookmarkError, error.message || 'Не удалось сохранить закладку'); }
});
document.getElementById('btn-cancel-bookmark').addEventListener('click', resetBookmarkEditor);
document.getElementById('btn-bookmark-current').addEventListener('click', () => {
  resetBookmarkEditor();
  bookmarkUrl.value = currentSettings.url;
  try { bookmarkName.value = new URL(currentSettings.url).hostname.replace(/^www\./, ''); } catch {}
  bookmarkName.focus();
});
document.getElementById('btn-manage-bookmarks').addEventListener('click', () => {
  openSettingsModal('general');
  document.getElementById('btn-bookmark-current').click();
});

async function changeLanguage(event) {
  const language = event.target.value;
  try {
    await window.overlayAPI.saveSettings({ language });
    stopRecordingHotkey();
    populateSettingsUI({ language });
  } catch (error) {
    event.target.value = currentSettings.language;
    showNotification(error.message);
  }
}
document.getElementById('language-select').addEventListener('change', changeLanguage);
document.getElementById('welcome-language').addEventListener('change', changeLanguage);

function showWelcome() {
  document.getElementById('welcome-autolaunch').checked = !!currentSettings.autoLaunch;
  document.getElementById('welcome-hotkey').textContent = currentSettings.hotkey;
  setText(document.getElementById('welcome-error'), '');
  window.overlayAPI.setSettingsOpen(true);
  if (!welcomeDialog.open) welcomeDialog.showModal();
  document.getElementById('btn-welcome-start').focus({ preventScroll: true });
  welcomeDialog.scrollTop = 0;
}

async function finishWelcome(configure) {
  const buttons = welcomeDialog.querySelectorAll('button');
  buttons.forEach(button => { button.disabled = true; });
  try {
    const saved = await window.overlayAPI.saveSettings({
      onboardingComplete: true,
      autoLaunch: document.getElementById('welcome-autolaunch').checked,
    });
    populateSettingsUI(saved);
    welcomeDialog.close();
    if (configure) openSettingsModal('general');
    else {
      window.overlayAPI.setSettingsOpen(false);
      btnSettings.focus();
    }
  } catch {
    setText(document.getElementById('welcome-error'), 'Не удалось сохранить настройки. Попробуйте ещё раз.');
  } finally {
    buttons.forEach(button => { button.disabled = false; });
  }
}
document.getElementById('btn-welcome-start').addEventListener('click', () => finishWelcome(false));
document.getElementById('btn-welcome-settings').addEventListener('click', () => finishWelcome(true));
welcomeDialog.addEventListener('cancel', event => {
  event.preventDefault();
  if (!document.getElementById('btn-welcome-start').disabled) finishWelcome(false);
});
document.getElementById('btn-show-welcome').addEventListener('click', () => {
  closeSettingsModal();
  showWelcome();
});

// Community links always leave the embedded site and open in the user's browser.
document.querySelectorAll('[data-community-link]').forEach(link => {
  link.addEventListener('click', async event => {
    event.preventDefault();
    try {
      if (!await window.overlayAPI.openExternal(link.href)) throw new Error();
    } catch {
      showNotification('Не удалось открыть Telegram. Попробуйте ещё раз.');
    }
  });
});

// ============ Initialization ============
async function init() {
  const [settings, appVersion] = await Promise.all([
    window.overlayAPI.getSettings(),
    window.overlayAPI.getVersion(),
  ]);
  populateSettingsUI(settings);

  if (appVersionLabel && appVersion) {
    setText(appVersionLabel, `Текущая версия: v${appVersion}`);
  }

  if (!settings.onboardingComplete) showWelcome();
  else setTimeout(() => {
    showNotification(`Оверлей готов! Нажмите [${settings.hotkey || 'F2'}] для вызова в игре`, 3500);
  }, 1000);
}

init();

// Dock magnification uses layout coordinates so scaling never moves hit targets.
const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
const hoverCapability = window.matchMedia('(hover: hover) and (pointer: fine)');
const dockGroups = document.querySelectorAll('#title-bar-controls, .presets-buttons');
const resetDock = () => dockGroups.forEach((group) => {
  group.querySelectorAll('button').forEach((button) => {
    button.style.removeProperty('--dock-scale');
  });
});

dockGroups.forEach((group) => {
  group.querySelectorAll('button').forEach((button) => button.classList.add('dock-item'));
  group.addEventListener('pointermove', (event) => {
    if (motionPreference.matches || !hoverCapability.matches || event.pointerType === 'touch') return;
    const bounds = group.getBoundingClientRect();
    const x = event.clientX - bounds.left + group.scrollLeft;
    const y = event.clientY - bounds.top + group.scrollTop;
    group.querySelectorAll('button').forEach((button) => {
      // offsetLeft/Top are unaffected by the visual scale applied below.
      const distance = Math.hypot(x - button.offsetLeft - button.offsetWidth / 2,
        y - button.offsetTop - button.offsetHeight / 2);
      const influence = Math.max(0, 1 - distance / 90);
      button.style.setProperty('--dock-scale', button.disabled ? 1 : 1 + 0.06 * influence * influence);
    });
  });
  group.addEventListener('pointerleave', resetDock);
  group.addEventListener('pointerout', event => {
    if (!group.contains(event.relatedTarget)) resetDock();
  });
  group.addEventListener('pointercancel', resetDock);
});
motionPreference.addEventListener('change', resetDock);
hoverCapability.addEventListener('change', resetDock);
window.addEventListener('blur', resetDock);
siteFrame.addEventListener('pointerenter', resetDock);
siteFrame.addEventListener('focus', resetDock);
document.addEventListener('visibilitychange', resetDock);
window.overlayAPI.onOverlayStateChanged(resetDock);
