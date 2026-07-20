/* Headless smoke test for the Cryptsweeper engine (no DOM, no React). */
import {
  run, ui, cbt, board,
  genBoard, solveScore, neighborsOf, numAt, hiddenIdx, isHiddenUsable,
  newRun, reachableNodes, startCombat, revealTile, openSafe, chordAt, endTurn,
  takeRewardCard, finishReward, genShop, buyShopCard,
  startPuzzle, puzzleClick, devourRing, hitEnemy, checkNNPhase,
  detonateForCards, fleeCombat,
  SHAPES, annexTiles, addMineAt, clickTile, PICKS_PER_TURN,
  saveRun, listSaves, loadRun, deleteSave, goHome,
  scanTile, addConstruct,
  campTrainPicks, closeCutscene, closeModal,
  EVENT_CATALOG, eventChoice, setLogicPuzzleCell, checkLogicPuzzle, testLaunch,
  toggleLightsCell, toggleNonogramCell, answerSequence,
} from '../src/engine/engine.js';
import { CARDS, CLASSES, TRINKETS } from '../src/engine/data.js';
import { loadProgression, recordProgress, isDelverUnlocked, resetProgressionForTests } from '../src/engine/progression.js';
import { loadDailyRecords, recordDailyAttempt, recordDailyResult, localDateKey as dailyDateKey } from '../src/engine/daily.js';
import { observe as botObserve, legalActions as botLegalActions, act as botAct, step as botStep } from '../src/bot/gameBot.js';
import { decorateMechanics } from '../src/ui/mechanics.js';

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
T('new run queues the opening cutscene', ui.cutscene?.id === 'opening');
closeCutscene();
T('cutscene can be dismissed through engine state', ui.cutscene === null);
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
T('puzzle board 6x6, 4-5 mines', R().puzzle.board.cells.length === 36 && [4, 5].includes(R().puzzle.board.cells.filter(x => x.mine).length));
for (let i = 0; i < 36; i++) { const cell = R().puzzle.board.cells[i]; if (!cell.mine && !cell.revealed) puzzleClick(i); }
T('puzzle solvable by full sweep', R().puzzle.solved === true);
{
  const layout = () => { startPuzzle(); return R().puzzle.board.cells.map(c => (c.mine ? 1 : 0)).join(''); };
  T('honest puzzles vary between visits', new Set(Array.from({ length: 6 }, layout)).size > 1);
  let honest = true;
  for (let n = 0; n < 10; n++) {
    startPuzzle();
    const cells = R().puzzle.board.cells;
    const mines = new Set(cells.map((c, i) => (c.mine ? i : -1)).filter(i => i >= 0));
    // any revealed zero-cell floods the same opening region the player starts with
    const opening = cells.findIndex((c, i) => c.revealed && neighborsOf(i, 6).every(j => !cells[j].mine));
    if (solveScore(mines, 6, opening) < 1) honest = false;
  }
  T('every generated puzzle is provable without guessing', honest);
}
T('event catalog contains exactly 100 discoverable encounters', Object.keys(EVENT_CATALOG).length === 100);
T('all events have titles, descriptions, and at least two choices', Object.values(EVENT_CATALOG).every(event => event.title && event.text && event.choices?.length >= 2));
startPuzzle('sudoku');
T('Sudoku puzzle has a persisted 4x4 solution and givens', R().puzzle.type === 'sudoku' && R().puzzle.values.length === 16 && R().puzzle.givens.length > 0);
R().puzzle.solution.forEach((value, i) => setLogicPuzzleCell(i, value));
checkLogicPuzzle();
T('Sudoku can be solved through engine actions', R().puzzle.solved === true);
startPuzzle('crossword');
T('crossword puzzle has a persisted 3x3 grid and clues', R().puzzle.type === 'crossword' && R().puzzle.values.length === 9 && R().puzzle.clues.length === 3);
R().puzzle.solution.forEach((value, i) => setLogicPuzzleCell(i, value));
checkLogicPuzzle();
T('crossword can be solved through engine actions', R().puzzle.solved === true);
startPuzzle('mines-hard');
T('late Minesweeper expands to a no-guess 8x8 board with fewer scans', R().puzzle.board.cells.length === 64 && R().puzzle.scans === 1);
startPuzzle('sudoku-hard');
T('late Sudoku expands to a standard 9x9 board', R().puzzle.size === 9 && R().puzzle.values.length === 81);
R().puzzle.solution.forEach((value, i) => setLogicPuzzleCell(i, value));
checkLogicPuzzle();
T('9x9 Sudoku resolves through the shared puzzle engine', R().puzzle.solved === true);
startPuzzle('crossword-medium');
T('middle-depth crossword expands to a 4x4 word square', R().puzzle.size === 4 && R().puzzle.values.length === 16);
startPuzzle('sequence-medium');
answerSequence(R().puzzle.answer);
T('sequence puzzles resolve an answer', R().puzzle.solved === true);
startPuzzle('lights-hard');
const lightsBefore = R().puzzle.values.join('');
toggleLightsCell(0);
T('Lights Out uses cross-shaped presses on a 4x4 board', R().puzzle.size === 4 && R().puzzle.values.join('') !== lightsBefore);
startPuzzle('nonogram');
R().puzzle.solution.forEach((value, i) => { if (value) toggleNonogramCell(i); });
checkLogicPuzzle();
T('nonogram clues have a complete solvable 5x5 answer', R().puzzle.solved === true && R().puzzle.rowClues.length === 5);
testLaunch('event', 'monty');
T('test lab can launch a named event directly', ui.screen === 'event' && R().event === 'monty' && R().testMode === true);
testLaunch('event', 'mean-median');
const eventGold = R().gold;
eventChoice('correct');
T('data-driven event choices resolve rewards and explanations', R().gold > eventGold && ui.modal?.html.includes('median'));
closeModal();

