/* CRYPTSWEEPER — game data: strata, classes, cards, enemies, trinkets, gadgets.
   Effects call engine verbs at play-time (the engine↔data import cycle is safe:
   nothing here invokes engine code during module evaluation). */
import {
  cbt, board, shuffle, randPick, randInt,
  revealTile, hitEnemy, hitRandom, hitAll, curTarget, atk,
  gainBlock, gainPlating, gainEnergy, gainInsight, gainPicks, gainMaxPicks,
  loseMaxPicks, spendPicks, drawCards, loseHP, healHP, canHeal, applyEnemyEffect,
  detonateForCards, defuseTile, scanTile, entombTile, swapCells, addConstruct,
  chordAt, verifyFlag, flaggedIdx, hiddenIdx, isHiddenUsable, area3x3,
  highestRevealedNumber, neighborsOf, numAt, toast, log, fleeCombat,
  enemyAttack, boardAttack, layMines, fogTiles, scrambleMines,
  setLie, clearLie, primeTile, resolvePrimed, clearPrimed, devourRing,
  annexTiles, addMineAt,
} from './engine.js';
import { buildCardExpansion500 } from './cardExpansion500.js';

export const STRATA = [
  { name: 'Stratum 1 — The Topsoil Crypts', size: 8,  mines: 10, mineDmg: 8  },
  { name: 'Stratum 2 — The Fog Galleries',  size: 9,  mines: 14, mineDmg: 12 },
  { name: 'Stratum 3 — The Machine Seam',   size: 10, mines: 20, mineDmg: 16 },
  { name: 'Stratum 4 — The Vein',           size: 10, mines: 22, mineDmg: 18, endless: true },
];

/* Persistent curses are unplayable deck cards with combat-setup hooks in the
   engine. Keeping the numeric tuning here makes new curse types straightforward
   to add without scattering card-name checks through combat code. */
export const PERSISTENT_CURSES = {
  claustrophobia: { name: 'Claustrophobia', boardMines: 2 },
  vertigo: { name: 'Vertigo', maxPicks: -1, minimum: 1 },
  exhaustion: { name: 'Exhaustion', cardsPerTurn: -1, minimum: 3 },
  nightterrors: { name: 'Night Terrors', firstTurnEnergy: -1, minimum: 0 },
  paranoia: { name: 'Paranoia', falseFlags: 1 },
};

export const CLASSES = {
  sapper: {
    name: 'THE SAPPER', hp: 80, picks: 3, sig: 'shortfuse', trinket: 'blastgoggles',
    role: '80 HP · demolitions · "a mine is ammunition"',
    blurb: 'She doesn\'t avoid mines — she spends them. Detonate hidden tiles on purpose, convert blasts into AoE damage, and pay HP for tempo.',
    passive: '<b>Breachcraft:</b> the first controlled detonation each turn deals 4 damage to every enemy.',
    deck: ['probe', 'probe', 'probe', 'brace', 'brace', 'brace', 'shortfuse', 'shortfuse', 'blastsuit', 'seedcharge'],
  },
  surveyor: {
    name: 'THE SURVEYOR', hp: 66, picks: 5, sig: 'scancard', trinket: 'dowsingcharm',
    role: '66 HP · information engine · "a mine is a fact"',
    blurb: 'Fragile, precise, scaling. Gain Insight for every safe reveal and spend it for damage and draw. The class most likely to Full Clear.',
    passive: '<b>Field Method:</b> every fourth newly scanned tile grants 1⚡ and 1 Insight.',
    deck: ['probe', 'probe', 'probe', 'brace', 'brace', 'scancard', 'scancard', 'scancard', 'triangulate', 'fieldnotes'],
  },
  terraformer: {
    name: 'THE TERRAFORMER', hp: 72, picks: 4, sig: 'entombcard', trinket: 'keystone',
    role: '72 HP · board editor · "a mine is terrain"',
    blurb: 'The grid is clay: seal tiles, swap them, and build constructs that act every turn and soak enemy board attacks.',
    passive: '<b>Master Builder:</b> whenever you build a construct, gain 2 Plating.',
    deck: ['probe', 'probe', 'probe', 'brace', 'brace', 'brace', 'entombcard', 'entombcard', 'sentry', 'faultline'],
  },
  lamplighter: {
    name: 'THE LAMPLIGHTER', hp: 68, picks: 4, sig: 'exp_lamplighter_0', trinket: 'emberjar',
    role: '68 HP · cascades & energy · "bring your own dawn"',
    blurb: 'Turns broad safe openings into explosive tempo, chaining bright cascades into extra energy and sweeping attacks.',
    passive: '<b>Kindle:</b> the first cascade of 4+ tiles each turn grants 1⚡.',
    deck: ['probe','probe','probe','brace','brace','brace','exp_lamplighter_0','exp_lamplighter_0','exp_lamplighter_1','exp_lamplighter_2'],
  },
  gambler: {
    name: 'THE GAMBLER', hp: 70, picks: 4, sig: 'exp_gambler_0', trinket: 'loadedcoin',
    role: '70 HP · flags & wagers · "the board always tells"',
    blurb: 'Makes deliberate wagers on hidden tiles, cashing correct flags into cards while turning bad reads into controlled losses.',
    passive: '<b>Lucky Read:</b> the first correct manual flag each turn draws 1 card.',
    deck: ['probe','probe','probe','brace','brace','brace','exp_gambler_0','exp_gambler_0','exp_gambler_1','exp_gambler_2'],
  },
  chirurgeon: {
    name: 'THE CHIRURGEON', hp: 76, picks: 3, sig: 'exp_chirurgeon_0', trinket: 'fieldkit',
    role: '76 HP · pain conversion · "nothing vital was hit"',
    blurb: 'Treats health as a tactical resource, converting the first wound each turn into protection and rebuilding after risky blasts.',
    passive: '<b>Triage:</b> the first time you lose HP each turn, gain 5 Block.',
    deck: ['probe','probe','probe','brace','brace','brace','exp_chirurgeon_0','exp_chirurgeon_0','exp_chirurgeon_1','exp_chirurgeon_2'],
  },
  archivist: {
    name: 'THE ARCHIVIST', hp: 62, picks: 5, sig: 'exp_archivist_0', trinket: 'indexcard',
    role: '62 HP · draw & exhaust · "everything is evidence"',
    blurb: 'Cycles aggressively through a fragile deck, finding exact tools and turning exhausted cards into fresh possibilities.',
    passive: '<b>Cross-Reference:</b> the first card Exhausted each turn draws 1.',
    deck: ['probe','probe','probe','brace','brace','brace','exp_archivist_0','exp_archivist_0','exp_archivist_1','exp_archivist_2'],
  },
  warden: {
    name: 'THE WARDEN', hp: 82, picks: 3, sig: 'exp_warden_0', trinket: 'wardplate',
    role: '82 HP · block retention · "stone remembers pressure"',
    blurb: 'Builds defenses that persist between turns, then converts accumulated Block and Plating into crushing board control.',
    passive: '<b>Hold Fast:</b> retain one quarter of your Block between turns.',
    deck: ['probe','probe','probe','brace','brace','brace','exp_warden_0','exp_warden_0','exp_warden_1','exp_warden_2'],
  },
  hexwright: {
    name: 'THE HEXWRIGHT', hp: 64, picks: 5, sig: 'exp_hexwright_0', trinket: 'hexkey',
    role: '64 HP · number magic · "three is a weapon"',
    blurb: 'Weaponizes high revealed numbers, stacking Insight and turning dangerous numbered tiles into precise area damage.',
    passive: '<b>Hot Number:</b> revealing a 3+ tile deals 2 damage to ALL enemies.',
    deck: ['probe','probe','probe','brace','brace','brace','exp_hexwright_0','exp_hexwright_0','exp_hexwright_1','exp_hexwright_2'],
  },
  revenant: {
    name: 'THE REVENANT', hp: 55, picks: 4, sig: 'exp_revenant_0', trinket: 'gravebell',
    role: '55 HP · death defiance · "already buried once"',
    blurb: 'Walks closest to disaster, using mines and low health for enormous payoffs while refusing one lethal blow each combat.',
    passive: '<b>Not Yet:</b> survive the first lethal hit each combat at 1 HP.',
    deck: ['probe','probe','probe','brace','brace','brace','exp_revenant_0','exp_revenant_0','exp_revenant_1','exp_revenant_2'],
  },
};

/* ---------------- keyword spans ---------------- */
const kwR = s => `<span class="kw reveal">${s}</span>`;
const kwD = s => `<span class="kw detonate">${s}</span>`;
const kwS = s => `<span class="kw scan">${s}</span>`;
const kwG = s => `<span class="kw gridk">${s}</span>`;

