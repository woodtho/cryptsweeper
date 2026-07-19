/* Headless smoke test for the Cryptsweeper engine (no DOM, no React). */
import {
  run, ui, cbt, board,
  genBoard, solveScore, neighborsOf, numAt, hiddenIdx, isHiddenUsable,
  newRun, reachableNodes, startCombat, revealTile, openSafe, chordAt, endTurn,
  takeRewardCard, finishReward, genShop, buyShopCard,
  startPuzzle, puzzleClick, devourRing, hitEnemy, checkNNPhase,
  detonateForCards, fleeCombat,
  SHAPES, annexTiles, addMineAt, clickTile, PICKS_PER_TURN,
  saveRun, listSaves, loadRun, deleteSave,
  scanTile, addConstruct,
} from '../src/engine/engine.js';
import { CARDS } from '../src/engine/data.js';

let failures = 0;
const storage = new Map();
globalThis.localStorage = {
  getItem: key => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: key => storage.delete(key),
};
function T(name, cond) { console.log((cond ? 'PASS' : 'FAIL') + '  ' + name); if (!cond) failures++; }
// live-binding note: `run` re-imports fresh on each access; helpers below re-read it.
const R = () => run;

/* 1 — shaped board generation at every stratum size + NN-99 max phase */
for (const [size, mines] of [[8, 10], [9, 14], [10, 20], [13, 42]]) {
  const b = genBoard(size, mines);
  const playable = b.cells.filter(c => !c.void).length;
  const mc = b.cells.filter(c => c.mine).length;
  T(`genBoard ${size}/${mines} (${b.shape}): grid is size+2`, b.size === size + 2);
  T(`genBoard ${size} (${b.shape}): playable region exists with void margin`, playable > 0 && playable < b.size * b.size);
  T(`genBoard ${size} (${b.shape}): mines only on playable tiles, ≥4`, mc >= 4 && b.cells.every(c => !(c.mine && c.void)));
  T(`genBoard ${size} (${b.shape}): opening playable + safe`, !b.cells[b.opening].void && !b.cells[b.opening].mine);
}
for (const shape of SHAPES) {
  const b = genBoard(8, 10, shape);
  T(`shape ${shape}: valid board`, b.shape === shape
    && !b.cells[b.opening].void && !b.cells[b.opening].mine
    && b.cells.every(c => !(c.mine && c.void)));
}

/* 2 — run + map */
newRun('surveyor');
T('run created, 10-card deck', R() && R().deck.length === 10);
T('map has 12 rows', R().map.nodes.length === 12);
T('boss node exists', R().map.nodes[11][2] === 'boss');
T('start nodes reachable', reachableNodes().length > 0);

/* 3 — combat basics */
startCombat('dig');
// buff HP so lair damage can't end the fight mid-test (sections 3-6 assert board mechanics)
cbt().enemies.forEach(e => { e.maxHp += 500; e.hp += 500; });
T('combat started with enemies', !!cbt() && cbt().enemies.length > 0);
T('drew 5', cbt().hand.length === 5);
T('3 energy', cbt().energy === 3);
T('opening cascade revealed tiles', board().cells.filter(x => x.revealed).length >= 1);

const safeHidden = hiddenIdx().find(i => !board().cells[i].mine);
const insight0 = cbt().insight;
revealTile(safeHidden, 'reveal');
T('safe reveal opens tile', board().cells[safeHidden].revealed);
T('insight gained on safe reveal', cbt().insight > insight0);

/* 4 — instinct saves first mine; second mine pierces block */
const mine1 = hiddenIdx().find(i => board().cells[i].mine);
const hp0 = R().hp;
revealTile(mine1, 'reveal');
T('Instinct verified-flags first mine, no damage', board().cells[mine1].flag === 2 && R().hp === hp0);
cbt().block = 99;
const mine2 = hiddenIdx().find(i => board().cells[i].mine && !board().cells[i].flag);
if (mine2 != null) {
  revealTile(mine2, 'reveal');
  T('mine damage pierces Block (8 @ stratum 1)', R().hp === hp0 - 8);
  T('detonated mine leaves crater, mine removed', board().cells[mine2].crater && !board().cells[mine2].mine);
} else console.log('skip  (no second unflagged mine)');

