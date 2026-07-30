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
  directImport.status === 0 && Number(directImport.stdout.trim()) >= 120
    && Number(directImport.stdout.trim()) <= 130 && !directImport.stderr);

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
const mechanicsSource = source('src/ui/mechanics.js');
const styles = source('src/styles.css');
const engine = source('src/engine/engine.js');
const runtime = source('src/engine/runtime.js');
const bossData = source('src/engine/data.js');
const bossRules = source('src/ui/screens.jsx');
const entrypoint = source('src/main.jsx');
const handheldTheme = source('src/gba-theme.css');
const cardSheetRenderer = source('src/ui/CardSheetRenderer.jsx');
const fullbodyRoot = new URL('../src/assets/sprites/fullbody/', import.meta.url);
const fullbodySprites = ['delvers', 'enemies', 'npcs'].flatMap(category =>
  readdirSync(new URL(`${category}/`, fullbodyRoot)).filter(name => name.endsWith('.webp')));
const animationRoot = new URL('../src/assets/sprites/animations/', import.meta.url);
const animationSheets = readdirSync(new URL('sheets/', animationRoot))
  .filter(name => name.endsWith('.webp'));
const cutsceneSprites = source('src/ui/cutsceneSprites.js');
const cutsceneActor = source('src/ui/CutsceneActor.jsx');
const cutsceneComponent = source('src/ui/Cutscene.jsx');
test('full-body sprite production covers every Delver, enemy, boss, and merchant',
  fullbodySprites.length === 25
    && source('src/assets/sprites/fullbody/README.md').includes('transparent, lossless **384×512 WebP**')
    && source('scripts/process-fullbody-sprites.py').includes('Built {len(review_entries)} sprites')
    && statSync(new URL('review/fullbody-roster.png', fullbodyRoot)).size > 100_000);
