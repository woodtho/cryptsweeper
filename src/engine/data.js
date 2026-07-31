/* FLAG THE DEEP — game data: strata, classes, cards, enemies, trinkets, gadgets.
   Effects call runtime-bound engine verbs at play-time, so this catalog remains
   safe to import without creating an engine↔data cycle. */
import {
  cbt, board, shuffle, randPick, randInt,
  revealTile, hitEnemy, hitRandom, hitAll, curTarget, atk,
  gainBlock, gainPlating, gainEnergy, gainInsight, spendInsight, gainPicks, gainMaxPicks,
  loseMaxPicks, spendPicks, drawCards, loseHP, healHP, canHeal, applyEnemyEffect,
  detonateForCards, defuseTile, scanTile, entombTile, swapCells, addConstruct,
  chordAt, verifyFlag, flaggedIdx, hiddenIdx, isHiddenUsable, area3x3,
  highestRevealedNumber, neighborsOf, outerRingIndices, numAt, toast, log, fleeCombat,
  enemyAttack, bossResonanceIntent, resolveBossResonance, boardAttack, layMines, fogTiles, scrambleMines,
  setLie, clearLie, primeTile, resolvePrimed, clearPrimed, devourRing,
  annexTiles, addMineAt,
} from './runtime.js';
import { SIGNATURE_CARDS, NEUTRAL_FOUNDATION_CARDS } from './signatureCards.js';

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
    passive: '<b>Breachcraft:</b> each controlled detonation grants 3 Block; the first each turn also deals 6 damage to every enemy.',
    deck: ['probe','brace','brace','resonanttap','reinforcedcoat','shortfuse','shortfuse','controlled','seedcharge','blastsuit'],
    rewardPool: ['shortfuse','controlled','blastsuit','fusecutter','chaincharge','powderkeg','munitions','seedcharge','shockwave','killzone'],
  },
  surveyor: {
    name: 'THE SURVEYOR', hp: 66, picks: 5, sig: 'scancard', trinket: 'dowsingcharm',
    role: '66 HP · information engine · "a mine is a fact"',
    blurb: 'Fragile, precise, scaling. Gain Insight for every safe reveal and spend it for damage and draw. The class most likely to Full Clear.',
    passive: '<b>Field Method:</b> every fourth newly scanned tile grants 1⚡ and 1 Insight.',
    deck: ['probe','brace','brace','resonanttap','reinforcedcoat','scancard','scancard','surveystakes','triangulate','deduction'],
    rewardPool: ['scancard','triangulate','deduction','surveystakes','chordcard','sixthsense','fieldnotes','pinpoint','knownquantity','eureka'],
  },
  terraformer: {
    name: 'THE TERRAFORMER', hp: 68, picks: 4, sig: 'entombcard', trinket: 'keystone',
    role: '68 HP · board editor · "a mine is terrain"',
    blurb: 'The grid is clay: seal and swap tiles, then build up to 3 persistent Constructs that trigger before enemies and absorb Board Attacks.',
    passive: '<b>Master Builder:</b> immediately gain 6 Block when you build your first Construct each turn. Construct limit: 3.',
    deck: ['probe','brace','brace','resonanttap','reinforcedcoat','entombcard','entombcard','sentry','surveyrelay','bulwark'],
    rewardPool: ['entombcard','sentry','propshaft','scaffold','landslide','leylines','bulwark','surveyrelay','stonechoir','citybelow','bedrockshelter'],
  },
  lamplighter: {
    name: 'THE LAMPLIGHTER', hp: 68, picks: 4, sig: 'firstspark', trinket: 'emberjar',
    role: '68 HP · cascades & energy · "bring your own dawn"',
    blurb: 'Large cascades fill Light. Preserve it between turns or spend it immediately on flares, safe reveals, and explosive Energy turns.',
    passive: '<b>Kindle:</b> cascades generate Light and 4 Block per Light; the first cascade of 4+ tiles each turn also grants 1⚡.',
    deck: ['probe','brace','brace','resonanttap','reinforcedcoat','firstspark','firstspark','wicktrim','glassdawn','flare'],
    rewardPool: ['firstspark','wicktrim','glassdawn','kindlepower','flare','beacon','daybreak','starchamber','whiteflame','lastlight'],
  },
  gambler: {
    name: 'THE GAMBLER', hp: 70, picks: 4, sig: 'openwager', trinket: 'loadedcoin',
    role: '70 HP · flags & wagers · "the board always tells"',
    blurb: 'Every Wager flips a true coin. Correct manual flags earn Loaded coins, and the right cards let him cheat when the stakes matter.',
    passive: '<b>Lucky Read:</b> every correct manual flag grants 1 Loaded; the first each turn also draws 1 card.',
    deck: ['probe','brace','brace','resonanttap','reinforcedcoat','openwager','openwager','houseedge','tell','stackeddeck'],
    rewardPool: ['openwager','houseedge','bonetoken','tell','doubledown','stackeddeck','snakeeyes','cashout','allin','finalbet'],
  },
  chirurgeon: {
    name: 'THE CHIRURGEON', hp: 76, picks: 3, sig: 'cleancut', trinket: 'fieldkit',
    role: '76 HP · pain conversion · "nothing vital was hit"',
    blurb: 'Spends Health as Blood for outsized effects, tracks it as Untreated Blood, then closes those wounds through safe digging, treatment, and lifesteal.',
    passive: '<b>Triage:</b> the first time you lose HP each turn, gain 5 Block. After spending Blood, the first safe reveal that turn treats 1 Untreated Blood.',
    deck: ['probe','brace','resonanttap','reinforcedcoat','cleancut','cleancut','fielddressing','triageline','redthread','cauterize'],
    rewardPool: ['cleancut','fielddressing','triageline','redthread','splint','bittertonic','spareblood','cauterize','anatomylesson','operatingtheatre','transfusion','emergencysurgery'],
  },
  archivist: {
    name: 'THE ARCHIVIST', hp: 62, picks: 5, sig: 'footnote', trinket: 'indexcard',
    role: '62 HP · draw & exhaust · "everything is evidence"',
    blurb: 'Files cards into a combat Archive, builds Citations, then Recalls the exact tools needed to cycle the same knowledge again.',
    passive: '<b>Cross-Reference:</b> the first card Filed or Exhausted each turn draws 1.',
    deck: ['probe','brace','redaction','resonanttap','reinforcedcoat','footnote','footnote','indexmark','errata','recallnotice'],
    rewardPool: ['footnote','indexmark','errata','redaction','citation','palimpsest','recallnotice','closedstacks','finaledition','everythingrecorded'],
  },
  warden: {
    name: 'THE WARDEN', hp: 78, picks: 3, sig: 'braceline', trinket: 'wardplate',
    role: '78 HP · block retention · "stone remembers pressure"',
    blurb: 'Retains Block, earns Resolve whenever armor absorbs an attack, then answers with Ripostes powered by the wall he built.',
    passive: '<b>Hold Fast:</b> retain 10% of your Block between turns. Every 6 damage absorbed generates 1 Resolve.',
    deck: ['probe','brace','resonanttap','reinforcedcoat','braceline','stoneoath','interlock','watchpost','watchpost','counterfort'],
    rewardPool: ['braceline','stoneoath','interlock','watchpost','holdthedoor','counterfort','unbroken','citadel','lastbastion','wallbelow'],
  },
  hexwright: {
    name: 'THE HEXWRIGHT', hp: 64, picks: 5, sig: 'chalkthree', trinket: 'hexkey',
    role: '64 HP · number magic · "three is a weapon"',
    blurb: 'Inscribes truthful clue numbers as mutable Runes, then weaponizes their values, parity, sums, and patterns.',
    passive: '<b>Hot Number:</b> revealing a 3+ tile deals 2 damage to ALL enemies.',
    deck: ['probe','brace','brace','resonanttap','reinforcedcoat','chalkthree','chalkthree','numberbite','falsezero','oddproof'],
    rewardPool: ['chalkthree','oddproof','numberbite','falsezero','carryone','primemark','countagain','perfectsum','proofofharm','finalanswer'],
  },
  revenant: {
    name: 'THE REVENANT', hp: 55, picks: 4, sig: 'gravestep', trinket: 'gravebell',
    role: '55 HP · death defiance · "already buried once"',
    blurb: 'Files exhausted attacks into a Grave where they can Rise once upgraded, while Death’s Door makes every return more dangerous.',
    passive: '<b>Not Yet:</b> survive the first lethal hit each combat at 1 HP.',
    deck: ['probe','brace','brace','resonanttap','reinforcedcoat','gravestep','gravestep','coldbreath','deadweight','wakebell'],
    rewardPool: ['gravestep','coldbreath','secondburial','deadweight','cryptdebt','wakebell','ghostflag','notomorrow','afterlife','refusethedark'],
  },
};

