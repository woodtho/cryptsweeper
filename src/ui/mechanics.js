export const MECHANICS = {
  health: { name: 'Health', summary: 'Damage that gets through your defenses removes Health. Reaching zero ends the descent.', related: ['block', 'plating'] },
  gold: { name: 'Gold', summary: 'Currency carried during this run and spent at merchant shops.', related: [] },
  deck: { name: 'Deck', summary: 'Every card in your current run. Tap the deck count to inspect it.', related: ['energy', 'exhaust'] },
  mines: { name: 'Mines Remaining', summary: 'Estimated hidden mines: total mines still on the board minus your placed flags.', related: ['flag', 'verified flag', 'full clear'] },
  turn: { name: 'Turn', summary: 'The current combat round. Ending a turn lets every surviving enemy carry out its shown intent.', related: ['energy', 'block'] },
  reveal: { name: 'Reveal', summary: 'Open a hidden tile. A safe zero may cascade into neighboring tiles.', related: ['picks', 'instinct', 'full clear'] },
  detonate: { name: 'Detonate', summary: 'Trigger and remove a mine. Enemy-directed detonations are controlled; player detonations deal mine damage.', related: ['plating', 'instinct', 'full clear'] },
  scan: { name: 'Scan', summary: 'Learn whether a hidden tile is safe or mined without opening it.', related: ['verified flag', 'reveal', 'insight'] },
  defuse: { name: 'Defuse', summary: 'Remove a mine safely. A defused tile cannot explode and is then revealed.', related: ['detonate', 'reveal', 'full clear'] },
  chord: { name: 'Chord', summary: 'On a revealed number with enough adjacent flags, open every other adjacent tile at once.', related: ['flag', 'reveal', 'picks'] },
  entomb: { name: 'Entomb', summary: 'Seal a tile permanently. It cannot detonate and counts as resolved for Full Clear.', related: ['full clear', 'lair', 'construct'] },
  block: { name: 'Block', summary: 'Temporary protection from enemy attacks. It normally resets at the start of your turn; mines bypass it.', related: ['plating', 'mine damage', 'warden'] },
  plating: { name: 'Plating', summary: 'Persistent armor that absorbs mine damage before HP. It remains between turns.', related: ['block', 'detonate', 'mine damage'] },
  insight: { name: 'Insight', summary: 'A combat resource gained from new safe discoveries and spent by Surveyor cards.', related: ['scan', 'reveal', 'surveyor'] },
  picks: { name: 'Picks', summary: 'Your current supply of free manual digs. Extra picks can temporarily exceed your maximum; cards do not consume them unless they explicitly say Spend.', related: ['max picks', 'reveal', 'energy'] },
  'max picks': { name: 'Max Picks', summary: 'The number of picks refilled at the start of each turn. Training, trinkets, and card effects can raise it for a run or combat.', related: ['picks', 'reveal', 'energy'] },
  energy: { name: 'Energy', summary: 'The resource used to play cards. It refills at the start of each turn.', related: ['picks', 'power', 'exhaust'] },
  flag: { name: 'Flag', summary: 'A free marker placed on a suspected mine. Manual flags can be wrong.', related: ['verified flag', 'chord', 'scan'] },
  'verified flag': { name: 'Verified Flag', summary: 'A flag confirmed by an effect or scan. It is guaranteed to mark a mine.', related: ['flag', 'scan', 'chord'] },
  'full clear': { name: 'Full Clear', summary: 'Resolve every safe tile. The board deals 50 damage to all enemies, rewards an upgraded card, then re-seals if enemies survive.', related: ['reveal', 'entomb', 'lair'] },
  instinct: { name: 'Instinct', summary: 'Your built-in safety net: the first accidentally revealed mine is verified-flagged instead of exploding.', related: ['detonate', 'verified flag', 'mine damage'] },
  'mine damage': { name: 'Mine Damage', summary: 'Damage from an uncontrolled mine. It bypasses Block but is absorbed by Plating.', related: ['detonate', 'block', 'plating'] },
  lair: { name: 'Lair', summary: 'An enemy-owned board region. Digging it wounds the owner; killing the owner crumbles its lair open.', related: ['reveal', 'detonate', 'entomb'] },
  construct: { name: 'Construct', summary: 'A device built on an open tile. Constructs act each turn and can absorb enemy board attacks.', related: ['plating', 'block', 'entomb'] },
  power: { name: 'Power', summary: 'A card that creates a combat-long passive effect instead of entering the discard pile.', related: ['energy', 'exhaust'] },
  exhaust: { name: 'Exhaust', summary: 'Remove a card from your draw cycle for the rest of the current combat.', related: ['power', 'energy'] },
  surveyor: { name: 'Surveyor', summary: 'A Delver focused on scans, safe inference, and converting Insight into damage.', related: ['scan', 'insight'] },
  warden: { name: 'Warden', summary: 'A defensive Delver who retains one quarter of their Block between turns.', related: ['block', 'plating'] },
};

const ALIASES = { pick: 'picks', flags: 'flag', 'verified-flag': 'verified flag', constructs: 'construct', lairs: 'lair' };
export function mechanicKey(value) {
  const key = String(value || '').trim().toLowerCase().replace(/[.:,!]+$/, '');
  return MECHANICS[key] ? key : ALIASES[key];
}

const terms = [...new Set([...Object.keys(MECHANICS), ...Object.keys(ALIASES)])]
  .sort((a, b) => b.length - a.length).map(term => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
const termPattern = new RegExp(`\\b(${terms.join('|')})\\b`, 'gi');

export function decorateMechanics(html) {
  let insideMechanic = 0;
  return String(html).split(/(<[^>]+>)/g).map(part => {
    if (part.startsWith('<')) {
      if (/^<span\b[^>]*(?:class=["'][^"']*\bkw\b|data-mechanic=)/i.test(part)) insideMechanic++;
      if (/^<\/span/i.test(part) && insideMechanic) insideMechanic--;
      return part;
    }
    if (insideMechanic) return part;
    return part.replace(termPattern, match => `<span class="mechanic-term" data-mechanic="${mechanicKey(match)}" tabindex="0">${match}</span>`);
  }).join('');
}
