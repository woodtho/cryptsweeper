import { CLASSES } from '../engine/data.js';
import { newRun } from '../engine/engine.js';
import { runContinuous } from './gameBot.js';

const storage = new Map();
globalThis.localStorage = {
  getItem: key => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: key => storage.delete(key),
};

const arg = name => process.argv.find(x => x.startsWith(`--${name}=`))?.split('=')[1];
const runs = Math.max(1, Number(arg('runs')) || 10);
const requested = arg('classes')?.split(',').filter(Boolean);
const classes = requested?.length ? requested : Object.keys(CLASSES);
const report = [];

for (const cls of classes) {
  const samples = [];
  for (let i = 0; i < runs; i++) {
    newRun(cls, { daily: `balance-${cls}-${i}` });
    const result = runContinuous({ policy: 'oracle', maxSteps: 10000 });
    samples.push({
      won: result.state.screen === 'victory', screen: result.state.screen,
      hp: result.state.run.hp, floors: result.state.run.floors,
      stratum: result.state.run.stratum, score: result.state.run.score, steps: result.steps,
    });
  }
  const avg = field => Number((samples.reduce((sum, x) => sum + x[field], 0) / samples.length).toFixed(1));
  report.push({
    class: cls, runs, wins: samples.filter(x => x.won).length,
    winRate: Number((samples.filter(x => x.won).length / runs).toFixed(2)),
    avgHp: avg('hp'), avgFloors: avg('floors'), avgScore: avg('score'), avgSteps: avg('steps'),
    endings: Object.fromEntries([...new Set(samples.map(x => x.screen))].map(screen => [screen, samples.filter(x => x.screen === screen).length])),
  });
}

process.stdout.write(`${JSON.stringify({ policy: 'oracle', runsPerClass: runs, report }, null, 2)}\n`);
