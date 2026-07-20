/* CRYPTSWEEPER — game data: strata, classes, cards, enemies, trinkets, gadgets.
   Effects call engine verbs at play-time (the engine↔data import cycle is safe:
   nothing here invokes engine code during module evaluation). */
import {
  cbt, board, shuffle, randPick, randInt,
  revealTile, hitEnemy, hitRandom, hitAll, curTarget, atk,
  gainBlock, gainPlating, gainEnergy, gainInsight, gainPicks, gainMaxPicks,
  loseMaxPicks, spendPicks, drawCards, loseHP,
  detonateForCards, defuseTile, scanTile, entombTile, swapCells, addConstruct,
  chordAt, verifyFlag, flaggedIdx, hiddenIdx, isHiddenUsable, area3x3,
  highestRevealedNumber, toast, log, fleeCombat,
  enemyAttack, boardAttack, layMines, fogTiles, scrambleMines,
  setLie, clearLie, primeTile, resolvePrimed, clearPrimed, devourRing,
  annexTiles, addMineAt,
} from './engine.js';

export const STRATA = [
  { name: 'Stratum 1 — The Topsoil Crypts', size: 8,  mines: 10, mineDmg: 8  },
  { name: 'Stratum 2 — The Fog Galleries',  size: 9,  mines: 14, mineDmg: 12 },
  { name: 'Stratum 3 — The Machine Seam',   size: 10, mines: 20, mineDmg: 16 },
];

