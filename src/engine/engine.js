/* CRYPTSWEEPER — game engine (DOM-free). React subscribes via subscribe/getVersion;
   every exported action mutates state then notify()s. Content data lives in data.js. */
import {
  STRATA, CLASSES, CARDS, TRINKETS, GADGETS, ENEMIES, FIGHTS, NN99_PHASES, PERSISTENT_CURSES,
} from './data.js';
import { sfx } from './sfx.js';
import { haptic } from './haptics.js';
import { recordProgress } from './progression.js';
import {
  recordEnemySeen, recordEnemyDefeated, recordCardSeen, recordCardOwned, recordCardPlayed,
  recordItemSeen, recordItemOwned, seedRunCollection, recordDelverProgress,
} from './collection.js';
import { recordDailyAttempt, recordDailyResult } from './daily.js';
import { evaluateAchievements, recordRunHistory } from './legacy.js';
import {
  EXTRA_EVENT_CATALOG, CORE_BEHAVIORAL_EVENTS,
  createBehavioralEventState, behavioralEventView, resolveBehavioralEvent,
} from './events.js';
import {
  sudokuShape, solveSudoku, countSudokuSolutions, sudokuDifficulty,
  nonogramClues, countNonogramSolutions, minimumLightsSolution, validateCrossword,
} from './puzzleValidation.js';

/* ================= store ================= */
const listeners = new Set();
let version = 0;
export function subscribe(cb) { listeners.add(cb); return () => listeners.delete(cb); }
export function getVersion() { return version; }
function notify() {
  version++;
  const freshAchievements = evaluateAchievements(run, ui.screen);
  if (freshAchievements.length) ui.achievement = { ...freshAchievements[0], id: Date.now() };
  recordProgress(run, ui.screen);
  recordDelverProgress(run, ui.screen);
  /* never stamp 'title' into the autosave — Continue must resume gameplay */
  if (run && ui.screen !== 'title') persistRun('auto');
  for (const cb of listeners) cb();
}

/* ================= utils ================= */
function random() {
  if (!run?.daily || !Number.isInteger(run.rngState)) return Math.random();
  let x = run.rngState | 0;
  x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
  run.rngState = x | 0;
  return (x >>> 0) / 4294967296;
}
export function randInt(n) { return Math.floor(random() * n); }
export function randPick(arr) { return arr && arr.length ? arr[randInt(arr.length)] : null; }
export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = randInt(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }
function effectiveHealing(n) { return run?.challenge === 'brittle' ? Math.ceil(n / 2) : n; }
let _cardId = 0;
function mkCard(key, up = 0) { return { id: ++_cardId, key, up }; }

/* ================= global state ================= */
export let run = null;
export const ui = {
  screen: 'title', targeting: null, gadgetTargeting: null, flagMode: false,
  modal: null, cutscene: null, toasts: [], shakeSeq: 0, dmg: [],
  invalidCard: null, deckChange: null, achievement: null,
};

const SAVE_VERSION = 1;
const SAVE_PREFIX = 'cryptsweeper.save.v1.';
const slotKey = slot => `${SAVE_PREFIX}${slot}`;

function saveReplacer(key, value) {
  if (key === 'def') return undefined;
  if (value instanceof Set) return { __cryptSet: [...value] };
  return value;
}

function saveReviver(key, value) {
  return value && Array.isArray(value.__cryptSet) ? new Set(value.__cryptSet) : value;
}

function saveSummary(slot, payload) {
  const r = payload.run;
  return {
    slot, savedAt: payload.savedAt, cls: r.cls, hp: r.hp, maxHp: r.maxHp,
    stratum: r.stratum, floors: r.floors, daily: r.daily || null,
  };
}

function persistRun(slot) {
  if (typeof localStorage === 'undefined' || !run) return false;
  try {
    const payload = { version: SAVE_VERSION, savedAt: Date.now(), screen: ui.screen, cutscene: ui.cutscene, run };
    localStorage.setItem(slotKey(slot), JSON.stringify(payload, saveReplacer));
    return true;
  } catch { return false; }
}

export function saveRun(slot) {
  const ok = persistRun(slot);
  if (ok) toast(`Run saved to ${slot === 'auto' ? 'autosave' : slot}`);
  return ok;
}

export function listSaves() {
  if (typeof localStorage === 'undefined') return [];
  return ['auto', 'slot1', 'slot2', 'slot3'].flatMap(slot => {
    try {
      const raw = localStorage.getItem(slotKey(slot));
      if (!raw) return [];
      const payload = JSON.parse(raw, saveReviver);
      return payload.version === SAVE_VERSION && payload.run ? [saveSummary(slot, payload)] : [];
    } catch { return []; }
  });
}

