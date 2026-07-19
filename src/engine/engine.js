/* CRYPTSWEEPER — game engine (DOM-free). React subscribes via subscribe/getVersion;
   every exported action mutates state then notify()s. Content data lives in data.js. */
import {
  STRATA, CLASSES, CARDS, TRINKETS, GADGETS, ENEMIES, FIGHTS, NN99_PHASES,
} from './data.js';
import { sfx } from './sfx.js';
import { recordProgress } from './progression.js';

/* ================= store ================= */
const listeners = new Set();
let version = 0;
export function subscribe(cb) { listeners.add(cb); return () => listeners.delete(cb); }
export function getVersion() { return version; }
function notify() {
  version++;
  recordProgress(run, ui.screen);
  if (run) persistRun('auto');
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
let _cardId = 0;
function mkCard(key, up = 0) { return { id: ++_cardId, key, up }; }

/* ================= global state ================= */
export let run = null;
export const ui = {
  screen: 'title', targeting: null, gadgetTargeting: null, flagMode: false,
  modal: null, toasts: [], shakeSeq: 0, dmg: [],
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
    const payload = { version: SAVE_VERSION, savedAt: Date.now(), screen: ui.screen, run };
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
    if (run.combat?.enemies) {
      for (const enemy of run.combat.enemies) enemy.def = ENEMIES[enemy.key];
      if (run.combat.picks == null) run.combat.picks = PICKS_PER_TURN;
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
    ui.screen = payload.screen || 'map';
    ui.targeting = null; ui.gadgetTargeting = null; ui.modal = null; ui.flagMode = false;
    notify();
    return true;
  } catch { return false; }
}

export function deleteSave(slot) {
  try { localStorage.removeItem(slotKey(slot)); } catch { /* storage unavailable */ }
}

export function goHome() {
  ui.screen = 'title';
  ui.targeting = null; ui.gadgetTargeting = null; ui.modal = null; ui.flagMode = false;
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
    surveyNext: false, seenEvents: [], combat: null, upgrades: 0, winRecorded: false,
    reward: null, shop: null, event: null, puzzle: null,
    daily: options.daily || null,
    rngState: options.daily ? dailySeed(options.daily) : null,
  };
  genMapForStratum();
  ui.screen = 'map';
  notify();
}

