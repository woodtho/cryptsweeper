/* Headless smoke test for the Cryptsweeper engine (no DOM, no React). */
import {
  run, ui, cbt, board,
  genBoard, solveScore, neighborsOf, numAt, hiddenIdx, isHiddenUsable,
  newRun, reachableNodes, startCombat, revealTile, openSafe, chordAt, endTurn,
  takeRewardCard, takeBossTrinket, takeVeinBoon, finishReward, genShop, buyShopCard,
  startPuzzle, puzzleClick, devourRing, hitEnemy, checkNNPhase,
  detonateForCards, fleeCombat,
  SHAPES, annexTiles, addMineAt, clickTile, basePicksFor,
  saveRun, listSaves, loadRun, deleteSave, goHome,
  scanTile, addConstruct,
  campTrainPicks, closeCutscene, closeBattlePreview, closeModal,
  EVENT_CATALOG, eventChoice, currentEventView, startSpecificEvent, setLogicPuzzleCell, checkLogicPuzzle, testLaunch,
  toggleLightsCell, toggleNonogramCell, answerSequence,
  clickHandCard, toggleFlag, campHeal, ENEMY_MODIFIERS, ENEMY_EFFECTS,
  applyEnemyEffect, enemyAttack, fogTiles, effCost, BOSS_RELIC_KEYS, VEIN_BOONS,
} from '../src/engine/engine.js';
import { CARDS, CLASSES, TRINKETS, STRATA, ENEMIES, PERSISTENT_CURSES } from '../src/engine/data.js';
import { loadProgression, recordProgress, isDelverUnlocked, resetProgressionForTests } from '../src/engine/progression.js';
import { loadDailyRecords, recordDailyAttempt, recordDailyResult, localDateKey as dailyDateKey } from '../src/engine/daily.js';
import { observe as botObserve, legalActions as botLegalActions, act as botAct, step as botStep } from '../src/bot/gameBot.js';
import { decorateMechanics, mechanicTextParts, MECHANICS } from '../src/ui/mechanics.js';
import { ACHIEVEMENTS, CHALLENGES, clearGraveyard, evaluateAchievements, loadAchievements, loadGraveyard, recordRunHistory } from '../src/engine/legacy.js';
import { loadPreferences, savePreferences } from '../src/engine/preferences.js';
import { readFileSync } from 'node:fs';

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
const safeResult = revealTile(safeHidden, 'reveal');
T('safe reveal opens tile', safeResult.safe);
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
    && neighborsOf(i, b2.size).some(j => isHiddenUsable(j) && b2.cells[j].mine && !b2.cells[j].flag)
    && neighborsOf(i, b2.size).some(j => isHiddenUsable(j) && !b2.cells[j].mine && !b2.cells[j].flag));
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

