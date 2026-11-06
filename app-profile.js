const fs = require('node:fs');
const path = require('node:path');

// Reuse the whole legacy profile, including site sessions. Do not move or
// overwrite it: this also keeps an older installation usable after a rollback.
function resolveProfilePath(appData, currentPath) {
  if (fs.existsSync(path.join(currentPath, 'config.json'))) return currentPath;
  for (const name of ['Game Overlay', 'game-overlay']) {
    const candidate = path.join(appData, name);
    if (fs.existsSync(path.join(candidate, 'config.json'))) return candidate;
  }
  return currentPath;
}

function configureProfile(app) {
  const currentPath = app.getPath('userData');
  const profilePath = resolveProfilePath(app.getPath('appData'), currentPath);
  // Electron creates its default directory itself. setPath requires an existing
  // directory, so only override it when an existing legacy profile was found.
  if (profilePath !== currentPath) {
    app.setPath('userData', profilePath);
    app.setPath('sessionData', profilePath);
  }
  return profilePath;
}

module.exports = { resolveProfilePath, configureProfile };
