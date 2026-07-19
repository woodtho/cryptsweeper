const KEY = 'cryptsweeper.settings.v1';
const DEFAULTS = { reducedMotion: false, highContrast: false, largeTiles: false };

export function loadPreferences() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  } catch {
    return { ...DEFAULTS };
  }
}

export function savePreferences(next) {
  const clean = { ...DEFAULTS, ...next };
  try { localStorage.setItem(KEY, JSON.stringify(clean)); } catch { /* storage unavailable */ }
  return clean;
}

export function applyPreferences(prefs) {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('reduce-motion', prefs.reducedMotion);
  document.documentElement.classList.toggle('high-contrast', prefs.highContrast);
  document.documentElement.classList.toggle('large-tiles', prefs.largeTiles);
}
