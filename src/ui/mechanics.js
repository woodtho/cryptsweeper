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
  chord: { name: 'Chord', summary: 'A card-only board action. Play a Chord card on a revealed number after correctly flagging exactly that many adjacent mines to open every other neighbor. Matching the count with flags on the wrong tiles detonates the exposed mines.', related: ['flag', 'reveal', 'energy'] },
  entomb: { name: 'Entomb', summary: 'Seal a tile permanently. It cannot detonate and counts as resolved for Full Clear.', related: ['full clear', 'lair', 'construct'] },
  block: { name: 'Block', summary: 'Temporary protection from enemy attacks. It normally resets at the start of your turn; mines bypass it.', related: ['plating', 'mine damage', 'warden'] },
  plating: { name: 'Plating', summary: 'Persistent combat armor. Block is spent first against enemy attacks, then Plating protects Health. Mines and hostile blasts bypass Block but still consume Plating. Card costs and voluntary Health loss bypass both.', related: ['block', 'detonate', 'mine damage'] },
  insight: { name: 'Insight', summary: 'A combat resource gained from new safe discoveries and spent by Surveyor cards.', related: ['scan', 'reveal', 'surveyor'] },
  picks: { name: 'Picks', summary: 'Your current supply of free manual digs. Extra picks can temporarily exceed your maximum; cards do not consume them unless they explicitly say Spend.', related: ['max picks', 'reveal', 'energy'] },
  'max picks': { name: 'Max Picks', summary: 'The number of picks refilled at the start of each turn. Training, trinkets, and card effects can raise it for a run or combat.', related: ['picks', 'reveal', 'energy'] },
  energy: { name: 'Energy', summary: 'The resource used to play cards. It refills at the start of each turn.', related: ['picks', 'power', 'exhaust'] },
  flag: { name: 'Flag', summary: 'A free marker placed on a suspected mine. Manual flags can be wrong.', related: ['verified flag', 'chord', 'scan'] },
  'verified flag': { name: 'Verified Flag', summary: 'A flag confirmed by an effect or scan. It is guaranteed to mark a mine.', related: ['flag', 'scan', 'chord'] },
  'full clear': { name: 'Full Clear', summary: 'Resolve every safe tile. The board deals 50 damage to all enemies, rewards an upgraded card, then re-seals if enemies survive.', related: ['reveal', 'entomb', 'lair'] },
  vein: { name: 'The Vein', summary: 'The endless fourth stratum. Reaching its bottom generates a new 12-room segment. Enemies from every stratum return, bosses can roam between ordinary rooms, and danger scales with each segment. Vein Depth counts every room entered there.', related: ['full clear', 'mines', 'health'] },
  instinct: { name: 'Instinct', summary: 'Your built-in safety net: the first accidentally revealed mine is verified-flagged instead of exploding.', related: ['detonate', 'verified flag', 'mine damage'] },
  'mine damage': { name: 'Mine Damage', summary: 'Damage from an uncontrolled mine. It bypasses Block but is absorbed by Plating.', related: ['detonate', 'block', 'plating'] },
  lair: { name: 'Lair', summary: 'An enemy-owned board region. Digging it wounds the owner; killing the owner crumbles its lair open.', related: ['reveal', 'detonate', 'entomb'] },
  construct: { name: 'Construct', summary: 'A device built on an open tile. Constructs act each turn and can absorb enemy board attacks.', related: ['plating', 'block', 'entomb'] },
  power: { name: 'Power', summary: 'A card that creates a combat-long passive effect instead of entering the discard pile.', related: ['energy', 'exhaust'] },
  exhaust: { name: 'Exhaust', summary: 'Remove a card from your draw cycle for the rest of the current combat.', related: ['power', 'energy'] },
  armoured: { name: 'Armoured', summary: 'An enemy modifier that starts with 8 Block plus 4 for each deeper stratum. Its opening Block expires after its first action.', related: ['block', 'sundered'] },
  burrowing: { name: 'Burrowing', summary: 'An enemy modifier that begins underground, untargetable, and unable to act. Reveal three safe tiles in one turn to force it above ground.', related: ['reveal', 'picks'] },
  unstable: { name: 'Unstable', summary: 'An enemy modifier that explodes when defeated. The blast becomes stronger in deeper strata, bypasses Block, and can be absorbed by Plating.', related: ['health', 'block', 'plating'] },
  cursed: { name: 'Cursed Enemy', summary: 'An enemy modifier that adds an unplayable Dud to the combat discard pile. The Dud can enter later hands and Exhausts at end of turn.', related: ['deck', 'exhaust'] },
  exposed: { name: 'Exposed', summary: 'A condition that makes the next hit against that enemy deal 25% more damage. Each hit removes one stack. It works on bosses.', related: ['jammed', 'sundered'] },
  jammed: { name: 'Jammed', summary: 'A condition that reduces the enemy’s next direct attack by 40%. Each attack removes one stack. It works on bosses.', related: ['exposed', 'sundered'] },
  sundered: { name: 'Sundered', summary: 'A condition that removes current Block and halves Block gained during the enemy’s next action. It works on bosses.', related: ['block', 'exposed', 'jammed'] },
  claustrophobia: { name: 'Claustrophobia', summary: 'A persistent Curse card. It is unplayable, and each copy in your deck makes every combat board spawn with 2 additional mines.', related: ['mines', 'deck', 'full clear'] },
  vertigo: { name: 'Vertigo', summary: 'A persistent Curse card. Each copy reduces your maximum Picks by 1 in every combat, but never below 1.', related: ['picks', 'max picks', 'deck'] },
  exhaustion: { name: 'Exhaustion', summary: 'A persistent Curse card. Each copy reduces your normal draw by 1 card per turn, but never below 3 cards.', related: ['deck', 'energy'] },
  'night terrors': { name: 'Night Terrors', summary: 'A persistent Curse card. Each copy removes 1 Energy from the first turn of every combat.', related: ['energy', 'deck'] },
  paranoia: { name: 'Paranoia', summary: 'A persistent Curse card. Each copy places one ordinary flag on a safe hidden tile at combat start.', related: ['flag', 'mines', 'deck'] },
  sapper: { name: 'Sapper', summary: 'A demolitions Delver. Breachcraft makes the first controlled detonation each turn deal 4 damage to every enemy.', related: ['detonate', 'mines'] },
  surveyor: { name: 'Surveyor', summary: 'An information Delver. Field Method grants 1 Energy and 1 Insight after every fourth newly scanned tile.', related: ['scan', 'insight', 'energy'] },
  terraformer: { name: 'Terraformer', summary: 'A board-editing Delver. Master Builder grants 2 Plating whenever a Construct is built.', related: ['construct', 'plating', 'entomb'] },
  lamplighter: { name: 'Lamplighter', summary: 'A cascade Delver. Kindle grants 1 Energy after the first cascade of at least 4 tiles each turn.', related: ['reveal', 'energy'] },
  gambler: { name: 'Gambler', summary: 'A flag-focused Delver. Lucky Read draws 1 card after the first correct manual Flag each turn.', related: ['flag', 'deck'] },
  chirurgeon: { name: 'Chirurgeon', summary: 'A pain-conversion Delver. Triage grants 5 Block the first time Health is lost each turn.', related: ['health', 'block'] },
  archivist: { name: 'Archivist', summary: 'A draw-and-Exhaust Delver. Cross-Reference draws 1 card after the first card Exhausted each turn.', related: ['deck', 'exhaust'] },
  warden: { name: 'Warden', summary: 'A defensive Delver. Hold Fast retains one quarter of Block between turns.', related: ['block', 'plating'] },
  hexwright: { name: 'Hexwright', summary: 'A number-magic Delver. Hot Number deals 2 damage to every enemy whenever a tile numbered 3 or higher is revealed.', related: ['reveal', 'lair'] },
  revenant: { name: 'Revenant', summary: 'A death-defying Delver. Not Yet survives the first lethal hit of each combat at 1 Health.', related: ['health', 'block'] },
};

const ALIASES = { pick: 'picks', flags: 'flag', 'verified-flag': 'verified flag', constructs: 'construct', lairs: 'lair', claustophobia: 'claustrophobia', nightterrors: 'night terrors' };
export function mechanicKey(value) {
  const key = String(value || '').trim().toLowerCase().replace(/[.:,!]+$/, '');
  return MECHANICS[key] ? key : ALIASES[key];
}

const terms = [...new Set([...Object.keys(MECHANICS), ...Object.keys(ALIASES)])]
  .sort((a, b) => b.length - a.length).map(term => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
const termPattern = new RegExp(`\\b(${terms.join('|')})\\b`, 'gi');

export function mechanicTextParts(value) {
  return String(value).split(termPattern).filter(Boolean).map(text => ({ text, key: mechanicKey(text) || null }));
}

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
