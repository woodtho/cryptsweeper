import { MARKS } from './mapIcons.jsx';
import { loadPreferences } from '../engine/preferences.js';
import { GADGETS, TRINKETS } from '../engine/data.js';
import { FLAG_BOMB_ART, ICON_SET_MANIFEST, customSetBase, customSetIcon, iconSetIds, resolveAtlasIcon } from './iconSets.js';

export const ART_STYLE_KEYS = ICON_SET_MANIFEST.map(([key]) => key);
export const getArtStyleKeys = prefs => iconSetIds(prefs);

export const ART_STYLE_LABELS = {
  ...Object.fromEntries(ICON_SET_MANIFEST),
  mixer: 'Mix & Match',
};

/* Seven visual roles let every interface category inherit the same language as
   map artwork without forcing unrelated controls to share a literal emoji. */
const ROLES = {
  action: 'dig', danger: 'elite', mystery: 'event', utility: 'shop', reward: 'treasure', rest: 'camp', authority: 'boss',
};

const LEGACY = {
  emoji:     { dig: '⚔️', elite: '☠️', event: '🔮', shop: '🛒', treasure: '💰', camp: '🏕️', boss: '👑' },
  crypt:     { dig: '⛏️', elite: '🧟', event: '🦇', shop: '🐀', treasure: '⚱️', camp: '🕯️', boss: '😈' },
  dungeon:   { dig: '🗡️', elite: '👹', event: '🎲', shop: '🧙', treasure: '🏆', camp: '⛺', boss: '🐉' },
  deepwild:  { dig: '🪓', elite: '🦂', event: '🍄', shop: '🐌', treasure: '💎', camp: '🌙', boss: '🕷️' },
  sunken:    { dig: '🤿', elite: '🦈', event: '🐚', shop: '🦀', treasure: '🪙', camp: '🏮', boss: '🐙' },
  arcane:    { dig: '🪄', elite: '🧛', event: '✨', shop: '🧿', treasure: '📜', camp: '🌛', boss: '🧞' },
  gearworks: { dig: '🔧', elite: '🤖', event: '🎰', shop: '⚖️', treasure: '🔋', camp: '🔌', boss: '🛸' },
  beasts:    { dig: '🐾', elite: '🐺', event: '🦉', shop: '🦝', treasure: '🥚', camp: '🐈‍⬛', boss: '🐻' },
};

const VECTOR_BASE = { dig: 'picks', elite: 'fangskull', event: 'eye', shop: 'scales', treasure: 'gem', camp: 'fire', boss: 'crown' };
const UNIQUE_INTERFACE_BASE = {
  menu: 'menulines', health: 'heart', gold: 'coin', deck: 'cardstack', block: 'shield', plating: 'plate', insight: 'insight',
  mines: 'mine', picks: 'pickcounter', energy: 'spark', draw: 'drawpile', discard: 'discardpile', exhaust: 'ashcard',
  instinct: 'paw', safe: 'safetile', turn: 'turnwheel', target: 'target', bag: 'bag', log: 'log', cards: 'cards',
  items: 'items', services: 'services', puzzle: 'puzzle', scan: 'scan', upgrade: 'upgrade', victory: 'victory',
  bossRelic: 'bossRelic', camp: 'campmark', buried: 'buried', lair: 'lair', attack: 'attack', defend: 'defend',
  crater: 'crater', sentry: 'sentry', bulwark: 'bulwark', relay: 'relay', grub: 'grubmark', event: 'eventmark', shop: 'shopmark',
};
const UNIQUE_INTERFACE_ART = {
  emoji:     { menu: '☰', health: '❤️', gold: '🪙', deck: '🃏', block: '🛡️', plating: '🧱', insight: '💡', mines: '💣', picks: '⛏️', energy: '⚡', draw: '📥', discard: '♻️', exhaust: '🔥', instinct: '🐾', safe: '✅', turn: '🔄' },
  crypt:     { health: '🩸', gold: '⚱️', deck: '📜', block: '🛡', plating: '⛓', insight: '🪔', mines: '✹', picks: '⛏', energy: '🔮', draw: '⇩', discard: '↯', exhaust: '♨', instinct: '🯶', safe: '◇', turn: '⌛' },
  dungeon:   { health: '🧪', gold: '💰', deck: '📚', block: '🛡️', plating: '🧱', insight: '🔍', mines: '💣', picks: '⛏️', energy: '💠', draw: '📥', discard: '🗑️', exhaust: '🔥', instinct: '👁️', safe: '✅', turn: '⏳' },
  deepwild:  { health: '🌿', gold: '🌰', deck: '🍂', block: '🐚', plating: '🪵', insight: '🌱', mines: '🐝', picks: '🪓', energy: '⚡', draw: '🌾', discard: '🍃', exhaust: '🔥', instinct: '🐾', safe: '🌼', turn: '⏳' },
  sunken:    { health: '🫧', gold: '🪙', deck: '🗺️', block: '🛡️', plating: '🪸', insight: '💡', mines: '💣', picks: '🔱', energy: '⚡', draw: '⬇', discard: '♻️', exhaust: '♨', instinct: '🐾', safe: '✅', turn: '🔄' },
  arcane:    { health: '💗', gold: '💎', deck: '📖', block: '🔷', plating: '🔶', insight: '👁️', mines: '🌑', picks: '🪄', energy: '⚡', draw: '📥', discard: '♻', exhaust: '🔥', instinct: '🌙', safe: '⭐', turn: '🔁' },
  gearworks: { health: '❤️', gold: '🪙', deck: '🗂️', block: '🛡️', plating: '🔩', insight: '💡', mines: '💣', picks: '🔧', energy: '⚡', draw: '📥', discard: '♻️', exhaust: '🔥', instinct: '🧭', safe: '✅', turn: '⏱️' },
  beasts:    { health: '❤️', gold: '🥚', deck: '🪶', block: '🐢', plating: '🦴', insight: '💡', mines: '🐝', picks: '🦷', energy: '⚡', draw: '🌱', discard: '🍂', exhaust: '🔥', instinct: '👃', safe: '🕊️', turn: '🌗' },
};
/* Secondary controls used to inherit one of seven broad map symbols, which
   made unrelated actions indistinguishable in the emoji families. These
   semantic glyphs remain shared across emoji themes, but are unique by use. */