/* ---------------- cards ----------------
   cost: [base, upgraded]. targets: list of tile-target specs collected in order:
   'hidden' | 'open' | 'number' | 'row' | 'anytile'. play(u, tg) where tg = array of picks. */
export const CARDS = {
  /* ----- neutral starters ----- */
  probe: {
    name: 'Probe', type: 'Attack', rarity: 'starter', cls: 'neutral', cost: [1, 1], hits: 'target',
    targets: ['hidden'],
    text: u => `${kwR('Reveal')} the chosen hidden tile. If it is safe, deal ${u ? 7 : 4} damage to the targeted enemy.`,
    play: (u, tg) => { const r = revealTile(tg[0], 'reveal'); if (r.safe) hitEnemy(curTarget(), atk(u ? 7 : 4)); },
  },
  brace: {
    name: 'Brace', type: 'Skill', rarity: 'starter', cls: 'neutral', cost: [1, 1],
    targets: [],
    text: u => `Gain ${u ? 8 : 5} Block.`,
    play: u => gainBlock(u ? 8 : 5),
  },

  /* ----- Sapper ----- */
  shortfuse: {
    name: 'Short Fuse', type: 'Attack', rarity: 'starter', cls: 'sapper', cost: [1, 1], hits: 'mixed',
    targets: ['hidden'],
    text: u => `If the chosen tile is mined, ${kwD('Detonate')} it without taking mine damage and deal ${u ? 14 : 10} damage to a random enemy. If it is safe, reveal it and deal ${u ? 6 : 4} damage to the targeted enemy.`,
    play: (u, tg) => {
      if (detonateForCards(tg[0])) hitRandom(atk(u ? 14 : 10));
      else { revealTile(tg[0], 'card-safe'); hitEnemy(curTarget(), atk(u ? 6 : 4)); }
    },
  },
  controlled: {
    name: 'Controlled Blast', type: 'Attack', rarity: 'common', cls: 'sapper', cost: [1, 1], hits: 'mixed',
    targets: ['hidden'],
    text: u => `If the chosen tile is mined, ${kwD('Detonate')} it, deal ${u ? 16 : 12} damage to all enemies, and lose ${u ? 2 : 3} HP. If it is safe, reveal it and deal ${u ? 8 : 5} damage to the targeted enemy.`,
    play: (u, tg) => {
      if (detonateForCards(tg[0])) { hitAll(atk(u ? 16 : 12)); loseHP(u ? 2 : 3); }
      else { revealTile(tg[0], 'card-safe'); hitEnemy(curTarget(), atk(u ? 8 : 5)); }
    },
  },
  blastsuit: {
    name: 'Blast Suit', type: 'Skill', rarity: 'common', cls: 'sapper', cost: [1, 1],
    targets: [],
    text: u => `Gain ${u ? 6 : 4} ${kwG('Plating')}.`,
    play: u => gainPlating(u ? 6 : 4),
  },
  fusecutter: {
    name: 'Fuse Cutter', type: 'Skill', rarity: 'common', cls: 'sapper', cost: [1, 1], hits: 'random',
    targets: ['hidden'],
    text: u => `${kwS('Defuse')} the chosen hidden tile. If it is mined, remove the mine and deal ${u ? 12 : 8} damage to a random enemy. If it is safe, reveal it.`,
    play: (u, tg) => { if (defuseTile(tg[0])) hitRandom(atk(u ? 12 : 8)); },
  },
  chaincharge: {
    name: 'Chain Charge', type: 'Attack', rarity: 'uncommon', cls: 'sapper', cost: [2, 2], hits: 'random',
    targets: [],
    text: u => `${kwD('Detonate')} up to 3 flagged tiles. For each mined tile, deal ${u ? 12 : 9} damage to a random enemy. For each safe tile, reveal it and lose ${u ? 3 : 4} HP.`,
    can: () => flaggedIdx().length > 0,
    canMsg: 'No flagged tiles.',
    play: u => {
      const b = board();
      const picks = flaggedIdx().slice(0, 3);
      for (const i of picks) {
        if (board() !== b) break; // board re-sealed mid-chain
        if (detonateForCards(i)) hitRandom(atk(u ? 12 : 9));
        else { revealTile(i, 'card-safe'); loseHP(u ? 3 : 4); }
      }
    },
  },
  powderkeg: {
    name: 'Powder Keg', type: 'Power', rarity: 'uncommon', cls: 'sapper', cost: [1, 1], hits: 'all',
    targets: [],
    text: u => `For the rest of this combat, whenever any mine detonates, deal ${u ? 7 : 5} damage to all enemies.`,
    play: u => { cbt().powers.powderkeg += (u ? 7 : 5); },
  },
  munitions: {
    name: 'Munitions Cache', type: 'Skill', rarity: 'uncommon', cls: 'sapper', cost: [1, 1],
    targets: [],
    text: u => `Verified-flag ${u ? 3 : 2} random hidden mines.`,
    play: u => {
      const mines = shuffle(hiddenIdx().filter(i => board().cells[i].mine && !board().cells[i].flag));
      mines.slice(0, u ? 3 : 2).forEach(i => verifyFlag(i));
      if (!mines.length) toast('No hidden mines to flag');
    },
  },
  seedcharge: {
    name: 'Seed Charge', type: 'Skill', rarity: 'common', cls: 'sapper', cost: [1, 0],
    targets: ['hidden'],
    text: () => `Add a mine to the chosen hidden tile and update adjacent numbers. If it is already mined, verified-flag it instead.`,
    play: (u, tg) => {
      if (addMineAt(tg[0])) { toast('A fresh charge is buried.'); log('☣ You bury a fresh charge.'); }
      else { verifyFlag(tg[0]); toast('Already mined — flagged it.'); }
    },
  },
  shockwave: {
    name: 'Shockwave', type: 'Attack', rarity: 'uncommon', cls: 'sapper', cost: [2, 2], hits: 'all',
    targets: [],
    text: u => `Deal ${u ? 10 : 8} damage plus ${u ? 3 : 2} damage for each mine detonated this combat to all enemies.`,
    play: u => hitAll(atk((u ? 10 : 8) + (u ? 3 : 2) * cbt().minesDetonated)),
  },
  bigred: {
    name: 'Big Red Button', type: 'Attack', rarity: 'rare', cls: 'sapper', cost: [3, 3], hits: 'random',
    targets: ['row'],
    text: u => `${kwD('Detonate')} every hidden tile in the chosen row. For each mine, deal ${u ? 10 : 8} damage to a random enemy and lose ${u ? 2 : 3} HP. Reveal safe tiles.`,
    play: (u, tg) => {
      const b = board(), row = tg[0];
      for (let c = 0; c < b.size; c++) {
        if (board() !== b) break; // board re-sealed mid-row
        const i = row * b.size + c, cell = b.cells[i];
        if (cell.void || cell.revealed || cell.entombed) continue;
        if (detonateForCards(i)) { hitRandom(atk(u ? 10 : 8)); loseHP(u ? 2 : 3); }
        else revealTile(i, 'card-safe');
      }
    },
  },
  markedcharge: {
    name: 'Marked Charge', type: 'Attack', rarity: 'common', cls: 'sapper', cost: [1, 1], hits: 'target',
    targets: ['hidden'],
    text: u => `${kwS('Scan')} the chosen hidden tile. If it is mined, verified-flag it and deal ${u ? 12 : 9} damage to the targeted enemy. If it is safe, reveal it and gain ${u ? 7 : 5} Block.`,
    play: (u, tg) => {
      const i = tg[0], cell = board().cells[i];
      scanTile(i);
      if (cell.mine) { verifyFlag(i); hitEnemy(curTarget(), atk(u ? 12 : 9)); }
      else { revealTile(i, 'card-safe'); gainBlock(u ? 7 : 5); }
    },
  },
  blastdividend: {
    name: 'Blast Dividend', type: 'Power', rarity: 'uncommon', cls: 'sapper', cost: [1, 0],
    targets: [],
    text: () => `For the rest of this combat, the first controlled ${kwD('Detonate')} each turn grants 1 Energy and draws 1 card.`,
    play: () => { cbt().powers.blastDividend = true; },
  },
  killzone: {
    name: 'Kill Zone', type: 'Attack', rarity: 'rare', cls: 'sapper', cost: [2, 2], hits: 'all',
    targets: [],
    text: u => `${kwD('Detonate')} up to ${u ? 4 : 3} scanned mines. For each mine, deal ${u ? 11 : 8} damage to all enemies.`,
    can: () => hiddenIdx().some(i => board().cells[i].scan === 'mine'),
    canMsg: 'No scanned mines.',
    play: u => {
      const b = board();
      const mines = hiddenIdx().filter(i => b.cells[i].scan === 'mine').slice(0, u ? 4 : 3);
      for (const i of mines) {
        if (!cbt() || board() !== b) break;
        if (detonateForCards(i) && cbt()) hitAll(atk(u ? 11 : 8));
      }
    },
  },

  /* ----- Surveyor ----- */
  scancard: {
    name: 'Scan', type: 'Skill', rarity: 'starter', cls: 'surveyor', cost: [0, 0],
    targets: ['hidden'],
    text: u => `${kwS('Scan')} the chosen hidden tile. Draw 1 card.${u ? ' Gain 1 Insight.' : ''}`,
    play: (u, tg) => { scanTile(tg[0]); drawCards(1); if (u) gainInsight(1); },
  },
  triangulate: {
    name: 'Triangulate', type: 'Attack', rarity: 'common', cls: 'surveyor', cost: [1, 1], hits: 'target',
    targets: [],
    text: u => `Deal damage to the targeted enemy equal to ${u ? 4 : 3} times the highest revealed number.`,
    play: u => hitEnemy(curTarget(), atk((u ? 4 : 3) * highestRevealedNumber())),
  },
  deduction: {
    name: 'Deduction', type: 'Attack', rarity: 'common', cls: 'surveyor', cost: [1, 1], hits: 'target',
    targets: [],
    text: u => `Spend all ${kwS('Insight')}. Deal ${u ? 4 : 3} damage to the targeted enemy for each point spent.`,
    can: () => cbt().insight > 0, canMsg: 'No Insight.',
    play: u => { const n = cbt().insight; cbt().insight = 0; hitEnemy(curTarget(), atk((u ? 4 : 3) * n)); },
  },
  surveystakes: {
    name: 'Survey Stakes', type: 'Skill', rarity: 'common', cls: 'surveyor', cost: [1, 1],
    targets: ['hidden', 'hidden', 'hidden'],
    optionalTargets: true,
    text: u => `${kwS('Scan')} up to 3 chosen hidden tiles.${u ? ' Then Scan 1 additional random hidden tile.' : ''}`,
    play: (u, tg) => { tg.forEach(i => scanTile(i)); if (u && tg.length) scanTile(randPick(hiddenIdx().filter(i => !board().cells[i].scan)) ?? tg[0]); },
  },
  chordcard: {
    name: 'Chord', type: 'Skill', rarity: 'uncommon', cls: 'surveyor', cost: [0, 0],
    targets: ['number'],
    text: u => `${kwR('Chord')} the chosen revealed number if its value matches correctly placed adjacent flags. Reveal its other neighbors. If successful, draw ${u ? 2 : 1} card${u ? 's' : ''} and gain 1 Insight.`,
    play: (u, tg) => {
      const r = chordAt(tg[0]);
      if (!r.ok) { toast(r.reason || 'Flag count must match the number', true); return; }
      if (r.detonations === 0) { drawCards(u ? 2 : 1); gainInsight(1); }
    },
  },
  sixthsense: {
    name: 'Sixth Sense', type: 'Power', rarity: 'uncommon', cls: 'surveyor', cost: [2, 1],
    targets: [],
    text: () => `For the rest of this combat, the first mine you would reveal each turn is verified-flagged instead.`,
    play: () => { cbt().powers.sixthsense = true; },
  },
  fieldnotes: {
    name: 'Field Notes', type: 'Skill', rarity: 'uncommon', cls: 'surveyor', cost: [1, 1],
    targets: [],
    text: u => `Draw ${u ? 3 : 2} cards. Gain 1 ${kwS('Insight')}.`,
    play: u => { drawCards(u ? 3 : 2); gainInsight(1); },
  },
  pinpoint: {
    name: 'Pinpoint', type: 'Attack', rarity: 'common', cls: 'surveyor', cost: [0, 0], hits: 'target',
    targets: [],
    text: u => `Deal damage to the targeted enemy equal to your ${kwS('Insight')}${u ? ' plus 3' : ''}. This does not spend Insight.`,
    play: u => hitEnemy(curTarget(), atk(cbt().insight + (u ? 3 : 0))),
  },
  wholepicture: {
    name: 'The Whole Picture', type: 'Attack', rarity: 'rare', cls: 'surveyor', cost: [2, 2], exhaust: true, hits: 'target',
    targets: [],
    text: u => `Deal damage to the targeted enemy equal to ${u ? '150% of ' : ''}the sum of all numbers revealed this turn${u ? ', rounded down' : ''}. Exhaust.`,
    play: u => hitEnemy(curTarget(), atk(Math.floor(cbt().sumThisTurn * (u ? 1.5 : 1)))),
  },
  crosssection: {
    name: 'Cross Section', type: 'Skill', rarity: 'common', cls: 'surveyor', cost: [1, 1],
    targets: ['row'],
    text: u => `${kwS('Scan')} up to ${u ? 6 : 5} hidden tiles in the chosen row.`,
    play: (u, tg) => {
      const b = board(), row = tg[0];
      const tiles = [];
      for (let col = 0; col < b.size; col++) {
        const i = row * b.size + col;
        if (isHiddenUsable(i)) tiles.push(i);
      }
      tiles.slice(0, u ? 6 : 5).forEach(scanTile);
    },
  },
  knownquantity: {
    name: 'Known Quantity', type: 'Attack', rarity: 'uncommon', cls: 'surveyor', cost: [1, 1], hits: 'target',
    targets: [],
    text: u => `Deal ${u ? 6 : 5} damage to the targeted enemy for each scanned mine, plus ${u ? 3 : 2} damage for each tile scanned as safe. Scans are not consumed.`,
    can: () => hiddenIdx().some(i => board().cells[i].scan),
    canMsg: 'Nothing is scanned.',
    play: u => {
      const scans = hiddenIdx().map(i => board().cells[i].scan);
      const mines = scans.filter(x => x === 'mine').length;
      const safe = scans.filter(x => x === 'safe').length;
      hitEnemy(curTarget(), atk(mines * (u ? 6 : 5) + safe * (u ? 3 : 2)));
    },
  },
  eureka: {
    name: 'Eureka', type: 'Skill', rarity: 'rare', cls: 'surveyor', cost: [2, 1],
    targets: [], exhaust: true,
    text: () => `Reveal every tile scanned as safe and verified-flag every scanned mine. Exhaust.`,
    can: () => hiddenIdx().some(i => board().cells[i].scan),
    canMsg: 'Nothing is scanned.',
    play: () => {
      const b = board();
      const scanned = hiddenIdx().filter(i => b.cells[i].scan);
      for (const i of scanned) {
        if (!cbt() || board() !== b) break;
        if (b.cells[i].scan === 'mine') verifyFlag(i);
        else revealTile(i, 'card-safe');
      }
    },
  },

  /* ----- Terraformer ----- */
  entombcard: {
    name: 'Entomb', type: 'Skill', rarity: 'starter', cls: 'terraformer', cost: [1, 1],
    targets: ['hidden'],
    text: u => `${kwG('Entomb')} the chosen hidden tile. It can no longer detonate and counts as resolved for Full Clear.${u ? ' Gain 3 Block.' : ''}`,
    play: (u, tg) => { entombTile(tg[0]); if (u) gainBlock(3); },
  },
  sentry: {
    name: 'Sentry', type: 'Skill', rarity: 'common', cls: 'terraformer', cost: [1, 1], hits: 'random',
    targets: ['open'],
    text: u => `Build a Sentry on the chosen revealed tile. At the end of each turn, it deals ${u ? 7 : 5} damage to a random enemy. Enemy board attacks hit constructs first.`,
    play: (u, tg) => addConstruct(tg[0], 'sentry', { dmg: u ? 7 : 5 }),
  },
  faultline: {
    name: 'Fault Line', type: 'Skill', rarity: 'common', cls: 'terraformer', cost: [1, 1],
    targets: ['hidden', 'hidden'],
    text: u => `Swap the two chosen hidden tiles. Their contents move with them. Gain ${u ? 6 : 4} Block.`,
    play: (u, tg) => { swapCells(tg[0], tg[1]); gainBlock(u ? 6 : 4); },
  },
  propshaft: {
    name: 'Prop Shaft', type: 'Skill', rarity: 'common', cls: 'terraformer', cost: [1, 1],
    targets: ['hidden'],
    text: u => `${kwS('Defuse')} the chosen hidden tile. If it is mined, remove the mine and gain ${u ? 7 : 5} ${kwG('Plating')}. If it is safe, reveal it.`,
    play: (u, tg) => { if (defuseTile(tg[0])) gainPlating(u ? 7 : 5); },
  },
  scaffold: {
    name: 'Scaffold', type: 'Skill', rarity: 'common', cls: 'terraformer', cost: [1, 1],
    targets: [],
    text: u => `Add ${u ? 4 : 3} safe tiles to the board's edge. They begin scanned as safe and count toward Full Clear.`,
    play: u => {
      const added = annexTiles(u ? 4 : 3, false);
      added.forEach(i => { board().cells[i].scan = 'safe'; });
      if (added.length) { toast(`${added.length} safe tiles scaffolded onto the edge`); log(`▲ Scaffold: ${added.length} safe tiles annexed.`); }
      else toast('No room to build', true);
    },
  },
  leylines: {
    name: 'Ley Lines', type: 'Power', rarity: 'uncommon', cls: 'terraformer', cost: [1, 1],
    targets: [],
    text: u => `For the rest of this combat, whenever a cascade reveals at least ${u ? 3 : 4} tiles, gain 1 Energy.`,
    play: u => { cbt().powers.leylines = (u ? 3 : 4); },
  },
  bulwark: {
    name: 'Bulwark', type: 'Skill', rarity: 'uncommon', cls: 'terraformer', cost: [2, 2],
    targets: ['open'],
    text: u => `Build a Bulwark on the chosen revealed tile. At the end of each turn, gain ${u ? 3 : 2} ${kwG('Plating')} and ${u ? 4 : 3} Block.`,
    play: (u, tg) => addConstruct(tg[0], 'bulwark', { plating: u ? 3 : 2, block: u ? 4 : 3 }),
  },
  landslide: {
    name: 'Landslide', type: 'Attack', rarity: 'rare', cls: 'terraformer', cost: [3, 3], hits: 'all',
    targets: [],
    text: u => `Reveal every hidden tile in the outer ring, safely removing its mines. Deal ${u ? 5 : 4} damage to all enemies for each tile revealed this way.`,
    play: u => {
      const b = board(); let n = 0;
      for (let i = 0; i < b.cells.length; i++) {
        if (board() !== b) break; // board re-sealed mid-slide
        const r = Math.floor(i / b.size), c = i % b.size;
        if (r !== 0 && c !== 0 && r !== b.size - 1 && c !== b.size - 1) continue;
        const cell = b.cells[i];
        if (cell.void || cell.revealed || cell.entombed) continue;
        if (cell.mine) { cell.mine = false; cell.flag = 0; log('A mine crumbles away in the landslide.'); }
        revealTile(i, 'card-safe'); n++;
      }
      hitAll(atk((u ? 5 : 4) * n));
    },
  },
  surveyrelay: {
    name: 'Survey Relay', type: 'Skill', rarity: 'common', cls: 'terraformer', cost: [1, 1],
    targets: ['open'],
    text: u => `Build a Relay on the chosen revealed tile. At the end of each turn, ${kwS('Scan')} a random hidden tile and gain ${u ? 4 : 2} Block. Enemy board attacks hit constructs first.`,
    play: (u, tg) => addConstruct(tg[0], 'relay', { block: u ? 4 : 2 }),
  },
  stonechoir: {
    name: 'Stone Choir', type: 'Power', rarity: 'uncommon', cls: 'terraformer', cost: [2, 1],
    targets: [],
    text: () => `For the rest of this combat, your constructs trigger twice at the end of each turn.`,
    play: () => { cbt().powers.stonechoir = true; },
  },
  citybelow: {
    name: 'The City Below', type: 'Attack', rarity: 'rare', cls: 'terraformer', cost: [2, 2], hits: 'all',
    targets: [],
    text: u => `For each construct, deal ${u ? 13 : 10} damage to all enemies and gain ${u ? 3 : 2} Plating.`,
    can: () => board().cells.some(c => c.construct),
    canMsg: 'Build a construct first.',
    play: u => {
      const n = board().cells.filter(c => c.construct).length;
      hitAll(atk(n * (u ? 13 : 10)));
      if (cbt()) gainPlating(n * (u ? 3 : 2));
    },
  },

  /* ----- statuses & curses ----- */
  dud: {
    name: 'Dud', type: 'Status', rarity: 'special', cls: null, cost: null, unplayable: true,
    targets: [], text: () => 'Unplayable. Exhausts at end of turn.', play: () => {},
  },
  rubble: {
    name: 'Rubble', type: 'Status', rarity: 'special', cls: null, cost: null, unplayable: true,
    targets: [], text: () => 'Unplayable. While in hand, your attacks deal 1 less damage.', play: () => {},
  },
  shrapnel: {
    name: 'Shrapnel', type: 'Curse', rarity: 'special', cls: null, cost: null, unplayable: true,
    targets: [], text: () => 'Unplayable. When drawn, lose 1 HP.', play: () => {},
  },
  claustrophobia: {
    name: 'Claustrophobia', type: 'Curse', rarity: 'special', cls: null, cost: null, unplayable: true,
    targets: [], text: () => 'Unplayable. While in your deck, boards spawn +2 mines.', play: () => {},
  },
  vertigo: {
    name: 'Vertigo', type: 'Curse', rarity: 'special', cls: null, cost: null, unplayable: true,
    targets: [], text: () => 'Unplayable. While in your deck, each copy reduces your max Picks by 1, to a minimum of 1.', play: () => {},
  },
  exhaustion: {
    name: 'Exhaustion', type: 'Curse', rarity: 'special', cls: null, cost: null, unplayable: true,
    targets: [], text: () => 'Unplayable. While in your deck, each copy reduces cards drawn per turn by 1, to a minimum of 3.', play: () => {},
  },
  nightterrors: {
    name: 'Night Terrors', type: 'Curse', rarity: 'special', cls: null, cost: null, unplayable: true,
    targets: [], text: () => 'Unplayable. While in your deck, each copy removes 1 Energy from your first turn of combat.', play: () => {},
  },
  paranoia: {
    name: 'Paranoia', type: 'Curse', rarity: 'special', cls: null, cost: null, unplayable: true,
    targets: [], text: () => 'Unplayable. At combat start, each copy flags one safe hidden tile as though it were a mine.', play: () => {},
  },
};