/* 5 — chord: flag all mine-neighbors of a revealed number, then chord */
{
  const b2 = board();
  const numTile = b2.cells.findIndex((cell, i) => cell.revealed && !cell.void && numAt(i) > 0
    && neighborsOf(i, b2.size).some(j => isHiddenUsable(j) && b2.cells[j].mine && !b2.cells[j].flag));
  if (numTile >= 0) {
    neighborsOf(numTile, b2.size).forEach(j => { if (b2.cells[j].mine && isHiddenUsable(j)) b2.cells[j].flag = 1; });
    const n = numAt(numTile);
    const flags = neighborsOf(numTile, b2.size).filter(j => b2.cells[j].flag && isHiddenUsable(j)).length;
    if (flags === n) {
      const r = chordAt(numTile);
      T('chord resolves with 0 detonations', r.ok && r.detonations === 0);
      T('chord marks chordedThisTurn', cbt().chordedThisTurn === true);
    } else console.log('skip  chord (pre-existing flags)');
  } else console.log('skip  chord (no candidate)');
}

/* 6 — end turn / new turn */
{
  const t0 = cbt().turn;
  endTurn();
  if (ui.screen === 'combat') {
    T('turn advanced', cbt().turn === t0 + 1);
    T('energy refilled', cbt().energy === cbt().maxEnergy);
  } else console.log('skip  turn tests (combat ended early: ' + ui.screen + ')');
}

/* 6.5 — lairs: solving damages enemies; killing solves the board */
if (R().combat) fleeCombat();
startCombat('dig');
{
  const cc = cbt();
  T('every living enemy has a lair', cc.enemies.every(e => e.hp <= 0 || (e.lair && e.lair.length >= 9)));
  const e = cc.enemies.find(x => x.hp > 0 && x.lair && x.lair.length);
  // pick a numbered lair tile so the reveal doesn't cascade (deterministic damage)
  const safeLair = e.lair.find(i => isHiddenUsable(i) && !board().cells[i].mine && numAt(i) > 0)
    ?? e.lair.find(i => isHiddenUsable(i) && !board().cells[i].mine);
  if (safeLair != null) {
    const hp0 = e.hp;
    revealTile(safeLair, 'card-safe');
    T('revealing a lair tile damages its owner', e.hp < hp0);
  } else console.log('skip  lair reveal (no hidden safe lair tile)');
  if (R().combat && e.hp > 0) {
    const mineLair = e.lair.find(i => isHiddenUsable(i) && board().cells[i].mine);
    if (mineLair != null) {
      const hp1 = e.hp;
      detonateForCards(mineLair);
      T('detonating a lair mine deals 10 to its owner', e.hp <= hp1 - 10);
    } else console.log('skip  lair mine (none hidden in lair)');
  }
  if (R().combat && e.hp > 0) {
    const bRef = cbt().board;
    const lairRef = e.lair.slice();
    hitEnemy(e, 9999, { bypassGate: true });
    T('killed enemy lair crumbles open', lairRef.every(i => {
      const cl = bRef.cells[i];
      return cl.void || cl.revealed || cl.entombed;
    }));
  }
}

/* 7 — full clear: heavy AoE + board re-seal; kills are still required to win */
if (ui.screen === 'reward') { takeRewardCard(0); finishReward(); }
if (R().combat) fleeCombat();
startCombat('dig');
{
  const cc = cbt();
  cc.enemies.forEach(e => { e.maxHp += 500; e.hp += 500; }); // survive the sweep: exercise the re-seal path
  const bRef = cc.board;
  const hpBefore = cc.enemies.reduce((s, e) => s + Math.max(0, e.hp), 0);
  for (let i = 0; i < bRef.cells.length; i++) {
    if (!R().combat || cbt().board !== bRef) break;
    const cell = bRef.cells[i];
    if (!cell.mine && !cell.void && !cell.revealed && !cell.entombed) { cell.flag = 0; revealTile(i, 'card-safe'); }
  }
  T('full clear achieved', cc.fullCleared === true);
  const hpAfter = cc.enemies.reduce((s, e) => s + Math.max(0, e.hp), 0);
  T('collapse + lair digging damaged enemies', hpAfter < hpBefore);
  T('crypt re-seals with a fresh board', R().combat && cbt().board !== bRef
    && cbt().board.cells.some(x => !x.revealed && !x.mine && !x.void));
  T('killing is still required to win', ui.screen === 'combat' && !!R().combat);
  for (const e of cc.enemies.slice()) if (e.hp > 0) hitEnemy(e, 99999, { bypassGate: true });
  T('reward after all enemies are dead', ui.screen === 'reward');
}
if (ui.screen === 'reward') {
  T('card reward offered', R().reward.cards.length >= 1);
  if (R().reward.fullClear) T('full-clear reward is upgraded', R().reward.cards.every(cd => cd.up === 1));
  const deckBefore = R().deck.length;
  takeRewardCard(0);
  T('deck grew', R().deck.length === deckBefore + 1);
  finishReward();
  T('back on map', ui.screen === 'map');
}

