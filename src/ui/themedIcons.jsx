import { Mark } from './mapIcons.jsx';
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

/* Every inventory slot gets its own trail mark. The forms use the terse
   scratches, gates, loops, and notches of improvised wayfinding symbols while
   remaining original to Cryptsweeper and legible at small sizes. */
const ITEM_MARKS = {
  blastgoggles: <Mark><circle cx="8" cy="12" r="4" /><circle cx="16" cy="12" r="4" /><path d="M12 12 H12 M4 10 L2 7 M20 10 L22 7 M7 16 L5 20 M17 16 L19 20" /></Mark>,
  dowsingcharm: <Mark><path d="M6 3 L12 10 L18 3 M12 10 V17 M8 20 Q12 15 16 20 Q12 23 8 20" /></Mark>,
  keystone: <Mark><path d="M4 8 L12 3 L20 8 L17 14 H14 V21 H10 V14 H7 Z M9 9 H15" /></Mark>,
  emberjar: <Mark><path d="M7 8 H17 L19 20 H5 Z M9 8 V4 H15 V8 M12 17 Q8 14 12 10 Q16 14 12 17" /></Mark>,
  loadedcoin: <Mark><circle cx="12" cy="12" r="9" /><path d="M8 7 H14 Q18 8 15 12 Q12 15 16 18 M8 17 L16 7 M6 12 H9" /></Mark>,
  fieldkit: <Mark><path d="M4 8 H20 V20 H4 Z M8 8 V5 H16 V8 M12 11 V17 M9 14 H15 M4 12 H7" /></Mark>,
  indexcard: <Mark><path d="M5 5 H11 L13 3 H19 V21 H5 Z M8 9 H16 M8 13 H16 M8 17 H13 M5 7 H19" /></Mark>,
  wardplate: <Mark><path d="M5 5 L12 2 L19 5 V14 Q17 20 12 22 Q7 20 5 14 Z M8 8 H16 M12 8 V18 M8 15 H16" /></Mark>,
  hexkey: <Mark><path d="M7 4 L12 2 L17 5 V10 L12 13 L7 10 Z M12 13 V21 M12 17 H17 M15 17 V20" /></Mark>,
  gravebell: <Mark><path d="M8 15 V10 Q8 5 12 5 Q16 5 16 10 V15 L19 18 H5 Z M12 5 V2 M10 21 H14 M12 18 V21" /></Mark>,
  luckycompass: <Mark><circle cx="12" cy="12" r="8" /><path d="M15 7 L13 13 L7 16 L10 10 Z M4 4 L7 5 M20 4 L17 5 M12 20 V23" /></Mark>,
  quill: <Mark><path d="M5 21 Q8 10 19 3 Q20 10 11 16 L5 21 M8 17 L15 10 M10 18 L4 18" /></Mark>,
  detector: <Mark><path d="M6 20 L10 8 H17 L20 20 Z M12 8 V4 M9 4 Q12 1 15 4 M9 14 H17 M13 17 H16" /></Mark>,
  tally: <Mark><path d="M5 4 V20 M9 4 V20 M13 4 V20 M17 4 V20 M3 17 L20 7 M21 4 V8" /></Mark>,
  pitons: <Mark><path d="M6 3 V17 L3 21 H9 L6 17 M17 3 V13 L14 17 H20 L17 13 M6 7 H11 M17 7 H21" /></Mark>,
  canary: <Mark><path d="M5 14 Q5 7 12 7 Q18 7 19 12 Q15 18 9 17 L5 20 Z M12 7 L14 3 M8 10 Q11 12 8 14" /><circle cx="16" cy="10" r=".8" fill="currentColor" /></Mark>,
  lamp: <Mark><path d="M5 9 H15 L18 13 V20 H3 V13 Z M7 9 L8 4 H12 L13 9 M7 15 H14 M18 7 L22 4 M19 11 H23" /></Mark>,
  dowsingrod: <Mark><path d="M4 3 L11 11 V21 M20 3 L13 11 V17 M8 6 L12 3 L16 6 M8 18 H14" /></Mark>,
  bedrockheart: <Mark><path d="M12 21 L5 13 Q2 8 7 5 Q10 4 12 7 Q14 4 17 5 Q22 8 19 13 Z M7 13 L10 10 L13 14 L17 8" /></Mark>,
  devouringpick: <Mark><path d="M4 7 Q12 1 20 7 M12 4 V21 M8 21 H16 M5 9 L2 12 M19 9 L22 12" /></Mark>,
  fogglass: <Mark><path d="M12 2 L20 9 L16 21 H8 L4 9 Z M7 10 Q12 6 17 10 Q12 14 7 10 M10 17 H14" /></Mark>,
  silverthread: <Mark><path d="M5 5 Q12 1 19 5 Q13 9 6 8 Q12 12 18 11 Q13 16 6 14 Q10 19 19 19" /></Mark>,
  signalcore: <Mark><path d="M12 2 L20 8 V16 L12 22 L4 16 V8 Z M12 7 L16 10 V14 L12 17 L8 14 V10 Z M12 2 V7" /></Mark>,
  protocolcoil: <Mark><path d="M5 6 Q9 2 12 6 Q15 10 19 6 M5 12 Q9 8 12 12 Q15 16 19 12 M5 18 Q9 14 12 18 Q15 22 19 18" /></Mark>,
  wardenseal: <Mark><path d="M12 2 L20 6 V13 Q19 19 12 22 Q5 19 4 13 V6 Z M8 8 H16 M8 12 H16 M12 8 V18" /></Mark>,
  veincompass: <Mark><circle cx="12" cy="12" r="9" /><path d="M12 4 L15 12 L12 20 L9 12 Z M4 12 H9 M15 12 H20 M7 5 L9 8 M17 5 L15 8" /></Mark>,
  metaldetector: <Mark><path d="M7 3 L13 9 L9 18 M13 9 L17 6 M5 20 Q10 16 15 20 Q10 23 5 20 M15 4 Q18 2 21 5" /></Mark>,
  chalk: <Mark><path d="M5 18 L15 4 L20 8 L10 21 Z M4 21 H12 M14 8 L18 11 M3 5 L7 9" /></Mark>,
  nitro: <Mark><path d="M8 5 H16 M9 5 V9 L6 18 Q8 22 12 22 Q16 22 18 18 L15 9 V5 M8 16 H16 M19 3 V7 M17 5 H21" /></Mark>,
  platingdraught: <Mark><path d="M9 3 H15 M10 3 V8 L6 17 Q6 21 12 21 Q18 21 18 17 L14 8 V3 M9 14 L12 11 L15 14 V18 H9 Z" /></Mark>,
  smokebomb: <Mark><circle cx="10" cy="15" r="5" /><path d="M13 11 Q15 7 18 8 M17 5 Q20 3 22 6 M4 8 Q7 5 10 8 M15 19 Q19 16 22 19" /></Mark>,
};