export function loadRun(slot) {
  try {
    const payload = JSON.parse(localStorage.getItem(slotKey(slot)) || '', saveReviver);
    if (payload.version !== SAVE_VERSION || !payload.run) return false;
    run = payload.run;
    run.upgrades ??= 0;
    run.winRecorded ??= false;
    run.pickBonus ??= 0;
    run.seenCutscenes ??= [];
    run.eventHistory ??= [];
    run.eventThreads ??= {};
    run.bossesDefeated ??= [];
    run.challenge ??= null;
    run.lastDamageSource ??= null;
    run.runId ??= `${payload.savedAt || Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    run.historyRecorded ??= false;
    run.eventState ??= null;
    if (run.puzzle?.type === 'sudoku') {
      run.puzzle.size ??= 4;
      run.puzzle.boxRows ??= run.puzzle.size === 6 ? 2 : Math.sqrt(run.puzzle.size);
      run.puzzle.boxCols ??= run.puzzle.size === 6 ? 3 : Math.sqrt(run.puzzle.size);
      run.puzzle.notes ??= Array.from({ length: run.puzzle.size * run.puzzle.size }, () => []);
      run.puzzle.noteMode ??= false;
    }
    if (run.puzzle?.type === 'nonogram') {
      run.puzzle.values = run.puzzle.values.map(value => value === 1 ? 1 : value === 2 ? 2 : 0);
    }
    if (run.combat?.enemies) {
      for (const enemy of run.combat.enemies) {
        enemy.def = ENEMIES[enemy.key]; enemy.modifier ??= null; enemy.data ??= {};
      }
      if (run.combat.picks == null) run.combat.picks = basePicksFor(run.cls);
      if (run.combat.maxPicks == null) run.combat.maxPicks = basePicksFor(run.cls) + run.pickBonus + (run.trinkets.includes('pitons') ? 1 : 0);
      run.combat.powers = {
        powderkeg: 0, sixthsense: false, sixthUsed: false, leylines: 0,
        blastDividend: false, blastDividendUsed: false, stonechoir: false,
        ...run.combat.powers,
      };
      run.combat.classState = {
        passiveUsed: false, scanCount: 0, kindleUsed: false, luckyUsed: false,
        painUsed: false, exhaustUsed: false, deathUsed: false,
        ...run.combat.classState,
      };
    }
    _cardId = Math.max(_cardId, ...run.deck.map(c => c.id || 0));
    seedRunCollection(run);
    /* older autosaves could be stamped 'title' by goHome — resume into gameplay */
    ui.screen = !payload.screen || payload.screen === 'title'
      ? (run.combat ? 'combat' : 'map')
      : payload.screen;
    /* Purchase-era saves could stop between strata on a retired paywall. Send
       them back to their boss reward so Finish can continue the now-free run. */
    if (ui.screen === 'paywall') ui.screen = run.reward ? 'reward' : 'map';
    if (ui.screen === 'event' && run.event && !run.eventState) prepareEventState(run.event);
    const resumedEventResult = ui.screen === 'event' && run.eventState?.stage === 'resolved' && run.eventState.result
      ? { kind: 'info', ...run.eventState.result, btn: 'Continue', next: 'map' }
      : null;
    ui.targeting = null; ui.gadgetTargeting = null; ui.modal = resumedEventResult; ui.flagMode = false;
    ui.cutscene = payload.cutscene || null;
    notify();
    return true;
  } catch { return false; }
}

export function deleteSave(slot) {
  try { localStorage.removeItem(slotKey(slot)); } catch { /* storage unavailable */ }
}

export function goHome() {
  persistRun('auto'); // capture the resumable screen before leaving it
  ui.screen = 'title';
  ui.targeting = null; ui.gadgetTargeting = null; ui.modal = null; ui.cutscene = null; ui.flagMode = false;
  notify();
}

/* floating combat numbers: {id, kind: 'enemy'|'player', idx?, amount, note?} */
let _dmgId = 0;
function pushDmg(fx) {
  fx.id = ++_dmgId;
  ui.dmg.push(fx);
  if (ui.dmg.length > 12) ui.dmg.shift();
  const t = setTimeout(() => {
    ui.dmg = ui.dmg.filter(x => x.id !== fx.id);
    notify();
  }, 950);
  if (t && typeof t.unref === 'function') t.unref();
}

export function cbt() { return run.combat; }
export function board() { return run?.combat?.board || null; }
export function hasT(key) { return run.trinkets.includes(key); }

function dailySeed(date) {
  let h = 2166136261;
  for (const ch of date) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  return h | 0 || 1;
}

export function newRun(clsKey, options = {}) {
  const cls = CLASSES[clsKey];
  const deck = (cls.deck || ['probe', 'probe', 'probe', 'probe', 'probe', 'brace', 'brace', 'brace', 'brace', cls.sig])
    .map(key => mkCard(key));
  run = {
    cls: clsKey, hp: cls.hp + (cls.trinket === 'fieldkit' ? 8 : 0),
    maxHp: cls.hp + (cls.trinket === 'fieldkit' ? 8 : 0), gold: 50,
    deck, trinkets: [cls.trinket], gadgets: [],
    stratum: 0, map: null, pos: null, visited: {},
    floors: 0, fullClears: 0, safeReveals: 0, removalCost: 75,
    surveyNext: false, seenEvents: [], combat: null, upgrades: 0, pickBonus: 0, winRecorded: false,
    reward: null, shop: null, event: null, eventState: null, eventHistory: [], eventThreads: {}, puzzle: null, seenCutscenes: [],
    bossesDefeated: [], lastDamageSource: null, challenge: options.challenge || null,
    runId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, historyRecorded: false,
    daily: options.daily || null, testMode: Boolean(options.testMode),
    rngState: options.daily ? dailySeed(options.daily) : null,
  };
  if (run.challenge === 'cursed') {
    for (let i = 0; i < 2; i++) run.deck.push(mkCard(randPick(Object.keys(PERSISTENT_CURSES))));
    run.gold += 100;
  } else if (run.challenge === 'lean') {
    run.deck = run.deck.slice(0, 8); run.gold = 20;
  }
  genMapForStratum();
  seedRunCollection(run);
  if (run.daily) recordDailyAttempt(run.daily);
  ui.screen = 'map';
  queueCutscene('opening', {}, true);
  notify();
}

export function resetToTitle() {
  try { localStorage.removeItem(slotKey('auto')); } catch { /* storage unavailable */ }
  run = null;
  ui.screen = 'title';
  ui.targeting = null; ui.gadgetTargeting = null; ui.modal = null; ui.cutscene = null; ui.flagMode = false;
  notify();
}

function queueCutscene(id, context = {}, once = false) {
  if (!run) return false;
  run.seenCutscenes ??= [];
  if (once && run.seenCutscenes.includes(id)) return false;
  if (once) run.seenCutscenes.push(id);
  ui.cutscene = { id, context };
  return true;
}

export function closeCutscene() {
  if (!ui.cutscene) return;
  ui.cutscene = null;
  notify();
}

/* ================= toast / log / modal ================= */
let _toastId = 0;
export function toast(msg, bad = false) {
  const id = ++_toastId;
  ui.toasts.push({ id, msg, bad });
  const t = setTimeout(() => {
    ui.toasts = ui.toasts.filter(x => x.id !== id);
    notify();
  }, 2600);
  if (t && typeof t.unref === 'function') t.unref();
  notify();
}
function invalidCardFeedback(card, message) {
  sfx('invalid'); haptic('invalid');
  ui.invalidCard = { seq: (ui.invalidCard?.seq || 0) + 1, cardId: card?.id ?? null, message };
  toast(message, true);
}
function deckChanged(kind, label) {
  sfx(kind === 'upgrade' ? 'upgrade' : kind === 'remove' ? 'remove' : 'cardadd');
  ui.deckChange = { id: Date.now() + Math.random(), kind, label };
}
export function log(msg) {
  if (run && run.combat) {
    run.combat.log.push(msg);
    if (run.combat.log.length > 60) run.combat.log.shift();
  }
}
function openModal(modal) { ui.modal = modal; notify(); }
export function closeModal() {
  const m = ui.modal;
  ui.modal = null;
  if (m && m.next) ui.screen = m.next;
  notify();
}
export function openDeckModal() { openModal({ kind: 'deck' }); }
export function openPileModal(which) {
  const c = cbt();
  const cards = which === 'draw' ? shuffle(c.draw) : c[which].slice();
  openModal({ kind: 'pile', which, cards });
}

/* ================= map ================= */
export const MAP_ROWS = 12, MAP_W = 5;
function genMapForStratum() {
  const nodes = Array.from({ length: MAP_ROWS }, () => ({}));
  const edges = {};
  const addEdge = (r, c, nc) => { (edges[`${r},${c}`] ??= new Set()).add(nc); };
  const starts = shuffle([0, 1, 2, 3, 4]).slice(0, 3);
  for (const s of starts) {
    let c = s;
    for (let r = 0; r < MAP_ROWS - 2; r++) {
      nodes[r][c] = nodes[r][c] || 'dig';
      const nc = clamp(c + randInt(3) - 1, 0, MAP_W - 1);
      addEdge(r, c, nc);
      c = nc;
    }
    nodes[MAP_ROWS - 2][c] = 'camp';
    addEdge(MAP_ROWS - 2, c, 2);
  }
  nodes[MAP_ROWS - 1] = { 2: 'boss' };
  for (let r = 1; r < MAP_ROWS - 2; r++) {
    for (const c of Object.keys(nodes[r])) {
      const roll = random();
      let t = 'dig';
      if (roll < 0.20) t = 'event';
      else if (roll < 0.32) t = r >= 4 ? 'elite' : 'dig';
      else if (roll < 0.40) t = 'shop';
      else if (roll < 0.47) t = 'camp';
      nodes[r][c] = t;
    }
  }
  const r5cols = Object.keys(nodes[5]);
  if (r5cols.length) nodes[5][randPick(r5cols)] = 'treasure';
  let hasShop = false;
  for (let r = 1; r < MAP_ROWS - 2; r++) for (const c of Object.keys(nodes[r])) if (nodes[r][c] === 'shop') hasShop = true;
  if (!hasShop) { const cols = Object.keys(nodes[6]); if (cols.length) nodes[6][randPick(cols)] = 'shop'; }
  run.map = { nodes, edges };
  run.pos = null;
  run.visited = {};
}

export function reachableNodes() {
  const m = run.map;
  if (!run.pos) return Object.keys(m.nodes[0]).map(c => ({ r: 0, c: +c }));
  const set = m.edges[`${run.pos.r},${run.pos.c}`];
  if (!set) return [];
  return [...set].filter(c => m.nodes[run.pos.r + 1][c] !== undefined).map(c => ({ r: run.pos.r + 1, c }));
}

/* every node reachable by walking edges downward from (r, c), plus (r, c)
   itself — the map screen uses this to prune dead branches and to preview a
   held node's futures */
export function mapClosure(m, r, c) {
  const keep = new Set([`${r},${c}`]);
  let frontier = [[r, c]];
  while (frontier.length) {
    const next = [];
    for (const [fr, fc] of frontier) {
      for (const nc of m.edges[`${fr},${fc}`] || []) {
        if (m.nodes[fr + 1]?.[nc] === undefined) continue;
        const key = `${fr + 1},${nc}`;
        if (!keep.has(key)) { keep.add(key); next.push([fr + 1, nc]); }
      }
    }
    frontier = next;
  }
  return keep;
}

export function enterNode(r, c) {
  if (!reachableNodes().some(n => n.r === r && n.c === c)) return;
  run.pos = { r, c };
  run.visited[`${r},${c}`] = true;
  run.floors++;
  sfx('turn');
  const type = run.map.nodes[r][c];
  if (type === 'dig' || type === 'elite' || type === 'boss') startCombat(type);
  else if (type === 'camp') { ui.screen = 'camp'; queueCutscene('camp', {}, true); notify(); }
  else if (type === 'shop') { genShop(); ui.screen = 'shop'; queueCutscene('shop', { stratum: run.stratum }); notify(); }
  else if (type === 'treasure') grantTreasure();
  else if (type === 'event') startEvent();
}

function grantTreasure() {
  const t = unownedTrinket();
  if (t) {
    run.trinkets.push(t);
    openModal({
      kind: 'info', title: '🎁 Buried cache', btn: 'Take it', next: null,
      html: `<p>You pry open a strongbox: <b>${TRINKETS[t].emoji} ${TRINKETS[t].name}</b></p><p class="dim">${TRINKETS[t].desc}</p>`,
    });
  } else {
    run.gold += 45;
    openModal({
      kind: 'info', title: '🎁 Buried cache', btn: 'Continue', next: null,
      html: `<p>Nothing but coin. <b class="gold">+45 gold</b>.</p>`,
    });
  }
}
function unownedTrinket() {
  const pool = Object.keys(TRINKETS).filter(k => !run.trinkets.includes(k) && !['starter', 'boss'].includes(TRINKETS[k].tier));
  return randPick(pool);
}

/* ================= board generation ================= */
function idxOf(r, c, size) { return r * size + c; }
export function neighborsOf(i, size) {
  const r = Math.floor(i / size), c = i % size, out = [];
  for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
    if (!dr && !dc) continue;
    const nr = r + dr, nc = c + dc;
    if (nr >= 0 && nr < size && nc >= 0 && nc < size) out.push(idxOf(nr, nc, size));
  }
  return out;
}

/* Solvability scorer: fraction of safe tiles provable from `opening` with
   single-cell inference + pairwise subset rule. voidSet cells are walls. */
export function solveScore(mines, size, opening, voidSet = null) {
  const isVoid = i => voidSet !== null && voidSet.has(i);
  const nb = i => neighborsOf(i, size).filter(j => !isVoid(j));
  const revealed = new Set(), knownMine = new Set();
  const numAtL = i => nb(i).filter(j => mines.has(j)).length;
  const flood = i => {
    const q = [i];
    while (q.length) {
      const x = q.pop();
      if (revealed.has(x) || mines.has(x) || isVoid(x)) continue;
      revealed.add(x);
      if (numAtL(x) === 0) for (const j of nb(x)) q.push(j);
    }
  };
  flood(opening);
  let progress = true;
  while (progress) {
    progress = false;
    const constraints = [];
    for (const i of revealed) {
      const n = numAtL(i);
      if (!n) continue;
      const hid = nb(i).filter(j => !revealed.has(j));
      const unknown = hid.filter(j => !knownMine.has(j));
      const need = n - hid.filter(j => knownMine.has(j)).length;
      if (!unknown.length) continue;
      if (need === 0) { for (const j of unknown) flood(j); progress = true; }
      else if (need === unknown.length) { for (const j of unknown) knownMine.add(j); progress = true; }
      else constraints.push({ cells: unknown, need });
    }
    if (!progress) {
      outer:
      for (let a = 0; a < constraints.length; a++) for (let b = 0; b < constraints.length; b++) {
        if (a === b) continue;
        const A = constraints[a], B = constraints[b];
        if (A.cells.every(x => B.cells.includes(x))) {
          const diff = B.cells.filter(x => !A.cells.includes(x));
          if (!diff.length) continue;
          if (B.need - A.need === diff.length) { for (const j of diff) knownMine.add(j); progress = true; break outer; }
          if (B.need === A.need) { for (const j of diff) flood(j); progress = true; break outer; }
        }
      }
    }
  }
  const playable = size * size - (voidSet ? voidSet.size : 0);
  const safeTotal = playable - mines.size;
  return safeTotal > 0 ? revealed.size / safeTotal : 1;
}

/* ---- board shapes: boards live on a (size+2)² grid; the playable region is a
   shape mask, everything else is void. The void margin is the growth reserve. */
export const SHAPES = ['rect', 'cross', 'diamond', 'donut', 'cavern'];

function shapeMask(shape, grid) {
  const playable = new Set();
  const lo = 1, hi = grid - 2;               // 1-cell void margin all around
  const span = hi - lo + 1;
  const cx = (grid - 1) / 2;
  const add = (r, c) => playable.add(r * grid + c);
  if (shape === 'cross') {
    const t = Math.max(3, Math.round(span * 0.45));
    const tLo = lo + Math.floor((span - t) / 2), tHi = tLo + t - 1;
    for (let r = lo; r <= hi; r++) for (let c = lo; c <= hi; c++) {
      if ((r >= tLo && r <= tHi) || (c >= tLo && c <= tHi)) add(r, c);
    }
  } else if (shape === 'diamond') {
    for (let r = lo; r <= hi; r++) for (let c = lo; c <= hi; c++) {
      if (Math.abs(r - cx) + Math.abs(c - cx) <= span / 2) add(r, c);
    }
  } else if (shape === 'donut') {
    const h = Math.max(2, Math.floor(span / 3));
    const hLo = lo + Math.floor((span - h) / 2), hHi = hLo + h - 1;
    for (let r = lo; r <= hi; r++) for (let c = lo; c <= hi; c++) {
      if (!(r >= hLo && r <= hHi && c >= hLo && c <= hHi)) add(r, c);
    }
  } else if (shape === 'cavern') {
    const target = Math.round(span * span * 0.72);
    let r = Math.round(cx), c = Math.round(cx);
    add(r, c);
    let guard = target * 40;
    while (playable.size < target && guard-- > 0) {
      const dir = randInt(4);
      r = clamp(r + (dir === 0 ? -1 : dir === 1 ? 1 : 0), lo, hi);
      c = clamp(c + (dir === 2 ? -1 : dir === 3 ? 1 : 0), lo, hi);
      add(r, c);
    }
  } else { // rect
    for (let r = lo; r <= hi; r++) for (let c = lo; c <= hi; c++) add(r, c);
  }
  return playable;
}

export function genBoard(size, mineCount, shape = null) {
  shape = shape || randPick(SHAPES);
  const grid = size + 2;
  const mask = shapeMask(shape, grid);
  const usable = mask.size;
  const voidSet = new Set();
  for (let i = 0; i < grid * grid; i++) if (!mask.has(i)) voidSet.add(i);
  const scaled = Math.round(mineCount * usable / (size * size));
  const mCount = clamp(scaled, 4, Math.max(4, usable - 12));
  const maskArr = [...mask];
  let best = null, bestScore = -1, bestOpen = maskArr[0];
  for (let attempt = 0; attempt < 40; attempt++) {
    const mines = new Set(shuffle(maskArr).slice(0, mCount));
    const zeros = maskArr.filter(i => !mines.has(i)
      && neighborsOf(i, grid).every(j => !mines.has(j)));
    if (!zeros.length) continue;
    const opening = randPick(zeros);
    const score = solveScore(mines, grid, opening, voidSet);
    if (score > bestScore) { bestScore = score; best = mines; bestOpen = opening; }
    if (score >= 1) break;
  }
  if (!best) { // pathological density fallback: no zero opening found
    const arr = shuffle(maskArr);
    best = new Set(arr.slice(0, mCount));
    bestOpen = arr[arr.length - 1];
    best.delete(bestOpen);
  }
  const cells = [];
  for (let i = 0; i < grid * grid; i++) {
    cells.push({
      mine: best.has(i) && mask.has(i), revealed: false, flag: 0, entombed: false,
      void: !mask.has(i),
      ever: false, crater: false, scan: null, construct: null, grub: false, primed: false, glow: false,
    });
  }
  return { size: grid, cells, opening: bestOpen, shape };
}

/* ---- mid-combat board editing ---- */
/* Annex n hidden tiles onto the board edge (un-void cells adjacent to the playable
   region, cluster-biased). mined: false = all safe · 'mixed' = about half mined. */
export function annexTiles(n, mined = false) {
  const b = board();
  const orth = i => {
    const r = Math.floor(i / b.size), c = i % b.size, out = [];
    if (r > 0) out.push(i - b.size);
    if (r < b.size - 1) out.push(i + b.size);
    if (c > 0) out.push(i - 1);
    if (c < b.size - 1) out.push(i + 1);
    return out;
  };
  const added = [];
  for (let k = 0; k < n; k++) {
    const cand = b.cells
      .map((cell, i) => ({ cell, i }))
      .filter(x => x.cell.void && orth(x.i).some(j => !b.cells[j].void));
    if (!cand.length) break;
    // cluster bias: prefer growth next to a tile we just added
    const nearNew = cand.filter(x => orth(x.i).some(j => added.includes(j)));
    const pick = (nearNew.length ? randPick(nearNew) : randPick(cand)).i;
    const cell = b.cells[pick];
    cell.void = false; cell.revealed = false; cell.entombed = false;
    cell.ever = false; cell.crater = false; cell.flag = 0; cell.scan = null;
    cell.construct = null; cell.grub = false; cell.primed = false; cell.glow = false;
    cell.mine = mined === true || (mined === 'mixed' && random() < 0.5);
    added.push(pick);
  }
  return added;
}

/* Bury a fresh mine in a hidden tile. Returns false if it was already mined. */
export function addMineAt(i) {
  const cell = board().cells[i];
  if (!isHiddenUsable(i) || cell.mine) return false;
  cell.mine = true;
  cell.scan = null;
  return true;
}

/* ================= board helpers ================= */
export function numAt(i) {
  const b = board();
  return neighborsOf(i, b.size).filter(j => b.cells[j].mine && !b.cells[j].void).length;
}
export function isHiddenUsable(i) {
  const c = board().cells[i];
  return !c.revealed && !c.void && !c.entombed;
}
export function hiddenIdx() {
  return board().cells.map((_, i) => i).filter(isHiddenUsable);
}
export function flaggedIdx() {
  return board().cells.map((_, i) => i).filter(i => isHiddenUsable(i) && board().cells[i].flag);
}
export function area3x3(i) {
  return [i, ...neighborsOf(i, board().size)];
}
export function highestRevealedNumber() {
  const b = board();
  let hi = 0;
  for (let i = 0; i < b.cells.length; i++) {
    const c = b.cells[i];
    if (c.revealed && !c.void) hi = Math.max(hi, numAt(i));
  }
  return hi;
}

/* ================= board verbs ================= */
export function revealTile(i, cause) {
  const c = cbt(); const b = board();
  if (!c || !b) return { safe: false, mine: false, none: true };
  const cell = b.cells[i];
  if (!cell || cell.revealed || cell.void || cell.entombed) return { safe: false, mine: false, none: true };
  if (cell.mine) {
    const protectable = cause === 'reveal' || cause === 'chord';
    if (protectable && c.powers.sixthsense && !c.powers.sixthUsed) {
      c.powers.sixthUsed = true;
      verifyFlag(i);
      toast('Sixth Sense: mine flagged instead!');
      return { safe: false, mine: true, saved: true };
    }
    const instinctLimit = hasT('gravebell') ? 2 : 1;
    if (protectable && Number(c.instinctUsed || 0) < instinctLimit) {
      c.instinctUsed = Number(c.instinctUsed || 0) + 1;
      verifyFlag(i);
      toast(`Instinct! Mine flagged instead${hasT('gravebell') ? ` (${instinctLimit - c.instinctUsed} left)` : '.'}`);
      return { safe: false, mine: true, saved: true };
    }
    detonatePlayer(i);
    return { safe: false, mine: true };
  }
  const count = openSafe(i);
  if (!run?.combat || c.over) return { safe: true, mine: false, cascade: count };
  if (!c.setup && count > 0) { sfx(count >= 4 ? 'cascade' : 'dig'); haptic('dig'); }
  if (c.powers.leylines && count >= c.powers.leylines) { gainEnergy(1); toast('Ley Lines: +1⚡'); }
  checkFullClear();
  return { safe: true, mine: false, cascade: count };
}

export function openSafe(start) {
  const c = cbt(), b = board();
  let count = 0;
  const q = [start];
  while (q.length) {
    if (!run?.combat || c.over || c.board !== b) break; // combat can end or the board can re-seal mid-cascade
    const i = q.pop();
    const cell = b.cells[i];
    if (!cell || cell.revealed || cell.void || cell.entombed || cell.mine || cell.flag) continue;
    cell.revealed = true;
    cell.scan = null;
    count++;
    const n = numAt(i);
    if (!c.setup) {
      c.revealedThisTurn++;
      c.sumThisTurn += n;
      if (!cell.ever) {
        gainInsight(1);
        run.safeReveals++;
        if (hasT('tally') && run.safeReveals % 25 === 0) {
          run.maxHp++; run.hp++;
          toast('Tally Counter: +1 max HP');
        }
      }
      if (run.cls === 'hexwright' && n >= 3 && !c.over) hitAll(2, { noNitro: true });
    }
    cell.ever = true;
    if (cell.grub) { cell.grub = false; unburyAt(i); }
    if (c.primed === i) { c.primed = null; cell.primed = false; }
    if (!c.setup) {
      const owner = lairOwnerAt(i);
      if (owner) hitEnemy(owner, Math.max(1, n), { bypassGate: true, noNitro: true });
    }
    if (!run?.combat || c.over) break;
    if (n === 0) for (const j of neighborsOf(i, b.size)) q.push(j);
  }
  if (!c.setup && c.revealedThisTurn >= 3) {
    for (const e of c.enemies) if (e.hp > 0 && e.data.modifierBuried) {
      e.data.modifierBuried = false; e.data.buried = false;
      e.intent = e.def.next(e);
      toast(`${e.def.name} bursts from the stone!`);
    }
  }
  if (!c.setup && run.cls === 'lamplighter' && count >= 4 && !c.classState.kindleUsed) {
    c.classState.kindleUsed = true;
    gainEnergy(1);
    toast('Kindle: a bright cascade grants +1⚡');
  }
  return count;
}

function triggerPainPassive() {
  const c = run?.combat;
  if (c && run.cls === 'chirurgeon' && !c.classState.painUsed && !c.over) {
    c.classState.painUsed = true;
    gainBlock(5);
    toast('Triage: pain grants 5 Block');
  }
}

function unburyAt(i) {
  for (const e of cbt().enemies) {
    if (e.hp > 0 && e.data.buried && e.data.tile === i) {
      e.data.buried = false;
      e.intent = e.def.next(e);
      toast(`${e.def.name} unearthed!`);
    }
  }
}

function detonatePlayer(i, opts = {}) {
  const c = cbt(), b = board(), cell = b.cells[i];
  cell.mine = false; cell.revealed = true; cell.crater = true; cell.ever = true;
  cell.flag = 0; cell.scan = null;
  if (cell.primed || c.primed === i) { c.primed = null; cell.primed = false; }
  sfx('boom');
  haptic('mine');
  ui.shakeSeq++;
  let dmg = STRATA[run.stratum].mineDmg;
  if (opts.half) dmg = Math.ceil(dmg / 2);
  if (hasT('luckycompass') && !c.compassUsed) {
    c.compassUsed = true; dmg = 0; toast('Lucky Compass: detonation deals 0!');
  } else if (hasT('blastgoggles') && !c.gogglesUsed) {
    c.gogglesUsed = true; dmg = Math.ceil(dmg / 2); toast('Blast Goggles: half damage');
  }
  if (hasT('canary') && !c.canaryUsed && dmg > 10) {
    c.canaryUsed = true; dmg = 10; toast("Miner's Canary caps it at 10!");
  }
  const soak = Math.min(c.plating, dmg);
  c.plating -= soak;
  const rest = dmg - soak;
  if (rest > 0) {
    run.lastDamageSource = `A mine in ${STRATA[run.stratum].name}`;
    run.hp -= rest; pushDmg({ kind: 'player', amount: rest });
    log(`💥 Mine detonates: ${rest} damage (pierces Block)`);
    triggerPainPassive();
  }
  else { pushDmg({ kind: 'player', amount: 0, note: 'ABSORBED' }); log('💥 Mine detonates — Plating absorbs it.'); }
  c.minesDetonated++;
  triggerPowderKeg();
  if (!c.over) lairMineHit(i);
  checkPlayerDeath();
  if (!c.over) checkFullClear();
}

export function detonateForCards(i) {
  const c = cbt(), cell = board().cells[i];
  if (!cell.mine) return false;
  cell.mine = false; cell.revealed = true; cell.crater = true; cell.ever = true;
  cell.flag = 0; cell.scan = null;
  if (c.primed === i) { c.primed = null; cell.primed = false; }
  c.minesDetonated++;
  if (c.nitro > 0) { c.nitroBoost = c.nitro; c.nitro = 0; }
  sfx('boom');
  haptic('mine');
  log('💥 Controlled detonation.');
  triggerPowderKeg();
  if (run.combat && run.cls === 'sapper' && !c.classState.passiveUsed) {
    c.classState.passiveUsed = true;
    hitAll(4, { noNitro: true });
    toast('Breachcraft: 4 damage to all enemies');
  }
  if (run.combat && c.powers.blastDividend && !c.powers.blastDividendUsed) {
    c.powers.blastDividendUsed = true;
    gainEnergy(1); drawCards(1);
    toast('Blast Dividend: +1⚡, draw 1');
  }
  if (!run.combat) return true;
  if (!c.over) lairMineHit(i);
  if (!c.over) checkFullClear();
  return true;
}

function triggerPowderKeg() {
  const c = cbt();
  if (c.powers.powderkeg > 0 && !c.over) hitAll(c.powers.powderkeg, { noNitro: true });
}

export function scanTile(i) {
  const cell = board().cells[i];
  if (!isHiddenUsable(i)) return;
  const fresh = !cell.scan;
  cell.scan = cell.mine ? 'mine' : 'safe';
  sfx('scan');
  const c = cbt();
  if (fresh && !c.setup && run.cls === 'surveyor') {
    c.classState.scanCount++;
    if (c.classState.scanCount % 4 === 0) {
      gainEnergy(1); gainInsight(1);
      toast('Field Method: fourth scan grants +1⚡ and Insight');
    }
  }
}

export function defuseTile(i) {
  const cell = board().cells[i];
  if (!isHiddenUsable(i)) return false;
  if (cell.mine) {
    cell.mine = false; cell.flag = 0;
    log('🔧 Defused a mine.');
    revealTile(i, 'card-safe');
    return true;
  }
  revealTile(i, 'card-safe');
  return false;
}

export function entombTile(i) {
  const cell = board().cells[i];
  if (!isHiddenUsable(i)) return;
  cell.entombed = true; cell.flag = 0; cell.scan = null;
  if (cell.grub) { cell.grub = false; unburyAt(i); }
  if (cbt().primed === i) { cbt().primed = null; cell.primed = false; }
  sfx('entomb');
  log('⛏ Tile entombed in stone.');
  const owner = lairOwnerAt(i);
  if (owner) {
    log(`⛏ The stone crushes into ${owner.def.name}'s lair.`);
    hitEnemy(owner, LAIR_ENTOMB_DMG, { bypassGate: true, noNitro: true });
  }
  checkFullClear();
}