const LEGACY_DETAIL_ART = {
  target: '🎯', bag: '🎒', log: '📝', cards: '🎴', items: '🎁', services: '🧰',
  puzzle: '🧩', scan: '🔎', upgrade: '📈', victory: '🏆', bossRelic: '🎖️', camp: '🛖',
  buried: '🫥', lair: '🏚️', attack: '🗡️', defend: '🫡️', crater: '🌋', sentry: '🗼',
  bulwark: '🏰', relay: '📡', grub: '🦠', event: '❓', shop: '🏪',
};
export const INTERFACE_ICON_CATEGORIES = {
  health: ['Health', 'reward'], gold: ['Gold', 'reward'], menu: ['Menu', 'utility'], deck: ['Deck', 'mystery'],
  block: ['Block', 'authority'], plating: ['Plating', 'authority'], insight: ['Insight', 'mystery'], mines: ['Mines', 'danger'],
  picks: ['Picks', 'action'], energy: ['Energy', 'mystery'], turn: ['Turn', 'utility'], draw: ['Draw pile', 'mystery'], discard: ['Discard', 'utility'],
  exhaust: ['Exhaust', 'danger'], instinct: ['Instinct', 'rest'], target: ['Target', 'action'], bag: ['Bag', 'utility'],
  log: ['Log', 'mystery'], cards: ['Cards', 'mystery'], items: ['Items', 'reward'], services: ['Services', 'utility'],
  puzzle: ['Puzzle', 'mystery'], scan: ['Scan', 'mystery'], upgrade: ['Upgrade', 'reward'], victory: ['Victory', 'reward'],
  bossRelic: ['Boss relic', 'authority'], camp: ['Camp', 'rest'], buried: ['Buried', 'danger'], lair: ['Lair', 'action'],
  attack: ['Attack', 'action'], defend: ['Defend', 'authority'], crater: ['Crater', 'danger'], sentry: ['Sentry', 'authority'],
  bulwark: ['Bulwark', 'authority'], relay: ['Relay', 'mystery'], grub: ['Grub', 'danger'], flag: ['Flag', 'action'],
  bomb: ['Bomb', 'danger'], mine: ['Bomb (legacy alias)', 'danger'], safe: ['Safe scan', 'reward'], event: ['Event', 'mystery'], shop: ['Shop', 'utility'],
};

for (const [key, label] of Object.entries({ rest: 'Camp: Rest', smith: 'Camp: Smith', survey: 'Camp: Survey', train: 'Camp: Training' })) {
  INTERFACE_ICON_CATEGORIES[`camp:${key}`] = [label, key === 'rest' ? 'rest' : key === 'survey' ? 'mystery' : 'action'];
}
for (const [key, def] of [...Object.entries(TRINKETS), ...Object.entries(GADGETS)]) {
  INTERFACE_ICON_CATEGORIES[`item:${key}`] = [`Item: ${def.name}`, 'reward'];
}