export function resetToTitle() {
  try { localStorage.removeItem(slotKey('auto')); } catch { /* storage unavailable */ }
  run = null;
  ui.screen = 'title';
  ui.targeting = null; ui.gadgetTargeting = null; ui.modal = null; ui.flagMode = false;
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

export function enterNode(r, c) {
  if (!reachableNodes().some(n => n.r === r && n.c === c)) return;
  run.pos = { r, c };
  run.visited[`${r},${c}`] = true;
  run.floors++;
  sfx('turn');
  const type = run.map.nodes[r][c];
  if (type === 'dig' || type === 'elite' || type === 'boss') startCombat(type);
  else if (type === 'camp') { ui.screen = 'camp'; notify(); }
  else if (type === 'shop') { genShop(); ui.screen = 'shop'; notify(); }
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
  if (!c.setup && count > 0) sfx(count >= 4 ? 'cascade' : 'dig');
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
  const b = board();
  const cand = b.cells.map((_, i) => i).filter(i => b.cells[i].revealed && !b.cells[i].void && numAt(i) > 0);
  cbt().lie = cand.length ? { tile: randPick(cand), delta: random() < 0.5 ? 1 : -1 } : null;
}
export function clearLie() { if (run.combat) cbt().lie = null; }

export function primeTile() {
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
export function loseHP(n) {
  run.hp -= n;
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
  const c = cbt();
  const soak = Math.min(c.block, n);
  c.block -= soak;
  const rest = n - soak;
  if (rest > 0) {
    run.hp -= rest;
    sfx('hurt');
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
    notify();
  }
}

/* ================= enemies ================= */
function spawnEnemy(key) {
  const def = ENEMIES[key];
  const scale = Math.max(0, run.stratum - def.home);
  const e = {
    key, def, scale,
    maxHp: Math.round(def.hp * (1 + 0.45 * scale)),
    hp: 0, block: 0, step: 0, data: {}, intent: null,
  };
  e.hp = e.maxHp;
  return e;
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
  sfx('death');
  log(`☠ ${e.def.name} destroyed.`);
  if (e.def.onDeath) e.def.onDeath(e);
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
  let p = 0;
  p += 2 * run.deck.filter(c => c.key === 'claustrophobia').length;
  if (hasT('lamp')) p += 4;
  return p;
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
    const e = spawnEnemy(k);
    c.enemies.push(e);
    if (e.def.setup) e.def.setup(e);
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
  if (hasT('wardplate')) c.plating = 4;
  assignLairs();
  c.setup = false;
  ui.screen = 'combat';
  ui.targeting = null; ui.gadgetTargeting = null; ui.flagMode = false;
  startTurn();
}

export const PICKS_PER_TURN = 3;

function startTurn() {
  const c = cbt();
  c.turn++;
  c.block = run.cls === 'warden' && c.turn > 1 ? Math.floor(c.block / 2) : 0;
  c.energy = c.maxEnergy;
  c.picks = PICKS_PER_TURN;
  c.revealedThisTurn = 0; c.sumThisTurn = 0; c.chordedThisTurn = false;
  c.powers.sixthUsed = false;
  c.classState.passiveUsed = false;
  c.classState.kindleUsed = false;
  c.classState.luckyUsed = false;
  c.classState.painUsed = false;
  c.classState.exhaustUsed = false;
  c.powers.blastDividendUsed = false;
  drawCards(5 + (hasT('indexcard') && c.turn === 1 ? 1 : 0) - (hasT('emberjar') && c.turn > 1 ? 1 : 0));
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
  if (def.unplayable) { toast('Unplayable.', true); return; }
  const cost = effCost(card);
  if (cost > c.energy) { toast('Not enough ⚡', true); return; }
  if (def.can && !def.can(card.up)) { toast(def.canMsg || "Can't play that now.", true); return; }
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
  run.combat = null;
  ui.screen = 'reward';
  notify();
}

function rollCardReward(upgraded) {
  const pool = Object.keys(CARDS).filter(k => {
    const d = CARDS[k];
    return d.cls === run.cls && ['common', 'uncommon', 'rare'].includes(d.rarity);
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
  toast(`Added ${CARDS[r.cards[i].key].name}${r.cards[i].up ? '+' : ''} to your deck`);
  notify();
}
export function takeRewardTrinket() {
  const r = run.reward;
  if (!r.trinket) return;
  run.trinkets.push(r.trinket);
  r.trinket = null;
  notify();
}
export function takeBossTrinket(key) {
  const r = run.reward;
  if (!r.bossTrinkets || !r.bossTrinkets.includes(key)) return;
  run.trinkets.push(key);
  r.bossTrinkets = null;
  notify();
}
export function takeRewardGadget() {
  const r = run.reward;
  if (!r.gadget || run.gadgets.length >= 3) return;
  run.gadgets.push(r.gadget);
  r.gadget = null;
  notify();
}

export function finishReward() {
  const r = run.reward;
  run.reward = null;
  if (r.kind === 'boss') {
    if (run.stratum >= 2) { sfx('victory'); ui.screen = 'victory'; notify(); return; }
    run.stratum++;
    run.hp = Math.min(run.maxHp, run.hp + Math.floor(run.maxHp * 0.25));
    toast(`Descending… you rest and recover. Welcome to ${STRATA[run.stratum].name}`);
    genMapForStratum();
  }
  ui.screen = 'map';
  notify();
}

/* ================= camp / shop / events ================= */
export function campHeal() {
  const heal = Math.floor(run.maxHp * 0.3);
  run.hp = Math.min(run.maxHp, run.hp + heal);
  toast(`Rested: +${heal} HP`);
  ui.screen = 'map'; notify();
}
export function campSurvey() {
  run.surveyNext = true;
  toast('Surveyed: your next combat starts 25% revealed.');
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
  if (ui.screen === 'camp' || ui.screen === 'puzzle') ui.screen = 'map';
  notify();
}

export function genShop() {
  const pool = Object.keys(CARDS).filter(k => CARDS[k].cls === run.cls && ['common', 'uncommon', 'rare'].includes(CARDS[k].rarity));
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
}
export function buyShopCard(i) {
  const it = run.shop.cards[i];
  if (it.sold || run.gold < it.price) { toast('Not enough gold.', true); return; }
  run.gold -= it.price; it.sold = true;
  run.deck.push(mkCard(it.key));
  notify();
}
export function buyShopTrinket(i) {
  const it = run.shop.trinkets[i];
  if (it.sold || run.gold < it.price || run.trinkets.includes(it.key)) { toast('Not enough gold.', true); return; }
  run.gold -= it.price; it.sold = true;
  run.trinkets.push(it.key);
  notify();
}
export function buyShopGadget(i) {
  const it = run.shop.gadgets[i];
  if (it.sold || run.gold < it.price) { toast('Not enough gold.', true); return; }
  if (run.gadgets.length >= 3) { toast('Gadget slots full (3).', true); return; }
  run.gold -= it.price; it.sold = true;
  run.gadgets.push(it.key);
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
  notify();
}
export function gotoMap() {
  ui.screen = 'map';
  notify();
}

/* ----- events ----- */
function startEvent() {
  const all = ['shrine', 'corpse', 'puzzle'];
  const unseen = all.filter(e => !run.seenEvents.includes(e));
  const pick = randPick(unseen.length ? unseen : all);
  run.seenEvents.push(pick);
  if (pick === 'puzzle') { startPuzzle(); return; }
  run.event = pick;
  ui.screen = 'event';
  notify();
}

export function eventChoice(which) {
  const st = STRATA[run.stratum];
  if (run.event === 'shrine') {
    if (which === 'walk') { ui.screen = 'map'; notify(); return; }
    if (random() < 0.5) {
      const g = randPick(Object.keys(GADGETS));
      if (run.gadgets.length < 3) run.gadgets.push(g);
      run.gold += 30;
      openModal({
        kind: 'info', title: '🚪 The prize!', btn: 'Continue', next: 'map',
        html: `<p>Behind the door: <b>${GADGETS[g].emoji} ${GADGETS[g].name}</b> and <b class="gold">+30 gold</b>.</p>`,
      });
    } else {
      const dmg = Math.floor(st.mineDmg * 1.5);
      run.hp = Math.max(1, run.hp - dmg);
      openModal({
        kind: 'info', title: '🚪 The blast.', btn: 'Limp on', next: 'map',
        html: `<p>Wrong door. You take <b class="flagc">${dmg} damage</b>.</p>`,
      });
    }
  } else if (run.event === 'corpse') {
    if (which === 'take') {
      const t = run.trinkets.includes('canary') ? null : 'canary';
      if (t) run.trinkets.push(t); else run.gold += 60;
      run.deck.push(mkCard('claustrophobia'));
      openModal({
        kind: 'info', title: '🪦 You take the maps', btn: 'Continue', next: 'map',
        html: `<p>${t ? `Gained <b>🐤 Miner's Canary</b>.` : 'Gained <b class="gold">60 gold</b>.'} …and <b class="flagc">Claustrophobia</b> haunts your deck. Boards spawn +2 mines.</p>`,
      });
    } else {
      run.maxHp += 3; run.hp += 3;
      openModal({
        kind: 'info', title: '🪦 You bury him', btn: 'Continue', next: 'map',
        html: `<p>The crypt approves. <b style="color:var(--n2)">+3 max HP</b>.</p>`,
      });
    }
  }
}

/* ----- Honest Puzzle ----- */
export function startPuzzle() {
  const size = 6;
  const mines = new Set([10, 13, 27, 35]); // (1,4) (2,1) (4,3) (5,5)
  const cells = [];
  for (let i = 0; i < size * size; i++) {
    cells.push({ mine: mines.has(i), revealed: false, flag: 0, entombed: false, void: false, ever: false, crater: false, scan: null, construct: null, grub: false, primed: false, glow: false });
  }
  run.puzzle = { board: { size, cells }, scans: 3, scanMode: false, failed: false, solved: false };
  const numL = i => neighborsOf(i, size).filter(j => mines.has(j)).length;
  const zero = cells.findIndex((c, i) => !c.mine && numL(i) === 0);
  puzzleFlood(zero);
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
  const cell = run.puzzle.board.cells[i];
  if (!cell.revealed) { cell.flag = cell.flag ? 0 : 1; notify(); }
}
export function togglePuzzleScan() {
  const p = run.puzzle;
  if (p.scans > 0) { p.scanMode = !p.scanMode; notify(); }
}

/* ================= score ================= */
export function score() {
  return run.floors * 10 + run.stratum * 50 + run.fullClears * 25 + Math.floor(run.gold / 2) + run.hp;
}