export function chordAt(i) {
  const c = cbt(), b = board();
  const n = numAt(i);
  const flagged = neighborsOf(i, b.size).filter(j => b.cells[j].flag && isHiddenUsable(j));
  if (n === 0 || flagged.length !== n) return { ok: false, detonations: 0 };
  c.chordedThisTurn = true;
  const before = c.minesDetonated;
  for (const j of neighborsOf(i, b.size)) {
    if (board() !== b) break; // board collapsed & re-sealed mid-chord
    if (isHiddenUsable(j) && !b.cells[j].flag) revealTile(j, 'chord');
    if (c.over) break;
  }
  sfx('chord');
  log('🎼 Chord!');
  return { ok: true, detonations: c.minesDetonated - before };
}

export function swapCells(i, j) {
  const b = board(), a = b.cells[i], z = b.cells[j];
  [a.mine, z.mine] = [z.mine, a.mine];
  [a.scan, z.scan] = [z.scan, a.scan];
  [a.flag, z.flag] = [z.flag, a.flag];
  [a.grub, z.grub] = [z.grub, a.grub];
  for (const e of cbt().enemies) {
    if (e.data.buried) { if (e.data.tile === i) e.data.tile = j; else if (e.data.tile === j) e.data.tile = i; }
  }
  log('🌋 Fault line: two tiles swap.');
}

export function verifyFlag(i) {
  const cell = board().cells[i];
  if (isHiddenUsable(i)) { cell.flag = 2; sfx('flag'); }
}

export function addConstruct(i, kind, opts = {}) {
  const cell = board().cells[i];
  if (!cell || !cell.revealed || cell.void || cell.construct) return;
  cell.construct = { kind, ...opts };
  const names = { sentry: 'Sentry', bulwark: 'Bulwark', relay: 'Survey Relay' };
  log(`🏗 ${names[kind] || kind} built.`);
  if (run.cls === 'terraformer') {
    gainPlating(2);
    toast('Master Builder: +2 Plating');
  }
}

/* Full Clear is a payoff, not a win condition: the collapse deals heavy damage to
   everyone, then the crypt re-seals with a fresh board. Only kills end a combat. */
const FULL_CLEAR_DMG = 50;

function checkFullClear() {
  const c = cbt(), b = board();
  if (!c || !b || c.over || b.cleared) return;
  for (const cell of b.cells) {
    if (cell.void || cell.mine) continue;
    if (!cell.revealed && !cell.entombed) return;
  }
  b.cleared = true;
  c.fullCleared = true;
  run.fullClears++;
  sfx('fullclear');
  ui.shakeSeq++;
  toast(`★ FULL CLEAR — the board collapses: ${FULL_CLEAR_DMG} damage to ALL enemies!`);
  log('★ FULL CLEAR! The ceiling comes down on everyone.');
  hitAll(FULL_CLEAR_DMG, { bypassGate: true });
  if (!c.over && aliveEnemies().length) {
    toast('The crypt re-seals — fresh stone rises. Finish them.', true);
    log('▦ The crypt re-seals: a fresh board rises.');
    regenBoard(c.boardSpec.size, c.boardSpec.mines);
  }
}

/* Replace the current board mid-combat (Full Clear re-seal, NN-99 phases). */
function regenBoard(size, mines) {
  const c = cbt();
  clearPrimed();
  c.lie = null;
  c.board = genBoard(size, mines);
  c.setup = true;
  openSafe(c.board.opening);
  c.setup = false;
  for (const e of c.enemies) {
    if (e.hp > 0 && e.data.buried) {
      const spots = hiddenIdx().filter(i => !c.board.cells[i].mine);
      e.data.tile = spots.length ? randPick(spots) : null;
      if (e.data.tile != null) c.board.cells[e.data.tile].grub = true;
      else { e.data.buried = false; e.intent = e.def.next(e); }
    }
  }
  if (aliveEnemies().some(e => e.key === 'miscounter')) setLie();
  assignLairs();
}

/* ================= lairs — every enemy occupies a region of the board =================
   Revealing a safe lair tile hits its owner for the tile's number (min 1).
   A mine detonating in a lair — any cause — hits its owner for 10. Entombing deals 3.
   Killing an owner crumbles its lair open: mines defuse, tiles reveal. */
export const LAIR_COLORS = ['#e0503f', '#8f76d6', '#c9973b', '#4fae8e'];
const LAIR_MINE_DMG = 10;
const LAIR_ENTOMB_DMG = 3;

function assignLairs() {
  const c = cbt(), b = board();
  const taken = new Set();
  for (const e of c.enemies) {
    if (e.hp <= 0) { e.lair = []; continue; }
    const size = Math.min(e.def.boss ? 4 : 3, b.size);
    const patchAt = (r0, c0) => {
      const cells = [];
      for (let dr = 0; dr < size; dr++) for (let dc = 0; dc < size; dc++) cells.push((r0 + dr) * b.size + (c0 + dc));
      return cells;
    };
    let placed = null;
    // pass 1: fully playable, no overlap. pass 2 (shaped boards): ≥5 playable tiles, no overlap.
    for (let tries = 0; tries < 200 && !placed; tries++) {
      const cells = patchAt(randInt(b.size - size + 1), randInt(b.size - size + 1));
      if (cells.every(i => !taken.has(i) && !b.cells[i].void)) placed = cells;
    }
    for (let tries = 0; tries < 200 && !placed; tries++) {
      const cells = patchAt(randInt(b.size - size + 1), randInt(b.size - size + 1));
      if (cells.every(i => !taken.has(i)) && cells.filter(i => !b.cells[i].void).length >= 5) placed = cells;
    }
    if (!placed) placed = patchAt(randInt(b.size - size + 1), randInt(b.size - size + 1));
    placed.forEach(i => taken.add(i));
    e.lair = placed;
  }
}

function lairOwnerAt(i) {
  if (!run || !run.combat) return null;
  return cbt().enemies.find(e => e.hp > 0 && e.lair && e.lair.includes(i)) || null;
}

function lairMineHit(i) {
  const owner = lairOwnerAt(i);
  if (owner) {
    log(`⛏ The blast tears through ${owner.def.name}'s lair — ${LAIR_MINE_DMG} damage!`);
    hitEnemy(owner, LAIR_MINE_DMG, { bypassGate: true, noNitro: true });
  }
}

function lairCrumble(e) {
  if (!e.lair || !run.combat || !e.lair.length) return;
  const b = cbt().board;
  let opened = 0;
  for (const i of e.lair) {
    if (!run?.combat || cbt().board !== b) break;
    const cell = b.cells[i];
    if (!cell || cell.void || cell.revealed || cell.entombed) continue;
    if (cell.mine) { cell.mine = false; }
    cell.flag = 0;
    openSafe(i);
    opened++;
  }
  e.lair = [];
  if (opened && run?.combat) {
    toast(`${e.def.name}'s lair crumbles open! (${opened} tiles)`);
    log(`⛏ ${e.def.name}'s lair crumbles open: ${opened} tiles revealed, its mines defused.`);
    checkFullClear();
  }
}

