import { loadProgression } from './progression.js';
import { loadCollection } from './collection.js';

const GRAVEYARD_KEY = 'cryptsweeper.graveyard.v1';
const ACHIEVEMENT_KEY = 'cryptsweeper.achievements.v1';

/* Stable content keys used by achievement tests. Hardcoded (rather than
   imported from data.js) to keep this module free of the engine import cycle. */
const DELVERS = ['sapper', 'surveyor', 'terraformer', 'lamplighter', 'gambler', 'chirurgeon', 'archivist', 'warden', 'hexwright', 'revenant'];
const BOSSES = ['collapser', 'fogfather', 'nn99'];
const ELITES = ['ossuary', 'miscounter', 'detonata'];
const CURSES = ['claustrophobia', 'vertigo', 'exhaustion', 'nightterrors', 'paranoia'];
const BOSS_TRINKETS = ['lamp', 'dowsingrod'];

/* Aggregate helpers over the collection/progression records (see collection.js). */
const sumField = (obj, field) => Object.values(obj || {}).reduce((n, entry) => n + (Number(entry?.[field]) || 0), 0);
const countField = (obj, field) => Object.values(obj || {}).filter(entry => (Number(entry?.[field]) || 0) > 0).length;
const maxField = (obj, field) => Object.values(obj || {}).reduce((n, entry) => Math.max(n, Number(entry?.[field]) || 0), 0);
const curseCount = run => (run.deck || []).filter(card => CURSES.includes(card.key)).length;
const bossesDown = run => run.bossesDefeated || [];

export const CHALLENGES = {
  afflicted: { name: 'The Afflicted Host', mark: '※', desc: 'Every non-boss enemy carries a modifier.' },
  brittle: { name: 'Brittle Bones', mark: '◇', desc: 'All healing is reduced by half.' },
  cursed: { name: 'Debt Below', mark: '◈', desc: 'Begin with two persistent curses and 100 extra gold.' },
  noflags: { name: 'Unmarked Stone', mark: '⚑', desc: 'Flags are forbidden, but each combat grants one extra Pick.' },
  lean: { name: 'The Lean Descent', mark: 'Ⅷ', desc: 'Begin with an eight-card deck and only 20 gold.' },
  veinbound: { name: 'Veinbound', mark: '∞', desc: 'Begin at Vein Depth 1 with 150 gold, +2 Picks, an Overclocked Lamp, and three upgraded cards. Reach Depth 36.' },
  wardenroad: { name: 'Warden Current', mark: '♛', desc: 'Begin in the Vein with two extra roaming boss rooms in every segment. Start each battle with 6 Plating and +1 Energy. Reach Depth 24.' },
};

