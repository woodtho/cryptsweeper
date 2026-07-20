import readline from 'node:readline';
import { CLASSES } from '../engine/data.js';
import { newRun } from '../engine/engine.js';
import { observe, legalActions, act, step, runContinuous } from './gameBot.js';

const storage = new Map();
globalThis.localStorage = {
  getItem: key => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: key => storage.delete(key),
};

function execute(message) {
  switch (message.cmd) {
    case 'new':
      if (!CLASSES[message.class || 'sapper']) throw new Error(`Unknown class: ${message.class}`);
      newRun(message.class || 'sapper', message.seed ? { daily: message.seed } : {});
      return observe();
    case 'state': return observe({ revealMines: Boolean(message.revealMines) });
    case 'actions': return legalActions();
    case 'act': return act(message.action);
    case 'step': return step(message);
    case 'run': return runContinuous(message);
    case 'help': return {
      commands: [
        { cmd: 'new', class: 'sapper', seed: 'optional deterministic seed' },
        { cmd: 'state' },
        { cmd: 'actions' },
        { cmd: 'act', action: { type: 'enter-node', r: 0, c: 2 } },
        { cmd: 'step', policy: 'oracle|honest' },
        { cmd: 'run', policy: 'oracle|honest', maxSteps: 5000 },
      ],
    };
    default: throw new Error(`Unknown command: ${message.cmd}`);
  }
}

const rl = readline.createInterface({ input: process.stdin, terminal: false });
rl.on('line', line => {
  try { process.stdout.write(`${JSON.stringify({ ok: true, result: execute(JSON.parse(line)) })}\n`); }
  catch (error) { process.stdout.write(`${JSON.stringify({ ok: false, error: error.message })}\n`); }
});