/* ---------------- expanded 200-card catalog ----------------
   Hand-authored names feed a shared set of board-aware mechanical recipes. Every
   entry has its own class, numbers, rarity, upgrade, and tactical role. */
const EXPANSION_NAMES = {
  sapper: ['Breach Tax','Copper Fuse','Aftershock Ledger','Red Wire','Blast Radius','Powder Trail'],
  surveyor: ['Contour Logic','Bearing Check','Blue Pencil','Proof by Dust','Sightline','True North','Margin Note'],
  terraformer: ['Load Stone','Deep Footing','Mason’s Bet','Arch Support','Cut and Fill','Bedrock','Counterweight','Vault Plan'],
  lamplighter: ['First Spark','Wick Trim','Glass Dawn','Coal Memory','Bright Pocket','Flare Step','Lantern Sweep','Sunless Noon','Glowline','Beacon Tax','Candle Choir','Flashpan','Warm Route','Burning Map','Prism Break','Daybreak','Star Chamber','White Flame','Last Light'],
  gambler: ['Open Wager','House Edge','Bone Token','Tell','Double Down','Cold Deck','Marked Corner','Side Pot','Dead Man’s Hand','Lucky Seven','Cut the Deck','Snake Eyes','Raise','Bluff','Cash Out','All In','The Long Odds','Loaded Table','Final Bet'],
  chirurgeon: ['Clean Cut','Field Dressing','Triage Line','Red Thread','Splint','Bitter Tonic','Pulse Check','Pressure','Spare Blood','Stitchwork','Shock Ward','Second Opinion','Bonesaw Logic','Cauterize','Recovery Position','Miracle Dose','Anatomy Lesson','No Scar','Operating Theatre'],
  archivist: ['Footnote','Index Mark','Errata','Redaction','Filed Under','Dust Jacket','Citation','Concordance','Borrowed Time','Appendix','Palimpsest','Marginalia','Closed Stacks','Recall Notice','Primary Source','Grand Catalogue','Forbidden Index','Final Edition','Everything Recorded'],
  warden: ['Brace Line','Shield Angle','Gatehouse','Stone Oath','Interlock','Rampart','Watch Post','Iron Quiet','Hold the Door','Parapet','Layered Plate','Anchor Point','Siege Lesson','Unbroken','Counterfort','Citadel','Immovable','Last Bastion','The Wall Below'],
  hexwright: ['Chalk Three','Odd Proof','Number Bite','False Zero','Sum Sign','Blue Hex','Carry One','Prime Mark','Count Again','Dangerous Four','Root Diagram','Broken Sequence','Eightfold','Miscalculation','Perfect Sum','Grand Theorem','Infinite Margin','Proof of Harm','Final Answer'],
  revenant: ['Grave Step','Cold Breath','Second Burial','Dead Weight','Pale Fuse','Borrowed Pulse','Crypt Debt','Hollow Knock','Wake Bell','Mortal Reminder','Ghost Flag','Last Rites','No Tomorrow','Open Grave','Death’s Interest','Unburied','Walk It Off','Afterlife','Refuse the Dark'],
};

