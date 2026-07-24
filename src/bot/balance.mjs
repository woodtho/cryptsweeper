import { CLASSES } from '../engine/data.js';
import { newRun } from '../engine/engine.js';
import { runContinuous } from './gameBot.js';
import { writeFileSync } from 'node:fs';

const storage = new Map();
globalThis.localStorage = {
  getItem: key => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: key => storage.delete(key),
};

const arg = name => process.argv.find(x => x.startsWith(`--${name}=`))?.split('=')[1];
const runs = Math.max(100, Number(arg('runs')) || 100);
const honestRuns = Math.max(1, Number(arg('honest-runs')) || 20);
const requested = arg('classes')?.split(',').filter(Boolean);
const classes = requested?.length ? requested : Object.keys(CLASSES);
const report = [];

for (const cls of classes) {
  const simulate = (policy, count) => {
    const samples = [];
    for (let i = 0; i < count; i++) {
      newRun(cls, { daily: `balance-${policy}-${cls}-${i}`, testMode: true });
      const result = runContinuous({ policy, maxSteps: 10000, stopAtCoreVictory: true });
      samples.push({
        won: Boolean(result.state.run.coreWon), screen: result.state.screen,
        hp: result.state.run.hp, floors: result.state.run.floors,
        stratum: result.state.run.stratum, score: result.state.run.score, steps: result.steps,
      });
    }
    const avg = field => Number((samples.reduce((sum, row) => sum + row[field], 0) / samples.length).toFixed(1));
    const wins = samples.filter(row => row.won).length;
    return {
      runs: count, wins, winRate: Number((wins / count).toFixed(3)),
      avgHp: avg('hp'), avgFloors: avg('floors'), avgScore: avg('score'), avgSteps: avg('steps'),
      endings: Object.fromEntries([...new Set(samples.map(row => row.screen))]
        .map(screen => [screen, samples.filter(row => row.screen === screen).length])),
    };
  };
  const row = { class: cls, oracle: simulate('oracle', runs), honest: simulate('honest', honestRuns) };
  report.push(row);
  process.stderr.write(
    `[balance] ${cls}: oracle ${row.oracle.wins}/${row.oracle.runs}, honest ${row.honest.wins}/${row.honest.runs}\n`,
  );
}

const payload = {
  generatedAt: new Date().toISOString(),
  methodology: 'Class-aware card priorities; oracle reads mines, honest uses only revealed and scanned information.',
  oracleRunsPerClass: runs,
  honestRunsPerClass: honestRuns,
  report,
};
const json = `${JSON.stringify(payload, null, 2)}\n`;
const output = arg('output');
if (output) writeFileSync(output, json);
process.stdout.write(json);