const ITEM_BASE = {
  blastgoggles: 'survey', dowsingcharm: 'charm', keystone: 'key', emberjar: 'lamp', loadedcoin: 'compass',
  fieldkit: 'kit', indexcard: 'card', wardplate: 'armor', hexkey: 'key', gravebell: 'charm',
  luckycompass: 'compass', quill: 'card', detector: 'survey', tally: 'tool', pitons: 'train', canary: 'charm',
  lamp: 'lamp', dowsingrod: 'tool', bedrockheart: 'charm', devouringpick: 'tool',
  fogglass: 'charm', silverthread: 'charm', signalcore: 'charm', protocolcoil: 'tool',
  wardenseal: 'armor', veincompass: 'compass', metaldetector: 'survey', chalk: 'tool', nitro: 'bomb',
  platingdraught: 'potion', smokebomb: 'bomb',
};
const ITEM_ROLE_LEADER = {
  charm: 'dowsingcharm', key: 'keystone', lamp: 'emberjar', compass: 'luckycompass', kit: 'fieldkit',
  card: 'indexcard', armor: 'wardplate', tool: 'tally', bomb: 'nitro', potion: 'platingdraught',
};
const LEGACY_ITEM_OVERRIDES = {
  crypt: { emberjar: '🏮', tally: '🧮', luckycompass: '🧭', fieldkit: '🩹' },
  dungeon: { tally: '🧮', wardplate: '🦺', platingdraught: '⚗️', metaldetector: '🧲', fieldkit: '🩹' },
  deepwild: { dowsingcharm: '🌸', platingdraught: '⚗️', indexcard: '📇', nitro: '🧨', fieldkit: '🩹', keystone: '🗝️', emberjar: '🏮', tally: '🧮' },
  sunken: { wardplate: '🦺', emberjar: '🔥' },
  arcane: { tally: '🧮', dowsingrod: '☄️', luckycompass: '🧭', indexcard: '🃏', dowsingcharm: '📿', hexkey: '🔑', fieldkit: '🩹' },
  gearworks: { wardplate: '🛡️', platingdraught: '⚗️', dowsingcharm: '📿', emberjar: '🏮', fieldkit: '🩹' },
  beasts: { dowsingcharm: '🌼', indexcard: '📇', nitro: '🧨', tally: '🧮', keystone: '🔑' },
};

