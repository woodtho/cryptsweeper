/* FLAG THE DEEP — game engine (DOM-free). React subscribes via subscribe/getVersion;
   every exported action mutates state then notify()s. Content data lives in data.js. */
import {
  STRATA, CLASSES, CARDS, TRINKETS, GADGETS, ENEMIES, FIGHTS, NN99_PHASES, PERSISTENT_CURSES,
  NEUTRAL_REWARD_POOL, SIGNATURE_RELICS, consumableCardKey,
} from './data.js';
import { sfx } from './sfx.js';
import { haptic } from './haptics.js';
import { recordProgress } from './progression.js';
import {
  recordEnemySeen, recordEnemyDefeated, recordCardSeen, recordCardOwned, recordCardPlayed,
  recordItemSeen, recordItemOwned, seedRunCollection, recordDelverProgress,
} from './collection.js';
import { recordDailyAttempt, recordDailyResult } from './daily.js';
import { evaluateAchievements, recordRunHistory, recordSpeedrun } from './legacy.js';
import { loadPreferences } from './preferences.js';
import { bindRuntime } from './runtime.js';
import {
  FICTION_EVENT_CATALOG, createFictionEventState, fictionEventView,
  fictionEventFollowup, resolveFictionEvent, resolveFictionEventFollowup,
} from './events.js';
import {
  sudokuShape, solveSudoku, countSudokuSolutions, sudokuDifficulty,
  nonogramClues, countNonogramSolutions, minimumLightsSolution, minimumLightsSolutionPath, validateCrossword,
} from './puzzleValidation.js';

/* ================= store ================= */
const listeners = new Set();
let version = 0;
export function subscribe(cb) { listeners.add(cb); return () => listeners.delete(cb); }
export function getVersion() { return version; }
function notify() {
  version++;
  /* Record lifetime stats first so achievements can test the just-updated totals. */
  recordProgress(run, ui.screen);
  recordDelverProgress(run, ui.screen);
  const freshAchievements = evaluateAchievements(run, ui.screen);
  if (freshAchievements.length) ui.achievement = { ...freshAchievements[0], id: Date.now() };
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
function isConsumableCard(card) { return Boolean(CARDS[card?.key]?.consumableKey); }
function syncConsumableHand() {
  const c = run?.combat;
  if (!c) return;
  const remaining = new Map();
  for (const key of run.gadgets || []) remaining.set(key, (remaining.get(key) || 0) + 1);
  c.hand = (c.hand || []).filter(card => {
    const key = CARDS[card.key]?.consumableKey;
    if (!key) return true;
    const count = remaining.get(key) || 0;
    if (count <= 0) return false;
    remaining.set(key, count - 1);
    return true;
  });
  for (const [key, count] of remaining) {
    for (let i = 0; i < count; i++) c.hand.push(mkCard(consumableCardKey(key)));
  }
}

const RETIRED_CARD_REPLACEMENTS = {
  dud: 'exhaustion',
  bigred: 'killzone', markedcharge: 'controlled', blastdividend: 'powderkeg',
  wholepicture: 'knownquantity', crosssection: 'surveystakes',
  landslide: 'citybelow', lastlight: 'bandage', gravemoss: 'bandage',
};
function migrateCardDefinition(card, clsKey) {
  if (!card) return null;
  if (CARDS[card.key]) return card;
  let replacement = RETIRED_CARD_REPLACEMENTS[card.key];
  const generated = /^exp_([a-z]+)_(\d+)$/.exec(card.key || '');
  if (!replacement && generated && CLASSES[generated[1]]) {
    const pool = CLASSES[generated[1]].rewardPool;
    replacement = pool[Number(generated[2]) % pool.length];
  }
  return replacement && CARDS[replacement] ? { ...card, key: replacement } : null;
}

/* ================= global state ================= */
export let run = null;
export const ui = {
  screen: 'title', targeting: null, gadgetTargeting: null, flagMode: false,
  modal: null, cutscene: null, toasts: [], shakeSeq: 0, dmg: [],
  invalidCard: null, deckChange: null, achievement: null, battlePreview: null,
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
    slot, name: payload.name || null, savedAt: payload.savedAt, cls: r.cls, hp: r.hp, maxHp: r.maxHp,
    stratum: r.stratum, floors: r.floors, veinDepth: r.veinDepth || 0, daily: r.daily || null,
    elapsedMs: Math.max(0, Number(r.elapsedMs) || 0),
  };
}

function normalizeSaveName(name) {
  return String(name || '').replace(/\s+/g, ' ').trim().slice(0, 32);
}

function checkpointRunTimer(now = Date.now()) {
  if (!run || run.timerStartedAt == null) return;
  run.elapsedMs = Math.max(0, Number(run.elapsedMs) || 0) + Math.max(0, now - run.timerStartedAt);
  run.timerStartedAt = now;
}

export function runElapsedMs(now = Date.now()) {
  if (!run) return 0;
  const elapsed = Math.max(0, Number(run.elapsedMs) || 0);
  return run.timerStartedAt == null ? elapsed : elapsed + Math.max(0, now - run.timerStartedAt);
}

export function formatRunTime(ms, precise = false) {
  const total = Math.max(0, Number(ms) || 0);
  const hours = Math.floor(total / 3600000);
  const minutes = Math.floor(total / 60000) % 60;
  const seconds = Math.floor(total / 1000) % 60;
  const base = `${hours ? `${hours}:` : ''}${String(minutes).padStart(hours ? 2 : 1, '0')}:${String(seconds).padStart(2, '0')}`;
  return precise ? `${base}.${String(Math.floor(total / 10) % 100).padStart(2, '0')}` : base;
}

export function setRunTimerActive(active, now = Date.now()) {
  if (!run) return;
  if (active) {
    if (ui.screen !== 'title' && run.timerStartedAt == null) run.timerStartedAt = now;
    return;
  }
  checkpointRunTimer(now);
  run.timerStartedAt = null;
  persistRun('auto');
}

function persistRun(slot, requestedName) {
  if (typeof localStorage === 'undefined' || !run) return false;
  try {
    checkpointRunTimer();
    let priorName = '';
    if (slot !== 'auto' && requestedName === undefined) {
      try { priorName = JSON.parse(localStorage.getItem(slotKey(slot)) || '{}').name || ''; } catch { /* new or corrupt slot */ }
    }
    const name = slot === 'auto' ? '' : normalizeSaveName(requestedName === undefined ? priorName : requestedName);
    const screen = ui.screen === 'title'
      ? (run.resumeScreen || (run.combat ? 'combat' : 'map'))
      : ui.screen;
    if (screen !== 'title') run.resumeScreen = screen;
    const payload = {
      version: SAVE_VERSION, savedAt: Date.now(), screen, cutscene: ui.cutscene, run,
      ...(name ? { name } : {}),
    };
    localStorage.setItem(slotKey(slot), JSON.stringify(payload, saveReplacer));
    return true;
  } catch { return false; }
}

