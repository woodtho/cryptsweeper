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
  chord: { name: 'Chord', summary: 'In battle, play a Chord card on a revealed number after accounting for exactly that many adjacent mines with flags or Entombed tiles. Honest Puzzle Minesweeper lets you tap the number directly. Every other neighbor opens; if a flag or Entomb is on a safe tile, an unaccounted mine detonates.', related: ['flag', 'entomb', 'reveal', 'energy'] },
  entomb: { name: 'Entomb', summary: 'Seal a tile permanently. It cannot detonate, counts as resolved for Full Clear, and counts like a flag beside a Chord number. Entombing a safe tile can therefore make that Chord false.', related: ['chord', 'full clear', 'lair', 'construct'] },
  block: { name: 'Block', summary: 'Temporary protection from enemy attacks. It normally resets at the start of your turn; mines bypass it.', related: ['plating', 'mine damage', 'warden'] },
  plating: { name: 'Plating', summary: 'Persistent combat armor capped at 40. Block is spent first against enemy attacks, then Plating protects Health. Mines and hostile blasts bypass Block but still consume Plating. Card costs and voluntary Health loss bypass both.', related: ['block', 'detonate', 'mine damage'] },
  insight: { name: 'Insight', summary: 'A combat resource gained from new safe discoveries and spent by Surveyor cards.', related: ['scan', 'reveal', 'surveyor'] },
  'blast chain': { name: 'Blast Chain', summary: 'The Sapper’s count of controlled detonations during the current turn. Each link grants 3 Block; the count resets at turn start and powers chain payoffs.', related: ['sapper', 'detonate', 'block'] },
  light: { name: 'Light', summary: 'The Lamplighter’s resource. Cascades of 2 or more tiles generate Light and 4 Block per Light; larger cascades make more. Half of unpreserved Light normally fades at turn start, and flare cards spend it. Everburning Wick prevents this fading.', related: ['lamplighter', 'reveal', 'energy', 'block'] },
  wager: { name: 'Wager', summary: 'A true 50/50 coin flip used by Gambler cards. Heads has the stronger result; Loaded effects can force a future Wager to Heads.', related: ['gambler', 'loaded'] },
  loaded: { name: 'Loaded', summary: 'The Gambler’s cheating resource, normally capped at 3. Correct manual flags earn Loaded; Stacked Deck spends it to force Wagers to Heads. Two-Headed Coin raises the cap to 4.', related: ['gambler', 'wager', 'flag'] },
  blood: { name: 'Blood', summary: 'Health deliberately paid as a Chirurgeon card cost. Blood bypasses Block and Plating, cannot be paid lethally, and becomes Untreated Blood until recovery closes the wound.', related: ['untreated blood', 'chirurgeon', 'health', 'plating'] },
  'untreated blood': { name: 'Untreated Blood', summary: 'Recoverable wounds created by Chirurgeon Blood costs. Triage and treatment consume this ledger as they restore Health, preventing the same wound from being recovered repeatedly. Lifesteal and emergency medicine can still heal beyond the ledger.', related: ['blood', 'chirurgeon', 'health'] },
  wound: { name: 'Wound', summary: 'A temporary, unplayable Status card created by Emergency Surgery. It can clog a combat hand but disappears when that combat ends.', related: ['chirurgeon', 'deck', 'exhaust'] },
  archive: { name: 'Archive', summary: 'The Archivist’s combat-only filed-card pile. Filed cards leave the draw cycle until a Recall effect returns them.', related: ['archivist', 'file', 'recall', 'citation'] },
  file: { name: 'File', summary: 'Move an Archivist card into the Archive after playing it. A card recalled and replayed during the same turn Exhausts instead of filing again.', related: ['archive', 'recall', 'exhaust'] },
  recall: { name: 'Recall', summary: 'Return the most recently filed cards from the Archive to your hand. Some Recall effects upgrade the returned cards.', related: ['archive', 'file', 'citation'] },
  citation: { name: 'Citation', summary: 'A combat resource created by Archivist cards and spent on stronger Recall and Archive payoffs.', related: ['archivist', 'archive', 'recall'] },
  resolve: { name: 'Resolve', summary: 'The Warden’s combat resource. Enemy damage absorbed by Block or Plating creates Resolve, which Riposte cards convert into defense or damage.', related: ['warden', 'block', 'plating', 'riposte'] },
  riposte: { name: 'Riposte', summary: 'A Warden payoff that attacks from stored Block, Plating, or Resolve. Strong Ripostes consume Resolve so defense remains a choice.', related: ['warden', 'resolve', 'block'] },
  rune: { name: 'Rune', summary: 'A Hexwright value inscribed beside a truthful revealed number. Rune values can be warped without changing the real Minesweeper clue.', related: ['hexwright', 'inscribe', 'reveal'] },
  inscribe: { name: 'Inscribe', summary: 'Place or replace a Rune on a revealed number tile. The Rune is spell information; the number underneath always remains truthful.', related: ['rune', 'hexwright'] },
  grave: { name: 'Grave', summary: 'The Revenant’s combat-only pile for Grave cards. Rise effects return those cards upgraded; each individual card can Rise only once.', related: ['revenant', 'rise', 'exhaust'] },
  rise: { name: 'Rise', summary: 'Return a card from the Grave to your hand, upgraded by one tier. Once that card is played again it Exhausts permanently for the combat.', related: ['grave', 'revenant', 'exhaust'] },
  'death’s door': { name: 'Death’s Door', summary: 'The Revenant is normally at Death’s Door while at or below 25% maximum Health. Second Shroud raises the threshold to 40%. Several Revenant cards become dramatically stronger there.', related: ['revenant', 'health', 'grave'] },
  picks: { name: 'Picks', summary: 'Your current supply of free manual digs. Extra picks can temporarily exceed your maximum; cards do not consume them unless they explicitly say Spend.', related: ['max picks', 'reveal', 'energy'] },
  'max picks': { name: 'Max Picks', summary: 'The number of picks refilled at the start of each turn. Training, trinkets, and card effects can raise it for a run or combat.', related: ['picks', 'reveal', 'energy'] },
  energy: { name: 'Energy', summary: 'The resource used to play cards. It refills at the start of each turn.', related: ['picks', 'power', 'exhaust'] },
  flag: { name: 'Flag', summary: 'A free marker placed on a suspected mine. Manual flags can be wrong.', related: ['verified flag', 'chord', 'scan'] },
  'verified flag': { name: 'Verified Flag', summary: 'A flag confirmed by an effect or scan. It is guaranteed to mark a mine.', related: ['flag', 'scan', 'chord'] },
  'full clear': { name: 'Full Clear', summary: 'Resolve every safe tile. The board deals 50 damage to all enemies, rewards an upgraded card, then re-seals if enemies survive.', related: ['reveal', 'entomb', 'lair'] },
  vein: { name: 'The Vein', summary: 'The endless fourth stratum. Reaching its bottom generates a new 12-room segment. Enemies from every stratum return, bosses can roam between ordinary rooms, and danger scales with each segment. Vein Depth counts every room entered there. Its shops turn Black Market: prices are marked up and climb with depth, but the stock is richer — biased toward rare cards, some arriving pre-upgraded, with an extra card and trinket shelf.', related: ['full clear', 'mines', 'health', 'gold'] },
  instinct: { name: 'Instinct', summary: 'Your built-in safety net: the first accidentally revealed mine is verified-flagged instead of exploding.', related: ['detonate', 'verified flag', 'mine damage'] },
  'mine damage': { name: 'Mine Damage', summary: 'Damage from an uncontrolled mine. It bypasses Block but is absorbed by Plating.', related: ['detonate', 'block', 'plating'] },
  lair: { name: 'Lair', summary: 'An enemy-owned board region. Digging it wounds the owner; killing the owner crumbles its lair open.', related: ['reveal', 'detonate', 'entomb'] },
  construct: { name: 'Construct', summary: 'A persistent device built on an empty safe revealed tile; you can maintain 3. A numbered tile remains numbered and displays its value beside the Construct. Mines and craters are invalid sites. After you press End Turn, every Construct triggers before enemies act. Constructs survive Full Clear re-seals and boss board shifts. One Construct is destroyed to cancel an enemy Board Attack; Devour instead destroys any Construct on the consumed ring.', related: ['sentry', 'bulwark', 'survey relay', 'board attack'] },
  sentry: { name: 'Sentry', summary: 'A Construct that deals its listed damage to a random enemy when it triggers. It builds Heat within its radius; if it overheats it misfires and burns you instead of firing. Stone Choir makes it trigger twice.', related: ['construct', 'heat', 'stone choir', 'board attack'] },
  bulwark: { name: 'Bulwark', summary: 'A Construct that grants its listed persistent Plating and temporary Block when it triggers. Stone Choir never makes it trigger twice.', related: ['construct', 'plating', 'block'] },
  'survey relay': { name: 'Survey Relay', summary: 'A Construct that draws 1 Energy at turn start to run — or goes offline that turn — then Scans one random hidden tile within radius 2. Upgraded, it also grants Block. It gains Heat as it runs; overheating costs it that turn’s Scan. Stone Choir makes it trigger twice.', related: ['construct', 'scan', 'heat', 'stone choir'] },
  heat: { name: 'Heat', summary: 'Sentries and Survey Relays build Heat each turn, plus 1 more for every other heat-Construct within their radius. Coolant Cell reduces that generated Heat by 1. A lone Construct cools off and stays reliable; clustered Constructs overheat. At maximum Heat a Construct overloads and vents Heat into nearby Constructs: a Survey Relay loses its Scan and Block for the turn; a Sentry misfires and burns you instead of firing. Bulwarks run cool and never build Heat.', related: ['sentry', 'survey relay', 'construct'] },
  'master builder': { name: 'Master Builder', summary: 'The Terraformer passive. Building your first Construct each turn immediately grants 4 Block. Later Constructs that turn do not grant this bonus.', related: ['terraformer', 'construct', 'block'] },
  'stone choir': { name: 'Stone Choir', summary: 'A combat-long Power that makes every Sentry and Survey Relay trigger twice. Bulwarks continue to trigger once.', related: ['sentry', 'survey relay', 'bulwark', 'power'] },
  'board attack': { name: 'Board Attack', summary: 'An enemy intent that changes the board, such as laying mines, applying fog, scrambling mines, or excavating ground. One active Construct is destroyed to cancel the whole Board Attack. Direct attacks, Priming, and Devour follow their own rules.', related: ['construct', 'turn', 'lair'] },
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
  sapper: { name: 'Sapper', summary: 'A demolitions Delver. Breachcraft grants 3 Block per controlled detonation, and the first each turn deals 6 damage to every enemy.', related: ['detonate', 'mines', 'block'] },
  surveyor: { name: 'Surveyor', summary: 'An information Delver. Field Method grants 1 Energy and 1 Insight after every fourth newly scanned tile.', related: ['scan', 'insight', 'energy'] },
  terraformer: { name: 'Terraformer', summary: 'A board-editing Delver. Master Builder grants 4 Block for the first Construct built each turn, with a limit of 3 active Constructs.', related: ['construct', 'block', 'entomb'] },
  lamplighter: { name: 'Lamplighter', summary: 'A cascade Delver. Large openings generate Light and trigger Kindle; flare cards spend that Light on damage, safe reveals, and Energy.', related: ['reveal', 'light', 'energy'] },
  gambler: { name: 'Gambler', summary: 'A press-your-luck Delver. Wagers flip a true coin, while correct flags earn Loaded coins that can rig future results.', related: ['flag', 'wager', 'loaded'] },
  chirurgeon: { name: 'Chirurgeon', summary: 'A pain-conversion Delver. Cards spend Health as Blood; Triage grants Block and treats 1 Untreated Blood after the first subsequent safe reveal. Surgery, stitching, and lifesteal close the rest.', related: ['health', 'blood', 'untreated blood', 'block'] },
  archivist: { name: 'Archivist', summary: 'A cycling Delver. Cards File into an Archive, create Citations, and can be Recalled to play again.', related: ['archive', 'file', 'recall'] },
  warden: { name: 'Warden', summary: 'A defensive counterattacker. Hold Fast retains 10% of Block, every 6 damage absorbed generates Resolve, and Ripostes turn armor into damage.', related: ['block', 'plating', 'resolve', 'riposte'] },
  hexwright: { name: 'Hexwright', summary: 'A number-magic Delver. Revealed clues can be Inscribed as mutable Runes without ever making the real Minesweeper numbers lie.', related: ['reveal', 'rune', 'inscribe'] },
  revenant: { name: 'Revenant', summary: 'A death-defying Delver. Grave cards can Rise once upgraded, while Death’s Door effects reward surviving at critical Health.', related: ['health', 'grave', 'rise'] },
};

const ALIASES = {
  pick: 'picks', flags: 'flag', 'verified-flag': 'verified flag', constructs: 'construct',
  wounds: 'wound',
  sentries: 'sentry', bulwarks: 'bulwark', relay: 'survey relay', relays: 'survey relay',
  'survey relays': 'survey relay', 'board attacks': 'board attack',
  lairs: 'lair', claustophobia: 'claustrophobia', nightterrors: 'night terrors',
  wagers: 'wager', coins: 'loaded', citations: 'citation', runes: 'rune',
  filed: 'file', filing: 'file', recalled: 'recall', rising: 'rise',
  "death's door": 'death’s door',
};
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
