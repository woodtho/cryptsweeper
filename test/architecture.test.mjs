import { readFileSync, readdirSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { FICTION_EVENT_CATALOG } from '../src/engine/events.js';

let failures = 0;
function test(name, condition) {
  console.log(`${condition ? 'PASS' : 'FAIL'}  ${name}`);
  if (!condition) failures++;
}
const source = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const directImport = spawnSync(process.execPath, ['--input-type=module', '-e',
  "import('./src/engine/data.js').then(m=>console.log(Object.keys(m.CARDS).length))"],
{ cwd:new URL('..', import.meta.url), encoding:'utf8' });
test('data catalog imports without evaluating the engine or hitting a circular dependency',
  directImport.status === 0 && directImport.stdout.trim() === '217' && !directImport.stderr);

const workflow = source('.github/workflows/deploy.yml');
test('deployment is gated by the complete test suite',
  workflow.includes('npm test') && workflow.indexOf('npm test') < workflow.indexOf('npm run build'));

const balance = source('src/bot/balance.mjs');
test('balance runner requires 100 oracle simulations per class and includes honest runs',
  balance.includes('Math.max(100') && balance.includes("simulate('oracle', runs)")
    && balance.includes("simulate('honest', honestRuns)")
    && balance.includes('stopAtCoreVictory: true'));

const board = source('src/ui/BoardView.jsx');
test('battle boards expose touch inspection and basic keyboard controls',
  board.includes('Inspect tiles') && board.includes('ArrowUp') && board.includes("toLowerCase() === 'f'")
    && board.includes("toLowerCase() === 'i'") && board.includes('data-board-tile'));

const tutorial = source('src/ui/InteractiveTutorial.jsx');
test('Mechanics Lab unlocks progressively after the guided tutorial',
  tutorial.includes('disabled={!guidedComplete}') && tutorial.includes('Finish guided descent'));

const screens = source('src/ui/screens.jsx');
test('home screen presents Learn, Archive, and Settings as its secondary hierarchy',
  screens.includes('<span>Learn</span>') && screens.includes('<span>Archive</span>')
    && !screens.includes('<span>Speedrun records</span><small>Fastest completed descent'));
test('archive and record panels are split out of the large screen module',
  screens.includes("from './ArchivePanels.jsx'") && source('src/ui/ArchivePanels.jsx').includes('SpeedrunPanel'));

const music = source('src/engine/music.js');
const musicDir = new URL('../src/assets/music/raw/', import.meta.url);
const musicBytes = readdirSync(musicDir).filter(name => name.endsWith('.mp3'))
  .reduce((sum, name) => sum + statSync(new URL(name, musicDir)).size, 0);
test('recorded music is compressed below 25 MB and lazy-loaded by URL',
  musicBytes < 25 * 1024 * 1024 && music.includes('import.meta.glob') && !/^import .*\\.mp3/m.test(music));

const followups = Object.values(FICTION_EVENT_CATALOG).filter(event => event.followup)
  .flatMap(event => event.followup.actions.map(action => action.effect));
const mechanics = new Set(followups.flatMap(effect => Object.keys(effect)));
test('event returns use a broad set of mechanically distinct consequences',
  followups.length >= 16 && ['gold','heal','upgrade','curse','damage','maxHp','removeCard','pickBonus']
    .every(key => mechanics.has(key)));

if (failures) {
  console.error(`\n${failures} ARCHITECTURE FAILURE${failures === 1 ? '' : 'S'}`);
  process.exit(1);
}
console.log('\nALL ARCHITECTURE TESTS PASS');
