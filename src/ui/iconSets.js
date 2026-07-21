import { createElement } from 'react';

/* Central icon-set manifest and runtime extension API. Add a built-in family
   once here; specialized art domains can then provide artwork or inherit. */
export const ICON_SET_MANIFEST = [
  ['main', 'Main Icons'], ['emoji', 'Emoji'], ['crypt', 'Graveyard'], ['marks', "Delver's Marks"],
  ['dungeon', 'Dungeon'], ['deepwild', 'Deep Wild'], ['sunken', 'Sunken'], ['arcane', 'Arcane'],
  ['gearworks', 'Gearworks'], ['beasts', 'Beasts'],
];

export const BUILTIN_ICON_SETS = Object.fromEntries(ICON_SET_MANIFEST.map(([id, label]) => [id, { id, label, builtin: true }]));

export const FLAG_BOMB_ART = {
  emoji: { flag: '🚩', bomb: '💣' }, crypt: { flag: '⚑', bomb: '🧨' }, marks: { flag: 'svg:flag', bomb: 'svg:bombmark' },
  dungeon: { flag: '🚩', bomb: '🧨' }, deepwild: { flag: '🚩', bomb: '💥' },
  sunken: { flag: '⚐', bomb: '💥' }, arcane: { flag: '⚑', bomb: '🌠' }, gearworks: { flag: '🚩', bomb: '🧨' },
  beasts: { flag: '🚩', bomb: '🐝' },
};

const INTERFACE_SLOTS = [
  'health', 'gold', 'menu', 'deck', 'block', 'plating', 'insight', 'mines', 'picks', 'energy', 'turn',
  'draw', 'discard', 'exhaust', 'instinct', 'target', 'bag', 'log', 'cards', 'items', 'services',
  'puzzle', 'scan', 'upgrade', 'victory', 'bossRelic', 'camp', 'buried', 'lair', 'attack', 'defend',
  'crater', 'sentry', 'bulwark', 'relay', 'grub', 'flag', 'bomb', 'safe', 'event', 'shop',
];
const ITEM_SLOTS = [
  'blastgoggles', 'dowsingcharm', 'keystone', 'emberjar', 'loadedcoin', 'fieldkit', 'indexcard',
  'wardplate', 'hexkey', 'gravebell', 'luckycompass', 'quill', 'detector', 'tally', 'pitons',
  'canary', 'lamp', 'dowsingrod', 'metaldetector', 'chalk', 'nitro', 'platingdraught', 'smokebomb',
];
export const ATLAS_SLOT_GROUPS = {
  map: ['dig', 'elite', 'event', 'shop', 'treasure', 'camp', 'boss'],
  enemy: ['grubber', 'minelayer', 'warden', 'wisp', 'shade', 'tunneler', 'clockwork', 'gearhusk', 'ossuary', 'miscounter', 'detonata', 'collapser', 'fogfather', 'nn99'],
  interface: INTERFACE_SLOTS,
  camp: ['rest', 'smith', 'survey', 'train'],
  item: ITEM_SLOTS,
};
export const ATLAS_GROUP_LABELS = { all: 'Complete set', map: 'Map', enemy: 'Enemies', interface: 'Interface & board', camp: 'Camp', item: 'Items' };
/* Shape of the complete-set sheet, shared by the template generator, the
   rendered sheets in assets/icon-atlas/sets, and the reader below. */
export const ATLAS_LAYOUT = { columns: 10, rows: 9, tile: 128 };

export function atlasSlots(group = 'all') {
  const domains = group === 'all' ? Object.keys(ATLAS_SLOT_GROUPS) : [group];
  return domains.flatMap(domain => ATLAS_SLOT_GROUPS[domain].map(key => ({ domain, key, label: key.replace(/([A-Z])/g, ' $1') })));
}

/* Sets contributed by code rather than by the player — see atlasSets.js, which
   registers the rendered sheets shipped in assets/icon-atlas/sets. Kept out of
   preferences so they are never written back to storage. */
let registeredSets = {};
export function registerIconSets(sets) { registeredSets = { ...registeredSets, ...sets }; }

export function customIconSets(prefs) {
  const stored = prefs?.customIconSets && typeof prefs.customIconSets === 'object' ? prefs.customIconSets : {};
  return { ...registeredSets, ...stored };
}
export function iconSetEntries(prefs) {
  const custom = customIconSets(prefs);
  const builtins = ICON_SET_MANIFEST.map(([id, label]) => [id, custom[id] || { id, label, builtin: true }]);
  return [...builtins, ...Object.entries(custom).filter(([id]) => !BUILTIN_ICON_SETS[id])];
}
export function iconSetIds(prefs) { return iconSetEntries(prefs).map(([id]) => id); }
export function iconSetLabel(id, prefs) { return customIconSets(prefs)[id]?.label || BUILTIN_ICON_SETS[id]?.label || id; }
export function customSetBase(id, prefs, fallback = 'emoji') {
  const seen = new Set(); let current = id;
  while (customIconSets(prefs)[current] && !seen.has(current)) {
    seen.add(current); current = customIconSets(prefs)[current].base || fallback;
  }
  return BUILTIN_ICON_SETS[current] ? current : fallback;
}
export function customSetIcon(id, domain, key, prefs) {
  const value = customIconSets(prefs)[id]?.icons?.[`${domain}:${key}`];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}
export function makeAtlasIconSet(prefs, { label, base = 'emoji', data, mime, columns, rows, group = 'all' }) {
  const id = `custom-${Date.now().toString(36)}`;
  const slots = atlasSlots(group);
  const icons = Object.fromEntries(slots.map((slot, index) => [`${slot.domain}:${slot.key}`, `atlas:${id}:${index}`]));
  return [id, {
    id, label: label?.trim() || `Imported Set ${Object.keys(customIconSets(prefs)).length + 1}`,
    base: base === 'mixer' ? 'emoji' : base, icons,
    atlas: { data, mime, columns: Number(columns), rows: Number(rows), group, count: slots.length },
  }];
}

export function resolveAtlasIcon(value, prefs) {
  if (typeof value !== 'string' || !value.startsWith('atlas:')) return value;
  const [, id, rawIndex] = value.split(':');
  const atlas = customIconSets(prefs)[id]?.atlas;
  if (!atlas?.data) return '?';
  const index = Number(rawIndex); const columns = Math.max(1, Number(atlas.columns) || 1); const rows = Math.max(1, Number(atlas.rows) || 1);
  const col = index % columns; const row = Math.floor(index / columns);
  const x = columns === 1 ? 0 : (col / (columns - 1)) * 100;
  const y = rows === 1 ? 0 : (row / (rows - 1)) * 100;
  const style = {
    backgroundImage: `url("${atlas.data.replace(/"/g, '%22')}")`, backgroundRepeat: 'no-repeat',
    backgroundSize: `${columns * 100}% ${rows * 100}%`, backgroundPosition: `${x}% ${y}%`,
  };
  return createElement('span', { className: 'atlas-icon', style, 'aria-hidden': true, key: `${id}:${index}` });
}