/* ---------------- keyword spans ---------------- */
const kwR = s => `<span class="kw reveal">${s}</span>`;
const kwD = s => `<span class="kw detonate">${s}</span>`;
const kwS = s => `<span class="kw scan">${s}</span>`;
const kwG = s => `<span class="kw gridk">${s}</span>`;
const hasConstructRoom = () => board().cells.filter(cell => cell.construct).length < 3;

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
    play: u => { const n = spendInsight(); hitEnemy(curTarget(), atk((u ? 4 : 3) * n)); },
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
    text: u => `${kwG('Entomb')} the chosen hidden tile — it can no longer detonate and counts as resolved for Full Clear. If it was mined, gain ${u ? 7 : 5} ${kwG('Plating')}; if safe, ${kwS('Scan')} ${2 + u} random hidden neighbors.${u ? ' Gain 3 Block.' : ''}`,
    play: (u, tg) => {
      const i = tg[0], wasMine = board().cells[i].mine;
      entombTile(i);
      if (wasMine) gainPlating(u ? 7 : 5);
      else shuffle(neighborsOf(i, board().size).filter(j => isHiddenUsable(j))).slice(0, 2 + u).forEach(scanTile);
      if (u) gainBlock(3);
    },
  },
  sentry: {
    name: 'Sentry', type: 'Skill', rarity: 'common', cls: 'terraformer', cost: [1, 1], hits: 'random',
    targets: ['open'],
    can: hasConstructRoom, canMsg: 'Construct limit reached (3).',
    text: u => `Build a Sentry Construct on an empty safe revealed tile. Each turn it deals ${u ? 7 : 5} damage to a random enemy. Builds Heat.`,
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
    can: hasConstructRoom, canMsg: 'Construct limit reached (3).',
    text: u => `Build a Bulwark Construct on an empty safe revealed tile. Each turn it grants ${u ? 2 : 1} ${kwG('Plating')} and ${u ? 4 : 3} Block — no Heat.`,
    play: (u, tg) => addConstruct(tg[0], 'bulwark', { plating: u ? 2 : 1, block: u ? 4 : 3 }),
  },
  landslide: {
    name: 'Landslide', type: 'Attack', rarity: 'rare', cls: 'terraformer', cost: [3, 3], hits: 'all',
    targets: [],
    can: () => outerRingIndices(board()).some(i => isHiddenUsable(i)),
    canMsg: 'The outer ring has no hidden tiles left.',
    text: u => `Reveal every hidden tile in the outer ring, safely removing its mines. Deal ${u ? 5 : 4} damage to all enemies for each tile that was hidden when played.`,
    play: u => {
      const b = board();
      const ring = outerRingIndices(b).filter(i => !b.cells[i].revealed && !b.cells[i].entombed);
      if (!ring.length) {
        log('🌋 Landslide finds no hidden outer-ring tiles.');
        toast('The outer ring is already clear.', true);
        return;
      }
      const mines = ring.filter(i => b.cells[i].mine).length;
      const damage = (u ? 5 : 4) * ring.length;
      /* Remove every perimeter mine before revealing. That lets cascades travel
         through the whole effect without causing later ring tiles to be
         omitted from the damage promised by the card. */
      for (const i of ring) {
        if (b.cells[i].mine) b.cells[i].mine = false;
        b.cells[i].flag = 0;
      }
      log(`🌋 Landslide clears ${ring.length} outer-ring tile${ring.length === 1 ? '' : 's'}, crushes ${mines} mine${mines === 1 ? '' : 's'}, and deals ${damage} to all enemies.`);
      toast(`Landslide: ${ring.length} tiles · ${damage} damage`);
      for (const i of ring) {
        if (!cbt() || board() !== b) break; // combat ended or Full Clear re-sealed the board
        if (!b.cells[i].revealed && !b.cells[i].entombed) revealTile(i, 'card-safe');
      }
      if (cbt()) hitAll(atk(damage));
    },
  },
  surveyrelay: {
    name: 'Survey Relay', type: 'Skill', rarity: 'common', cls: 'terraformer', cost: [1, 1],
    targets: ['open'],
    can: hasConstructRoom, canMsg: 'Construct limit reached (3).',
    text: u => `Build a Survey Relay Construct on an empty safe revealed tile. Each turn it draws 1 Energy and ${kwS('Scan')}s a hidden tile in radius 2${u ? ', then grants 4 Block' : ''}. Builds Heat.`,
    play: (u, tg) => addConstruct(tg[0], 'relay', { block: u ? 4 : 0 }),
  },
  stonechoir: {
    name: 'Stone Choir', type: 'Power', rarity: 'uncommon', cls: 'terraformer', cost: [2, 1],
    targets: [],
    text: () => `For this combat, each Sentry and Survey Relay triggers twice after End Turn. Bulwarks still trigger once.`,
    play: () => { cbt().powers.stonechoir = true; },
  },
  citybelow: {
    name: 'The City Below', type: 'Attack', rarity: 'rare', cls: 'terraformer', cost: [2, 2], hits: 'all',
    targets: [],
    text: u => `Count your active Constructs. For each one, deal ${u ? 13 : 10} damage to all enemies and gain ${u ? 2 : 1} Plating.`,
    can: () => board().cells.some(c => c.construct),
    canMsg: 'Build a construct first.',
    play: u => {
      const n = board().cells.filter(c => c.construct).length;
      hitAll(atk(n * (u ? 13 : 10)));
      if (cbt()) gainPlating(n * (u ? 2 : 1));
    },
  },

  /* ----- statuses & curses ----- */
  rubble: {
    name: 'Rubble', type: 'Status', rarity: 'special', cls: null, cost: null, unplayable: true,
    targets: [], text: () => 'Unplayable. While in hand, your attacks deal 1 less damage.', play: () => {},
  },
  wound: {
    name: 'Wound', type: 'Status', rarity: 'special', cls: null, cost: null, unplayable: true,
    targets: [], text: () => 'Unplayable. Clogs your hand until combat ends.', play: () => {},
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

/* Signature definitions replace generic class clones. Shared fundamentals
   remain neutral instead of wearing ten different class skins. */
Object.assign(CARDS, NEUTRAL_FOUNDATION_CARDS, SIGNATURE_CARDS);

export const NEUTRAL_REWARD_POOL = [
  'resonanttap', 'stonechorus', 'steadyhand', 'lanternloan', 'hardlesson',
  'emergencyexit', 'bandage', 'faultline', 'signaljam', 'sunderingchalk', 'gravebind',
];

const ACCESSIBLE_CARD_KEYS = new Set([
  'probe', 'brace', 'reinforcedcoat', ...NEUTRAL_REWARD_POOL,
  ...Object.values(CLASSES).flatMap(cls => [...cls.deck, ...cls.rewardPool]),
]);
for (const [key, def] of Object.entries(CARDS)) {
  if (def.cls != null && !ACCESSIBLE_CARD_KEYS.has(key)) delete CARDS[key];
}

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
  fieldkit:      { name: 'Field Kit', emoji: '🩹', tier: 'starter', desc: '+4 max HP.' },
  indexcard:     { name: 'Index Card', emoji: '🗂️', tier: 'starter', desc: 'Draw 1 extra card on the first turn of combat.' },
  wardplate:     { name: 'Ward Plate', emoji: '🛡️', tier: 'starter', desc: 'Begin combat with 1 Plating.' },
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
  daisychain:    { name: 'Daisy Chain', emoji: '⛓️', tier: 'uncommon', cls: 'sapper',
    desc: 'Whenever you add a Blast Chain link, deal 2 damage to a random enemy. Retain up to 2 unused links between turns.' },
  bottomlessledger: { name: 'Bottomless Ledger', emoji: '📒', tier: 'uncommon', cls: 'surveyor',
    desc: 'Start each combat with 3 Insight. Whenever a card spends all your Insight, retain 1.' },
  coolantcell:   { name: 'Coolant Cell', emoji: '🧊', tier: 'uncommon', cls: 'terraformer',
    desc: 'Sentries and Relays generate 1 less Heat during their end-of-turn Heat step, to a minimum of 0.' },
  everburningwick: { name: 'Everburning Wick', emoji: '🕯️', tier: 'rare', cls: 'lamplighter',
    desc: 'Your Light no longer fades at the start of a turn.' },
  twoheadedcoin: { name: 'Two-Headed Coin', emoji: '🪙', tier: 'rare', cls: 'gambler',
    desc: 'The first Wager each turn is automatically Heads. Your Loaded cap is 4.' },
  leechkit:      { name: 'Leech Kit', emoji: '🩸', tier: 'uncommon', cls: 'chirurgeon',
    desc: 'Whenever you pay Blood, gain Block equal to the Blood paid.' },
  masterindex:   { name: 'Master Index', emoji: '📇', tier: 'rare', cls: 'archivist',
    desc: 'Cards you Recall return one level upgraded for that combat.' },
  spikedaegis:   { name: 'Spiked Aegis', emoji: '🛡️', tier: 'uncommon', cls: 'warden',
    desc: 'When a positive-damage enemy attack is fully absorbed by Block or Plating, deal 4 damage back.' },
  cinderbrand:   { name: 'Cinderbrand', emoji: '🔥', tier: 'uncommon', cls: 'hexwright',
    desc: 'Hot Number deals 4 damage to all enemies instead of 2. Inscribing a Rune deals 1 damage to a random enemy.' },
  secondshroud:  { name: 'Second Shroud', emoji: '💀', tier: 'rare', cls: 'revenant',
    desc: 'Your Death’s Door threshold rises from 25% to 40% maximum Health.' },
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

export const SIGNATURE_RELICS = Object.freeze({
  sapper: 'daisychain',
  surveyor: 'bottomlessledger',
  terraformer: 'coolantcell',
  lamplighter: 'everburningwick',
  gambler: 'twoheadedcoin',
  chirurgeon: 'leechkit',
  archivist: 'masterindex',
  warden: 'spikedaegis',
  hexwright: 'cinderbrand',
  revenant: 'secondshroud',
});

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

/* Consumables use the normal card presentation and live in the combat hand.
   The engine owns their special play/retention rules because their effects must
   also remove the matching copy from the run inventory. */
export const consumableCardKey = key => `consumable_${key}`;
for (const [key, gadget] of Object.entries(GADGETS)) {
  CARDS[consumableCardKey(key)] = {
    name: gadget.name, type: 'Item', rarity: 'special', cls: null, cost: [0, 0],
    targets: [], consumableKey: key,
    text: () => `Consumable. ${gadget.desc} Stays in your hand between turns until used.`,
    play: () => {},
  };
}

/* ---------------- enemies ----------------
   sc(e,n): scale attack numbers when an enemy appears below its home stratum. */
const sc = (e, n) => n + 3 * e.scale;
const halfAttack = (e, n) => Math.ceil(sc(e, n) / 2);
const finishAbilityWithAttack = (e, intent) => {
  if (intent.attack > 0 && cbt() && !cbt().over && e.hp > 0) enemyAttack(e, intent.attack);
};

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
    desc: 'Alternates between an 8-damage attack and planting 2 new mines while making a half-strength attack, favoring the column shown in its intent.',
    next: e => {
      if (e.step % 2 === 0) return { kind: 'attack', cls: 'atk', n: sc(e, 8), label: `Attack ${sc(e, 8)}` };
      const col = randInt(board().size);
      const attack = halfAttack(e, 8);
      return { kind: 'lay', cls: 'board', n: 2, col, attack, label: `Lay 2 mines · Attack ${attack} (col ${col + 1})` };
    },
    act: (e, it) => {
      if (it.kind === 'attack') enemyAttack(e, it.n);
      else {
        boardAttack(`${e.def.name} lays mines`, () => layMines(it.n, it.col));
        finishAbilityWithAttack(e, it);
      }
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
    desc: 'Alternates between re-hiding 3 revealed tiles with Fog plus a half-strength attack, and attacking for 4 damage. Fragile, but disruptive if left alive.',
    next: e => e.step % 2 === 0
      ? { kind: 'fog', cls: 'board', n: 3, attack: halfAttack(e, 4), label: `Fog 3 tiles · Attack ${halfAttack(e, 4)}` }
      : { kind: 'attack', cls: 'atk', n: sc(e, 4), label: `Attack ${sc(e, 4)}` },
    act: (e, it) => {
      if (it.kind === 'attack') enemyAttack(e, it.n);
      else {
        boardAttack(`${e.def.name} exhales fog`, () => fogTiles(it.n));
        finishAbilityWithAttack(e, it);
      }
    },
  },
  shade: {
    name: 'Marsh Shade', emoji: '🌫️', hp: 30, home: 1,
    desc: 'Alternates between a 9-damage attack and Fog that re-hides 2 revealed tiles while making a half-strength attack.',
    next: e => e.step % 2 === 0
      ? { kind: 'attack', cls: 'atk', n: sc(e, 9), label: `Attack ${sc(e, 9)}` }
      : { kind: 'fog', cls: 'board', n: 2, attack: halfAttack(e, 9), label: `Fog 2 tiles · Attack ${halfAttack(e, 9)}` },
    act: (e, it) => {
      if (it.kind === 'attack') enemyAttack(e, it.n);
      else {
        boardAttack(`${e.def.name} seeps mist`, () => fogTiles(it.n));
        finishAbilityWithAttack(e, it);
      }
    },
  },
  tunneler: {
    name: 'Tunneler Grub', emoji: '🐛', hp: 34, home: 1,
    desc: 'Alternates between an 8-damage attack and excavating 3 mixed edge tiles while making a half-strength attack.',
    next: e => e.step % 2 === 0
      ? { kind: 'attack', cls: 'atk', n: sc(e, 8), label: `Attack ${sc(e, 8)}` }
      : { kind: 'excavate', cls: 'board', n: 3, attack: halfAttack(e, 8), label: `Excavate 3 (mined) tiles · Attack ${halfAttack(e, 8)}` },
    act: (e, it) => {
      if (it.kind === 'attack') enemyAttack(e, it.n);
      else boardAttack(`${e.def.name} chews open new tunnels`, () => {
        const added = annexTiles(it.n, 'mixed');
        if (added.length) toast(`${e.def.name} excavates ${added.length} new tiles!`, true);
      });
      if (it.kind !== 'attack') finishAbilityWithAttack(e, it);
    },
  },
  clockwork: {
    name: 'Clockwork Sapper', emoji: '🤖', hp: 45, home: 2,
    desc: 'Cycles through a 12-damage attack and two abilities: excavating mixed edge tiles or planting mines, each paired with a half-strength attack.',
    next: e => {
      const s = e.step % 3;
      if (s === 0) return { kind: 'excavate', cls: 'board', n: 2, attack: halfAttack(e, 12), label: `Excavate 2 (mined) tiles · Attack ${halfAttack(e, 12)}` };
      if (s === 1) return { kind: 'attack', cls: 'atk', n: sc(e, 12), label: `Attack ${sc(e, 12)}` };
      const col = randInt(board().size);
      const attack = halfAttack(e, 12);
      return { kind: 'lay', cls: 'board', n: 2, col, attack, label: `Lay 2 mines · Attack ${attack} (col ${col + 1})` };
    },
    act: (e, it) => {
      if (it.kind === 'attack') enemyAttack(e, it.n);
      else if (it.kind === 'excavate') boardAttack(`${e.def.name} drills open new ground`, () => {
        const added = annexTiles(it.n, 'mixed');
        if (added.length) toast(`${e.def.name} excavates ${added.length} new tiles!`, true);
      });
      else boardAttack(`${e.def.name} plants charges`, () => layMines(it.n, it.col));
      if (it.kind !== 'attack') finishAbilityWithAttack(e, it);
    },
  },
  gearhusk: {
    name: 'Gear Husk', emoji: '⚙️', hp: 55, home: 2,
    desc: 'Alternates between a heavy 14-damage attack and gaining 12 Block while making a half-strength attack.',
    next: e => e.step % 2 === 0
      ? { kind: 'attack', cls: 'atk', n: sc(e, 14), label: `Attack ${sc(e, 14)}` }
      : { kind: 'defend', cls: 'defend', n: 12, attack: halfAttack(e, 14), label: `Block 12 · Attack ${halfAttack(e, 14)}` },
    act: (e, it) => {
      if (it.kind === 'attack') enemyAttack(e, it.n);
      else { e.block += it.n; finishAbilityWithAttack(e, it); }
    },
  },

  /* ----- elites ----- */
  ossuary: {
    name: 'Ossuary Warden', emoji: '💀', hp: 62, home: 0, elite: true,
    desc: 'Cycles through a 10-damage attack, gaining Block while attacking for 6, and planting 2 mines while making a half-strength attack.',
    next: e => {
      const s = e.step % 3;
      if (s === 0) return { kind: 'attack', cls: 'atk', n: sc(e, 10), label: `Attack ${sc(e, 10)}` };
      if (s === 1) return { kind: 'fortify', cls: 'defend', n: sc(e, 6), label: `Attack ${sc(e, 6)} · Block ½ hidden` };
      const col = randInt(board().size);
      const attack = halfAttack(e, 10);
      return { kind: 'lay', cls: 'board', n: 2, col, attack, label: `Lay 2 mines · Attack ${attack} (col ${col + 1})` };
    },
    act: (e, it) => {
      if (it.kind === 'attack') enemyAttack(e, it.n);
      else if (it.kind === 'fortify') { e.block += Math.ceil(hiddenIdx().length / 2); enemyAttack(e, it.n); }
      else {
        boardAttack(`${e.def.name} lays mines`, () => layMines(it.n, it.col));
        finishAbilityWithAttack(e, it);
      }
    },
  },
  miscounter: {
    name: 'The Miscounter', emoji: '🎭', hp: 72, home: 1, elite: true,
    desc: 'Makes one revealed number lie by ±1 until defeated. Fog and mine-scrambling abilities each include a half-strength attack.',
    setup: () => setLie(),
    onDeath: () => { clearLie(); toast('The numbers correct themselves.'); },
    next: e => {
      const s = e.step % 3;
      if (s === 0) return { kind: 'attack', cls: 'atk', n: sc(e, 12), label: `Attack ${sc(e, 12)}` };
      if (s === 1) return { kind: 'fog', cls: 'board', n: 3, attack: halfAttack(e, 12), label: `Fog 3 tiles · Attack ${halfAttack(e, 12)}` };
      return { kind: 'scramble', cls: 'board', n: 3, attack: halfAttack(e, 12), label: `Scramble 3 mines · Attack ${halfAttack(e, 12)}` };
    },
    act: (e, it) => {
      if (it.kind === 'attack') enemyAttack(e, it.n);
      else if (it.kind === 'fog') boardAttack('The Miscounter fogs the board', () => fogTiles(it.n));
      else boardAttack('The Miscounter scrambles mines', () => scrambleMines(it.n));
      if (it.kind !== 'attack') finishAbilityWithAttack(e, it);
      if (cbt() && !cbt().lie) setLie();
    },
  },
  detonata: {
    name: 'Detonata', emoji: '🧨', hp: 88, home: 2, elite: true,
    desc: 'Attacks for 9 damage and primes a hidden tile each turn. Before its next action, an unresolved, unflagged primed mine detonates against you.',
    next: e => ({ kind: 'prime', cls: 'board', n: sc(e, 9), label: `Attack ${sc(e, 9)} · Prime a tile` }),
    act: (e, it) => {
      resolvePrimed();
      enemyAttack(e, it.n);
      if (cbt()) primeTile();
    },
    onDeath: () => { clearPrimed(); },
  },

  /* ----- bosses ----- */
  collapser: {
    name: 'The Collapser', emoji: '🕳️', hp: 95, home: 0, boss: true,
    desc: 'Attacks, devours the board’s outer ring, and periodically uses Resonance to test your Delver’s signature mechanic. Unflagged mines in the consumed ring detonate for full damage; flagged mines are safely swallowed.',
    next: e => {
      const s = e.step % 4;
      if (s === 0 || s === 2) return { kind: 'attack', cls: 'atk', n: 10, label: 'Attack 10' };
      if (s === 1) return { kind: 'devour', cls: 'board', attack: halfAttack(e, 10), label: `DEVOUR the outer ring · Attack ${halfAttack(e, 10)}` };
      return bossResonanceIntent(e);
    },
    act: (e, it) => {
      if (it.kind === 'attack') enemyAttack(e, it.n);
      else if (it.kind === 'resonance') resolveBossResonance(e, it);
      else {
        devourRing();
        finishAbilityWithAttack(e, it);
      }
    },
  },
  fogfather: {
    name: 'The Fogfather', emoji: '🌁', hp: 135, home: 1, boss: true,
    desc: 'Cycles through re-hiding tiles, moving unverified mines, attacking, and Resonance. Its Fog and Scramble abilities include a half-strength attack.',
    next: e => {
      const s = e.step % 4;
      if (s === 0) return { kind: 'fog', cls: 'board', n: 5, attack: halfAttack(e, 18), label: `Fog 5 tiles · Attack ${halfAttack(e, 18)}` };
      if (s === 1) return { kind: 'scramble', cls: 'board', n: 4, attack: halfAttack(e, 18), label: `Scramble 4 mines · Attack ${halfAttack(e, 18)}` };
      if (s === 2) return { kind: 'attack', cls: 'atk', n: 18, label: 'Attack 18' };
      return bossResonanceIntent(e);
    },
    act: (e, it) => {
      if (it.kind === 'attack') enemyAttack(e, it.n);
      else if (it.kind === 'fog') boardAttack('The Fogfather breathes fog', () => fogTiles(it.n));
      else if (it.kind === 'scramble') boardAttack('The Fogfather scrambles mines', () => scrambleMines(it.n));
      else resolveBossResonance(e, it);
      if (it.kind === 'fog' || it.kind === 'scramble') finishAbilityWithAttack(e, it);
    },
  },
  nn99: {
    name: 'NN-99', emoji: '🛰️', hp: 220, home: 2, boss: true, gated: true,
    desc: 'Its signal shield weakens damage until you reveal 3 safe tiles or Chord. Mine deployment includes a half-strength attack; it also shifts phase boards and uses Resonance.',
    gateNote: 'Signal shield: 50% damage initially; reveal 3 safe tiles or Chord for full damage',
    setup: e => { e.data.phase = 1; },
    next: e => {
      const s = e.step % 4;
      if (s === 0) return { kind: 'attack', cls: 'atk', n: 12, label: 'Attack 12' };
      if (s === 1) {
        const col = randInt(board().size), attack = halfAttack(e, 12);
        return { kind: 'lay', cls: 'board', n: 3, col, attack, label: `Lay 3 mines · Attack ${attack} (col ${col + 1})` };
      }
      if (s === 2) return { kind: 'attack', cls: 'atk', n: 16, label: 'Attack 16' };
      return bossResonanceIntent(e);
    },
    act: (e, it) => {
      if (it.kind === 'attack') enemyAttack(e, it.n);
      else if (it.kind === 'lay') {
        boardAttack('NN-99 deploys mines', () => layMines(it.n, it.col));
        finishAbilityWithAttack(e, it);
      }
      else resolveBossResonance(e, it);
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
