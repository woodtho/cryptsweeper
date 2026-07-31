/* Hand-authored Delver cards.
   Every accessible card has three mechanical tiers: base, +, and ++. */
import {
  cbt, board, shuffle, randInt, revealTile, hitEnemy, hitRandom, hitAll, curTarget, atk,
  gainBlock, gainPlating, gainEnergy, gainInsight, spendInsight, gainPicks, gainMaxPicks, drawCards, loseHP, healHP,
  applyEnemyEffect, detonateForCards, defuseTile, scanTile, entombTile, addConstruct,
  chordAt, verifyFlag, hiddenIdx, isHiddenUsable, highestRevealedNumber, numAt,
  neighborsOf, outerRingIndices, annexTiles, addMineAt, toast, log, healthState, recallArchived, riseGraves,
  gainLight, consumeUntreatedBlood, addTemporaryCard,
} from './runtime.js';

const tier = (u, values) => values[Math.max(0, Math.min(2, Number(u) || 0))];
const kw = (name, cls = 'gridk') => `<span class="kw ${cls}">${name}</span>`;
const reveal = name => kw(name, 'reveal');
const scan = name => kw(name, 'scan');
const detonate = name => kw(name, 'detonate');
const grid = name => kw(name, 'gridk');
const state = () => cbt()?.classState || {};
const hiddenSafe = () => hiddenIdx().filter(i => !board()?.cells[i].mine);
const revealedNumbers = () => (board()?.cells || [])
  .map((cell, i) => ({ cell, i, n: cell.revealed && !cell.void ? numAt(i) : 0 }))
  .filter(entry => entry.n > 0);
const activeConstructs = () => (board()?.cells || []).filter(cell => cell.construct);
const treatmentRecovery = (amount, u) => Math.ceil(amount * tier(u, [0.5, 0.75, 1]));

function addResource(key, amount, cap = Infinity) {
  const s = state();
  s[key] = Math.min(cap, Math.max(0, Number(s[key] || 0) + amount));
  return s[key];
}

function spendResource(key, amount = Infinity) {
  const s = state();
  const spent = Math.min(Number(s[key] || 0), amount);
  s[key] = Number(s[key] || 0) - spent;
  return spent;
}

function wager() {
  const s = state();
  const rigged = Number(s.riggedWagers || 0) > 0;
  if (rigged) s.riggedWagers--;
  const twoHeaded = Boolean(s.twoHeadedCoin) && !s.twoHeadedCoinUsed;
  if (twoHeaded) s.twoHeadedCoinUsed = true;
  const heads = rigged || twoHeaded || randInt(2) === 1;
  const forced = rigged || twoHeaded;
  toast(heads ? (forced ? 'Guaranteed: HEADS' : 'Wager: HEADS') : 'Wager: TAILS', !heads);
  log(`${heads ? '●' : '○'} ${rigged ? 'The loaded coin lands Heads.' : twoHeaded ? 'The two-headed coin cannot land Tails.' : `The wager lands ${heads ? 'Heads' : 'Tails'}.`}`);
  return heads;
}

function loadedCap() {
  return Math.max(3, Number(state().loadedCap || 3));
}

function spendBlood(amount) {
  const hp = healthState();
  if (hp.hp <= amount) return false;
  addResource('bloodSpent', amount);
  addResource('bloodSpentThisTurn', amount);
  addResource('untreatedBlood', amount);
  loseHP(amount, 'Blood spent on surgery', { bloodPayment: true });
  if (state().leechKit) gainBlock(amount);
  return true;
}

function runeEntries() {
  return board().cells
    .map((cell, i) => ({ cell, i, value: Number(cell.rune?.value || 0) }))
    .filter(entry => entry.cell.rune);
}

function inscribe(i, bonus = 0) {
  const cell = board().cells[i];
  const value = Math.max(0, Math.min(9, numAt(i) + bonus));
  cell.rune = { value };
  toast(`Rune inscribed: ${value}`);
  if (state().cinderbrand) hitRandom(1, { noNitro: true });
  return value;
}

function clearRunes() {
  const entries = runeEntries();
  entries.forEach(({ cell }) => { cell.rune = null; });
  return entries;
}

function atDeathsDoor() {
  const hp = healthState();
  return hp.hp <= hp.maxHp * Number(state().deathsDoorThreshold || 0.25);
}

export const NEUTRAL_FOUNDATION_CARDS = {
  probe: {
    name: 'Probe', type: 'Attack', rarity: 'starter', cls: 'neutral', cost: [1, 1, 1], hits: 'target',
    targets: ['hidden'],
    text: u => `${reveal('Reveal')} the chosen hidden tile. If it is safe, deal ${tier(u, [4, 7, 10])} damage to the targeted enemy.`,
    play: (u, tg) => { const result = revealTile(tg[0], 'card-safe'); if (result.safe) hitEnemy(curTarget(), atk(tier(u, [4, 7, 10]))); },
  },
  brace: {
    name: 'Brace', type: 'Skill', rarity: 'starter', cls: 'neutral', cost: [1, 1, 1], targets: [],
    text: u => `Gain ${tier(u, [5, 8, 12])} Block.`,
    play: u => gainBlock(tier(u, [5, 8, 12])),
  },
  reinforcedcoat: {
    name: 'Reinforced Coat', type: 'Skill', rarity: 'starter', cls: 'neutral', cost: [1, 1, 1], targets: [],
    text: u => `Gain ${tier(u, [3, 5, 7])} ${grid('Plating')}.`,
    play: u => gainPlating(tier(u, [3, 5, 7])),
  },
  resonanttap: {
    name: 'Resonant Tap', type: 'Skill', rarity: 'starter', cls: 'neutral', cost: [0, 0, 0], targets: ['number'], exhaust: true,
    text: u => `${reveal('Chord')} the chosen revealed number. If successful, draw ${tier(u, [1, 2, 2])} card${u ? 's' : ''}${u >= 2 ? ' and gain 1 Energy' : ''}. Exhaust.`,
    play: (u, tg) => {
      const result = chordAt(tg[0]);
      if (!result.ok) { toast(result.reason || 'The flags do not prove this Chord.', true); return; }
      drawCards(tier(u, [1, 2, 2]));
      if (u >= 2) gainEnergy(1);
    },
  },
  stonechorus: {
    name: 'Stone Chorus', type: 'Skill', rarity: 'uncommon', cls: 'neutral', cost: [0, 0, 0], targets: ['number'], exhaust: true,
    text: u => `${reveal('Chord')} the chosen revealed number. If successful, gain ${tier(u, [5, 8, 12])} Block${u >= 2 ? ' and 2 Plating' : ''}. Exhaust.`,
    play: (u, tg) => {
      const result = chordAt(tg[0]);
      if (!result.ok) { toast(result.reason || 'The flags do not prove this Chord.', true); return; }
      gainBlock(tier(u, [5, 8, 12]));
      if (u >= 2) gainPlating(2);
    },
  },
  steadyhand: {
    name: 'Steady Hand', type: 'Skill', rarity: 'common', cls: 'neutral', cost: [1, 1, 0], targets: [],
    text: u => `Gain ${tier(u, [4, 7, 10])} Block and ${tier(u, [2, 2, 3])} picks.`,
    play: u => { gainBlock(tier(u, [4, 7, 10])); gainPicks(tier(u, [2, 2, 3])); },
  },
  lanternloan: {
    name: 'Lantern Loan', type: 'Skill', rarity: 'common', cls: 'neutral', cost: [1, 1, 1], targets: [],
    text: u => `${scan('Scan')} ${tier(u, [2, 3, 4])} random hidden tiles. Gain 1 pick${u >= 1 ? ' and 1 max pick for this combat' : ''}${u >= 2 ? '; gain 1 Energy' : ''}.`,
    play: u => {
      shuffle(hiddenIdx()).slice(0, tier(u, [2, 3, 4])).forEach(scanTile);
      gainPicks(1);
      if (u >= 1) gainMaxPicks(1);
      if (u >= 2) gainEnergy(1);
    },
  },
  hardlesson: {
    name: 'Hard Lesson', type: 'Attack', rarity: 'uncommon', cls: 'neutral', cost: [0, 0, 0], hits: 'target', targets: [],
    can: () => cbt().picks > 0, canMsg: 'No picks left to spend.',
    text: u => `Spend up to ${tier(u, [2, 3, 4])} picks. Deal ${tier(u, [6, 8, 10])} damage to the targeted enemy for each pick spent.`,
    play: u => {
      const count = Math.min(cbt().picks, tier(u, [2, 3, 4]));
      cbt().picks -= count;
      hitEnemy(curTarget(), atk(count * tier(u, [6, 8, 10])));
    },
  },
  emergencyexit: {
    name: 'Emergency Exit', type: 'Skill', rarity: 'rare', cls: 'neutral', cost: [2, 2, 1], targets: [], exhaust: true,
    text: u => `${u < 2 ? 'Lose 1 max pick for this combat. ' : ''}Gain ${tier(u, [12, 16, 20])} Plating and draw ${tier(u, [2, 2, 3])} cards. Exhaust.`,
    play: u => {
      if (u < 2) { cbt().maxPicks = Math.max(1, cbt().maxPicks - 1); cbt().picks = Math.min(cbt().picks, cbt().maxPicks); }
      gainPlating(tier(u, [12, 16, 20]));
      drawCards(tier(u, [2, 2, 3]));
    },
  },
  bandage: {
    name: 'Bandage', type: 'Skill', rarity: 'common', cls: 'neutral', cost: [1, 1, 0], targets: [], exhaust: true,
    can: () => healthState().hp < healthState().maxHp, canMsg: 'Already at full HP.',
    text: u => `Recover ${tier(u, [4, 7, 10])} HP. Exhaust.`,
    play: u => healHP(tier(u, [4, 7, 10])),
  },
  faultline: {
    name: 'Fault Line', type: 'Attack', rarity: 'common', cls: 'neutral', cost: [1, 1, 1], targets: [], hits: 'target',
    text: u => `Deal ${tier(u, [5, 8, 11])} damage. Apply ${tier(u, [1, 1, 2])} Exposed to the targeted enemy.`,
    play: u => { const enemy = curTarget(); hitEnemy(enemy, atk(tier(u, [5, 8, 11]))); applyEnemyEffect(enemy, 'exposed', tier(u, [1, 1, 2])); },
  },
  signaljam: {
    name: 'Signal Jam', type: 'Skill', rarity: 'uncommon', cls: 'neutral', cost: [1, 1, 0], targets: [], hits: 'target',
    text: u => `Apply ${tier(u, [1, 2, 2])} Jammed to the targeted enemy${u >= 2 ? ' and draw 1 card' : ''}.`,
    play: u => { applyEnemyEffect(curTarget(), 'jammed', tier(u, [1, 2, 2])); if (u >= 2) drawCards(1); },
  },
  sunderingchalk: {
    name: 'Sundering Chalk', type: 'Skill', rarity: 'uncommon', cls: 'neutral', cost: [1, 0, 0], targets: [], hits: 'target',
    text: u => `Apply ${tier(u, [1, 1, 2])} Sundered to the targeted enemy${u >= 1 ? `. Deal ${tier(u, [0, 4, 7])} damage` : ''}.`,
    play: u => { const enemy = curTarget(); applyEnemyEffect(enemy, 'sundered', tier(u, [1, 1, 2])); if (u) hitEnemy(enemy, atk(tier(u, [0, 4, 7]))); },
  },
  gravebind: {
    name: 'Gravebind', type: 'Skill', rarity: 'rare', cls: 'neutral', cost: [2, 1, 1], targets: [], hits: 'target', exhaust: true,
    text: u => `Apply ${tier(u, [1, 1, 2])} Exposed and ${tier(u, [1, 2, 2])} Jammed${u >= 2 ? ', then draw 1 card' : ''}. Exhaust.`,
    play: u => {
      const enemy = curTarget();
      applyEnemyEffect(enemy, 'exposed', tier(u, [1, 1, 2]));
      applyEnemyEffect(enemy, 'jammed', tier(u, [1, 2, 2]));
      if (u >= 2) drawCards(1);
    },
  },
};

