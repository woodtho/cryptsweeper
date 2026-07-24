import { CLASSES, STRATA } from '../engine/data.js';
import { EVENT_CATALOG, TEST_CUTSCENES, testLaunch, testRefill } from '../engine/engine.js';

const puzzles = [
  ['mines', '6×6 Mines'], ['mines-medium', '7×7 Mines'], ['mines-hard', '8×8 Mines'],
  ['sudoku', '4×4 Sudoku'], ['sudoku-medium', '6×6 Sudoku'], ['sudoku-hard', '9×9 Sudoku'],
  ['crossword', '3×3 Crossword'], ['crossword-medium', '4×4 Crossword'], ['crossword-hard', '5×5 Crossword'],
  ['sequence-medium', 'Sequence'], ['sequence-hard', 'Hard sequence'],
  ['lights-medium', '3×3 Lights Out'], ['lights-hard', '4×4 Lights Out'], ['nonogram', '5×5 Nonogram'],
];

const entry = (label, kind, value = null, tone = '') => ({ label, kind, value, tone });

/* This catalog is the single source for both the visible test menu and Test All.
   Adding a target here automatically adds it to both places. */
export const TEST_LAB_SECTIONS = [
  { label: 'Test run', testAllLabel: 'Test all run tools', entries: [
    ...Object.entries(CLASSES).map(([key, cls]) => entry(`Fresh ${cls.name}`, 'reset', key)),
    entry('Refill HP, gold, energy, picks', 'refill', null, 'primary'),
    entry('Map', 'map'), entry('Shop', 'shop'), entry('Camp', 'camp'),
  ] },
  { label: 'Combat and rewards', testAllLabel: 'Test all combat & rewards', entries: [
    entry('Normal fight', 'combat', 'dig'), entry('Elite fight', 'combat', 'elite'),
    ...STRATA.map((stratum, i) => entry(`Boss · ${stratum.name}`, 'boss', i, 'danger')),
    ...['dig', 'elite', 'boss'].map(kind => entry(`${kind[0].toUpperCase() + kind.slice(1)} reward`, 'reward', kind)),
    entry('Game over screen', 'gameover'), entry('Victory screen', 'victory'),
  ] },
  { label: 'Honest puzzles', testAllLabel: 'Test all puzzles', entries: puzzles.map(([key, label]) => entry(label, 'puzzle', key)) },
  { label: 'Events', testAllLabel: 'Test all events', eventButtons: true, entries: Object.entries(EVENT_CATALOG).map(([key, event]) => entry(event.title, 'event', key)) },
  { label: 'Cutscenes', testAllLabel: 'Test all cutscenes', entries: TEST_CUTSCENES.map(([id, label]) => entry(label, 'cutscene', id)) },
];

export const TEST_ALL_CASES = TEST_LAB_SECTIONS.flatMap(section =>
  section.entries.map(item => ({ ...item, section: section.label })));

export function testCasesForSection(section) {
  return section.entries.map(item => ({ ...item, section: section.label }));
}

export function runTestCase(item) {
  if (item.kind === 'refill') testRefill();
  else testLaunch(item.kind, item.value);
}