export function saveRun(slot, name) {
  const ok = persistRun(slot, name);
  if (ok) {
    const destination = slot === 'auto' ? 'autosave' : normalizeSaveName(name)
      || listSaves().find(save => save.slot === slot)?.name || `save slot ${slot.slice(-1)}`;
    toast(`Run saved to ${destination}`);
  }
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
    run.veinDepth ??= 0;
    run.veinSegments ??= 0;
    run.veinBossesDefeated ??= 0;
    run.veinBoons ??= {};
    run.relicUpgrades ??= {};
    run.coreWon ??= false;
    run.elapsedMs = Math.max(0, Number(run.elapsedMs) || 0);
    run.timerStartedAt = ['gameover', 'victory'].includes(payload.screen) ? null : Date.now();
    run.coreClearMs ??= null;
    run.challenge ??= null;
    run.lastDamageSource ??= null;
    run.runId ??= `${payload.savedAt || Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    run.historyRecorded ??= false;
    run.historyRecords ??= {};
    run.speedrunEligible ??= !run.testMode;
    run.speedrunIneligibleReason ??= run.testMode ? 'Test Lab runs are not ranked.' : null;
    run.eventState ??= null;
    run.resumeScreen ??= null;
    /* Catalog curation can retire generated cards and events between builds.
       Preserve the run wherever possible, but never leave a dead definition in
       a hand, reward, shop, or event screen. */
    run.deck = (run.deck || []).map(card => migrateCardDefinition(card, run.cls)).filter(Boolean);
    if (!run.deck.length && CLASSES[run.cls]) run.deck = CLASSES[run.cls].deck.map(key => mkCard(key));
    if (run.reward?.cards) run.reward.cards = run.reward.cards.map(card => migrateCardDefinition(card, run.cls)).filter(Boolean);
    if (run.shop?.cards) run.shop.cards = run.shop.cards.map(card => migrateCardDefinition(card, run.cls)).filter(Boolean);
    if (run.reward?.trinket && !isTrinketEligible(run.reward.trinket, run.cls)) run.reward.trinket = null;
    if (run.shop?.trinkets) {
      const slots = run.shop.blackMarket ? 3 : 2;
      run.shop.trinkets = run.shop.trinkets.filter(item => isTrinketEligible(item.key, run.cls));
      const signatureKey = SIGNATURE_RELICS[run.cls];
      const signatureOffer = run.shop.trinkets.find(item => item.key === signatureKey);
      if (signatureOffer) signatureOffer.signature = true;
      else if (signatureKey && !run.trinkets.includes(signatureKey)) {
        const offer = {
          key: signatureKey,
          price: run.shop.blackMarket ? 225 : 150,
          sold: false,
          signature: true,
        };
        if (run.shop.trinkets.length >= slots) run.shop.trinkets[slots - 1] = offer;
        else run.shop.trinkets.unshift(offer);
      }
    }
    if (run.combat) {
      for (const pile of ['draw', 'hand', 'discard', 'exhaust', 'powersPlayed', 'archive', 'grave']) {
        if (Array.isArray(run.combat[pile])) {
          run.combat[pile] = run.combat[pile].map(card => migrateCardDefinition(card, run.cls)).filter(Boolean);
        }
      }
      syncConsumableHand();
    }
    run.seenEvents = (run.seenEvents || []).filter(key => EVENT_CATALOG[key]);
    run.eventThreads = Object.fromEntries(
      Object.entries(run.eventThreads).filter(([key]) => EVENT_CATALOG[key]?.followup),
    );
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
    if (run.puzzle?.type === 'crossword') {
      const size = run.puzzle.size || Math.sqrt(run.puzzle.values?.length || 0);
      run.puzzle.size = size;
      run.puzzle.downWords ??= Array.from({ length:size }, (_, col) =>
        Array.from({ length:size }, (_, row) => run.puzzle.solution[row * size + col]).join(''));
      run.puzzle.direction = run.puzzle.direction === 'down' ? 'down' : 'across';
      run.puzzle.cursor = Number.isInteger(run.puzzle.cursor) ? run.puzzle.cursor : null;
    }
    if (run.combat?.enemies) {
      for (const enemy of run.combat.enemies) {
        enemy.def = ENEMIES[enemy.key]; enemy.modifier ??= null; enemy.data ??= {}; enemy.effects ??= {};
      }
      if (run.combat.picks == null) run.combat.picks = basePicksFor(run.cls);
      if (run.combat.maxPicks == null) run.combat.maxPicks = basePicksFor(run.cls) + run.pickBonus
        + (run.trinkets.includes('pitons') ? 1 : 0) + (run.trinkets.includes('veincompass') ? 1 : 0);
      run.combat.powers = {
        powderkeg: 0, sixthsense: false, sixthUsed: false, leylines: 0,
        blastDividend: false, blastDividendUsed: false, stonechoir: false,
        lightBonus: 0, whiteFlame: null, operatingTheatre: 0, interlock: 0,
        blockRetention: null, wallBelow: null, refuseDark: 0, heatTolerance: 0,
        ...run.combat.powers,
      };
      run.combat.classState = {
        passiveUsed: false, scanCount: 0, kindleUsed: false, luckyUsed: false,
        painUsed: false, exhaustUsed: false, deathUsed: false, constructBuiltThisTurn: false,
        blastChain: 0, light: 0, preserveLight: 0, loaded: 0,
        loadedCap: hasT('twoheadedcoin') ? 4 : 3, riggedWagers: 0,
        twoHeadedCoin: hasT('twoheadedcoin'), twoHeadedCoinUsed: false,
        doubleWagers: 0, bloodSpent: 0, bloodSpentThisTurn: 0,
        untreatedBlood: Number(run.combat.classState?.untreatedBlood ?? run.combat.classState?.bloodSpent ?? 0),
        triageRecoveryUsed: false, triageLineRecovery: 0, triageLineHealing: 0, operatingUses: 0,
        leechKit: hasT('leechkit'), cinderbrand: hasT('cinderbrand'),
        deathsDoorThreshold: hasT('secondshroud') ? 0.4 : 0.25,
        citations: 0, resolve: 0, resolveCap: 10,
        ...run.combat.classState,
      };
      run.combat.archive ??= [];
      run.combat.grave ??= [];
    }
    _cardId = Math.max(_cardId, ...run.deck.map(c => c.id || 0));
    seedRunCollection(run);
    /* older autosaves could be stamped 'title' by goHome — resume into gameplay */
    ui.screen = !payload.screen || payload.screen === 'title'
      ? (run.resumeScreen || (run.combat ? 'combat' : 'map'))
      : payload.screen;
    /* Purchase-era saves could stop between strata on a retired paywall. Send
       them back to their boss reward so Finish can continue the now-free run. */
    if (ui.screen === 'paywall') ui.screen = run.reward ? 'reward' : 'map';
    if (ui.screen === 'event' && !EVENT_CATALOG[run.event]) {
      run.event = null; run.eventState = null; ui.screen = 'map';
    }
    if (ui.screen === 'event' && run.event && (!run.eventState
      || (run.eventState.stage === 'choice' && run.eventState.version !== 2))) prepareEventState(run.event);
    const resumedEventResult = ui.screen === 'event' && run.eventState?.stage === 'resolved' && run.eventState.result
      ? { kind: 'info', ...run.eventState.result, btn: 'Continue', next: 'map' }
      : null;
    ui.targeting = null; ui.gadgetTargeting = null; ui.modal = resumedEventResult; ui.flagMode = false; ui.battlePreview = null;
    ui.cutscene = payload.cutscene || null;
    notify();
    return true;
  } catch { return false; }
}

export function deleteSave(slot) {
  try { localStorage.removeItem(slotKey(slot)); } catch { /* storage unavailable */ }
}

export function goHome() {
  setRunTimerActive(false);
  run.resumeScreen = ui.screen;
  persistRun('auto'); // capture the resumable screen before leaving it
  ui.screen = 'title';
  ui.targeting = null; ui.gadgetTargeting = null; ui.modal = null; ui.cutscene = null; ui.flagMode = false; ui.battlePreview = null;
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
export function isTrinketEligible(key, clsKey = run?.cls) {
  const item = TRINKETS[key];
  return Boolean(item && (!item.cls || item.cls === clsKey));
}
function relicLevel(key) { return Math.max(0, Number(run?.relicUpgrades?.[key]) || 0); }

export const BOSS_RELIC_KEYS = Object.keys(TRINKETS).filter(key => TRINKETS[key].tier === 'boss');
const BOSS_RELIC_POOLS = {
  collapser: ['bedrockheart', 'devouringpick', 'wardenseal', 'veincompass'],
  fogfather: ['dowsingrod', 'fogglass', 'silverthread', 'wardenseal'],
  nn99: ['lamp', 'signalcore', 'protocolcoil', 'veincompass'],
};
export const VEIN_BOONS = {
  resonance: { name: 'Relic Temper', mark: '♢', desc: 'Permanently temper one random owned boss relic, strengthening its numerical effect.' },
  vitality: { name: 'Living Ore', mark: '♥', desc: 'Permanently gain 8 maximum Health and recover 8 Health.' },
  reforge: { name: 'Deep Reforge', mark: '⟡', desc: 'Upgrade two random cards in your deck. If every card is upgraded, gain 100 gold.' },
  transmute: { name: 'Vein Transmutation', mark: '⇄', desc: 'Transform one random non-Curse card into an upgraded rare card for your Delver or the neutral pool.' },
  cache: { name: 'Bottomless Cache', mark: '◆', desc: 'Gain 75 gold and a random consumable. If your consumable slots are full, gain 25 additional gold.' },
};

function bossRelicOffer(bossKey) {
  const unowned = BOSS_RELIC_KEYS.filter(key => !run.trinkets.includes(key));
  if (!unowned.length) return [];
  const themed = (BOSS_RELIC_POOLS[bossKey] || []).filter(key => unowned.includes(key));
  const fallback = shuffle(unowned.filter(key => !themed.includes(key)));
  return [...shuffle(themed), ...fallback].slice(0, 3);
}

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
    cls: clsKey, hp: cls.hp + (cls.trinket === 'fieldkit' ? 4 : 0),
    maxHp: cls.hp + (cls.trinket === 'fieldkit' ? 4 : 0), gold: 50,
    deck, trinkets: [cls.trinket], gadgets: [],
    stratum: 0, map: null, pos: null, visited: {},
    floors: 0, fullClears: 0, safeReveals: 0, removalCost: 75,
    surveyNext: false, seenEvents: [], combat: null, upgrades: 0, pickBonus: 0, winRecorded: false,
    reward: null, shop: null, event: null, eventState: null, eventHistory: [], eventThreads: {}, puzzle: null, seenCutscenes: [],
    bossesDefeated: [], lastDamageSource: null, challenge: options.challenge || null,
    veinDepth: 0, veinSegments: 0, veinBossesDefeated: 0, veinBoons: {}, relicUpgrades: {}, coreWon: false,
    runId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, historyRecorded: false, historyRecords: {},
    elapsedMs: 0, timerStartedAt: Date.now(), coreClearMs: null,
    daily: options.daily || null, testMode: Boolean(options.testMode),
    speedrunEligible: !options.testMode,
    speedrunIneligibleReason: options.testMode ? 'Test Lab runs are not ranked.' : null,
    rngState: options.daily ? dailySeed(options.daily) : null,
  };
  if (run.challenge === 'cursed') {
    for (let i = 0; i < 2; i++) run.deck.push(mkCard(randPick(Object.keys(PERSISTENT_CURSES))));
    run.gold += 100;
  } else if (run.challenge === 'lean') {
    run.deck = run.deck.slice(0, 8); run.gold = 20;
  } else if (run.challenge === 'veinbound' || run.challenge === 'wardenroad') {
    run.stratum = 3;
    run.gold = run.challenge === 'veinbound' ? 150 : 100;
    run.pickBonus = 2;
    run.trinkets.push('lamp');
    run.deck.slice(0, 3).forEach(card => { card.up = 1; });
  }
  genMapForStratum();
  seedRunCollection(run);
  if (run.daily) recordDailyAttempt(run.daily);
  ui.battlePreview = null;
  ui.screen = 'map';
  queueCutscene(run.stratum === 3 ? 'descent-3' : 'opening', {}, true);
  notify();
}

export function resetToTitle() {
  try { localStorage.removeItem(slotKey('auto')); } catch { /* storage unavailable */ }
  run = null;
  ui.screen = 'title';
  ui.targeting = null; ui.gadgetTargeting = null; ui.modal = null; ui.cutscene = null; ui.flagMode = false; ui.battlePreview = null;
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

export function closeBattlePreview() {
  if (!ui.battlePreview) return;
  ui.battlePreview = null;
  notify();
}

/* ================= toast / log / modal ================= */
let _toastId = 0;
export const TOAST_DURATION_MS = 4000;
export function toast(msg, bad = false, details = '') {
  const text = String(msg ?? '').trim();
  if (!text) return null;
  const duplicate = ui.toasts.find(item => item.msg === text);
  if (duplicate) return duplicate.id;
  const id = ++_toastId;
  ui.toasts.push({ id, msg: text, bad });
  const expanded = String(details ?? '').trim();
  log(`${bad ? '⚠' : '◆'} ${text}${expanded ? ` — ${expanded}` : ''}`);
  const t = setTimeout(() => {
    ui.toasts = ui.toasts.filter(x => x.id !== id);
    notify();
  }, TOAST_DURATION_MS);
  if (t && typeof t.unref === 'function') t.unref();
  notify();
  return id;
}
function invalidCardFeedback(card, message) {
  sfx('invalid'); haptic('invalid');
  ui.invalidCard = { seq: (ui.invalidCard?.seq || 0) + 1, cardId: card?.id ?? null, message };
  toast(message, true, card?.name ? `Could not play ${card.name}.` : 'That action is not currently legal.');
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
export function openMechanicModal(details) {
  const c = cbt();
  const pile = details.mechanic === 'grave' ? 'grave'
    : details.mechanic === 'archive' ? 'archive'
      : null;
  openModal({
    kind: 'mechanic',
    cls: details.cls,
    mechanic: details.mechanic,
    label: details.label,
    value: details.value,
    detailValue: details.detailValue,
    detailLabel: details.detailLabel,
    help: details.help,
    cards: pile ? c[pile].slice() : null,
  });
}

/* ================= map ================= */
export const MAP_ROWS = 12, MAP_W = 5;
export function veinThreatTier() {
  return run?.stratum === 3 ? Math.max(0, Number(run.veinSegments) || 0) : 0;
}
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
  if (run.stratum === 3) {
    const roamingBosses = run.challenge === 'wardenroad' ? 3 : 1 + Math.min(2, Math.floor(veinThreatTier() / 3));
    const candidates = [];
    for (let r = 3; r < MAP_ROWS - 2; r++) for (const c of Object.keys(nodes[r])) {
      if (!['camp', 'shop', 'treasure'].includes(nodes[r][c])) candidates.push([r, c]);
    }
    for (const [r, c] of shuffle(candidates).slice(0, roamingBosses)) nodes[r][c] = 'boss';
  }
  run.map = { nodes, edges, veinSegment: run.stratum === 3 ? (run.veinSegments || 0) + 1 : null };
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
  if (run.stratum === 3) run.veinDepth = (run.veinDepth || 0) + 1;
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
function unownedTrinket(excluded = []) {
  const blocked = new Set(excluded);
  const pool = Object.keys(TRINKETS).filter(k => !blocked.has(k) && !run.trinkets.includes(k)
    && isTrinketEligible(k) && !['starter', 'boss'].includes(TRINKETS[k].tier));
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

/* The visible perimeter of a shaped board. Generated combat boards include a
   void padding row, so matrix coordinates 0/size-1 are not the playable edge.
   Flooding exterior void also keeps enclosed holes (for example a donut board)
   from being mistaken for the outer ring. */
export function outerRingIndices(b = board()) {
  if (!b?.cells?.length) return [];
  const orthogonal = i => {
    const r = Math.floor(i / b.size), c = i % b.size, out = [];
    if (r > 0) out.push(i - b.size);
    if (r < b.size - 1) out.push(i + b.size);
    if (c > 0) out.push(i - 1);
    if (c < b.size - 1) out.push(i + 1);
    return out;
  };
  const exterior = new Set();
  const queue = [];
  for (let i = 0; i < b.cells.length; i++) {
    const r = Math.floor(i / b.size), c = i % b.size;
    if ((r === 0 || c === 0 || r === b.size - 1 || c === b.size - 1) && b.cells[i].void) {
      exterior.add(i); queue.push(i);
    }
  }
  while (queue.length) {
    const i = queue.shift();
    for (const next of orthogonal(i)) {
      if (b.cells[next].void && !exterior.has(next)) { exterior.add(next); queue.push(next); }
    }
  }
  return b.cells.flatMap((cell, i) => {
    if (cell.void) return [];
    const r = Math.floor(i / b.size), c = i % b.size;
    const matrixEdge = r === 0 || c === 0 || r === b.size - 1 || c === b.size - 1;
    return matrixEdge || orthogonal(i).some(next => exterior.has(next)) ? [i] : [];
  });
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
    if (protectable && Number(c.powers.sixthsense || 0) > Number(c.powers.sixthUsed || 0)) {
      c.powers.sixthUsed = Number(c.powers.sixthUsed || 0) + 1;
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
  if (c.powers.leylines && count >= c.powers.leylines) {
    gainEnergy(1);
    if (c.powers.leyCooling) {
      board().cells.filter(cell => cell.construct).forEach(cell => {
        cell.construct.heat = Math.max(0, Number(cell.construct.heat || 0) - 1);
      });
    }
    toast('Ley Lines: +1⚡');
  }
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
      if (run.cls === 'hexwright' && n >= 3 && !c.over) {
        hitAll(hasT('cinderbrand') ? 4 : 2, { noNitro: true });
      }
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
    if (hasT('signalcore') && !c.signalCoreUsed) {
      c.signalCoreUsed = true;
      const energy = 1 + relicLevel('signalcore');
      gainEnergy(energy);
      toast(`Signal Core: three safe reveals grant +${energy} Energy`);
    }
    for (const e of c.enemies) if (e.hp > 0 && e.data.modifierBuried) {
      e.data.modifierBuried = false; e.data.buried = false;
      e.intent = e.def.next(e);
      toast(`${e.def.name} bursts from the stone!`);
    }
  }
  if (!c.setup && run.cls === 'lamplighter' && count >= 2) {
    const light = (count >= 8 ? 3 : count >= 4 ? 2 : 1) + Number(c.powers.lightBonus || 0);
    const gained = gainLight(light);
    if (gained) gainBlock(gained * 4);
    if (count >= 4 && !c.classState.kindleUsed) {
      c.classState.kindleUsed = true;
      gainEnergy(1);
      toast('Kindle: a bright cascade grants +1⚡');
    }
  }
  if (!c.setup && count > 0 && run.cls === 'chirurgeon' && !c.over
      && !c.classState.triageRecoveryUsed && Number(c.classState.untreatedBlood || 0) > 0) {
    c.classState.triageRecoveryUsed = true;
    const healed = healHP(Math.min(1, Number(c.classState.untreatedBlood || 0)));
    if (healed) toast(`Triage: safe ground closes ${healed} wound${healed === 1 ? '' : 's'}`);
  }
  return count;
}

function triggerPainPassive(bloodPayment = false) {
  const c = run?.combat;
  if (c && run.cls === 'chirurgeon' && !c.over) {
    if (!c.classState.painUsed) {
      c.classState.painUsed = true;
      gainBlock(5);
      toast('Triage: pain grants 5 Block');
    }
    const theatre = c.powers.operatingTheatre;
    const theatreUses = Number(theatre?.uses ?? theatre ?? 0);
    const theatreHealing = Number(theatre?.healing ?? 1);
    if (bloodPayment && Number(c.classState.operatingUses || 0) < theatreUses) {
      c.classState.operatingUses = Number(c.classState.operatingUses || 0) + 1;
      drawCards(1);
      const healed = healHP(theatreHealing);
      toast(`Operating Theatre: draw 1, recover ${healed || theatreHealing}`);
    }
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
  let dmg = STRATA[run.stratum].mineDmg + (run.stratum === 3 ? Math.min(10, veinThreatTier()) : 0);
  if (opts.half) dmg = Math.ceil(dmg / 2);
  if (hasT('luckycompass') && !c.compassUsed) {
    c.compassUsed = true; dmg = 0; toast('Lucky Compass: detonation deals 0!');
  } else if (hasT('blastgoggles') && !c.gogglesUsed) {
    c.gogglesUsed = true; dmg = Math.ceil(dmg / 2); toast('Blast Goggles: half damage');
  }
  if (hasT('canary') && !c.canaryUsed && dmg > 10) {
    c.canaryUsed = true; dmg = 10; toast("Miner's Canary caps it at 10!");
  }
  const { soak, rest } = absorbPlating(dmg);
  if (rest > 0) {
    run.lastDamageSource = `A mine in ${STRATA[run.stratum].name}`;
    run.hp -= rest; pushDmg({ kind: 'player', amount: rest });
    log(`💥 Mine detonates: ${rest} damage${soak ? ` (${soak} absorbed by Plating)` : ' (pierces Block)'}`);
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
  if (run.combat && hasT('devouringpick')) {
    const damage = 5 + relicLevel('devouringpick') * 2;
    hitAll(damage, { bypassGate: true, noNitro: true });
    toast(`Devouring Pick: ${damage} damage to all enemies`);
  }
  if (run.combat && run.cls === 'sapper' && !c.classState.passiveUsed) {
    c.classState.passiveUsed = true;
    hitAll(6, { noNitro: true });
    toast('Breachcraft: 6 damage to all enemies');
  }
  if (run.combat && run.cls === 'sapper') {
    c.classState.blastChain = Number(c.classState.blastChain || 0) + 1;
    gainBlock(3);
    if (hasT('daisychain') && !c.over) {
      hitRandom(2, { noNitro: true });
      if (run.combat) {
        log('⛓ Daisy Chain lashes a random enemy for 2 damage.');
        toast('Daisy Chain: 2 damage');
      }
    }
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
  if (fresh && !cell.mine && !c.setup && hasT('silverthread')
      && (c.silverThreadUsesThisTurn || 0) < 1 + relicLevel('silverthread')) {
    c.silverThreadUsesThisTurn = (c.silverThreadUsesThisTurn || 0) + 1;
    gainEnergy(1);
    toast('Silver Thread: safe Scan grants +1 Energy');
  }
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
  const center = b?.cells[i];
  if (!c || !b || !center?.revealed || center.void || center.entombed) {
    return { ok: false, attempted: false, detonations: 0, reason: 'Choose a revealed number.' };
  }
  const n = numAt(i);
  const adjacent = neighborsOf(i, b.size);
  const flagged = adjacent.filter(j => b.cells[j].flag && isHiddenUsable(j));
  const entombed = adjacent.filter(j => b.cells[j].entombed && !b.cells[j].void);
  const accounted = [...flagged, ...entombed];
  if (n === 0) return { ok: false, attempted: false, detonations: 0, reason: 'Only numbered tiles can be chorded.' };
  if (accounted.length !== n) {
    return { ok: false, attempted: false, detonations: 0, reason: `This ${n} needs exactly ${n} adjacent mine${n === 1 ? '' : 's'} accounted for by flags or Entombed tiles.` };
  }
  if (!adjacent.some(j => isHiddenUsable(j) && !b.cells[j].flag)) {
    return { ok: false, attempted: false, detonations: 0, reason: 'This number has no unopened neighbors left to Chord.' };
  }
  const correct = accounted.every(j => b.cells[j].mine);
  const before = c.minesDetonated;
  for (const j of adjacent) {
    if (board() !== b) break; // board collapsed & re-sealed mid-chord
    // A misflagged chord is an intentional risky reveal, so Instinct and Sixth
    // Sense do not silently turn it into a successful deduction.
    if (isHiddenUsable(j) && !b.cells[j].flag) revealTile(j, correct ? 'chord' : 'failed-chord');
    if (c.over) break;
  }
  const detonations = c.minesDetonated - before;
  if (correct && detonations === 0) {
    c.chordedThisTurn = true;
    sfx('chord');
    log('🎼 Chord!');
    return { ok: true, attempted: true, detonations: 0 };
  }
  log('💥 False chord — the flags did not mark the correct mines.');
  toast('Wrong flags! The unmarked mines detonated.', true);
  return { ok: false, attempted: true, detonations, reason: 'The flag count matched, but the flags were on the wrong tiles.' };
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

export const MAX_CONSTRUCTS = 3;
export const RELAY_RADIUS = 2;    // Chebyshev reach for a Relay's scan and its heat/interference field
export const RELAY_HEAT_MAX = 3;  // Heat at which a Relay overloads
export function constructHeatMax() {
  return RELAY_HEAT_MAX + Number(run?.combat?.powers?.heatTolerance || 0);
}

/* Constructs that run hot — a Sentry or Survey Relay. Bulwark stays cool. */
export const HEAT_CONSTRUCTS = new Set(['sentry', 'relay']);
const CONSTRUCT_NAMES = { sentry: 'Sentry', bulwark: 'Bulwark', relay: 'Survey Relay' };
/* Chebyshev distance between two board indices. */
function cheb(size, a, b) {
  return Math.max(Math.abs(Math.floor(a / size) - Math.floor(b / size)), Math.abs((a % size) - (b % size)));
}
/* Other heat-bearing Constructs inside i's own radius (its interference field). */
function heatConstructsNear(b, i) {
  const r = b.cells[i].construct?.radius || RELAY_RADIUS;
  const out = [];
  for (let j = 0; j < b.cells.length; j++) {
    if (j !== i && HEAT_CONSTRUCTS.has(b.cells[j].construct?.kind) && cheb(b.size, i, j) <= r) out.push(j);
  }
  return out;
}
/* End-of-turn Heat step for a Sentry/Relay. Heat rises +1, plus 1 for every other
   heat-Construct sharing its radius; a lone Construct cools. Returns true if it
   overloaded — it then skips its trigger and vents Heat into nearby Constructs. */
function constructOverheats(i, con, b) {
  const near = heatConstructsNear(b, i);
  const coolant = run.cls === 'terraformer' && hasT('coolantcell') ? 1 : 0;
  con.heat = (con.heat || 0) + Math.max(0, 1 + near.length - coolant);
  if (con.heat >= constructHeatMax()) {
    con.heat = 0;
    for (const j of near) { const o = b.cells[j].construct; if (o) o.heat = (o.heat || 0) + 1; }
    if (con.kind === 'sentry') {
      // a Sentry's turret misfires when it overheats — the shot burns the Delver
      const backfire = Math.max(2, Math.ceil((con.dmg || 4) / 2));
      loseHP(backfire);
      log(`⌁ Sentry overheats and misfires — it burns you for ${backfire}!`);
    } else {
      log(`⌁ ${CONSTRUCT_NAMES[con.kind]} overloads — it loses its trigger and vents Heat into nearby Constructs.`);
    }
    return true;
  }
  if (!near.length) con.heat = Math.max(0, con.heat - 2);
  return false;
}
/* A powered, cool Survey Relay's output: scan a hidden tile within radius, then grant Block. */
function relayScan(i, con, b) {
  const targets = [];
  for (let j = 0; j < b.cells.length; j++) {
    if (isHiddenUsable(j) && !b.cells[j].flag && cheb(b.size, i, j) <= (con.radius || RELAY_RADIUS)) targets.push(j);
  }
  shuffle(targets).slice(0, Number(con.scans || 1)).forEach(scanTile);
  gainBlock(Number(con.block || 0));
  log('⌁ Survey Relay reads the stone.');
}

export function isConstructSite(i) {
  const cell = board()?.cells[i];
  return Boolean(cell && cell.revealed && !cell.void && !cell.entombed
    && !cell.mine && !cell.crater && !cell.construct);
}

export function addConstruct(i, kind, opts = {}) {
  const cell = board().cells[i];
  if (!isConstructSite(i)) {
    toast('Constructs need an empty safe revealed tile.', true);
    return false;
  }
  if (board().cells.filter(candidate => candidate.construct).length >= MAX_CONSTRUCTS) {
    toast(`Construct limit reached (${MAX_CONSTRUCTS}).`, true);
    return false;
  }
  cell.construct = { kind, ...opts };
  if (HEAT_CONSTRUCTS.has(kind)) cell.construct.radius ??= RELAY_RADIUS; // each heat-Construct carries its own field radius
  const names = { sentry: 'Sentry', bulwark: 'Bulwark', relay: 'Survey Relay' };
  log(`🏗 ${names[kind] || kind} built.`);
  if (run.cls === 'terraformer' && !cbt().classState.constructBuiltThisTurn) {
    cbt().classState.constructBuiltThisTurn = true;
    gainBlock(6);
    toast('Master Builder: first Construct this turn grants +6 Block');
  }
  return true;
}

/* Before the last enemy falls, Full Clear is a payoff: the collapse deals heavy
   damage and the crypt re-seals if anything survives. Once every enemy is dead,
   clearing the remaining safe ground becomes the combat's final win condition. */
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
  if (hasT('bedrockheart')) gainPlating(4 + relicLevel('bedrockheart'));
  sfx('fullclear');
  ui.shakeSeq++;
  toast(`★ FULL CLEAR — the board collapses: ${FULL_CLEAR_DMG} damage to ALL enemies!`);
  log('★ FULL CLEAR! The ceiling comes down on everyone.');
  hitAll(FULL_CLEAR_DMG, { bypassGate: true });
  if (run?.combat === c && c.cleanup) {
    c.over = true;
    toast('★ BOARD COMPLETE — the descent is secure.');
    log('★ Every safe tile is open. The cleared board is secured.');
    combatVictory();
    return;
  }
  if (!c.over && aliveEnemies().length) {
    toast('The crypt re-seals — fresh stone rises. Finish them.', true);
    log('▦ The crypt re-seals: a fresh board rises.');
    regenBoard(c.boardSpec.size, c.boardSpec.mines);
  }
}

/* Replace the current board mid-combat (Full Clear re-seal, NN-99 phases). */
function regenBoard(size, mines) {
  const c = cbt();
  const constructs = c.board?.cells.flatMap(cell => cell.construct ? [{ ...cell.construct }] : []) || [];
  clearPrimed();
  c.lie = null;
  c.board = genBoard(size, mines);
  c.setup = true;
  openSafe(c.board.opening);
  const availableSites = () => c.board.cells
    .map((cell, index) => ({ cell, index }))
    .filter(({ cell }) => cell.revealed && !cell.void && !cell.crater && !cell.construct);
  for (const construct of constructs) {
    let site = availableSites()[0];
    if (!site) {
      site = c.board.cells
        .map((cell, index) => ({ cell, index }))
        .find(({ cell }) => !cell.void && !cell.mine && !cell.construct);
      if (site) { site.cell.revealed = true; site.cell.ever = true; }
    }
    if (site) site.cell.construct = construct;
  }
  if (constructs.length) log(`🏗 ${constructs.length} Construct${constructs.length === 1 ? '' : 's'} braced through the shifting board.`);
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
    const names = { sentry: 'Sentry', bulwark: 'Bulwark', relay: 'Survey Relay' };
    const name = names[b.cells[ci].construct.kind] || 'Construct';
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
  if (hasT('fogglass') && (c.fogglassUses || 0) < 1 + relicLevel('fogglass')) {
    c.fogglassUses = (c.fogglassUses || 0) + 1;
    sfx('block');
    log('🔮 Fogglass Prism scatters the fog.');
    toast('Fogglass Prism negates the Fog');
    return;
  }
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
    if (cell.construct) {
      const names = { sentry: 'Sentry', bulwark: 'Bulwark', relay: 'Survey Relay' };
      const name = names[cell.construct.kind] || 'Construct';
      log(`🕳 The Collapser devours your ${name}.`);
      toast(`${name} destroyed by Devour`, true);
      cell.construct = null;
    }
    if (cell.grub) { cell.grub = false; unburyAt(i); }
    if (c.primed === i) { c.primed = null; cell.primed = false; }
    if (!cell.revealed && !cell.entombed && cell.mine && !cell.flag) {
      detonatePlayer(i);
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
  const c = cbt();
  const rubble = c?.hand.filter(card => card.key === 'rubble').length || 0;
  const activeCard = c?.activeCard;
  const risenBonus = activeCard?.risen && CARDS[activeCard.key]?.cls === 'revenant';
  const damage = risenBonus ? Math.ceil(n * 1.5) : n;
  return Math.max(0, damage - rubble);
}
export function gainBlock(n) { if (!run?.combat) return; cbt().block += n; sfx('block'); log(`🛡 +${n} Block`); }
export const MAX_PLATING = 40;
export function gainPlating(n) {
  if (!run?.combat || n <= 0) return 0;
  const before = cbt().plating;
  cbt().plating = Math.min(MAX_PLATING, cbt().plating + n);
  const gained = cbt().plating - before;
  if (gained > 0) { sfx('plating'); log(`⛨ +${gained} Plating`); }
  if (gained < n) toast(`Plating is capped at ${MAX_PLATING}.`, true);
  return gained;
}
function absorbPlating(n) {
  const c = cbt();
  if (!c || n <= 0) return { soak: 0, rest: Math.max(0, n) };
  const soak = Math.min(c.plating, n);
  c.plating -= soak;
  return { soak, rest: n - soak };
}
export function gainEnergy(n) { if (run?.combat) cbt().energy += n; }
export function gainInsight(n) { if (run?.combat) cbt().insight += n; }
export function spendInsight(n = Infinity) {
  if (!run?.combat) return 0;
  const c = cbt();
  const available = Math.max(0, Number(c.insight || 0));
  const spent = Math.min(available, Number.isFinite(n) ? Math.max(0, n) : available);
  c.insight = available - spent;
  if (run.cls === 'surveyor' && hasT('bottomlessledger') && available > 0 && spent >= available) {
    c.insight = 1;
    log('📒 Bottomless Ledger retains 1 Insight.');
  }
  return spent;
}
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
export function loseHP(n, source = 'A lingering wound', opts = {}) {
  const { soak, rest } = opts.usePlating ? absorbPlating(n) : { soak: 0, rest: n };
  run.lastDamageSource = source;
  run.hp -= rest;
  if (rest > 0) {
    sfx('hurt'); haptic('damage');
    pushDmg({ kind: 'player', amount: rest });
    log(`🩸 You lose ${rest} HP${soak ? ` (${soak} absorbed by Plating)` : ''}`);
    triggerPainPassive(Boolean(opts.bloodPayment));
  } else {
    sfx('block');
    pushDmg({ kind: 'player', amount: 0, note: 'PLATED' });
    log(`⛨ Plating absorbs ${soak} damage.`);
  }
  checkPlayerDeath();
}
export function canHeal() { return Boolean(run && run.hp < run.maxHp); }
export function healthState() {
  return { hp: Number(run?.hp || 0), maxHp: Number(run?.maxHp || 1) };
}
export function consumeUntreatedBlood(n, sourceState = null) {
  const s = sourceState || run?.combat?.classState;
  if (!s || n <= 0) return 0;
  const treated = Math.min(Number(s.untreatedBlood || 0), n);
  s.untreatedBlood = Math.max(0, Number(s.untreatedBlood || 0) - treated);
  return treated;
}
export function healHP(n, opts = {}) {
  if (!run || n <= 0) return 0;
  const before = run.hp;
  run.hp = Math.min(run.maxHp, run.hp + effectiveHealing(n));
  const healed = run.hp - before;
  if (healed > 0) {
    if (opts.treatBlood !== false && run.cls === 'chirurgeon' && run.combat) {
      consumeUntreatedBlood(healed);
    }
    sfx('heal');
    pushDmg({ kind: 'player', amount: -healed, note: `+${healed}` });
    log(`✚ You recover ${healed} HP`);
  }
  return healed;
}

export function gainLight(n) {
  if (!run?.combat || run.cls !== 'lamplighter' || n <= 0) return 0;
  const c = cbt(), s = c.classState;
  const before = Number(s.light || 0);
  s.light = Math.min(10, before + n);
  const gained = s.light - before;
  s.lightGainedThisTurn = Number(s.lightGainedThisTurn || 0) + gained;
  if (gained) log(`✦ +${gained} Light (${s.light}/10)`);
  const flame = c.powers.whiteFlame;
  if (s.light >= 10 && flame && !s.whiteFlameResolving) {
    s.whiteFlameResolving = true;
    s.light = Math.max(0, s.light - flame.spend);
    hitAll(atk(flame.damage), { noNitro: true });
    toast(`White Flame: ${flame.damage} to all enemies`);
    s.whiteFlameResolving = false;
  }
  return gained;
}

export function recallArchived(count = 1, upgrade = 0) {
  if (!run?.combat) return 0;
  const c = cbt();
  if (run.cls === 'archivist' && hasT('masterindex')) upgrade = Math.max(1, Number(upgrade || 0));
  let recalled = 0;
  while (recalled < count && c.archive.length && c.hand.length < 10) {
    const card = c.archive.pop();
    card.up = Math.min(2, Number(card.up || 0) + upgrade);
    card.recalledTurn = c.turn;
    c.hand.push(card);
    recalled++;
  }
  if (recalled) { sfx('draw'); toast(`Recalled ${recalled} card${recalled === 1 ? '' : 's'}`); }
  return recalled;
}

export function riseGraves(count = 1) {
  if (!run?.combat) return 0;
  const c = cbt();
  let risen = 0;
  while (risen < count && c.grave.length && c.hand.length < 10) {
    const card = c.grave.pop();
    card.up = Math.min(2, Number(card.up || 0) + 1);
    card.risen = true;
    if (c.powers.refuseDark > 0) {
      c.powers.refuseDark--;
      card.riseFree = true;
      card.riseDraw = true;
    }
    c.hand.push(card);
    risen++;
  }
  if (risen) { sfx('draw'); toast(`${risen} card${risen === 1 ? '' : 's'} Rise from the Grave`); }
  return risen;
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
    if (c.hand.filter(handCard => !isConsumableCard(handCard)).length >= 10) {
      c.discard.push(card);
      continue;
    }
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
  if (!run?.combat) return null;
  const c = cbt();
  if (hasT('wardenseal') && !c.wardenSealUsed) {
    const original = n;
    c.wardenSealUsed = true;
    n = Math.max(0, n - 6 - relicLevel('wardenseal') * 2);
    log(`🛡 Warden Seal weakens ${e.def.name}'s attack from ${original} to ${n}.`);
  }
  if (e.effects?.jammed > 0) {
    const original = n;
    n = Math.max(0, Math.floor(n * 0.6));
    e.effects.jammed--;
    log(`⌁ Jammed weakens ${e.def.name}'s attack from ${original} to ${n}.`);
  }
  const incoming = n;
  const blockSoak = Math.min(c.block, n);
  c.block -= blockSoak;
  const plated = absorbPlating(n - blockSoak);
  const platingSoak = plated.soak;
  const rest = plated.rest;
  if (rest > 0) {
    run.lastDamageSource = e.def.name;
    run.hp -= rest;
    sfx('hurt');
    haptic('damage');
    ui.shakeSeq++;
    pushDmg({ kind: 'player', amount: rest });
    const defenses = [blockSoak ? `${blockSoak} Block` : '', platingSoak ? `${platingSoak} Plating` : ''].filter(Boolean).join(', ');
    log(`⚔ ${e.def.name} hits you for ${rest}${defenses ? ` (${defenses} absorbed)` : ''}`);
    triggerPainPassive();
  } else {
    sfx('block');
    pushDmg({ kind: 'player', amount: 0, note: platingSoak ? 'PLATED' : 'BLOCKED' });
    log(`⚔ ${e.def.name} attacks — fully absorbed by ${blockSoak && platingSoak ? 'Block and Plating' : platingSoak ? 'Plating' : 'Block'}.`);
  }
  if (run.cls === 'warden' && blockSoak + platingSoak > 0) {
    const bonus = rest === 0 ? Number(c.powers.interlock || 0) : 0;
    const gained = Math.max(1, Math.ceil((blockSoak + platingSoak) / 6)) + bonus;
    const cap = Number(c.classState.resolveCap || 10);
    c.classState.resolve = Math.min(cap, Number(c.classState.resolve || 0) + gained);
    log(`◆ Warden gains ${gained} Resolve (${c.classState.resolve}/${cap}).`);
  }
  if (run.cls === 'warden' && hasT('spikedaegis') && incoming > 0 && rest === 0
      && blockSoak + platingSoak > 0 && e.hp > 0 && !c.over) {
    log(`🛡 Spiked Aegis strikes ${e.def.name}.`);
    hitEnemy(e, 4, { noNitro: true });
  }
  checkPlayerDeath();
  return { incoming, blockSoak, platingSoak, rest };
}