function roleFor(name) { return ROLES[INTERFACE_ICON_CATEGORIES[name]?.[1]] || 'event'; }

function resolveToken(token, prefs = null) {
  if (typeof token === 'string' && token.startsWith('atlas:')) return resolveAtlasIcon(token, prefs);
  return typeof token === 'string' && token.startsWith('svg:') ? MARKS[token.slice(4)] || '?' : token;
}

export function interfaceIconForStyle(name, styleKey = 'main', prefs = null) {
  const custom = customSetIcon(styleKey, 'interface', name, prefs);
  if (custom) return resolveToken(custom, prefs);
  styleKey = customSetBase(styleKey, prefs, styleKey);
  if (name === 'flag' || name === 'bomb' || name === 'mine') {
    const special = name === 'flag' ? 'flag' : 'bomb';
    return resolveToken((FLAG_BOMB_ART[styleKey] || FLAG_BOMB_ART.emoji)[special]);
  }
  const uniqueMark = UNIQUE_INTERFACE_BASE[name];
  if (uniqueMark) {
    if (styleKey === 'marks') return MARKS[uniqueMark];
    const art = UNIQUE_INTERFACE_ART[styleKey]?.[name] || UNIQUE_INTERFACE_ART.emoji[name];
    if (art) return art;
  }
  if (styleKey !== 'marks' && LEGACY_DETAIL_ART[name]) {
    return LEGACY_DETAIL_ART[name];
  }
  const role = roleFor(name);
  if (styleKey === 'marks') return MARKS[VECTOR_BASE[role]];
  return (LEGACY[styleKey] || LEGACY.emoji)[role];
}

export function interfaceIcon(name, prefs = loadPreferences()) {
  let style = prefs?.interfaceIconStyle || 'main';
  if (style === 'mixer') {
    const choice = prefs?.interfaceIconMix?.[name];
    style = getArtStyleKeys(prefs).includes(choice?.style) ? choice.style : 'emoji';
  }
  return interfaceIconForStyle(name, style, prefs);
}

export function GameIcon({ name, preferences, className = '', title }) {
  return <span className={`game-icon ${className}`} title={title} aria-hidden="true">{interfaceIcon(name, preferences)}</span>;
}

/* Legacy prose and combat logs contain meaningful leading symbols. Rendering
   through this table preserves the prose while moving the artwork into the
   selectable icon system. New text can also use [[icon:name]] directly. */
const TEXT_ICON_TOKENS = {
  '💥': 'bomb', '🔧': 'services', '⛏': 'picks', '🎼': 'cards', '🌋': 'crater', '🏗': 'sentry',
  '★': 'victory', '☣': 'mine', '🌫': 'event', '🌀': 'event', '🕳': 'buried', '🛡': 'block',
  '⛨': 'plating', '🩸': 'health', '⚔': 'attack', '🗡': 'attack', '☠': 'mine', '🛰': 'services',
  '🗺': 'scan', '🪙': 'gold', '📻': 'scan', '📿': 'items', '🔷': 'scan', '🗼': 'sentry',
  '⚡': 'energy', '🎁': 'items', '🚪': 'event', '🪦': 'event', '🐐': 'event', '⛓': 'event',
  '🎂': 'event', '🧪': 'event', '📜': 'event', '🍄': 'event', '🔨': 'services', '🎲': 'event',
  '👑': 'bossRelic', '🔥': 'camp', '🎒': 'bag', '🃏': 'cards', '🧩': 'puzzle', '🔎': 'scan',
  '🎯': 'target', '❤': 'health', '🐾': 'instinct', '💣': 'bomb',
};
const TOKEN_LIST = Object.keys(TEXT_ICON_TOKENS).sort((a, b) => b.length - a.length);

export function IconText({ children, preferences, className = '' }) {
  const text = String(children ?? '');
  const parts = [];
  let plain = '';
  const flush = () => { if (plain) { parts.push(plain); plain = ''; } };
  for (let i = 0; i < text.length;) {
    const named = text.slice(i).match(/^\[\[icon:([\w:-]+)\]\]/);
    if (named) {
      flush(); parts.push(<GameIcon key={`i-${i}`} name={named[1]} preferences={preferences} />); i += named[0].length; continue;
    }
    const token = TOKEN_LIST.find(candidate => text.startsWith(candidate, i));
    if (token) {
      flush(); parts.push(<GameIcon key={`i-${i}`} name={TEXT_ICON_TOKENS[token]} preferences={preferences} />);
      i += token.length;
      if (text[i] === '\ufe0f') i++;
      continue;
    }
    plain += text[i++];
  }
  flush();
  return <span className={className}>{parts}</span>;
}
