/* CRYPTSWEEPER — Delver's Bestiary: ten original monster marks, plus the
   enemy icon styles that map every foe to a face. Same drawn language as the
   map's Delver's Marks: 24×24, 1.7px round strokes, currentColor throughout.
   Tokens are stored as 'svg:<name>' so they survive in preferences. */

import { Mark, themedVector, VECTOR_THEMES } from './mapIcons.jsx';
import { customIconSets, customSetBase, customSetIcon, iconSetLabel, resolveAtlasIcon } from './iconSets.js';

export const BEAST_MARKS = {
  /* the burrowers — grubbers and tunneler grubs */
  worm: (
    <Mark>
      <path d="M4 17 Q7 11 12 11 Q17 11 19 15" />
      <circle cx="19" cy="15.8" r="2.3" />
      <circle cx="19.8" cy="15.2" r=".85" fill="currentColor" stroke="none" />
      <path d="M7.2 13.9 L6 12.7 M10.2 11.5 L9.7 9.9 M13.8 11.3 L14.3 9.7" />
      <path d="M4 17 Q3 18.4 3.4 20" />
    </Mark>
  ),
  /* the minelayer imp */
  imp: (
    <Mark>
      <path d="M6.5 10 Q6.5 5.5 12 5.5 Q17.5 5.5 17.5 10 V13.5 Q17.5 18 12 18 Q6.5 18 6.5 13.5 Z" />
      <path d="M7 7 L4 3.5 M17 7 L20 3.5" />
      <path d="M9 10.5 L11 11.3 M15 10.5 L13 11.3" />
      <path d="M9 14.3 Q12 16.3 15 14.3" />
      <path d="M10.6 15.2 v1.5 M13.4 15.2 v1.5" />
    </Mark>
  ),
  /* stone wardens and their kin */
  golem: (
    <Mark>
      <path d="M7 4 H17 V15.5 L14.5 19.5 H9.5 L7 15.5 Z" />
      <path d="M12 4 L11 7.5 L13 10" />
      <rect x="8.8" y="11.5" width="2.2" height="1.6" fill="currentColor" stroke="none" />
      <rect x="13" y="11.5" width="2.2" height="1.6" fill="currentColor" stroke="none" />
      <path d="M9.5 16.5 H14.5" />
    </Mark>
  ),
  /* fog wisps, marsh shades, and the Fogfather's veils */
  wisp: (
    <Mark>
      <path d="M12 3.5 Q16.5 8 16 12.5 Q15.6 16.5 12 20 Q8.4 16.5 8 12.5 Q7.5 8 12 3.5 Z" />
      <circle cx="10.4" cy="11" r="1" fill="currentColor" stroke="none" />
      <circle cx="13.6" cy="11" r="1" fill="currentColor" stroke="none" />
      <path d="M5 14 Q3.5 12.5 4 10.5 M19 14 Q20.5 12.5 20 10.5" />
    </Mark>
  ),
  /* clockwork sappers and gear husks */
  cog: (
    <Mark>
      <circle cx="12" cy="12" r="4.4" />
      <path d="M12 4 V6.4 M12 17.6 V20 M4 12 H6.4 M17.6 12 H20" />
      <path d="M6.3 6.3 L8 8 M16 8 L17.7 6.3 M6.3 17.7 L8 16 M16 16 L17.7 17.7" />
      <circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" />
    </Mark>
  ),
  /* the Ossuary Warden's honest skull */
  skull: (
    <Mark>
      <path d="M7.5 10.5 a4.5 4.5 0 0 1 9 0 v3 l-1.6 1.6 v3.4 h-5.8 v-3.4 l-1.6 -1.6 z" />
      <circle cx="10" cy="11.3" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="14" cy="11.3" r="1.1" fill="currentColor" stroke="none" />
      <path d="M12 13 l-.9 1.7 h1.8 z" fill="currentColor" stroke="none" />
      <path d="M10.6 18.5 v-1.8 M12 18.5 v-1.8 M13.4 18.5 v-1.8" />
    </Mark>
  ),
  /* the Miscounter — one eye lies */
  mask: (
    <Mark>
      <path d="M4.5 8 Q12 4 19.5 8 Q19.5 13.5 16.5 15.2 Q13.8 15.2 12 13.6 Q10.2 15.2 7.5 15.2 Q4.5 13.5 4.5 8 Z" />
      <circle cx="8.6" cy="10" r="1.1" fill="currentColor" stroke="none" />
      <path d="M14.2 9 L16.4 11 M16.4 9 L14.2 11" />
      <path d="M9 18.5 Q12 20 15 18.5" />
    </Mark>
  ),
  /* Detonata's calling card */
  bomb: (
    <Mark>
      <circle cx="10.5" cy="14.5" r="5" />
      <path d="M13.8 10.8 Q15.5 8.5 18 9" />
      <path d="M20 5.6 V6.8 M20 8.6 V9.8 M18.1 7.7 H19.3 M20.7 7.7 H21.9" />
      <circle cx="8.8" cy="12.8" r="1" fill="currentColor" stroke="none" />
    </Mark>
  ),
  /* the Collapser — everything falls inward */
  spiral: (
    <Mark>
      <path d="M12 12 a1.6 1.6 0 0 1 1.6 1.6 a3.2 3.2 0 0 1 -3.2 3.2 a4.8 4.8 0 0 1 -4.8 -4.8 a6.4 6.4 0 0 1 6.4 -6.4 a8 8 0 0 1 8 8" />
      <circle cx="19" cy="16.8" r=".8" fill="currentColor" stroke="none" />
    </Mark>
  ),
  /* NN-99's red lens */
  lens: (
    <Mark>
      <path d="M12 3 L19.8 7.5 V16.5 L12 21 L4.2 16.5 V7.5 Z" />
      <circle cx="12" cy="12" r="3.6" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
    </Mark>
  ),
  /* the Tunneler Grub — fat, segmented, hungry */
  grub: (
    <Mark>
      <path d="M12 4.5 Q17 5.5 17 11 Q17 17.5 12 19.5 Q7 17.5 7 11 Q7 5.5 12 4.5 Z" />
      <path d="M8 9.2 Q12 10.7 16 9.2 M8 13 Q12 14.5 16 13" />
      <path d="M9.5 4.8 L8 2.5 M14.5 4.8 L16 2.5" />
      <circle cx="10.6" cy="7.2" r=".9" fill="currentColor" stroke="none" />
      <circle cx="13.4" cy="7.2" r=".9" fill="currentColor" stroke="none" />
    </Mark>
  ),
  /* the Marsh Shade — a hood with nothing inside */
  shade: (
    <Mark>
      <path d="M12 4 Q6.5 6 6.5 12 Q6.5 16 5 19 Q9 17.5 12 19 Q15 17.5 19 19 Q17.5 16 17.5 12 Q17.5 6 12 4 Z" />
      <path d="M9 8.5 Q12 7 15 8.5" />
      <circle cx="10" cy="11" r="1" fill="currentColor" stroke="none" />
      <circle cx="14" cy="11" r="1" fill="currentColor" stroke="none" />
    </Mark>
  ),
  /* the Gear Husk — a cog with the middle gone */
  husk: (
    <Mark>
      <path d="M16.4 12 a4.4 4.4 0 1 1 -2.6 -4" />
      <path d="M4 12 H6.4 M12 17.6 V20 M6.3 6.3 L8 8 M6.3 17.7 L8 16" />
      <path d="M13 11 L11 13" />
      <circle cx="17.5" cy="7" r=".8" fill="currentColor" stroke="none" />
      <circle cx="19.3" cy="9.4" r=".6" fill="currentColor" stroke="none" />
    </Mark>
  ),
  /* the Fogfather's bell, tolling somewhere inside the fog */
  bell: (
    <Mark>
      <path d="M12 5.5 V4" />
      <path d="M8 14 V10 Q8 5.5 12 5.5 Q16 5.5 16 10 V14 L17.5 16 H6.5 Z" />
      <circle cx="12" cy="18" r="1" fill="currentColor" stroke="none" />
      <path d="M3.5 19.8 Q5.5 18.8 7.5 19.8 M16.5 19.8 Q18.5 18.8 20.5 19.8" />
    </Mark>
  ),
};