/* ================= enemy board attacks ================= */
export function boardAttack(desc, fn) {
  const b = board();
  const ci = b.cells.findIndex(c => c.construct);
  if (ci >= 0) {
    const name = b.cells[ci].construct.kind === 'sentry' ? 'Sentry' : 'Bulwark';
    b.cells[ci].construct = null;
    log(`${desc} — your ${name} absorbs the blow and crumbles.`);
    toast(`${name} destroyed (absorbed board attack)`, true);
    return;
  }
  fn();
}

export function layMines(n, col) {
  const b = board();
  const inCol = i => i % b.size === col;
  let cand = hiddenIdx().filter(i => !b.cells[i].mine && !b.cells[i].ever && inCol(i));
  if (cand.length < n) cand = cand.concat(hiddenIdx().filter(i => !b.cells[i].mine && !b.cells[i].ever && !inCol(i)));
  let laid = 0;
  for (const i of cand.slice(0, n)) {
    b.cells[i].mine = true; b.cells[i].scan = null; laid++;
  }
  if (laid) { sfx('boardattack'); log(`☣ ${laid} new mine${laid > 1 ? 's' : ''} laid (column ${col + 1}).`); toast(`${laid} mines laid in column ${col + 1}!`, true); }
}

export function fogTiles(n) {
  const b = board(), c = cbt();
  const cand = shuffle(b.cells.map((_, i) => i).filter(i => {
    const cell = b.cells[i];
    return cell.revealed && !cell.void && !cell.crater && !cell.construct;
  }));
  let fogged = 0;
  for (const i of cand.slice(0, n)) {
    b.cells[i].revealed = false; fogged++;
    if (c.lie && c.lie.tile === i) setLie();
  }
  if (fogged) { sfx('boardattack'); log(`🌫 ${fogged} tiles re-hidden by fog.`); toast(`Fog re-hides ${fogged} tiles`, true); }
}

export function scrambleMines(n) {
  const b = board();
  const srcs = shuffle(hiddenIdx().filter(i => b.cells[i].mine && b.cells[i].flag !== 2));
  const dsts = shuffle(hiddenIdx().filter(i => !b.cells[i].mine && !b.cells[i].ever));
  let moved = 0;
  for (let k = 0; k < Math.min(n, srcs.length, dsts.length); k++) {
    b.cells[srcs[k]].mine = false;
    if (b.cells[srcs[k]].scan === 'mine') b.cells[srcs[k]].scan = null;
    b.cells[dsts[k]].mine = true;
    b.cells[dsts[k]].scan = null;
    moved++;
  }
  if (moved) { sfx('boardattack'); log(`🌀 ${moved} mines scramble to new tiles.`); toast(`${moved} mines moved — old reads are void!`, true); }
}

export function setLie() {
  if (!run?.combat) return;
  const b = board();
  const cand = b.cells.map((_, i) => i).filter(i => b.cells[i].revealed && !b.cells[i].void && numAt(i) > 0);
  cbt().lie = cand.length ? { tile: randPick(cand), delta: random() < 0.5 ? 1 : -1 } : null;
}
export function clearLie() { if (run.combat) cbt().lie = null; }

export function primeTile() {
  if (!run?.combat) return;
  const b = board();
  const mines = hiddenIdx().filter(i => b.cells[i].mine);
  const others = hiddenIdx().filter(i => !b.cells[i].mine);
  const pick = (random() < 0.65 && mines.length) ? randPick(mines) : randPick(others.length ? others : mines);
  if (pick == null) return;
  cbt().primed = pick;
  b.cells[pick].primed = true;
  sfx('boardattack');
  log('⏱ Detonata primes a tile — defuse, flag, or reveal it!');
}

export function resolvePrimed() {
  if (!run?.combat) return;
  const c = cbt(), b = board();
  const p = c.primed;
  if (p == null) return;
  c.primed = null;
  const cell = b.cells[p];
  cell.primed = false;
  if (!isHiddenUsable(p) || cell.flag) { log('⏱ The primed charge fizzles.'); return; }
  if (cell.mine) { toast('The primed tile QUAKES against you!', true); detonatePlayer(p); }
}

export function clearPrimed() {
  const c = run.combat;
  if (!c) return;
  if (c.primed != null) { c.board.cells[c.primed].primed = false; c.primed = null; }
}

export function devourRing() {
  const c = cbt(), b = board();
  if (!c || !b) return;
  let minR = b.size, maxR = -1, minC = b.size, maxC = -1;
  for (let i = 0; i < b.cells.length; i++) {
    if (b.cells[i].void) continue;
    const r = Math.floor(i / b.size), col = i % b.size;
    minR = Math.min(minR, r); maxR = Math.max(maxR, r);
    minC = Math.min(minC, col); maxC = Math.max(maxC, col);
  }
  if (maxR < 0) return;
  let eaten = 0;
  for (let i = 0; i < b.cells.length; i++) {
    const cell = b.cells[i];
    if (cell.void) continue;
    const r = Math.floor(i / b.size), col = i % b.size;
    if (r !== minR && r !== maxR && col !== minC && col !== maxC) continue;
    if (cell.construct) cell.construct = null;
    if (cell.grub) { cell.grub = false; unburyAt(i); }
    if (c.primed === i) { c.primed = null; cell.primed = false; }
    if (!cell.revealed && !cell.entombed && cell.mine) {
      detonatePlayer(i, { half: true });
      if (!run?.combat || c.over) return;
    }
    cell.void = true; cell.mine = false; cell.flag = 0; cell.construct = null; cell.entombed = false;
    eaten++;
  }
  sfx('boardattack');
  ui.shakeSeq++;
  log(`🕳 The Collapser DEVOURS the outer ring (${eaten} tiles).`);
  toast('The board shrinks!', true);
  checkFullClear();
}

/* ================= player effects ================= */
export function atk(n) {
  const rubble = cbt()?.hand.filter(c => c.key === 'rubble').length || 0;
  return Math.max(0, n - rubble);
}
export function gainBlock(n) { if (!run?.combat) return; cbt().block += n; sfx('block'); log(`🛡 +${n} Block`); }
export function gainPlating(n) { if (!run?.combat) return; cbt().plating += n; sfx('plating'); log(`⛨ +${n} Plating`); }
export function gainEnergy(n) { if (run?.combat) cbt().energy += n; }
export function gainInsight(n) { if (run?.combat) cbt().insight += n; }
export function gainPicks(n) {
  if (!run?.combat || n <= 0) return;
  cbt().picks += n;
  toast(`Trailblaze: +${n} pick${n === 1 ? '' : 's'}`);
}
export function gainMaxPicks(n) {
  if (!run?.combat || n <= 0) return;
  cbt().maxPicks += n;
  cbt().picks += n;
  toast(`Long stride: +${n} max pick${n === 1 ? '' : 's'} this combat`);
}
export function loseMaxPicks(n) {
  if (!run?.combat || n <= 0) return 0;
  const lost = Math.min(n, Math.max(0, cbt().maxPicks - 1));
  cbt().maxPicks -= lost;
  cbt().picks = Math.min(cbt().picks, cbt().maxPicks);
  if (lost) toast(`Overextended: −${lost} max pick${lost === 1 ? '' : 's'} this combat`, true);
  return lost;
}
export function spendPicks(n = Infinity) {
  if (!run?.combat) return 0;
  const spent = Math.min(cbt().picks, n);
  cbt().picks -= spent;
  return spent;
}
export function loseHP(n, source = 'A lingering wound') {
  run.lastDamageSource = source;
  run.hp -= n;
  sfx('hurt'); haptic('damage');
  pushDmg({ kind: 'player', amount: n });
  log(`🩸 You lose ${n} HP`);
  triggerPainPassive();
  checkPlayerDeath();
}
export function drawCards(n) {
  if (!run?.combat) return;
  const c = cbt();
  let drew = 0;
  for (let k = 0; k < n; k++) {
    if (!c.draw.length) {
      if (!c.discard.length) break;
      c.draw = shuffle(c.discard); c.discard = [];
    }
    const card = c.draw.pop();
    if (c.hand.length >= 10) { c.discard.push(card); continue; }
    c.hand.push(card);
    drew++;
    if (card.key === 'shrapnel') {
      toast('Shrapnel! Take 1.', true);
      loseHP(1);
      if (c.over) break;
    }
  }
  if (drew) sfx('draw');
}

export function enemyAttack(e, n) {
  if (!run?.combat) return;
  const c = cbt();
  const soak = Math.min(c.block, n);
  c.block -= soak;
  const rest = n - soak;
  if (rest > 0) {
    run.lastDamageSource = e.def.name;
    run.hp -= rest;
    sfx('hurt');
    haptic('damage');
    ui.shakeSeq++;
    pushDmg({ kind: 'player', amount: rest });
    log(`⚔ ${e.def.name} hits you for ${rest}${soak ? ` (${soak} blocked)` : ''}`);
    triggerPainPassive();
  } else {
    sfx('block');
    pushDmg({ kind: 'player', amount: 0, note: 'BLOCKED' });
    log(`⚔ ${e.def.name} attacks — fully blocked.`);
  }
  checkPlayerDeath();
}

function checkPlayerDeath() {
  if (run.hp <= 0) {
    run.hp = 0;
    if (cbt().over) return;
    if (run.cls === 'revenant' && !cbt().classState.deathUsed) {
      cbt().classState.deathUsed = true;
      run.hp = 1;
      toast('Deathless: return from the brink at 1 HP');
      return;
    }
    cbt().over = true;
    sfx('defeat');
    ui.screen = 'gameover';
    recordRunHistory(run, false);
    recordDailyRunEnd(false);
    notify();
  }
}

/* ================= enemies ================= */
export const ENEMY_MODIFIERS = {
  armoured: { name: 'Armoured', mark: '⛨', desc: 'Begins combat protected by Block.' },
  burrowing: { name: 'Burrowing', mark: '⌄', desc: 'Untargetable until three safe tiles are revealed.' },
  unstable: { name: 'Unstable', mark: '※', desc: 'Detonates for damage when defeated.' },
  cursed: { name: 'Cursed', mark: '◈', desc: 'Adds a Dud to your combat discard pile.' },
};

function spawnEnemy(key, kind = 'dig') {
  const def = ENEMIES[key];
  const scale = Math.max(0, run.stratum - def.home);
  const e = {
    key, def, scale,
    maxHp: Math.round(def.hp * (1 + 0.45 * scale)),
    hp: 0, block: 0, step: 0, data: {}, intent: null, modifier: null,
  };
  if (!def.boss) {
    const chance = run.challenge === 'afflicted' ? 1 : kind === 'elite' ? 0.65 : 0.25 + run.stratum * 0.1;
    if (random() < chance) e.modifier = randPick(Object.keys(ENEMY_MODIFIERS));
  }
  e.hp = e.maxHp;
  return e;
}

function setupEnemyModifier(e) {
  if (e.modifier === 'armoured') e.block += 8 + run.stratum * 4;
  if (e.modifier === 'burrowing') { e.data.buried = true; e.data.modifierBuried = true; }
  if (e.modifier === 'cursed') {
    cbt().discard.push(mkCard('dud'));
    log(`◈ ${e.def.name}'s curse adds a Dud to the discard pile.`);
  }
}
export function aliveEnemies() { return run?.combat ? cbt().enemies.filter(e => e.hp > 0) : []; }
function targetableEnemies() { return aliveEnemies().filter(e => !e.data.buried); }
export function curTarget() {
  const t = targetableEnemies();
  if (!t.length) return null;
  const byIdx = t.find(e => cbt().enemies.indexOf(e) === cbt().targetIdx);
  return byIdx || t[0];
}
export function hitEnemy(e, n, opts = {}) {
  const c = cbt();
  if (!c || !e || e.hp <= 0 || c.over) return;
  if (!opts.noNitro && c.nitroBoost) { n += c.nitroBoost; c.nitroBoost = 0; toast('Nitro! +10'); }
  if (e.def.gated && !opts.bypassGate && !(c.revealedThisTurn >= 5 || c.chordedThisTurn)) {
    pushDmg({ kind: 'enemy', idx: c.enemies.indexOf(e), amount: 0, note: 'IMMUNE' });
    toast('NN-99 shrugs it off — reveal 5+ tiles or chord first!', true);
    return;
  }
  const soak = Math.min(e.block, n);
  e.block -= soak;
  const dmg = n - soak;
  e.hp -= dmg;
  pushDmg({ kind: 'enemy', idx: c.enemies.indexOf(e), amount: dmg, note: dmg === 0 && soak > 0 ? 'BLOCKED' : null });
  if (dmg > 0) { sfx('hit'); log(`🗡 ${e.def.name} takes ${dmg}`); }
  if (e.hp <= 0) onEnemyDeath(e);
  else if (e.key === 'nn99') checkNNPhase(e);
  checkWin();
}
export function hitRandom(n, opts) { hitEnemy(randPick(targetableEnemies()), n, opts); }
export function hitAll(n, opts) { for (const e of targetableEnemies().slice()) hitEnemy(e, n, opts); }

function onEnemyDeath(e) {
  e.hp = 0;
  recordEnemyDefeated(e.key);
  sfx('death');
  log(`☠ ${e.def.name} destroyed.`);
  if (e.def.onDeath) e.def.onDeath(e);
  if (e.modifier === 'unstable' && run?.combat && !cbt().over) {
    const blast = 3 + run.stratum * 2;
    toast(`${e.def.name} ruptures for ${blast} damage!`, true);
    loseHP(blast, `The unstable ${e.def.name}`);
  }
  lairCrumble(e);
}

export function checkNNPhase(e) {
  const phase = e.hp > 150 ? 1 : e.hp > 75 ? 2 : 3;
  if (phase > e.data.phase) {
    e.data.phase = phase;
    const [size, mines] = NN99_PHASES[phase - 1];
    toast(`NN-99 drops the floor — a deeper, denser board! (${size}×${size}, ${mines} mines)`, true);
    log(`🛰 NN-99 phase ${phase}: new board ${size}×${size}, ${mines} mines.`);
    const c = cbt();
    c.boardSpec = { size, mines: mines + minePenalty() };
    regenBoard(c.boardSpec.size, c.boardSpec.mines);
  }
}

function checkWin() {
  const c = cbt();
  if (!c || c.over) return;
  if (aliveEnemies().length === 0) {
    c.over = true;
    combatVictory();
  }
}