/* 8 — shop */
genShop();
T('shop stocks 5 cards', R().shop.cards.length === 5);
R().gold = 999;
const deckPreShop = R().deck.length;
buyShopCard(0);
T('shop card purchase adds to deck', R().deck.length === deckPreShop + 1 && R().shop.cards[0].sold);

/* 9 — puzzle event */
startPuzzle();
T('puzzle board 6x6, 4 mines', R().puzzle.board.cells.length === 36 && R().puzzle.board.cells.filter(x => x.mine).length === 4);
for (let i = 0; i < 36; i++) { const cell = R().puzzle.board.cells[i]; if (!cell.mine && !cell.revealed) puzzleClick(i); }
T('puzzle solvable by full sweep', R().puzzle.solved === true);

/* 10 — boss machinery: collapser devour + nn99 gate */
startCombat('boss');
const boss = cbt().enemies[0];
T('stratum-1 boss is the Collapser', boss.key === 'collapser');
const preVoid = board().cells.filter(x => x.void).length;
devourRing();
if (R().combat && !cbt().over) {
  T('devour voids the outer ring', board().cells.filter(x => x.void).length > preVoid);
} else console.log('skip  devour assert (combat ended)');

R().stratum = 2;
startCombat('boss');
const nn = cbt().enemies[0];
T('stratum-3 boss is NN-99', nn.key === 'nn99');
const nnHp = nn.hp;
cbt().revealedThisTurn = 0; cbt().chordedThisTurn = false;
hitEnemy(nn, 10);
T('NN-99 gate blocks damage', nn.hp === nnHp);
cbt().revealedThisTurn = 6;
hitEnemy(nn, 10);
T('NN-99 takes damage after 5+ reveals', nn.hp === nnHp - 10);
nn.hp = 149; checkNNPhase(nn);
T('NN-99 phase 2 regenerates a denser board (12+2 grid)', board().size === 14);

/* 11 — construct fix regression: Sentry can be built (addConstruct exists now) */
{
  const open = board().cells.findIndex(c => c.revealed && !c.construct && !c.void);
  if (open >= 0) {
    const { addConstruct } = await import('../src/engine/engine.js');
    addConstruct(open, 'sentry', { dmg: 5 });
    T('addConstruct builds a Sentry on a revealed tile', board().cells[open].construct?.kind === 'sentry');
  }
}

/* 11.5 — board editing verbs, new cards, and the picks limit */
R().stratum = 0;
startCombat('dig');
{
  const cc = cbt();
  cc.enemies.forEach(e => { e.maxHp += 900; e.hp += 900; }); // lair damage must not end the fight
  const playable0 = board().cells.filter(x => !x.void).length;
  const added = annexTiles(3, false);
  T('annexTiles adds 3 playable safe tiles', added.length === 3
    && board().cells.filter(x => !x.void).length === playable0 + 3
    && added.every(i => !board().cells[i].void && !board().cells[i].mine));
  const spot = hiddenIdx().find(i => !board().cells[i].mine);
  T('addMineAt arms a hidden tile', addMineAt(spot) === true && board().cells[spot].mine === true);
  CARDS.seedcharge.play(0, [spot]);
  T('Seed Charge on a mined tile verified-flags it', board().cells[spot].flag === 2);
  const empty = hiddenIdx().find(i => !board().cells[i].mine && !board().cells[i].flag);
  CARDS.seedcharge.play(0, [empty]);
  T('Seed Charge buries a fresh mine', board().cells[empty].mine === true);
  const playable1 = board().cells.filter(x => !x.void).length;
  CARDS.scaffold.play(0, []);
  T('Scaffold annexes pre-scanned safe tiles',
    board().cells.filter(x => !x.void).length === playable1 + 3
    && board().cells.filter(x => !x.void && x.scan === 'safe' && !x.mine).length >= 3);

  T('turn starts with 3 picks', cc.picks === PICKS_PER_TURN);
  let used = 0;
  while (cc.picks > 0 && used < 10) {
    const t = hiddenIdx().find(i => !board().cells[i].mine && !board().cells[i].flag);
    if (t == null) break;
    clickTile(t);
    used++;
  }
  T('3 free clicks consume all picks', cc.picks === 0 && used === 3);
  const fourth = hiddenIdx().find(i => !board().cells[i].mine && !board().cells[i].flag);
  if (fourth != null) {
    clickTile(fourth);
    T('4th free click is rejected', !board().cells[fourth].revealed);
    revealTile(fourth, 'card-safe');
    T('card reveals bypass the pick limit', board().cells[fourth].revealed);
  } else console.log('skip  4th-click test (no hidden safe tile left)');
  endTurn();
  if (R().combat && !cbt().over) T('picks reset next turn', cbt().picks === PICKS_PER_TURN);
}

