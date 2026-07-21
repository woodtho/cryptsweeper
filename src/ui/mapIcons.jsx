/* CRYPTSWEEPER — Delver's Marks: an original set of ten carved map icons.
   Hand-drawn SVGs in the game's angular, chamfered aesthetic. Everything is
   stroked in currentColor so node states (reachable, current, done) tint the
   marks exactly like the text glyphs. Referenced as 'svg:<name>' tokens. */

export function Mark({ children }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

const CORE_MARKS = {
  /* crossed pickaxes — an honest dig */
  picks: (
    <Mark>
      <path d="M5 19 L17 7 M13 3.5 Q18 3.5 20.5 8" />
      <path d="M19 19 L7 7 M11 3.5 Q6 3.5 3.5 8" />
    </Mark>
  ),
  /* horned skull — an elite guards this seam */
  fangskull: (
    <Mark>
      <path d="M7 10 a5 5 0 0 1 10 0 v3 l-2 2 v3 h-6 v-3 l-2 -2 z" />
      <path d="M6 8 Q3 6.5 3 3.5 M18 8 Q21 6.5 21 3.5" />
      <circle cx="9.6" cy="11" r="1.15" fill="currentColor" stroke="none" />
      <circle cx="14.4" cy="11" r="1.15" fill="currentColor" stroke="none" />
      <path d="M10 18 v2.2 M14 18 v2.2" />
    </Mark>
  ),
  /* the scrying eye — something unknown waits */
  eye: (
    <Mark>
      <path d="M2 12 Q12 4.5 22 12 Q12 19.5 2 12 Z" />
      <path d="M12 8.6 Q13.6 12 12 15.4 Q10.4 12 12 8.6 Z" fill="currentColor" stroke="none" />
    </Mark>
  ),
  /* merchant scales — the Rat Merchant's sign */
  scales: (
    <Mark>
      <path d="M12 4.5 V20 M8.5 20 H15.5 M5 7 H19" />
      <path d="M5 7 L3 12 M5 7 L7 12 M2.5 12 Q5 15.5 7.5 12" />
      <path d="M19 7 L17 12 M19 7 L21 12 M16.5 12 Q19 15.5 21.5 12" />
    </Mark>
  ),
  /* faceted gem — treasure in the dark */
  gem: (
    <Mark>
      <path d="M12 3 L19 9 L12 21 L5 9 Z M5 9 H19 M12 3 L8.5 9 L12 21 M12 3 L15.5 9 L12 21" />
    </Mark>
  ),
  /* campfire — a candle's worth of safety */
  fire: (
    <Mark>
      <path d="M12 3 Q16 8 14 11 Q17 10.5 17 14 Q17 17 12 17 Q7 17 7 14 Q7 10.5 10 11 Q8 8 12 3 Z" />
      <path d="M4 20.5 L20 17.8 M4 17.8 L20 20.5" />
    </Mark>
  ),
  /* the crown — a boss holds the way down */
  crown: (
    <Mark>
      <path d="M4 18 V8 L9 12 L12 4.5 L15 12 L20 8 V18 Z" />
      <circle cx="8" cy="15.4" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="15.4" r="1" fill="currentColor" stroke="none" />
      <circle cx="16" cy="15.4" r="1" fill="currentColor" stroke="none" />
    </Mark>
  ),
  /* miner's lantern — trimmed and lit */
  lantern: (
    <Mark>
      <path d="M12 2 v1.6" />
      <circle cx="12" cy="5" r="1.3" />
      <path d="M8.5 8 H15.5 L17.5 11 V16 L15.5 19 H8.5 L6.5 16 V11 Z" />
      <circle cx="12" cy="13.5" r="1.9" fill="currentColor" stroke="none" />
    </Mark>
  ),
  /* the mine — what the crypt keeps */
  mine: (
    <Mark>
      <circle cx="12" cy="13" r="5.2" />
      <path d="M12 4.8 V7.2 M12 18.8 V21.2 M3.8 13 H6.2 M17.8 13 H20.2" />
      <path d="M6.3 7.3 L8 9 M17.7 7.3 L16 9 M6.3 18.7 L8 17 M17.7 18.7 L16 17" />
      <circle cx="10.2" cy="11.2" r="1" fill="currentColor" stroke="none" />
    </Mark>
  ),
  /* claim marker kept visually separate from the bomb */
  flag: (
    <Mark>
      <path d="M6 21 V3 M7 4 H19 L16 8 L19 12 H7" />
      <path d="M3.5 21 H9" />
    </Mark>
  ),
  /* crossed bones — delvers who guessed */
  bones: (
    <Mark>
      <path d="M8 8 L16 16" />
      <circle cx="6.4" cy="7.9" r="1.5" /><circle cx="7.9" cy="6.4" r="1.5" />
      <circle cx="17.6" cy="16.1" r="1.5" /><circle cx="16.1" cy="17.6" r="1.5" />
      <path d="M16 8 L8 16" />
      <circle cx="17.6" cy="7.9" r="1.5" /><circle cx="16.1" cy="6.4" r="1.5" />
      <circle cx="6.4" cy="16.1" r="1.5" /><circle cx="7.9" cy="17.6" r="1.5" />
    </Mark>
  ),
  /* dedicated HUD marks — no two tracked resources share a silhouette */
  heart: (
    <Mark><path d="M12 20 S3.5 15 3.5 8.8 A4.3 4.3 0 0 1 12 7 A4.3 4.3 0 0 1 20.5 8.8 C20.5 15 12 20 12 20 Z" /></Mark>
  ),
  coin: (
    <Mark><circle cx="12" cy="12" r="8.5" /><path d="M14.8 8.3 Q12.7 6.7 10.3 8 Q8.5 9 10.2 10.8 L13.9 12.7 Q15.8 14.1 13.8 16 Q11.3 17.8 8.8 15.7 M12 5.5 V18.5" /></Mark>
  ),
  cardstack: (
    <Mark><rect x="7" y="4" width="11" height="15" rx="1" /><path d="M7 7 L4 8 V20 H15 M10 8 H15 M10 11 H15" /></Mark>
  ),
  shield: (
    <Mark><path d="M12 3 L20 6 V11 Q20 17 12 21 Q4 17 4 11 V6 Z" /><path d="M12 7 V17 M8 12 H16" /></Mark>
  ),
  plate: (
    <Mark><path d="M8 4 L17 6 L20 11 L16 19 L7 18 L4 11 Z" /><path d="M10 7 L15 8 L17 11 L14 16 L9 15 L7 11 Z" /></Mark>
  ),
  insight: (
    <Mark><path d="M8 14 Q5 11 7 7 Q9 3 13 4 Q18 4 18 9 Q18 12 15 14 V17 H9 V14 Z M9 20 H15" /><path d="M12 7 V11 M9.5 9 H14.5" /></Mark>
  ),
  spark: (
    <Mark><path d="M14 2 L6.5 13 H11 L9.5 22 L18 10 H13.5 Z" /></Mark>
  ),
  drawpile: (
    <Mark><path d="M5 5 H15 V18 H5 Z M8 2 H18 V15" /><path d="M10 8 V14 M7.5 11 L10 14 L12.5 11" /></Mark>
  ),
  discardpile: (
    <Mark><path d="M4 5 H14 V18 H4 Z M7 2 H17 V12" /><path d="M13 15 H21 M18 12 L21 15 L18 18" /></Mark>
  ),
  ashcard: (
    <Mark><path d="M5 3 H17 V20 H5 Z" /><path d="M11 17 Q7 15 9 12 Q10 10 10 7 Q15 10 14 13 Q17 12 16 15 Q15 18 11 17 Z" /></Mark>
  ),
  paw: (
    <Mark><ellipse cx="12" cy="15" rx="5" ry="4" /><circle cx="6.5" cy="10" r="2" /><circle cx="10" cy="6.5" r="2" /><circle cx="14.5" cy="6.5" r="2" /><circle cx="18" cy="10" r="2" /></Mark>
  ),
  safetile: (
    <Mark><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M7 12 L10.5 15.5 L17.5 8.5" /></Mark>
  ),
  turnwheel: (
    <Mark><path d="M18 8 A7 7 0 1 0 19 15 M18 4 V8 H14 M6 16 A7 7 0 0 0 18 8 M6 20 V16 H10" /></Mark>
  ),
  menulines: (
    <Mark><path d="M5 7 H19 M5 12 H19 M5 17 H19" /><circle cx="3" cy="7" r=".7" fill="currentColor" /><circle cx="3" cy="12" r=".7" fill="currentColor" /><circle cx="3" cy="17" r=".7" fill="currentColor" /></Mark>
  ),
  pickcounter: (
    <Mark><path d="M5 19 L15 5 M12 4 H18 V10 M4 14 L10 20 M3 20 H13 M19 14 V20 M16 17 H22" /></Mark>
  ),
  bombmark: (
    <Mark><circle cx="10" cy="15" r="6" /><path d="M14 10 Q16 6 20 8 M19 3 V6 M16.5 4.5 L18.5 6.5 M20.5 4.5 L18.5 6.5 M7 13 L11 17 M11 13 L7 17" /></Mark>
  ),
  /* Trail-sign interface marks: compact, scratchable symbols inspired by the
     visual grammar of historic wayfinding marks without copying their forms. */
  target: (
    <Mark><circle cx="12" cy="12" r="6" /><path d="M12 2 V7 M12 17 V22 M2 12 H7 M17 12 H22 M10 12 H14" /></Mark>
  ),
  bag: (
    <Mark><path d="M7 8 Q12 5 17 8 L19 20 H5 Z M9 8 Q9 3 12 3 Q15 3 15 8 M8 13 L11 16 L16 11" /></Mark>
  ),
  log: (
    <Mark><path d="M5 4 H17 L20 7 V20 H5 Z M17 4 V8 H20 M8 10 H16 M8 14 H15 M8 18 H13" /></Mark>
  ),
  cards: (
    <Mark><path d="M5 6 L16 3 L20 17 L9 20 Z M8 7 L15 5 M10 11 L17 9 M11 15 L18 13 M4 9 L7 20" /></Mark>
  ),
  items: (
    <Mark><path d="M4 9 H20 V20 H4 Z M8 9 V6 Q12 2 16 6 V9 M12 9 V20 M4 13 H20" /></Mark>
  ),
  services: (
    <Mark><path d="M4 19 L10 13 M8 6 L12 10 L17 5 M14 4 L18 8 M7 16 L10 19 M15 14 L20 19" /></Mark>
  ),
  puzzle: (
    <Mark><path d="M4 5 H10 V9 Q12 7 14 9 V5 H20 V11 H16 Q18 13 16 15 H20 V20 H14 V16 Q12 18 10 16 V20 H4 V14 H8 Q6 12 8 10 H4 Z" /></Mark>
  ),
  scan: (
    <Mark><path d="M3 11 Q12 3 21 11 Q12 19 3 11 Z M16 16 L21 21" /><circle cx="12" cy="11" r="2.5" /></Mark>
  ),
  upgrade: (
    <Mark><path d="M4 20 H9 V15 H14 V10 H19 M15 6 L19 10 L15 14 M6 17 L8 19" /></Mark>
  ),
  victory: (
    <Mark><path d="M5 4 H19 V9 Q19 15 12 17 Q5 15 5 9 Z M9 17 V21 M15 17 V21 M7 21 H17 M9 9 L11 11 L15 7" /></Mark>
  ),
  bossRelic: (
    <Mark><circle cx="12" cy="11" r="5" /><path d="M12 2 V5 M4 4 L7 7 M20 4 L17 7 M5 15 L3 20 L9 18 L12 22 L15 18 L21 20 L19 15" /></Mark>
  ),
  campmark: (
    <Mark><path d="M5 19 V9 L12 4 L19 9 V19 M3 19 H21 M9 19 V13 H15 V19 M7 7 L4 4" /></Mark>
  ),
  buried: (
    <Mark><path d="M3 7 H21 M6 7 V18 Q9 22 12 18 Q15 14 18 18 M9 11 H15 M12 7 V14" /></Mark>
  ),
  lair: (
    <Mark><path d="M3 19 Q5 7 12 5 Q19 7 21 19 M7 19 Q8 12 12 11 Q16 12 17 19 M10 16 H14" /></Mark>
  ),
  attack: (
    <Mark><path d="M4 20 L18 6 M13 4 H20 V11 M6 14 L10 18 M4 16 L8 20" /></Mark>
  ),
  defend: (
    <Mark><path d="M4 5 H20 V14 Q17 19 12 21 Q7 19 4 14 Z M8 8 V15 M12 8 V18 M16 8 V15 M4 11 H20" /></Mark>
  ),
  crater: (
    <Mark><path d="M3 15 Q7 9 12 14 Q17 8 21 15 M5 18 Q9 14 12 18 Q15 14 19 18 M8 7 L6 4 M16 7 L18 4" /></Mark>
  ),
  sentry: (
    <Mark><path d="M7 21 L10 13 H14 L17 21 M9 13 V7 H15 V13 M8 7 L12 3 L16 7 M10 9 H14" /></Mark>
  ),
  bulwark: (
    <Mark><path d="M3 20 V8 L7 5 L11 8 L15 5 L21 9 V20 M3 15 H21 M8 20 V14 M16 20 V14" /></Mark>
  ),
  relay: (
    <Mark><path d="M12 21 V9 M8 21 H16 M9 9 L12 5 L15 9 M6 7 Q12 1 18 7 M3 5 Q12 -2 21 5" /></Mark>
  ),
  grubmark: (
    <Mark><path d="M3 17 Q6 8 11 14 Q15 20 21 9 M5 14 L3 11 M10 13 L9 9 M15 15 L17 12" /><circle cx="21" cy="9" r="1.5" /></Mark>
  ),
  eventmark: (
    <Mark><path d="M5 20 V8 L10 4 L14 8 L19 4 V15 M5 12 H12 M12 12 L17 17 M17 17 H21 M17 17 V21" /></Mark>
  ),
  shopmark: (
    <Mark><path d="M4 9 H20 V20 H4 Z M3 9 L6 4 H18 L21 9 M7 9 V12 M12 9 V12 M17 9 V12 M8 20 V15 H13 V20" /></Mark>
  ),
};

export const MARKS = { ...CORE_MARKS };
export const MARK_NAMES = Object.keys(MARKS);

/* Native emoji families plus the hand-drawn Delver's Marks. */
const LEGACY_MAP_ICON_STYLES = {
  emoji: { label: 'Emoji', icons: { dig: '⚔️', elite: '☠️', event: '🔮', shop: '🛒', treasure: '💰', camp: '🏕️', boss: '👑' } },
  crypt: { label: 'Graveyard', icons: { dig: '⛏️', elite: '🧟', event: '🦇', shop: '🐀', treasure: '⚱️', camp: '🕯️', boss: '😈' } },
  marks: { label: "Delver's Marks", icons: { dig: 'svg:picks', elite: 'svg:fangskull', event: 'svg:eye', shop: 'svg:scales', treasure: 'svg:gem', camp: 'svg:fire', boss: 'svg:crown' } },
  dungeon: { label: 'Dungeon', icons: { dig: '🗡️', elite: '👹', event: '🎲', shop: '🧙', treasure: '🏆', camp: '⛺', boss: '🐉' } },
  deepwild: { label: 'Deep wild', icons: { dig: '🪓', elite: '🦂', event: '🍄', shop: '🐌', treasure: '💎', camp: '🌙', boss: '🕷️' } },
  sunken: { label: 'Sunken', icons: { dig: '🤿', elite: '🦈', event: '🐚', shop: '🦀', treasure: '🪙', camp: '🏮', boss: '🐙' } },
  arcane: { label: 'Arcane', icons: { dig: '🪄', elite: '🧛', event: '✨', shop: '🧿', treasure: '📜', camp: '🌛', boss: '🧞' } },
  gearworks: { label: 'Gearworks', icons: { dig: '🔧', elite: '🤖', event: '🎰', shop: '⚖️', treasure: '🔋', camp: '🔌', boss: '🛸' } },
  beasts: { label: 'Beasts', icons: { dig: '🐾', elite: '🐺', event: '🦉', shop: '🦝', treasure: '🥚', camp: '🐈‍⬛', boss: '🐻' } },
};
export const MAP_ICON_STYLES = { ...LEGACY_MAP_ICON_STYLES, mixer: { label: 'Mix & Match', icons: LEGACY_MAP_ICON_STYLES.emoji.icons } };

/* Resolve a style icon: 'svg:name' tokens become the drawn mark, while emoji
   and custom text pass through untouched. */
export function resolveMapIcon(icon, prefs = null) {
  if (typeof icon === 'string' && icon.startsWith('atlas:')) return resolveAtlasIcon(icon, prefs);
  if (typeof icon === 'string' && icon.startsWith('svg:')) return MARKS[icon.slice(4)] || '?';
  return icon;
}

export function isMarkToken(icon) {
  return typeof icon === 'string' && icon.startsWith('svg:');
}
import { resolveAtlasIcon } from './iconSets.js';