/* Camp and inventory companions for every original map-art set. The vector
   themes below still use the hand-drawn CORE marks and their themed frames. */
const LEGACY_ART = {
  emoji: {
    camp: { rest: '🛏️', smith: '🔨', survey: '🔭', train: '🥾' },
    items: { kit: '🧰', compass: '🧭', key: '🗝️', lamp: '🏮', card: '🃏', armor: '🛡️', tool: '🛠️', potion: '🧪', bomb: '💣', charm: '🫬' },
  },
  crypt: {
    camp: { rest: '⚰️', smith: '⚒️', survey: '🔭', train: '🥾' },
    items: { kit: '🎒', compass: '🦇', key: '🗝️', lamp: '🕯️', card: '📜', armor: '🦴', tool: '⛏️', potion: '⚗️', bomb: '💣', charm: '💀' },
  },
  dungeon: {
    camp: { rest: '🛏️', smith: '⚒️', survey: '🗺️', train: '🥾' },
    items: { kit: '🎒', compass: '🧭', key: '🗝️', lamp: '🏮', card: '📜', armor: '🛡️', tool: '🗡️', potion: '🧪', bomb: '🧨', charm: '💎' },
  },
  deepwild: {
    camp: { rest: '💤', smith: '🪚', survey: '🔭', train: '🏃' },
    items: { kit: '🍂', compass: '🌻', key: '🪵', lamp: '🔥', card: '🌿', armor: '🌳', tool: '🪓', potion: '🍄', bomb: '🌰', charm: '🪶' },
  },
  sunken: {
    camp: { rest: '🛏️', smith: '🔨', survey: '🔭', train: '🦶' },
    items: { kit: '🧳', compass: '🧭', key: '🗝️', lamp: '🏮', card: '📜', armor: '🐚', tool: '🪝', potion: '🧪', bomb: '💥', charm: '🩸' },
  },
  arcane: {
    camp: { rest: '💤', smith: '🔨', survey: '🔮', train: '📚' },
    items: { kit: '🎒', compass: '🧿', key: '🗝️', lamp: '🌟', card: '📜', armor: '🛡️', tool: '🪄', potion: '⚗️', bomb: '🌠', charm: '💎' },
  },
  gearworks: {
    camp: { rest: '🛏️', smith: '🔨', survey: '🔭', train: '🏋️' },
    items: { kit: '🧰', compass: '🧭', key: '🔑', lamp: '💡', card: '💾', armor: '🤖', tool: '🛠️', potion: '🔋', bomb: '🧨', charm: '⚙️' },
  },
  beasts: {
    camp: { rest: '💤', smith: '🔨', survey: '🔭', train: '🏃' },
    items: { kit: '🦘', compass: '🦋', key: '🦴', lamp: '🔥', card: '🪶', armor: '🐢', tool: '🦝', potion: '🍄', bomb: '🐝', charm: '🥚' },
  },
};

function selection(key, prefs) {
  let style = prefs?.interfaceIconStyle || prefs?.mapIconStyle || 'main';
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
  if (legacy) {
    /* Keep one strongly themed example for each visual role. Other items use
       their own catalog emoji instead of repeating that role glyph 2–4 times. */
    const override = LEGACY_ITEM_OVERRIDES[selected.style]?.[key];
    if (override) return override;
    if (ITEM_ROLE_LEADER[name] === key) return legacy.items[name] || legacy.items.charm;
    return TRINKETS[key]?.emoji || GADGETS[key]?.emoji || legacy.items[name] || legacy.items.charm;
  }
  if (selected.style === 'marks') return ITEM_MARKS[key] || CORE[name] || CORE.charm;
  return TRINKETS[key]?.emoji || GADGETS[key]?.emoji || CORE[name] || CORE.charm;
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
  return LEGACY_ART.emoji.camp[action] || CORE[action] || CORE.rest;
}
