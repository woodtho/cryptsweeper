const KEY = 'cryptsweeper.settings.v1';
const DELVER_ICON_DEFAULT_VERSION = 2;
const DEFAULTS = {
  reducedMotion: false,
  highContrast: false,
  largeTiles: false,
  largeText: false,
  leftHanded: false,
  compactCards: true,
  showCombatHints: true,
  showBattleBriefings: true,
  showCleanupPrompt: true,
  animatedBoardEnemies: false,
  enemyEmojis: {},
  enemyIconStyle: 'sprites',
  mapIconStyle: 'marks',
  mapEmojis: {},
  mapMarks: {},
  mapIconMix: {},
  mapIconMixDefault: 'marks',
  enemyIconMix: {},
  enemyIconMixDefault: 'sprites',
  interfaceIconStyle: 'marks',
  interfaceIconMix: {},
  interfaceIconMixDefault: 'marks',
  customIconSets: {},
  notoEmoji: true,
  pixelAssetVersion: 2,
  delverIconDefaultVersion: DELVER_ICON_DEFAULT_VERSION,
};

export function loadPreferences() {
  try {
    const stored = JSON.parse(localStorage.getItem(KEY) || '{}');
    let migrated = false;
    if ((stored.pixelAssetVersion || 0) < 2) {
      if (!stored.enemyIconStyle || stored.enemyIconStyle === 'main') stored.enemyIconStyle = 'pixel';
      if (!stored.mapIconStyle || stored.mapIconStyle === 'main') stored.mapIconStyle = 'pixel';
      if (!stored.interfaceIconStyle || stored.interfaceIconStyle === 'main') stored.interfaceIconStyle = 'pixel';
      stored.pixelAssetVersion = 2;
      migrated = true;
    }
    if ((stored.delverIconDefaultVersion || 0) < DELVER_ICON_DEFAULT_VERSION) {
      const retiredEmojiSets = ['classic', 'crypt', 'dungeon', 'fauna', 'spirits', 'machine', 'feast',
        'cosmic', 'deepwild', 'sunken', 'arcane', 'gearworks', 'beasts'];
      const retiredMainSets = ['pixel', 'main-color', 'main-emoji', 'main-line', 'atlas-pixel'];
      if (!stored.enemyIconStyle || ['marks', 'pixel'].includes(stored.enemyIconStyle)) stored.enemyIconStyle = 'sprites';
      else if (retiredEmojiSets.includes(stored.enemyIconStyle)) stored.enemyIconStyle = 'emoji';
      else if (retiredMainSets.includes(stored.enemyIconStyle)) stored.enemyIconStyle = 'main';
      if (!stored.mapIconStyle || stored.mapIconStyle === 'pixel') stored.mapIconStyle = 'marks';
      if (!stored.interfaceIconStyle || stored.interfaceIconStyle === 'pixel') stored.interfaceIconStyle = 'marks';
      if (retiredEmojiSets.includes(stored.mapIconStyle)) stored.mapIconStyle = 'emoji';
      if (retiredEmojiSets.includes(stored.interfaceIconStyle)) stored.interfaceIconStyle = 'emoji';
      if (retiredMainSets.includes(stored.mapIconStyle)) stored.mapIconStyle = 'main';
      if (retiredMainSets.includes(stored.interfaceIconStyle)) stored.interfaceIconStyle = 'main';
      if (['sigils', 'atlas-marks'].includes(stored.mapIconStyle)) stored.mapIconStyle = 'marks';
      if (['sigils', 'atlas-marks'].includes(stored.interfaceIconStyle)) stored.interfaceIconStyle = 'marks';
      stored.delverIconDefaultVersion = DELVER_ICON_DEFAULT_VERSION;
      migrated = true;
    }
    if (migrated) localStorage.setItem(KEY, JSON.stringify({ ...DEFAULTS, ...stored }));
    return { ...DEFAULTS, ...stored };
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