/* ================= combat setup & turns ================= */
function minePenalty() {
  let p = persistentCurseTotal('boardMines');
  if (hasT('lamp')) p += 4;
  return p;
}

function curseCopies(key) {
  return run.deck.filter(card => card.key === key).length;
}

function persistentCurseTotal(field) {
  return Object.entries(PERSISTENT_CURSES).reduce((total, [key, curse]) =>
    total + curseCopies(key) * (Number(curse[field]) || 0), 0);
}

export function startCombat(kind) {
  const st = STRATA[run.stratum];
  const table = FIGHTS[run.stratum][kind === 'boss' ? 'boss' : kind === 'elite' ? 'elite' : 'dig'];
  const enemyKeys = randPick(table);
  const b = genBoard(st.size, st.mines + minePenalty());
  run.combat = {
    kind, board: b, boardSpec: { size: st.size, mines: st.mines + minePenalty() },
    enemies: [], hand: [], discard: [], exhaust: [], powersPlayed: [],
    draw: shuffle(run.deck.map(c => ({ ...c }))),
    energy: 0, maxEnergy: 3 + (hasT('lamp') ? 1 : 0) + (hasT('emberjar') ? 1 : 0),
    block: 0, plating: 0, insight: 0, turn: 0,
    maxPicks: Math.max(PERSISTENT_CURSES.vertigo.minimum, basePicksFor(run.cls) + (run.pickBonus || 0) + (hasT('pitons') ? 1 : 0)
      + persistentCurseTotal('maxPicks') + (run.challenge === 'noflags' ? 1 : 0)),
    revealedThisTurn: 0, sumThisTurn: 0, chordedThisTurn: false, minesDetonated: 0,
    powers: {
      powderkeg: 0, sixthsense: false, sixthUsed: false, leylines: 0,
      blastDividend: false, blastDividendUsed: false, stonechoir: false,
    },
    classState: {
      passiveUsed: false, scanCount: 0, kindleUsed: false, luckyUsed: false,
      painUsed: false, exhaustUsed: false, deathUsed: false,
    },
    instinctUsed: 0, gogglesUsed: false, compassUsed: false, canaryUsed: false, keystoneUsed: false,
    nitro: 0, nitroBoost: 0, lie: null, primed: null, targetIdx: 0,
    fullCleared: false, over: false, setup: true, log: [],
  };
  const c = cbt();
  openSafe(b.opening);
  if (hasT('quill')) {
    const zeros = hiddenIdx().filter(i => !b.cells[i].mine && numAt(i) === 0);
    if (zeros.length) openSafe(randPick(zeros));
  }
  if (run.surveyNext) {
    run.surveyNext = false;
    const safeTotal = b.cells.filter(x => !x.mine && !x.void).length;
    const target = Math.floor(safeTotal * 0.25);
    let guard = 500;
    while (b.cells.filter(x => x.revealed).length < target && guard-- > 0) {
      const cand = hiddenIdx().filter(i => !b.cells[i].mine);
      if (!cand.length) break;
      openSafe(randPick(cand));
    }
    log('🗺 Surveyed: the board starts partly revealed.');
  }
  for (const k of enemyKeys) {
    const e = spawnEnemy(k, kind);
    c.enemies.push(e);
    recordEnemySeen(k);
    if (e.def.setup) e.def.setup(e);
    setupEnemyModifier(e);
    e.intent = e.def.next(e);
  }
  if (hasT('detector') || hasT('loadedcoin')) {
    const m = randPick(hiddenIdx().filter(i => b.cells[i].mine));
    if (m != null) { verifyFlag(m); log(hasT('loadedcoin') ? '🪙 Loaded Coin marks a mine.' : '📻 Rusted Detector marks a mine.'); }
  }
  if (hasT('dowsingcharm')) {
    shuffle(hiddenIdx()).slice(0, 2).forEach(i => scanTile(i));
    log('📿 Dowsing Charm scans 2 tiles.');
  }
  if (hasT('hexkey')) {
    shuffle(hiddenIdx()).slice(0, 3).forEach(i => scanTile(i));
    log('🔷 Hex Key scans 3 tiles.');
  }
  if (hasT('wardplate')) c.plating = 2;
  const falseFlags = persistentCurseTotal('falseFlags');
  if (falseFlags > 0) {
    const safe = shuffle(hiddenIdx().filter(i => !b.cells[i].mine && !b.cells[i].flag));
    safe.slice(0, falseFlags).forEach(i => { b.cells[i].flag = 1; });
    if (safe.length) log(`◉ Paranoia marks ${Math.min(falseFlags, safe.length)} safe tile${falseFlags === 1 ? '' : 's'}.`);
  }
  assignLairs();
  c.setup = false;
  ui.screen = 'combat';
  ui.targeting = null; ui.gadgetTargeting = null; ui.flagMode = false;
  if (kind === 'boss') queueCutscene(`boss-intro-${run.stratum}`, {}, true);
  startTurn();
}

export const PICKS_PER_TURN = 4;
export function basePicksFor(clsKey) { return CLASSES[clsKey]?.picks ?? PICKS_PER_TURN; }

function startTurn() {
  const c = cbt();
  c.turn++;
  c.block = run.cls === 'warden' && c.turn > 1 ? Math.floor(c.block / 4) : 0;
  c.energy = c.maxEnergy;
  if (c.turn === 1) c.energy = Math.max(PERSISTENT_CURSES.nightterrors.minimum, c.energy + persistentCurseTotal('firstTurnEnergy'));
  c.picks = c.maxPicks;
  c.revealedThisTurn = 0; c.sumThisTurn = 0; c.chordedThisTurn = false;
  c.powers.sixthUsed = false;
  c.classState.passiveUsed = false;
  c.classState.kindleUsed = false;
  c.classState.luckyUsed = false;
  c.classState.painUsed = false;
  c.classState.exhaustUsed = false;
  c.powers.blastDividendUsed = false;
  const normalDraw = 5 + (hasT('indexcard') && c.turn === 1 ? 1 : 0) - (hasT('emberjar') && c.turn > 1 ? 1 : 0)
    + persistentCurseTotal('cardsPerTurn');
  drawCards(Math.max(PERSISTENT_CURSES.exhaustion.minimum, normalDraw));
  updateGlow();
  notify();
}

function updateGlow() {
  const b = board();
  b.cells.forEach(cell => cell.glow = false);
  if (!hasT('dowsingrod')) return;
  const safe = provablySafe();
  if (safe != null) b.cells[safe].glow = true;
}

/* Provably-safe finder for Dowsing Rod: uses visible numbers + verified flags + scans. */
function provablySafe() {
  const b = board();
  const knownMine = new Set(), knownSafe = new Set();
  for (let i = 0; i < b.cells.length; i++) {
    const cell = b.cells[i];
    if (!isHiddenUsable(i)) continue;
    if (cell.flag === 2 || cell.scan === 'mine') knownMine.add(i);
    if (cell.scan === 'safe') knownSafe.add(i);
  }
  for (let i = 0; i < b.cells.length; i++) {
    const cell = b.cells[i];
    if (!cell.revealed || cell.void) continue;
    const n = numAt(i);
    const hid = neighborsOf(i, b.size).filter(j => isHiddenUsable(j));
    const mines = hid.filter(j => knownMine.has(j));
    if (n === mines.length) {
      for (const j of hid) if (!knownMine.has(j) && !knownSafe.has(j)) return j;
    }
  }
  for (const j of knownSafe) return j;
  return null;
}

export function endTurn() {
  const c = cbt();
  if (c.over) return;
  sfx('turn');
  ui.targeting = null; ui.gadgetTargeting = null;
  for (const card of c.hand) {
    if (card.key === 'dud') c.exhaust.push(card);
    else c.discard.push(card);
  }
  c.hand = [];
  const b = board();
  for (let i = 0; i < b.cells.length; i++) {
    const con = b.cells[i].construct;
    if (!con || c.over) continue;
    const repeats = c.powers.stonechoir ? 2 : 1;
    for (let n = 0; n < repeats && !c.over; n++) {
      if (con.kind === 'sentry') { log('🗼 Sentry fires.'); hitRandom(con.dmg); }
      else if (con.kind === 'bulwark') { gainPlating(con.plating); gainBlock(con.block); }
      else if (con.kind === 'relay') {
        const target = randPick(hiddenIdx());
        if (target != null) scanTile(target);
        gainBlock(con.block);
        log('⌁ Survey Relay reads the stone.');
      }
    }
  }
  for (const e of c.enemies) {
    if (e.hp <= 0 || c.over) continue;
    if (e.data.modifierBuried) { log(`⌄ ${e.def.name} circles beneath the board.`); continue; }
    e.block = 0;
    e.def.act(e, e.intent);
    if (c.over) break;
    e.step++;
    e.intent = e.def.next(e);
  }
  if (c.over) { notify(); return; }
  startTurn();
}

export function fleeCombat() {
  const c = cbt();
  if (c.kind === 'boss') { toast('No escape from a boss!', true); return; }
  c.over = true;
  run.combat = null;
  toast('You slip away in the smoke…');
  ui.screen = 'map';
  notify();
}

/* ================= cards: play & targeting ================= */
export function effCost(card) {
  const def = CARDS[card.key];
  if (def.cost == null) return null;
  let cost = def.cost[card.up ? 1 : 0];
  if (card.key === 'entombcard' && hasT('keystone') && !cbt().keystoneUsed) cost = 0;
  return cost;
}

export function clickHandCard(handIdx) {
  const c = cbt();
  if (c.over) return;
  if (ui.targeting) {
    if (ui.targeting.handIdx === handIdx && ui.targeting.optional && ui.targeting.picked.length) { finishTargeting(); return; }
    ui.targeting = null; notify(); return;
  }
  const card = c.hand[handIdx];
  const def = CARDS[card.key];
  if (def.unplayable) { invalidCardFeedback(card, `${def.name} is a ${def.type} and cannot be played.`); return; }
  const cost = effCost(card);
  if (cost > c.energy) { invalidCardFeedback(card, `${def.name} needs ${cost} Energy; you have ${c.energy}.`); return; }
  if (def.can && !def.can(card.up)) { invalidCardFeedback(card, def.canMsg || `${def.name}'s condition is not currently met.`); return; }
  if (def.targets.length) {
    ui.targeting = { handIdx, specs: def.targets, picked: [], optional: !!def.optionalTargets };
    notify();
  } else {
    resolveCard(handIdx, []);
  }
}

export function tileEligible(i, spec, picked) {
  const b = board(), cell = b.cells[i];
  if (cell.void) return false;
  if (picked.includes(i)) return false;
  switch (spec) {
    case 'hidden': return isHiddenUsable(i);
    case 'open': return cell.revealed && !cell.construct;
    case 'number': return cell.revealed && numAt(i) > 0;
    case 'row': return true;
    case 'anytile': return true;
  }
  return false;
}

function clickTileTargeting(i) {
  const t = ui.targeting;
  const spec = t.specs[t.picked.length];
  if (!tileEligible(i, spec, t.picked)) return;
  t.picked.push(spec === 'row' ? Math.floor(i / board().size) : i);
  if (t.picked.length >= t.specs.length) finishTargeting();
  else notify();
}

function finishTargeting() {
  const t = ui.targeting;
  ui.targeting = null;
  resolveCard(t.handIdx, t.picked);
}

function resolveCard(handIdx, picked) {
  const c = cbt();
  const card = c.hand[handIdx];
  if (!card) return;
  const def = CARDS[card.key];
  recordCardPlayed(card.key);
  const cost = effCost(card);
  if (card.key === 'entombcard' && hasT('keystone') && !c.keystoneUsed && cost === 0) c.keystoneUsed = true;
  c.energy -= cost;
  c.hand.splice(handIdx, 1);
  sfx('play');
  def.play(card.up, picked);
  if (!c.over) {
    if (def.type === 'Power') c.powersPlayed.push(card);
    else if (def.exhaust) {
      c.exhaust.push(card);
      if (run.cls === 'archivist' && !c.classState.exhaustUsed) {
        c.classState.exhaustUsed = true;
        drawCards(1);
        toast('Cross-reference: draw 1');
      }
    }
    else c.discard.push(card);
  }
  notify();
}

export function cancelTargeting() {
  ui.targeting = null;
  ui.gadgetTargeting = null;
  notify();
}

/* ================= tile clicks (free actions) ================= */
export function clickTile(i) {
  const c = cbt();
  if (c.over) return;
  if (ui.gadgetTargeting) {
    const key = ui.gadgetTargeting;
    ui.gadgetTargeting = null;
    run.gadgets.splice(run.gadgets.indexOf(key), 1);
    GADGETS[key].use(i);
    notify();
    return;
  }
  if (ui.targeting) { clickTileTargeting(i); return; }
  const cell = board().cells[i];
  if (cell.void || cell.revealed || cell.entombed) return;
  if (ui.flagMode) { toggleFlag(i); return; }
  if (cell.flag) return; // classic: click on flag does nothing
  if (c.picks <= 0) { toast('Out of picks ⛏ — cards still dig, or end turn.', true); return; }
  c.picks--;
  revealTile(i, 'reveal');
  notify();
}

export function toggleFlag(i) {
  if (run.challenge === 'noflags') { toast('Unmarked Stone forbids flags.', true); sfx('invalid'); haptic('invalid'); return; }
  if (hasT('dowsingrod')) { toast('The Dowsing Rod forbids flags.', true); return; }
  const cell = board().cells[i];
  if (!isHiddenUsable(i)) return;
  cell.flag = cell.flag ? 0 : 1;
  if (cell.flag && cell.mine && run.cls === 'gambler' && !cbt().classState.luckyUsed) {
    cbt().classState.luckyUsed = true;
    drawCards(1);
    toast('Read the Tell: correct flag draws 1');
  }
  sfx('flag');
  haptic('flag');
  notify();
}

export function toggleFlagMode() {
  ui.flagMode = !ui.flagMode;
  notify();
}

export function selectEnemy(idx) {
  const e = cbt().enemies[idx];
  if (e && e.hp > 0 && !e.data.buried) { cbt().targetIdx = idx; notify(); }
}