export const CLASSES = {
  sapper: {
    name: 'THE SAPPER', hp: 80, sig: 'shortfuse', trinket: 'blastgoggles',
    role: '80 HP · demolitions · "a mine is ammunition"',
    blurb: 'She doesn\'t avoid mines — she spends them. Detonate hidden tiles on purpose, convert blasts into AoE damage, and pay HP for tempo.',
    passive: '<b>Breachcraft:</b> the first controlled detonation each turn deals 4 damage to every enemy.',
    deck: ['probe', 'probe', 'probe', 'brace', 'brace', 'brace', 'shortfuse', 'shortfuse', 'blastsuit', 'seedcharge'],
  },
  surveyor: {
    name: 'THE SURVEYOR', hp: 66, sig: 'scancard', trinket: 'dowsingcharm',
    role: '66 HP · information engine · "a mine is a fact"',
    blurb: 'Fragile, precise, scaling. Gain Insight for every safe reveal and spend it for damage and draw. The class most likely to Full Clear.',
    passive: '<b>Field Method:</b> every fourth newly scanned tile grants 1⚡ and 1 Insight.',
    deck: ['probe', 'probe', 'probe', 'brace', 'brace', 'scancard', 'scancard', 'scancard', 'triangulate', 'fieldnotes'],
  },
  terraformer: {
    name: 'THE TERRAFORMER', hp: 72, sig: 'entombcard', trinket: 'keystone',
    role: '72 HP · board editor · "a mine is terrain"',
    blurb: 'The grid is clay: seal tiles, swap them, and build constructs that act every turn and soak enemy board attacks.',
    passive: '<b>Master Builder:</b> whenever you build a construct, gain 2 Plating.',
    deck: ['probe', 'probe', 'probe', 'brace', 'brace', 'brace', 'entombcard', 'entombcard', 'sentry', 'faultline'],
  },
  lamplighter: {
    name: 'THE LAMPLIGHTER', hp: 68, sig: 'exp_lamplighter_0', trinket: 'emberjar',
    role: '68 HP · cascades & energy · "bring your own dawn"',
    blurb: 'Turns broad safe openings into explosive tempo, chaining bright cascades into extra energy and sweeping attacks.',
    passive: '<b>Kindle:</b> the first cascade of 4+ tiles each turn grants 1⚡.',
    deck: ['probe','probe','probe','brace','brace','brace','exp_lamplighter_0','exp_lamplighter_0','exp_lamplighter_1','exp_lamplighter_2'],
  },
  gambler: {
    name: 'THE GAMBLER', hp: 70, sig: 'exp_gambler_0', trinket: 'loadedcoin',
    role: '70 HP · flags & wagers · "the board always tells"',
    blurb: 'Makes deliberate wagers on hidden tiles, cashing correct flags into cards while turning bad reads into controlled losses.',
    passive: '<b>Lucky Read:</b> the first correct manual flag each turn draws 1 card.',
    deck: ['probe','probe','probe','brace','brace','brace','exp_gambler_0','exp_gambler_0','exp_gambler_1','exp_gambler_2'],
  },
  chirurgeon: {
    name: 'THE CHIRURGEON', hp: 76, sig: 'exp_chirurgeon_0', trinket: 'fieldkit',
    role: '76 HP · pain conversion · "nothing vital was hit"',
    blurb: 'Treats health as a tactical resource, converting the first wound each turn into protection and rebuilding after risky blasts.',
    passive: '<b>Triage:</b> the first time you lose HP each turn, gain 5 Block.',
    deck: ['probe','probe','probe','brace','brace','brace','exp_chirurgeon_0','exp_chirurgeon_0','exp_chirurgeon_1','exp_chirurgeon_2'],
  },
  archivist: {
    name: 'THE ARCHIVIST', hp: 62, sig: 'exp_archivist_0', trinket: 'indexcard',
    role: '62 HP · draw & exhaust · "everything is evidence"',
    blurb: 'Cycles aggressively through a fragile deck, finding exact tools and turning exhausted cards into fresh possibilities.',
    passive: '<b>Cross-Reference:</b> the first card Exhausted each turn draws 1.',
    deck: ['probe','probe','probe','brace','brace','brace','exp_archivist_0','exp_archivist_0','exp_archivist_1','exp_archivist_2'],
  },
  warden: {
    name: 'THE WARDEN', hp: 82, sig: 'exp_warden_0', trinket: 'wardplate',
    role: '82 HP · block retention · "stone remembers pressure"',
    blurb: 'Builds defenses that persist between turns, then converts accumulated Block and Plating into crushing board control.',
    passive: '<b>Hold Fast:</b> retain one quarter of your Block between turns.',
    deck: ['probe','probe','probe','brace','brace','brace','exp_warden_0','exp_warden_0','exp_warden_1','exp_warden_2'],
  },
  hexwright: {
    name: 'THE HEXWRIGHT', hp: 64, sig: 'exp_hexwright_0', trinket: 'hexkey',
    role: '64 HP · number magic · "three is a weapon"',
    blurb: 'Weaponizes high revealed numbers, stacking Insight and turning dangerous numbered tiles into precise area damage.',
    passive: '<b>Hot Number:</b> revealing a 3+ tile deals 2 damage to ALL enemies.',
    deck: ['probe','probe','probe','brace','brace','brace','exp_hexwright_0','exp_hexwright_0','exp_hexwright_1','exp_hexwright_2'],
  },
  revenant: {
    name: 'THE REVENANT', hp: 55, sig: 'exp_revenant_0', trinket: 'gravebell',
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
    text: u => `${kwR('Reveal')} a tile. If safe, deal ${u ? 7 : 4} to the targeted enemy.`,
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
    name: 'Short Fuse', type: 'Attack', rarity: 'starter', cls: 'sapper', cost: [1, 1], hits: 'random',
    targets: ['hidden'],
    text: u => `${kwD('Detonate')} a hidden tile from cover. Mine: deal ${u ? 14 : 10} to a random enemy. Safe: reveal it, deal ${u ? 6 : 4}.`,
    play: (u, tg) => {
      if (detonateForCards(tg[0])) hitRandom(atk(u ? 14 : 10));
      else { revealTile(tg[0], 'card-safe'); hitEnemy(curTarget(), atk(u ? 6 : 4)); }
    },
  },
  controlled: {
    name: 'Controlled Blast', type: 'Attack', rarity: 'common', cls: 'sapper', cost: [1, 1], hits: 'all',
    targets: ['hidden'],
    text: u => `${kwD('Detonate')} a hidden tile. Mine: deal ${u ? 16 : 12} to ALL enemies; take ${u ? 2 : 3}. Safe: deal ${u ? 8 : 5}.`,
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
    text: u => `${kwS('Defuse')} a hidden tile. Mine: remove it safely and deal ${u ? 12 : 8} to a random enemy. Safe: reveal it.`,
    play: (u, tg) => { if (defuseTile(tg[0])) hitRandom(atk(u ? 12 : 8)); },
  },
  chaincharge: {
    name: 'Chain Charge', type: 'Attack', rarity: 'uncommon', cls: 'sapper', cost: [2, 2], hits: 'random',
    targets: [],
    text: u => `${kwD('Detonate')} up to 3 flagged tiles. Each mine deals ${u ? 12 : 9} to a random enemy. Each misflag: take ${u ? 3 : 4}.`,
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
    text: u => `Whenever a mine detonates — any cause, any target — deal ${u ? 7 : 5} to ALL enemies.`,
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
    text: u => `Bury a fresh mine in a hidden tile — ammo for your ${kwD('Detonate')}s (numbers update). If it was already mined: verified-flag it instead.${u ? ' <span class="upg">Costs 0.</span>' : ''}`,
    play: (u, tg) => {
      if (addMineAt(tg[0])) { toast('A fresh charge is buried.'); log('☣ You bury a fresh charge.'); }
      else { verifyFlag(tg[0]); toast('Already mined — flagged it.'); }
    },
  },
  shockwave: {
    name: 'Shockwave', type: 'Attack', rarity: 'uncommon', cls: 'sapper', cost: [2, 2], hits: 'all',
    targets: [],
    text: u => `Deal ${u ? 10 : 8} + ${u ? 3 : 2} per mine detonated this combat to ALL enemies.`,
    play: u => hitAll(atk((u ? 10 : 8) + (u ? 3 : 2) * cbt().minesDetonated)),
  },
  bigred: {
    name: 'Big Red Button', type: 'Attack', rarity: 'rare', cls: 'sapper', cost: [3, 3], hits: 'random',
    targets: ['row'],
    text: u => `${kwD('Detonate')} every hidden tile in a chosen row. Mines hit random enemies for ${u ? 10 : 8} each; take ${u ? 2 : 3} per mine.`,
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
    text: u => `${kwS('Scan')} a tile. Mine: verified-flag it and deal ${u ? 12 : 9}. Safe: reveal it and gain ${u ? 7 : 5} Block.`,
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
    text: u => `The first controlled ${kwD('Detonate')} each turn grants 1⚡ and draws 1.${u ? ' <span class="upg">Costs 0.</span>' : ''}`,
    play: () => { cbt().powers.blastDividend = true; },
  },
  killzone: {
    name: 'Kill Zone', type: 'Attack', rarity: 'rare', cls: 'sapper', cost: [2, 2], hits: 'all',
    targets: [],
    text: u => `${kwD('Detonate')} up to ${u ? 4 : 3} scanned mines. Each deals ${u ? 11 : 8} to ALL enemies.`,
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
    text: u => `${kwS('Scan')} a hidden tile. Draw 1.${u ? ' Gain 1 Insight.' : ''}`,
    play: (u, tg) => { scanTile(tg[0]); drawCards(1); if (u) gainInsight(1); },
  },
  triangulate: {
    name: 'Triangulate', type: 'Attack', rarity: 'common', cls: 'surveyor', cost: [1, 1], hits: 'target',
    targets: [],
    text: u => `Deal damage equal to ${u ? 4 : 3}× the highest number currently revealed.`,
    play: u => hitEnemy(curTarget(), atk((u ? 4 : 3) * highestRevealedNumber())),
  },
  deduction: {
    name: 'Deduction', type: 'Attack', rarity: 'common', cls: 'surveyor', cost: [1, 1], hits: 'target',
    targets: [],
    text: u => `Spend all ${kwS('Insight')}: deal ${u ? 4 : 3} damage per point spent.`,
    can: () => cbt().insight > 0, canMsg: 'No Insight.',
    play: u => { const n = cbt().insight; cbt().insight = 0; hitEnemy(curTarget(), atk((u ? 4 : 3) * n)); },
  },
  surveystakes: {
    name: 'Survey Stakes', type: 'Skill', rarity: 'common', cls: 'surveyor', cost: [1, 1],
    targets: ['hidden', 'hidden', 'hidden'],
    optionalTargets: true,
    text: u => `${kwS('Scan')} up to ${u ? 4 : 3} hidden tiles.`,
    play: (u, tg) => { tg.forEach(i => scanTile(i)); if (u && tg.length) scanTile(randPick(hiddenIdx().filter(i => !board().cells[i].scan)) ?? tg[0]); },
  },
  chordcard: {
    name: 'Chord', type: 'Skill', rarity: 'uncommon', cls: 'surveyor', cost: [1, 0],
    targets: ['number'],
    text: u => `${kwR('Chord')} a revealed number with exactly that many flagged neighbors: reveal all its other neighbors. If nothing detonates, draw 2 and gain 1⚡.${u ? ' <span class="upg">Costs 0.</span>' : ''}`,
    play: (u, tg) => {
      const r = chordAt(tg[0]);
      if (!r.ok) { toast('Flag count must match the number', true); return; }
      if (r.detonations === 0) { drawCards(2); gainEnergy(1); }
    },
  },
  sixthsense: {
    name: 'Sixth Sense', type: 'Power', rarity: 'uncommon', cls: 'surveyor', cost: [2, 1],
    targets: [],
    text: () => `The first mine you would reveal each turn is verified-flagged instead.`,
    play: () => { cbt().powers.sixthsense = true; },
  },
  fieldnotes: {
    name: 'Field Notes', type: 'Skill', rarity: 'uncommon', cls: 'surveyor', cost: [1, 1],
    targets: [],
    text: u => `Draw ${u ? 3 : 2}. Gain 1 ${kwS('Insight')}.`,
    play: u => { drawCards(u ? 3 : 2); gainInsight(1); },
  },
  pinpoint: {
    name: 'Pinpoint', type: 'Attack', rarity: 'common', cls: 'surveyor', cost: [0, 0], hits: 'target',
    targets: [],
    text: u => `Deal damage equal to your ${kwS('Insight')}${u ? ' + 3' : ''}. (Doesn’t spend it.)`,
    play: u => hitEnemy(curTarget(), atk(cbt().insight + (u ? 3 : 0))),
  },
  wholepicture: {
    name: 'The Whole Picture', type: 'Attack', rarity: 'rare', cls: 'surveyor', cost: [2, 2], exhaust: true, hits: 'target',
    targets: [],
    text: u => `Deal damage equal to ${u ? '1.5×' : ''} the sum of all numbers revealed this turn. Exhaust.`,
    play: u => hitEnemy(curTarget(), atk(Math.floor(cbt().sumThisTurn * (u ? 1.5 : 1)))),
  },
  crosssection: {
    name: 'Cross Section', type: 'Skill', rarity: 'common', cls: 'surveyor', cost: [1, 1],
    targets: ['row'],
    text: u => `${kwS('Scan')} up to ${u ? 6 : 5} hidden tiles in a chosen row.`,
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
    text: u => `Deal ${u ? 6 : 5} per scanned mine + ${u ? 3 : 2} per scanned safe tile. Scans are not consumed.`,
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
    text: u => `Reveal every scanned-safe tile and verified-flag every scanned mine. Exhaust.${u ? ' <span class="upg">Costs 1.</span>' : ''}`,
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
    text: u => `${kwG('Entomb')} a hidden tile: it can never detonate and counts as revealed for Full Clear.${u ? ' <span class="upg">Gain 3 Block.</span>' : ''}`,
    play: (u, tg) => { entombTile(tg[0]); if (u) gainBlock(3); },
  },
  sentry: {
    name: 'Sentry', type: 'Skill', rarity: 'common', cls: 'terraformer', cost: [1, 1], hits: 'random',
    targets: ['open'],
    text: u => `Build a Sentry on a revealed tile: at end of turn, deal ${u ? 7 : 5} to a random enemy. Enemy board attacks hit constructs first.`,
    play: (u, tg) => addConstruct(tg[0], 'sentry', { dmg: u ? 7 : 5 }),
  },
  faultline: {
    name: 'Fault Line', type: 'Skill', rarity: 'common', cls: 'terraformer', cost: [1, 1],
    targets: ['hidden', 'hidden'],
    text: u => `Swap two hidden tiles (contents move with them). Gain ${u ? 6 : 4} Block.`,
    play: (u, tg) => { swapCells(tg[0], tg[1]); gainBlock(u ? 6 : 4); },
  },
  propshaft: {
    name: 'Prop Shaft', type: 'Skill', rarity: 'common', cls: 'terraformer', cost: [1, 1],
    targets: ['hidden'],
    text: u => `${kwS('Defuse')} a hidden tile. Mine: remove it safely and gain ${u ? 7 : 5} ${kwG('Plating')}. Safe: reveal it.`,
    play: (u, tg) => { if (defuseTile(tg[0])) gainPlating(u ? 7 : 5); },
  },
  scaffold: {
    name: 'Scaffold', type: 'Skill', rarity: 'common', cls: 'terraformer', cost: [1, 1],
    targets: [],
    text: u => `Annex ${u ? 4 : 3} safe tiles onto the board's edge, pre-${kwS('Scan')}ned. (More ground: safe digs, Insight, Full Clear takes longer.)`,
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
    text: u => `Whenever a cascade reveals ${u ? 3 : 4}+ tiles, gain 1⚡.`,
    play: u => { cbt().powers.leylines = (u ? 3 : 4); },
  },
  bulwark: {
    name: 'Bulwark', type: 'Skill', rarity: 'uncommon', cls: 'terraformer', cost: [2, 2],
    targets: ['open'],
    text: u => `Build a Bulwark: at end of turn, gain ${u ? 3 : 2} ${kwG('Plating')} and ${u ? 4 : 3} Block.`,
    play: (u, tg) => addConstruct(tg[0], 'bulwark', { plating: u ? 3 : 2, block: u ? 4 : 3 }),
  },
  landslide: {
    name: 'Landslide', type: 'Attack', rarity: 'rare', cls: 'terraformer', cost: [3, 3], hits: 'all',
    targets: [],
    text: u => `Reveal the entire outer ring; mines there are defused, not detonated. Deal ${u ? 5 : 4} per tile revealed this way to ALL enemies.`,
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
    text: u => `Build a Relay: at end of turn, ${kwS('Scan')} a random tile and gain ${u ? 4 : 2} Block. Enemy board attacks hit constructs first.`,
    play: (u, tg) => addConstruct(tg[0], 'relay', { block: u ? 4 : 2 }),
  },
  stonechoir: {
    name: 'Stone Choir', type: 'Power', rarity: 'uncommon', cls: 'terraformer', cost: [2, 1],
    targets: [],
    text: u => `Your constructs trigger twice at end of turn.${u ? ' <span class="upg">Costs 1.</span>' : ''}`,
    play: () => { cbt().powers.stonechoir = true; },
  },
  citybelow: {
    name: 'The City Below', type: 'Attack', rarity: 'rare', cls: 'terraformer', cost: [2, 2], hits: 'all',
    targets: [],
    text: u => `Deal ${u ? 13 : 10} per construct to ALL enemies. Gain ${u ? 3 : 2} Plating per construct.`,
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
    targets: [], text: () => 'Unplayable. When drawn, take 1 damage.', play: () => {},
  },
  claustrophobia: {
    name: 'Claustrophobia', type: 'Curse', rarity: 'special', cls: null, cost: null, unplayable: true,
    targets: [], text: () => 'Unplayable. While in your deck, boards spawn +2 mines.', play: () => {},
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
    case 0: return { ...base, type:'Attack', hits:'target', targets:[], text:u=>`Deal ${u?dmg+4:dmg}.`, play:u=>hitEnemy(curTarget(),atk(u?dmg+4:dmg)) };
    case 1: return { ...base, type:'Attack', hits:'target', targets:['hidden'], text:u=>`${kwR('Reveal')} a tile. If safe, deal ${u?dmg+5:dmg}.`, play:(u,t)=>{const r=revealTile(t[0],'card-safe');if(r.safe)hitEnemy(curTarget(),atk(u?dmg+5:dmg));} };
    case 2: return { ...base, type:'Skill', targets:['hidden'], text:u=>`${kwS('Scan')} a tile. Draw ${u?2:1}.${u?' Gain 1 pick.':''}`, play:(u,t)=>{scanTile(t[0]);drawCards(u?2:1);if(u)gainPicks(1);} };
    case 3: return { ...base, type:'Skill', targets:[], text:u=>`Gain ${u?guard+4:guard} Block.`, play:u=>gainBlock(u?guard+4:guard) };
    case 4: return { ...base, type:'Skill', targets:[], text:u=>`Gain ${u?Math.ceil(guard/2)+2:Math.ceil(guard/2)} ${kwG('Plating')}.`, play:u=>gainPlating(u?Math.ceil(guard/2)+2:Math.ceil(guard/2)) };
    case 5: return { ...base, type:'Attack', hits:'random', targets:['hidden'], text:u=>`${kwS('Defuse')} a tile. Mine: deal ${u?dmg+6:dmg+2} to a random enemy. Safe: reveal it.`, play:(u,t)=>{if(defuseTile(t[0]))hitRandom(atk(u?dmg+6:dmg+2));} };
    case 6: return { ...base, type:'Skill', targets:['hidden'], text:u=>`${kwG('Entomb')} a tile and gain ${u?guard+3:guard} Block.`, play:(u,t)=>{entombTile(t[0]);gainBlock(u?guard+3:guard);} };
    case 7: return { ...base, type:'Skill', targets:[], text:u=>`${kwS('Scan')} ${u?scans+2:scans} random hidden tiles. Gain 1 pick.`, play:u=>{shuffle(hiddenIdx()).slice(0,u?scans+2:scans).forEach(scanTile);gainPicks(1);} };
    case 8: return { ...base, type:'Attack', hits:'target', targets:[], text:u=>`Deal ${u?4:3} per flagged tile.`, play:u=>hitEnemy(curTarget(),atk(flaggedIdx().length*(u?4:3))) };
    case 9: return { ...base, type:'Attack', hits:'all', targets:['hidden'], text:u=>`${kwD('Detonate')} from cover. Mine: deal ${u?dmg+5:dmg} to ALL; safe: reveal it.`, play:(u,t)=>{if(detonateForCards(t[0]))hitAll(atk(u?dmg+5:dmg));else revealTile(t[0],'card-safe');} };
    case 10:return { ...base, type:'Attack', hits:'all', targets:[], text:u=>`Deal ${u?dmg+3:dmg-1} to ALL enemies.`, play:u=>hitAll(atk(u?dmg+3:dmg-1)) };
    case 11:return { ...base, type:'Skill', targets:[], text:u=>`Draw ${u?3:2}.${u?' Gain 1⚡.':''}`, play:u=>{drawCards(u?3:2);if(u)gainEnergy(1);} };
    case 12:return { ...base, type:'Skill', targets:[], text:u=>`Annex ${u?3:2} safe, pre-${kwS('Scan')}ned tiles.`, play:u=>annexTiles(u?3:2,false).forEach(i=>board().cells[i].scan='safe') };
    case 13:return { ...base, type:'Skill', targets:['hidden'], text:u=>`Bury a mine; if already mined, verified-flag it.${u?' Gain 5 Block.':''}`, play:(u,t)=>{if(!addMineAt(t[0]))verifyFlag(t[0]);if(u)gainBlock(5);} };
    case 14:return { ...base, type:'Skill', targets:['row'], text:u=>`${kwS('Scan')} up to ${u?6:4} tiles in a chosen row.`, play:(u,t)=>{const b=board();for(let c=0;c<b.size&&c<(u?6:4);c++){const x=t[0]*b.size+c;if(isHiddenUsable(x))scanTile(x);}} };
    case 15:return { ...base, type:'Attack', hits:'target', targets:['hidden','hidden'], optionalTargets:true, text:u=>`${kwR('Reveal')} up to 2 tiles. Deal ${u?5:3} per safe tile.`, play:(u,t)=>{let safe=0;t.forEach(i=>{if(revealTile(i,'card-safe').safe)safe++;});hitEnemy(curTarget(),atk(safe*(u?5:3)));} };
    case 16:return { ...base, type:'Attack', hits:'target', targets:[], text:u=>`Deal ${u?3:2} per tile revealed this turn.`, play:u=>hitEnemy(curTarget(),atk(cbt().revealedThisTurn*(u?3:2))) };
    case 17:return { ...base, type:'Attack', hits:'all', targets:[], text:u=>`Deal ${u?4:3} per scanned mine to ALL enemies.`, play:u=>hitAll(atk(hiddenIdx().filter(i=>board().cells[i].scan==='mine').length*(u?4:3))) };
    default:return { ...base, type:'Skill', targets:[], exhaust:true, text:u=>`${kwS('Scan')} ${u?7:5} tiles; deal that many damage to ALL.${u?' Gain +1 max pick this combat.':''} Exhaust.`, play:u=>{const picks=shuffle(hiddenIdx()).slice(0,u?7:5);picks.forEach(scanTile);hitAll(atk(picks.length));if(u)gainMaxPicks(1);} };
  }
}