export const ACHIEVEMENTS = {
  /* ---- original milestones (keys preserved so earned progress survives) ---- */
  first_steps: { name: 'First Footfall', desc: 'Reveal 100 safe tiles in one descent.', test: r => (r.safeReveals || 0) >= 100 },
  clear_mind: { name: 'No Stone Unread', desc: 'Complete a Full Clear.', test: r => (r.fullClears || 0) >= 1 },
  boss_slayer: { name: 'Warden Breaker', desc: 'Defeat a boss.', test: r => bossesDown(r).length >= 1 },
  deep_delver: { name: 'Under the Fog', desc: 'Reach Stratum 3.', test: r => (r.stratum || 0) >= 2 },
  vein_touched: { name: 'The Fourth Stratum', desc: 'Enter the endless Vein.', test: r => (r.stratum || 0) >= 3 },
  vein_twelve: { name: 'First Vein', desc: 'Reach Vein Depth 12.', test: r => (r.veinDepth || 0) >= 12 },
  vein_thirty_six: { name: 'Pressure Without End', desc: 'Reach Vein Depth 36.', test: r => (r.veinDepth || 0) >= 36 },
  vein_seventy_two: { name: 'Where Maps Stop', desc: 'Reach Vein Depth 72.', test: r => (r.veinDepth || 0) >= 72 },
  vein_warden: { name: 'A Crown in the Current', desc: 'Defeat a roaming boss in the Vein.', test: r => (r.veinBossesDefeated || 0) >= 1 },
  veinbound_complete: { name: 'Bound, Not Buried', desc: 'Reach Depth 36 in the Veinbound challenge.', test: r => r.challenge === 'veinbound' && (r.veinDepth || 0) >= 36 },
  wardenroad_complete: { name: 'Walk the Warden Current', desc: 'Reach Depth 24 in the Warden Current challenge.', test: r => r.challenge === 'wardenroad' && (r.veinDepth || 0) >= 24 },
  rich_bones: { name: 'Gilded Bones', desc: 'Carry at least 250 gold.', test: r => (r.gold || 0) >= 250 },
  crowded_deck: { name: 'A Heavy Pack', desc: 'Carry at least 20 cards.', test: r => (r.deck || []).length >= 20 },
  survivor: { name: 'One Heart Remaining', desc: 'Survive combat at exactly 1 HP.', test: (r, s) => s === 'reward' && r.hp === 1 },
  conqueror: { name: 'The Seam Is Silent', desc: 'Win a complete descent.', test: (r, s) => s === 'victory' },
  challenger: { name: 'Terms Accepted', desc: 'Complete a challenge descent.', test: (r, s) => s === 'victory' && Boolean(r.challenge) },

  /* ---- depth & exploration (single descent) ---- */
  shallow_steps: { name: 'Breaking Ground', desc: 'Reveal 50 safe tiles in one descent.', test: r => (r.safeReveals || 0) >= 50 },
  deep_reader: { name: 'Well-Read Stone', desc: 'Reveal 200 safe tiles in one descent.', test: r => (r.safeReveals || 0) >= 200 },
  stone_scholar: { name: 'The Crypt Laid Bare', desc: 'Reveal 300 safe tiles in one descent.', test: r => (r.safeReveals || 0) >= 300 },
  fog_galleries: { name: 'Into the Fog', desc: 'Reach Stratum 2, the Fog Galleries.', test: r => (r.stratum || 0) >= 1 },
  ten_rooms: { name: 'Ten Doors Down', desc: 'Pass through 10 rooms in one descent.', test: r => (r.floors || 0) >= 10 },
  twenty_rooms: { name: 'Deeper Still', desc: 'Pass through 20 rooms in one descent.', test: r => (r.floors || 0) >= 20 },
  thirty_rooms: { name: 'No Turning Back', desc: 'Pass through 30 rooms in one descent.', test: r => (r.floors || 0) >= 30 },
  twin_clear: { name: 'Twice Swept', desc: 'Full Clear 3 boards in one descent.', test: r => (r.fullClears || 0) >= 3 },
  flawless_sweeper: { name: 'Nothing Left Buried', desc: 'Full Clear 5 boards in one descent.', test: r => (r.fullClears || 0) >= 5 },

  /* ---- wealth & deck (single descent) ---- */
  pocket_change: { name: 'Loose Coin', desc: 'Carry at least 100 gold.', test: r => (r.gold || 0) >= 100 },
  dragon_hoard: { name: 'Coinwhiskers Would Weep', desc: 'Carry at least 500 gold.', test: r => (r.gold || 0) >= 500 },
  spendthrift: { name: 'Down to the Bone', desc: 'Drop to 0 gold after the third room.', test: r => (r.gold || 0) === 0 && (r.floors || 0) >= 3 },
  heavy_pack: { name: 'Fifteen Deep', desc: 'Carry at least 15 cards.', test: r => (r.deck || []).length >= 15 },
  hoarder: { name: 'The Overladen', desc: 'Carry at least 30 cards.', test: r => (r.deck || []).length >= 30 },
  apprentice_smith: { name: 'Sharpened Tools', desc: 'Upgrade 3 cards in one descent.', test: r => (r.upgrades || 0) >= 3 },
  master_smith: { name: 'Forge-Tempered', desc: 'Upgrade 10 cards in one descent.', test: r => (r.upgrades || 0) >= 10 },
  well_equipped: { name: 'Fully Kitted', desc: 'Carry 3 gadgets at once.', test: r => (r.gadgets || []).length >= 3 },
  relic_hunter: { name: 'Trinket Trove', desc: 'Carry 4 trinkets at once.', test: r => (r.trinkets || []).length >= 4 },
  curse_bearer: { name: 'A Weight of Debt', desc: 'Hold a persistent curse in your deck.', test: r => curseCount(r) >= 1 },
  thrice_cursed: { name: 'Debt Below', desc: 'Hold 3 persistent curses in your deck at once.', test: r => curseCount(r) >= 3 },

  /* ---- combat mastery (single combat) ---- */
  iron_hide: { name: 'Iron Hide', desc: 'Reach 10 Plating in one combat.', test: r => (r.combat?.plating || 0) >= 10 },
  bastion: { name: 'The Bastion', desc: 'Reach 20 Plating in one combat.', test: r => (r.combat?.plating || 0) >= 20 },
  living_fortress: { name: 'Living Fortress', desc: 'Reach 30 Plating in one combat.', test: r => (r.combat?.plating || 0) >= 30 },
  shieldwall: { name: 'Shieldwall', desc: 'Reach 15 Block in one combat.', test: r => (r.combat?.block || 0) >= 15 },
  impregnable: { name: 'Immovable', desc: 'Reach 25 Block in one combat.', test: r => (r.combat?.block || 0) >= 25 },
  kindled_insight: { name: 'Kindled Insight', desc: 'Reach 5 Insight in one combat.', test: r => (r.combat?.insight || 0) >= 5 },
  oracle: { name: 'The Oracle Reads', desc: 'Reach 8 Insight in one combat.', test: r => (r.combat?.insight || 0) >= 8 },
  demolitionist: { name: 'Demolitionist', desc: 'Detonate 3 mines in one combat.', test: r => (r.combat?.minesDetonated || 0) >= 3 },
  blast_master: { name: 'Blast Master', desc: 'Detonate 5 mines in one combat.', test: r => (r.combat?.minesDetonated || 0) >= 5 },
  cataclysm: { name: 'Bring the Roof Down', desc: 'Detonate 10 mines in one combat.', test: r => (r.combat?.minesDetonated || 0) >= 10 },
  keen_survey: { name: 'Keen Survey', desc: 'Scan 4 tiles in one combat.', test: r => (r.combat?.classState?.scanCount || 0) >= 4 },
  grand_survey: { name: 'The Full Picture', desc: 'Scan 8 tiles in one combat.', test: r => (r.combat?.classState?.scanCount || 0) >= 8 },
  overclocked: { name: 'Overclocked', desc: 'Reach 4 maximum Energy in a combat.', test: r => (r.combat?.maxEnergy || 0) >= 4 },
  war_of_attrition: { name: 'War of Attrition', desc: 'Survive to turn 8 in one combat.', test: r => (r.combat?.turn || 0) >= 8 },
  endless_battle: { name: 'The Long Vigil', desc: 'Survive to turn 12 in one combat.', test: r => (r.combat?.turn || 0) >= 12 },

  /* ---- victory with each Delver ---- */
  win_sapper: { name: 'Sapper Ascendant', desc: 'Win a descent as the Sapper.', test: (r, s) => s === 'victory' && r.cls === 'sapper' },
  win_surveyor: { name: 'Surveyor Ascendant', desc: 'Win a descent as the Surveyor.', test: (r, s) => s === 'victory' && r.cls === 'surveyor' },
  win_terraformer: { name: 'Terraformer Ascendant', desc: 'Win a descent as the Terraformer.', test: (r, s) => s === 'victory' && r.cls === 'terraformer' },
  win_lamplighter: { name: 'Lamplighter Ascendant', desc: 'Win a descent as the Lamplighter.', test: (r, s) => s === 'victory' && r.cls === 'lamplighter' },
  win_gambler: { name: 'Gambler Ascendant', desc: 'Win a descent as the Gambler.', test: (r, s) => s === 'victory' && r.cls === 'gambler' },
  win_chirurgeon: { name: 'Chirurgeon Ascendant', desc: 'Win a descent as the Chirurgeon.', test: (r, s) => s === 'victory' && r.cls === 'chirurgeon' },
  win_archivist: { name: 'Archivist Ascendant', desc: 'Win a descent as the Archivist.', test: (r, s) => s === 'victory' && r.cls === 'archivist' },
  win_warden: { name: 'Warden Ascendant', desc: 'Win a descent as the Warden.', test: (r, s) => s === 'victory' && r.cls === 'warden' },
  win_hexwright: { name: 'Hexwright Ascendant', desc: 'Win a descent as the Hexwright.', test: (r, s) => s === 'victory' && r.cls === 'hexwright' },
  win_revenant: { name: 'Revenant Ascendant', desc: 'Win a descent as the Revenant.', test: (r, s) => s === 'victory' && r.cls === 'revenant' },

  /* ---- victory under each challenge ---- */
  win_afflicted: { name: 'Host Unbroken', desc: 'Win The Afflicted Host challenge.', test: (r, s) => s === 'victory' && r.challenge === 'afflicted' },
  win_brittle: { name: 'Brittle No More', desc: 'Win the Brittle Bones challenge.', test: (r, s) => s === 'victory' && r.challenge === 'brittle' },
  win_cursed: { name: 'Debt Repaid', desc: 'Win the Debt Below challenge.', test: (r, s) => s === 'victory' && r.challenge === 'cursed' },
  win_noflags: { name: 'Unmarked Victor', desc: 'Win the Unmarked Stone challenge.', test: (r, s) => s === 'victory' && r.challenge === 'noflags' },
  win_lean: { name: 'Lean and Lethal', desc: 'Win the Lean Descent challenge.', test: (r, s) => s === 'victory' && r.challenge === 'lean' },

  /* ---- victory variants ---- */
  flawless_victor: { name: 'Untouched', desc: 'Win a descent at full Health.', test: (r, s) => s === 'victory' && r.hp === r.maxHp },
  last_breath: { name: 'By a Thread', desc: 'Win a descent at exactly 1 Health.', test: (r, s) => s === 'victory' && r.hp === 1 },
  daily_champion: { name: 'Rhythm of the Deep', desc: 'Win a daily descent.', test: (r, s) => s === 'victory' && Boolean(r.daily) },
  minimalist: { name: 'The Minimalist', desc: 'Win with a deck of 10 or fewer cards.', test: (r, s) => s === 'victory' && (r.deck || []).length <= 10 },
  grand_archive: { name: 'The Grand Archive', desc: 'Win with a deck of 25 or more cards.', test: (r, s) => s === 'victory' && (r.deck || []).length >= 25 },
  tycoon: { name: 'Buried in Gold', desc: 'Win carrying 300 or more gold.', test: (r, s) => s === 'victory' && (r.gold || 0) >= 300 },
  cursed_triumph: { name: 'Cursed Triumph', desc: 'Win with a curse still in your deck.', test: (r, s) => s === 'victory' && curseCount(r) >= 1 },
  relic_victor: { name: 'Bearer of Relics', desc: 'Win while carrying a boss trinket.', test: (r, s) => s === 'victory' && (r.trinkets || []).some(t => BOSS_TRINKETS.includes(t)) },

  /* ---- bosses & elites ---- */
  collapser_down: { name: 'The Pit Closes', desc: 'Defeat The Collapser.', test: r => bossesDown(r).includes('collapser') },
  fogfather_down: { name: 'The Fog Lifts', desc: 'Defeat The Fogfather.', test: r => bossesDown(r).includes('fogfather') },
  nn99_down: { name: 'Signal Lost', desc: 'Defeat NN-99.', test: r => bossesDown(r).includes('nn99') },
  boss_trifecta: { name: 'Three Crowns', desc: 'Defeat all three bosses in one descent.', test: r => BOSSES.every(k => bossesDown(r).includes(k)) },
  ossuary_slayer: { name: 'Bones to Dust', desc: 'Defeat the Ossuary Warden.', test: (r, s, c) => (c.col.enemies.ossuary?.defeated || 0) >= 1 },
  miscounter_slain: { name: 'The Numbers Corrected', desc: 'Defeat The Miscounter.', test: (r, s, c) => (c.col.enemies.miscounter?.defeated || 0) >= 1 },
  detonata_defused: { name: 'Bomb Squad', desc: 'Defeat Detonata.', test: (r, s, c) => (c.col.enemies.detonata?.defeated || 0) >= 1 },
  elite_hunter: { name: 'Elite Hunter', desc: 'Defeat all three elite enemies.', test: (r, s, c) => ELITES.every(k => (c.col.enemies[k]?.defeated || 0) >= 1) },

  /* ---- bestiary & card mastery (lifetime) ---- */
  blooded: { name: 'Blooded', desc: 'Defeat 25 enemies across all descents.', test: (r, s, c) => sumField(c.col.enemies, 'defeated') >= 25 },
  exterminator: { name: 'Exterminator', desc: 'Defeat 100 enemies across all descents.', test: (r, s, c) => sumField(c.col.enemies, 'defeated') >= 100 },
  crypt_cleanser: { name: 'Crypt Cleanser', desc: 'Defeat 250 enemies across all descents.', test: (r, s, c) => sumField(c.col.enemies, 'defeated') >= 250 },
  naturalist: { name: 'Naturalist', desc: 'Encounter 8 kinds of enemy.', test: (r, s, c) => countField(c.col.enemies, 'encountered') >= 8 },
  bestiary_master: { name: 'The Complete Bestiary', desc: 'Encounter all 14 kinds of enemy.', test: (r, s, c) => countField(c.col.enemies, 'encountered') >= 14 },
  card_dabbler: { name: 'Trick Repertoire', desc: 'Play 10 different cards across all descents.', test: (r, s, c) => countField(c.col.cards, 'played') >= 10 },
  card_virtuoso: { name: 'Virtuoso', desc: 'Play 40 different cards across all descents.', test: (r, s, c) => countField(c.col.cards, 'played') >= 40 },
  spellslinger: { name: 'Five Hundred Casts', desc: 'Play 500 cards across all descents.', test: (r, s, c) => sumField(c.col.cards, 'played') >= 500 },

  /* ---- lifetime milestones ---- */
  seasoned: { name: 'Seasoned Delver', desc: 'Win 3 descents across all runs.', test: (r, s, c) => sumField(c.col.delvers, 'wins') >= 3 },
  veteran: { name: 'Veteran of the Deep', desc: 'Win 5 descents across all runs.', test: (r, s, c) => sumField(c.col.delvers, 'wins') >= 5 },
  legend: { name: 'Legend of the Undermine', desc: 'Win 10 descents across all runs.', test: (r, s, c) => sumField(c.col.delvers, 'wins') >= 10 },
  all_delvers_win: { name: 'Ten True Names', desc: 'Win with all ten Delvers.', test: (r, s, c) => DELVERS.every(k => (c.col.delvers[k]?.wins || 0) >= 1) },
  all_delvers_played: { name: 'The Whole Guild', desc: 'Attempt a descent with all ten Delvers.', test: (r, s, c) => DELVERS.every(k => (c.col.delvers[k]?.attempts || 0) >= 1) },
  reveals_500: { name: 'Tunnel by Tunnel', desc: 'Reveal 500 safe tiles across all descents.', test: (r, s, c) => (c.prog.safeReveals || 0) >= 500 },
  reveals_1000: { name: 'The Whole Crypt', desc: 'Reveal 1000 safe tiles across all descents.', test: (r, s, c) => (c.prog.safeReveals || 0) >= 1000 },
  clears_10: { name: 'Ten Times Clean', desc: 'Full Clear 10 boards across all descents.', test: (r, s, c) => (c.prog.fullClears || 0) >= 10 },
  clears_25: { name: 'Immaculate', desc: 'Full Clear 25 boards across all descents.', test: (r, s, c) => (c.prog.fullClears || 0) >= 25 },
  upgrades_25: { name: 'Ever Sharper', desc: 'Upgrade 25 cards across all descents.', test: (r, s, c) => (c.prog.cardsUpgraded || 0) >= 25 },
  upgrades_50: { name: 'Master Armorer', desc: 'Upgrade 50 cards across all descents.', test: (r, s, c) => (c.prog.cardsUpgraded || 0) >= 50 },
  persistent: { name: 'The Persistent', desc: 'Fall in battle 5 times, and return.', test: (r, s, c) => (c.prog.losses || 0) >= 5 },

  /* ---- systems & score ---- */
  camper: { name: 'By the Fire', desc: 'Rest at 5 camps across all descents.', test: (r, s, c) => (c.prog.campVisits || 0) >= 5 },
  regular_customer: { name: 'Coinwhiskers Regular', desc: 'Visit 5 shops across all descents.', test: (r, s, c) => (c.prog.shopVisits || 0) >= 5 },
  boss_veteran: { name: 'Guardian Slayer', desc: 'Fight 5 bosses across all descents.', test: (r, s, c) => (c.prog.bossFights || 0) >= 5 },
  high_scorer: { name: 'High Scorer', desc: 'Finish a descent worth 500 or more points.', test: (r, s, c) => maxField(c.col.delvers, 'bestScore') >= 500 },
  grandmaster: { name: 'Grandmaster of the Seam', desc: 'Finish a descent worth 1000 or more points.', test: (r, s, c) => maxField(c.col.delvers, 'bestScore') >= 1000 },
};

function read(key, fallback) {
  try { return { ...fallback, ...JSON.parse(localStorage.getItem(key) || '{}') }; }
  catch { return { ...fallback }; }
}

export function loadAchievements() { return read(ACHIEVEMENT_KEY, {}); }

export function evaluateAchievements(run, screen) {
  if (!run || typeof localStorage === 'undefined') return [];
  const earned = loadAchievements();
  const ctx = { prog: loadProgression(), col: loadCollection() };
  const fresh = [];
  for (const [key, def] of Object.entries(ACHIEVEMENTS)) if (!earned[key] && def.test(run, screen, ctx)) {
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
    veinDepth: run.veinDepth || 0, veinSegments: run.veinSegments || 0, coreWon: Boolean(run.coreWon),
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
