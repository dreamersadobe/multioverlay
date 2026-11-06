const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { NsisUpdater } = require('electron-updater');
const { ElectronHttpExecutor } = require('electron-updater/out/electronHttpExecutor');
const { createUpdateController } = require('../app-updater');

// Exercise real manifest parsing, HTTP download, hashing and NSIS staging.
// These bytes are a test fixture, never an executable and never installed.
for (const scenario of ['valid', 'corrupt', 'wrong publisher']) {
  test(`real updater staging: ${scenario}`, async t => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nimbo-update-'));
    t.after(() => fs.rmSync(root, { recursive: true, force: true }));
    const expected = Buffer.from('Nimbo update integrity test fixture');
    const body = scenario === 'corrupt' ? Buffer.from('Nimbo update integrity TEST fixture') : expected;
    const file = { url: 'Nimbo-Setup-3.2.0.exe', sha512: createHash('sha512').update(expected).digest('base64'), size: expected.length };
    const manifest = JSON.stringify({ version: '3.2.0', files: [file], path: file.url, sha512: file.sha512 });
    const server = http.createServer((request, response) => {
      if (request.url.startsWith('/latest.yml')) {
        response.end(manifest);
      } else {
        response.writeHead(200, { 'Content-Length': body.length });
        response.end(body);
      }
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    t.after(() => new Promise(resolve => server.close(resolve)));
    const configPath = path.join(root, 'app-update.yml');
    fs.writeFileSync(configPath, JSON.stringify({
      updaterCacheDirName: 'cache',
      ...(scenario === 'wrong publisher' ? { publisherName: ['Test Publisher'] } : {}),
    }));
    const adapter = {
      version: '3.1.0', name: 'Nimbo', isPackaged: true,
      appUpdateConfigPath: configPath, userDataPath: root, baseCachePath: root,
      whenReady: async () => {},
      quit: () => assert.fail('Staging must not quit the app'),
      onQuit: () => assert.fail('Automatic installation on quit must be disabled'),
    };
    const updater = new NsisUpdater(null, adapter);
    updater.logger = null;
    updater.httpExecutor = new ElectronHttpExecutor();
    // Replace only Electron's transport; keep its real download/hash pipeline.
    updater.httpExecutor.createRequest = (options, callback) => http.request(options, callback);
    updater._testOnlyOptions = { platform: 'win32', isUseDifferentialDownload: false };
    updater.setFeedURL({ provider: 'generic', url: `http://127.0.0.1:${server.address().port}/` });
    if (scenario === 'wrong publisher') {
      // The OS verifier is Windows-only; simulate its rejection at that boundary.
      updater.verifyUpdateCodeSignature = async publishers => {
        assert.deepEqual(publishers, ['Test Publisher']);
        return 'publisher mismatch';
      };
    }
    const controller = createUpdateController({ updater, currentVersion: adapter.version });
    await controller.check();
    const result = await controller.download();
    if (scenario === 'valid') {
      assert.equal(result.status, 'downloaded', result.error);
      assert.deepEqual(fs.readFileSync(updater.installerPath), expected);
    } else {
      assert.equal(result.status, 'error');
      assert.equal(result.success, false);
      assert.match(result.error, scenario === 'corrupt' ? /checksum mismatch/ : /publisher mismatch/);
      assert.equal(controller.install().success, false);
    }
  });
}
