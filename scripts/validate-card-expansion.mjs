import { CARDS } from '../src/engine/data.js';
import {
  newRun, startCombat, cbt, board, hiddenIdx, isHiddenUsable, numAt, revealTile,
} from '../src/engine/engine.js';

const expansion = Object.entries(CARDS).filter(([key]) => key.startsWith('x500_'));
const allowed = {
  types: new Set(['Attack', 'Skill', 'Status', 'Curse']),
  rarities: new Set(['common', 'uncommon', 'rare', 'special']),
  tiers: new Set(['common', 'uncommon', 'rare', 'exceptional', 'burden']),
  targets: new Set(['hidden', 'open', 'number', 'row', 'anytile']),
};
const designFields = ['mechanicsUsed', 'archetype', 'value', 'entry', 'keepOrRemove', 'example', 'balanceRisks', 'tuningRange', 'overlap'];
const errors = [];

if (expansion.length !== 500) errors.push(`Expected 500 definitions, found ${expansion.length}`);
if (new Set(expansion.map(([, def]) => def.name)).size !== 500) errors.push('Expansion names are not unique');
for (const [key, def] of expansion) {
  if (!allowed.types.has(def.type)) errors.push(`${key}: unsupported type ${def.type}`);
  if (!allowed.rarities.has(def.rarity)) errors.push(`${key}: unsupported rarity ${def.rarity}`);
  if (!allowed.tiers.has(def.designTier)) errors.push(`${key}: unsupported design tier ${def.designTier}`);
  if (!Array.isArray(def.cost) || def.cost.length !== 2 || def.cost.some(n => !Number.isInteger(n) || n < 0 || n > 3)) errors.push(`${key}: invalid cost`);
  if (!Array.isArray(def.targets) || def.targets.some(target => !allowed.targets.has(target))) errors.push(`${key}: invalid target`);
  if (typeof def.text !== 'function' || !def.text(0) || !def.text(1)) errors.push(`${key}: missing rules text`);
  if (typeof def.play !== 'function') errors.push(`${key}: missing play function`);
  if (designFields.some(field => def.design?.[field] == null)) errors.push(`${key}: incomplete design metadata`);
}

const count = tier => expansion.filter(([, def]) => def.designTier === tier).length;
for (const [tier, expected] of Object.entries({ common:150, uncommon:135, rare:115, exceptional:50, burden:50 })) {
  if (count(tier) !== expected) errors.push(`${tier}: expected ${expected}, found ${count(tier)}`);
}

function targetsFor(specs) {
  const b = board();
  let number = b.cells.findIndex((cell, i) => cell.revealed && !cell.void && numAt(i) > 0);
  if (number < 0) {
    const candidate = hiddenIdx().find(i => !b.cells[i].mine && numAt(i) > 0);
    if (candidate != null) {
      revealTile(candidate, 'card-safe');
      if (board() === b && b.cells[candidate].revealed) number = candidate;
    }
  }
  const chosen = [];
  for (const spec of specs) {
    if (spec === 'hidden') chosen.push(hiddenIdx().find(i => !chosen.includes(i)));
    else if (spec === 'open') chosen.push(b.cells.findIndex((cell, i) => cell.revealed && !cell.void && !cell.construct && !chosen.includes(i)));
    else if (spec === 'number') chosen.push(number);
    else if (spec === 'row') chosen.push(Math.floor((hiddenIdx()[0] || 0) / b.size));
    else chosen.push(b.cells.findIndex((cell, i) => !cell.void && !chosen.includes(i)));
  }
  return chosen;
}

// Execute all 45 base recipes through Sapper, every other class-specific rider
// mode, and one representative from each burden family.
const runtimeKeys = [
  ...Array.from({ length:45 }, (_, i) => `x500_sapper_${i}`),
  ...['surveyor','terraformer','lamplighter','gambler','chirurgeon','archivist','warden','hexwright','revenant']
    .flatMap(cls => [0, 1, 2].map(i => `x500_${cls}_${i}`)),
  ...[0, 10, 20, 30, 40].map(i => `x500_burden_${i}`),
];
for (const key of runtimeKeys) {
  try {
    newRun('sapper', { testMode:true });
    startCombat('dig');
    cbt().enemies.forEach(enemy => { enemy.hp += 10000; enemy.maxHp += 10000; });
    cbt().picks = Math.max(cbt().picks, 10);
    cbt().maxPicks = Math.max(cbt().maxPicks, 10);
    const def = CARDS[key];
    const targets = targetsFor(def.targets);
    if (targets.some(target => target == null || target < 0)) throw new Error(`could not prepare targets ${def.targets.join(',')}`);
    def.play(0, targets);
  } catch (error) {
    errors.push(`${key}: runtime validation failed: ${error.message}`);
  }
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Validated 500 schemas, exact distribution, and ${runtimeKeys.length} representative runtime effects.`);
}