const EXPANSION_PROFILE = {
  sapper: { attack: 3, guard: 0, scan: 1 }, surveyor: { attack: 0, guard: 0, scan: 3 },
  terraformer: { attack: 0, guard: 3, scan: 1 }, lamplighter: { attack: 2, guard: 0, scan: 2 },
  gambler: { attack: 2, guard: 1, scan: 1 }, chirurgeon: { attack: 1, guard: 3, scan: 0 },
  archivist: { attack: 1, guard: 0, scan: 2 }, warden: { attack: 0, guard: 4, scan: 0 },
  hexwright: { attack: 2, guard: 0, scan: 2 }, revenant: { attack: 4, guard: 0, scan: 0 },
};

function expansionCard(cls, name, i) {
  const p = EXPANSION_PROFILE[cls], n = i + 1;
  const rarity = i < 9 ? 'common' : i < 15 ? 'uncommon' : 'rare';
  const cost = rarity === 'rare' ? [2, 1] : i % 5 === 0 ? [0, 0] : [1, 1];
  const dmg = 5 + p.attack + (n % 5), guard = 4 + p.guard + (n % 4), scans = 1 + p.scan + (n % 2);
  const base = { name, rarity, cls, cost };
  switch (i % 19) {
    case 0: return { ...base, type:'Attack', hits:'target', targets:[], text:u=>`Deal ${u?dmg+4:dmg} damage to the targeted enemy.`, play:u=>hitEnemy(curTarget(),atk(u?dmg+4:dmg)) };
    case 1: return { ...base, type:'Attack', hits:'target', targets:['hidden'], text:u=>`${kwR('Reveal')} the chosen hidden tile. If it is safe, deal ${u?dmg+5:dmg} damage to the targeted enemy.`, play:(u,t)=>{const r=revealTile(t[0],'card-safe');if(r.safe)hitEnemy(curTarget(),atk(u?dmg+5:dmg));} };
    case 2: return { ...base, type:'Skill', targets:['hidden'], text:u=>`${kwS('Scan')} the chosen hidden tile. Draw ${u?2:1} card${u?'s and gain 1 pick':''}.`, play:(u,t)=>{scanTile(t[0]);drawCards(u?2:1);if(u)gainPicks(1);} };
    case 3: return { ...base, type:'Skill', targets:[], text:u=>`Gain ${u?guard+4:guard} Block.`, play:u=>gainBlock(u?guard+4:guard) };
    case 4: return { ...base, type:'Skill', targets:[], text:u=>`Gain ${u?Math.ceil(guard/2)+2:Math.ceil(guard/2)} ${kwG('Plating')}.`, play:u=>gainPlating(u?Math.ceil(guard/2)+2:Math.ceil(guard/2)) };
    case 5: return { ...base, type:'Attack', hits:'random', targets:['hidden'], text:u=>`${kwS('Defuse')} the chosen hidden tile. If it is mined, remove the mine and deal ${u?dmg+6:dmg+2} damage to a random enemy. If it is safe, reveal it.`, play:(u,t)=>{if(defuseTile(t[0]))hitRandom(atk(u?dmg+6:dmg+2));} };
    case 6: return { ...base, type:'Skill', targets:['hidden'], text:u=>`${kwG('Entomb')} the chosen hidden tile and gain ${u?guard+3:guard} Block.`, play:(u,t)=>{entombTile(t[0]);gainBlock(u?guard+3:guard);} };
    case 7: return { ...base, type:'Skill', targets:[], text:u=>`${kwS('Scan')} ${u?scans+2:scans} random hidden tiles. Gain 1 pick.`, play:u=>{shuffle(hiddenIdx()).slice(0,u?scans+2:scans).forEach(scanTile);gainPicks(1);} };
    case 8: return { ...base, type:'Attack', hits:'target', targets:[], text:u=>`Deal ${u?4:3} damage to the targeted enemy for each flagged tile.`, play:u=>hitEnemy(curTarget(),atk(flaggedIdx().length*(u?4:3))) };
    case 9: return { ...base, type:'Attack', hits:'all', targets:['hidden'], text:u=>`If the chosen tile is mined, ${kwD('Detonate')} it without taking mine damage and deal ${u?dmg+5:dmg} damage to all enemies. If it is safe, reveal it.`, play:(u,t)=>{if(detonateForCards(t[0]))hitAll(atk(u?dmg+5:dmg));else revealTile(t[0],'card-safe');} };
    case 10:return { ...base, type:'Attack', hits:'all', targets:[], text:u=>`Deal ${u?dmg+3:dmg-1} damage to all enemies.`, play:u=>hitAll(atk(u?dmg+3:dmg-1)) };
    case 11:return { ...base, type:'Skill', targets:[], text:u=>`Draw ${u?3:2} cards.${u?' Gain 1 Energy.':''}`, play:u=>{drawCards(u?3:2);if(u)gainEnergy(1);} };
    case 12:return { ...base, type:'Skill', targets:[], text:u=>`Add ${u?3:2} safe tiles to the board's edge. They begin scanned as safe and count toward Full Clear.`, play:u=>annexTiles(u?3:2,false).forEach(i=>board().cells[i].scan='safe') };
    case 13:return { ...base, type:'Skill', targets:['hidden'], text:u=>`Add a mine to the chosen hidden tile and update adjacent numbers. If it is already mined, verified-flag it instead.${u?' Gain 5 Block.':''}`, play:(u,t)=>{if(!addMineAt(t[0]))verifyFlag(t[0]);if(u)gainBlock(5);} };
    case 14:return { ...base, type:'Skill', targets:['row'], text:u=>`${kwS('Scan')} up to ${u?6:4} hidden tiles in the chosen row.`, play:(u,t)=>{const b=board(),tiles=[];for(let c=0;c<b.size;c++){const x=t[0]*b.size+c;if(isHiddenUsable(x))tiles.push(x);}tiles.slice(0,u?6:4).forEach(scanTile);} };
    case 15:return { ...base, type:'Attack', hits:'target', targets:['hidden','hidden'], optionalTargets:true, text:u=>`${kwR('Reveal')} up to 2 chosen hidden tiles. Deal ${u?5:3} damage to the targeted enemy for each safe tile revealed.`, play:(u,t)=>{let safe=0;t.forEach(i=>{if(revealTile(i,'card-safe').safe)safe++;});hitEnemy(curTarget(),atk(safe*(u?5:3)));} };
    case 16:return { ...base, type:'Attack', hits:'target', targets:[], text:u=>`Deal ${u?3:2} damage to the targeted enemy for each tile revealed this turn.`, play:u=>hitEnemy(curTarget(),atk(cbt().revealedThisTurn*(u?3:2))) };
    case 17:return { ...base, type:'Attack', hits:'all', targets:[], text:u=>`Deal ${u?4:3} damage to all enemies for each scanned mine.`, play:u=>hitAll(atk(hiddenIdx().filter(i=>board().cells[i].scan==='mine').length*(u?4:3))) };
    default:return { ...base, type:'Skill', targets:[], exhaust:true, text:u=>`${kwS('Scan')} up to ${u?7:5} random hidden tiles. Deal 1 damage to all enemies for each tile scanned.${u?' Gain 1 max pick for the rest of this combat.':''} Exhaust.`, play:u=>{const picks=shuffle(hiddenIdx()).slice(0,u?7:5);picks.forEach(scanTile);hitAll(atk(picks.length));if(u)gainMaxPicks(1);} };
  }
}