export const SIGNATURE_CARDS = {
  /* Sapper — controlled detonations and chains. */
  shortfuse: {
    name: 'Short Fuse', type: 'Attack', rarity: 'starter', cls: 'sapper', cost: [1, 1, 0], hits: 'mixed', targets: ['hidden'],
    text: u => `If mined, ${detonate('Detonate')} it safely and deal ${tier(u, [12, 16, 21])} damage to a random enemy. If safe, reveal it and deal ${tier(u, [5, 8, 11])} damage to the target.`,
    play: (u, tg) => { if (detonateForCards(tg[0])) hitRandom(atk(tier(u, [12, 16, 21]))); else { revealTile(tg[0], 'card-safe'); hitEnemy(curTarget(), atk(tier(u, [5, 8, 11]))); } },
  },
  controlled: {
    name: 'Controlled Blast', type: 'Attack', rarity: 'common', cls: 'sapper', cost: [1, 1, 1], hits: 'mixed', targets: ['hidden'],
    text: u => `If mined, ${detonate('Detonate')} it, deal ${tier(u, [12, 17, 22])} damage to all enemies, and lose ${tier(u, [2, 2, 1])} HP. If safe, reveal it and deal ${tier(u, [5, 8, 11])} damage.`,
    play: (u, tg) => { if (detonateForCards(tg[0])) { hitAll(atk(tier(u, [12, 17, 22]))); loseHP(tier(u, [2, 2, 1]), 'Controlled Blast'); } else { revealTile(tg[0], 'card-safe'); hitEnemy(curTarget(), atk(tier(u, [5, 8, 11]))); } },
  },
  blastsuit: {
    name: 'Blast Suit', type: 'Skill', rarity: 'common', cls: 'sapper', cost: [1, 1, 1], targets: [],
    text: u => `Gain ${tier(u, [3, 5, 8])} Plating, plus ${tier(u, [1, 2, 3])} Block for each link in your current Blast Chain.`,
    play: u => { gainPlating(tier(u, [3, 5, 8])); gainBlock(tier(u, [1, 2, 3]) * Number(state().blastChain || 0)); },
  },
  fusecutter: {
    name: 'Fuse Cutter', type: 'Attack', rarity: 'common', cls: 'sapper', cost: [1, 1, 0], hits: 'random', targets: ['hidden'],
    text: u => `${scan('Defuse')} the tile. If mined, deal ${tier(u, [10, 14, 19])} damage to a random enemy${u >= 2 ? ' and draw 1 card' : ''}; otherwise reveal it.`,
    play: (u, tg) => { if (defuseTile(tg[0])) { hitRandom(atk(tier(u, [10, 14, 19]))); if (u >= 2) drawCards(1); } },
  },
  chaincharge: {
    name: 'Chain Charge', type: 'Attack', rarity: 'uncommon', cls: 'sapper', cost: [2, 2, 1], hits: 'random', targets: [],
    can: () => board().cells.some(cell => cell.flag), canMsg: 'No flagged tiles.',
    text: u => `${detonate('Detonate')} up to ${tier(u, [2, 3, 4])} flagged tiles. Each mine deals ${tier(u, [10, 14, 18])} damage to a random enemy; each false flag reveals and costs 3 HP.`,
    play: u => {
      const picks = board().cells.map((cell, i) => cell.flag ? i : -1).filter(i => i >= 0).slice(0, tier(u, [2, 3, 4]));
      for (const i of picks) {
        if (!cbt() || !board()) break;
        if (detonateForCards(i)) hitRandom(atk(tier(u, [10, 14, 18])));
        else { revealTile(i, 'card-safe'); loseHP(3, 'A false Chain Charge'); }
      }
    },
  },
  powderkeg: {
    name: 'Powder Keg', type: 'Power', rarity: 'uncommon', cls: 'sapper', cost: [2, 1, 1], hits: 'all', targets: [],
    text: u => `For this combat, every mine detonated deals ${tier(u, [5, 8, 11])} damage to all enemies.`,
    play: u => { cbt().powers.powderkeg += tier(u, [5, 8, 11]); },
  },
  munitions: {
    name: 'Munitions Cache', type: 'Skill', rarity: 'uncommon', cls: 'sapper', cost: [1, 1, 0], targets: [],
    text: u => `Verified-flag ${tier(u, [1, 2, 3])} hidden mines. Gain ${tier(u, [3, 5, 8])} Block${u >= 2 ? ' and draw 1 card' : ''}.`,
    play: u => {
      const mines = shuffle(hiddenIdx().filter(i => board().cells[i].mine && board().cells[i].flag !== 2));
      mines.slice(0, tier(u, [1, 2, 3])).forEach(verifyFlag);
      gainBlock(tier(u, [3, 5, 8]));
      if (u >= 2) drawCards(1);
    },
  },
  seedcharge: {
    name: 'Seed Charge', type: 'Skill', rarity: 'common', cls: 'sapper', cost: [1, 1, 0], targets: ['hidden'],
    text: u => `Bury a mine in the chosen tile, or verified-flag it if already mined${u ? `. Gain ${tier(u, [0, 3, 5])} Block` : ''}${u >= 2 ? ' and 1 Energy' : ''}.`,
    play: (u, tg) => { if (!addMineAt(tg[0])) verifyFlag(tg[0]); if (u) gainBlock(tier(u, [0, 3, 5])); if (u >= 2) gainEnergy(1); },
  },
  shockwave: {
    name: 'Shockwave', type: 'Attack', rarity: 'uncommon', cls: 'sapper', cost: [2, 2, 1], hits: 'all', targets: [],
    text: u => `Deal ${tier(u, [8, 12, 16])} plus ${tier(u, [3, 5, 7])} damage per Blast Chain link to all enemies.`,
    play: u => hitAll(atk(tier(u, [8, 12, 16]) + tier(u, [3, 5, 7]) * Number(state().blastChain || 0))),
  },
  killzone: {
    name: 'Kill Zone', type: 'Attack', rarity: 'rare', cls: 'sapper', cost: [3, 2, 1], hits: 'all', targets: [],
    can: () => hiddenIdx().some(i => board().cells[i].scan === 'mine'), canMsg: 'No scanned mines.',
    text: u => `${detonate('Detonate')} up to ${tier(u, [2, 3, 4])} scanned mines. Each deals ${tier(u, [8, 11, 14])} damage to all enemies.`,
    play: u => hiddenIdx().filter(i => board().cells[i].scan === 'mine').slice(0, tier(u, [2, 3, 4]))
      .forEach(i => { if (cbt() && detonateForCards(i) && cbt()) hitAll(atk(tier(u, [8, 11, 14]))); }),
  },

  /* Surveyor — foreknowledge and Insight. */
  scancard: {
    name: 'Field Scan', type: 'Skill', rarity: 'starter', cls: 'surveyor', cost: [0, 0, 0], targets: ['hidden'],
    text: u => `${scan('Scan')} the tile. Draw ${tier(u, [1, 2, 3])} card${u ? 's' : ''} and gain ${tier(u, [1, 1, 2])} Insight.`,
    play: (u, tg) => { scanTile(tg[0]); drawCards(tier(u, [1, 2, 3])); gainInsight(tier(u, [1, 1, 2])); },
  },
  triangulate: {
    name: 'Triangulate', type: 'Attack', rarity: 'common', cls: 'surveyor', cost: [1, 1, 0], hits: 'target', targets: [],
    text: u => `Deal ${tier(u, [4, 5, 7])} times the highest revealed number to the targeted enemy.`,
    play: u => hitEnemy(curTarget(), atk(tier(u, [4, 5, 7]) * highestRevealedNumber())),
  },
  deduction: {
    name: 'Deduction', type: 'Attack', rarity: 'common', cls: 'surveyor', cost: [1, 1, 1], hits: 'target', targets: [],
    can: () => cbt().insight > 0, canMsg: 'No Insight.',
    text: u => `Spend all Insight. Deal ${tier(u, [4, 5, 7])} damage per Insight spent.`,
    play: u => { const amount = spendInsight(); hitEnemy(curTarget(), atk(amount * tier(u, [4, 5, 7]))); },
  },
  surveystakes: {
    name: 'Survey Stakes', type: 'Skill', rarity: 'common', cls: 'surveyor', cost: [1, 1, 0], targets: ['hidden', 'hidden', 'hidden'], optionalTargets: true,
    text: u => `${scan('Scan')} up to 3 chosen tiles, then ${scan('Scan')} ${tier(u, [1, 2, 3])} additional random tile${u ? 's' : ''}.`,
    play: (u, tg) => { tg.forEach(scanTile); shuffle(hiddenIdx().filter(i => !board().cells[i].scan)).slice(0, tier(u, [1, 2, 3])).forEach(scanTile); },
  },
  chordcard: {
    name: 'Proven Chord', type: 'Skill', rarity: 'uncommon', cls: 'surveyor', cost: [0, 0, 0], targets: ['number'],
    text: u => `${reveal('Chord')} the number. On success, draw ${tier(u, [1, 2, 2])}, gain ${tier(u, [1, 1, 2])} Insight${u >= 2 ? ', and gain 1 Energy' : ''}.`,
    play: (u, tg) => { const result = chordAt(tg[0]); if (!result.ok) return toast(result.reason, true); drawCards(tier(u, [1, 2, 2])); gainInsight(tier(u, [1, 1, 2])); if (u >= 2) gainEnergy(1); },
  },
  sixthsense: {
    name: 'Sixth Sense', type: 'Power', rarity: 'uncommon', cls: 'surveyor', cost: [2, 1, 1], targets: [],
    text: u => `The first ${tier(u, [1, 1, 2])} mine${u >= 2 ? 's' : ''} you would reveal each turn are verified-flagged instead${u ? '; begin with 1 Insight' : ''}.`,
    play: u => { cbt().powers.sixthsense = tier(u, [1, 1, 2]); if (u) gainInsight(1); },
  },
  fieldnotes: {
    name: 'Field Notes', type: 'Skill', rarity: 'uncommon', cls: 'surveyor', cost: [1, 1, 0], targets: [],
    text: u => `Draw ${tier(u, [2, 3, 3])} cards and gain ${tier(u, [1, 1, 2])} Insight.`,
    play: u => { drawCards(tier(u, [2, 3, 3])); gainInsight(tier(u, [1, 1, 2])); },
  },
  pinpoint: {
    name: 'Pinpoint', type: 'Attack', rarity: 'common', cls: 'surveyor', cost: [0, 0, 0], hits: 'target', targets: [],
    text: u => `Deal your Insight plus ${tier(u, [0, 3, 6])} damage. Do not spend Insight.`,
    play: u => hitEnemy(curTarget(), atk(cbt().insight + tier(u, [0, 3, 6]))),
  },
  knownquantity: {
    name: 'Known Quantity', type: 'Attack', rarity: 'uncommon', cls: 'surveyor', cost: [1, 1, 1], hits: 'target', targets: [],
    can: () => hiddenIdx().some(i => board().cells[i].scan), canMsg: 'Nothing is scanned.',
    text: u => `Deal ${tier(u, [5, 7, 9])} per scanned mine and ${tier(u, [2, 3, 4])} per scanned-safe tile. Scans remain.`,
    play: u => {
      const scans = hiddenIdx().map(i => board().cells[i].scan);
      hitEnemy(curTarget(), atk(scans.filter(x => x === 'mine').length * tier(u, [5, 7, 9])
        + scans.filter(x => x === 'safe').length * tier(u, [2, 3, 4])));
    },
  },
  eureka: {
    name: 'Eureka', type: 'Skill', rarity: 'rare', cls: 'surveyor', cost: [3, 2, 1], targets: [], exhaust: true,
    can: () => hiddenIdx().some(i => board().cells[i].scan), canMsg: 'Nothing is scanned.',
    text: u => `Resolve every scanned tile: reveal safe results and verified-flag mines. Gain ${tier(u, [0, 1, 2])} Energy. Exhaust.`,
    play: u => {
      const current = board();
      for (const i of hiddenIdx().filter(i => current.cells[i].scan)) {
        if (!cbt() || board() !== current) break;
        if (current.cells[i].scan === 'mine') verifyFlag(i); else revealTile(i, 'card-safe');
      }
      if (cbt()) gainEnergy(tier(u, [0, 1, 2]));
    },
  },

  /* Terraformer — Constructs, Heat, and board architecture. */
  entombcard: {
    name: 'Entomb', type: 'Skill', rarity: 'starter', cls: 'terraformer', cost: [1, 1, 0], targets: ['hidden'],
    text: u => `${grid('Entomb')} the tile. A mine grants ${tier(u, [8, 10, 13])} Plating; a safe tile scans ${tier(u, [2, 3, 4])} neighbors${u >= 2 ? ' and draws 1 card' : ''}.`,
    play: (u, tg) => {
      const current = board();
      const mine = current.cells[tg[0]].mine;
      const neighbors = mine ? [] : neighborsOf(tg[0], current.size);
      entombTile(tg[0]);
      if (!cbt() || board() !== current) return;
      if (mine) gainPlating(tier(u, [8, 10, 13]));
      else shuffle(neighbors.filter(isHiddenUsable)).slice(0, tier(u, [2, 3, 4])).forEach(scanTile);
      if (u >= 2) drawCards(1);
    },
  },
  sentry: {
    name: 'Sentry', type: 'Skill', rarity: 'common', cls: 'terraformer', cost: [1, 1, 1], hits: 'random', targets: ['open'],
    can: () => activeConstructs().length < 3, canMsg: 'Construct limit reached (3).',
    text: u => `Build a Sentry Construct on the chosen safe revealed tile. It deals ${tier(u, [6, 9, 12])} damage each turn and builds Heat${u >= 2 ? ', but begins cooled' : ''}.`,
    play: (u, tg) => addConstruct(tg[0], 'sentry', { dmg: tier(u, [6, 9, 12]), heat: u >= 2 ? -1 : 0 }),
  },
  propshaft: {
    name: 'Prop Shaft', type: 'Skill', rarity: 'common', cls: 'terraformer', cost: [1, 1, 0], targets: ['hidden'],
    text: u => `${scan('Defuse')} the tile. A mine grants ${tier(u, [5, 7, 10])} Plating; a safe tile reveals and grants ${tier(u, [3, 5, 7])} Block.`,
    play: (u, tg) => { if (defuseTile(tg[0])) gainPlating(tier(u, [5, 7, 10])); else gainBlock(tier(u, [3, 5, 7])); },
  },
  scaffold: {
    name: 'Scaffold', type: 'Skill', rarity: 'common', cls: 'terraformer', cost: [1, 1, 0], targets: [],
    text: u => `Add ${tier(u, [3, 4, 5])} scanned-safe tiles to the board edge${u >= 2 ? ' and gain 1 Energy' : ''}.`,
    play: u => { annexTiles(tier(u, [3, 4, 5]), false).forEach(i => { board().cells[i].scan = 'safe'; }); if (u >= 2) gainEnergy(1); },
  },
  landslide: {
    name: 'Landslide', type: 'Attack', rarity: 'rare', cls: 'terraformer', cost: [3, 3, 2], hits: 'all', targets: [],
    can: () => outerRingIndices(board()).some(isHiddenUsable),
    canMsg: 'The outer ring has no hidden tiles left.',
    text: u => `Reveal every hidden tile in the outer ring, safely removing its mines. Deal ${tier(u, [4, 5, 6])} damage to all enemies for each tile that was hidden when played.`,
    play: u => {
      const current = board();
      const ring = outerRingIndices(current).filter(i => !current.cells[i].revealed && !current.cells[i].entombed);
      if (!ring.length) {
        log('Landslide finds no hidden outer-ring tiles.');
        toast('The outer ring is already clear.', true);
        return;
      }
      const mines = ring.filter(i => current.cells[i].mine).length;
      const damage = ring.length * tier(u, [4, 5, 6]);
      for (const i of ring) {
        current.cells[i].mine = false;
        current.cells[i].flag = 0;
      }
      log(`Landslide clears ${ring.length} outer-ring tile${ring.length === 1 ? '' : 's'}, crushes ${mines} mine${mines === 1 ? '' : 's'}, and deals ${damage} to all enemies.`);
      toast(`Landslide: ${ring.length} tiles · ${damage} damage`);
      for (const i of ring) {
        if (!cbt() || board() !== current) break;
        if (!current.cells[i].revealed && !current.cells[i].entombed) revealTile(i, 'card-safe');
      }
      if (cbt()) hitAll(atk(damage));
    },
  },
  leylines: {
    name: 'Ley Lines', type: 'Power', rarity: 'uncommon', cls: 'terraformer', cost: [2, 1, 1], targets: [],
    text: u => `For this combat, cascades of at least ${tier(u, [5, 4, 3])} tiles grant 1 Energy${u >= 2 ? ' and reduce every Construct’s Heat by 1' : ''}.`,
    play: u => { cbt().powers.leylines = tier(u, [5, 4, 3]); cbt().powers.leyCooling = u >= 2; },
  },
  bulwark: {
    name: 'Bulwark', type: 'Skill', rarity: 'uncommon', cls: 'terraformer', cost: [2, 2, 1], targets: ['open'],
    can: () => activeConstructs().length < 3, canMsg: 'Construct limit reached (3).',
    text: u => `Build a cool-running Bulwark Construct on the chosen safe revealed tile. It grants ${tier(u, [1, 2, 3])} Plating and ${tier(u, [3, 5, 7])} Block each turn.`,
    play: (u, tg) => addConstruct(tg[0], 'bulwark', { plating: tier(u, [1, 2, 3]), block: tier(u, [3, 5, 7]) }),
  },
  surveyrelay: {
    name: 'Survey Relay', type: 'Skill', rarity: 'common', cls: 'terraformer', cost: [1, 1, 1], targets: ['open'],
    can: () => activeConstructs().length < 3, canMsg: 'Construct limit reached (3).',
    text: u => `Build a Survey Relay Construct on the chosen safe revealed tile. Each turn it costs 1 Energy, scans ${tier(u, [1, 1, 2])} nearby tile${u >= 2 ? 's' : ''}${u ? `, and grants ${tier(u, [0, 3, 5])} Block` : ''}. It builds Heat.`,
    play: (u, tg) => addConstruct(tg[0], 'relay', { scans: tier(u, [1, 1, 2]), block: tier(u, [0, 3, 5]) }),
  },
  stonechoir: {
    name: 'Stone Choir', type: 'Power', rarity: 'uncommon', cls: 'terraformer', cost: [2, 1, 1], targets: [],
    text: u => `Sentries and Relays trigger twice${u ? ` and their overload threshold rises by ${tier(u, [0, 1, 2])}` : ''}. Bulwarks trigger once.`,
    play: u => { cbt().powers.stonechoir = true; cbt().powers.heatTolerance = tier(u, [0, 1, 2]); },
  },
  citybelow: {
    name: 'The City Below', type: 'Attack', rarity: 'rare', cls: 'terraformer', cost: [3, 2, 1], hits: 'all', targets: [],
    can: () => activeConstructs().length > 0, canMsg: 'No active Constructs.',
    text: u => `For each Construct, deal ${tier(u, [8, 11, 14])} damage to all enemies and gain ${tier(u, [1, 1, 2])} Plating.`,
    play: u => { const count = activeConstructs().length; hitAll(atk(count * tier(u, [8, 11, 14]))); gainPlating(count * tier(u, [1, 1, 2])); },
  },
  bedrockshelter: {
    name: 'Bedrock Shelter', type: 'Skill', rarity: 'rare', cls: 'terraformer', cost: [2, 1, 1], targets: [], exhaust: true,
    text: u => `Gain ${tier(u, [5, 7, 9])} Block and recover ${tier(u, [1, 2, 3])} HP per Construct. Cool every Construct by ${tier(u, [1, 2, 3])}. Exhaust.`,
    play: u => {
      gainBlock(tier(u, [5, 7, 9])); healHP(activeConstructs().length * tier(u, [1, 2, 3]));
      activeConstructs().forEach(cell => { cell.construct.heat = Math.max(0, Number(cell.construct.heat || 0) - tier(u, [1, 2, 3])); });
    },
  },

  /* Lamplighter — cascades fill Light; flares spend it. */
  firstspark: {
    name: 'First Spark', type: 'Attack', rarity: 'starter', cls: 'lamplighter', cost: [1, 1, 0], hits: 'target', targets: ['hidden'],
    text: u => `${reveal('Reveal')} the tile. If safe, deal ${tier(u, [8, 12, 17])} damage and gain ${tier(u, [2, 3, 4])} Light.`,
    play: (u, tg) => { const result = revealTile(tg[0], 'card-safe'); if (result.safe) { hitEnemy(curTarget(), atk(tier(u, [8, 12, 17]))); gainLight(tier(u, [2, 3, 4])); } },
  },
  wicktrim: {
    name: 'Wick Trim', type: 'Skill', rarity: 'common', cls: 'lamplighter', cost: [0, 0, 0], targets: [],
    text: u => `Gain ${tier(u, [2, 3, 4])} Light and ${tier(u, [4, 7, 10])} Block. Preserve ${tier(u, [2, 4, 6])} additional Light when the turn ends.`,
    play: u => { gainLight(tier(u, [2, 3, 4])); gainBlock(tier(u, [4, 7, 10])); addResource('preserveLight', tier(u, [2, 4, 6]), 10); },
  },
  glassdawn: {
    name: 'Glass Dawn', type: 'Skill', rarity: 'common', cls: 'lamplighter', cost: [1, 1, 0], targets: [],
    text: u => `${scan('Scan')} ${tier(u, [2, 3, 4])} hidden tiles. For each safe result, gain 1 Light and 2 Block${u >= 2 ? '; then draw 1 card' : ''}.`,
    play: u => {
      const picks = shuffle(hiddenIdx()).slice(0, tier(u, [2, 3, 4]));
      picks.forEach(scanTile);
      const safe = picks.filter(i => board().cells[i].scan === 'safe').length;
      gainLight(safe);
      gainBlock(safe * 2);
      if (u >= 2) drawCards(1);
    },
  },
  kindlepower: {
    name: 'Kindle the Dark', type: 'Power', rarity: 'uncommon', cls: 'lamplighter', cost: [2, 1, 1], targets: [],
    text: u => `Cascades generate ${tier(u, [1, 2, 2])} additional Light${u >= 2 ? '; the first flare each turn costs 1 less Light' : ''}.`,
    play: u => { cbt().powers.lightBonus = tier(u, [1, 2, 2]); cbt().powers.freeFlare = u >= 2; },
  },
  flare: {
    name: 'Flare', type: 'Attack', rarity: 'common', cls: 'lamplighter', cost: [1, 1, 0], hits: 'all', targets: [],
    can: () => Number(state().light || 0) > 0, canMsg: 'No Light.',
    text: u => `Spend up to ${tier(u, [3, 4, 5])} Light. Deal ${tier(u, [7, 10, 13])} damage to all enemies per Light spent.`,
    play: u => {
      const limit = tier(u, [3, 4, 5]);
      const free = cbt().powers.freeFlare && !state().freeFlareUsed && Number(state().light || 0) > 0;
      if (free) state().freeFlareUsed = true;
      const spent = spendResource('light', Math.max(0, limit - (free ? 1 : 0)));
      hitAll(atk((spent + (free ? 1 : 0)) * tier(u, [7, 10, 13])));
    },
  },
  beacon: {
    name: 'Beacon', type: 'Skill', rarity: 'uncommon', cls: 'lamplighter', cost: [1, 1, 1], targets: [],
    can: u => Number(state().light || 0) >= tier(u, [2, 2, 1]), canMsg: 'Not enough Light.',
    text: u => `Spend ${tier(u, [2, 2, 1])} Light. Reveal ${tier(u, [1, 2, 3])} random safe tiles.`,
    play: u => { spendResource('light', tier(u, [2, 2, 1])); shuffle(hiddenSafe()).slice(0, tier(u, [1, 2, 3])).forEach(i => revealTile(i, 'card-safe')); },
  },
  daybreak: {
    name: 'Daybreak', type: 'Attack', rarity: 'rare', cls: 'lamplighter', cost: [2, 2, 1], hits: 'all', targets: [],
    can: () => Number(state().light || 0) >= 5, canMsg: 'Need at least 5 Light.',
    text: u => `Spend 5 Light. Deal ${tier(u, [22, 30, 40])} damage to all enemies and gain ${tier(u, [1, 2, 3])} Energy.`,
    play: u => { spendResource('light', 5); hitAll(atk(tier(u, [22, 30, 40]))); gainEnergy(tier(u, [1, 2, 3])); },
  },
  starchamber: {
    name: 'Star Chamber', type: 'Attack', rarity: 'uncommon', cls: 'lamplighter', cost: [1, 1, 0], hits: 'target', targets: [],
    text: u => `Deal ${tier(u, [2, 3, 4])} damage for each tile revealed this turn, plus your current Light.`,
    play: u => hitEnemy(curTarget(), atk(cbt().revealedThisTurn * tier(u, [2, 3, 4]) + Number(state().light || 0))),
  },
  whiteflame: {
    name: 'White Flame', type: 'Power', rarity: 'rare', cls: 'lamplighter', cost: [2, 1, 1], hits: 'all', targets: [],
    text: u => `Whenever Light reaches 10, consume ${tier(u, [5, 4, 3])} and deal ${tier(u, [14, 18, 24])} damage to all enemies.`,
    play: u => { cbt().powers.whiteFlame = { spend: tier(u, [5, 4, 3]), damage: tier(u, [14, 18, 24]) }; },
  },
  lastlight: {
    name: 'Last Light', type: 'Skill', rarity: 'rare', cls: 'lamplighter', cost: [2, 1, 0], targets: [], exhaust: true,
    can: () => Number(state().light || 0) > 0, canMsg: 'No Light.',
    text: u => `Spend all Light. For every ${tier(u, [3, 2, 2])} spent, draw 1 card and gain 1 Energy${u >= 2 ? '; then gain 2 Light' : ''}. Exhaust.`,
    play: u => { const spent = spendResource('light'); const sets = Math.floor(spent / tier(u, [3, 2, 2])); drawCards(sets); gainEnergy(sets); if (u >= 2) gainLight(2); },
  },

  /* Gambler — true 50/50 Wagers, with Loaded cheating. */
  openwager: {
    name: 'Open Wager', type: 'Attack', rarity: 'starter', cls: 'gambler', cost: [0, 0, 0], hits: 'target', targets: [],
    text: u => `Flip. Heads: deal ${tier(u, [14, 19, 25])} damage. Tails: deal ${tier(u, [10, 14, 19])} damage and gain ${tier(u, [4, 6, 9])} Block.`,
    play: u => {
      if (wager()) hitEnemy(curTarget(), atk(tier(u, [14, 19, 25])));
      else { hitEnemy(curTarget(), atk(tier(u, [10, 14, 19]))); gainBlock(tier(u, [4, 6, 9])); }
    },
  },
  houseedge: {
    name: 'House Edge', type: 'Skill', rarity: 'common', cls: 'gambler', cost: [1, 1, 0], targets: ['hidden'],
    text: u => `Flip. Always ${scan('Scan')} the tile and resolve it safely. Heads: also draw ${tier(u, [1, 2, 3])}.`,
    play: (u, tg) => {
      const heads = wager();
      scanTile(tg[0]);
      if (board().cells[tg[0]].mine) verifyFlag(tg[0]); else revealTile(tg[0], 'card-safe');
      if (heads) drawCards(tier(u, [1, 2, 3]));
    },
  },
  bonetoken: {
    name: 'Bone Token', type: 'Skill', rarity: 'common', cls: 'gambler', cost: [1, 0, 0], targets: [],
    text: u => `Flip. Heads: gain ${tier(u, [2, 3, 4])} Loaded. Tails: gain ${tier(u, [12, 17, 24])} Block.`,
    play: u => { if (wager()) addResource('loaded', tier(u, [2, 3, 4]), loadedCap()); else gainBlock(tier(u, [12, 17, 24])); },
  },
  tell: {
    name: 'Read the Tell', type: 'Skill', rarity: 'common', cls: 'gambler', cost: [1, 1, 0], targets: [],
    text: u => `Gain 1 Loaded, then flip. Heads: verified-flag ${tier(u, [1, 2, 3])} hidden mine${u ? 's' : ''}. Tails: gain ${tier(u, [7, 10, 14])} Block.`,
    play: u => {
      addResource('loaded', 1, loadedCap());
      if (wager()) shuffle(hiddenIdx().filter(i => board().cells[i].mine)).slice(0, tier(u, [1, 2, 3])).forEach(verifyFlag);
      else gainBlock(tier(u, [7, 10, 14]));
    },
  },
  doubledown: {
    name: 'Double Down', type: 'Skill', rarity: 'uncommon', cls: 'gambler', cost: [1, 1, 0], targets: [],
    text: u => `Flip now. Heads: gain ${tier(u, [1, 2, 3])} Loaded and force the next Wager to Heads. Tails: lose ${tier(u, [1, 0, 0])} HP, gain 1 Loaded, and gain ${tier(u, [6, 9, 12])} Block.`,
    play: u => { if (wager()) { addResource('loaded', tier(u, [1, 2, 3]), loadedCap()); addResource('riggedWagers', 1); } else { loseHP(tier(u, [1, 0, 0]), 'Double Down'); addResource('loaded', 1, loadedCap()); gainBlock(tier(u, [6, 9, 12])); } },
  },
  stackeddeck: {
    name: 'Stacked Deck', type: 'Skill', rarity: 'common', cls: 'gambler', cost: [1, 0, 0], targets: [],
    can: () => Number(state().loaded || 0) > 0, canMsg: 'No Loaded coins.',
    text: u => `Spend 1 Loaded. Force the next ${tier(u, [1, 2, 3])} Wager${u ? 's' : ''} to Heads.`,
    play: u => { spendResource('loaded', 1); addResource('riggedWagers', tier(u, [1, 2, 3])); },
  },
  snakeeyes: {
    name: 'Snake Eyes', type: 'Attack', rarity: 'uncommon', cls: 'gambler', cost: [1, 1, 0], hits: 'all', targets: [],
    text: u => `Flip twice. Two Heads: deal ${tier(u, [28, 38, 52])} to all enemies. Otherwise gain ${tier(u, [12, 18, 26])} Block.`,
    play: u => { const won = wager() && wager(); if (won) hitAll(atk(tier(u, [28, 38, 52]))); else gainBlock(tier(u, [12, 18, 26])); },
  },
  cashout: {
    name: 'Cash Out', type: 'Attack', rarity: 'uncommon', cls: 'gambler', cost: [1, 1, 0], hits: 'target', targets: [],
    can: () => Number(state().loaded || 0) > 0, canMsg: 'No Loaded coins.',
    text: u => `Spend all Loaded. Deal ${tier(u, [8, 11, 15])} damage per coin and draw 1 card if at least 2 were spent.`,
    play: u => { const spent = spendResource('loaded'); hitEnemy(curTarget(), atk(spent * tier(u, [8, 11, 15]))); if (spent >= 2) drawCards(1); },
  },
  allin: {
    name: 'All In', type: 'Attack', rarity: 'rare', cls: 'gambler', cost: [2, 2, 1], hits: 'target', targets: [],
    text: u => `Flip ${tier(u, [2, 3, 4])} times. Deal ${tier(u, [10, 11, 12])} damage per Heads; lose 1 HP and gain 3 Block per Tails.`,
    play: u => { let heads = 0, tails = 0; for (let i = 0; i < tier(u, [2, 3, 4]); i++) wager() ? heads++ : tails++; hitEnemy(curTarget(), atk(heads * tier(u, [10, 11, 12]))); if (tails) { loseHP(tails, 'An All In wager'); gainBlock(tails * 3); } },
  },
  finalbet: {
    name: 'Final Bet', type: 'Skill', rarity: 'rare', cls: 'gambler', cost: [2, 1, 0], targets: [], exhaust: true,
    text: u => `Flip. Heads: gain ${tier(u, [2, 3, 4])} Energy and draw ${tier(u, [2, 3, 4])}. Tails: gain ${tier(u, [1, 2, 2])} Energy and draw ${tier(u, [2, 2, 3])}. Exhaust.`,
    play: u => { const heads = wager(); gainEnergy(heads ? tier(u, [2, 3, 4]) : tier(u, [1, 2, 2])); drawCards(heads ? tier(u, [2, 3, 4]) : tier(u, [2, 2, 3])); },
  },

  /* Chirurgeon — Health is Blood: spend it, then steal it back. */
  cleancut: {
    name: 'Clean Cut', type: 'Attack', rarity: 'starter', cls: 'chirurgeon', cost: [0, 0, 0], hits: 'target', targets: [],
    can: u => healthState().hp > tier(u, [5, 4, 3]), canMsg: 'Not enough Health to pay the Blood cost.',
    text: u => `Spend ${tier(u, [5, 4, 3])} HP. Deal ${tier(u, [11, 15, 20])} damage. If this kills, refund its Blood cost.`,
    play: u => {
      const cost = tier(u, [5, 4, 3]), surgicalState = state(), enemy = curTarget();
      if (!spendBlood(cost)) return;
      if (hitEnemy(enemy, atk(tier(u, [11, 15, 20])))) {
        const treated = consumeUntreatedBlood(cost, surgicalState);
        healHP(treated, { treatBlood: false });
      }
    },
  },
  fielddressing: {
    name: 'Field Dressing', type: 'Skill', rarity: 'common', cls: 'chirurgeon', cost: [1, 1, 0], targets: ['hidden'],
    can: u => healthState().hp > tier(u, [2, 1, 1]), canMsg: 'Not enough Health to pay the Blood cost.',
    text: u => `Spend ${tier(u, [2, 1, 1])} HP and ${scan('Scan')} the tile, then refund that cost. If safe, treat up to ${tier(u, [3, 5, 7])} older Untreated Blood and recover ${tier(u, ['half', 'three quarters', 'all'])} of that treatment, then reveal it. If mined, verified-flag it${u ? ` and treat up to ${tier(u, [0, 1, 2])} older Blood` : ''}.`,
    play: (u, tg) => {
      const cost = tier(u, [2, 1, 1]);
      const olderBlood = Number(state().untreatedBlood || 0);
      if (!spendBlood(cost)) return;
      scanTile(tg[0]);
      if (board().cells[tg[0]].mine) {
        const treated = Math.min(olderBlood, tier(u, [0, 1, 2]));
        consumeUntreatedBlood(cost + treated);
        healHP(cost + treatmentRecovery(treated, u), { treatBlood: false });
        verifyFlag(tg[0]);
      } else {
        // Treat first so this card cannot also trigger Triage from the same wound.
        const treated = Math.min(olderBlood, tier(u, [3, 5, 7]));
        consumeUntreatedBlood(cost + treated);
        healHP(cost + treatmentRecovery(treated, u), { treatBlood: false });
        revealTile(tg[0], 'card-safe');
      }
    },
  },
  triageline: {
    name: 'Triage Line', type: 'Skill', rarity: 'common', cls: 'chirurgeon', cost: [1, 1, 0], targets: [],
    text: u => `Gain ${tier(u, [5, 8, 12])} Block, plus ${tier(u, [1, 2, 3])} per 2 HP spent this turn. After enemies act, remaining Block treats up to ${tier(u, [2, 3, 5])} Untreated Blood and recovers up to ${tier(u, [1, 2, 5])} HP.`,
    play: u => {
      gainBlock(tier(u, [5, 8, 12]) + tier(u, [1, 2, 3]) * Math.floor(Number(state().bloodSpentThisTurn || 0) / 2));
      state().triageLineRecovery = Math.max(Number(state().triageLineRecovery || 0), tier(u, [2, 3, 5]));
      state().triageLineHealing = Math.max(Number(state().triageLineHealing || 0), tier(u, [1, 2, 5]));
    },
  },
  redthread: {
    name: 'Red Thread', type: 'Attack', rarity: 'common', cls: 'chirurgeon', cost: [1, 1, 0], hits: 'target', targets: [],
    text: u => `Deal ${tier(u, [8, 12, 16])} damage. Treat up to ${tier(u, [3, 5, 7])} Untreated Blood and recover ${tier(u, ['half', 'three quarters', 'all'])} of the amount treated.`,
    play: u => {
      const surgicalState = state();
      hitEnemy(curTarget(), atk(tier(u, [8, 12, 16])));
      const treated = consumeUntreatedBlood(tier(u, [3, 5, 7]), surgicalState);
      healHP(treatmentRecovery(treated, u), { treatBlood: false });
    },
  },
  splint: {
    name: 'Splint', type: 'Skill', rarity: 'common', cls: 'chirurgeon', cost: [1, 1, 0], targets: [],
    can: u => healthState().hp > tier(u, [3, 2, 1]), canMsg: 'Not enough Health to pay the Blood cost.',
    text: u => `Spend ${tier(u, [3, 2, 1])} HP. Gain ${tier(u, [7, 10, 14])} Plating.`,
    play: u => { if (spendBlood(tier(u, [3, 2, 1]))) gainPlating(tier(u, [7, 10, 14])); },
  },
  bittertonic: {
    name: 'Bitter Tonic', type: 'Skill', rarity: 'uncommon', cls: 'chirurgeon', cost: [0, 0, 0], targets: [],
    can: u => healthState().hp > tier(u, [4, 3, 2]), canMsg: 'Not enough Health to pay the Blood cost.',
    text: u => `Spend ${tier(u, [4, 3, 2])} HP. Gain ${tier(u, [1, 2, 2])} Energy and draw ${tier(u, [1, 1, 2])}.`,
    play: u => { if (spendBlood(tier(u, [4, 3, 2]))) { gainEnergy(tier(u, [1, 2, 2])); drawCards(tier(u, [1, 1, 2])); } },
  },
  spareblood: {
    name: 'Spare Blood', type: 'Attack', rarity: 'uncommon', cls: 'chirurgeon', cost: [1, 1, 0], hits: 'all', targets: [],
    can: u => healthState().hp > tier(u, [5, 4, 3]), canMsg: 'Not enough Health to pay the Blood cost.',
    text: u => `Spend ${tier(u, [5, 4, 3])} HP. Deal ${tier(u, [14, 19, 25])} to all enemies. Recover 2 HP per enemy hit and 2 more per kill, up to ${tier(u, [6, 8, 10])}.`,
    play: u => {
      const surgicalState = state();
      if (!spendBlood(tier(u, [5, 4, 3]))) return;
      const enemies = cbt().enemies.filter(e => e.hp > 0);
      hitAll(atk(tier(u, [14, 19, 25])));
      const recovery = Math.min(tier(u, [6, 8, 10]), enemies.length * 2 + enemies.filter(e => e.hp <= 0).length * 2);
      consumeUntreatedBlood(recovery, surgicalState);
      healHP(recovery, { treatBlood: false });
    },
  },
  cauterize: {
    name: 'Cauterize', type: 'Skill', rarity: 'uncommon', cls: 'chirurgeon', cost: [1, 1, 0], targets: [], exhaust: true,
    can: () => Number(state().untreatedBlood || 0) >= 2, canMsg: 'You need at least 2 Untreated Blood.',
    text: u => `For every 2 Untreated Blood, recover ${tier(u, [1, 2, 3])} HP, up to ${tier(u, [8, 12, 16])}. Consume the treated Blood. Exhaust.`,
    play: u => {
      const perPair = tier(u, [1, 2, 3]), cap = tier(u, [8, 12, 16]);
      const pairs = Math.min(Math.floor(Number(state().untreatedBlood || 0) / 2), Math.ceil(cap / perPair));
      consumeUntreatedBlood(pairs * 2);
      healHP(Math.min(cap, pairs * perPair), { treatBlood: false });
    },
  },
  anatomylesson: {
    name: 'Anatomy Lesson', type: 'Attack', rarity: 'rare', cls: 'chirurgeon', cost: [2, 1, 0], hits: 'target', targets: [],
    text: u => `Deal ${tier(u, [2, 3, 4])} damage for each HP spent this combat, plus ${tier(u, [8, 10, 12])}.`,
    play: u => hitEnemy(curTarget(), atk(Number(state().bloodSpent || 0) * tier(u, [2, 3, 4]) + tier(u, [8, 10, 12]))),
  },
  operatingtheatre: {
    name: 'Operating Theatre', type: 'Power', rarity: 'rare', cls: 'chirurgeon', cost: [2, 1, 0], targets: [],
    text: u => `The first ${tier(u, [1, 2, 3])} time${u ? 's' : ''} each turn you spend Blood, draw 1 and recover ${tier(u, [1, 2, 2])} HP afterward.`,
    play: u => { cbt().powers.operatingTheatre = { uses: tier(u, [1, 2, 3]), healing: tier(u, [1, 2, 2]) }; },
  },
  transfusion: {
    name: 'Transfusion', type: 'Attack', rarity: 'uncommon', cls: 'chirurgeon', cost: [1, 1, 0], hits: 'target', targets: [], exhaust: true,
    text: u => `Deal ${tier(u, [7, 10, 14])} damage. If the enemy has a condition, recover ${tier(u, [2, 3, 5])} HP. Exhaust.`,
    play: u => {
      const surgicalState = state(), enemy = curTarget();
      const conditioned = Object.values(enemy?.effects || {}).some(value => Number(value) > 0);
      hitEnemy(enemy, atk(tier(u, [7, 10, 14])));
      const recovery = conditioned ? tier(u, [2, 3, 5]) : 0;
      consumeUntreatedBlood(recovery, surgicalState);
      healHP(recovery, { treatBlood: false });
    },
  },
  emergencysurgery: {
    name: 'Emergency Surgery', type: 'Skill', rarity: 'rare', cls: 'chirurgeon', cost: [1, 1, 0], targets: [], exhaust: true,
    can: () => healthState().hp * 5 <= healthState().maxHp * 2, canMsg: 'Emergency Surgery requires critical Health (40% or less).',
    text: u => `At 40% Health or less, recover ${tier(u, [6, 9, 12])} HP. Add ${tier(u, [2, 2, 1])} Wound${tier(u, [2, 2, 1]) === 1 ? '' : 's'} to your discard pile. Exhaust.`,
    play: u => {
      healHP(tier(u, [6, 9, 12]));
      for (let i = 0; i < tier(u, [2, 2, 1]); i++) addTemporaryCard('wound');
    },
  },

  /* Archivist — File cards into the Archive and Recall them. */
  footnote: {
    name: 'Footnote', type: 'Skill', rarity: 'starter', cls: 'archivist', cost: [0, 0, 0], targets: [], file: true,
    text: u => `Draw ${tier(u, [1, 2, 3])}, gain ${tier(u, [2, 3, 5])} Block, then file this card in the Archive.`,
    play: u => { drawCards(tier(u, [1, 2, 3])); gainBlock(tier(u, [2, 3, 5])); },
  },
  indexmark: {
    name: 'Index Mark', type: 'Attack', rarity: 'common', cls: 'archivist', cost: [1, 1, 0], hits: 'target', targets: [], file: true,
    text: u => `Deal ${tier(u, [10, 15, 20])} damage. Gain 1 Citation. File this card.`,
    play: u => { hitEnemy(curTarget(), atk(tier(u, [10, 15, 20]))); addResource('citations', 1, 9); },
  },
  errata: {
    name: 'Errata', type: 'Skill', rarity: 'common', cls: 'archivist', cost: [1, 1, 0], targets: ['hidden'], file: true,
    text: u => `${scan('Scan')} the tile, draw ${tier(u, [1, 2, 2])}, and gain ${tier(u, [2, 4, 6])} Block${u >= 2 ? '; gain 1 Citation' : ''}. File this card.`,
    play: (u, tg) => { scanTile(tg[0]); drawCards(tier(u, [1, 2, 2])); gainBlock(tier(u, [2, 4, 6])); if (u >= 2) addResource('citations', 1, 9); },
  },
  redaction: {
    name: 'Redaction', type: 'Skill', rarity: 'common', cls: 'archivist', cost: [1, 1, 0], targets: [], file: true,
    text: u => `Gain ${tier(u, [8, 12, 17])} Block and ${tier(u, [1, 1, 2])} Citation${u >= 2 ? 's' : ''}. File this card.`,
    play: u => { gainBlock(tier(u, [8, 12, 17])); addResource('citations', tier(u, [1, 1, 2]), 9); },
  },
  citation: {
    name: 'Citation', type: 'Skill', rarity: 'common', cls: 'archivist', cost: [0, 0, 0], targets: [], file: true,
    text: u => `Gain ${tier(u, [1, 2, 3])} Citations. File this card.`,
    play: u => addResource('citations', tier(u, [1, 2, 3]), 9),
  },
  palimpsest: {
    name: 'Palimpsest', type: 'Skill', rarity: 'uncommon', cls: 'archivist', cost: [1, 0, 0], targets: [], file: true,
    can: () => cbt().archive.length > 0, canMsg: 'The Archive is empty.',
    text: u => `Recall ${tier(u, [1, 1, 2])} filed card${u >= 2 ? 's' : ''}${u ? ' upgraded' : ''}. File this card.`,
    play: u => recallArchived(tier(u, [1, 1, 2]), u ? 1 : 0),
  },
  recallnotice: {
    name: 'Recall Notice', type: 'Skill', rarity: 'uncommon', cls: 'archivist', cost: [1, 0, 0], targets: [],
    can: () => cbt().archive.length > 0, canMsg: 'The Archive is empty.',
    text: u => `Spend ${tier(u, [1, 1, 0])} Citation. Recall ${tier(u, [1, 2, 3])} filed card${u ? 's' : ''}.`,
    play: u => { spendResource('citations', tier(u, [1, 1, 0])); recallArchived(tier(u, [1, 2, 3]), 0); },
  },
  closedstacks: {
    name: 'Closed Stacks', type: 'Skill', rarity: 'uncommon', cls: 'archivist', cost: [1, 1, 0], targets: [],
    text: u => `Gain ${tier(u, [4, 6, 8])} Block for each filed card, plus ${tier(u, [1, 2, 4])} Block per Citation.`,
    play: u => gainBlock(cbt().archive.length * tier(u, [4, 6, 8]) + Number(state().citations || 0) * tier(u, [1, 2, 4])),
  },
  finaledition: {
    name: 'Final Edition', type: 'Attack', rarity: 'rare', cls: 'archivist', cost: [2, 1, 0], hits: 'all', targets: [], file: true,
    text: u => `Deal ${tier(u, [5, 8, 10])} damage to all enemies per filed card. Gain ${tier(u, [1, 2, 3])} Citations. File this card.`,
    play: u => { hitAll(atk(cbt().archive.length * tier(u, [5, 8, 10]))); addResource('citations', tier(u, [1, 2, 3]), 9); },
  },
  everythingrecorded: {
    name: 'Everything Recorded', type: 'Skill', rarity: 'rare', cls: 'archivist', cost: [2, 1, 0], targets: [], exhaust: true,
    can: () => cbt().archive.length > 0, canMsg: 'The Archive is empty.',
    text: u => `Recall up to ${tier(u, [2, 3, 5])} filed cards upgraded. Gain 1 Energy for every two recalled. Exhaust.`,
    play: u => { const count = Math.min(tier(u, [2, 3, 5]), cbt().archive.length); recallArchived(count, 1); gainEnergy(Math.floor(count / 2)); },
  },

  /* Warden — absorb attacks to earn Resolve, then Riposte. */
  braceline: {
    name: 'Brace Line', type: 'Skill', rarity: 'starter', cls: 'warden', cost: [1, 1, 0], targets: [],
    text: u => `Gain ${tier(u, [8, 12, 17])} Block, plus ${tier(u, [1, 1, 2])} Block per Resolve.`,
    play: u => gainBlock(tier(u, [8, 12, 17]) + Number(state().resolve || 0) * tier(u, [1, 1, 2])),
  },
  stoneoath: {
    name: 'Stone Oath', type: 'Skill', rarity: 'common', cls: 'warden', cost: [1, 1, 0], targets: [],
    text: u => `Gain ${tier(u, [6, 9, 12])} Block and ${tier(u, [2, 3, 4])} Plating.`,
    play: u => { gainBlock(tier(u, [6, 9, 12])); gainPlating(tier(u, [2, 3, 4])); },
  },
  interlock: {
    name: 'Interlock', type: 'Power', rarity: 'common', cls: 'warden', cost: [1, 1, 0], targets: [],
    text: u => `Gain ${tier(u, [3, 5, 8])} Block. Gain ${tier(u, [1, 2, 3])} additional Resolve whenever an enemy attack is fully blocked.`,
    play: u => { gainBlock(tier(u, [3, 5, 8])); cbt().powers.interlock = tier(u, [1, 2, 3]); },
  },
  watchpost: {
    name: 'Watch Post', type: 'Attack', rarity: 'common', cls: 'warden', cost: [1, 1, 0], hits: 'target', targets: [],
    text: u => `Deal ${tier(u, [8, 11, 15])} plus your Block divided by ${tier(u, [3, 2, 2])}, rounded down.`,
    play: u => hitEnemy(curTarget(), atk(tier(u, [8, 11, 15]) + Math.floor(cbt().block / tier(u, [3, 2, 2])))),
  },
  holdthedoor: {
    name: 'Hold the Door', type: 'Skill', rarity: 'uncommon', cls: 'warden', cost: [1, 1, 0], hits: 'target', targets: [],
    can: () => Number(state().resolve || 0) > 0, canMsg: 'No Resolve.',
    text: u => `Spend up to ${tier(u, [3, 4, 5])} Resolve. Gain ${tier(u, [5, 7, 8])} Block per point and Jam the target.`,
    play: u => { const spent = spendResource('resolve', tier(u, [3, 4, 5])); gainBlock(spent * tier(u, [5, 7, 8])); applyEnemyEffect(curTarget(), 'jammed', 1); },
  },
  counterfort: {
    name: 'Counterfort', type: 'Attack', rarity: 'common', cls: 'warden', cost: [1, 1, 0], hits: 'target', targets: [],
    can: () => Number(state().resolve || 0) > 0, canMsg: 'No Resolve.',
    text: u => `Spend up to ${tier(u, [3, 4, 5])} Resolve. Deal ${tier(u, [8, 10, 13])} damage per point spent.`,
    play: u => hitEnemy(curTarget(), atk(spendResource('resolve', tier(u, [3, 4, 5])) * tier(u, [8, 10, 13]))),
  },
  unbroken: {
    name: 'Unbroken', type: 'Power', rarity: 'uncommon', cls: 'warden', cost: [2, 1, 0], targets: [],
    text: u => `Retain ${tier(u, [45, 60, 80])}% of Block between turns and increase the Resolve cap by ${tier(u, [4, 7, 10])}.`,
    play: u => { cbt().powers.blockRetention = tier(u, [.45, .6, .8]); state().resolveCap = 10 + tier(u, [4, 7, 10]); },
  },
  citadel: {
    name: 'Citadel', type: 'Attack', rarity: 'rare', cls: 'warden', cost: [2, 2, 1], hits: 'all', targets: [],
    text: u => `Deal your Plating × ${tier(u, [2, 4, 5])} plus your Block divided by ${tier(u, [4, 3, 2])} to all enemies.`,
    play: u => hitAll(atk(cbt().plating * tier(u, [2, 4, 5]) + Math.floor(cbt().block / tier(u, [4, 3, 2])))),
  },
  lastbastion: {
    name: 'Last Bastion', type: 'Skill', rarity: 'rare', cls: 'warden', cost: [2, 1, 0], targets: [], exhaust: true,
    text: u => `Spend all Resolve. Gain ${tier(u, [5, 7, 9])} Block and deal ${tier(u, [4, 6, 8])} damage to all enemies per point. Exhaust.`,
    play: u => { const spent = spendResource('resolve'); gainBlock(spent * tier(u, [5, 7, 9])); hitAll(atk(spent * tier(u, [4, 6, 8]))); },
  },
  wallbelow: {
    name: 'The Wall Below', type: 'Power', rarity: 'rare', cls: 'warden', cost: [2, 1, 0], targets: [],
    text: u => `At turn start, gain ${tier(u, [2, 3, 5])} Block per Plating and ${tier(u, [1, 2, 3])} Resolve.`,
    play: u => { cbt().powers.wallBelow = { blockPerPlating: tier(u, [2, 3, 5]), resolve: tier(u, [1, 2, 3]) }; },
  },

  /* Hexwright — truthful clue numbers become mutable Rune values. */
  chalkthree: {
    name: 'Chalk Three', type: 'Attack', rarity: 'starter', cls: 'hexwright', cost: [1, 1, 0], hits: 'target', targets: ['number'],
    text: u => `Inscribe the chosen number as a Rune with +${tier(u, [0, 1, 2])} value. Gain Block equal to its value, then deal its value × ${tier(u, [6, 9, 13])}.`,
    play: (u, tg) => {
      const sourceBoard = board();
      const value = inscribe(tg[0], tier(u, [0, 1, 2]));
      if (!cbt() || board() !== sourceBoard) return;
      gainBlock(value);
      hitEnemy(curTarget(), atk(value * tier(u, [6, 9, 13])));
    },
  },
  oddproof: {
    name: 'Odd Proof', type: 'Attack', rarity: 'common', cls: 'hexwright', cost: [1, 1, 0], hits: 'all', targets: [],
    can: () => runeEntries().some(entry => entry.value % 2 === 1), canMsg: 'No odd-valued Runes.',
    text: u => `Deal ${tier(u, [8, 12, 17])} damage to all enemies for each odd-valued Rune. Gain ${tier(u, [3, 5, 8])} Block.`,
    play: u => { hitAll(atk(runeEntries().filter(entry => entry.value % 2 === 1).length * tier(u, [8, 12, 17]))); if (cbt()) gainBlock(tier(u, [3, 5, 8])); },
  },
  numberbite: {
    name: 'Number Bite', type: 'Attack', rarity: 'common', cls: 'hexwright', cost: [1, 1, 0], hits: 'target', targets: ['number'],
    text: u => `Deal the chosen number × ${tier(u, [6, 8, 10])}. If it is already a Rune, deal ${tier(u, [8, 12, 17])} extra.`,
    play: (u, tg) => hitEnemy(curTarget(), atk(numAt(tg[0]) * tier(u, [6, 8, 10]) + (board().cells[tg[0]].rune ? tier(u, [8, 12, 17]) : 0))),
  },
  falsezero: {
    name: 'False Zero', type: 'Skill', rarity: 'common', cls: 'hexwright', cost: [1, 1, 0], targets: ['number'],
    text: u => `Inscribe the chosen clue, then warp its Rune value to ${tier(u, [0, 1, 2])}. Gain ${tier(u, [10, 16, 22])} Block. The real clue remains unchanged.`,
    play: (u, tg) => {
      const sourceBoard = board();
      inscribe(tg[0]);
      if (!cbt() || board() !== sourceBoard || !sourceBoard.cells[tg[0]]?.rune) return;
      board().cells[tg[0]].rune.value = tier(u, [0, 1, 2]);
      gainBlock(tier(u, [10, 16, 22]));
    },
  },
  carryone: {
    name: 'Carry One', type: 'Skill', rarity: 'uncommon', cls: 'hexwright', cost: [1, 1, 0], targets: [],
    can: () => runeEntries().length > 0, canMsg: 'No Runes are inscribed.',
    text: u => `Increase every Rune value by ${tier(u, [1, 2, 3])}, to a maximum of 9. Draw 1 card.`,
    play: u => { runeEntries().forEach(({ cell }) => { cell.rune.value = Math.min(9, cell.rune.value + tier(u, [1, 2, 3])); }); drawCards(1); },
  },
  primemark: {
    name: 'Prime Mark', type: 'Skill', rarity: 'common', cls: 'hexwright', cost: [1, 1, 0], targets: ['number'],
    text: u => `Inscribe the number and gain ${tier(u, [4, 7, 10])} Block. ${scan('Scan')} ${tier(u, [1, 2, 3])} hidden neighbors per prime Rune value.`,
    play: (u, tg) => {
      const sourceBoard = board();
      const value = inscribe(tg[0]);
      if (!cbt() || board() !== sourceBoard) return;
      gainBlock(tier(u, [4, 7, 10]));
      if ([2, 3, 5, 7].includes(value)) {
        shuffle(neighborsOf(tg[0], board().size).filter(isHiddenUsable))
          .slice(0, tier(u, [1, 2, 3])).forEach(scanTile);
      }
    },
  },
  countagain: {
    name: 'Count Again', type: 'Skill', rarity: 'common', cls: 'hexwright', cost: [1, 1, 0], targets: [],
    can: () => runeEntries().length > 0, canMsg: 'No Runes are inscribed.',
    text: u => `Draw ${tier(u, [1, 2, 3])} card${u ? 's' : ''}. Gain ${tier(u, [4, 6, 8])} Block per Rune.`,
    play: u => { drawCards(tier(u, [1, 2, 3])); gainBlock(runeEntries().length * tier(u, [4, 6, 8])); },
  },
  perfectsum: {
    name: 'Perfect Sum', type: 'Attack', rarity: 'uncommon', cls: 'hexwright', cost: [2, 1, 0], hits: 'target', targets: ['number', 'number'],
    text: u => `Choose two numbers. Deal their sum × ${tier(u, [4, 6, 8])}; if the sum is ${tier(u, [5, 6, 7])}, double the hit.`,
    play: (u, tg) => { const sum = numAt(tg[0]) + numAt(tg[1]); hitEnemy(curTarget(), atk(sum * tier(u, [4, 6, 8]) * (sum === tier(u, [5, 6, 7]) ? 2 : 1))); },
  },
  proofofharm: {
    name: 'Proof of Harm', type: 'Attack', rarity: 'rare', cls: 'hexwright', cost: [2, 1, 0], hits: 'all', targets: [],
    can: () => runeEntries().length > 0, canMsg: 'No Runes are inscribed.',
    text: u => `Deal the sum of all Rune values × ${tier(u, [3, 5, 7])} to all enemies. Keep ${u >= 2 ? 'all' : u ? 'one' : 'no'} Runes.`,
    play: u => { const entries = runeEntries(); hitAll(atk(entries.reduce((sum, entry) => sum + entry.value, 0) * tier(u, [3, 5, 7]))); if (u < 2) entries.slice(u ? 1 : 0).forEach(({ cell }) => { cell.rune = null; }); },
  },
  finalanswer: {
    name: 'Final Answer', type: 'Skill', rarity: 'rare', cls: 'hexwright', cost: [2, 1, 0], targets: [], exhaust: true,
    can: () => runeEntries().length > 0, canMsg: 'No Runes are inscribed.',
    text: u => `Consume every Rune. Gain ${tier(u, [1, 2, 3])} Energy and ${tier(u, [5, 8, 12])} Block per Rune. Reveal one random safe neighbor per Rune. Exhaust.`,
    play: u => { const entries = clearRunes(); gainEnergy(tier(u, [1, 2, 3])); gainBlock(entries.length * tier(u, [5, 8, 12])); entries.forEach(({ i }) => { const safe = shuffle(neighborsOf(i, board().size).filter(j => isHiddenUsable(j) && !board().cells[j].mine))[0]; if (safe != null) revealTile(safe, 'card-safe'); }); },
  },

  /* Revenant — exhausted cards enter a Grave and Rise once, upgraded. */
  gravestep: {
    name: 'Grave Step', type: 'Attack', rarity: 'starter', cls: 'revenant', cost: [0, 0, 0], hits: 'target', targets: [], grave: true,
    text: u => `Deal ${tier(u, [7, 10, 14])} damage${u >= 2 ? ' plus 5 at Death’s Door' : ''}. Enter the Grave. Risen: +50% damage.`,
    play: u => hitEnemy(curTarget(), atk(tier(u, [7, 10, 14]) + (u >= 2 && atDeathsDoor() ? 5 : 0))),
  },
  coldbreath: {
    name: 'Cold Breath', type: 'Attack', rarity: 'common', cls: 'revenant', cost: [1, 1, 0], hits: 'target', targets: ['hidden'], grave: true,
    text: u => `${reveal('Reveal')} the tile. If safe, deal ${tier(u, [6, 9, 13])} damage${u >= 2 ? ' and draw 1' : ''}. Enter the Grave. Risen: +50% damage.`,
    play: (u, tg) => { if (revealTile(tg[0], 'card-safe').safe) { hitEnemy(curTarget(), atk(tier(u, [6, 9, 13]))); if (u >= 2) drawCards(1); } },
  },
  secondburial: {
    name: 'Second Burial', type: 'Skill', rarity: 'common', cls: 'revenant', cost: [1, 0, 0], targets: [], grave: true,
    text: u => `Draw ${tier(u, [2, 3, 4])} cards. At Death’s Door, gain ${tier(u, [1, 2, 3])} Energy. Enter the Grave.`,
    play: u => { drawCards(tier(u, [2, 3, 4])); if (atDeathsDoor()) gainEnergy(tier(u, [1, 2, 3])); },
  },
  deadweight: {
    name: 'Dead Weight', type: 'Skill', rarity: 'common', cls: 'revenant', cost: [1, 1, 0], targets: [], grave: true,
    text: u => `Gain ${tier(u, [8, 11, 15])} Block, doubled at Death’s Door. Enter the Grave.`,
    play: u => gainBlock(tier(u, [8, 11, 15]) * (atDeathsDoor() ? 2 : 1)),
  },
  cryptdebt: {
    name: 'Crypt Debt', type: 'Attack', rarity: 'uncommon', cls: 'revenant', cost: [1, 1, 0], hits: 'all', targets: [], grave: true,
    selfDamage: u => tier(u, [4, 3, 2]),
    text: u => `Lose ${tier(u, [4, 3, 2])} HP. Deal ${tier(u, [14, 19, 26])} damage to all enemies. Enter the Grave. Risen: +50% damage.`,
    play: u => { loseHP(tier(u, [4, 3, 2]), 'Crypt Debt'); if (cbt() && !cbt().over) hitAll(atk(tier(u, [14, 19, 26]))); },
  },
  wakebell: {
    name: 'Wake Bell', type: 'Skill', rarity: 'common', cls: 'revenant', cost: [1, 1, 0], targets: [],
    can: () => cbt().grave.length > 0, canMsg: 'The Grave is empty.',
    text: u => `Rise ${tier(u, [1, 2, 3])} card${u ? 's' : ''} from the Grave. They return upgraded and can Rise only once. Recover ${tier(u, [1, 2, 3])} HP per card that Rises.`,
    play: u => healHP(riseGraves(tier(u, [1, 2, 3])) * tier(u, [1, 2, 3])),
  },
  ghostflag: {
    name: 'Ghost Flag', type: 'Skill', rarity: 'uncommon', cls: 'revenant', cost: [1, 1, 0], targets: [], grave: true,
    text: u => `Verified-flag ${tier(u, [1, 2, 3])} hidden mine${u ? 's' : ''} and gain ${tier(u, [3, 5, 8])} Block. At Death’s Door, draw 1. Enter the Grave.`,
    play: u => { shuffle(hiddenIdx().filter(i => board().cells[i].mine)).slice(0, tier(u, [1, 2, 3])).forEach(verifyFlag); gainBlock(tier(u, [3, 5, 8])); if (atDeathsDoor()) drawCards(1); },
  },
  notomorrow: {
    name: 'No Tomorrow', type: 'Attack', rarity: 'uncommon', cls: 'revenant', cost: [1, 1, 0], hits: 'target', targets: [],
    text: u => `Deal ${tier(u, [9, 13, 18])} damage, or ${tier(u, [20, 27, 37])} at Death’s Door.`,
    play: u => hitEnemy(curTarget(), atk(atDeathsDoor() ? tier(u, [20, 27, 37]) : tier(u, [9, 13, 18]))),
  },
  afterlife: {
    name: 'Afterlife', type: 'Skill', rarity: 'rare', cls: 'revenant', cost: [2, 1, 0], targets: [], exhaust: true,
    can: () => cbt().grave.length > 0, canMsg: 'The Grave is empty.',
    text: u => `Rise up to ${tier(u, [2, 4, 6])} cards. Recover 1 HP per card that Rises and gain 1 Energy for every two. Exhaust.`,
    play: u => { const count = Math.min(tier(u, [2, 4, 6]), cbt().grave.length); const risen = riseGraves(count); healHP(risen); gainEnergy(Math.floor(risen / 2)); },
  },
  refusethedark: {
    name: 'Refuse the Dark', type: 'Power', rarity: 'rare', cls: 'revenant', cost: [2, 1, 0], targets: [],
    text: u => `The first ${tier(u, [1, 2, 3])} card${u ? 's' : ''} that Rise each combat cost 0 and draw 1 card when played.`,
    play: u => { cbt().powers.refuseDark = tier(u, [1, 2, 3]); },
  },
};
