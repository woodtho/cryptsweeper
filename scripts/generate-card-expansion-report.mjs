import { mkdir, writeFile } from 'node:fs/promises';
import { CARDS } from '../src/engine/data.js';

const rows = Object.entries(CARDS)
  .filter(([key]) => key.startsWith('x500_'))
  .map(([key, def]) => ({
    key,
    name: def.name,
    class: def.cls || null,
    type: def.type,
    rarity: def.rarity,
    designTier: def.designTier,
    cost: def.cost,
    targets: def.targets,
    exhaust: Boolean(def.exhaust),
    rules: def.text(0),
    upgradedRules: def.text(1),
    existingMechanicsUsed: def.design.mechanicsUsed,
    intendedArchetypeOrRole: def.design.archetype,
    assessment: def.design.value,
    existingEntrySystem: def.design.entry,
    keepOrRemove: def.design.keepOrRemove,
    exampleUseCase: def.design.example,
    balanceRisks: def.design.balanceRisks,
    recommendedNumericalTuningRange: def.design.tuningRange,
    overlap: def.design.overlap,
  }));

const counts = field => Object.fromEntries([...new Set(rows.map(row => row[field]))]
  .map(value => [String(value), rows.filter(row => row[field] === value).length]));

const payload = {
  generatedFrom: 'src/engine/cardExpansion500.js',
  total: rows.length,
  distribution: {
    designTier: counts('designTier'),
    engineRarity: counts('rarity'),
    cardType: counts('type'),
  },
  cards: rows,
};

await mkdir(new URL('../docs/design/', import.meta.url), { recursive: true });
await writeFile(new URL('../docs/design/card-expansion-500.json', import.meta.url), `${JSON.stringify(payload, null, 2)}\n`);
console.log(`Wrote ${rows.length} cards to docs/design/card-expansion-500.json`);