for (const [cls, names] of Object.entries(EXPANSION_NAMES)) {
  names.forEach((name, i) => { CARDS[`exp_${cls}_${i}`] = expansionCard(cls, name, i); });
}

Object.assign(CARDS, {
  resonanttap: { name:'Resonant Tap',type:'Skill',rarity:'common',cls:'neutral',cost:[0,0],targets:['number'],exhaust:true,text:u=>`${kwR('Chord')} the chosen revealed number. If successful, draw 1 card.${u?' Gain 1 Insight.':''} Exhaust.`,play:(u,t)=>{const r=chordAt(t[0]);if(!r.ok){toast(r.reason||'The flags do not prove this Chord.',true);return;}drawCards(1);if(u)gainInsight(1);} },
  stonechorus: { name:'Stone Chorus',type:'Skill',rarity:'uncommon',cls:'neutral',cost:[0,0],targets:['number'],exhaust:true,text:u=>`${kwR('Chord')} the chosen revealed number. If successful, gain ${u?8:5} Block. Exhaust.`,play:(u,t)=>{const r=chordAt(t[0]);if(!r.ok){toast(r.reason||'The flags do not prove this Chord.',true);return;}gainBlock(u?8:5);} },
  steadyhand: { name:'Steady Hand',type:'Skill',rarity:'common',cls:'neutral',cost:[1,0],targets:[],text:u=>`Gain ${u?7:4} Block and ${u?3:2} picks.`,play:u=>{gainBlock(u?7:4);gainPicks(u?3:2);} },
  lanternloan: { name:'Lantern Loan',type:'Skill',rarity:'common',cls:'neutral',cost:[1,1],targets:[],text:u=>`${kwS('Scan')} ${u?3:2} random hidden tiles. Gain 1 pick.${u?' Gain 1 max pick for the rest of this combat.':''}`,play:u=>{shuffle(hiddenIdx()).slice(0,u?3:2).forEach(scanTile);gainPicks(1);if(u)gainMaxPicks(1);} },
  hardlesson: { name:'Hard Lesson',type:'Attack',rarity:'uncommon',cls:'neutral',cost:[0,0],hits:'target',targets:[],can:()=>cbt().picks>0,canMsg:'No picks left to spend.',text:u=>`Spend up to 3 picks. Deal ${u?8:6} damage to the targeted enemy for each pick spent.`,play:u=>hitEnemy(curTarget(),atk(spendPicks(3)*(u?8:6))) },
  emergencyexit: { name:'Emergency Exit',type:'Skill',rarity:'rare',cls:'neutral',cost:[2,1],targets:[],text:u=>`Lose 1 max pick for the rest of this combat. Gain ${u?16:12} Plating and draw 2 cards.`,play:u=>{loseMaxPicks(1);gainPlating(u?16:12);drawCards(2);} },
  bandage: { name:'Bandage',type:'Skill',rarity:'common',cls:'neutral',cost:[1,1],targets:[],exhaust:true,can:canHeal,canMsg:'Already at full HP.',text:u=>`Recover ${u?6:4} HP. Exhaust.`,play:u=>healHP(u?6:4) },
  mendingsalts: { name:'Mending Salts',type:'Skill',rarity:'uncommon',cls:'neutral',cost:[2,1],targets:[],exhaust:true,can:canHeal,canMsg:'Already at full HP.',text:u=>`Recover ${u?10:7} HP. Exhaust.`,play:u=>healHP(u?10:7) },
  lastlight: { name:'Final Ember',type:'Skill',rarity:'rare',cls:'neutral',cost:[2,2],targets:[],exhaust:true,can:canHeal,canMsg:'Already at full HP.',text:u=>`Lose 1 max pick for the rest of this combat. Recover ${u?15:11} HP. Exhaust.`,play:u=>{loseMaxPicks(1);healHP(u?15:11);} },
  stonepoultice: { name:'Stone Poultice',type:'Skill',rarity:'common',cls:'neutral',cost:[1,1],targets:[],exhaust:true,can:canHeal,canMsg:'Already at full HP.',text:u=>`Recover ${u?5:3} HP. Gain ${u?5:3} Block. Exhaust.`,play:u=>{healHP(u?5:3);gainBlock(u?5:3);} },
  triagekit: { name:'Triage Kit',type:'Skill',rarity:'uncommon',cls:'neutral',cost:[1,1],targets:[],exhaust:true,can:canHeal,canMsg:'Already at full HP.',text:u=>`Recover 2 HP plus 2 for each other card Exhausted this combat, up to ${u?12:8} HP. Exhaust.`,play:u=>healHP(Math.min(u?12:8,2+cbt().exhaust.length*2)) },
  gravemoss: { name:'Grave Moss',type:'Skill',rarity:'uncommon',cls:'neutral',cost:[1,1],targets:[],exhaust:true,can:canHeal,canMsg:'Already at full HP.',text:u=>`Spend up to ${u?3:2} picks. Recover 3 HP for each pick spent, then recover 2 HP. Exhaust.`,play:u=>healHP(spendPicks(u?3:2)*3+2) },
  secondwind: { name:'Second Wind',type:'Skill',rarity:'rare',cls:'neutral',cost:[0,0],targets:[],exhaust:true,can:canHeal,canMsg:'Already at full HP.',text:u=>`Recover ${u?10:7} HP. Exhaust.`,play:u=>healHP(u?10:7) },
  bedrockshelter: { name:'Bedrock Shelter',type:'Skill',rarity:'uncommon',cls:'terraformer',cost:[1,1],targets:[],exhaust:true,can:canHeal,canMsg:'Already at full HP.',text:u=>`Recover 3 HP plus 2 for each Construct, up to ${u?13:9} HP. Exhaust.`,play:u=>healHP(Math.min(u?13:9,3+board().cells.filter(cell=>cell.construct).length*2)) },
  faultline: { name:'Fault Line',type:'Attack',rarity:'common',cls:'neutral',cost:[1,1],targets:[],hits:'target',text:u=>`Deal ${u?7:5} damage. Apply ${u?2:1} Exposed to the targeted enemy. Exposed makes the next hit deal 25% more damage. Works on bosses.`,play:u=>{const e=curTarget();hitEnemy(e,atk(u?7:5));applyEnemyEffect(e,'exposed',u?2:1);} },
  signaljam: { name:'Signal Jam',type:'Skill',rarity:'uncommon',cls:'neutral',cost:[1,1],targets:[],hits:'target',text:u=>`Apply ${u?2:1} Jammed to the targeted enemy. Its next direct attack deals 40% less damage. Works on bosses.${u?' Draw 1 card.':''}`,play:u=>{applyEnemyEffect(curTarget(),'jammed',u?2:1);if(u)drawCards(1);} },
  sunderingchalk: { name:'Sundering Chalk',type:'Skill',rarity:'uncommon',cls:'neutral',cost:[1,0],targets:[],hits:'target',text:u=>`Apply ${u?2:1} Sundered to the targeted enemy. Remove its Block and halve Block gained during its next action. Works on bosses.`,play:u=>applyEnemyEffect(curTarget(),'sundered',u?2:1) },
  gravebind: { name:'Gravebind',type:'Skill',rarity:'rare',cls:'neutral',cost:[2,1],targets:[],hits:'target',exhaust:true,text:u=>`Apply ${u?2:1} Exposed and ${u?2:1} Jammed to the targeted enemy. Works on bosses. Exhaust.`,play:u=>{const e=curTarget();applyEnemyEffect(e,'exposed',u?2:1);applyEnemyEffect(e,'jammed',u?2:1);} },
});