function checkPlayerDeath() {
  if (run.hp <= 0) {
    run.hp = 0;
    const combat = cbt();
    if (combat?.over) return;
    if (run.cls === 'revenant' && combat && !combat.classState.deathUsed) {
      combat.classState.deathUsed = true;
      run.hp = 1;
      toast('Deathless: return from the brink at 1 HP');
      return;
    }
    // A card may kill the last enemy before applying its own HP cost. Finishing
    // that enemy clears run.combat, but the simultaneous self-damage must still
    // be able to end the run instead of dereferencing a vanished combat.
    if (combat) combat.over = true;
    sfx('defeat');
    ui.screen = 'gameover';
    setRunTimerActive(false);
    recordRunHistory(run, false);
    recordDailyRunEnd(false);
    notify();
  }
}

/* ================= enemies ================= */
export const ENEMY_MODIFIERS = {
  armoured: { name: 'Armoured', mark: '⛨', desc: 'Starts with 8 Block, plus 4 for each deeper stratum. Its opening Block expires when it takes its first action.' },
  burrowing: { name: 'Burrowing', mark: '⌄', desc: 'Starts underground: untargetable and unable to act. Reveal three safe tiles in one turn to force it above ground.' },
  unstable: { name: 'Unstable', mark: '※', desc: 'Explodes when defeated for 3 damage, plus 2 per deeper stratum. It bypasses Block, but Plating can absorb it.' },
  cursed: { name: 'Cursed', mark: '◈', desc: 'Adds a temporary named Curse to the combat discard pile. It can enter a later hand and exhausts at end of turn.' },
};

