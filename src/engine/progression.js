const KEY = 'cryptsweeper.progression.v1';

export const UNLOCKS = {
  sapper: { label: 'Available from the start', test: () => true },
  surveyor: { label: 'Available from the start', test: () => true },
  terraformer: { label: 'Available from the start', test: () => true },
  lamplighter: { label: 'Reach Stratum 2', test: p => p.deepestStratum >= 1 },
  gambler: { label: 'Hold 200 gold in one run', test: p => p.maxGold >= 200 },
  chirurgeon: { label: 'Upgrade 5 cards across your runs', test: p => p.cardsUpgraded >= 5 },
  archivist: { label: 'Reveal 250 safe tiles across your runs', test: p => p.safeReveals >= 250 },
  warden: { label: 'Reach 20 Plating in one combat', test: p => p.maxPlating >= 20 },
  hexwright: { label: 'Full Clear 3 boards across your runs', test: p => p.fullClears >= 3 },
  revenant: { label: 'Win a run', test: p => p.wins >= 1 },
};

const defaults = () => ({
  deepestStratum: 0, maxGold: 0, cardsUpgraded: 0, safeReveals: 0,
  maxPlating: 0, fullClears: 0, wins: 0,
});

export function loadProgression() {
  try { return { ...defaults(), ...JSON.parse(localStorage.getItem(KEY) || '{}') }; }
  catch { return defaults(); }
}

export function saveProgression(progress) {
  try { localStorage.setItem(KEY, JSON.stringify(progress)); } catch { /* storage unavailable */ }
}

export function recordProgress(run, screen) {
  if (!run) return loadProgression();
  const p = loadProgression();
  run.progressRecorded ??= { cardsUpgraded: 0, safeReveals: 0, fullClears: 0 };
  p.deepestStratum = Math.max(p.deepestStratum, run.stratum || 0);
  p.maxGold = Math.max(p.maxGold, run.gold || 0);
  p.cardsUpgraded += Math.max(0, (run.upgrades || 0) - run.progressRecorded.cardsUpgraded);
  p.safeReveals += Math.max(0, (run.safeReveals || 0) - run.progressRecorded.safeReveals);
  p.fullClears += Math.max(0, (run.fullClears || 0) - run.progressRecorded.fullClears);
  run.progressRecorded.cardsUpgraded = run.upgrades || 0;
  run.progressRecorded.safeReveals = run.safeReveals || 0;
  run.progressRecorded.fullClears = run.fullClears || 0;
  p.maxPlating = Math.max(p.maxPlating, run.combat?.plating || 0);
  if (screen === 'victory' && !run.winRecorded) { p.wins++; run.winRecorded = true; }
  saveProgression(p);
  return p;
}

export function isDelverUnlocked(key, progress = loadProgression()) {
  return Boolean(UNLOCKS[key]?.test(progress));
}

export function unlockedDelvers(progress = loadProgression()) {
  return Object.keys(UNLOCKS).filter(key => isDelverUnlocked(key, progress));
}

export function resetProgressionForTests() {
  try { localStorage.removeItem(KEY); } catch { /* storage unavailable */ }
}