export const BEAST_NAMES = Object.keys(BEAST_MARKS);

/* Ten selectable enemy sets. Within every set, each of the fourteen foes has
   its own unique face — sets share nothing internally, only themes. */
const LEGACY_ENEMY_ICON_STYLES = {
  classic: { label: 'Emoji', icons: {} }, // falls back to each enemy's own emoji
  crypt: {
    label: 'Graveyard',
    icons: {
      grubber: '🐍', minelayer: '👹', warden: '🪦', wisp: '🕯️', shade: '🌑',
      tunneler: '🪱', clockwork: '🦾', gearhusk: '🔩', ossuary: '☠️',
      miscounter: '🃏', detonata: '💣', collapser: '🌀', fogfather: '🔔', nn99: '👁️',
    },
  },
  marks: {
    label: "Delver's Bestiary",
    icons: {
      grubber: 'svg:worm', minelayer: 'svg:imp', warden: 'svg:golem', wisp: 'svg:wisp',
      shade: 'svg:shade', tunneler: 'svg:grub', clockwork: 'svg:cog', gearhusk: 'svg:husk',
      ossuary: 'svg:skull', miscounter: 'svg:mask', detonata: 'svg:bomb',
      collapser: 'svg:spiral', fogfather: 'svg:bell', nn99: 'svg:lens',
    },
  },
  dungeon: {
    label: 'Dungeon',
    icons: {
      grubber: '🐀', minelayer: '🗡️', warden: '🛡️', wisp: '🧚', shade: '🧛',
      tunneler: '🐍', clockwork: '🤺', gearhusk: '🔨', ossuary: '🦴',
      miscounter: '🎲', detonata: '🔥', collapser: '⛓️', fogfather: '🌫️', nn99: '🐉',
    },
  },
  fauna: {
    label: 'Cave fauna',
    icons: {
      grubber: '🐌', minelayer: '🦎', warden: '🐢', wisp: '🦋', shade: '🦇',
      tunneler: '🐛', clockwork: '🦗', gearhusk: '🪲', ossuary: '🦂',
      miscounter: '🦜', detonata: '🐝', collapser: '🕷️', fogfather: '🦉', nn99: '🐙',
    },
  },
  sunken: {
    label: 'Sunken',
    icons: {
      grubber: '🐟', minelayer: '🦐', warden: '🐳', wisp: '💧', shade: '🌊',
      tunneler: '🐚', clockwork: '⚓', gearhusk: '⛵', ossuary: '🐡',
      miscounter: '🦞', detonata: '💥', collapser: '🌀', fogfather: '🚢', nn99: '🦑',
    },
  },
  spirits: {
    label: 'Spirits',
    icons: {
      grubber: '👾', minelayer: '👿', warden: '🎃', wisp: '💫', shade: '👤',
      tunneler: '🌚', clockwork: '⚡', gearhusk: '🥀', ossuary: '👻',
      miscounter: '🤡', detonata: '🎇', collapser: '🌪️', fogfather: '☁️', nn99: '🌟',
    },
  },
  machine: {
    label: 'Machine',
    icons: {
      grubber: '🪛', minelayer: '🧲', warden: '🏗️', wisp: '🔦', shade: '📼',
      tunneler: '🚜', clockwork: '🦾', gearhusk: '🛠️', ossuary: '🗜️',
      miscounter: '🧮', detonata: '🎆', collapser: '🪤', fogfather: '♨️', nn99: '📡',
    },
  },
  feast: {
    label: 'Feast',
    icons: {
      grubber: '🍜', minelayer: '🌶️', warden: '🍞', wisp: '🍦', shade: '🫐',
      tunneler: '🥖', clockwork: '🥫', gearhusk: '🍩', ossuary: '🍖',
      miscounter: '🥨', detonata: '🍅', collapser: '🥣', fogfather: '🍲', nn99: '🍳',
    },
  },
  cosmic: {
    label: 'Cosmic',
    icons: {
      grubber: '☄️', minelayer: '🌠', warden: '🪐', wisp: '⭐', shade: '🌘',
      tunneler: '🚀', clockwork: '🛰️', gearhusk: '🛸', ossuary: '🌚',
      miscounter: '🎱', detonata: '☀️', collapser: '🌌', fogfather: '🌥️', nn99: '🔭',
    },
  },
};

