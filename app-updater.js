// The controller only accepts updates resolved by electron-updater's configured
// provider. The renderer never supplies a download URL or executable path.
function createUpdateController({ updater, currentVersion, onState = () => {}, beforeInstall = () => {}, onInstallError = () => {} }) {
  let state = {
    success: true,
    supported: !!updater,
    status: updater ? 'idle' : 'unavailable',
    currentVersion,
    hasUpdate: false,
    releaseUrl: 'https://github.com/dreamersadobe/multioverlay/releases/latest',
  };
  let checkPromise = null;
  let downloadPromise = null;
  let cancellationToken = null;

  const snapshot = () => ({ ...state });
  const publish = patch => {
    state = { ...state, ...patch };
    onState(snapshot());
    return snapshot();
  };
  const failed = error => {
    if (state.status === 'installing') onInstallError();
    return publish({ success: false, status: 'error', error: error.message || String(error) });
  };

  if (updater) {
    // Downloads are started by the controller so it owns the cancellation token.
    updater.autoDownload = false;
    // Never install while Windows is shutting down or the user is still playing.
    // A verified, cached update is applied by the explicit restart button.
    updater.autoInstallOnAppQuit = false;
    updater.autoRunAppAfterInstall = true;
    updater.allowPrerelease = false;
    updater.allowDowngrade = false;
    updater.disableWebInstaller = true;
    updater.on('error', error => {
      if (!cancellationToken?.cancelled) failed(error);
    });
    updater.on('update-available', info => publish({
      success: true, status: 'available', hasUpdate: true,
      latestVersion: info.version, error: undefined, percent: 0,
    }));
    updater.on('update-not-available', () => publish({
      success: true, status: 'idle', hasUpdate: false,
      latestVersion: undefined, error: undefined,
    }));
    updater.on('download-progress', progress => publish({
      status: 'downloading',
      percent: Math.max(0, Math.min(100, Math.round(progress.percent || 0))),
      transferredMB: (progress.transferred / 1048576).toFixed(1),
      totalMB: (progress.total / 1048576).toFixed(1),
      speedMBps: (progress.bytesPerSecond / 1048576).toFixed(1),
    }));
    // This event is emitted only after checksum and configured publisher checks.
    updater.on('update-downloaded', info => publish({
      success: true, status: 'downloaded', hasUpdate: true,
      latestVersion: info.version, percent: 100, error: undefined,
    }));
  }

  async function check({ autoDownload = true } = {}) {
    if (!updater || ['downloading', 'downloaded', 'installing'].includes(state.status)) return snapshot();
    if (checkPromise) return checkPromise;
    publish({ success: true, status: 'checking', error: undefined });
    checkPromise = (async () => {
      try {
        const result = await updater.checkForUpdates();
        if (!result) throw new Error('Не удалось проверить обновления');
        cancellationToken = result.cancellationToken || null;
        if (result.isUpdateAvailable && autoDownload) void download();
        return snapshot();
      } catch (error) {
        return failed(error);
      } finally {
        checkPromise = null;
      }
    })();
    return checkPromise;
  }

  async function download() {
    if (!updater) return snapshot();
    if (downloadPromise) return downloadPromise;
    if (['downloaded', 'installing'].includes(state.status)) return snapshot();
    if (!cancellationToken || cancellationToken.cancelled) await check({ autoDownload: false });
    if (!state.hasUpdate || !cancellationToken || cancellationToken.cancelled) return snapshot();
    publish({ success: true, status: 'downloading', error: undefined, percent: 0, transferredMB: '0.0', totalMB: '0.0', speedMBps: '0.0' });
    downloadPromise = (async () => {
      try {
        await updater.downloadUpdate(cancellationToken);
        return snapshot();
      } catch (error) {
        if (cancellationToken.cancelled) return publish({ success: true, status: 'cancelled', error: undefined });
        return failed(error);
      } finally {
        downloadPromise = null;
      }
    })();
    return downloadPromise;
  }

  function cancel() {
    if (state.status !== 'downloading' || !cancellationToken || cancellationToken.cancelled) return false;
    cancellationToken.cancel();
    return true;
  }

  function install() {
    if (!updater || state.status !== 'downloaded') return { success: false, error: 'Обновление ещё не готово' };
    publish({ success: true, status: 'installing' });
    try {
      beforeInstall();
      updater.quitAndInstall(true, true);
      return state.status === 'error' ? { success: false, error: state.error } : { success: true };
    } catch (error) {
      return failed(error);
    }
  }

  return { getState: snapshot, check, download, cancel, install };
}

module.exports = { createUpdateController };
