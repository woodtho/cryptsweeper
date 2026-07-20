const KEY = 'cryptsweeper.collection.v1';

const empty = () => ({ enemies: {}, cards: {}, items: {} });

export function loadCollection() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
    return { ...empty(), ...saved, enemies: saved.enemies || {}, cards: saved.cards || {}, items: saved.items || {} };
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

export function seedRunCollection(run) {
  const collection = loadCollection();
  for (const card of run?.deck || []) collection.cards[card.key] ||= { discovered: true, obtained: 1 };
  for (const key of run?.trinkets || []) collection.items[`trinket:${key}`] ||= { discovered: true, obtained: 1 };
  for (const key of run?.gadgets || []) collection.items[`gadget:${key}`] ||= { discovered: true, obtained: 1 };
  try { localStorage.setItem(KEY, JSON.stringify(collection)); } catch { /* storage unavailable */ }
}
