/* CRYPTSWEEPER — game data: strata, classes, cards, enemies, trinkets, gadgets.
   Effects call engine verbs at play-time (the engine↔data import cycle is safe:
   nothing here invokes engine code during module evaluation). */
import {
  cbt, board, shuffle, randPick, randInt,
  revealTile, hitEnemy, hitRandom, hitAll, curTarget, atk,
  gainBlock, gainPlating, gainEnergy, gainInsight, drawCards, loseHP,
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
  },
  surveyor: {
    name: 'THE SURVEYOR', hp: 66, sig: 'scancard', trinket: 'dowsingcharm',
    role: '66 HP · information engine · "a mine is a fact"',
    blurb: 'Fragile, precise, scaling. Gain Insight for every safe reveal and spend it for damage and draw. The class most likely to Full Clear.',
  },
  terraformer: {
    name: 'THE TERRAFORMER', hp: 72, sig: 'entombcard', trinket: 'keystone',
    role: '72 HP · board editor · "a mine is terrain"',
    blurb: 'The grid is clay: seal tiles, swap them, and build constructs that act every turn and soak enemy board attacks.',
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

/* ---------------- trinkets ---------------- */
export const TRINKETS = {
  blastgoggles:  { name: 'Blast Goggles', emoji: '🥽', tier: 'starter',
    desc: 'The first mine that detonates against you each combat deals half damage.' },
  dowsingcharm:  { name: 'Dowsing Charm', emoji: '📿', tier: 'starter',
    desc: 'At the start of combat, Scan 2 random tiles.' },
  keystone:      { name: 'Keystone', emoji: '🗝️', tier: 'starter',
    desc: 'Your first Entomb each combat is free.' },
  luckycompass:  { name: 'Lucky Compass', emoji: '🧭', tier: 'common',
    desc: 'The first mine you detonate against yourself each combat deals 0 damage.' },
  quill:         { name: "Cartographer's Quill", emoji: '🪶', tier: 'common',
    desc: 'Combats begin with a second random cascade opened.' },
  detector:      { name: 'Rusted Detector', emoji: '📻', tier: 'uncommon',
    desc: 'At combat start, one random mine is verified-flagged.' },
  tally:         { name: 'Tally Counter', emoji: '🧮', tier: 'uncommon',
    desc: 'Every 25 safe tiles revealed, gain 1 max HP.' },
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