export function useGadget(key) {
  const g = GADGETS[key];
  if (!run.combat || cbt().over) return;
  if (key === 'smokebomb' && cbt().kind === 'boss') { toast('No escape from a boss!', true); return; }
  if (g.target) {
    ui.gadgetTargeting = key;
    ui.targeting = null;
    toast(`${g.name}: pick a tile`);
    notify();
    return;
  }
  run.gadgets.splice(run.gadgets.indexOf(key), 1);
  g.use();
  notify();
}

/* ================= rewards ================= */
function combatVictory() {
  const c = cbt();
  const kind = c.kind;
  let gold = kind === 'boss' ? 75 : kind === 'elite' ? 30 : 10 + randInt(11);
  if (kind === 'boss') {
    run.bossesDefeated ??= [];
    for (const enemy of c.enemies) if (!run.bossesDefeated.includes(enemy.key)) run.bossesDefeated.push(enemy.key);
  }
  if (c.fullCleared) gold += 15;
  run.gold += gold;
  sfx('coin');
  run.reward = {
    gold, kind, fullClear: c.fullCleared,
    cards: rollCardReward(c.fullCleared),
    cardTaken: false,
    gadget: (kind !== 'boss' && random() < (kind === 'elite' ? 0.5 : 0.3)) ? randPick(Object.keys(GADGETS)) : null,
    trinket: kind === 'elite' ? unownedTrinket() : null,
    bossTrinkets: kind === 'boss' ? ['lamp', 'dowsingrod'].filter(k => !run.trinkets.includes(k)) : null,
  };
  for (const card of run.reward.cards) recordCardSeen(card.key);
  if (run.reward.trinket) recordItemSeen(`trinket:${run.reward.trinket}`);
  if (run.reward.gadget) recordItemSeen(`gadget:${run.reward.gadget}`);
  for (const key of run.reward.bossTrinkets || []) recordItemSeen(`trinket:${key}`);
  run.combat = null;
  ui.screen = 'reward';
  if (kind === 'boss') queueCutscene(`boss-aftermath-${run.stratum}`, {}, true);
  notify();
}

function rollCardReward(upgraded) {
  const pool = Object.keys(CARDS).filter(k => {
    const d = CARDS[k];
    return (d.cls === run.cls || d.cls === 'neutral') && ['common', 'uncommon', 'rare'].includes(d.rarity);
  });
  const byRarity = r => pool.filter(k => CARDS[k].rarity === r);
  const picks = [];
  let guard = 30;
  while (picks.length < 3 && guard-- > 0) {
    const roll = random();
    const r = roll < 0.10 ? 'rare' : roll < 0.40 ? 'uncommon' : 'common';
    const cand = byRarity(r).filter(k => !picks.includes(k));
    const k = randPick(cand.length ? cand : pool.filter(x => !picks.includes(x)));
    if (k) picks.push(k);
    else break;
  }
  return picks.map(k => ({ key: k, up: upgraded ? 1 : 0 }));
}

export function takeRewardCard(i) {
  const r = run.reward;
  if (r.cardTaken) return;
  r.cardTaken = true;
  run.deck.push(mkCard(r.cards[i].key, r.cards[i].up));
  recordCardOwned(r.cards[i].key);
  toast(`Added ${CARDS[r.cards[i].key].name}${r.cards[i].up ? '+' : ''} to your deck`);
  deckChanged('add', `${CARDS[r.cards[i].key].name}${r.cards[i].up ? '+' : ''} joins the deck`);
  notify();
}
export function takeRewardTrinket() {
  const r = run.reward;
  if (!r.trinket) return;
  run.trinkets.push(r.trinket);
  recordItemOwned(`trinket:${r.trinket}`);
  r.trinket = null;
  notify();
}
export function takeBossTrinket(key) {
  const r = run.reward;
  if (!r.bossTrinkets || !r.bossTrinkets.includes(key)) return;
  run.trinkets.push(key);
  recordItemOwned(`trinket:${key}`);
  r.bossTrinkets = null;
  notify();
}
export function takeRewardGadget() {
  const r = run.reward;
  if (!r.gadget || run.gadgets.length >= 3) return;
  run.gadgets.push(r.gadget);
  recordItemOwned(`gadget:${r.gadget}`);
  r.gadget = null;
  notify();
}

function advanceStratum() {
  run.stratum++;
  run.hp = Math.min(run.maxHp, run.hp + effectiveHealing(Math.floor(run.maxHp * 0.25)));
  toast(`Descending… you rest and recover. Welcome to ${STRATA[run.stratum].name}`);
  genMapForStratum();
  queueCutscene(`descent-${run.stratum}`, {}, true);
  ui.screen = 'map';
}

export function finishReward() {
  const r = run.reward;
  run.reward = null;
  if (r.kind === 'boss') {
    if (run.stratum >= 2) {
      sfx('victory'); haptic('victory'); ui.screen = 'victory'; queueCutscene('finale', {}, true);
      recordRunHistory(run, true); recordDailyRunEnd(true); notify(); return;
    }
    advanceStratum();
    notify();
    return;
  }
  ui.screen = 'map';
  notify();
}

/* ================= camp / shop / events ================= */
export function campHeal() {
  const heal = effectiveHealing(Math.floor(run.maxHp * 0.3));
  run.hp = Math.min(run.maxHp, run.hp + heal);
  sfx('heal');
  toast(`Rested: +${heal} HP`);
  ui.screen = 'map'; notify();
}
export function campSurvey() {
  run.surveyNext = true;
  toast('Surveyed: your next combat starts 25% revealed.');
  ui.screen = 'map'; notify();
}
export function campTrainPicks() {
  if ((run.pickBonus || 0) >= 2) { toast('Your run is already at the +2 pick training cap.', true); return; }
  run.pickBonus = (run.pickBonus || 0) + 1;
  toast(`Trail training: permanent +1 max pick per turn (${basePicksFor(run.cls) + run.pickBonus} base)`);
  ui.screen = 'map'; notify();
}
export function campUpgrade() {
  const upgradable = run.deck.filter(c => !c.up && CARDS[c.key].cost != null);
  if (!upgradable.length) { toast('Nothing to upgrade.', true); return; }
  openModal({ kind: 'upgrade' });
}
export function doUpgrade(deckIdx) {
  run.deck[deckIdx].up = 1;
  run.upgrades = (run.upgrades || 0) + 1;
  ui.modal = null;
  toast(`${CARDS[run.deck[deckIdx].key].name}+ !`);
  deckChanged('upgrade', `${CARDS[run.deck[deckIdx].key].name} was upgraded`);
  if (ui.screen === 'camp' || ui.screen === 'puzzle') ui.screen = 'map';
  notify();
}

export function genShop() {
  const pool = Object.keys(CARDS).filter(k => (CARDS[k].cls === run.cls || CARDS[k].cls === 'neutral') && ['common', 'uncommon', 'rare'].includes(CARDS[k].rarity));
  const cards = shuffle(pool).slice(0, 5).map(k => ({
    key: k,
    price: CARDS[k].rarity === 'rare' ? 130 + randInt(30) : CARDS[k].rarity === 'uncommon' ? 70 + randInt(20) : 45 + randInt(15),
    sold: false,
  }));
  const trinkets = [];
  for (let i = 0; i < 2; i++) {
    const t = unownedTrinket();
    if (t && !trinkets.some(x => x.key === t)) trinkets.push({ key: t, price: 120 + randInt(60), sold: false });
  }
  const gadgets = shuffle(Object.keys(GADGETS)).slice(0, 2).map(k => ({ key: k, price: 30 + randInt(15), sold: false }));
  run.shop = { cards, trinkets, gadgets };
  for (const item of cards) recordCardSeen(item.key);
  for (const item of trinkets) recordItemSeen(`trinket:${item.key}`);
  for (const item of gadgets) recordItemSeen(`gadget:${item.key}`);
}
export function buyShopCard(i) {
  const it = run.shop.cards[i];
  if (it.sold || run.gold < it.price) { toast('Not enough gold.', true); return; }
  run.gold -= it.price; it.sold = true;
  run.deck.push(mkCard(it.key));
  recordCardOwned(it.key);
  deckChanged('add', `${CARDS[it.key].name} joins the deck`);
  notify();
}
export function buyShopTrinket(i) {
  const it = run.shop.trinkets[i];
  if (it.sold || run.gold < it.price || run.trinkets.includes(it.key)) { toast('Not enough gold.', true); return; }
  run.gold -= it.price; it.sold = true;
  run.trinkets.push(it.key);
  recordItemOwned(`trinket:${it.key}`);
  notify();
}
export function buyShopGadget(i) {
  const it = run.shop.gadgets[i];
  if (it.sold || run.gold < it.price) { toast('Not enough gold.', true); return; }
  if (run.gadgets.length >= 3) { toast('Gadget slots full (3).', true); return; }
  run.gold -= it.price; it.sold = true;
  run.gadgets.push(it.key);
  recordItemOwned(`gadget:${it.key}`);
  notify();
}
export function buyRemoval() {
  if (run.gold < run.removalCost) { toast('Not enough gold.', true); return; }
  openModal({ kind: 'remove' });
}
export function doRemove(deckIdx) {
  run.gold -= run.removalCost;
  run.removalCost += 25;
  const [c] = run.deck.splice(deckIdx, 1);
  ui.modal = null;
  toast(`Removed ${CARDS[c.key].name}.`);
  deckChanged('remove', `${CARDS[c.key].name} was laid to rest`);
  notify();
}
export function gotoMap() {
  ui.screen = 'map';
  notify();
}

/* ----- events ----- */
export const EVENT_CATALOG = {
  shrine: {
    emoji: '🚪', title: 'The 50/50 Shrine',
    text: "Two doors of scorched brass. Behind one: a delver's prize. Behind the other: a blast that never went off — until now. The one honest coin flip in the Undermine, priced up front.",
    choices: [
      { key: 'left', label: 'The left door', desc: '50%: gadget + 30 gold · 50%: heavy mine damage.' },
      { key: 'right', label: 'The right door', desc: "Same odds. It's a coin flip; the door doesn't care." },
      { key: 'walk', label: 'Walk away', desc: 'No flip, no prize.' },
    ],
  },
  corpse: {
    emoji: '🪦', title: "The Cartographer's Corpse",
    text: 'He mapped three strata and died six feet from a camp. His satchel bulges with annotated charts. His hand still grips a charcoal stick.',
    choices: [
      { key: 'take', label: 'Take his maps', desc: 'Gain a rare trinket — and his Claustrophobia (curse: boards spawn +2 mines).' },
      { key: 'bury', label: 'Bury him properly', desc: '+3 max HP.' },
    ],
  },
  monty: {
    emoji: '🐐', title: "The Rat's Three Doors",
    text: 'A rat host hides one gold coffer behind three doors and goats behind the others. You pick a door. He opens a different door to reveal a goat, then offers you a switch.',
    choices: [
      { key: 'switch', label: 'Switch doors', desc: 'Trade your first choice for the remaining closed door.' },
      { key: 'stay', label: 'Stay', desc: 'Trust the door you chose first.' },
    ],
  },
  prisoners: {
    emoji: '⛓️', title: "The Prisoners' Bargain",
    text: 'You and another delver choose in separate cells. Cooperate and share. Defect and seize the haul. The other prisoner is making the same calculation.',
    choices: [
      { key: 'cooperate', label: 'Cooperate', desc: 'Best together, but vulnerable to betrayal.' },
      { key: 'defect', label: 'Defect', desc: 'Exploit cooperation; suffer if both defect.' },
    ],
  },
  birthday: {
    emoji: '🎂', title: 'The Birthday Crypt',
    text: 'The inscription asks: how many randomly born delvers are needed before a shared birthday becomes more likely than not?',
    choices: [
      { key: '23', label: '23 delvers', desc: 'A surprisingly small gathering.' },
      { key: '50', label: '50 delvers', desc: 'Half the days? Half the chance?' },
      { key: '183', label: '183 delvers', desc: 'Half of a 365-day year.' },
    ],
  },
  bayes: {
    emoji: '🧪', title: "The Alchemist's Test",
    text: 'Only 1% of delvers carry the Rot. This test catches 90% of cases but falsely marks 10% of healthy delvers. Yours is positive. Roughly how likely are you to carry it?',
    choices: [
      { key: '9', label: 'About 9%', desc: 'Start with the base rate, then update.' },
      { key: '50', label: 'About 50%', desc: 'A positive test sounds like even odds.' },
      { key: '90', label: 'About 90%', desc: 'Use the test sensitivity directly.' },
    ],
  },
  secretary: {
    emoji: '📜', title: 'The Hiring Ledger',
    text: 'Candidates arrive one at a time. Rejected candidates cannot return. What fraction should you observe before choosing the next candidate better than all you have seen?',
    choices: [
      { key: '37', label: 'About 37%', desc: 'Observe first, then take the next record-breaker.' },
      { key: 'first', label: 'Choose the first', desc: 'Never risk losing a good candidate.' },
      { key: 'last', label: 'Wait until the last', desc: 'See almost everyone before committing.' },
    ],
  },
  commons: {
    emoji: '🍄', title: 'The Common Mushroom Bed',
    text: 'A shared cave bed feeds every passing delver if each takes a little. It can also be stripped bare tonight.',
    choices: [
      { key: 'one', label: 'Take one share', desc: 'A sustainable reward for you and those behind you.' },
      { key: 'strip', label: 'Strip the bed', desc: 'Much more gold now, with a lasting cost.' },
      { key: 'restore', label: 'Tend the bed', desc: 'Take nothing; recover while restoring the commons.' },
    ],
  },
  matching: {
    emoji: '🪙', title: 'Matching Pennies',
    text: 'The merchant wins if your coins match; you win if they differ. Neither side has a safe pure strategy.',
    choices: [
      { key: 'heads', label: 'Show heads', desc: 'The merchant chooses at the same time.' },
      { key: 'tails', label: 'Show tails', desc: 'A symmetric choice; unpredictability is the strategy.' },
    ],
  },
  sunkcost: {
    emoji: '🕳️', title: 'The Bottomless Dig',
    text: 'You have already spent three days digging this dry shaft. That effort is gone either way. A foreman asks whether you will spend one more day.',
    choices: [
      { key: 'leave', label: 'Leave the shaft', desc: 'Ignore unrecoverable costs and judge only what comes next.' },
      { key: 'continue', label: 'Keep digging', desc: 'Maybe the next swing finally pays for the last three days.' },
    ],
  },
  auction: {
    emoji: '🔨', title: 'The Sealed-Bid Auction',
    text: 'You value a relic at 45 gold. In this second-price auction, the highest bidder wins but pays the second-highest bid. What should you bid?',
    choices: [
      { key: '25', label: 'Bid 25 gold', desc: 'Shade your bid to chase a bargain.' },
      { key: '45', label: 'Bid 45 gold', desc: 'Bid exactly what the relic is worth to you.' },
      { key: '75', label: 'Bid 75 gold', desc: 'Bid aggressively to guarantee the win.' },
    ],
  },
  ruin: {
    emoji: '🎲', title: "The Gambler's Ruin",
    text: 'A bone die offers one last even-money double-or-nothing wager. The house has deeper pockets than you and will keep offering the same bet.',
    choices: [
      { key: 'cash', label: 'Cash out', desc: 'Take a certain reward and end the repeated game.' },
      { key: 'double', label: 'Double or nothing', desc: 'A fair single bet becomes dangerous when repeated to ruin.' },
    ],
  },
  ...CORE_BEHAVIORAL_EVENTS,
  ...EXTRA_EVENT_CATALOG,
};