/* Plating is a persistent second defense against ordinary enemy attacks. */
{
  const enemy = cbt().enemies[0];
  const hpBefore = R().hp;
  cbt().block = 2;
  cbt().plating = 3;
  enemyAttack(enemy, 7);
  T('enemy attacks spend Block, then Plating, before Health',
    cbt().block === 0 && cbt().plating === 0 && R().hp === hpBefore - 2);
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

/* 6.25 — Chord is card-only; a matching count on the wrong tiles explodes when invoked */
{
  const b2 = board();
  const center = b2.cells.findIndex((cell, i) => !cell.void
    && neighborsOf(i, b2.size).filter(j => !b2.cells[j].void).length >= 2);
  const adjacent = neighborsOf(center, b2.size).filter(j => !b2.cells[j].void);
  const [mine, falseFlag] = adjacent;
  b2.cells[center].revealed = true;
  b2.cells[center].mine = false;
  b2.cells[center].flag = 0;
  for (const j of adjacent) {
    Object.assign(b2.cells[j], { revealed: false, entombed: false, crater: false, mine: false, flag: 0, scan: null });
  }
  b2.cells[mine].mine = true;
  b2.cells[falseFlag].flag = 1;
  R().hp = Math.max(R().hp, 100);
  cbt().instinctUsed = 99;
  cbt().powers.sixthsense = false;
  cbt().chordedThisTurn = false;
  const detonations0 = cbt().minesDetonated;
  clickTile(center);
  T('tapping a revealed number does not Chord', b2.cells[mine].mine === true && !b2.cells[mine].crater);
  const failedChord = chordAt(center);
  T('a same-count false flag detonates the unflagged mine', cbt().minesDetonated === detonations0 + 1);
  T('an inaccurate card Chord does not satisfy chord mechanics', failedChord.attempted && !failedChord.ok && cbt().chordedThisTurn === false);
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
T('puzzle board 6x6, 6-7 mines', R().puzzle.board.cells.length === 36 && [6, 7].includes(R().puzzle.board.cells.filter(x => x.mine).length));
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
T('event catalog contains exactly 111 discoverable encounters', Object.keys(EVENT_CATALOG).length === 111);
T('all events have titles, descriptions, and at least two choices', Object.values(EVENT_CATALOG).every(event => event.title && event.text && event.choices?.length >= 2));
T('every encounter uses the behavioral decision model', Object.values(EVENT_CATALOG).every(event => event.behavioral && event.concept && event.explanation && event.actions?.length === 2));
const roteKeys = new Set(['correct', 'wrong-a', 'wrong-b', 'prudent', 'risk', 'leave']);
T('no encounter exposes answer-key or formula-template choices', Object.values(EVENT_CATALOG).every(event => event.choices.every(choice => !roteKeys.has(choice.key) && !['correct', 'wrong', 'prudent', 'risk', 'leave'].includes(choice.outcome))));
T('no encounter asks the player to commit to an answer', Object.values(EVENT_CATALOG).every(event => !event.choices.some(choice => /commit to this answer/i.test(choice.desc || ''))));
const rotePrompt = /\b(what (?:is|does|happens)|which best|how many|roughly what|is often modeled|means what|is useful because)\b/i;
T('event prompts describe decisions rather than recall questions', Object.values(EVENT_CATALOG).every(event => !rotePrompt.test(event.text)));
startPuzzle('sudoku');
T('Sudoku puzzle has a persisted 4x4 solution and givens', R().puzzle.type === 'sudoku' && R().puzzle.values.length === 16 && R().puzzle.givens.length > 0);
R().puzzle.solution.forEach((value, i) => setLogicPuzzleCell(i, value));
checkLogicPuzzle();
T('Sudoku can be solved through engine actions', R().puzzle.solved === true);
startPuzzle('crossword');
T('crossword puzzle has a persisted 3x3 grid and distinct clue lists', R().puzzle.type === 'crossword'
  && R().puzzle.values.length === 9 && R().puzzle.acrossClues.length === 3 && R().puzzle.downClues.length === 3);
R().puzzle.solution.forEach((value, i) => setLogicPuzzleCell(i, value));
checkLogicPuzzle();
T('crossword can be solved through engine actions', R().puzzle.solved === true);
startPuzzle('mines-hard');
T('late Minesweeper expands to a no-guess 8x8 board with no free scans', R().puzzle.board.cells.length === 64 && R().puzzle.scans === 0);
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
const initialEventView = currentEventView();
const hiddenEventRoll = R().eventState.hiddenRoll;
T('events begin with generated stakes and an information choice', initialEventView.choices.length === 3 && initialEventView.choices.some(choice => choice.key === 'observe'));
saveRun('slot2');
eventChoice('observe');
T('buying information advances the event instead of ending it', ui.screen === 'event' && !ui.modal && R().eventState.observed && !currentEventView().choices.some(choice => choice.key === 'observe'));
loadRun('slot2');
T('mid-event saves preserve hidden outcomes without rerolling', ui.screen === 'event' && R().eventState.hiddenRoll === hiddenEventRoll && !R().eventState.observed);
eventChoice('observe');
eventChoice('a');
T('behavioral choices resolve with direct consequences and no lesson afterward', R().eventHistory.at(-1)?.id === 'mean-median'
  && Boolean(ui.modal?.html) && !ui.modal.html.includes('What this tested') && !ui.modal.html.includes('Mean versus median'));
const resolvedEventGold = R().gold;
const resolvedHistoryLength = R().eventHistory.length;
saveRun('slot2');
closeModal();
loadRun('slot2');
T('resolved event consequences resume after an app reload', ui.screen === 'event'
  && Boolean(ui.modal?.html) && !ui.modal.html.includes('What this tested'));
eventChoice('b');
T('a resumed resolved event cannot grant consequences twice', R().gold === resolvedEventGold && R().eventHistory.length === resolvedHistoryLength);
closeModal();
deleteSave('slot2');
testLaunch('event', 'anchoring');
saveRun('slot3');
const legacyEventSave = JSON.parse(localStorage.getItem('cryptsweeper.save.v1.slot3'));
delete legacyEventSave.run.eventState;
delete legacyEventSave.run.eventHistory;
localStorage.setItem('cryptsweeper.save.v1.slot3', JSON.stringify(legacyEventSave));
T('legacy event saves initialize the new decision state', loadRun('slot3') && ui.screen === 'event' && R().eventState?.stage === 'choice' && Array.isArray(R().eventHistory));
deleteSave('slot3');

let allEventPathsResolve = true;
for (const key of Object.keys(EVENT_CATALOG)) {
  for (const action of ['a', 'b']) {
    testLaunch('event', key);
    R().gold = 999; R().hp = R().maxHp;
    eventChoice(action);
    if (!ui.modal || R().hp < 1 || R().gold < 0 || R().eventState?.stage !== 'resolved') allEventPathsResolve = false;
    closeModal();
  }
}
T('both primary paths of all 100 events terminate safely', allEventPathsResolve);
let allInvestigationPathsResolve = true;
let investigatedEvents = 0;
for (const key of Object.keys(EVENT_CATALOG)) {
  testLaunch('event', key);
  R().gold = 999; R().hp = R().maxHp;
  if (!currentEventView().choices.some(choice => choice.key === 'observe')) continue;
  investigatedEvents++;
  eventChoice('observe');
  if (ui.modal || !R().eventState.observed || currentEventView().choices.some(choice => choice.key === 'observe')) allInvestigationPathsResolve = false;
  eventChoice('b');
  if (!ui.modal || R().eventState?.stage !== 'resolved') allInvestigationPathsResolve = false;
  closeModal();
}
T('information gathering is available on many uncertainty events', investigatedEvents >= 40);
T('every information-gathering path advances once and terminates safely', allInvestigationPathsResolve);
newRun('sapper', { daily: '2099-03-14' });
testLaunch('event', 'sealed-urn');
const seededEventState = JSON.stringify(R().eventState);
newRun('sapper', { daily: '2099-03-14' });
testLaunch('event', 'sealed-urn');
T('daily events generate identical hidden stakes and outcomes', JSON.stringify(R().eventState) === seededEventState);

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
T('NN-99 signal shield allows half damage before any safe reveals', nn.hp === nnHp - 5);
cbt().revealedThisTurn = 2;
hitEnemy(nn, 10);
T('NN-99 signal shield weakens progressively as safe tiles are revealed', nn.hp === nnHp - 13);
cbt().revealedThisTurn = 3;
hitEnemy(nn, 10);
T('NN-99 takes full damage after 3 safe reveals', nn.hp === nnHp - 23);
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

  const classPicks = basePicksFor(R().cls);
  T('turn starts with the selected Delver\'s picks', cc.picks === classPicks);
  let used = 0;
  while (cc.picks > 0 && used < 10) {
    const t = hiddenIdx().find(i => !board().cells[i].mine && !board().cells[i].flag);
    if (t == null) break;
    clickTile(t);
    used++;
  }
  T('the Delver\'s free clicks consume all picks', cc.picks === 0 && used === classPicks);
  const extra = hiddenIdx().find(i => !board().cells[i].mine && !board().cells[i].flag);
  if (extra != null) {
    clickTile(extra);
    T('an extra free click is rejected', !board().cells[extra].revealed);
    revealTile(extra, 'card-safe');
    T('card reveals bypass the pick limit', board().cells[extra].revealed);
  } else console.log('skip  extra-click test (no hidden safe tile left)');
  endTurn();
  if (R().combat && !cbt().over) T('picks reset next turn', cbt().picks === classPicks);
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
  const expectedBasePicks = {
    sapper: 3, surveyor: 5, terraformer: 4, lamplighter: 4, gambler: 4,
    chirurgeon: 3, archivist: 5, warden: 3, hexwright: 5, revenant: 4,
  };
  T('Delvers use the reviewed class-specific base-pick tiers', classKeys.every(cls =>
    basePicksFor(cls) === expectedBasePicks[cls])
    && new Set(classKeys.map(basePicksFor)).size === 3);
  T('every Delver enters combat with their own base picks', classKeys.every(cls => {
    newRun(cls, { testMode: true });
    startCombat('dig');
    return cbt().picks === expectedBasePicks[cls] && cbt().maxPicks === expectedBasePicks[cls];
  }));
T('catalog contains exactly 717 uniquely named cards', Object.keys(CARDS).length === 717
    && new Set(Object.values(CARDS).map(card => card.name)).size === 717);
T('Chord, Resonant Tap, and Stone Chorus are 0-Energy Chord cards',
  ['chordcard','resonanttap','stonechorus'].every(key => CARDS[key].cost[0] === 0 && CARDS[key].cost[1] === 0
    && CARDS[key].targets.includes('number')));
  T('eight healing cards provide varied, exhaust-limited recovery',
    ['bandage','mendingsalts','lastlight','stonepoultice','triagekit','gravemoss','secondwind']
      .every(key => CARDS[key]?.cls === 'neutral' && CARDS[key].exhaust && CARDS[key].can)
      && CARDS.bedrockshelter?.cls === 'terraformer' && CARDS.bedrockshelter.exhaust && CARDS.bedrockshelter.can);
  newRun('sapper', { daily:'healing-card' }); R().hp -= 20; startCombat('dig');
  const beforeBandage = R().hp; CARDS.bandage.play(0);
  T('Bandage restores persistent run HP without exceeding maximum HP', R().hp === beforeBandage + 4 && R().hp <= R().maxHp);
  newRun('sapper', { challenge:'brittle', daily:'brittle-healing-card' }); R().hp -= 20; startCombat('dig');
  const beforeSalts = R().hp; CARDS.mendingsalts.play(0);
  T('Brittle Bones also halves recovery from healing cards', R().hp === beforeSalts + 4);
  newRun('sapper', { daily:'enemy-condition-card' }); startCombat('boss');
  const conditionBoss = cbt().enemies[0];
  T('all enemy conditions explicitly support boss targets', conditionBoss.def.boss
    && Object.keys(ENEMY_EFFECTS).every(key => applyEnemyEffect(conditionBoss, key)));
  conditionBoss.block = 10; applyEnemyEffect(conditionBoss, 'sundered');
  T('Sundered immediately removes enemy Block', conditionBoss.block === 0);
  conditionBoss.effects.exposed = 1; conditionBoss.block = 0;
  const bossHpBeforeExposure = conditionBoss.hp; hitEnemy(conditionBoss, 8, { bypassGate:true, noNitro:true });
  T('Exposed increases the next boss hit by 25% and consumes a stack', bossHpBeforeExposure - conditionBoss.hp === 10 && conditionBoss.effects.exposed === 0);
  conditionBoss.effects.jammed = 1; R().hp = R().maxHp;
  const hpBeforeJam = R().hp; enemyAttack(conditionBoss, 10);
  T('Jammed reduces a boss direct attack by 40% and consumes a stack', hpBeforeJam - R().hp === 6 && conditionBoss.effects.jammed === 0);
  T('four neutral condition cards all target enemies and advertise boss support',
    ['faultline','signaljam','sunderingchalk','gravebind'].every(key => CARDS[key].hits === 'target' && CARDS[key].text(0).includes('boss')));
  T('every Delver has at least 64 class cards', classKeys.every(cls =>
    Object.values(CARDS).filter(card => card.cls === cls).length >= 64));

  const expansion = Object.entries(CARDS).filter(([key]) => key.startsWith('x500_'));
  const tierCount = tier => expansion.filter(([, card]) => card.designTier === tier).length;
  const allowedTargets = new Set(['hidden', 'open', 'number', 'row', 'anytile']);
  const requiredDesignFields = ['mechanicsUsed', 'archetype', 'value', 'entry', 'keepOrRemove', 'example', 'balanceRisks', 'tuningRange', 'overlap'];
  T('500-card expansion has the requested design distribution', expansion.length === 500
    && tierCount('common') === 150 && tierCount('uncommon') === 135
    && tierCount('rare') === 115 && tierCount('exceptional') === 50
    && tierCount('burden') === 50);
  T('all expansion definitions use existing card schema and mechanics hooks', expansion.every(([, card]) =>
    ['Attack', 'Skill', 'Status', 'Curse'].includes(card.type)
    && ['common', 'uncommon', 'rare', 'special'].includes(card.rarity)
    && Array.isArray(card.cost) && card.cost.length === 2 && card.cost.every(cost => Number.isInteger(cost) && cost >= 0 && cost <= 3)
    && Array.isArray(card.targets) && card.targets.every(target => allowedTargets.has(target))
    && typeof card.text === 'function' && typeof card.text(0) === 'string' && typeof card.text(1) === 'string'
    && typeof card.play === 'function'
    && requiredDesignFields.every(field => card.design?.[field] && (field !== 'mechanicsUsed' || Array.isArray(card.design[field])))));
  const burdens = expansion.filter(([, card]) => card.designTier === 'burden');
  T('all deck burdens stay outside normal rewards and retain player agency', burdens.every(([, card]) =>
    card.cls == null && card.rarity === 'special' && ['Status', 'Curse'].includes(card.type)
    && card.exhaust === true && !card.unplayable && !/lose \d+ HP/i.test(card.text(0))));

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
  const lampBasePicks = basePicksFor('lamplighter');
  const picks0 = cbt().picks;
  CARDS.exp_lamplighter_7.play(0);
  T('class base pick economy and cards grant temporary picks',
    picks0 === lampBasePicks && cbt().maxPicks === lampBasePicks && cbt().picks === lampBasePicks + 1);

  CARDS.lanternloan.play(1);
  T('an upgraded card can raise current and max picks for combat',
    cbt().picks === lampBasePicks + 3 && cbt().maxPicks === lampBasePicks + 1);
  cbt().enemies[0].hp += 100;
  cbt().enemies[0].maxHp += 100;
  const enemyHp = cbt().enemies[0].hp;
  CARDS.hardlesson.play(0);
  T('pick-spending attacks consume current picks for impact',
    cbt().picks === lampBasePicks && cbt().enemies[0].hp === enemyHp - 18);
  CARDS.emergencyexit.play(0);
  T('trade-off cards can lower max picks in exchange for defense',
    cbt().maxPicks === lampBasePicks && cbt().picks === lampBasePicks && cbt().plating >= 12);

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
    R().pickBonus === 2 && cbt().maxPicks === lampBasePicks + 2 && cbt().picks === lampBasePicks + 2);

  const marked = decorateMechanics('Gain Block, Scan a tile, then earn a pick for Full Clear.');
  T('mechanic glossary decorates specific terms with interactive hooks',
    ['block', 'scan', 'picks', 'full clear'].every(key => marked.includes(`data-mechanic="${key}"`)));
  const curseMarked = decorateMechanics('Claustrophobia (sometimes misspelled claustophobia) adds mines.');
  T('Claustrophobia and its common misspelling open the curse mechanic definition',
    (curseMarked.match(/data-mechanic="claustrophobia"/g) || []).length === 2);
  const tutorialSource = readFileSync(new URL('../src/ui/InteractiveTutorial.jsx', import.meta.url), 'utf8');
  const mechanicsLabSource = readFileSync(new URL('../src/ui/MechanicsLab.jsx', import.meta.url), 'utf8');
  const battleStorySource = readFileSync(new URL('../src/ui/BattleMechanicStory.jsx', import.meta.url), 'utf8');
  const mechanicTermsSource = readFileSync(new URL('../src/ui/MechanicTerms.jsx', import.meta.url), 'utf8');
  const rulebookSource = readFileSync(new URL('../src/ui/screens.jsx', import.meta.url), 'utf8');
  const collectionSource = readFileSync(new URL('../src/ui/CollectionIndex.jsx', import.meta.url), 'utf8');
  const combatScreenSource = readFileSync(new URL('../src/ui/CombatScreen.jsx', import.meta.url), 'utf8');
  const preferenceSource = readFileSync(new URL('../src/engine/preferences.js', import.meta.url), 'utf8');
  T('interactive tutorial contains eleven action-driven lessons without changing engine state',
    (tutorialSource.match(/^  \{ title:/gm) || []).length === 11
      && tutorialSource.includes('Practice crypt · no run progress affected')
      && !tutorialSource.includes("from '../engine/engine.js'"));
  T('guided lessons use real cards, restore snapshots, and require the complete card-only Chord sequence',
    tutorialSource.includes("import { CardView }")
      && tutorialSource.includes('setSnapshots')
      && tutorialSource.includes('cryptsweeper.tutorial.guided.v2')
      && tutorialSource.includes('function ChordPractice')
      && tutorialSource.includes('Target revealed 1 with Resonant Tap')
      && tutorialSource.includes('8 Block + 2 Plating absorb Attack 10'));
  T('Mechanics Lab covers every glossary mechanic plus every enemy modifier in five interactive sessions',
    Object.keys(MECHANICS).length === 49
      && Object.keys(MECHANICS).every(key => mechanicsLabSource.includes(`'${key}'`))
      && Object.keys(ENEMY_MODIFIERS).length === 4
      && mechanicsLabSource.includes('Object.entries(ENEMY_MODIFIERS)')
      && (mechanicsLabSource.match(/\{ key:'/g) || []).length === 5);
  T('Mechanics Lab requires answers, reports mistakes, and tracks per-mechanic completion',
    mechanicsLabSource.includes('mechanic-drill-choices')
      && mechanicsLabSource.includes('Check the altered detail')
      && mechanicsLabSource.includes('function alteredRule')
      && mechanicsLabSource.includes('setCompleted')
      && mechanicsLabSource.includes('cryptsweeper.tutorial.mechanics.v1')
      && mechanicsLabSource.includes('disabled={!correct || storyStep < 2}'));
  T('Mechanics Lab drills render the discussed mechanic icon or exact condition mark',
    mechanicsLabSource.includes('const MECHANIC_ICONS')
      && mechanicsLabSource.includes('Object.entries(ENEMY_EFFECTS)')
      && mechanicsLabSource.includes('name={entry.icon}')
      && mechanicsLabSource.includes('{entry.mark}'));
  T('correct Lab answers unlock a three-scene battle story with moving focus before progression',
    mechanicsLabSource.includes('correct && <BattleMechanicStory')
      && battleStorySource.includes("['preview','enemy','log']")
      && battleStorySource.includes("['card','board','log']")
      && battleStorySource.includes('scrollIntoView')
      && battleStorySource.includes('story-focus')
      && battleStorySource.includes('Perform the highlighted'));
  T('the optional combat coach teaches directly on the live battle UI and can be replayed from settings',
    preferenceSource.includes('showCombatHints: true')
      && combatScreenSource.includes('COMBAT_COACH_STEPS')
      && combatScreenSource.includes('combat-coach-focus')
      && rulebookSource.includes('Combat coach'));
  T('tutorial and rulebook prose automatically highlights and defines every recognized mechanic term',
    mechanicTextParts('Spend Energy, gain Block, and apply Exposed.').filter(part => part.key).length === 3
      && mechanicTermsSource.includes('data-mechanic={part.key}')
      && tutorialSource.includes('<MechanicTerms>')
      && rulebookSource.includes('<MechanicTerms>'));
  T('How to Play has search, alphabetical mechanics, and a complete enemy reference',
    rulebookSource.includes('Search How to Play')
      && rulebookSource.includes('a[1].name.localeCompare')
      && rulebookSource.includes('Object.entries(ENEMIES).sort')
      && rulebookSource.includes('Enemy and boss reference'));
  T('all ten Delvers have glossary definitions and complete rulebook starting-build documentation',
    Object.keys(CLASSES).every(key => MECHANICS[key]?.summary)
      && rulebookSource.includes('Starter trinket')
      && rulebookSource.includes('Starting deck · 10 cards')
      && rulebookSource.includes('card.text(0)'));
  T('all collection indexes use shared search controls and alphabetical name ordering',
    collectionSource.includes('function IndexSearch')
      && collectionSource.includes('a[1].name.localeCompare(b[1].name)')
      && ['delvers','enemies','cards','items'].every(kind => collectionSource.includes(`kind="${kind}"`)));
  T('every enemy has tutorial-reference text', Object.values(ENEMIES).every(enemy => enemy.name && enemy.desc));
}

/* ================= persistent curse family ================= */
{
  const curseKeys = Object.keys(PERSISTENT_CURSES);
  T('five persistent curse types have unplayable Curse cards', curseKeys.length === 5 && curseKeys.every(key =>
    CARDS[key]?.type === 'Curse' && CARDS[key].unplayable && CARDS[key].cost == null));

  newRun('sapper'); R().deck.push({ key:'claustrophobia', up:0 }); startCombat('dig');
  T('Claustrophobia adds two mines to each combat board', cbt().boardSpec.mines === STRATA[0].mines + 2);

  newRun('sapper'); R().deck.push({ key:'vertigo', up:0 }); startCombat('dig');
  T('Vertigo reduces max Picks for the combat', cbt().maxPicks === basePicksFor('sapper') - 1);

  newRun('sapper'); R().deck.push({ key:'exhaustion', up:0 }); startCombat('dig');
  T('Exhaustion reduces normal cards drawn per turn', cbt().hand.length === 4);

  newRun('sapper'); R().deck.push({ key:'nightterrors', up:0 }); startCombat('dig');
  T('Night Terrors removes first-turn Energy without lowering max Energy', cbt().energy === cbt().maxEnergy - 1);

  newRun('sapper'); R().deck.push({ key:'paranoia', up:0 }); startCombat('dig');
  T('Paranoia starts combat with a false flag on a safe tile', board().cells.some(cell => cell.flag === 1 && !cell.mine));

  newRun('sapper'); R().deck.push(...Array.from({ length:10 }, () => ({ key:'vertigo', up:0 }))); startCombat('dig');
  const pickFloor = cbt().maxPicks === 1;
  newRun('sapper'); R().deck.push(...Array.from({ length:10 }, () => ({ key:'exhaustion', up:0 }))); startCombat('dig');
  const drawFloor = cbt().hand.length === 3;
  newRun('sapper'); R().deck.push(...Array.from({ length:10 }, () => ({ key:'nightterrors', up:0 }))); startCombat('dig');
  T('stacked economic curses respect their playable floors', pickFloor && drawFloor && cbt().energy === 0);

  const eventCurses = new Set(); let eventApplied = true;
  for (let i = 0; i < 80; i++) {
    newRun('sapper', { daily:`persistent-curse-${i}`, testMode:true }); closeCutscene(); startSpecificEvent('corpse');
    const curse = R().eventState.curseKey;
    eventCurses.add(curse); eventChoice('b');
    eventApplied &&= R().deck.some(card => card.key === curse);
    closeModal();
  }
  T('curse-bearing events can apply every persistent curse type', eventApplied && curseKeys.every(key => eventCurses.has(key)));
}

/* ================= single free edition: no purchase or paywall gates ================= */
{
  newRun('hexwright');
  T('late-roster Delvers can start once selected', R() && R().cls === 'hexwright');

  newRun('sapper');
  R().stratum = 0;
  R().reward = { kind: 'boss', cards: [], cardTaken: true };
  finishReward();
  T('Stratum 1 boss reward advances directly to Stratum 2', R().stratum === 1 && ui.screen === 'map');

  R().reward = { kind: 'boss', cards: [], cardTaken: true };
  finishReward();
  T('Stratum 2 boss reward advances directly to Stratum 3', R().stratum === 2 && ui.screen === 'map');

  R().reward = { kind: 'boss', cards: [], cardTaken: true };
  finishReward();
  const roamingVeinBosses = R().map.nodes.slice(0, -1)
    .reduce((count, row) => count + Object.values(row).filter(type => type === 'boss').length, 0);
  T('NN-99 opens the endless fourth stratum without ending the run',
    R().stratum === 3 && R().coreWon && ui.screen === 'map' && R().map.nodes[11][2] === 'boss');
  T('Vein maps place bosses away from the bottom', roamingVeinBosses >= 1);

  R().veinDepth = 12; R().pos = { r:11, c:2 };
  R().reward = { kind:'boss', cards:[], cardTaken:true, veinExit:true };
  finishReward();
  T('bottom Vein guardians generate another segment and preserve total depth',
    R().stratum === 3 && R().veinSegments === 1 && R().veinDepth === 12 && R().pos === null && ui.screen === 'map');
}

/* ================= expanded boss relics and endless Vein rewards ================= */
{
  T('boss relic pool contains ten permanent build-changing relics',
    BOSS_RELIC_KEYS.length === 10 && BOSS_RELIC_KEYS.every(key => TRINKETS[key]?.tier === 'boss'));

  newRun('sapper', { daily:'boss-relic-offer', testMode:true });
  testLaunch('reward', 'boss');
  const firstOffer = [...R().reward.bossTrinkets];
  T('boss rewards offer three unowned relics with guardian-themed choices',
    firstOffer.length === 3 && firstOffer.some(key => TRINKETS[key]?.boss === 'collapser'));
  takeBossTrinket(firstOffer[0]);
  T('choosing a boss relic records one permanent reward and closes the offer',
    R().trinkets.includes(firstOffer[0]) && R().reward.bossTrinkets === null);

  newRun('sapper', { daily:'dowsing-rod', testMode:true });
  R().trinkets.push('dowsingrod');
  startCombat('dig');
  const scanCard = { id:987650, key:'scancard', up:0 };
  cbt().hand.unshift(scanCard);
  const flagTarget = hiddenIdx().find(i => board().cells[i].flag === 0);
  toggleFlag(flagTarget);
  T('Dowsing Rod keeps manual flags available and makes the first Scan card free',
    board().cells[flagTarget].flag === 1 && effCost(scanCard) === 0);
  T('Dowsing Rod begins each turn with safe guidance or a verified mine',
    board().cells.some(cell => cell.glow || cell.flag === 2));

  newRun('sapper', { daily:'boss-relic-hooks', testMode:true });
  R().trinkets.push('bedrockheart', 'veincompass', 'protocolcoil', 'wardenseal', 'fogglass');
  startCombat('dig');
  const startPlating = cbt().plating;
  const normalCard = cbt().hand.find(card => CARDS[card.key].cost?.[card.up ? 1 : 0] > 0);
  const normalCost = normalCard ? CARDS[normalCard.key].cost[normalCard.up ? 1 : 0] : 0;
  const fogBefore = board().cells.filter(cell => cell.revealed).length;
  fogTiles(5);
  cbt().block = 0; cbt().plating = 0;
  const hpBeforeSeal = R().hp;
  enemyAttack(cbt().enemies[0], 10);
  T('defensive and economy relic hooks apply at combat start',
    cbt().maxPicks === basePicksFor('sapper') + 1 && normalCard && effCost(normalCard) === Math.max(0, normalCost - 1));
  T('Bedrock Heart, Fogglass Prism, and Warden Seal apply their distinct defenses',
    startPlating >= 8 && fogBefore === board().cells.filter(cell => cell.revealed).length && R().hp === hpBeforeSeal - 4);

  newRun('sapper', { daily:'vein-boon-offer', testMode:true });
  R().stratum = 3;
  R().trinkets = [...new Set([...R().trinkets, ...BOSS_RELIC_KEYS])];
  testLaunch('reward', 'boss');
  const boonOffer = [...R().reward.veinBoons];
  const maxBeforeBoon = R().maxHp;
  R().reward.veinBoons = ['vitality', ...boonOffer.filter(key => key !== 'vitality').slice(0, 2)];
  takeVeinBoon('vitality');
  T('exhausting the permanent pool produces three repeatable Vein boons',
    boonOffer.length === 3 && boonOffer.every(key => VEIN_BOONS[key]));
  T('Living Ore applies and records its repeatable maximum-Health boon',
    R().maxHp === maxBeforeBoon + 8 && R().veinBoons.vitality === 1 && R().reward.veinBoons === null);
  R().reward = { kind:'boss', veinBoons:['resonance'], bossTrinkets:null };
  takeVeinBoon('resonance');
  T('Relic Temper permanently upgrades one owned boss relic',
    Object.values(R().relicUpgrades).reduce((total, level) => total + level, 0) === 1
      && R().veinBoons.resonance === 1);
}

/* ================= feedback, legacy, modifiers, chains, and challenges ================= */
{
  newRun('sapper', { challenge:'cursed', daily:'challenge-cursed' });
  T('Debt Below challenge starts with two persistent curses and bonus gold',
    R().deck.length === 12 && R().gold === 150 && R().deck.filter(card => PERSISTENT_CURSES[card.key]).length === 2);

  newRun('sapper', { challenge:'lean', daily:'challenge-lean' });
  T('Lean Descent starts with the promised eight-card low-gold build', R().deck.length === 8 && R().gold === 20);

  newRun('sapper', { challenge:'afflicted', daily:'challenge-afflicted' }); startCombat('dig');
  T('Afflicted Host gives every non-boss enemy a recognized modifier',
    cbt().enemies.length > 0 && cbt().enemies.every(enemy => ENEMY_MODIFIERS[enemy.modifier]));
  T('combat start queues a dismissible enemy briefing with the live lineup',
    Boolean(ui.battlePreview) && cbt().enemies.every(enemy => enemy.hp > 0 && enemy.intent));
  closeBattlePreview();
  T('enemy briefing can be dismissed before playing', ui.battlePreview === null);
  savePreferences({ ...loadPreferences(), showBattleBriefings:false });
  newRun('sapper', { daily:'briefing-disabled' }); startCombat('dig');
  T('disabled battle briefings stay hidden for later combats', ui.battlePreview === null);
  savePreferences({ ...loadPreferences(), showBattleBriefings:true });

  const modifierProof = { armoured:false, burrowing:false, unstable:false, cursed:false };
  for (let i = 0; i < 120 && !Object.values(modifierProof).every(Boolean); i++) {
    newRun('sapper', { challenge:'afflicted', daily:`modifier-proof-${i}` }); startCombat('dig');
    const enemy = cbt().enemies[0];
    if (enemy.modifier === 'armoured') modifierProof.armoured = enemy.block >= 8;
    if (enemy.modifier === 'cursed') modifierProof.cursed = cbt().discard.some(card => card.key === 'dud');
    if (enemy.modifier === 'burrowing') {
      const startedBuried = enemy.data.modifierBuried && enemy.data.buried;
      enemy.maxHp += 500; enemy.hp += 500;
      for (const idx of hiddenIdx().filter(idx => !board().cells[idx].mine)) {
        openSafe(idx);
        if (!enemy.data.modifierBuried) break;
      }
      modifierProof.burrowing = startedBuried && !enemy.data.modifierBuried && !enemy.data.buried;
    }
    if (enemy.modifier === 'unstable') {
      enemy.block = 0;
      cbt().plating = 2;
      const before = R().hp;
      hitEnemy(enemy, enemy.hp, { bypassGate:true, noNitro:true });
      modifierProof.unstable = cbt().plating === 0 && R().hp === before - Math.max(0, 3 + R().stratum * 2 - 2);
    }
  }
  T('Armoured, Burrowing, Unstable, and Cursed modifiers each apply their distinct behavior',
    Object.values(modifierProof).every(Boolean));

  newRun('sapper', { challenge:'noflags', daily:'challenge-noflags' }); startCombat('dig');
  const noFlagPicks = cbt().maxPicks === basePicksFor('sapper') + 1;
  const hidden = hiddenIdx()[0]; toggleFlag(hidden);
  T('Unmarked Stone forbids flags and grants one Pick', noFlagPicks && board().cells[hidden].flag === 0);

  newRun('sapper', { challenge:'brittle', daily:'challenge-brittle' }); R().hp = 1;
  const expectedBrittle = Math.min(R().maxHp, 1 + Math.ceil(Math.floor(R().maxHp * .3) / 2));
  campHeal();
  T('Brittle Bones halves camp healing', R().hp === expectedBrittle);
  T('challenge catalog exposes seven selectable rule sets including two Vein modes',
    Object.keys(CHALLENGES).length === 7 && CHALLENGES.veinbound && CHALLENGES.wardenroad);

  newRun('sapper', { challenge:'veinbound', daily:'challenge-veinbound' });
  T('Veinbound begins in the fourth stratum with its expedition loadout',
    R().stratum === 3 && R().gold === 150 && R().pickBonus === 2 && R().trinkets.includes('lamp')
      && R().deck.filter(card => card.up).length === 3);

  newRun('sapper', { challenge:'wardenroad', daily:'challenge-wardenroad' });
  const wardenBosses = R().map.nodes.slice(0, -1)
    .reduce((count, row) => count + Object.values(row).filter(type => type === 'boss').length, 0);
  startCombat('dig');
  T('Warden Current adds roaming bosses and combat support',
    wardenBosses >= 3 && cbt().plating >= 6 && cbt().maxEnergy >= 5);

  newRun('sapper', { daily:'invalid-card-feedback' }); startCombat('dig');
  cbt().hand.unshift({ id:999999, key:'claustrophobia', up:0 });
  clickHandCard(0);
  T('invalid card actions provide a specific reason and shake target',
    ui.invalidCard?.cardId === 999999 && ui.invalidCard.message.includes('cannot be played'));

  newRun('sapper', { daily:'event-chain' }); startSpecificEvent('corpse'); eventChoice('b');
  const thread = R().eventThreads.corpse;
  R().event = 'corpse'; R().eventState = { chainReturn:true, threadKey:'corpse' };
  const remembered = currentEventView(); eventChoice('stand');
  T('event choices return later with remembered text and consequences',
    thread?.stage === 2 && remembered.stageLabel === 'A choice remembered' && R().eventHistory.some(row => row.chain));

  clearGraveyard();
  newRun('sapper', { challenge:'lean', daily:'graveyard-record' });
  R().lastDamageSource = 'The test stone'; R().bossesDefeated = ['collapser'];
  const grave = recordRunHistory(R(), false);
  const savedGraves = loadGraveyard();
  T('graveyard records build, death cause, bosses, challenge, and run records',
    grave && savedGraves[0].cause === 'The test stone' && savedGraves[0].bosses[0] === 'collapser'
      && savedGraves[0].challenge === 'lean' && savedGraves[0].deck.length === 8);

  storage.delete('cryptsweeper.achievements.v1');
  R().fullClears = 1; R().bossesDefeated = ['collapser']; R().gold = 260;
  const fresh = evaluateAchievements(R(), 'map');
  T('achievement ledger persists independently earned milestones',
    fresh.length >= 3 && Object.keys(loadAchievements()).every(key => ACHIEVEMENTS[key]));
}

console.log(failures ? `\n${failures} FAILURES` : '\nALL PASS');
process.exit(failures ? 1 : 0);
