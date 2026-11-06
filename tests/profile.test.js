const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { resolveProfilePath, configureProfile } = require('../app-profile');

test('rebranding reuses legacy preferences and site sessions without modifying files', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nimbo-profile-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const current = path.join(root, 'Nimbo');
  assert.equal(resolveProfilePath(root, current), current);
  const legacy = path.join(root, 'game-overlay');
  fs.mkdirSync(legacy);
  fs.writeFileSync(path.join(legacy, 'config.json'), '{"hotkey":"F4","bookmarks":[]}');
  fs.writeFileSync(path.join(legacy, 'Cookies'), 'existing sessions');
  assert.equal(resolveProfilePath(root, current), legacy);
  assert.equal(fs.readFileSync(path.join(legacy, 'Cookies'), 'utf8'), 'existing sessions');
  const packaged = path.join(root, 'Game Overlay');
  fs.mkdirSync(packaged);
  fs.writeFileSync(path.join(packaged, 'config.json'), '{}');
  assert.equal(resolveProfilePath(root, current), packaged);
  fs.mkdirSync(current);
  fs.writeFileSync(path.join(current, 'config.json'), '{}');
  assert.equal(resolveProfilePath(root, current), current);
});

test('first launch leaves directory creation to Electron, while upgrades reuse browser storage too', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nimbo-bootstrap-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const current = path.join(root, 'Nimbo');
  const overrides = [];
  const app = {
    getPath: name => name === 'appData' ? root : current,
    setPath: (name, directory) => {
      assert(fs.statSync(directory).isDirectory(), 'Electron requires an existing directory');
      overrides.push([name, directory]);
    },
  };
  assert.equal(configureProfile(app), current);
  assert.deepEqual(overrides, []);
  assert.equal(fs.existsSync(current), false);
  const legacy = path.join(root, 'Game Overlay');
  fs.mkdirSync(legacy);
  fs.writeFileSync(path.join(legacy, 'config.json'), '{}');
  assert.equal(configureProfile(app), legacy);
  assert.deepEqual(overrides, [['userData', legacy], ['sessionData', legacy]]);
});