function prepareEventState(key) {
  const event = EVENT_CATALOG[key];
  if (!event?.behavioral) { run.eventState = null; return; }
  const rolls = Array.from({ length: 6 }, () => random());
  const curseKey = randPick(Object.keys(PERSISTENT_CURSES));
  run.eventState = createBehavioralEventState(
    event, run, rolls, randPick(Object.keys(GADGETS)), curseKey, PERSISTENT_CURSES[curseKey].name,
  );
}

export function currentEventView() {
  const event = EVENT_CATALOG[run?.event];
  if (!event) return null;
  if (run.eventState?.chainReturn) {
    const thread = run.eventThreads?.[run.eventState.threadKey];
    return {
      stageLabel: 'A choice remembered',
      text: `The chamber remembers that you chose “${thread?.choiceLabel || thread?.choice || 'your path'}” at ${event.title}. Its consequence has followed you here.`,
      choices: [
        { key: 'stand', label: 'Stand by the choice', desc: 'Accept its delayed reward and its lingering burden.' },
        { key: 'amend', label: 'Make amends', desc: 'Pay gold to turn the old consequence toward recovery.' },
      ],
    };
  }
  if (!event.behavioral) return { text: event.text, choices: event.choices, stageLabel: 'Decision' };
  if (!run.eventState) prepareEventState(run.event);
  return behavioralEventView(event, run.eventState);
}

function startEvent() {
  run.eventThreads ??= {};
  const pending = Object.entries(run.eventThreads).filter(([, thread]) => thread.stage === 1);
  if (pending.length && random() < 0.45) {
    const [key] = randPick(pending);
    run.event = key;
    run.eventState = { chainReturn: true, threadKey: key };
    ui.screen = 'event'; notify(); return;
  }
  const all = [...Object.keys(EVENT_CATALOG), 'puzzle'];
  const unseen = all.filter(e => !run.seenEvents.includes(e));
  const pick = randPick(unseen.length ? unseen : all);
  run.seenEvents.push(pick);
  if (pick === 'puzzle') { startPuzzle('random'); return; }
  run.event = pick;
  prepareEventState(pick);
  ui.screen = 'event';
  notify();
}

function eventResult(title, html, btn = 'Continue') {
  openModal({ kind: 'info', title, btn, next: 'map', html });
}

export function startSpecificEvent(key) {
  if (!EVENT_CATALOG[key]) return;
  run.event = key;
  prepareEventState(key);
  ui.modal = null; ui.cutscene = null; ui.screen = 'event';
  notify();
}

function applyEventEffect(effect = {}) {
  const lines = [];
  if (effect.gold) {
    const before = run.gold;
    run.gold = Math.max(0, run.gold + effect.gold);
    const changed = run.gold - before;
    if (changed > 0) lines.push(`Gain ${changed} gold.`);
    else if (changed < 0) lines.push(`Lose ${Math.abs(changed)} gold.`);
  }
  if (effect.damage) {
    const before = run.hp;
    run.hp = Math.max(1, run.hp - effect.damage);
    lines.push(`Lose ${before - run.hp} HP.`);
  }
  if (effect.maxHp) {
    run.maxHp += effect.maxHp;
    run.hp = Math.min(run.maxHp, run.hp + effectiveHealing(effect.maxHp));
    lines.push(`Gain ${effect.maxHp} max HP.`);
  }
  if (effect.heal) {
    const before = run.hp;
    run.hp = Math.min(run.maxHp, run.hp + effectiveHealing(effect.heal));
    lines.push(`Recover ${run.hp - before} HP.`);
  }
  if (effect.curse && CARDS[effect.curse]) {
    run.deck.push(mkCard(effect.curse));
    recordCardOwned(effect.curse);
    lines.push(`Add ${CARDS[effect.curse].name} to your deck.`);
    deckChanged('add', `${CARDS[effect.curse].name} stains the deck`);
  }
  if (effect.upgrade) {
    const eligible = run.deck.filter(card => !card.up && CARDS[card.key]?.cost != null);
    const card = randPick(eligible);
    if (card) {
      card.up = 1; run.upgrades = (run.upgrades || 0) + 1;
      lines.push(`Upgrade ${CARDS[card.key].name}.`);
      deckChanged('upgrade', `${CARDS[card.key].name} was upgraded`);
    } else {
      run.gold += 15;
      lines.push('Gain 15 gold.');
    }
  }
  if (effect.gadget && GADGETS[effect.gadget]) {
    if (run.gadgets.length < 3) {
      run.gadgets.push(effect.gadget);
      recordItemOwned(`gadget:${effect.gadget}`);
      lines.push(`Gain ${GADGETS[effect.gadget].name}.`);
    } else {
      run.gold += 20;
      lines.push('Gain 20 gold.');
    }
  }
  return lines;
}

export function eventChoice(which) {
  const behavioral = EVENT_CATALOG[run.event];
  if (run.eventState?.chainReturn) {
    const thread = run.eventThreads[run.eventState.threadKey];
    thread.stage = 2; thread.returnChoice = which;
    let html;
    if (which === 'stand') {
      run.gold += 25;
      run.deck.push(mkCard('dud'));
      recordCardOwned('dud');
      deckChanged('add', 'A remembered Dud joins the deck');
      html = `<p>You repeat your old answer. The crypt pays its debt: <b>gain 25 gold</b>, but the memory becomes a <b>Dud</b>.</p>`;
    } else {
      const paid = Math.min(15, run.gold);
      run.gold -= paid;
      const healed = Math.min(effectiveHealing(8), run.maxHp - run.hp);
      run.hp += healed;
      if (healed) sfx('heal');
      html = `<p>You alter the old bargain. <b>Pay ${paid} gold</b> and <b>recover ${healed} HP</b>.</p>`;
    }
    run.eventHistory.push({ id: run.event, chain: true, choice: which, stratum: run.stratum, floor: run.floors });
    eventResult(`↻ ${behavioral.title}: Remembered`, html);
    return;
  }
  if (behavioral?.behavioral) {
    if (!run.eventState) prepareEventState(run.event);
    const result = resolveBehavioralEvent(behavioral, run.eventState, which);
    if (!result) return;
    const consequenceLines = applyEventEffect(result.effect);
    if (!result.done) {
      toast(consequenceLines.join(' '));
      notify();
      return;
    }
    run.eventHistory ??= [];
    run.eventHistory.push({
      id: run.event, choice: which, observed: run.eventState.observed,
      stratum: run.stratum, floor: run.floors,
    });
    run.eventThreads ??= {};
    if (!run.eventThreads[run.event]) {
      const chosen = behavioral.actions?.find(action => action.key === which);
      run.eventThreads[run.event] = { stage: 1, choice: which, choiceLabel: chosen?.label || which, floor: run.floors };
    }
    const html = `<p>${result.action.label}. The chamber answers.</p>${consequenceLines.map(line => `<p><b>${line}</b></p>`).join('')}`;
    run.eventState.result = { title: `${behavioral.emoji} ${result.title}`, html };
    eventResult(`${behavioral.emoji} ${result.title}`, html);
    return;
  }
  // Every live catalog entry uses the behavioral decision system above.
}

/* ----- Honest Puzzle ----- */
/* "Honest" is a promise: the whole board is provable from the opening with pure
   logic, no guessing. Random layouts are drawn and checked against the no-guess
   solver until one keeps that promise. Uses run RNG, so dailies share puzzles. */
function genPuzzle(size, mineCount) {
  for (let attempt = 0; attempt < 200; attempt++) {
    const mines = new Set();
    while (mines.size < mineCount) mines.add(randInt(size * size));
    const numL = i => neighborsOf(i, size).filter(j => mines.has(j)).length;
    const zeros = [];
    for (let i = 0; i < size * size; i++) if (!mines.has(i) && numL(i) === 0) zeros.push(i);
    if (!zeros.length) continue;
    const opening = zeros[randInt(zeros.length)];
    if (solveScore(mines, size, opening) >= 1) return { mines, opening };
  }
  return { mines: new Set(Array.from({ length: mineCount }, (_, i) => size * size - 1 - i)), opening: 0 };
}

const digits = text => text.replace(/\s/g, '').split('').map(Number);
function sudokuTemplate(size, givensText) {
  const givensGrid = digits(givensText);
  const [boxRows, boxCols] = sudokuShape(size);
  const solution = solveSudoku(givensGrid, size, boxRows, boxCols);
  if (!solution || countSudokuSolutions(givensGrid, size, boxRows, boxCols) !== 1) throw new Error(`Invalid ${size}×${size} Sudoku template`);
  return {
    solution, givens: givensGrid.map((value, i) => value ? i : -1).filter(i => i >= 0),
    rating: sudokuDifficulty(givensGrid, size, boxRows, boxCols),
  };
}
const SUDOKU_PUZZLES = {
  4: [sudokuTemplate(4, '0230 3012 0043 0001')],
  6: [sudokuTemplate(6, '000050 056103 004061 000204 045000 610000')],
  9: [sudokuTemplate(9, '800000000 003600000 070090200 050007000 000045700 000100030 001000068 008500010 090000400')],
};

const CROSSWORD_PUZZLES = {
  3: [
    { words: ['CAR', 'APE', 'RED'], acrossClues: ['Road vehicle', 'Large primate', 'Warning colour'], downClues: ['Automobile', 'Mimic', 'Colour of blood'] },
    { words: ['APE', 'PEA', 'EAR'], acrossClues: ['Primate', 'Small green vegetable', 'Organ used for listening'], downClues: ['Mimic another person', 'Round garden seed', 'Part of the body used for listening'] },
    { words: ['CAT', 'ARE', 'TEN'], acrossClues: ['Feline', 'Exist', 'Number after nine'], downClues: ['Household mouser', 'Present form of “be”', 'Pins in a full bowling rack'] },
  ],
  4: [
    { words: ['BALL', 'AREA', 'LEAD', 'LADY'], acrossClues: ['Round toy', 'Region', 'Guide from the front', 'Woman of rank'], downClues: ['Formal dance', 'Surface measure', 'Metal with symbol Pb', 'Polite form of address'] },
    { words: ['SAND', 'AREA', 'NEAR', 'DART'], acrossClues: ['Desert grains', 'Region', 'Close by', 'Small pointed missile'], downClues: ['Material in an hourglass', 'Extent of a surface', 'Almost', 'Move suddenly'] },
  ],
  5: [{
    words: ['HEART', 'EMBER', 'ABUSE', 'RESIN', 'TREND'],
    acrossClues: ['Organ that pumps blood', 'Glowing coal', 'Misuse or mistreatment', 'Sticky tree substance', 'General direction of change'],
    downClues: ['Core symbol on a playing card', 'Last glowing piece of a fire', 'Treat cruelly', 'Pine secretion', 'Movement over time'],
  }],
};
for (const [size, templates] of Object.entries(CROSSWORD_PUZZLES)) for (const template of templates) {
  if (!validateCrossword(template, Number(size))) throw new Error(`Invalid ${size}×${size} crossword template`);
}

const SEQUENCE_PUZZLES = {
  0: [
    { prompt: '4, 7, 10, 13, ?', answer: 16, choices: [15, 16, 17, 19], method: 'Add three.' },
    { prompt: '81, 27, 9, 3, ?', answer: 1, choices: [0, 1, 2, 6], method: 'Divide by three.' },
    { prompt: '1, 4, 7, 10, 13, ?', answer: 16, choices: [14, 15, 16, 17], method: 'Add three.' },
  ],
  1: [
    { prompt: '2, 4, 8, 16, ?', answer: 32, choices: [24, 30, 32, 34], method: 'Double each term.' },
    { prompt: '1, 1, 2, 3, 5, ?', answer: 8, choices: [6, 7, 8, 10], method: 'Add the previous two terms.' },
    { prompt: '3, 6, 11, 18, ?', answer: 27, choices: [25, 26, 27, 29], method: 'Use successive odd gaps.' },
  ],
  2: [
    { prompt: '2, 5, 4, 8, 6, 11, 8, ?', answer: 14, choices: [10, 12, 13, 14], method: 'Interleave +2 and +3 sequences.' },
    { prompt: '1, 2, 6, 15, 31, ?', answer: 56, choices: [47, 52, 56, 63], method: 'Add consecutive squares.' },
    { prompt: '3, 4, 8, 9, 18, 19, ?', answer: 38, choices: [28, 36, 38, 40], method: 'Alternate plus one and times two.' },
  ],
};

function startMinesPuzzle(difficulty = 0) {
  const size = [6, 7, 8][difficulty];
  const mineBase = [6, 9, 13][difficulty];
  const { mines, opening } = genPuzzle(size, mineBase + randInt(2));
  const cells = [];
  for (let i = 0; i < size * size; i++) {
    cells.push({ mine: mines.has(i), revealed: false, flag: 0, entombed: false, void: false, ever: false, crater: false, scan: null, construct: null, grub: false, primed: false, glow: false });
  }
  run.puzzle = {
    type: 'mines', difficulty, difficultyLabel: ['Measured', 'Demanding', 'Relentless'][difficulty],
    board: { size, cells }, scans: [2, 1, 0][difficulty], scanMode: false, failed: false, solved: false,
  };
  puzzleFlood(opening);
}

