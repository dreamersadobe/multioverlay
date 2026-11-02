const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { normalizeUrl, normalizeBookmarks, fitBounds, presetBounds } = require('../overlay-utils');

test('bookmarks migrate defaults, preserve empty lists and reject unsafe URLs', () => {
  assert.equal(normalizeBookmarks().length, 5);
  assert.deepEqual(normalizeBookmarks([]), []);
  assert.equal(normalizeUrl('example.com/guide'), 'https://example.com/guide');
  assert.equal(normalizeUrl('localhost:3000/guide'), 'https://localhost:3000/guide');
  for (const url of ['javascript:alert(1)', 'file:///tmp/test', 'data:text/html,test', 'https://user:pass@example.com', '']) {
    assert.throws(() => normalizeUrl(url));
  }
  assert.deepEqual(normalizeBookmarks([
    { name: 'Гайд', url: 'example.com' }, { name: 'Дубль', url: 'https://example.com/' },
    { name: 'Ошибка', url: 'javascript:alert(1)' }, null,
  ]), [{ name: 'Гайд', url: 'https://example.com/' }]);
  assert.equal(normalizeBookmarks(Array.from({ length: 40 }, (_, i) => ({ name: `${i}`, url: `https://example.com/${i}` }))).length, 30);
});

test('window bounds recover onto a display, including negative monitor coordinates', () => {
  const area = { x: -1920, y: 40, width: 1920, height: 1040 };
  assert.deepEqual(fitBounds({ x: 3000, y: -500, width: 4000, height: 2000 }, area), area);
  for (const preset of ['left', 'right', 'center', 'compact']) {
    const bounds = presetBounds(preset, area);
    assert(bounds.x >= area.x && bounds.y >= area.y);
    assert(bounds.x + bounds.width <= area.x + area.width);
    assert(bounds.y + bounds.height <= area.y + area.height);
  }
  assert(presetBounds('left', area).x < presetBounds('right', area).x);
  assert.deepEqual(presetBounds('compact', { x: 0, y: 0, width: 300, height: 280 }), { x: 0, y: 0, width: 300, height: 280 });
});

function mainHarness() {
  const handlers = new Map();
  const area = { x: -1280, y: 40, width: 1280, height: 760 };
  const events = [];
  let opacity, bounds;
  class Window {
    constructor(options) {
      bounds = { x: options.x, y: options.y, width: options.width, height: options.height };
      this.webContents = { send: (...args) => events.push(args), session: { webRequest: { onHeadersReceived() {} } } };
    }
    setBounds(value) { bounds = value; }
    getBounds() { return bounds; }
    setOpacity(value) { opacity = value; }
    setAlwaysOnTop() {} setIgnoreMouseEvents() {} loadFile() {} on() {} hide() {} show() {}
    isDestroyed() { return false; }
  }
  const electron = {
    app: { getPath: () => '/mock', whenReady: () => ({ then() {} }), on() {}, requestSingleInstanceLock: () => true, setLoginItemSettings() {} },
    BrowserWindow: Window,
    screen: { getPrimaryDisplay: () => ({ workArea: area }), getDisplayMatching: () => ({ workArea: area }) },
    ipcMain: { handle: (name, fn) => handlers.set(name, fn), on() {} },
    globalShortcut: {},
  };
  const context = {
    require: name => name === 'electron' ? electron : name === 'fs' ? { existsSync: () => false, mkdirSync() {}, writeFileSync() {} } : name === './overlay-utils' ? require('../overlay-utils') : require(name),
    __dirname: path.resolve(__dirname, '..'), console, Buffer,
    setTimeout: () => 0, clearTimeout() {}, process,
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../main.js'), 'utf8') + '\ncreateOverlayWindow(); globalThis.window = overlayWindow; globalThis.recover = recoverWindowBounds; globalThis.deactivate = deactivateOverlay;', context);
  return { handlers, events, context, area, get opacity() { return opacity; }, get bounds() { return bounds; } };
}

test('settings stay opaque while editing, restore saved opacity and deactivate correctly', () => {
  const h = mainHarness();
  const event = { sender: h.context.window.webContents };
  const open = h.handlers.get('set-settings-open');
  const save = h.handlers.get('save-settings');
  save(event, { opacity: 35 }); assert.equal(h.opacity, .35);
  open(event, true); assert.equal(h.opacity, 1);
  save(event, { opacity: 60 }); assert.equal(h.opacity, 1);
  open(event, false); assert.equal(h.opacity, .6);
  open(event, true); h.context.deactivate(); assert.equal(h.opacity, .6);
  open({ sender: {} }, true); assert.equal(h.opacity, .6);
});

test('window presets, manual sizing and disconnected display recovery persist fitting bounds', () => {
  const h = mainHarness();
  const event = { sender: h.context.window.webContents };
  const apply = h.handlers.get('apply-window-preset');
  assert.equal(apply(event, 'invalid'), null);
  apply(event, 'compact'); assert.equal(h.bounds.width, 480);
  const saved = h.handlers.get('save-settings')(event, { width: 5000, height: 5000 });
  assert.equal(saved.width, h.area.width); assert.equal(saved.height, h.area.height);
  h.context.window.setBounds({ x: 9999, y: 9999, width: 480, height: 520 });
  h.context.recover();
  assert(h.bounds.x + h.bounds.width <= h.area.x + h.area.width);
  assert(h.bounds.y + h.bounds.height <= h.area.y + h.area.height);
  assert.equal(h.events.at(-1)[0], 'settings-updated');
});