Object.assign(CARDS, buildCardExpansion500({
  cbt, board, shuffle, curTarget, atk, hitEnemy, hitRandom, hitAll,
  gainBlock, gainPlating, gainEnergy, gainInsight, gainPicks, gainMaxPicks,
  loseMaxPicks, spendPicks, drawCards, loseHP, revealTile, scanTile, defuseTile,
  detonateForCards, entombTile, swapCells, addConstruct, chordAt, verifyFlag,
  hiddenIdx, flaggedIdx, isHiddenUsable, neighborsOf, numAt, annexTiles, addMineAt,
}));

/* ---------------- trinkets ---------------- */
export const TRINKETS = {
  blastgoggles:  { name: 'Blast Goggles', emoji: '🥽', tier: 'starter',
    desc: 'The first mine that detonates against you each combat deals half damage.' },
  dowsingcharm:  { name: 'Dowsing Charm', emoji: '📿', tier: 'starter',
    desc: 'At the start of combat, Scan 2 random tiles.' },
  keystone:      { name: 'Keystone', emoji: '🗝️', tier: 'starter',
    desc: 'Your first Entomb each combat is free.' },
  emberjar:      { name: 'Ember Jar', emoji: '🏮', tier: 'starter', desc: '+1 max Energy; draw one fewer card after turn 1.' },
  loadedcoin:    { name: 'Loaded Coin', emoji: '🪙', tier: 'starter', desc: 'At combat start, one random mine is verified-flagged.' },
  fieldkit:      { name: 'Field Kit', emoji: '🩹', tier: 'starter', desc: '+8 max HP.' },
  indexcard:     { name: 'Index Card', emoji: '🗂️', tier: 'starter', desc: 'Draw 1 extra card on the first turn of combat.' },
  wardplate:     { name: 'Ward Plate', emoji: '🛡️', tier: 'starter', desc: 'Begin combat with 2 Plating.' },
  hexkey:        { name: 'Hex Key', emoji: '🔷', tier: 'starter', desc: 'At combat start, Scan 3 random tiles.' },
  gravebell:     { name: 'Grave Bell', emoji: '🔔', tier: 'starter', desc: 'Instinct can save you twice each combat.' },
  luckycompass:  { name: 'Lucky Compass', emoji: '🧭', tier: 'common',
    desc: 'The first mine you detonate against yourself each combat deals 0 damage.' },
  quill:         { name: "Cartographer's Quill", emoji: '🪶', tier: 'common',
    desc: 'Combats begin with a second random cascade opened.' },
  detector:      { name: 'Rusted Detector', emoji: '📻', tier: 'uncommon',
    desc: 'At combat start, one random mine is verified-flagged.' },
  tally:         { name: 'Tally Counter', emoji: '🧮', tier: 'uncommon',
    desc: 'Every 25 safe tiles revealed, gain 1 max HP.' },
  pitons:        { name: "Climber's Pitons", emoji: '🧗', tier: 'uncommon',
    desc: 'Gain +1 pick at the start of every turn.' },
  canary:        { name: "Miner's Canary", emoji: '🐤', tier: 'rare',
    desc: 'Once per combat, a single detonation against you is capped at 10 damage.' },
  lamp:          { name: 'Overclocked Lamp', emoji: '🔦', tier: 'boss',
    desc: '+1⚡ each turn; every board spawns +4 mines.' },
  dowsingrod:    { name: 'Dowsing Rod', emoji: '🪄', tier: 'boss',
    desc: 'At the start of each turn, highlight one provably safe tile. If none exists, verify one mine. Your first Scan card each turn costs 0 Energy.' },
  bedrockheart:  { name: 'Bedrock Heart', emoji: '🫀', tier: 'boss', boss: 'collapser',
    desc: 'Begin each combat with 8 Plating. A Full Clear restores 4 Plating.' },
  devouringpick: { name: 'Devouring Pick', emoji: '⛏️', tier: 'boss', boss: 'collapser',
    desc: 'Every controlled mine detonation deals 5 damage to all enemies.' },
  fogglass:      { name: 'Fogglass Prism', emoji: '🔮', tier: 'boss', boss: 'fogfather',
    desc: 'Negate the first Fog effect in each combat.' },
  silverthread:  { name: 'Silver Thread', emoji: '🧵', tier: 'boss', boss: 'fogfather',
    desc: 'The first fresh safe Scan each turn grants 1 Energy.' },
  signalcore:    { name: 'Signal Core', emoji: '💠', tier: 'boss', boss: 'nn99',
    desc: 'The first time you reveal at least 3 safe tiles in a turn, gain 1 Energy.' },
  protocolcoil:  { name: 'Protocol Coil', emoji: '➰', tier: 'boss', boss: 'nn99',
    desc: 'The first card you play each turn costs 1 less Energy, to a minimum of 0.' },
  wardenseal:    { name: 'Warden Seal', emoji: '🛡️', tier: 'boss',
    desc: 'The first direct enemy attack in each combat deals 6 less damage.' },
  veincompass:   { name: 'Vein Compass', emoji: '🧭', tier: 'boss',
    desc: 'Gain +1 maximum Pick in every combat.' },
};

