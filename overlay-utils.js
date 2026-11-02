/* Shared validation and display geometry; usable in Electron and renderer. */
(function (root) {
  const defaultBookmarks = [
    { name: 'DBD Fog', url: 'https://dbdfog.ru/survivor-builds' },
    { name: 'DBD Wiki', url: 'https://wiki.deadbydaylight.com/' },
    { name: 'YouTube', url: 'https://youtube.com/' },
    { name: 'Discord', url: 'https://discord.com/app' },
    { name: 'Twitch', url: 'https://twitch.tv/' },
  ];
  function normalizeUrl(value) {
    const text = String(value || '').trim();
    if (!text) throw new Error('Введите адрес сайта');
    const hasScheme = /^[a-z][a-z\d+.-]*:/i.test(text) && !/^[^/?#:\s]+:\d+(?:[/?#]|$)/.test(text);
    let url;
    try { url = new URL(hasScheme ? text : `https://${text}`); }
    catch { throw new Error('Проверьте адрес сайта, например https://example.com'); }
    if (!['https:', 'http:'].includes(url.protocol) || !url.hostname || url.username || url.password) {
      throw new Error('Укажите адрес сайта с http:// или https://');
    }
    return url.href;
  }
  function normalizeBookmarks(items) {
    if (!Array.isArray(items)) return defaultBookmarks.map(item => ({ ...item }));
    const seen = new Set();
    return items.slice(0, 30).flatMap(item => {
      try {
        const url = normalizeUrl(item.url);
        if (seen.has(url)) return [];
        seen.add(url);
        return [{ name: String(item.name || new URL(url).hostname).trim().slice(0, 40) || new URL(url).hostname, url }];
      } catch { return []; }
    });
  }
  function fitBounds(bounds, area) {
    const width = Math.min(area.width, Math.max(320, Math.round(Number(bounds.width) || 1280)));
    const height = Math.min(area.height, Math.max(320, Math.round(Number(bounds.height) || 720)));
    return { width, height,
      x: Math.max(area.x, Math.min(area.x + area.width - width, Math.round(Number.isFinite(bounds.x) ? bounds.x : area.x + (area.width - width) / 2))),
      y: Math.max(area.y, Math.min(area.y + area.height - height, Math.round(Number.isFinite(bounds.y) ? bounds.y : area.y + (area.height - height) / 2))),
    };
  }
  function presetBounds(preset, area) {
    const margin = 16;
    const half = Math.floor((area.width - margin * 3) / 2);
    if (preset === 'left' || preset === 'right') {
      return fitBounds({ width: half, height: area.height - margin * 2,
        x: preset === 'left' ? area.x + margin : area.x + area.width - half - margin, y: area.y + margin }, area);
    }
    return fitBounds({ width: preset === 'compact' ? 480 : 1280, height: preset === 'compact' ? 520 : 720 }, area);
  }
  const api = { defaultBookmarks, normalizeUrl, normalizeBookmarks, fitBounds, presetBounds };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.overlayUtils = api;
})(typeof window !== 'undefined' ? window : globalThis);