/* 10 — boss machinery: collapser devour + nn99 gate */
startCombat('boss');
const boss = cbt().enemies[0];
T('stratum-1 boss is the Collapser', boss.key === 'collapser');
T('boss combat queues its introduction once', ui.cutscene?.id === 'boss-intro-0');
closeCutscene();
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

  T('turn starts with 4 picks', cc.picks === PICKS_PER_TURN && PICKS_PER_TURN === 4);
  let used = 0;
  while (cc.picks > 0 && used < 10) {
    const t = hiddenIdx().find(i => !board().cells[i].mine && !board().cells[i].flag);
    if (t == null) break;
    clickTile(t);
    used++;
  }
  T('4 free clicks consume all picks', cc.picks === 0 && used === 4);
  const extra = hiddenIdx().find(i => !board().cells[i].mine && !board().cells[i].flag);
  if (extra != null) {
    clickTile(extra);
    T('5th free click is rejected', !board().cells[extra].revealed);
    revealTile(extra, 'card-safe');
    T('card reveals bypass the pick limit', board().cells[extra].revealed);
  } else console.log('skip  5th-click test (no hidden safe tile left)');
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

/* 13b — Continue (the autosave) resumes gameplay after returning home */
{
  const key = 'cryptsweeper.save.v1.auto';
  goHome();
  T('going home leaves a resumable autosave', JSON.parse(localStorage.getItem(key)).screen !== 'title');
  T('continue resumes into gameplay', loadRun('auto') && ui.screen !== 'title');
  const legacy = JSON.parse(localStorage.getItem(key));
  legacy.screen = 'title'; // saves written before the goHome fix look like this
  localStorage.setItem(key, JSON.stringify(legacy));
  T('title-stamped legacy autosave still resumes', loadRun('auto') && ui.screen !== 'title');
}

/* 14 — the daily challenge seed is repeatable */
{
  const signature = () => JSON.stringify({ nodes: R().map.nodes, edges: Object.fromEntries(Object.entries(R().map.edges).map(([k, v]) => [k, [...v]])) });
  newRun('surveyor', { daily: '2026-07-19' });
  const first = signature();
  newRun('surveyor', { daily: '2026-07-19' });
  T('same daily seed generates the same map', signature() === first);
}

/* 14b — daily records: attempts, results, on-time vs archive clears */
{
  const today = dailyDateKey();
  newRun('surveyor', { daily: '2026-01-05' });
  T('starting a daily records an attempt', loadDailyRecords()['2026-01-05']?.attempts === 1);
  recordDailyResult('2026-01-05', { won: true, score: 120, cls: 'surveyor' });
  let rec = loadDailyRecords()['2026-01-05'];
  T('archive clear is recorded but not on-time', rec.won === true && rec.onTime === false && rec.best === 120);
  recordDailyResult('2026-01-05', { won: false, score: 200, cls: 'sapper' });
  rec = loadDailyRecords()['2026-01-05'];
  T('best score improves and a win stays won', rec.won === true && rec.best === 200 && rec.cls === 'sapper');
  recordDailyAttempt(today);
  recordDailyResult(today, { won: true, score: 90, cls: 'surveyor' });
  T('clearing today counts as on the day', loadDailyRecords()[today].onTime === true);
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
  hiddenIdx().filter(i => !board().cells[i].scan).slice(0, 4).forEach(scanTile);
  T('Surveyor Field Method rewards four fresh scans', cbt().energy === energy0 + 1 && cbt().insight === insight0b + 1);

  newRun('terraformer'); startCombat('dig');
  const open = board().cells.findIndex(c => c.revealed && !c.void && !c.construct);
  const plating0 = cbt().plating;
  addConstruct(open, 'relay', { block: 2 });
  T('Terraformer Master Builder grants Plating', cbt().plating === plating0 + 2 && board().cells[open].construct?.kind === 'relay');
}