const ENEMY_BASE = {
  grubber: 'worm', minelayer: 'imp', warden: 'golem', wisp: 'wisp', shade: 'shade', tunneler: 'grub',
  clockwork: 'cog', gearhusk: 'husk', ossuary: 'skull', miscounter: 'mask', detonata: 'bomb',
  collapser: 'spiral', fogfather: 'bell', nn99: 'lens',
};
const themedBeasts = {};
for (const [theme, def] of Object.entries(VECTOR_THEMES)) {
  for (const [name, mark] of Object.entries(BEAST_MARKS)) themedBeasts[`${theme}-${name}`] = themedVector(mark, def.frame);
}
Object.assign(BEAST_MARKS, themedBeasts);

const VECTOR_ENEMY_ICON_STYLES = Object.fromEntries(Object.entries(VECTOR_THEMES).map(([theme, def]) => [theme, {
  label: def.label,
  icons: Object.fromEntries(Object.entries(ENEMY_BASE).map(([enemy, mark]) => [enemy, `svg:${theme}-${mark}`])),
}]));

/* The original artwork remains available alongside the ten new vector sets. */
export const ENEMY_ICON_STYLES = {
  ...LEGACY_ENEMY_ICON_STYLES,
  ...VECTOR_ENEMY_ICON_STYLES,
  mixer: { label: 'Mix & Match', icons: {} },
};