test('cutscenes use compressed frame sheets for the complete character cast',
  animationSheets.length === 25
    && (cutsceneSprites.match(/animations\/sheets\/[^']+\.webp/g) || []).length === 25
    && cutsceneSprites.includes("defeated: '100%'")
    && cutsceneActor.includes('cutscene-actor-sheet')
    && cutsceneActor.includes("'--cutscene-sprite-row'")
    && cutsceneComponent.includes('cutscene-stage')
    && cutsceneComponent.includes("actorKey: 'rat-merchant'")
    && cutsceneComponent.includes("cutsceneArt('merchantShop')")
    && styles.includes('@keyframes cutscene-sprite-frames')
    && styles.includes('.cutscene-actor[data-motion="defeated"]')
    && statSync(new URL('review/cutscene-animation-sheets.webp', animationRoot)).size > 100_000
    && source('src/assets/sprites/animations/README.md').includes('transparent, lossless **768×512 WebP**'));
test('every Delver has an obvious class-resource panel with useful secondary state',
  ['sapper:', 'surveyor:', 'terraformer:', 'lamplighter:', 'gambler:',
    'chirurgeon:', 'archivist:', 'warden:', 'hexwright:', 'revenant:']
    .every(cls => combat.includes(cls))
    && combat.includes('DELVER_RESOURCE_MARKS')
    && combat.includes('DELVER_MODIFIER_MARKS')
    && combat.includes('class-mechanic-detail')
    && combat.includes('class-mechanic-detail-icon')
    && combat.includes('class-mechanic-meter')
    && ['turn', 'banked', 'heat', 'fading', 'preserved', 'ready', 'rigged',
      'recoverable', 'citations', 'riposte', 'runePower', 'rise']
      .every(modifier => combat.includes(`${modifier}: <Mark`))
    && !combat.includes('{classMechanic.detailLabel}</span>')
    && ['strongbox symbol', 'circular turn symbol', 'half-moon symbol', 'crooked die',
      'mending-drop symbol', 'quotation-mark symbol', 'shield-and-arrow symbol',
      'star-rune symbol', 'upward grave-arrow symbol', 'flame symbol']
      .every(documentation => mechanicsSource.includes(documentation))
    && styles.includes('.class-mechanic-stat {')
    && styles.includes('grid-column: span 2;')
    && styles.includes('.class-mechanic-main small')
    && styles.includes('.class-mechanic-detail-icon')
    && styles.includes('.class-mechanic-stat.charged'));
test('notifications stay longer, coalesce active duplicates, and log expanded details',
  engine.includes('TOAST_DURATION_MS = 4000')
    && engine.includes("ui.toasts.find(item => item.msg === text)")
    && engine.includes("expanded ? ` — ${expanded}`")
    && styles.includes('animation: fadeout 4s forwards'));
test('bosses periodically use documented class-reactive Resonance intents',
  ['sapper','surveyor','terraformer','lamplighter','gambler',
    'chirurgeon','archivist','warden','hexwright','revenant']
    .every(cls => engine.includes(`  ${cls}: {`))
    && engine.includes('export function bossResonanceIntent')
    && engine.includes('export function resolveBossResonance')
    && runtime.includes("call('bossResonanceIntent'")
    && bossData.includes('e.step % 4')
    && bossData.includes("it.kind === 'resonance'")
    && combat.includes("e.intent?.cls === 'resonance'")
    && bossRules.includes('Boss Resonance by Delver')
    && mechanicsSource.includes("resonance: { name: 'Resonance'"));
test('card review sheets use the live CardView and cover every Delver deck plus shared cards',
  entrypoint.includes("get('card-sheet')")
    && cardSheetRenderer.includes('<CardView')
    && cardSheetRenderer.includes('cls.deck')
    && cardSheetRenderer.includes('cls.rewardPool')
    && cardSheetRenderer.includes("Object.keys(CLASSES)")
    && source('package.json').includes('"cards:render"'));
test('mobile hands retain their compact look with deal and flying-card animations',
  combat.includes("if (showHand)") && combat.includes("selected ? 'selected' : ''")
    && combat.includes("'--hand-order': i + 1")
    && styles.includes('.handslot.selected') && styles.includes('.handslot.deal')
    && styles.includes('.cardghost.played') && styles.includes('.cardghost.discard')
    && styles.includes('.handslot, .handslot:hover, .handslot.selected { transform: none; }')
    && styles.includes('.card.selected { transform: translateY(-4px); }')
    && styles.includes('.handslot, .handslot:hover { z-index: var(--hand-order, 1); }')
    && styles.includes('.cardghost { z-index: 19; }')
    && styles.includes('max-height: none; overflow: hidden; overscroll-behavior: none;')
    && styles.includes('position: relative; z-index: 30; isolation: isolate;')
    && styles.includes('position: relative; z-index: 1; isolation: isolate;'));
test('mobile card selections use one full-width card per row and battle cards are twenty percent wider',
  !styles.includes('.card-select-grid > .card:last-child:nth-child(odd)')
    && styles.includes('grid-template-columns: minmax(0, 1fr)')
    && styles.includes('.card { width: 175px; min-height: 192px; }')
    && styles.includes('html.compact-cards .hand .card { width: 158px; }')
    && source('src/ui/screens.jsx').includes('className="cardpick card-select-grid"')
    && (source('src/ui/ModalHost.jsx').match(/className="cardpick card-select-grid"/g) || []).length === 2);
test('the original handheld pixel skin loads after the base theme and covers core game surfaces',
  entrypoint.indexOf("import './styles.css'") < entrypoint.indexOf("import './gba-theme.css'")
    && handheldTheme.includes('--gba-screen:')
    && handheldTheme.includes('.home-action::before')
    && /\.home-action\.compact\s*\{[^}]*padding:\s*12px 16px 12px 38px;/s.test(handheldTheme)
    && handheldTheme.includes('.mapnode.reachable')
    && handheldTheme.includes('.tile.open')
    && handheldTheme.includes('.enemy-token')
    && handheldTheme.includes('.card .rules')
    && handheldTheme.includes('@media (max-width: 700px)')
    && handheldTheme.includes('uses no Nintendo logos'));

const portraits = source('src/ui/portraits.js');
const collectionIndex = source('src/ui/CollectionIndex.jsx');
const cutsceneArt = source('src/ui/cutsceneArt.js');
const atlasSets = source('src/ui/atlasSets.js');
const preferences = source('src/engine/preferences.js');
const pixelDelvers = readdirSync(new URL('../src/assets/delvers/', import.meta.url))
  .filter(name => name.endsWith('-pixel-coarse.webp'));
const pixelCutscenes = readdirSync(new URL('../src/assets/cutscenes/', import.meta.url))
  .filter(name => name.endsWith('-pixel-coarse.webp'));
test('every runtime illustration category uses the coarse pixel-art masters',
  pixelDelvers.length === 10 && pixelCutscenes.length === 9
    && (portraits.match(/-pixel-coarse\.webp/g) || []).length === 11
    && (cutsceneArt.match(/-pixel-coarse\.webp/g) || []).length === 9
    && atlasSets.includes("'pixel-icons-coarse.webp'"));
test('Delver archive exposes full-resolution masters and both live card decks',
  (portraits.match(/assets\/delvers\/[^']+\.webp/g) || []).filter(path => !path.includes('-pixel-coarse')).length === 10
    && portraits.includes('delverFullPortrait')
    && collectionIndex.includes('delverFullPortrait(key)')
    && collectionIndex.includes('<CardView')
    && collectionIndex.includes('cardKeys={def.deck}')
    && collectionIndex.includes('cardKeys={def.rewardPool}')
    && collectionIndex.includes('Preview card upgrade level')
    && styles.includes('.delver-index-decks'));
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
const signatureCards = source('src/engine/signatureCards.js');
const mechanicRules = source('src/ui/mechanics.js');
test('home screen presents Learn, Archive, and Settings as its secondary hierarchy',
  screens.includes('<span>Learn</span>') && screens.includes('<span>Archive</span>')
    && !screens.includes('<span>Speedrun records</span><small>Fastest completed descent'));
test('the website exposes release notes from one versioned changelog source',
  screens.includes("open('changelog')") && screens.includes('<ChangelogPanel />')
    && source('src/ui/ChangelogPanel.jsx').includes("from '../changelog.js'")
    && source('src/changelog.js').includes("version: 'Next'")
    && source('src/changelog.js').includes("version: '0.1.5'")
    && source('src/changelog.js').includes('REQUIRED: update the "Next" entry with every player-facing change')
    && source('src/changelog.js').includes('Abandoning any Honest Puzzle now reveals its solution'));
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
  ['Sentry Construct on an empty safe revealed tile', 'Bulwark Construct on an empty safe revealed tile',
    'Survey Relay Construct on an empty safe revealed tile']
    .every(text => cardData.includes(text))
    && ['Sentry Construct on the chosen safe revealed tile',
      'Bulwark Construct on the chosen safe revealed tile',
      'Survey Relay Construct on the chosen safe revealed tile',
      'For each Construct', 'per Construct']
      .every(text => signatureCards.includes(text))
    && mechanicRules.includes('before enemies act')  // timing moved off the cards into the glossary
    && source('src/ui/BoardView.jsx').includes('construct-number')
    && source('src/ui/BoardView.jsx').includes('Number beneath Construct')
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