/* 16 — complete Delver roster, persistent unlocks, and the 200-card catalog */
{
  const classKeys = Object.keys(CLASSES);
  T('roster contains exactly 10 Delvers', classKeys.length === 10);
  T('every Delver has a valid 10-card starter deck and starter trinket', classKeys.every(cls =>
    CLASSES[cls].deck.length === 10
    && CLASSES[cls].deck.every(key => CARDS[key])
    && TRINKETS[CLASSES[cls].trinket]?.tier === 'starter'));
  T('catalog contains exactly 200 uniquely named cards', Object.keys(CARDS).length === 200
    && new Set(Object.values(CARDS).map(card => card.name)).size === 200);
  T('every Delver has at least 19 class cards', classKeys.every(cls =>
    Object.values(CARDS).filter(card => card.cls === cls).length >= 19));

  resetProgressionForTests();
  let progress = loadProgression();
  T('only the first three Delvers begin unlocked', classKeys.filter(cls => isDelverUnlocked(cls, progress)).join(',') === 'sapper,surveyor,terraformer');
  progress = recordProgress({ stratum: 1, gold: 225, upgrades: 5, safeReveals: 260, fullClears: 3, combat: { plating: 21 } }, 'map');
  T('achievement conditions persist and unlock six advanced Delvers', ['lamplighter','gambler','chirurgeon','archivist','warden','hexwright'].every(cls => isDelverUnlocked(cls, progress)));
  const winningRun = { stratum: 2, gold: 0, upgrades: 0, safeReveals: 0, fullClears: 0, combat: null, winRecorded: false };
  progress = recordProgress(winningRun, 'victory');
  T('a recorded win unlocks the Revenant once', isDelverUnlocked('revenant', progress) && progress.wins === 1 && winningRun.winRecorded);
}

/* 17 — bot uses JSON-sized state and advances exactly one public game action */
{
  newRun('lamplighter', { daily: 'smoke-bot' });
  const before = botObserve();
  const result = botStep({ policy: 'oracle' });
  T('bot observation is serializable', typeof JSON.stringify(before) === 'string');
  T('single-step bot enters exactly one reachable node', result.action.startsWith('enter:') && result.state.run.floors === before.run.floors + 1);
  newRun('surveyor', { daily: 'llm-controller' });
  const chosen = botLegalActions().find(action => action.type === 'enter-node');
  const acted = botAct(chosen);
  T('LLM controller exposes and executes validated legal actions', chosen && acted.screen === 'combat' && acted.run.floors === 1);
}

/* 18 — expanded pick economy and mechanic glossary markup */
{
  newRun('lamplighter', { daily: 'pick-economy' });
  startCombat('dig');
  const picks0 = cbt().picks;
  CARDS.exp_lamplighter_7.play(0);
  T('base pick economy starts at four and cards grant temporary picks',
    picks0 === 4 && cbt().maxPicks === 4 && cbt().picks === 5);

  CARDS.lanternloan.play(1);
  T('an upgraded card can raise current and max picks for combat',
    cbt().picks === 7 && cbt().maxPicks === 5);
  cbt().enemies[0].hp += 100;
  cbt().enemies[0].maxHp += 100;
  const enemyHp = cbt().enemies[0].hp;
  CARDS.hardlesson.play(0);
  T('pick-spending attacks consume current picks for impact',
    cbt().picks === 4 && cbt().enemies[0].hp === enemyHp - 18);
  CARDS.emergencyexit.play(0);
  T('trade-off cards can lower max picks in exchange for defense',
    cbt().maxPicks === 4 && cbt().picks === 4 && cbt().plating >= 12);

  newRun('lamplighter', { daily: 'pick-training' });
  campTrainPicks();
  campTrainPicks();
  campTrainPicks();
  saveRun('pick-training');
  newRun('lamplighter', { daily: 'pick-training-reset' });
  loadRun('pick-training');
  deleteSave('pick-training');
  startCombat('dig');
  T('camp training persists and raises max picks for the run up to its cap',
    R().pickBonus === 2 && cbt().maxPicks === PICKS_PER_TURN + 2 && cbt().picks === PICKS_PER_TURN + 2);

  const marked = decorateMechanics('Gain Block, Scan a tile, then earn a pick for Full Clear.');
  T('mechanic glossary decorates specific terms with interactive hooks',
    ['block', 'scan', 'picks', 'full clear'].every(key => marked.includes(`data-mechanic="${key}"`)));
}

console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
