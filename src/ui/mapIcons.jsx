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

export const MARKS = {
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
};

export const MARK_NAMES = Object.keys(MARKS);

/* Resolve a style icon: 'svg:name' tokens become the drawn mark, anything else
   (emoji, rune glyphs, custom text) passes through untouched. */
export function resolveMapIcon(icon) {
  if (typeof icon === 'string' && icon.startsWith('svg:')) return MARKS[icon.slice(4)] || '?';
  return icon;
}

export function isMarkToken(icon) {
  return typeof icon === 'string' && icon.startsWith('svg:');
}