/* 12 — solver quality report (shaped boards) */
let acc = 0; const N = 20;
for (let k = 0; k < N; k++) {
  const bb = genBoard(10, 20);
  const mines = new Set(bb.cells.map((x, i) => (x.mine ? i : -1)).filter(i => i >= 0));
  const voids = new Set(bb.cells.map((x, i) => (x.void ? i : -1)).filter(i => i >= 0));
  acc += solveScore(mines, bb.size, bb.opening, voids);
}
console.log(`info  no-guess solver: avg provable-solvable fraction on shaped 10/20 boards = ${(acc / N).toFixed(2)}`);

/* 13 — persistent saves restore Sets and live enemy definitions */
{
  const hp = R().hp;
  T('named save writes metadata', saveRun('slot1') && listSaves().some(s => s.slot === 'slot1' && s.hp === hp));
  R().hp = 1;
  T('named save restores run state', loadRun('slot1') && R().hp === hp);
  T('loaded map edges are Sets', Object.values(R().map.edges).every(edge => edge instanceof Set));
  if (R().combat?.enemies?.length) T('loaded enemies regain definitions', typeof R().combat.enemies[0].def.next === 'function');
  deleteSave('slot1');
  T('named save can be deleted', !listSaves().some(s => s.slot === 'slot1'));
}

/* 14 — the daily challenge seed is repeatable */
{
  const signature = () => JSON.stringify({ nodes: R().map.nodes, edges: Object.fromEntries(Object.entries(R().map.edges).map(([k, v]) => [k, [...v]])) });
  newRun('surveyor', { daily: '2026-07-19' });
  const first = signature();
  newRun('surveyor', { daily: '2026-07-19' });
  T('same daily seed generates the same map', signature() === first);
}

/* 15 — Delver identities: unique decks, passives, and expanded pools */
{
  T('each Delver has an expanded reward pool', ['sapper', 'surveyor', 'terraformer'].every(cls =>
    Object.values(CARDS).filter(card => card.cls === cls && ['common', 'uncommon', 'rare'].includes(card.rarity)).length >= 10));

  newRun('sapper');
  T('Sapper starter deck is specialized', R().deck.filter(c => c.key === 'shortfuse').length === 2 && R().deck.some(c => c.key === 'seedcharge'));
  startCombat('dig');
  cbt().enemies.forEach(e => { e.hp += 100; e.maxHp += 100; });
  const sapMine = hiddenIdx().find(i => board().cells[i].mine);
  detonateForCards(sapMine);
  T('Sapper Breachcraft triggers on first controlled detonation', cbt().classState.passiveUsed === true);

  newRun('surveyor'); startCombat('dig');
  const energy0 = cbt().energy, insight0b = cbt().insight;
  hiddenIdx().slice(0, 4).forEach(scanTile);
  T('Surveyor Field Method rewards four fresh scans', cbt().energy === energy0 + 1 && cbt().insight === insight0b + 1);

  newRun('terraformer'); startCombat('dig');
  const open = board().cells.findIndex(c => c.revealed && !c.void && !c.construct);
  const plating0 = cbt().plating;
  addConstruct(open, 'relay', { block: 2 });
  T('Terraformer Master Builder grants Plating', cbt().plating === plating0 + 2 && board().cells[open].construct?.kind === 'relay');
}

console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