/* ---------------- gadgets (potions) ---------------- */
export const GADGETS = {
  metaldetector: { name: 'Metal Detector', emoji: '🔍', target: 'anytile',
    desc: 'Scan a 3×3 region.',
    use: tg => { for (const j of area3x3(tg)) if (isHiddenUsable(j)) scanTile(j); } },
  chalk: { name: 'Chalk Stick', emoji: '🖍️',
    desc: 'Verified-flag up to 3 random hidden mines.',
    use: () => {
      const mines = shuffle(hiddenIdx().filter(i => board().cells[i].mine && !board().cells[i].flag));
      mines.slice(0, 3).forEach(i => verifyFlag(i));
      if (!mines.length) toast('No hidden mines left');
    } },
  nitro: { name: 'Nitro Vial', emoji: '🧪',
    desc: 'Your next Detonate against an enemy this combat deals +10.',
    use: () => { cbt().nitro += 10; toast('Nitro primed: next detonation +10'); } },
  platingdraught: { name: 'Plating Draught', emoji: '⚗️',
    desc: 'Gain 8 Plating.',
    use: () => gainPlating(8) },
  smokebomb: { name: 'Smoke Bomb', emoji: '💨',
    desc: 'Flee a non-boss combat (no rewards).',
    use: () => fleeCombat() },
};

/* ---------------- enemies ----------------
   sc(e,n): scale attack numbers when an enemy appears below its home stratum. */
const sc = (e, n) => n + 3 * e.scale;

