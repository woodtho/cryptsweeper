const KEY = 'cryptsweeper.settings.v1';
const DEFAULTS = {
  reducedMotion: false,
  highContrast: false,
  largeTiles: false,
  largeText: false,
  leftHanded: false,
  compactCards: true,
  showCombatHints: false,
  enemyEmojis: {},
  enemyIconStyle: 'classic',
  mapIconStyle: 'emoji',
  mapEmojis: {},
  mapMarks: {},
  mapIconMix: {},
  enemyIconMix: {},
  interfaceIconStyle: 'emoji',
  interfaceIconMix: {},
  customIconSets: {},
  notoEmoji: true,
};

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
  document.documentElement.classList.toggle('large-text', prefs.largeText);
  document.documentElement.classList.toggle('left-handed', prefs.leftHanded);
  document.documentElement.classList.toggle('compact-cards', prefs.compactCards);
  document.documentElement.classList.toggle('emoji-noto', prefs.notoEmoji);
}