export function getEnemyIconStyles(prefs) {
  const custom = Object.fromEntries(Object.keys(customIconSets(prefs)).map(id => {
    const base = customSetBase(id, prefs, 'emoji');
    const source = ENEMY_ICON_STYLES[base] || ENEMY_ICON_STYLES.classic;
    const icons = { ...source.icons };
    for (const key of Object.keys(ENEMY_BASE)) icons[key] = customSetIcon(id, 'enemy', key, prefs) || icons[key];
    return [id, { label: iconSetLabel(id, prefs), icons }];
  }));
  return { ...ENEMY_ICON_STYLES, ...custom };
}

export function resolveEnemyIcon(icon, prefs = null) {
  if (typeof icon === 'string' && icon.startsWith('atlas:')) return resolveAtlasIcon(icon, prefs);
  if (typeof icon === 'string' && icon.startsWith('svg:')) return BEAST_MARKS[icon.slice(4)] || '?';
  return icon;
}

/* One face for an enemy, everywhere it appears: per-enemy custom override
   first (emoji text or an 'svg:' mark token), then the chosen style, then
   the enemy's own emoji from data. */
export function enemyIcon(key, def, prefs) {
  let styleKey = prefs?.enemyIconStyle;
  if (styleKey === 'mixer') {
    const choice = prefs?.enemyIconMix?.[key];
    styleKey = choice?.style && choice.style !== 'mixer' ? choice.style : 'classic';
  }
  const customArt = customSetIcon(styleKey, 'enemy', key, prefs);
  const base = customSetBase(styleKey, prefs, 'classic');
  const style = ENEMY_ICON_STYLES[base] || ENEMY_ICON_STYLES.classic;
  const styled = customArt || style.icons[key];
  return styled ? resolveEnemyIcon(styled, prefs) : (def?.emoji ?? '?');
}
