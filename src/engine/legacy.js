const GRAVEYARD_KEY = 'cryptsweeper.graveyard.v1';
const ACHIEVEMENT_KEY = 'cryptsweeper.achievements.v1';

export const CHALLENGES = {
  afflicted: { name: 'The Afflicted Host', mark: '※', desc: 'Every non-boss enemy carries a modifier.' },
  brittle: { name: 'Brittle Bones', mark: '◇', desc: 'All healing is reduced by half.' },
  cursed: { name: 'Debt Below', mark: '◈', desc: 'Begin with two persistent curses and 100 extra gold.' },
  noflags: { name: 'Unmarked Stone', mark: '⚑', desc: 'Flags are forbidden, but each combat grants one extra Pick.' },
  lean: { name: 'The Lean Descent', mark: 'Ⅷ', desc: 'Begin with an eight-card deck and only 20 gold.' },
};

export const ACHIEVEMENTS = {
  first_steps: { name: 'First Footfall', desc: 'Reveal 100 safe tiles in one descent.', test: r => (r.safeReveals || 0) >= 100 },
  clear_mind: { name: 'No Stone Unread', desc: 'Complete a Full Clear.', test: r => (r.fullClears || 0) >= 1 },
  boss_slayer: { name: 'Warden Breaker', desc: 'Defeat a boss.', test: r => (r.bossesDefeated || []).length >= 1 },
  deep_delver: { name: 'Under the Fog', desc: 'Reach Stratum 3.', test: r => (r.stratum || 0) >= 2 },
  rich_bones: { name: 'Gilded Bones', desc: 'Carry at least 250 gold.', test: r => (r.gold || 0) >= 250 },
  crowded_deck: { name: 'A Heavy Pack', desc: 'Carry at least 20 cards.', test: r => (r.deck || []).length >= 20 },
  survivor: { name: 'One Heart Remaining', desc: 'Survive combat at exactly 1 HP.', test: (r, screen) => screen === 'reward' && r.hp === 1 },
  conqueror: { name: 'The Seam Is Silent', desc: 'Win a complete descent.', test: (r, screen) => screen === 'victory' },
  challenger: { name: 'Terms Accepted', desc: 'Complete a challenge descent.', test: (r, screen) => screen === 'victory' && Boolean(r.challenge) },
};

function read(key, fallback) {
  try { return { ...fallback, ...JSON.parse(localStorage.getItem(key) || '{}') }; }
  catch { return { ...fallback }; }
}

export function loadAchievements() { return read(ACHIEVEMENT_KEY, {}); }

export function evaluateAchievements(run, screen) {
  if (!run || typeof localStorage === 'undefined') return [];
  const earned = loadAchievements();
  const fresh = [];
  for (const [key, def] of Object.entries(ACHIEVEMENTS)) if (!earned[key] && def.test(run, screen)) {
    earned[key] = { earnedAt: Date.now(), runId: run.runId || null };
    fresh.push({ key, ...def });
  }
  if (fresh.length) try { localStorage.setItem(ACHIEVEMENT_KEY, JSON.stringify(earned)); } catch { /* storage unavailable */ }
  return fresh;
}

export function loadGraveyard() {
  try {
    const rows = JSON.parse(localStorage.getItem(GRAVEYARD_KEY) || '[]');
    return Array.isArray(rows) ? rows : [];
  } catch { return []; }
}

export function recordRunHistory(run, won) {
  if (!run || run.historyRecorded || typeof localStorage === 'undefined') return null;
  run.historyRecorded = true;
  const entry = {
    id: run.runId || `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    endedAt: Date.now(), won: Boolean(won), cls: run.cls, challenge: run.challenge || null,
    stratum: run.stratum || 0, floors: run.floors || 0, hp: Math.max(0, run.hp || 0), maxHp: run.maxHp || 0,
    gold: run.gold || 0, fullClears: run.fullClears || 0, safeReveals: run.safeReveals || 0,
    cause: won ? 'Survived the Undermine' : (run.lastDamageSource || 'Lost beneath unnamed stone'),
    bosses: [...(run.bossesDefeated || [])],
    deck: (run.deck || []).map(card => ({ key: card.key, up: card.up || 0 })),
    trinkets: [...(run.trinkets || [])], gadgets: [...(run.gadgets || [])],
  };
  try {
    const rows = loadGraveyard();
    localStorage.setItem(GRAVEYARD_KEY, JSON.stringify([entry, ...rows].slice(0, 50)));
  } catch { /* storage unavailable */ }
  return entry;
}

export function clearGraveyard() {
  try { localStorage.removeItem(GRAVEYARD_KEY); } catch { /* storage unavailable */ }
}
