const KEY = 'cryptsweeper.collection.v1';

const empty = () => ({ delvers: {}, enemies: {}, cards: {}, items: {} });

export function loadCollection() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
    return {
      ...empty(), ...saved, delvers: saved.delvers || {}, enemies: saved.enemies || {},
      cards: saved.cards || {}, items: saved.items || {},
    };
  } catch {
    return empty();
  }
}

function update(group, key, field, amount = 1) {
  if (!key) return;
  const collection = loadCollection();
  const entry = collection[group][key] || {};
  entry[field] = (entry[field] || 0) + amount;
  entry.discovered = true;
  collection[group][key] = entry;
  try { localStorage.setItem(KEY, JSON.stringify(collection)); } catch { /* storage unavailable */ }
}

export const recordEnemySeen = key => update('enemies', key, 'encountered');
export const recordEnemyDefeated = key => update('enemies', key, 'defeated');
export const recordCardSeen = key => update('cards', key, 'seen');
export const recordCardOwned = key => update('cards', key, 'obtained');
export const recordCardPlayed = key => update('cards', key, 'played');
export const recordItemSeen = key => update('items', key, 'seen');
export const recordItemOwned = key => update('items', key, 'obtained');

/* Incremental per-run accounting. The counters stored on the run travel with
   saves, preventing reloads or named-save copies from counting the same work
   twice. Abandoned runs remain attempts but are not recorded as losses. */
export function recordDelverProgress(run, screen) {
  if (!run?.cls || run.testMode) return;
  const collection = loadCollection();
  const stat = collection.delvers[run.cls] || {};
  const recorded = run.delverStatsRecorded ||= {
    started: false, finished: false, floors: 0, fullClears: 0, safeReveals: 0, upgrades: 0,
  };
  let changed = false;
  if (!recorded.started) {
    stat.attempts = (stat.attempts || 0) + 1;
    stat.discovered = true;
    recorded.started = true;
    changed = true;
  }
  for (const [runField, statField] of [
    ['floors', 'floors'], ['fullClears', 'fullClears'], ['safeReveals', 'safeReveals'], ['upgrades', 'upgrades'],
  ]) {
    const current = Math.max(0, Number(run[runField]) || 0);
    const delta = Math.max(0, current - (recorded[runField] || 0));
    if (delta) { stat[statField] = (stat[statField] || 0) + delta; changed = true; }
    recorded[runField] = current;
  }
  const deepest = Math.max(1, (Number(run.stratum) || 0) + 1);
  const mostGold = Math.max(0, Number(run.gold) || 0);
  if (deepest > (stat.deepestStratum || 0)) { stat.deepestStratum = deepest; changed = true; }
  if (mostGold > (stat.mostGold || 0)) { stat.mostGold = mostGold; changed = true; }

  const terminal = screen === 'victory' || screen === 'gameover';
  if (terminal && !recorded.finished) {
    const won = screen === 'victory';
    stat.completed = (stat.completed || 0) + 1;
    stat[won ? 'wins' : 'losses'] = (stat[won ? 'wins' : 'losses'] || 0) + 1;
    const finalScore = (run.floors || 0) * 10 + (run.stratum || 0) * 50
      + (run.fullClears || 0) * 25 + Math.floor((run.gold || 0) / 2) + (run.hp || 0);
    stat.bestScore = Math.max(stat.bestScore || 0, finalScore);
    recorded.finished = true;
    changed = true;
  }
  if (!changed) return;
  collection.delvers[run.cls] = stat;
  try { localStorage.setItem(KEY, JSON.stringify(collection)); } catch { /* storage unavailable */ }
}

export function seedRunCollection(run) {
  const collection = loadCollection();
  for (const card of run?.deck || []) collection.cards[card.key] ||= { discovered: true, obtained: 1 };
  for (const key of run?.trinkets || []) collection.items[`trinket:${key}`] ||= { discovered: true, obtained: 1 };
  for (const key of run?.gadgets || []) collection.items[`gadget:${key}`] ||= { discovered: true, obtained: 1 };
  try { localStorage.setItem(KEY, JSON.stringify(collection)); } catch { /* storage unavailable */ }
}

export function resetCollectionForTests() {
  try { localStorage.removeItem(KEY); } catch { /* storage unavailable */ }
}