for (const [cls, names] of Object.entries(EXPANSION_NAMES)) {
  names.forEach((name, i) => { CARDS[`exp_${cls}_${i}`] = expansionCard(cls, name, i); });
}

Object.assign(CARDS, {
  steadyhand: { name:'Steady Hand',type:'Skill',rarity:'common',cls:'neutral',cost:[1,0],targets:[],text:u=>`Gain ${u?7:4} Block and ${u?3:2} picks.${u?' Costs 0.':''}`,play:u=>{gainBlock(u?7:4);gainPicks(u?3:2);} },
  lanternloan: { name:'Lantern Loan',type:'Skill',rarity:'common',cls:'neutral',cost:[1,1],targets:[],text:u=>`${kwS('Scan')} ${u?3:2} random tiles. Gain 1 pick.${u?' Raise max picks by 1 this combat.':''}`,play:u=>{shuffle(hiddenIdx()).slice(0,u?3:2).forEach(scanTile);gainPicks(1);if(u)gainMaxPicks(1);} },
  hardlesson: { name:'Hard Lesson',type:'Attack',rarity:'uncommon',cls:'neutral',cost:[0,0],hits:'target',targets:[],can:()=>cbt().picks>0,canMsg:'No picks left to spend.',text:u=>`Spend up to 3 picks. Deal ${u?8:6} per pick spent.`,play:u=>hitEnemy(curTarget(),atk(spendPicks(3)*(u?8:6))) },
  emergencyexit: { name:'Emergency Exit',type:'Skill',rarity:'rare',cls:'neutral',cost:[2,1],targets:[],text:u=>`Lose 1 max pick this combat. Gain ${u?16:12} Plating and draw 2.`,play:u=>{loseMaxPicks(1);gainPlating(u?16:12);drawCards(2);} },
});

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
    desc: 'At the start of your turn, one provably-safe tile glows. You can no longer place flags.' },
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
    next: e => ({ kind: 'fortify', cls: 'atk', n: sc(e, 7), label: `Attack ${sc(e, 7)} · Block ½ hidden tiles` }),
    act: (e, it) => { e.block += Math.ceil(hiddenIdx().length / 2); enemyAttack(e, it.n); },
  },
  wisp: {
    name: 'Fog Wisp', emoji: '👻', hp: 1, home: 1,
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
    next: e => e.step % 2 === 0
      ? { kind: 'attack', cls: 'atk', n: sc(e, 14), label: `Attack ${sc(e, 14)}` }
      : { kind: 'defend', cls: 'defend', n: 12, label: 'Block 12' },
    act: (e, it) => { if (it.kind === 'attack') enemyAttack(e, it.n); else e.block += it.n; },
  },

  /* ----- elites ----- */
  ossuary: {
    name: 'Ossuary Warden', emoji: '💀', hp: 62, home: 0, elite: true,
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
    gateNote: 'Only takes damage on turns you revealed 5+ tiles or chorded',
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
];

/* NN-99 phase boards: [size, mines] once HP crosses 150 / 75 */
export const NN99_PHASES = [[10, 20], [12, 30], [13, 42]];