export const ENEMY_EFFECTS = {
  exposed: { name: 'Exposed', mark: '◇', desc: 'The next hit deals 25% more damage. One stack is consumed per hit. Works on bosses.' },
  jammed: { name: 'Jammed', mark: '⌁', desc: 'The next direct attack deals 40% less damage. One stack is consumed per attack. Works on bosses.' },
  sundered: { name: 'Sundered', mark: '╱', desc: 'Removes current Block and halves Block gained during the next enemy action. Works on bosses.' },
};

export const BOSS_RESONANCE = {
  sapper: {
    name: 'Chain Test', mark: '⛓',
    desc: 'Build a Blast Chain of 2 before this resolves. Success turns the chain back on the boss; failure causes an attack and plants a mine.',
  },
  surveyor: {
    name: 'Data Audit', mark: '◇',
    desc: 'Bank at least 3 Insight. A complete survey weakens the attack and leaves the boss Exposed; missing data means taking the full hit.',
  },
  terraformer: {
    name: 'Overload Pulse', mark: '⌁',
    desc: 'Have a Construct in play while every heat-bearing Construct remains below 2 Heat. Cool engineering damages the boss; hot machinery grants it Block.',
  },
  lamplighter: {
    name: 'Dousing Field', mark: '✦',
    desc: 'Gain at least 3 Light during the turn. Each Light gained reduces the attack, and reaching 3 also leaves the boss Exposed.',
  },
  gambler: {
    name: 'House Wager', mark: '●',
    desc: 'The boss forces a Wager. Loaded or Two-Headed guarantees Heads and strikes the boss; an unrigged flip can land Tails and strike you.',
  },
  chirurgeon: {
    name: 'Blood Scent', mark: '✚',
    desc: 'The attack grows with untreated Blood. Treat all Blood that existed when this intent appeared to leave the boss Exposed.',
  },
  archivist: {
    name: 'Redaction', mark: '❞',
    desc: 'Recall a card that was already Archived when this intent appeared—or File one if the Archive was empty. Success exposes the boss; unanswered entries strengthen its attack and Block.',
  },
  warden: {
    name: 'Break Test', mark: '⛨',
    desc: 'Absorb all three small attacks with Block or Plating. A perfect defence Ripostes; any breach grants the boss Block.',
  },
  hexwright: {
    name: 'Rune Cipher', mark: '⌘',
    desc: 'Raise total Rune value by 3 before this resolves. Solving the cipher strikes the boss; failure adds mines to the board.',
  },
  revenant: {
    name: 'Grave Call', mark: '↑',
    desc: 'Rise a card that was already in the Grave when this intent appeared—or bury one if the Grave was empty. Success strikes the boss; unanswered Graves empower its attack and Block.',
  },
};

function bossResonanceTier(e) {
  return Math.max(0, Math.min(2, Number(e?.def?.home || 0)));
}

function runePower() {
  return board().cells.reduce((sum, cell) => sum + Number(cell.rune?.value || 0), 0);
}

function exposeBossQuietly(e) {
  if (!e || e.hp <= 0) return;
  e.effects ??= {};
  e.effects.exposed = Math.min(3, Number(e.effects.exposed || 0) + 1);
}

export function bossResonanceIntent(e) {
  const c = run?.combat;
  const spec = BOSS_RESONANCE[run?.cls];
  if (!c || !spec) return { kind: 'attack', cls: 'atk', n: 10, label: 'Attack 10' };
  const base = {
    kind: 'resonance', cls: 'resonance', resonance: run.cls,
    label: `${spec.mark} ${spec.name}`, detail: spec.desc,
  };
  switch (run.cls) {
    case 'sapper': return { ...base, label: `${base.label} · Chain 2` };
    case 'surveyor': return { ...base, label: `${base.label} · Bank 3 Insight` };
    case 'terraformer': return { ...base, label: `${base.label} · Keep Heat < 2` };
    case 'lamplighter': return { ...base, label: `${base.label} · Gain 3 Light` };
    case 'gambler': return { ...base, label: `${base.label} · Rig Heads` };
    case 'chirurgeon':
      return {
        ...base, startBlood: Number(c.classState.untreatedBlood || 0),
        label: `${base.label} · ${Number(c.classState.untreatedBlood || 0) ? `Treat ${Number(c.classState.untreatedBlood || 0)}` : 'Keep Blood clear'}`,
      };
    case 'archivist': {
      const startArchive = c.archive.length;
      return { ...base, startArchive, label: `${base.label} · ${startArchive ? 'Recall 1' : 'File 1'}` };
    }
    case 'warden': {
      const hit = 4 + bossResonanceTier(e);
      return { ...base, hit, label: `${base.label} · 3 × ${hit}` };
    }
    case 'hexwright': {
      const targetRunePower = runePower() + 3;
      return { ...base, targetRunePower, label: `${base.label} · Reach ${targetRunePower}` };
    }
    case 'revenant': {
      const startGrave = c.grave.length;
      return { ...base, startGrave, label: `${base.label} · ${startGrave ? 'Rise 1' : 'Bury 1'}` };
    }
    default: return base;
  }
}

export function resolveBossResonance(e, intent) {
  const c = run?.combat;
  if (!c || !e || e.hp <= 0 || intent?.kind !== 'resonance') return false;
  const tier = bossResonanceTier(e);
  const spec = BOSS_RESONANCE[intent.resonance] || BOSS_RESONANCE[run.cls];
  const announce = (message, bad, details) => toast(`${spec?.mark || '◆'} ${message}`, bad, details || intent.detail);

  switch (intent.resonance) {
    case 'sapper': {
      const chain = Number(c.classState.blastChain || 0);
      if (chain >= 2) {
        const damage = 8 + tier * 2;
        announce(`Chain Test passed — ${damage} damage`, false, `Blast Chain reached ${chain}.`);
        hitEnemy(e, damage, { bypassGate: true, noNitro: true });
      } else {
        const damage = 6 + tier * 2;
        announce(`Chain Test failed — attack ${damage}`, true, `Blast Chain reached ${chain}; 2 was required.`);
        enemyAttack(e, damage);
        if (run?.combat && !c.over) layMines(1, randInt(board().size));
      }
      break;
    }
    case 'surveyor': {
      const insight = Number(c.insight || 0);
      const damage = Math.max(1, 10 + tier * 2 - (insight >= 3 ? 6 : 0));
      if (insight >= 3) {
        exposeBossQuietly(e);
        announce(`Data Audit passed — attack reduced to ${damage}`, false, `${insight} Insight banked; the boss is Exposed.`);
      } else {
        announce(`Data Audit failed — attack ${damage}`, true, `${insight}/3 Insight banked.`);
      }
      enemyAttack(e, damage);
      break;
    }
    case 'terraformer': {
      const constructs = board().cells.filter(cell => cell.construct);
      const heated = constructs.filter(cell => cell.construct
        && ['sentry', 'relay'].includes(cell.construct.kind)
        && Number(cell.construct.heat || 0) >= 2);
      if (constructs.length && !heated.length) {
        const damage = 4 * constructs.length + tier * 2;
        announce(`Overload Pulse grounded — ${damage} damage`, false, `${constructs.length} Construct${constructs.length === 1 ? '' : 's'} stayed cool.`);
        hitEnemy(e, damage, { bypassGate: true, noNitro: true });
      } else {
        const block = 4 + heated.length * 4;
        e.block += block;
        announce(`Overload Pulse charged ${block} Block`, true,
          constructs.length ? `${heated.length} Construct${heated.length === 1 ? '' : 's'} had 2+ Heat.` : 'No Construct was available to ground the pulse.');
      }
      for (const cell of constructs) {
        if (['sentry', 'relay'].includes(cell.construct?.kind)) cell.construct.heat = Number(cell.construct.heat || 0) + 1;
      }
      break;
    }
    case 'lamplighter': {
      const gained = Number(c.classState.lightGainedThisTurn || 0);
      const damage = Math.max(3, 14 + tier * 2 - gained * 3);
      if (gained >= 3) {
        exposeBossQuietly(e);
        announce(`Dousing Field pierced — attack reduced to ${damage}`, false, `${gained} Light gained; the boss is Exposed.`);
      } else {
        announce(`Dousing Field burns for ${damage}`, true, `${gained}/3 Light gained.`);
      }
      enemyAttack(e, damage);
      break;
    }
    case 'gambler': {
      const state = c.classState;
      const loaded = Number(state.riggedWagers || 0) > 0;
      if (loaded) state.riggedWagers--;
      const twoHeaded = Boolean(state.twoHeadedCoin) && !state.twoHeadedCoinUsed;
      if (twoHeaded) state.twoHeadedCoinUsed = true;
      const heads = loaded || twoHeaded || randInt(2) === 1;
      const damage = 9 + tier * 2;
      announce(`House Wager: ${heads ? 'HEADS' : 'TAILS'}`, !heads,
        loaded ? 'Loaded guaranteed Heads.' : twoHeaded ? 'Two-Headed Coin guaranteed Heads.' : 'The flip was unrigged.');
      if (heads) hitEnemy(e, damage, { bypassGate: true, noNitro: true });
      else enemyAttack(e, damage);
      break;
    }
    case 'chirurgeon': {
      const untreated = Number(c.classState.untreatedBlood || 0);
      const wounds = Math.min(3, untreated);
      const clean = untreated === 0;
      const damage = Math.max(2, 8 + tier * 2 + wounds * 2 - (clean ? 4 : 0));
      if (clean) {
        exposeBossQuietly(e);
        announce(`Blood Scent cleansed — attack ${damage}`, false,
          Number(intent.startBlood || 0) ? 'The marked Blood was treated; the boss is Exposed.' : 'No untreated Blood was left for the boss to track; it is Exposed.');
      } else {
        announce(`Blood Scent finds ${untreated} untreated — attack ${damage}`, true,
          'Each of the first 3 untreated Blood adds 2 damage.');
      }
      enemyAttack(e, damage);
      break;
    }
    case 'archivist': {
      const archived = c.archive.length;
      const starting = Number(intent.startArchive || 0);
      const answered = starting > 0 ? archived < starting : archived > 0;
      const damage = 7 + tier * 2 + Math.min(3, archived) * 2;
      if (answered) {
        exposeBossQuietly(e);
        announce(`Redaction answered — attack ${damage}`, false,
          starting > 0 ? 'An indexed card was Recalled; the boss is Exposed.' : 'A new card was Filed; the boss is Exposed.');
      } else {
        const block = Math.min(3, archived) * 3;
        e.block += block;
        announce(`Redaction cites ${archived} card${archived === 1 ? '' : 's'} — attack ${damage}`, archived > 0,
          `${block} Block gained from unanswered Archive entries.`);
      }
      enemyAttack(e, damage);
      break;
    }
    case 'warden': {
      let perfect = true;
      for (let strike = 0; strike < 3 && run?.combat && !c.over && e.hp > 0; strike++) {
        const result = enemyAttack(e, intent.hit || 4 + tier);
        if (!result || result.rest > 0) perfect = false;
      }
      if (!run?.combat || c.over || e.hp <= 0) break;
      if (perfect) {
        const damage = 10 + tier * 2;
        announce(`Break Test held — Riposte ${damage}`, false, 'All three strikes were fully absorbed.');
        hitEnemy(e, damage, { bypassGate: true, noNitro: true });
      } else {
        const block = 5 + tier * 2;
        e.block += block;
        announce(`Break Test breached — ${block} boss Block`, true, 'At least one strike reached Health.');
      }
      break;
    }
    case 'hexwright': {
      const power = runePower();
      if (power >= Number(intent.targetRunePower || 3)) {
        const damage = 11 + tier * 2;
        announce(`Rune Cipher solved — ${damage} damage`, false, `Rune power reached ${power}/${intent.targetRunePower}.`);
        hitEnemy(e, damage, { bypassGate: true, noNitro: true });
      } else {
        const mines = 1 + tier;
        announce(`Rune Cipher failed — ${mines} mine${mines === 1 ? '' : 's'}`, true, `Rune power reached ${power}/${intent.targetRunePower}.`);
        layMines(mines, randInt(board().size));
      }
      break;
    }
    case 'revenant': {
      const grave = c.grave.length;
      const starting = Number(intent.startGrave || 0);
      const answered = starting > 0 ? grave < starting : grave > 0;
      if (answered) {
        const damage = 10 + tier * 2;
        announce(`Grave Call answered — ${damage} damage`, false,
          starting > 0 ? 'A marked Grave card Rose.' : 'A new card entered the Grave.');
        hitEnemy(e, damage, { bypassGate: true, noNitro: true });
      } else {
        const block = Math.min(3, grave) * 3;
        const damage = 7 + tier * 2;
        e.block += block;
        announce(`Grave Call unanswered — attack ${damage}`, true, `${block} Block gained from ${grave} waiting Grave card${grave === 1 ? '' : 's'}.`);
        enemyAttack(e, damage);
      }
      break;
    }
    default:
      enemyAttack(e, 10 + tier * 2);
  }
  return true;
}

