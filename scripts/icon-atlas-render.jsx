/* Renders every built-in icon set into complete-atlas tile markup. Bundled by
   generate-icon-set-atlases.mjs and evaluated in Node; the resulting HTML is
   screenshotted in headless Chrome so emoji glyphs rasterise in full colour. */
import { renderToStaticMarkup } from 'react-dom/server';
import { ATLAS_LAYOUT, ATLAS_SLOT_GROUPS, ICON_SET_MANIFEST, atlasSlots } from '../src/ui/iconSets.js';
import { interfaceIconForStyle } from '../src/ui/gameIcons.jsx';
import { ENEMY_ICON_STYLES, resolveEnemyIcon } from '../src/ui/enemyIcons.jsx';
import { MAP_ICON_STYLES, resolveMapIcon } from '../src/ui/mapIcons.jsx';
import { campVector, itemVector } from '../src/ui/themedIcons.jsx';
import { ENEMIES } from '../src/engine/data.js';

/* The enemy families are keyed independently of the set manifest: 'emoji' is
   spelled 'classic' there, and five sets have no bestiary of their own. Both
   cases resolve exactly as the running game does — unmatched sets fall back to
   each enemy's own emoji from data.js. */
const ENEMY_STYLE_ALIAS = { emoji: 'classic' };

function enemyIconForStyle(setId, key) {
  const style = ENEMY_ICON_STYLES[ENEMY_STYLE_ALIAS[setId] || setId] || ENEMY_ICON_STYLES.classic;
  const styled = style.icons[key];
  return styled ? resolveEnemyIcon(styled) : (ENEMIES[key]?.emoji ?? '?');
}

function iconFor(setId, domain, key) {
  if (domain === 'map') {
    const style = MAP_ICON_STYLES[setId] || MAP_ICON_STYLES.emoji;
    return resolveMapIcon(style.icons[key]);
  }
  if (domain === 'enemy') return enemyIconForStyle(setId, key);
  const preferences = { interfaceIconStyle: setId, mapIconStyle: setId };
  if (domain === 'camp') return campVector(key, preferences);
  if (domain === 'item') return itemVector(key, preferences);
  return interfaceIconForStyle(key, setId);
}

const slots = atlasSlots('all');
/* Native glyph families stay code-backed so they retain crisp platform/Noto
   rendering and do not appear twice in the picker as stale atlas copies. */
const ATLAS_SOURCE_SET_IDS = new Set(['marks']);
const EXTERNAL_ATLAS_SET_IDS = new Set(['main']);

function renderSet([id, label]) {
  const seen = new Map();
  const tiles = slots.map(slot => {
    const icon = iconFor(id, slot.domain, slot.key);
    const markup = typeof icon === 'string' ? escapeText(icon) : renderToStaticMarkup(icon);
    if (id === 'marks' && seen.has(markup)) {
      throw new Error(`Delver's Marks must be unique: ${seen.get(markup)} and ${slot.domain}:${slot.key}`);
    }
    seen.set(markup, `${slot.domain}:${slot.key}`);
    const kind = typeof icon === 'string' ? 'glyph' : 'mark';
    return `<div class="tile ${kind}" data-slot="${slot.domain}:${slot.key}">${markup}</div>`;
  });
  return { id, label, tiles };
}

export const SETS = ICON_SET_MANIFEST.filter(([id]) => ATLAS_SOURCE_SET_IDS.has(id)).map(renderSet);
export const REVIEW_SETS = ICON_SET_MANIFEST
  .filter(([id]) => !ATLAS_SOURCE_SET_IDS.has(id) && !EXTERNAL_ATLAS_SET_IDS.has(id))
  .map(renderSet);

export const COLUMNS = ATLAS_LAYOUT.columns;
export const ROWS = ATLAS_LAYOUT.rows;
export const TILE = ATLAS_LAYOUT.tile;
export const SLOT_COUNT = slots.length;
export const GROUP_COUNTS = Object.fromEntries(
  Object.entries(ATLAS_SLOT_GROUPS).map(([group, keys]) => [group, keys.length]),
);

function escapeText(text) {
  return String(text).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}
