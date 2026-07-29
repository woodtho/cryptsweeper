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
  directImport.status === 0 && directImport.stdout.trim() === '213' && !directImport.stderr);

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

const combat = source('src/ui/CombatScreen.jsx');
const styles = source('src/styles.css');
const entrypoint = source('src/main.jsx');
const handheldTheme = source('src/gba-theme.css');
test('mobile hands retain their compact look with deal and flying-card animations',
  combat.includes("if (showHand)") && combat.includes("selected ? 'selected' : ''")
    && combat.includes("'--hand-order': i + 1")
    && styles.includes('.handslot.selected') && styles.includes('.handslot.deal')
    && styles.includes('.cardghost.played') && styles.includes('.cardghost.discard')
    && styles.includes('.handslot, .handslot:hover, .handslot.selected { transform: none; }')
    && styles.includes('.card.selected { transform: translateY(-4px); }')
    && styles.includes('.handslot, .handslot:hover { z-index: var(--hand-order, 1); }')
    && styles.includes('.cardghost { z-index: 19; }')
    && styles.includes('position: sticky; bottom: 0; z-index: 30; isolation: isolate;')
    && styles.includes('position: relative; z-index: 1; order: -1; isolation: isolate;'));
test('mobile card selections fill two-column rows and span an unpaired final card',
  styles.includes('.card-select-grid > .card:last-child:nth-child(odd)')
    && styles.includes('grid-template-columns: repeat(2, minmax(0, 1fr))')
    && source('src/ui/screens.jsx').includes('className="cardpick card-select-grid"')
    && (source('src/ui/ModalHost.jsx').match(/className="cardpick card-select-grid"/g) || []).length === 2);
test('the original handheld pixel skin loads after the base theme and covers core game surfaces',
  entrypoint.indexOf("import './styles.css'") < entrypoint.indexOf("import './gba-theme.css'")
    && handheldTheme.includes('--gba-screen:')
    && handheldTheme.includes('.home-action::before')
    && handheldTheme.includes('.home-action.compact {\n  padding: 12px 16px 12px 38px;')
    && handheldTheme.includes('.mapnode.reachable')
    && handheldTheme.includes('.tile.open')
    && handheldTheme.includes('.enemy-token')
    && handheldTheme.includes('.card .rules')
    && handheldTheme.includes('@media (max-width: 700px)')
    && handheldTheme.includes('uses no Nintendo logos'));

const portraits = source('src/ui/portraits.js');
const cutsceneArt = source('src/ui/cutsceneArt.js');
const atlasSets = source('src/ui/atlasSets.js');
const preferences = source('src/engine/preferences.js');
const pixelDelvers = readdirSync(new URL('../src/assets/delvers/', import.meta.url))
  .filter(name => name.endsWith('-pixel-coarse.webp'));
const pixelCutscenes = readdirSync(new URL('../src/assets/cutscenes/', import.meta.url))
  .filter(name => name.endsWith('-pixel-coarse.webp'));
test('every runtime illustration category uses the coarse pixel-art masters',
  pixelDelvers.length === 10 && pixelCutscenes.length === 8
    && (portraits.match(/-pixel-coarse\.webp/g) || []).length === 11
    && (cutsceneArt.match(/-pixel-coarse\.webp/g) || []).length === 8
    && atlasSets.includes("'pixel-icons-coarse.webp'"));
test('Delver marks and bestiary artwork are the coordinated default icon family',
  preferences.includes("enemyIconStyle: 'marks'")
    && preferences.includes("mapIconStyle: 'marks'")
    && preferences.includes("interfaceIconStyle: 'marks'")
    && preferences.includes('delverIconDefaultVersion: DELVER_ICON_DEFAULT_VERSION')
    && preferences.includes("stored.enemyIconStyle === 'pixel'")
    && preferences.includes("stored.mapIconStyle === 'pixel'")
    && preferences.includes("stored.interfaceIconStyle === 'pixel'"));

const tutorial = source('src/ui/InteractiveTutorial.jsx');
test('Mechanics Lab unlocks progressively after the guided tutorial',
  tutorial.includes('disabled={!guidedComplete}') && tutorial.includes('Finish guided descent'));

const screens = source('src/ui/screens.jsx');
const cardData = source('src/engine/data.js');
const mechanicRules = source('src/ui/mechanics.js');
test('home screen presents Learn, Archive, and Settings as its secondary hierarchy',
  screens.includes('<span>Learn</span>') && screens.includes('<span>Archive</span>')
    && !screens.includes('<span>Speedrun records</span><small>Fastest completed descent'));
test('home navigation styles Continue as forward and Back as the red return action',
  screens.includes('className="home-action" onClick={() => loadRun(\'auto\')}><span>Continue descent</span>')
    && screens.includes('className="btn primary" onClick={() => open(COLLECTION_PANELS.includes(panel)'));
test('archive and record panels are split out of the large screen module',
  screens.includes("from './ArchivePanels.jsx'") && source('src/ui/ArchivePanels.jsx').includes('SpeedrunPanel'));
test('save menus expose editable checkpoint names and identify overwrites',
  screens.includes('className="save-name-input"') && screens.includes('Name for checkpoint')
    && screens.includes('Overwrite “${item.name') && screens.includes('saved ? \'Overwrite\' : \'Save\''));
test('the shop card pager counts only unsold cards',
  screens.includes('const availableCardIndices =') && screens.includes('const remainingCards = availableCardIndices.length')
    && screens.includes('`${selectedCardPosition + 1} / ${remainingCards}`')
    && screens.includes('setSelectedCard(next)'));
test('Construct cards state placement, with slim text and trigger timing/terms defined in the glossary',
  ['Sentry Construct on an empty revealed tile', 'Bulwark Construct on an empty revealed tile',
    'Survey Relay Construct on an empty revealed tile',
    'Count your active Constructs', 'for each active Construct']
    .every(text => cardData.includes(text))
    && mechanicRules.includes('before enemies act')  // timing moved off the cards into the glossary
    && ['construct:', 'sentry:', 'bulwark:', "'survey relay':", "'master builder':",
      "'stone choir':", "'board attack':", 'heat:'].every(text => mechanicRules.includes(text))
    && screens.includes('data-mechanic="board attack"'));

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
