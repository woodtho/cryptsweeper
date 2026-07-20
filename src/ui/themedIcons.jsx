import { Mark, themedVector, VECTOR_THEMES } from './mapIcons.jsx';
import { GADGETS, TRINKETS } from '../engine/data.js';
import { customSetBase, customSetIcon, resolveAtlasIcon } from './iconSets.js';

const CORE = {
  rest: <Mark><path d="M5 17 Q8 11 12 17 Q16 11 19 17 M4 20 H20 M8 9 Q12 4 16 9 Q12 8 8 9" /></Mark>,
  smith: <Mark><path d="M4 7 H17 L20 10 L17 13 H12 V19 H8 V13 H4 Z M13 3 L18 8" /></Mark>,
  survey: <Mark><circle cx="10" cy="10" r="5" /><path d="M14 14 L21 21 M10 7 V13 M7 10 H13" /></Mark>,
  train: <Mark><path d="M4 18 L18 4 M11 4 H18 V11 M4 12 V18 H10 M7 15 L10 18" /></Mark>,
  kit: <Mark><path d="M5 8 H19 V19 H5 Z M9 8 V5 H15 V8 M12 11 V16 M9.5 13.5 H14.5" /></Mark>,
  compass: <Mark><circle cx="12" cy="12" r="8" /><path d="M15.5 8.5 L13 13 L8.5 15.5 L11 11 Z" /></Mark>,
  key: <Mark><circle cx="8" cy="9" r="4" /><path d="M11 12 L20 21 M16 17 L19 14 M18 19 L21 16" /></Mark>,
  lamp: <Mark><path d="M8 8 H16 L18 12 V19 H6 V12 Z M9 8 L10 4 H14 L15 8 M9 15 H15" /></Mark>,
  card: <Mark><path d="M6 3 H18 V21 H6 Z M9 7 H15 M9 11 H15 M9 15 H13" /></Mark>,
  armor: <Mark><path d="M12 3 L19 7 V13 Q18 19 12 22 Q6 19 5 13 V7 Z M12 7 V17 M8 12 H16" /></Mark>,
  tool: <Mark><path d="M5 20 L15 10 M13 5 Q17 2 21 6 L17 10 Q14 11 12 9 M4 17 L8 21" /></Mark>,
  potion: <Mark><path d="M9 3 H15 M10 3 V8 L6 17 Q6 21 12 21 Q18 21 18 17 L14 8 V3 M8 15 H16" /></Mark>,
  bomb: <Mark><circle cx="11" cy="14" r="6" /><path d="M15 9 Q16 5 20 6 M20 3 V5 M18 4 H22" /></Mark>,
  charm: <Mark><path d="M12 3 L15 9 L21 12 L15 15 L12 21 L9 15 L3 12 L9 9 Z" /></Mark>,
};

const ITEM_BASE = {
  blastgoggles: 'survey', dowsingcharm: 'charm', keystone: 'key', emberjar: 'lamp', loadedcoin: 'compass',
  fieldkit: 'kit', indexcard: 'card', wardplate: 'armor', hexkey: 'key', gravebell: 'charm',
  luckycompass: 'compass', quill: 'card', detector: 'survey', tally: 'tool', pitons: 'train', canary: 'charm',
  lamp: 'lamp', dowsingrod: 'tool', metaldetector: 'survey', chalk: 'tool', nitro: 'bomb',
  platingdraught: 'potion', smokebomb: 'bomb',
};

/* Camp and inventory companions for every original map-art set. The vector
   themes below still use the hand-drawn CORE marks and their themed frames. */