export function applyEnemyEffect(e, key, stacks = 1) {
  if (!run?.combat || !e || e.hp <= 0 || !ENEMY_EFFECTS[key]) return false;
  e.effects ??= {};
  e.effects[key] = Math.min(3, (e.effects[key] || 0) + Math.max(1, stacks));
  if (key === 'sundered') e.block = 0;
  const effect = ENEMY_EFFECTS[key];
  log(`${effect.mark} ${e.def.name} is ${effect.name.toLowerCase()} (${e.effects[key]}).`);
  toast(`${e.def.name}: ${effect.name}`);
  return true;
}

function spawnEnemy(key, kind = 'dig') {
  const def = ENEMIES[key];
  const scale = Math.max(0, run.stratum - def.home) + veinThreatTier();
  const e = {
    key, def, scale,
    maxHp: Math.round(def.hp * (1 + 0.45 * scale)),
    hp: 0, block: 0, step: 0, data: {}, effects: {}, intent: null, modifier: null,
  };
  if (!def.boss) {
    const chance = run.challenge === 'afflicted' ? 1 : kind === 'elite' ? 0.65 : Math.min(0.85, 0.25 + run.stratum * 0.1 + veinThreatTier() * 0.04);
    if (random() < chance) e.modifier = randPick(Object.keys(ENEMY_MODIFIERS));
  }
  e.hp = e.maxHp;
  return e;
}