export const ENEMIES = {
  grubber: {
    name: 'Grubber', emoji: '🪱', hp: 22, home: 0,
    desc: 'Begins buried beneath a safe tile and Chews for 6 damage. Reveal its marked tile to expose it; once exposed, it attacks for 9 damage.',
    setup: e => {
      const spots = hiddenIdx().filter(i => !board().cells[i].mine);
      e.data.tile = spots.length ? randPick(spots) : null;
      e.data.buried = e.data.tile != null;
      if (e.data.buried) board().cells[e.data.tile].grub = true;
    },
    next: e => e.data.buried
      ? { kind: 'chew', cls: 'atk', n: sc(e, 6), label: `Chew ${sc(e, 6)} (buried — reveal its tile!)` }
      : { kind: 'attack', cls: 'atk', n: sc(e, 9), label: `Attack ${sc(e, 9)}` },
    act: (e, it) => enemyAttack(e, it.n),
  },
  minelayer: {
    name: 'Minelayer Imp', emoji: '👺', hp: 26, home: 0,
    desc: 'Alternates between an 8-damage attack and planting 2 new mines, favoring the column shown in its intent.',
    next: e => {
      if (e.step % 2 === 0) return { kind: 'attack', cls: 'atk', n: sc(e, 8), label: `Attack ${sc(e, 8)}` };
      const col = randInt(board().size);
      return { kind: 'lay', cls: 'board', n: 2, col, label: `Lay 2 mines (col ${col + 1})` };
    },
    act: (e, it) => {
      if (it.kind === 'attack') enemyAttack(e, it.n);
      else boardAttack(`${e.def.name} lays mines`, () => layMines(it.n, it.col));
    },
  },
  warden: {
    name: 'Stone Warden', emoji: '🗿', hp: 40, home: 0,
    desc: 'Gains Block equal to half the number of hidden tiles, rounded up, then attacks for 7 damage every turn.',
    next: e => ({ kind: 'fortify', cls: 'atk', n: sc(e, 7), label: `Attack ${sc(e, 7)} · Block ½ hidden tiles` }),
    act: (e, it) => { e.block += Math.ceil(hiddenIdx().length / 2); enemyAttack(e, it.n); },
  },
  wisp: {
    name: 'Fog Wisp', emoji: '👻', hp: 1, home: 1,
    desc: 'Alternates between re-hiding 3 revealed tiles with Fog and attacking for 4 damage. Fragile, but disruptive if left alive.',
    next: e => e.step % 2 === 0
      ? { kind: 'fog', cls: 'board', n: 3, label: 'Fog 3 tiles' }
      : { kind: 'attack', cls: 'atk', n: sc(e, 4), label: `Attack ${sc(e, 4)}` },
    act: (e, it) => {
      if (it.kind === 'attack') enemyAttack(e, it.n);
      else boardAttack(`${e.def.name} exhales fog`, () => fogTiles(it.n));
    },
  },
  shade: {
    name: 'Marsh Shade', emoji: '🌫️', hp: 30, home: 1,
    desc: 'Alternates between a 9-damage attack and Fog that re-hides 2 revealed tiles.',
    next: e => e.step % 2 === 0
      ? { kind: 'attack', cls: 'atk', n: sc(e, 9), label: `Attack ${sc(e, 9)}` }
      : { kind: 'fog', cls: 'board', n: 2, label: 'Fog 2 tiles' },
    act: (e, it) => {
      if (it.kind === 'attack') enemyAttack(e, it.n);
      else boardAttack(`${e.def.name} seeps mist`, () => fogTiles(it.n));
    },
  },
  tunneler: {
    name: 'Tunneler Grub', emoji: '🐛', hp: 34, home: 1,
    desc: 'Alternates between an 8-damage attack and excavating 3 new edge tiles containing a mixture of safe ground and mines.',
    next: e => e.step % 2 === 0
      ? { kind: 'attack', cls: 'atk', n: sc(e, 8), label: `Attack ${sc(e, 8)}` }
      : { kind: 'excavate', cls: 'board', n: 3, label: 'Excavate 3 (mined) tiles' },
    act: (e, it) => {
      if (it.kind === 'attack') enemyAttack(e, it.n);
      else boardAttack(`${e.def.name} chews open new tunnels`, () => {
        const added = annexTiles(it.n, 'mixed');
        if (added.length) toast(`${e.def.name} excavates ${added.length} new tiles!`, true);
      });
    },
  },
  clockwork: {
    name: 'Clockwork Sapper', emoji: '🤖', hp: 45, home: 2,
    desc: 'Cycles through excavating 2 mixed edge tiles, attacking for 12 damage, and planting 2 new mines in the shown column.',
    next: e => {
      const s = e.step % 3;
      if (s === 0) return { kind: 'excavate', cls: 'board', n: 2, label: 'Excavate 2 (mined) tiles' };
      if (s === 1) return { kind: 'attack', cls: 'atk', n: sc(e, 12), label: `Attack ${sc(e, 12)}` };
      const col = randInt(board().size);
      return { kind: 'lay', cls: 'board', n: 2, col, label: `Lay 2 mines (col ${col + 1})` };
    },
    act: (e, it) => {
      if (it.kind === 'attack') enemyAttack(e, it.n);
      else if (it.kind === 'excavate') boardAttack(`${e.def.name} drills open new ground`, () => {
        const added = annexTiles(it.n, 'mixed');
        if (added.length) toast(`${e.def.name} excavates ${added.length} new tiles!`, true);
      });
      else boardAttack(`${e.def.name} plants charges`, () => layMines(it.n, it.col));
    },
  },
  gearhusk: {
    name: 'Gear Husk', emoji: '⚙️', hp: 55, home: 2,
    desc: 'Alternates between a heavy 14-damage attack and gaining 12 Block.',
    next: e => e.step % 2 === 0
      ? { kind: 'attack', cls: 'atk', n: sc(e, 14), label: `Attack ${sc(e, 14)}` }
      : { kind: 'defend', cls: 'defend', n: 12, label: 'Block 12' },
    act: (e, it) => { if (it.kind === 'attack') enemyAttack(e, it.n); else e.block += it.n; },
  },

  /* ----- elites ----- */
  ossuary: {
    name: 'Ossuary Warden', emoji: '💀', hp: 62, home: 0, elite: true,
    desc: 'Cycles through a 10-damage attack, gaining Block equal to half the hidden tiles while attacking for 6, and planting 2 new mines.',
    next: e => {
      const s = e.step % 3;
      if (s === 0) return { kind: 'attack', cls: 'atk', n: sc(e, 10), label: `Attack ${sc(e, 10)}` };
      if (s === 1) return { kind: 'fortify', cls: 'defend', n: sc(e, 6), label: `Attack ${sc(e, 6)} · Block ½ hidden` };
      const col = randInt(board().size);
      return { kind: 'lay', cls: 'board', n: 2, col, label: `Lay 2 mines (col ${col + 1})` };
    },
    act: (e, it) => {
      if (it.kind === 'attack') enemyAttack(e, it.n);
      else if (it.kind === 'fortify') { e.block += Math.ceil(hiddenIdx().length / 2); enemyAttack(e, it.n); }
      else boardAttack(`${e.def.name} lays mines`, () => layMines(it.n, it.col));
    },
  },
  miscounter: {
    name: 'The Miscounter', emoji: '🎭', hp: 72, home: 1, elite: true,
    desc: 'Makes one revealed number lie by ±1 until defeated. It cycles through attacking for 12, re-hiding 3 tiles, and moving 3 unverified mines.',
    setup: () => setLie(),
    onDeath: () => { clearLie(); toast('The numbers correct themselves.'); },
    next: e => {
      const s = e.step % 3;
      if (s === 0) return { kind: 'attack', cls: 'atk', n: sc(e, 12), label: `Attack ${sc(e, 12)}` };
      if (s === 1) return { kind: 'fog', cls: 'board', n: 3, label: 'Fog 3 tiles' };
      return { kind: 'scramble', cls: 'board', n: 3, label: 'Scramble 3 mines' };
    },
    act: (e, it) => {
      if (it.kind === 'attack') enemyAttack(e, it.n);
      else if (it.kind === 'fog') boardAttack('The Miscounter fogs the board', () => fogTiles(it.n));
      else boardAttack('The Miscounter scrambles mines', () => scrambleMines(it.n));
      if (!cbt().lie) setLie();
    },
  },
  detonata: {
    name: 'Detonata', emoji: '🧨', hp: 88, home: 2, elite: true,
    desc: 'Attacks for 9 damage and primes a hidden tile each turn. Before its next action, an unresolved, unflagged primed mine detonates against you.',
    next: e => ({ kind: 'prime', cls: 'board', n: sc(e, 9), label: `Attack ${sc(e, 9)} · Prime a tile` }),
    act: (e, it) => {
      resolvePrimed();
      enemyAttack(e, it.n);
      primeTile();
    },
    onDeath: () => { clearPrimed(); },
  },

  /* ----- bosses ----- */
  collapser: {
    name: 'The Collapser', emoji: '🕳️', hp: 95, home: 0, boss: true,
    desc: 'Alternates between attacking for 10 damage and devouring the board’s outer ring. Hidden mines in the consumed ring detonate for half damage.',
    next: e => e.step % 2 === 0
      ? { kind: 'attack', cls: 'atk', n: 10, label: 'Attack 10' }
      : { kind: 'devour', cls: 'board', label: 'DEVOUR the outer ring' },
    act: (e, it) => {
      if (it.kind === 'attack') enemyAttack(e, it.n);
      else devourRing();
    },
  },
  fogfather: {
    name: 'The Fogfather', emoji: '🌁', hp: 135, home: 1, boss: true,
    desc: 'Cycles through re-hiding 5 revealed tiles, moving 4 unverified mines, and attacking for 18 damage.',
    next: e => {
      const s = e.step % 3;
      if (s === 0) return { kind: 'fog', cls: 'board', n: 5, label: 'Fog 5 tiles' };
      if (s === 1) return { kind: 'scramble', cls: 'board', n: 4, label: 'Scramble 4 mines' };
      return { kind: 'attack', cls: 'atk', n: 18, label: 'Attack 18' };
    },
    act: (e, it) => {
      if (it.kind === 'attack') enemyAttack(e, it.n);
      else if (it.kind === 'fog') boardAttack('The Fogfather breathes fog', () => fogTiles(it.n));
      else boardAttack('The Fogfather scrambles mines', () => scrambleMines(it.n));
    },
  },
  nn99: {
    name: 'NN-99', emoji: '🛰️', hp: 220, home: 2, boss: true, gated: true,
    desc: 'Its signal shield halves damage at the start of each turn. Each safe reveal weakens it; after 3 safe reveals or a Chord, attacks deal full damage. It deploys mines while shifting through larger phase boards.',
    gateNote: 'Signal shield: 50% damage initially; reveal 3 safe tiles or Chord for full damage',
    setup: e => { e.data.phase = 1; },
    next: e => {
      const s = e.step % 3;
      if (s === 0) return { kind: 'attack', cls: 'atk', n: 12, label: 'Attack 12' };
      if (s === 1) { const col = randInt(board().size); return { kind: 'lay', cls: 'board', n: 3, col, label: `Lay 3 mines (col ${col + 1})` }; }
      return { kind: 'attack', cls: 'atk', n: 16, label: 'Attack 16' };
    },
    act: (e, it) => {
      if (it.kind === 'attack') enemyAttack(e, it.n);
      else boardAttack('NN-99 deploys mines', () => layMines(it.n, it.col));
    },
  },
};

/* ---------------- encounters ---------------- */
export const FIGHTS = [
  { dig: [['grubber'], ['minelayer'], ['grubber', 'grubber'], ['warden'], ['minelayer', 'grubber']],
    elite: [['ossuary']], boss: [['collapser']] },
  { dig: [['wisp', 'wisp', 'wisp'], ['shade'], ['shade', 'wisp'], ['warden', 'wisp'], ['minelayer', 'shade'], ['tunneler'], ['tunneler', 'wisp']],
    elite: [['miscounter']], boss: [['fogfather']] },
  { dig: [['clockwork'], ['gearhusk'], ['clockwork', 'wisp', 'wisp'], ['gearhusk', 'clockwork'], ['shade', 'clockwork']],
    elite: [['detonata']], boss: [['nn99']] },
  {
    dig: [
      ['grubber', 'clockwork'], ['minelayer', 'shade'], ['warden', 'wisp'],
      ['tunneler', 'gearhusk'], ['clockwork', 'wisp', 'wisp'], ['shade', 'tunneler'],
      ['grubber', 'minelayer', 'wisp'], ['gearhusk', 'clockwork'],
    ],
    elite: [['ossuary'], ['miscounter'], ['detonata']],
    boss: [['collapser'], ['fogfather'], ['nn99']],
  },
];

/* NN-99 phase boards: [size, mines] once HP crosses 150 / 75 */
export const NN99_PHASES = [[10, 20], [12, 30], [13, 42]];