const LEGACY_ART = {
  emoji: {
    camp: { rest: '🛏️', smith: '🔨', survey: '🔭', train: '🥾' },
    items: { kit: '🧰', compass: '🧭', key: '🗝️', lamp: '🏮', card: '🃏', armor: '🛡️', tool: '🛠️', potion: '🧪', bomb: '💣', charm: '🫬' },
  },
  crypt: {
    camp: { rest: '⚰️', smith: '⚒️', survey: '👁️', train: '🦴' },
    items: { kit: '🎒', compass: '🦇', key: '🗝️', lamp: '🕯️', card: '📜', armor: '🦴', tool: '⛏️', potion: '⚗️', bomb: '💣', charm: '💀' },
  },
  runes: {
    camp: { rest: '☽', smith: '⚒︎', survey: '◉', train: '↟' },
    items: { kit: '▣', compass: '⌖', key: '⚿', lamp: '◈', card: '▤', armor: '◇', tool: '⚒︎', potion: '⚗︎', bomb: '✹', charm: '✦' },
  },
  dungeon: {
    camp: { rest: '⛺', smith: '⚒️', survey: '🗺️', train: '🥾' },
    items: { kit: '🎒', compass: '🧭', key: '🗝️', lamp: '🏮', card: '📜', armor: '🛡️', tool: '🗡️', potion: '🧪', bomb: '🧨', charm: '💎' },
  },
  deepwild: {
    camp: { rest: '🌙', smith: '🪓', survey: '🦉', train: '🐾' },
    items: { kit: '🍂', compass: '🌻', key: '🪵', lamp: '🔥', card: '🌿', armor: '🌳', tool: '🪓', potion: '🍄', bomb: '🌰', charm: '🪶' },
  },
  sunken: {
    camp: { rest: '🌊', smith: '⚓', survey: '🤿', train: '🦶' },
    items: { kit: '🧳', compass: '🧭', key: '🗝️', lamp: '🏮', card: '📜', armor: '🐚', tool: '🪝', potion: '🧪', bomb: '💥', charm: '🩸' },
  },
  arcane: {
    camp: { rest: '🌛', smith: '🪄', survey: '🔮', train: '✨' },
    items: { kit: '🎒', compass: '🧿', key: '🗝️', lamp: '🌟', card: '📜', armor: '🛡️', tool: '🪄', potion: '⚗️', bomb: '🌠', charm: '💎' },
  },
  gearworks: {
    camp: { rest: '🔌', smith: '🔧', survey: '📡', train: '⚙️' },
    items: { kit: '🧰', compass: '🧭', key: '🔑', lamp: '💡', card: '💾', armor: '🤖', tool: '🛠️', potion: '🔋', bomb: '🧨', charm: '⚙️' },
  },
  beasts: {
    camp: { rest: '🐈‍⬛', smith: '🦷', survey: '🦉', train: '🐾' },
    items: { kit: '🦘', compass: '🦋', key: '🦴', lamp: '🔥', card: '🪶', armor: '🐢', tool: '🦝', potion: '🍄', bomb: '🐝', charm: '🥚' },
  },
};

const CACHE = {};
function themed(name, prefs, selectedStyle) {
  const theme = VECTOR_THEMES[selectedStyle] ? selectedStyle : 'stone';
  const id = `${theme}:${name}`;
  return CACHE[id] ||= themedVector(CORE[name] || CORE.charm, VECTOR_THEMES[theme].frame);
}

function selection(key, prefs) {
  let style = prefs?.interfaceIconStyle || prefs?.mapIconStyle || 'emoji';
  if (style === 'mixer') {
    const choice = prefs?.interfaceIconMix?.[key];
    style = choice?.style || 'emoji';
  }
  return { style };
}

export function itemVector(key, prefs) {
  const name = ITEM_BASE[key] || 'charm';
  const selected = selection(`item:${key}`, prefs);
  if (selected.custom) return selected.custom;
  const custom = customSetIcon(selected.style, 'item', key, prefs);
  if (custom) return resolveAtlasIcon(custom, prefs);
  selected.style = customSetBase(selected.style, prefs, selected.style);
  if (selected.style === 'emoji') {
    return TRINKETS[key]?.emoji || GADGETS[key]?.emoji || LEGACY_ART.emoji.items[name];
  }
  const legacy = LEGACY_ART[selected.style];
  if (legacy) return legacy.items[name] || legacy.items.charm;
  if (selected.style === 'marks') return CORE[name] || CORE.charm;
  return themed(name, prefs, selected.style);
}

export function campVector(action, prefs) {
  const selected = selection(`camp:${action}`, prefs);
  if (selected.custom) return selected.custom;
  const custom = customSetIcon(selected.style, 'camp', action, prefs);
  if (custom) return resolveAtlasIcon(custom, prefs);
  selected.style = customSetBase(selected.style, prefs, selected.style);
  const legacy = LEGACY_ART[selected.style];
  if (legacy) return legacy.camp[action] || legacy.camp.rest;
  if (selected.style === 'marks') return CORE[action] || CORE.rest;
  return themed(action, prefs, selected.style);
}