function setupEnemyModifier(e) {
  if (e.modifier === 'armoured') e.block += 8 + (run.stratum + veinThreatTier()) * 4;
  if (e.modifier === 'burrowing') { e.data.buried = true; e.data.modifierBuried = true; }
  if (e.modifier === 'cursed') {
    const key = randPick(Object.keys(PERSISTENT_CURSES));
    cbt().discard.push({ ...mkCard(key), temporaryCurse: true });
    log(`◈ ${e.def.name}'s curse adds ${CARDS[key].name} to the discard pile.`);
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
  if (e.def.gated && !opts.bypassGate && !c.chordedThisTurn && c.revealedThisTurn < 3) {
    const original = n;
    const shield = [0.5, 0.67, 0.84][Math.max(0, c.revealedThisTurn)] ?? 1;
    n = Math.max(original > 0 ? 1 : 0, Math.floor(original * shield));
    if (e.data.gateHintTurn !== c.turn) {
      e.data.gateHintTurn = c.turn;
      toast(`NN-99's signal shield reduces damage (${n}/${original}). Reveal ${3 - c.revealedThisTurn} more safe tile${3 - c.revealedThisTurn === 1 ? '' : 's'} or play a Chord card for full damage.`, true);
    }
  }
  if (!opts.noEffects && n > 0 && e.effects?.exposed > 0) {
    n = Math.ceil(n * 1.25);
    e.effects.exposed--;
    log(`◇ Exposed increases the hit against ${e.def.name}.`);
  }
  const soak = Math.min(e.block, n);
  e.block -= soak;
  const dmg = n - soak;
  e.hp -= dmg;
  const killed = e.hp <= 0;
  pushDmg({ kind: 'enemy', idx: c.enemies.indexOf(e), amount: dmg, note: dmg === 0 && soak > 0 ? 'BLOCKED' : null });
  if (dmg > 0) { sfx('hit'); log(`🗡 ${e.def.name} takes ${dmg}`); }
  if (killed) onEnemyDeath(e);
  else if (e.key === 'nn99') checkNNPhase(e);
  checkWin();
  return killed;
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
    const blast = 3 + (run.stratum + veinThreatTier()) * 2;
    toast(`${e.def.name} ruptures for ${blast} damage!`, true);
    loseHP(blast, `The unstable ${e.def.name}`, { usePlating: true });
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
  if (aliveEnemies().length !== 0 || c.cleanup) return;
  c.cleanup = true;
  c.targetIdx = -1;
  c.hand = [];
  c.draw = [];
  c.discard = [];
  c.archive = [];
  c.grave = [];
  c.energy = 0;
  ui.targeting = null;
  ui.gadgetTargeting = null;
  ui.flagMode = false;
  if (loadPreferences().showCleanupPrompt) {
    openModal({ kind: 'cleanup' });
  }
  log('☠ All enemies are down. Cleanup phase: unlimited Picks, no cards, no enemy turns.');
  if (board().cleared) {
    c.over = true;
    combatVictory();
    return;
  }
  checkFullClear();
  if (run?.combat === c) notify();
}

/* ================= combat setup & turns ================= */
function minePenalty() {
  let p = persistentCurseTotal('boardMines');
  if (hasT('lamp')) p += Math.max(0, 4 - relicLevel('lamp'));
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
  const veinMines = run.stratum === 3 ? Math.min(8, veinThreatTier() * 2) : 0;
  const b = genBoard(st.size, st.mines + veinMines + minePenalty());
  run.combat = {
    kind, board: b, boardSpec: { size: st.size, mines: st.mines + veinMines + minePenalty() },
    enemies: [], hand: run.gadgets.map(key => mkCard(consumableCardKey(key))),
    discard: [], exhaust: [], powersPlayed: [], archive: [], grave: [],
    draw: shuffle(run.deck.map(c => ({ ...c }))),
    energy: 0, maxEnergy: 3 + (hasT('lamp') ? 1 : 0) + (hasT('emberjar') ? 1 : 0) + (run.challenge === 'wardenroad' ? 1 : 0),
    block: 0, plating: (run.challenge === 'wardenroad' ? 6 : 0)
      + (hasT('bedrockheart') ? 8 + relicLevel('bedrockheart') * 2 : 0),
    insight: run.cls === 'surveyor' && hasT('bottomlessledger') ? 3 : 0, turn: 0,
    maxPicks: Math.max(PERSISTENT_CURSES.vertigo.minimum, basePicksFor(run.cls) + (run.pickBonus || 0) + (hasT('pitons') ? 1 : 0)
      + (hasT('veincompass') ? 1 + relicLevel('veincompass') : 0)
      + persistentCurseTotal('maxPicks') + (run.challenge === 'noflags' ? 1 : 0)),
    revealedThisTurn: 0, sumThisTurn: 0, chordedThisTurn: false, minesDetonated: 0,
    powers: {
      powderkeg: 0, sixthsense: false, sixthUsed: false, leylines: 0,
      blastDividend: false, blastDividendUsed: false, stonechoir: false,
      lightBonus: 0, whiteFlame: null, operatingTheatre: 0, interlock: 0,
      blockRetention: null, wallBelow: null, refuseDark: 0, heatTolerance: 0,
    },
    classState: {
      passiveUsed: false, scanCount: 0, kindleUsed: false, luckyUsed: false,
      painUsed: false, exhaustUsed: false, deathUsed: false, constructBuiltThisTurn: false,
      blastChain: 0, light: 0, lightGainedThisTurn: 0, preserveLight: 0, loaded: 0,
      loadedCap: hasT('twoheadedcoin') ? 4 : 3, riggedWagers: 0,
      twoHeadedCoin: hasT('twoheadedcoin'), twoHeadedCoinUsed: false,
      doubleWagers: 0, bloodSpent: 0, bloodSpentThisTurn: 0, untreatedBlood: 0,
      triageRecoveryUsed: false, triageLineRecovery: 0, triageLineHealing: 0, operatingUses: 0,
      leechKit: hasT('leechkit'), cinderbrand: hasT('cinderbrand'),
      deathsDoorThreshold: hasT('secondshroud') ? 0.4 : 0.25,
      citations: 0, resolve: 0, resolveCap: 10,
    },
    instinctUsed: 0, gogglesUsed: false, compassUsed: false, canaryUsed: false, keystoneUsed: false,
    nitro: 0, nitroBoost: 0, lie: null, primed: null, targetIdx: 0,
    fullCleared: false, cleanup: false, over: false, setup: true, log: [],
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
  if (hasT('wardplate')) c.plating = Math.max(c.plating, 1);
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
  ui.battlePreview = loadPreferences().showBattleBriefings
    ? { id: `${run.runId || 'run'}-${run.floors}-${kind}`, kind }
    : null;
  if (kind === 'boss') {
    const home = c.enemies.find(enemy => enemy.def.boss)?.def.home ?? run.stratum;
    queueCutscene(`boss-intro-${home}`, {}, true);
  }
  startTurn();
}

export const PICKS_PER_TURN = 4;
export function basePicksFor(clsKey) { return CLASSES[clsKey]?.picks ?? PICKS_PER_TURN; }

function startTurn() {
  const c = cbt();
  c.turn++;
  const retention = run.cls === 'warden'
    ? Number(c.powers.blockRetention ?? 0.1)
    : 0;
  c.block = c.turn > 1 ? Math.floor(c.block * retention) : 0;
  if (run.cls === 'lamplighter' && c.turn > 1 && !hasT('everburningwick')) {
    const light = Number(c.classState.light || 0);
    const preserved = Math.min(light, Number(c.classState.preserveLight || 0));
    c.classState.light = preserved + Math.floor((light - preserved) / 2);
    c.classState.preserveLight = 0;
  }
  c.energy = c.maxEnergy;
  if (c.turn === 1) c.energy = Math.max(PERSISTENT_CURSES.nightterrors.minimum, c.energy + persistentCurseTotal('firstTurnEnergy'));
  c.picks = c.maxPicks;
  /* Survey Relays draw power: each active relay costs 1 Energy at turn start. A
     relay that can't be powered goes offline for the turn (no Scan/Block) but
     stays on the board and runs again once energy is available. */
  const relayCells = board().cells.filter(cell => cell.construct?.kind === 'relay');
  if (relayCells.length) {
    let powered = 0;
    for (const cell of relayCells) {
      if (c.energy > 0) { c.energy--; cell.construct.powered = true; powered++; }
      else cell.construct.powered = false;
    }
    if (powered) log(`⌁ Relay upkeep draws ${powered} Energy.`);
    const offline = relayCells.length - powered;
    if (offline) log(`⌁ ${offline} Relay${offline === 1 ? '' : 's'} offline — not enough power.`);
  }
  c.revealedThisTurn = 0; c.sumThisTurn = 0; c.chordedThisTurn = false;
  c.powers.sixthUsed = false;
  c.classState.passiveUsed = false;
  c.classState.kindleUsed = false;
  c.classState.luckyUsed = false;
  c.classState.painUsed = false;
  c.classState.exhaustUsed = false;
  c.classState.constructBuiltThisTurn = false;
  const retainedBlastChain = run.cls === 'sapper' && hasT('daisychain') && c.turn > 1
    ? Math.min(2, Number(c.classState.blastChain || 0))
    : 0;
  c.classState.blastChain = retainedBlastChain;
  if (retainedBlastChain > 0) {
    log(`⛓ Daisy Chain carries ${retainedBlastChain} Blast Chain link${retainedBlastChain === 1 ? '' : 's'} forward.`);
  }
  c.classState.lightGainedThisTurn = 0;
  c.classState.bloodSpentThisTurn = 0;
  c.classState.twoHeadedCoinUsed = false;
  c.classState.triageRecoveryUsed = false;
  c.classState.triageLineRecovery = 0;
  c.classState.triageLineHealing = 0;
  c.classState.operatingUses = 0;
  c.classState.freeFlareUsed = false;
  c.powers.blastDividendUsed = false;
  c.signalCoreUsed = false;
  c.dowsingScanUses = 0;
  c.protocolCoilUsed = false;
  c.silverThreadUsesThisTurn = 0;
  if (run.cls === 'warden' && c.powers.wallBelow) {
    gainBlock(c.plating * c.powers.wallBelow.blockPerPlating);
    c.classState.resolve = Math.min(Number(c.classState.resolveCap || 10),
      Number(c.classState.resolve || 0) + c.powers.wallBelow.resolve);
  }
  const normalDraw = 5 + (hasT('indexcard') && c.turn === 1 ? 1 : 0) - (hasT('emberjar') && c.turn > 1 ? 1 : 0)
    + persistentCurseTotal('cardsPerTurn');
  drawCards(Math.max(PERSISTENT_CURSES.exhaustion.minimum, normalDraw));
  syncConsumableHand();
  applyDowsingReading();
  notify();
}

function updateGlow() {
  const b = board();
  b.cells.forEach(cell => cell.glow = false);
  if (!hasT('dowsingrod')) return;
  const safe = provablySafe();
  if (safe != null) b.cells[safe].glow = true;
}

function applyDowsingReading() {
  updateGlow();
  if (!hasT('dowsingrod')) return;
  if (board().cells.some(cell => cell.glow)) {
    log('🪄 Dowsing Rod highlights provably safe ground.');
    return;
  }
  const mine = randPick(hiddenIdx().filter(i => board().cells[i].mine && board().cells[i].flag !== 2));
  if (mine != null) {
    verifyFlag(mine);
    log('🪄 Dowsing Rod verifies a mine because no safe deduction is available.');
    toast('Dowsing Rod verifies one mine');
  }
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
  if (c.cleanup) {
    toast('No more turns — finish clearing the board with unlimited Picks.');
    return;
  }
  sfx('turn');
  ui.targeting = null; ui.gadgetTargeting = null;
  const retainedConsumables = [];
  for (const card of c.hand) {
    if (CARDS[card.key]?.consumableKey) retainedConsumables.push(card);
    else if (card.temporaryCurse) c.exhaust.push(card);
    else c.discard.push(card);
  }
  c.hand = retainedConsumables;
  const b = board();
  for (let i = 0; i < b.cells.length; i++) {
    const con = b.cells[i].construct;
    if (!con || c.over) continue;
    if (HEAT_CONSTRUCTS.has(con.kind)) {
      if (con.powered === false) continue;            // Relay offline — no upkeep Energy this turn
      if (constructOverheats(i, con, b)) continue;     // overheated — skip its trigger entirely
    }
    const repeats = c.powers.stonechoir && con.kind !== 'bulwark' ? 2 : 1;
    for (let n = 0; n < repeats && !c.over; n++) {
      if (con.kind === 'sentry') { log('🗼 Sentry fires.'); hitRandom(con.dmg); }
      else if (con.kind === 'bulwark') { gainPlating(con.plating); gainBlock(con.block); }
      else if (con.kind === 'relay') relayScan(i, con, b);
    }
  }
  for (const e of c.enemies) {
    if (e.hp <= 0 || c.over) continue;
    if (e.data.modifierBuried) { log(`⌄ ${e.def.name} circles beneath the board.`); continue; }
    e.block = 0;
    const sundered = e.effects?.sundered > 0;
    e.def.act(e, e.intent);
    if (sundered) {
      e.block = Math.floor(e.block / 2);
      e.effects.sundered--;
      log(`╱ Sundered limits ${e.def.name}'s Block to ${e.block}.`);
    }
    if (c.over) break;
    e.step++;
    e.intent = e.def.next(e);
  }
  if (c.over) { notify(); return; }
  if (run.cls === 'chirurgeon' && Number(c.classState.triageLineRecovery || 0) > 0
      && c.block > 0 && Number(c.classState.untreatedBlood || 0) > 0) {
    const recovery = Math.min(
      Number(c.classState.triageLineRecovery || 0),
      Number(c.block || 0),
      Number(c.classState.untreatedBlood || 0),
    );
    consumeUntreatedBlood(recovery);
    const healed = healHP(Math.min(recovery, Number(c.classState.triageLineHealing || 0)), { treatBlood: false });
    if (healed) toast(`Triage Line: ${healed} HP recovered from unused Block`);
  }
  startTurn();
}

export function addTemporaryCard(key, pile = 'discard') {
  const c = run?.combat;
  if (!c || !CARDS[key] || !Array.isArray(c[pile])) return false;
  c[pile].push(mkCard(key));
  log(`▧ ${CARDS[key].name} added to your ${pile}.`);
  return true;
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
function isScanCard(card) {
  const def = CARDS[card?.key];
  return Boolean(def?.text && /\bScan\b/i.test(String(def.text(card.up ? 1 : 0))));
}

export function effCost(card) {
  const def = CARDS[card.key];
  if (def.cost == null) return null;
  const level = Math.max(0, Math.min(2, Number(card.up || 0)));
  let cost = def.cost.length >= 3
    ? def.cost[level]
    : def.cost[level ? 1 : 0];
  if (level >= 2 && def.cost.length < 3) cost = Math.max(0, cost - 1);
  if (card.riseFree) cost = 0;
  if (card.key === 'entombcard' && hasT('keystone') && !cbt().keystoneUsed) cost = 0;
  if (hasT('protocolcoil') && !cbt().protocolCoilUsed) cost = Math.max(0, cost - 1 - relicLevel('protocolcoil'));
  if (hasT('dowsingrod') && (cbt().dowsingScanUses || 0) < 1 + relicLevel('dowsingrod') && isScanCard(card)) cost = 0;
  return cost;
}

/* Guaranteed Health a card pays as a cost when played (0 if it never self-harms). */
export function cardSelfDamage(card) {
  const def = CARDS[card?.key];
  if (!def || typeof def.selfDamage !== 'function') return 0;
  return Math.max(0, Number(def.selfDamage(card.up || 0)) || 0);
}

/* Would playing this card right now end the run? Blood/HP costs bypass Block and
   Plating, and the Revenant's first lethal moment each combat returns them to 1 HP,
   so that unspent save means the play is not actually suicidal. */
export function isPlayLethal(card) {
  if (!run?.combat) return false;
  const dmg = cardSelfDamage(card);
  if (dmg <= 0 || run.hp - dmg > 0) return false;
  const saved = run.cls === 'revenant' && !cbt().classState.deathUsed;
  return !saved;
}

export function clickHandCard(handIdx) {
  const c = cbt();
  if (c.over) return;
  if (c.cleanup) {
    toast('Cards are closed. Finish the board with unlimited Picks.');
    return;
  }
  if (ui.targeting) {
    if (ui.targeting.handIdx === handIdx && ui.targeting.optional && ui.targeting.picked.length) { finishTargeting(); return; }
    ui.targeting = null; notify(); return;
  }
  const card = c.hand[handIdx];
  const def = CARDS[card.key];
  if (def.consumableKey) {
    useGadget(def.consumableKey, handIdx);
    return;
  }
  if (def.unplayable) { invalidCardFeedback(card, `${def.name} is a ${def.type} and cannot be played.`); return; }
  const cost = effCost(card);
  if (cost > c.energy) { invalidCardFeedback(card, `${def.name} needs ${cost} Energy; you have ${c.energy}.`); return; }
  if (def.can && !def.can(card.up || 0)) { invalidCardFeedback(card, def.canMsg || `${def.name}'s condition is not currently met.`); return; }
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
    case 'open': return isConstructSite(i);
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
  if (hasT('protocolcoil') && !c.protocolCoilUsed) c.protocolCoilUsed = true;
  if (hasT('dowsingrod') && (c.dowsingScanUses || 0) < 1 + relicLevel('dowsingrod') && isScanCard(card)) {
    c.dowsingScanUses = (c.dowsingScanUses || 0) + 1;
  }
  c.energy -= cost;
  c.hand.splice(handIdx, 1);
  sfx('play');
  c.activeCard = card;
  try {
    def.play(card.up || 0, picked); // real tier (0/1/2); cards read it as a boolean, level-scaling cards use the number
  } finally {
    c.activeCard = null;
  }
  if (!c.over) {
    if (def.type === 'Power') c.powersPlayed.push(card);
    else if (def.file && card.recalledTurn !== c.turn) {
      c.archive.push(card);
      if (run.cls === 'archivist' && !c.classState.exhaustUsed) {
        c.classState.exhaustUsed = true;
        drawCards(1);
        toast('Cross-reference: draw 1');
      }
    }
    else if (def.grave && run.cls === 'revenant' && !card.risen) {
      c.grave.push(card);
    }
    else if (def.exhaust || def.file || def.grave) {
      c.exhaust.push(card);
      if (run.cls === 'archivist' && !c.classState.exhaustUsed) {
        c.classState.exhaustUsed = true;
        drawCards(1);
        toast('Cross-reference: draw 1');
      }
    }
    else c.discard.push(card);
    if (card.riseDraw) drawCards(1);
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
    consumeGadgetCard(key);
    GADGETS[key].use(i);
    notify();
    return;
  }
  if (ui.targeting) { clickTileTargeting(i); return; }
  const cell = board().cells[i];
  if (cell.void || cell.revealed || cell.entombed) return;
  if (ui.flagMode) { toggleFlag(i); return; }
  if (cell.flag) return; // classic: click on flag does nothing
  if (!c.cleanup && c.picks <= 0) { toast('Out of picks ⛏ — cards still dig, or end turn.', true); return; }
  if (!c.cleanup) c.picks--;
  revealTile(i, 'reveal');
  notify();
}

export function toggleFlag(i) {
  if (run.challenge === 'noflags') { toast('Unmarked Stone forbids flags.', true); sfx('invalid'); haptic('invalid'); return; }
  const cell = board().cells[i];
  if (!isHiddenUsable(i)) return;
  cell.flag = cell.flag ? 0 : 1;
  if (cell.flag && cell.mine && run.cls === 'gambler') {
    const cap = Math.max(3, Number(cbt().classState.loadedCap || 3));
    cbt().classState.loaded = Math.min(cap, Number(cbt().classState.loaded || 0) + 1);
    if (!cbt().classState.luckyUsed) {
      cbt().classState.luckyUsed = true;
      drawCards(1);
      toast('Lucky Read: +1 Loaded and draw 1');
    } else toast(`Correct flag: Loaded ${cbt().classState.loaded}/${cap}`);
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

function consumeGadgetCard(key, handIdx = -1) {
  const inventoryIdx = run.gadgets.indexOf(key);
  if (inventoryIdx < 0) return false;
  run.gadgets.splice(inventoryIdx, 1);
  const c = run.combat;
  if (c) {
    const expectedCardKey = consumableCardKey(key);
    const cardIdx = c.hand[handIdx]?.key === expectedCardKey
      ? handIdx
      : c.hand.findIndex(card => card.key === expectedCardKey);
    if (cardIdx >= 0) c.hand.splice(cardIdx, 1);
  }
  return true;
}

export function useGadget(key, handIdx = -1) {
  const g = GADGETS[key];
  if (!g || !run.combat || cbt().over || !run.gadgets.includes(key)) return;
  if (key === 'smokebomb' && cbt().kind === 'boss') { toast('No escape from a boss!', true); return; }
  if (g.target) {
    ui.gadgetTargeting = key;
    ui.targeting = null;
    toast(`${g.name}: pick a tile`);
    notify();
    return;
  }
  consumeGadgetCard(key, handIdx);
  g.use();
  notify();
}

/* ================= rewards ================= */
function combatVictory() {
  const c = cbt();
  const kind = c.kind;
  const bossKey = kind === 'boss' ? c.enemies.find(enemy => enemy.def.boss)?.key || null : null;
  const bossTrinkets = kind === 'boss' ? bossRelicOffer(bossKey) : null;
  const veinBoons = kind === 'boss' && run.stratum === 3 && bossTrinkets.length === 0
    ? shuffle(Object.keys(VEIN_BOONS)).slice(0, 3) : null;
  let gold = kind === 'boss' ? 75 : kind === 'elite' ? 30 : 10 + randInt(11);
  if (kind === 'boss') {
    run.bossesDefeated ??= [];
    for (const enemy of c.enemies) if (!run.bossesDefeated.includes(enemy.key)) run.bossesDefeated.push(enemy.key);
    if (run.stratum === 3 && (run.pos?.r ?? MAP_ROWS - 1) < MAP_ROWS - 1) {
      run.veinBossesDefeated = (run.veinBossesDefeated || 0) + 1;
    }
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
    bossKey, bossTrinkets, veinBoons,
    veinExit: run.stratum === 3 && run.pos?.r === MAP_ROWS - 1,
  };
  for (const card of run.reward.cards) recordCardSeen(card.key);
  if (run.reward.trinket) recordItemSeen(`trinket:${run.reward.trinket}`);
  if (run.reward.gadget) recordItemSeen(`gadget:${run.reward.gadget}`);
  for (const key of run.reward.bossTrinkets || []) recordItemSeen(`trinket:${key}`);
  run.combat = null;
  ui.screen = 'reward';
  if (kind === 'boss') {
    const home = c.enemies.find(enemy => enemy.def.boss)?.def.home ?? run.stratum;
    queueCutscene(`boss-aftermath-${home}`, {}, true);
  }
  notify();
}

export function rewardPoolFor(clsKey) {
  const keys = [...(CLASSES[clsKey]?.rewardPool || []), ...NEUTRAL_REWARD_POOL];
  return [...new Set(keys)].filter(key => {
    const card = CARDS[key];
    return card && ['common', 'uncommon', 'rare'].includes(card.rarity)
      && (card.cls === clsKey || card.cls === 'neutral');
  });
}

function rollCardReward(upgraded) {
  const classPool = [...(CLASSES[run.cls]?.rewardPool || [])];
  const neutralPool = [...NEUTRAL_REWARD_POOL];
  const pickFrom = (pool, excluded = []) => {
    const roll = random();
    const r = roll < 0.10 ? 'rare' : roll < 0.40 ? 'uncommon' : 'common';
    const available = pool.filter(key => !excluded.includes(key));
    return randPick(available.filter(key => CARDS[key]?.rarity === r)) || randPick(available);
  };
  const picks = [];
  for (let i = 0; i < 2; i++) {
    const key = pickFrom(classPool, picks);
    if (key) picks.push(key);
  }
  const neutral = pickFrom(neutralPool, picks);
  if (neutral) picks.push(neutral);
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
  if (!r.trinket || !isTrinketEligible(r.trinket)) return;
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
  r.veinBoons = null;
  notify();
}

export function takeVeinBoon(key) {
  const r = run.reward;
  if (!r?.veinBoons?.includes(key) || !VEIN_BOONS[key]) return;
  if (key === 'resonance') {
    const relic = randPick(BOSS_RELIC_KEYS.filter(relicKey => run.trinkets.includes(relicKey)));
    if (relic) {
      run.relicUpgrades ??= {};
      run.relicUpgrades[relic] = (run.relicUpgrades[relic] || 0) + 1;
      toast(`${TRINKETS[relic].name} tempered to +${run.relicUpgrades[relic]}`);
    } else run.gold += 100;
  } else if (key === 'vitality') {
    run.maxHp += 8;
    run.hp = Math.min(run.maxHp, run.hp + 8);
  } else if (key === 'reforge') {
    const targets = shuffle(run.deck.filter(card => (card.up || 0) < 2 && CARDS[card.key]?.cost != null)).slice(0, 2);
    if (!targets.length) run.gold += 100;
    for (const card of targets) {
      card.up = Math.min(2, (card.up || 0) + 1);
      run.upgrades = (run.upgrades || 0) + 1;
      deckChanged('upgrade', `${CARDS[card.key].name} was reforged`);
    }
  } else if (key === 'transmute') {
    const candidates = run.deck.map((card, index) => ({ card, index }))
      .filter(({ card }) => CARDS[card.key]?.cost != null && CARDS[card.key]?.rarity !== 'curse');
    const chosen = randPick(candidates);
    const pool = rewardPoolFor(run.cls).filter(cardKey =>
      CARDS[cardKey].rarity === 'rare' && cardKey !== chosen?.card.key);
    const replacement = randPick(pool);
    if (chosen && replacement) {
      const oldName = CARDS[chosen.card.key].name;
      run.deck[chosen.index] = mkCard(replacement, 1);
      recordCardSeen(replacement);
      recordCardOwned(replacement);
      deckChanged('upgrade', `${oldName} became ${CARDS[replacement].name}+`);
    } else run.gold += 100;
  } else if (key === 'cache') {
    run.gold += 75;
    if (run.gadgets.length < 3) {
      const gadget = randPick(Object.keys(GADGETS));
      run.gadgets.push(gadget);
      recordItemSeen(`gadget:${gadget}`);
      recordItemOwned(`gadget:${gadget}`);
    } else run.gold += 25;
  }
  run.veinBoons ??= {};
  run.veinBoons[key] = (run.veinBoons[key] || 0) + 1;
  r.veinBoons = null;
  r.bossTrinkets = null;
  toast(`${VEIN_BOONS[key].name} claimed`);
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

function markCoreVictory() {
  if (run.coreWon) return;
  run.coreWon = true;
  checkpointRunTimer();
  run.coreClearMs = run.elapsedMs;
  recordSpeedrun(run);
  recordRunHistory(run, true);
  sfx('victory');
  haptic('victory');
  recordProgress(run, 'victory');
  recordDelverProgress(run, 'victory');
  const fresh = evaluateAchievements(run, 'victory');
  if (fresh.length) ui.achievement = { ...fresh[0], id: Date.now() };
  recordDailyRunEnd(true);
}

function descendVein() {
  run.veinSegments = (run.veinSegments || 0) + 1;
  const heal = effectiveHealing(Math.max(1, Math.floor(run.maxHp * 0.15)));
  run.hp = Math.min(run.maxHp, run.hp + heal);
  genMapForStratum();
  queueCutscene('vein-deeper', { segment: run.veinSegments + 1 }, false);
  toast(`The Vein reforms. Segment ${run.veinSegments + 1} · Depth ${run.veinDepth + 1} · +${heal} HP`);
  ui.screen = 'map';
}

export function finishReward() {
  const r = run.reward;
  run.reward = null;
  if (r.kind === 'boss') {
    if (run.stratum === 3) {
      if (r.veinExit) descendVein();
      else ui.screen = 'map';
      notify();
      return;
    }
    if (run.stratum === 2) {
      markCoreVictory();
      advanceStratum();
      queueCutscene('descent-3', {}, true);
      notify();
      return;
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
  const upgradable = run.deck.filter(c => (c.up || 0) < 2 && CARDS[c.key].cost != null);
  if (!upgradable.length) { toast('Nothing to upgrade.', true); return; }
  openModal({ kind: 'upgrade' });
}
export function doUpgrade(deckIdx) {
  run.deck[deckIdx].up = Math.min(2, (run.deck[deckIdx].up || 0) + 1);
  run.upgrades = (run.upgrades || 0) + 1;
  ui.modal = null;
  const upTag = run.deck[deckIdx].up >= 2 ? '++' : '+';
  toast(`${CARDS[run.deck[deckIdx].key].name}${upTag} !`);
  deckChanged('upgrade', `${CARDS[run.deck[deckIdx].key].name} was upgraded`);
  if (ui.screen === 'puzzle' && run.puzzle) run.puzzle.active = false;
  if (ui.screen === 'camp' || ui.screen === 'puzzle') ui.screen = 'map';
  notify();
}

/* Weighted sample without replacement (Efraimidis–Spirakis) on the run RNG. */
function weightedSample(items, n, weight) {
  return items
    .map(it => ({ it, k: Math.pow(random() || 1e-9, 1 / Math.max(0.01, weight(it))) }))
    .sort((a, b) => b.k - a.k)
    .slice(0, n)
    .map(x => x.it);
}

export function genShop() {
  /* In the Vein, the Rat Merchant runs a Black Market: prices are marked up and
     climb with depth, but the goods are richer — biased toward rarer cards, some
     arriving pre-upgraded, with an extra card and trinket shelf. */
  const vein = run.stratum === 3;
  const tier = veinThreatTier();
  const markup = vein ? 1.5 + tier * 0.08 : 1;
  const px = base => Math.round(base * markup);
  const upChance = vein ? Math.min(0.7, 0.35 + tier * 0.05) : 0;
  const cardSlots = vein ? 6 : 5;
  const trinketSlots = vein ? 3 : 2;
  const cardBase = k => CARDS[k].rarity === 'rare' ? 130 + randInt(30) : CARDS[k].rarity === 'uncommon' ? 70 + randInt(20) : 45 + randInt(15);

  const classPool = [...(CLASSES[run.cls]?.rewardPool || [])];
  const neutralPool = [...NEUTRAL_REWARD_POOL];
  const rank = { common: 1, uncommon: 2, rare: 3 };
  const classSlots = vein ? 4 : 3;
  const neutralSlots = cardSlots - classSlots;
  const classDraw = vein
    ? weightedSample(classPool, classSlots, k => rank[CARDS[k].rarity] || 1)
    : shuffle(classPool).slice(0, classSlots);
  const neutralDraw = vein
    ? weightedSample(neutralPool, neutralSlots, k => rank[CARDS[k].rarity] || 1)
    : shuffle(neutralPool).slice(0, neutralSlots);
  const draw = shuffle([...classDraw, ...neutralDraw]);
  const cards = draw.map(k => {
    const up = random() < upChance ? 1 : 0;
    return { key: k, up, price: px(up ? Math.round(cardBase(k) * 1.3) : cardBase(k)), sold: false };
  });
  const trinkets = [];
  const signatureRelic = SIGNATURE_RELICS[run.cls];
  if (signatureRelic && !run.trinkets.includes(signatureRelic)) {
    trinkets.push({ key: signatureRelic, price: px(120 + randInt(60)), sold: false, signature: true });
  }
  while (trinkets.length < trinketSlots) {
    const t = unownedTrinket(trinkets.map(item => item.key));
    if (!t) break;
    trinkets.push({ key: t, price: px(120 + randInt(60)), sold: false });
  }
  const gadgets = shuffle(Object.keys(GADGETS)).slice(0, 2).map(k => ({ key: k, price: px(30 + randInt(15)), sold: false }));
  run.shop = { cards, trinkets, gadgets, blackMarket: vein };
  for (const item of cards) recordCardSeen(item.key);
  for (const item of trinkets) recordItemSeen(`trinket:${item.key}`);
  for (const item of gadgets) recordItemSeen(`gadget:${item.key}`);
}
export function buyShopCard(i) {
  const it = run.shop.cards[i];
  if (it.sold || run.gold < it.price) { toast('Not enough gold.', true); return; }
  run.gold -= it.price; it.sold = true;
  run.deck.push(mkCard(it.key, it.up || 0));
  recordCardOwned(it.key);
  deckChanged('add', `${CARDS[it.key].name}${it.up ? '+' : ''} joins the deck`);
  notify();
}
export function buyShopTrinket(i) {
  const it = run.shop.trinkets[i];
  if (!it || it.sold || run.trinkets.includes(it.key) || !isTrinketEligible(it.key)) {
    toast('That item is unavailable.', true);
    return;
  }
  if (run.gold < it.price) { toast('Not enough gold.', true); return; }
  run.gold -= it.price; it.sold = true;
  run.trinkets.push(it.key);
  recordItemOwned(`trinket:${it.key}`);
  notify();
}
export function buyShopGadget(i) {
  const it = run.shop.gadgets[i];
  if (it.sold || run.gold < it.price) { toast('Not enough gold.', true); return; }
  if (run.gadgets.length >= 3) { toast('Consumable slots full (3).', true); return; }
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
  if (ui.screen === 'puzzle' && run.puzzle) run.puzzle.active = false;
  ui.screen = 'map';
  notify();
}

/* ----- events ----- */
export const EVENT_CATALOG = {
  ...FICTION_EVENT_CATALOG,
  /* Special-cased in currentEventView/eventChoice: presents two of the player's own
     cards to "unmake", then adds a copy of the chosen card instead of removing it. */
  unmakingfont: {
    emoji: '⚗️', title: 'The Unmaking Font', fiction: true, falsePurge: true,
    text: 'A font of pale, hissing brine offers to dissolve one card from your pack forever. Two cards drift up through the murk, waiting for you to choose which to unmake.',
    actions: [
      { key: 'a', label: 'Dissolve the first card', desc: '' },
      { key: 'b', label: 'Dissolve the second card', desc: '' },
    ],
    choices: [
      { key: 'a', label: 'Dissolve the first card', desc: '' },
      { key: 'b', label: 'Dissolve the second card', desc: '' },
    ],
  },
};

/* The two distinct deck cards the Unmaking Font offers, in deck order. */
function falsePurgeChoices() {
  const deck = run?.deck || [];
  const distinct = [];
  for (const card of deck) if (!distinct.some(c => c.key === card.key)) distinct.push(card);
  if (distinct.length === 0) return [];
  if (distinct.length === 1) return [distinct[0], distinct[0]];
  return distinct.slice(0, 2);
}

function prepareEventState(key) {
  const event = EVENT_CATALOG[key];
  if (!event || event.falsePurge) { run.eventState = null; return; }
  const rolls = Array.from({ length: 6 }, () => random());
  run.eventState = createFictionEventState(event, run, rolls, randPick(Object.keys(GADGETS)));
}

/* Honest puzzles are a distinct event-room outcome rather than one entry hidden
   among the full event catalog. This keeps them common enough to be a recurring
   run mechanic while preserving event-chain returns as the highest priority. */
export const HONEST_PUZZLE_EVENT_CHANCE = 0.35;

export function currentEventView() {
  const event = EVENT_CATALOG[run?.event];
  if (!event) return null;
  if (run.eventState?.chainReturn) {
    const thread = run.eventThreads?.[run.eventState.threadKey];
    return fictionEventFollowup(event, thread);
  }
  if (event.falsePurge) {
    const picks = falsePurgeChoices();
    return {
      stageLabel: 'Choose a card to unmake',
      text: event.text,
      choices: picks.map((card, index) => ({
        key: index === 0 ? 'a' : 'b',
        label: `Dissolve ${CARDS[card.key].name}${card.up ? '+' : ''}`,
        desc: '',
      })),
    };
  }
  if (!run.eventState) prepareEventState(run.event);
  return fictionEventView(event, run.eventState);
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
  if (random() < HONEST_PUZZLE_EVENT_CHANCE) {
    startPuzzle('random');
    return;
  }
  const all = Object.keys(EVENT_CATALOG);
  const unseen = all.filter(e => !run.seenEvents.includes(e));
  const pick = randPick(unseen.length ? unseen : all);
  run.seenEvents.push(pick);
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
  if (effect.removeCard) {
    const index = run.deck.findIndex(card => card.key === effect.removeCard);
    if (index >= 0) {
      const [removed] = run.deck.splice(index, 1);
      lines.push(`Remove ${CARDS[removed.key]?.name || removed.key} from your deck.`);
      deckChanged('remove', `${CARDS[removed.key]?.name || removed.key} leaves the deck`);
    }
  }
  if (effect.pickBonus) {
    run.pickBonus = Math.max(0, (run.pickBonus || 0) + effect.pickBonus);
    lines.push(`Gain ${effect.pickBonus} maximum Pick per turn for this run.`);
  }
  if (effect.upgrade) {
    const eligible = run.deck.filter(card => (card.up || 0) < 2 && CARDS[card.key]?.cost != null);
    const card = randPick(eligible);
    if (card) {
      card.up = Math.min(2, (card.up || 0) + 1); run.upgrades = (run.upgrades || 0) + 1;
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
  const event = EVENT_CATALOG[run.event];
  if (event?.falsePurge) {
    const picks = falsePurgeChoices();
    const card = which === 'b' ? picks[1] : picks[0];
    if (!card) return;
    const key = card.key, up = card.up || 0;
    const name = `${CARDS[key].name}${up ? '+' : ''}`;
    run.deck.push(mkCard(key, up));
    recordCardOwned(key);
    deckChanged('add', `${name} rises from the font, doubled`);
    run.eventState ??= {};
    run.eventState.stage = 'resolved';
    run.eventHistory ??= [];
    run.eventHistory.push({ id: run.event, choice: which, stratum: run.stratum, floor: run.floors });
    const html = `<p>You lower ${name} into the brine — and the font gives it back twofold.</p><p><b>Add a copy of ${name} to your deck.</b></p>`;
    run.eventState.result = { title: `${event.emoji} ${event.title}`, html };
    eventResult(`${event.emoji} ${event.title}`, html);
    return;
  }
  if (run.eventState?.chainReturn) {
    const thread = run.eventThreads[run.eventState.threadKey];
    const followup = fictionEventFollowup(event, thread);
    const result = resolveFictionEventFollowup(event, which);
    if (!followup || !result) return;
    thread.stage = 2; thread.returnChoice = which;
    const consequenceLines = applyEventEffect(result.effect);
    const html = `<p>${result.result}</p>${consequenceLines.map(line => `<p><b>${line}</b></p>`).join('')}`;
    run.eventHistory.push({ id: run.event, chain: true, choice: which, stratum: run.stratum, floor: run.floors });
    eventResult(`↻ ${followup.title}`, html);
    return;
  }
  if (event) {
    if (!run.eventState) prepareEventState(run.event);
    const result = resolveFictionEvent(event, run.eventState, which);
    if (!result) return;
    const consequenceLines = applyEventEffect(result.effect);
    run.eventHistory ??= [];
    run.eventHistory.push({
      id: run.event, choice: which,
      stratum: run.stratum, floor: run.floors,
    });
    run.eventThreads ??= {};
    if (event.followup && !run.eventThreads[run.event]) {
      const chosen = event.actions?.find(item => item.key === which);
      run.eventThreads[run.event] = { stage: 1, choice: which, choiceLabel: chosen?.label || which, floor: run.floors };
    }
    const html = `<p>${result.result}</p>${consequenceLines.map(line => `<p><b>${line}</b></p>`).join('')}`;
    run.eventState.result = { title: `${event.emoji} ${result.title}`, html };
    eventResult(`${event.emoji} ${result.title}`, html);
    return;
  }
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
  4: [
    '0230 3012 0043 0001',
    '2041 0003 0402 0030',
    '1200 0321 0010 0002',
    '2000 1304 0200 4000',
    '0401 0120 0043 0000',
    '0401 0200 0032 2300',
    '0030 0204 0021 0100',
  ].map(text => sudokuTemplate(4, text)),
  6: [
    '000050 056103 004061 000204 045000 610000',
    '426501 000264 612000 040000 560012 000605',
    '001342 030050 020030 300204 106020 053006',
    '500403 003062 020005 600024 300251 200000',
    '000000 605200 216003 453120 002604 060050',
    '020500 501000 152030 000100 216054 005060',
    '104030 000045 546003 001004 060350 010000',
  ].map(text => sudokuTemplate(6, text)),
  9: [
    '800000000 003600000 070090200 050007000 000045700 000100030 001000068 008500010 090000400',
    '751600390 046009005 003007000 530010920 060005800 010960050 602090017 000070060 000000500',
    '000700030 090400578 050306000 001800005 008030010 000109780 300084007 002007090 765000000',
    '004081002 900746005 100000000 800000040 005128700 090050000 000002000 730410000 089300104',
    '900068302 000200047 050009800 610020000 000870000 000006529 000080105 000001090 005002006',
    '000009200 008010000 610030000 000068100 200305068 060070300 309000051 000050983 007000000',
    '000001200 080000050 904070000 009060400 000102507 200007000 000095076 607004000 092030000',
  ].map(text => sudokuTemplate(9, text)),
};

const CROSSWORD_CLUES = {
  TOO:'More than needed', URN:'Decorative vessel', BEE:'Honey-making insect', TUB:'Bathing container', ORE:'Rock containing metal', ONE:'First whole number',
  CAT:'Household mouser', WED:'Join in marriage', COW:'Farm animal that gives milk', ARE:'Present plural of “be”', TED:'Turn cut hay to dry it',
  CAN:'Metal container', AGE:'Length of a lifetime', ROW:'Line of things', CAR:'Road vehicle', AGO:'In the past', NEW:'Not previously used',
  POT:'Cooking vessel', CAP:'Head covering', NET:'Woven snare',
  LACK:'Be without', IRON:'Metal used in steel', MERE:'Nothing more than', BAKE:'Cook with dry heat', LIMB:'Arm or leg', AREA:'Measured surface', CORK:'Bottle stopper', KNEE:'Joint in the middle of a leg',
  SCAM:'Dishonest scheme', HOME:'Place where one lives', ONES:'Single units', PENS:'Writing tools', SHOP:'Place that sells goods', CONE:'Tapered geometric solid', AMEN:'Closing word of a prayer', MESS:'Untidy state',
  PAGE:'One side of a leaf of paper', NEST:'Bird’s home', SPAN:'Distance from end to end', CARE:'Concern or attention', AGES:'Very long periods', MEAT:'Animal flesh used as food',
  SKIN:'Body’s outer covering', UNDO:'Reverse an action', BEER:'Drink brewed from grain', SEAM:'Joined edge', SUBS:'Replacement players, informally', IDEA:'Thought or concept', NORM:'Usual standard',
  SCENT:'Distinctive smell', CANOE:'Narrow paddled boat', ARSON:'Crime of setting a fire', ROUSE:'Wake from sleep', FLEET:'Group of ships', SCARF:'Cloth worn around the neck', CAROL:'Festive song', ENSUE:'Happen afterward', NOOSE:'Loop made with a sliding knot', TENET:'Core belief',
  MERIT:'Quality worthy of praise', URINE:'Liquid waste from the body', RANTS:'Speaks angrily at length', ASSET:'Useful possession', LEERY:'Wary or suspicious', MURAL:'Painting made on a wall', ERASE:'Remove written marks', RINSE:'Wash lightly with water', INTER:'Place in a grave', TESTY:'Easily irritated',
  LOCAL:'Nearby or from the area', ALIBI:'Claim of being elsewhere', DIVAS:'Celebrated female performers', EVICT:'Force out of a property', NECKS:'Parts joining heads to bodies', LADEN:'Heavily loaded', OLIVE:'Small green or black fruit', CIVIC:'Relating to a city', ABACK:'Taken by surprise', LISTS:'Written series',
  HEALS:'Makes healthy again', OLDIE:'Something old but still enjoyed', SUAVE:'Smooth and charming', EDGED:'Moved gradually', DEEDS:'Actions that are done', HOSED:'Sprayed with water', ELUDE:'Escape or avoid', ADAGE:'Traditional short saying', LIVED:'Was alive', SEEDS:'Plant embryos',
};
const transposeCrossword = words =>
  Array.from({ length:words.length }, (_, col) => words.map(word => word[col]).join(''));
function crosswordTemplate(words) {
  const downWords = transposeCrossword(words);
  const template = {
    words, downWords,
    acrossClues:words.map(word => CROSSWORD_CLUES[word]),
    downClues:downWords.map(word => CROSSWORD_CLUES[word]),
  };
  if ([...template.acrossClues, ...template.downClues].some(clue => !clue)) {
    throw new Error(`Missing crossword clue for ${[...words, ...downWords].find(word => !CROSSWORD_CLUES[word])}`);
  }
  return template;
}
const CROSSWORD_BASES = {
  3: [
    ['TOO', 'URN', 'BEE'],
    ['CAT', 'ORE', 'WED'],
    ['CAN', 'AGE', 'ROW'],
    ['CAN', 'AGE', 'POT'],
  ],
  4: [
    ['LACK', 'IRON', 'MERE', 'BAKE'],
    ['SCAM', 'HOME', 'ONES', 'PENS'],
    ['SCAM', 'PAGE', 'AREA', 'NEST'],
    ['SKIN', 'UNDO', 'BEER', 'SEAM'],
  ],
  5: [
    ['SCENT', 'CANOE', 'ARSON', 'ROUSE', 'FLEET'],
    ['MERIT', 'URINE', 'RANTS', 'ASSET', 'LEERY'],
    ['LOCAL', 'ALIBI', 'DIVAS', 'EVICT', 'NECKS'],
    ['HEALS', 'OLDIE', 'SUAVE', 'EDGED', 'DEEDS'],
  ],
};
const CROSSWORD_PUZZLES = Object.fromEntries(Object.entries(CROSSWORD_BASES).map(([size, bases]) => [
  size,
  bases.flatMap(words => [crosswordTemplate(words), crosswordTemplate(transposeCrossword(words))]),
]));
for (const [size, templates] of Object.entries(CROSSWORD_PUZZLES)) for (const template of templates) {
  if (!validateCrossword(template, Number(size))) throw new Error(`Invalid ${size}×${size} crossword template`);
}

const SEQUENCE_PUZZLES = {
  0: [
    { prompt: '4, 7, 10, 13, ?', answer: 16, choices: [15, 16, 17, 19], method: 'Add three.' },
    { prompt: '81, 27, 9, 3, ?', answer: 1, choices: [0, 1, 2, 6], method: 'Divide by three.' },
    { prompt: '1, 4, 7, 10, 13, ?', answer: 16, choices: [14, 15, 16, 17], method: 'Add three.' },
    { prompt: '5, 10, 15, 20, ?', answer: 25, choices: [22, 24, 25, 30], method: 'Add five.' },
    { prompt: '20, 18, 16, 14, ?', answer: 12, choices: [10, 11, 12, 13], method: 'Subtract two.' },
    { prompt: '2, 4, 6, 8, ?', answer: 10, choices: [9, 10, 11, 12], method: 'Add two.' },
    { prompt: '3, 6, 9, 12, ?', answer: 15, choices: [14, 15, 16, 18], method: 'Add three.' },
    { prompt: '64, 32, 16, 8, ?', answer: 4, choices: [2, 4, 6, 12], method: 'Halve each term.' },
    { prompt: '1, 4, 9, 16, ?', answer: 25, choices: [20, 24, 25, 32], method: 'Use consecutive square numbers.' },
    { prompt: '100, 90, 80, 70, ?', answer: 60, choices: [50, 55, 60, 65], method: 'Subtract ten.' },
  ],
  1: [
    { prompt: '2, 4, 8, 16, ?', answer: 32, choices: [24, 30, 32, 34], method: 'Double each term.' },
    { prompt: '1, 1, 2, 3, 5, ?', answer: 8, choices: [6, 7, 8, 10], method: 'Add the previous two terms.' },
    { prompt: '3, 6, 11, 18, ?', answer: 27, choices: [25, 26, 27, 29], method: 'Use successive odd gaps.' },
    { prompt: '2, 6, 12, 20, 30, ?', answer: 42, choices: [36, 40, 42, 44], method: 'Multiply consecutive neighbours: n × (n + 1).' },
    { prompt: '2, 3, 5, 8, 12, 17, ?', answer: 23, choices: [21, 22, 23, 24], method: 'Add one more each time.' },
    { prompt: '5, 9, 17, 33, ?', answer: 65, choices: [49, 63, 65, 66], method: 'Double, then subtract one.' },
    { prompt: '1, 4, 10, 19, 31, ?', answer: 46, choices: [43, 45, 46, 49], method: 'Add successive multiples of three.' },
    { prompt: '10, 11, 13, 16, 20, ?', answer: 25, choices: [24, 25, 26, 28], method: 'Add one, then two, then three, and so on.' },
    { prompt: '8, 13, 21, 34, ?', answer: 55, choices: [47, 52, 55, 57], method: 'Add the previous two terms.' },
    { prompt: '1, 8, 27, 64, ?', answer: 125, choices: [81, 100, 121, 125], method: 'Use consecutive cube numbers.' },
  ],
  2: [
    { prompt: '2, 5, 4, 8, 6, 11, 8, ?', answer: 14, choices: [10, 12, 13, 14], method: 'Interleave +2 and +3 sequences.' },
    { prompt: '1, 2, 6, 15, 31, ?', answer: 56, choices: [47, 52, 56, 63], method: 'Add consecutive squares.' },
    { prompt: '3, 4, 8, 9, 18, 19, ?', answer: 38, choices: [28, 36, 38, 40], method: 'Alternate plus one and times two.' },
    { prompt: '1, 4, 2, 8, 3, 12, 4, ?', answer: 16, choices: [14, 15, 16, 20], method: 'Interleave counting numbers with their quadruples.' },
    { prompt: '2, 3, 6, 7, 14, 15, ?', answer: 30, choices: [16, 28, 30, 32], method: 'Alternate plus one and times two.' },
    { prompt: '2, 6, 5, 15, 14, 42, ?', answer: 41, choices: [40, 41, 43, 126], method: 'Alternate times three and minus one.' },
    { prompt: '4, 6, 12, 14, 28, 30, ?', answer: 60, choices: [32, 56, 58, 60], method: 'Alternate plus two and times two.' },
    { prompt: '90, 89, 85, 76, 60, ?', answer: 35, choices: [25, 34, 35, 44], method: 'Subtract consecutive square numbers.' },
    { prompt: '1, 3, 12, 60, 360, ?', answer: 2520, choices: [720, 1800, 2160, 2520], method: 'Multiply by three, four, five, six, then seven.' },
    { prompt: '1, 2, 5, 12, 27, ?', answer: 58, choices: [54, 56, 58, 60], method: 'Double, then add one more each time.' },
  ],
};
for (const [difficulty, templates] of Object.entries(SEQUENCE_PUZZLES)) for (const template of templates) {
  if (new Set(template.choices).size !== template.choices.length
    || template.choices.filter(choice => choice === template.answer).length !== 1) {
    throw new Error(`Invalid difficulty-${difficulty} sequence template: ${template.prompt}`);
  }
}

function pickPuzzleTemplate(pool, historyKey) {
  run.puzzleHistory ??= {};
  const recent = run.puzzleHistory[historyKey] || [];
  const available = pool.map((_, index) => index).filter(index => !recent.includes(index));
  const index = randPick(available.length ? available : pool.map((_, next) => next));
  const memory = Math.min(4, Math.max(0, pool.length - 1));
  run.puzzleHistory[historyKey] = memory ? [...recent, index].slice(-memory) : [];
  return pool[index];
}

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

function sudokuVariant(template, size) {
  const [boxRows, boxCols] = sudokuShape(size);
  const rowBands = shuffle(Array.from({ length: size / boxRows }, (_, index) => index));
  const colStacks = shuffle(Array.from({ length: size / boxCols }, (_, index) => index));
  const rows = rowBands.flatMap(band =>
    shuffle(Array.from({ length: boxRows }, (_, offset) => band * boxRows + offset)));
  const cols = colStacks.flatMap(stack =>
    shuffle(Array.from({ length: boxCols }, (_, offset) => stack * boxCols + offset)));
  const symbols = shuffle(Array.from({ length: size }, (_, index) => index + 1));
  const sourceGivens = new Set(template.givens);
  const solution = [];
  const givens = [];
  for (let row = 0; row < size; row++) for (let col = 0; col < size; col++) {
    const sourceIndex = rows[row] * size + cols[col];
    const index = row * size + col;
    solution[index] = symbols[template.solution[sourceIndex] - 1];
    if (sourceGivens.has(sourceIndex)) givens.push(index);
  }
  const initial = solution.map((value, index) => givens.includes(index) ? value : 0);
  return { solution, givens, rating: sudokuDifficulty(initial, size, boxRows, boxCols) };
}

function startSudokuPuzzle(difficulty = 0) {
  const size = [4, 6, 9][difficulty];
  const template = sudokuVariant(pickPuzzleTemplate(SUDOKU_PUZZLES[size], `sudoku-${size}`), size);
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
  const template = pickPuzzleTemplate(CROSSWORD_PUZZLES[size], `crossword-${size}`);
  run.puzzle = {
    type: 'crossword', difficulty, difficultyLabel: ['Measured', 'Demanding', 'Relentless'][difficulty], size,
    solution: template.words.join('').split(''), values: Array(size * size).fill(''), words: template.words.slice(),
    downWords: template.downWords.slice(), acrossClues: template.acrossClues.slice(), downClues: template.downClues.slice(),
    direction: 'across', cursor: null, locale: 'en-CA',
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
  const template = pickPuzzleTemplate(SEQUENCE_PUZZLES[difficulty], `sequence-${difficulty}`);
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
  run.puzzle.active = true;
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
function checkMinesPuzzleSolved() {
  const p = run.puzzle;
  if (p.board.cells.every(c => c.mine || c.revealed)) {
    p.solved = true;
    toast('★ Flawless. The stone offers its secret.');
    return true;
  }
  return false;
}
export function puzzleChordAt(i) {
  const p = run.puzzle;
  if (!p || (p.type && p.type !== 'mines') || p.failed || p.solved) {
    return { attempted: false, ok: false, reason: 'No active Minesweeper puzzle.' };
  }
  const b = p.board, cell = b.cells[i];
  if (!cell?.revealed) return { attempted: false, ok: false, reason: 'Chord a revealed number.' };
  const adjacent = neighborsOf(i, b.size);
  const number = adjacent.filter(j => b.cells[j].mine).length;
  const unopened = adjacent.filter(j => !b.cells[j].revealed && !b.cells[j].flag);
  if (number <= 0 || !unopened.length) {
    return { attempted: false, ok: false, reason: 'This tile has nothing to Chord.' };
  }
  const flags = adjacent.filter(j => b.cells[j].flag).length;
  if (flags !== number) {
    return {
      attempted: false, ok: false,
      reason: `This ${number} needs ${number} adjacent flag${number === 1 ? '' : 's'}; it has ${flags}.`,
    };
  }

  sfx('chord');
  const exposedMine = unopened.find(j => b.cells[j].mine);
  if (exposedMine != null) {
    const mine = b.cells[exposedMine];
    mine.revealed = true; mine.crater = true; mine.mine = false;
    p.failed = true;
    sfx('boom'); haptic('mine');
    toast('False Chord! A misplaced flag exposes the real mine.', true);
    notify();
    return { attempted: true, ok: false, detonated: exposedMine };
  }

  for (const j of unopened) puzzleFlood(j);
  checkMinesPuzzleSolved();
  notify();
  return { attempted: true, ok: true, revealed: unopened.length };
}
export function puzzleClick(i) {
  const p = run.puzzle;
  if (p.type && p.type !== 'mines') return;
  if (p.failed || p.solved) return;
  const cell = p.board.cells[i];
  if (cell.revealed) return puzzleChordAt(i);
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
  checkMinesPuzzleSolved();
  notify();
}
export function puzzleToggleFlag(i) {
  const p = run.puzzle;
  if (!p || (p.type && p.type !== 'mines') || p.failed || p.solved) return;
  const cell = p.board.cells[i];
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

export function setCrosswordDirection(direction) {
  const p = run?.puzzle;
  if (!p || p.type !== 'crossword' || !['across', 'down'].includes(direction)) return;
  p.direction = direction;
  notify();
}

export function selectCrosswordCell(i, toggleDirection = false) {
  const p = run?.puzzle;
  if (!p || p.type !== 'crossword' || i < 0 || i >= p.values.length) return;
  const sameCell = p.cursor === i;
  if (toggleDirection && sameCell) p.direction = p.direction === 'down' ? 'across' : 'down';
  p.cursor = i;
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

export function abandonPuzzle() {
  const p = run?.puzzle;
  if (!p || p.failed || p.solved) return;
  p.abandoned = true;
  p.failed = true;
  if (!p.type || p.type === 'mines') {
    p.scanMode = false;
    for (const cell of p.board.cells) {
      if (!cell.void) cell.revealed = true;
    }
  } else if (p.type === 'sudoku' || p.type === 'crossword') {
    p.values = p.solution.slice();
    if (p.type === 'sudoku') p.notes = p.notes.map(() => []);
  } else if (p.type === 'sequence') {
    p.revealedAnswer = p.answer;
  } else if (p.type === 'lights') {
    p.solutionPath = minimumLightsSolutionPath(p.values, p.size) || [];
    p.values = Array(p.size * p.size).fill(0);
  } else if (p.type === 'nonogram') {
    p.values = p.solution.map(value => value === 1 ? 1 : 2);
  }
  toast('Solution revealed. No puzzle reward earned.', true);
  notify();
}

/* ================= hidden QA lab ================= */
export const TEST_CUTSCENES = [
  ['opening', 'Opening'], ['shop', 'Merchant shop'], ['camp', 'Camp'],
  ['boss-intro-0', 'Boss 1 intro'], ['boss-aftermath-0', 'Boss 1 aftermath'],
  ['descent-1', 'Descent to stratum 2'], ['boss-intro-1', 'Boss 2 intro'], ['boss-aftermath-1', 'Boss 2 aftermath'],
  ['descent-2', 'Descent to stratum 3'], ['boss-intro-2', 'Final boss intro'], ['boss-aftermath-2', 'Final boss aftermath'],
  ['descent-3', 'Descent to the Vein'], ['vein-deeper', 'The Vein reforms'], ['finale', 'Finale'],
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
    const forceVeinBoon = value === 'veinboon';
    const rewardKind = forceVeinBoon ? 'boss' : value || 'dig';
    if (forceVeinBoon) run.stratum = 3;
    const bossKey = rewardKind === 'boss' ? randPick(FIGHTS[run.stratum].boss)?.[0] || null : null;
    const bossTrinkets = rewardKind === 'boss' ? (forceVeinBoon ? [] : bossRelicOffer(bossKey)) : null;
    run.combat = null;
    run.reward = {
      gold: rewardKind === 'boss' ? 150 : rewardKind === 'elite' ? 90 : 50,
      kind: rewardKind, fullClear: true, cards: rollCardReward(true), cardTaken: false,
      gadget: randPick(Object.keys(GADGETS)), trinket: rewardKind === 'elite' ? unownedTrinket() : null,
      bossKey, bossTrinkets,
      veinBoons: rewardKind === 'boss' && run.stratum === 3 && (forceVeinBoon || bossTrinkets.length === 0)
        ? shuffle(Object.keys(VEIN_BOONS)).slice(0, 3) : null,
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
  return run.floors * 10 + run.stratum * 50 + (run.veinDepth || 0) * 15
    + run.fullClears * 25 + Math.floor(run.gold / 2) + run.hp;
}

function recordDailyRunEnd(won) {
  if (!run?.daily || run.dailyRecorded) return;
  run.dailyRecorded = true;
  recordDailyResult(run.daily, { won, score: score(), cls: run.cls });
}

bindRuntime({
  cbt, board, shuffle, randPick, randInt,
  revealTile, hitEnemy, hitRandom, hitAll, curTarget, atk,
  gainBlock, gainPlating, gainEnergy, gainInsight, spendInsight, gainPicks, gainMaxPicks,
  loseMaxPicks, spendPicks, drawCards, loseHP, healHP, canHeal, applyEnemyEffect,
  detonateForCards, defuseTile, scanTile, entombTile, swapCells, addConstruct,
  chordAt, verifyFlag, flaggedIdx, hiddenIdx, isHiddenUsable, area3x3,
  highestRevealedNumber, neighborsOf, numAt, toast, log, fleeCombat,
  outerRingIndices,
  enemyAttack, boardAttack, layMines, fogTiles, scrambleMines,
  bossResonanceIntent, resolveBossResonance,
  setLie, clearLie, primeTile, resolvePrimed, clearPrimed, devourRing,
  annexTiles, addMineAt, healthState, recallArchived, riseGraves, gainLight,
  consumeUntreatedBlood, addTemporaryCard,
});
