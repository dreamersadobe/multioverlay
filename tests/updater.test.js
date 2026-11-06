const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { createUpdateController } = require('../app-updater');

class FakeUpdater extends EventEmitter {
  checks = 0;
  downloads = [];
  installs = [];
  available = true;
  async checkForUpdates() {
    this.checks++;
    if (this.checkError) throw this.checkError;
    if (this.checkGate) await this.checkGate;
    this.emit(this.available ? 'update-available' : 'update-not-available', { version: '3.2.0' });
    const token = new EventEmitter();
    token.cancelled = false;
    token.cancel = () => { token.cancelled = true; token.emit('cancel'); };
    return { isUpdateAvailable: this.available, cancellationToken: this.available ? token : undefined };
  }
  downloadUpdate(token) {
    return new Promise((resolve, reject) => {
      this.downloads.push({ token, resolve, reject });
      token.once('cancel', () => reject(new Error('cancelled')));
    });
  }
  complete() {
    this.emit('update-downloaded', { version: '3.2.0' });
    this.downloads.at(-1).resolve(['/cache/update.exe']);
  }
  quitAndInstall(...args) {
    this.installs.push(args);
    if (this.installError) this.emit('error', this.installError);
  }
}

function harness(updater = new FakeUpdater()) {
  const states = [];
  const lifecycle = [];
  const controller = createUpdateController({
    updater, currentVersion: '3.1.0',
    onState: state => states.push(state),
    beforeInstall: () => lifecycle.push('prepare'),
    onInstallError: () => lifecycle.push('restore'),
  });
  return { updater, controller, states, lifecycle };
}

test('updates download automatically, reuse an in-flight download, and install silently only after verification', async () => {
  const { updater, controller, lifecycle } = harness();
  assert.equal((await controller.check()).status, 'downloading');
  assert.equal(updater.downloads.length, 1);
  assert.equal(controller.install().success, false);
  assert.deepEqual(updater.installs, []);
  updater.emit('download-progress', { percent: 42.1, transferred: 1048576, total: 2097152, bytesPerSecond: 524288 });
  const progress = controller.getState();
  assert.equal(progress.percent, 42);
  assert.equal(progress.transferredMB, '1.0');
  assert.equal(progress.totalMB, '2.0');
  assert.equal(progress.speedMBps, '0.5');
  await controller.check();
  const pending = controller.download();
  assert.equal(updater.checks, 1);
  assert.equal(updater.downloads.length, 1);
  updater.complete();
  assert.equal((await pending).status, 'downloaded');
  assert.equal((await controller.check()).status, 'downloaded');
  assert.equal(updater.checks, 1);
  assert.deepEqual(updater.installs, []);
  assert.equal(controller.install().success, true);
  assert.deepEqual(updater.installs, [[true, true]]);
  assert.deepEqual(lifecycle, ['prepare']);
  assert.equal(controller.install().success, false);
});

test('cancellation does not make a partial file installable and retry gets a fresh token', async () => {
  const { updater, controller } = harness();
  await controller.check();
  const pending = controller.download();
  const oldToken = updater.downloads[0].token;
  assert.equal(controller.cancel(), true);
  assert.equal((await pending).status, 'cancelled');
  assert.equal(controller.cancel(), false);
  assert.equal(controller.install().success, false);
  const retry = controller.download();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(updater.downloads.length, 2);
  assert.notEqual(updater.downloads[1].token, oldToken);
  assert.equal(updater.downloads[1].token.cancelled, false);
  updater.complete();
  assert.equal((await retry).status, 'downloaded');
});

test('network, checksum, and publisher verification failures never enable installation', async () => {
  for (const message of ['sha512 checksum mismatch', 'ERR_UPDATER_INVALID_SIGNATURE']) {
    const { updater, controller } = harness();
    await controller.check();
    const pending = controller.download();
    const error = new Error(message);
    updater.emit('error', error);
    updater.downloads[0].reject(error);
    const result = await pending;
    assert.equal(result.success, false);
    assert.equal(result.error, message);
    assert.equal(controller.install().success, false);
    assert.deepEqual(updater.installs, []);
  }
  const { updater, controller } = harness();
  updater.checkError = new Error('offline');
  assert.equal((await controller.check()).error, 'offline');
  assert.equal(updater.downloads.length, 0);
  assert.equal(controller.install().success, false);
});

test('parallel checks are deduplicated and an up-to-date installation downloads nothing', async () => {
  const { updater, controller } = harness();
  updater.available = false;
  let releaseCheck;
  updater.checkGate = new Promise(resolve => { releaseCheck = resolve; });
  const first = controller.check();
  const second = controller.check();
  assert.equal(updater.checks, 1);
  releaseCheck();
  for (const result of await Promise.all([first, second])) {
    assert.equal(result.status, 'idle');
    assert.equal(result.hasUpdate, false);
  }
  assert.equal(updater.downloads.length, 0);
  assert.equal(updater.autoDownload, false);
  assert.equal(updater.autoInstallOnAppQuit, false);
  assert.equal(updater.allowPrerelease, false);
  assert.equal(updater.allowDowngrade, false);
  assert.equal(updater.disableWebInstaller, true);
});

test('installation errors restore normal close behavior and are reported to the renderer', async () => {
  const { updater, controller, lifecycle } = harness();
  await controller.check();
  const pending = controller.download();
  updater.complete();
  await pending;
  updater.installError = new Error('Access denied');
  const result = controller.install();
  assert.equal(result.success, false);
  assert.equal(result.error, 'Access denied');
  assert.deepEqual(lifecycle, ['prepare', 'restore']);
  assert.equal(controller.getState().status, 'error');
});

test('development and unsupported platforms cannot download or run an installer', async () => {
  const { controller, lifecycle } = harness(null);
  assert.equal((await controller.check()).status, 'unavailable');
  assert.equal((await controller.download()).supported, false);
  assert.equal(controller.cancel(), false);
  assert.equal(controller.install().success, false);
  assert.deepEqual(lifecycle, []);
});