function startSudokuPuzzle(difficulty = 0) {
  const size = [4, 6, 9][difficulty];
  const template = randPick(SUDOKU_PUZZLES[size]);
  const givenSet = new Set(template.givens);
  run.puzzle = {
    type: 'sudoku', difficulty, difficultyLabel: ['Measured', 'Demanding', 'Relentless'][difficulty], size,
    boxRows: sudokuShape(size)[0], boxCols: sudokuShape(size)[1], solution: template.solution.slice(), givens: template.givens.slice(),
    values: template.solution.map((value, i) => givenSet.has(i) ? value : 0),
    notes: Array.from({ length: size * size }, () => []), noteMode: false, rating: template.rating,
    failed: false, solved: false,
  };
}

function startCrosswordPuzzle(difficulty = 0) {
  const size = [3, 4, 5][difficulty];
  const template = randPick(CROSSWORD_PUZZLES[size]);
  run.puzzle = {
    type: 'crossword', difficulty, difficultyLabel: ['Measured', 'Demanding', 'Relentless'][difficulty], size,
    solution: template.words.join('').split(''), values: Array(size * size).fill(''), words: template.words.slice(),
    acrossClues: template.acrossClues.slice(), downClues: template.downClues.slice(), locale: 'en-CA',
    failed: false, solved: false,
  };
}

function toggleCross(values, size, i) {
  const row = Math.floor(i / size), col = i % size;
  for (const [dr, dc] of [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]]) {
    const r = row + dr, c = col + dc;
    if (r >= 0 && c >= 0 && r < size && c < size) values[r * size + c] = values[r * size + c] ? 0 : 1;
  }
}

function startLightsPuzzle(difficulty = 1) {
  const size = difficulty >= 2 ? 4 : 3;
  const minimum = [2, 4, 7][difficulty];
  let values = null, solutionMoves = null;
  for (let attempt = 0; attempt < 200; attempt++) {
    const candidate = Array(size * size).fill(0);
    const presses = minimum + 2 + randInt(size + difficulty + 1);
    for (let n = 0; n < presses; n++) toggleCross(candidate, size, randInt(candidate.length));
    const moves = minimumLightsSolution(candidate, size);
    if (moves != null && moves >= minimum) { values = candidate; solutionMoves = moves; break; }
  }
  if (!values) {
    values = difficulty === 2
      ? '0101001000011000'.split('').map(Number)
      : Array(size * size).fill(0);
    if (difficulty !== 2) for (let i = 0; i < minimum; i++) toggleCross(values, size, (i * 3 + 1) % values.length);
    solutionMoves = minimumLightsSolution(values, size);
  }
  run.puzzle = {
    type: 'lights', difficulty, difficultyLabel: ['Measured', 'Demanding', 'Relentless'][difficulty],
    size, values, minimumMoves: solutionMoves, failed: false, solved: false, moves: 0,
  };
}

function startNonogramPuzzle(difficulty = 1) {
  const size = difficulty >= 2 ? 7 : 5;
  let generated = null;
  for (let attempt = 0; attempt < 300; attempt++) {
    const density = difficulty === 0 ? .48 : difficulty === 1 ? .44 : .5;
    const solution = Array.from({ length: size * size }, () => random() < density ? 1 : 0);
    const { rowClues, colClues } = nonogramClues(solution, size);
    const lines = [...rowClues, ...colClues];
    const interactionFloor = [2, 4, 5][difficulty];
    const nontrivial = lines.every(clue => !(clue.length === 1 && (clue[0] === 0 || clue[0] === size)))
      && lines.filter(clue => clue.length > 1).length >= interactionFloor;
    if (nontrivial && countNonogramSolutions(rowClues, colClues, size) === 1) {
      generated = { solution, rowClues, colClues }; break;
    }
  }
  if (!generated) {
    const fallbackRows = difficulty >= 2
      ? ['0001111','0101011','0010001','1111001','0010100','1101001','1110000']
      : ['00100','01110','11111','01110','00100'];
    const fallbackSize = fallbackRows.length;
    const solution = fallbackRows.flatMap(row => row.split('').map(Number));
    generated = { solution, ...nonogramClues(solution, fallbackSize) };
  }
  run.puzzle = {
    type: 'nonogram', difficulty, difficultyLabel: ['Measured', 'Demanding', 'Relentless'][difficulty],
    size: Math.sqrt(generated.solution.length), solution: generated.solution,
    values: Array(generated.solution.length).fill(0), rowClues: generated.rowClues, colClues: generated.colClues,
    failed: false, solved: false,
  };
}

function startSequencePuzzle(difficulty = 1) {
  const template = randPick(SEQUENCE_PUZZLES[difficulty]);
  run.puzzle = {
    type: 'sequence', difficulty, difficultyLabel: ['Measured', 'Demanding', 'Relentless'][difficulty],
    ...template, choices: shuffle(template.choices), failed: false, solved: false,
  };
}

export function startPuzzle(type = 'mines') {
  let picked = type;
  if (picked === 'random') {
    const pools = [
      ['mines', 'mines', 'sudoku', 'crossword', 'sequence', 'lights', 'nonogram'],
      ['mines-medium', 'sudoku-medium', 'crossword-medium', 'sequence-medium', 'lights-medium', 'nonogram-medium'],
      ['mines-hard', 'sudoku-hard', 'crossword-hard', 'sequence-hard', 'lights-hard', 'nonogram-hard'],
    ];
    picked = randPick(pools[clamp(run.stratum, 0, 2)]);
  }
  const difficulty = picked.endsWith('-hard') ? 2 : picked.endsWith('-medium') ? 1 : 0;
  const family = picked.replace(/-(medium|hard)$/, '');
  if (family === 'sudoku') startSudokuPuzzle(difficulty);
  else if (family === 'crossword') startCrosswordPuzzle(difficulty);
  else if (family === 'sequence') startSequencePuzzle(difficulty);
  else if (family === 'lights') startLightsPuzzle(difficulty);
  else if (family === 'nonogram') startNonogramPuzzle(difficulty);
  else startMinesPuzzle(difficulty);
  ui.screen = 'puzzle';
  ui.flagMode = false;
  notify();
}
function puzzleFlood(start) {
  const b = run.puzzle.board;
  const numL = i => neighborsOf(i, b.size).filter(j => b.cells[j].mine).length;
  const q = [start];
  while (q.length) {
    const i = q.pop();
    const cell = b.cells[i];
    if (!cell || cell.revealed || cell.mine || cell.flag) continue;
    cell.revealed = true;
    if (numL(i) === 0) for (const j of neighborsOf(i, b.size)) q.push(j);
  }
}
export function puzzleClick(i) {
  const p = run.puzzle;
  if (p.type && p.type !== 'mines') return;
  if (p.failed || p.solved) return;
  const cell = p.board.cells[i];
  if (cell.revealed) return;
  if (ui.flagMode) { cell.flag = cell.flag ? 0 : 1; notify(); return; }
  if (cell.flag) return;
  if (p.scanMode) {
    if (p.scans > 0) { cell.scan = cell.mine ? 'mine' : 'safe'; p.scans--; if (!p.scans) p.scanMode = false; }
    notify(); return;
  }
  if (cell.mine) {
    p.failed = true;
    cell.revealed = true; cell.crater = true; cell.mine = false;
    toast('The puzzle detonates. The engraving fades…', true);
    notify();
    return;
  }
  puzzleFlood(i);
  if (p.board.cells.every(c => c.mine || c.revealed)) {
    p.solved = true;
    toast('★ Flawless. The stone offers its secret.');
  }
  notify();
}
export function puzzleToggleFlag(i) {
  if (run.puzzle.type && run.puzzle.type !== 'mines') return;
  const cell = run.puzzle.board.cells[i];
  if (!cell.revealed) { cell.flag = cell.flag ? 0 : 1; notify(); }
}
export function togglePuzzleScan() {
  const p = run.puzzle;
  if (p.type && p.type !== 'mines') return;
  if (p.scans > 0) { p.scanMode = !p.scanMode; notify(); }
}

export function setLogicPuzzleCell(i, value) {
  const p = run.puzzle;
  if (!p || p.failed || p.solved || p.type === 'mines' || i < 0 || i >= p.values.length) return;
  if (p.type === 'sudoku') {
    if (p.givens.includes(i)) return;
    const number = clamp(Number(value) || 0, 0, p.size);
    if (p.noteMode && number) {
      const notes = p.notes[i] || (p.notes[i] = []);
      p.notes[i] = notes.includes(number) ? notes.filter(note => note !== number) : [...notes, number].sort((a, b) => a - b);
    } else {
      p.values[i] = number;
      p.notes[i] = [];
    }
  } else if (p.type === 'crossword') {
    p.values[i] = String(value || '').slice(-1).toUpperCase().replace(/[^A-Z]/g, '');
  }
  notify();
}

export function toggleSudokuNoteMode() {
  const p = run.puzzle;
  if (!p || p.type !== 'sudoku' || p.failed || p.solved) return;
  p.noteMode = !p.noteMode; notify();
}

export function toggleLightsCell(i) {
  const p = run.puzzle;
  if (!p || p.type !== 'lights' || p.failed || p.solved) return;
  toggleCross(p.values, p.size, i); p.moves++;
  if (p.values.every(value => !value)) { p.solved = true; toast('★ Every light is still. The stone yields.'); }
  notify();
}

export function toggleNonogramCell(i) {
  const p = run.puzzle;
  if (!p || p.type !== 'nonogram' || p.failed || p.solved) return;
  p.values[i] = (p.values[i] + 1) % 3;
  notify();
}

export function answerSequence(value) {
  const p = run.puzzle;
  if (!p || p.type !== 'sequence' || p.failed || p.solved) return;
  if (Number(value) === p.answer) { p.solved = true; toast('★ The sequence accepts the answer.'); }
  else { p.failed = true; toast('The sequence rejects the answer.', true); }
  notify();
}

export function checkLogicPuzzle() {
  const p = run.puzzle;
  if (!p || p.type === 'mines' || p.failed || p.solved) return;
  if (p.type !== 'nonogram' && p.values.some(value => value === 0 || value === '')) { toast('Every square needs an answer first.', true); return; }
  const correct = p.type === 'nonogram'
    ? p.values.every((value, i) => (value === 1) === (p.solution[i] === 1))
    : p.values.every((value, i) => String(value) === String(p.solution[i]));
  if (correct) {
    p.solved = true;
    toast('★ Flawless. The stone offers its secret.');
  } else {
    p.failed = true;
    toast('The answer breaks the engraving. It fades…', true);
  }
  notify();
}

/* ================= hidden QA lab ================= */
export const TEST_CUTSCENES = [
  ['opening', 'Opening'], ['shop', 'Merchant shop'], ['camp', 'Camp'],
  ['boss-intro-0', 'Boss 1 intro'], ['boss-aftermath-0', 'Boss 1 aftermath'],
  ['descent-1', 'Descent to stratum 2'], ['boss-intro-1', 'Boss 2 intro'], ['boss-aftermath-1', 'Boss 2 aftermath'],
  ['descent-2', 'Descent to stratum 3'], ['boss-intro-2', 'Final boss intro'], ['boss-aftermath-2', 'Final boss aftermath'],
  ['finale', 'Finale'],
];

function ensureTestRun(cls = 'sapper') {
  if (!run) newRun(cls, { testMode: true });
  run.testMode = true;
  run.gold = Math.max(run.gold, 999);
  run.hp = run.maxHp;
  ui.modal = null; ui.cutscene = null; ui.targeting = null; ui.gadgetTargeting = null;
}

export function testLaunch(kind, value = null) {
  if (kind === 'reset') {
    newRun(value && CLASSES[value] ? value : 'sapper', { testMode: true });
    run.testMode = true; run.gold = 999; ui.cutscene = null; ui.screen = 'map';
    toast('Fresh test run: full health and 999 gold.');
    notify(); return;
  }
  ensureTestRun();
  if (kind === 'shop') { genShop(); ui.screen = 'shop'; }
  else if (kind === 'camp') ui.screen = 'camp';
  else if (kind === 'event') { startSpecificEvent(value); return; }
  else if (kind === 'puzzle') { startPuzzle(value); return; }
  else if (kind === 'combat') { startCombat(value || 'dig'); ui.cutscene = null; return; }
  else if (kind === 'boss') {
    run.stratum = clamp(Number(value) || 0, 0, STRATA.length - 1);
    genMapForStratum(); startCombat('boss'); ui.cutscene = null; return;
  } else if (kind === 'reward') {
    const rewardKind = value || 'dig';
    run.combat = null;
    run.reward = {
      gold: rewardKind === 'boss' ? 150 : rewardKind === 'elite' ? 90 : 50,
      kind: rewardKind, fullClear: true, cards: rollCardReward(true), cardTaken: false,
      gadget: randPick(Object.keys(GADGETS)), trinket: rewardKind === 'elite' ? unownedTrinket() : null,
      bossTrinkets: rewardKind === 'boss' ? ['lamp', 'dowsingrod'].filter(k => !run.trinkets.includes(k)) : null,
    };
    ui.screen = 'reward';
  } else if (kind === 'cutscene') {
    ui.screen = 'map'; queueCutscene(value, { stratum: run.stratum });
  } else if (kind === 'map') ui.screen = 'map';
  else if (kind === 'victory') ui.screen = 'victory';
  else if (kind === 'gameover') { run.hp = 0; ui.screen = 'gameover'; }
  notify();
}

export function testRefill() {
  ensureTestRun();
  run.gold = 999; run.hp = run.maxHp;
  if (run.combat) { run.combat.energy = run.combat.maxEnergy; run.combat.picks = run.combat.maxPicks; }
  toast('Test resources refilled.');
  notify();
}

/* ================= score ================= */
export function score() {
  return run.floors * 10 + run.stratum * 50 + run.fullClears * 25 + Math.floor(run.gold / 2) + run.hp;
}

function recordDailyRunEnd(won) {
  if (!run?.daily || run.dailyRecorded) return;
  run.dailyRecorded = true;
  recordDailyResult(run.daily, { won, score: score(), cls: run.cls });
}
