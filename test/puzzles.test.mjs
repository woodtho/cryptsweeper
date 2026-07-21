import fs from 'node:fs';
import {
  run, newRun, closeCutscene, startPuzzle, neighborsOf, solveScore,
  puzzleClick, setLogicPuzzleCell, toggleSudokuNoteMode, toggleLightsCell, toggleNonogramCell,
  answerSequence, checkLogicPuzzle, saveRun, loadRun, deleteSave,
} from '../src/engine/engine.js';
import {
  isValidSudoku, countSudokuSolutions, nonogramClues, countNonogramSolutions,
  minimumLightsSolution, validateCrossword, gridNavigationIndex,
} from '../src/engine/puzzleValidation.js';

const storage = new Map();
globalThis.localStorage = {
  getItem: key => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, String(value)),
  removeItem: key => storage.delete(key),
  key: index => [...storage.keys()][index] ?? null,
  get length() { return storage.size; },
};

let failures = 0;
function test(name, condition) {
  if (condition) console.log(`PASS  ${name}`);
  else { failures++; console.error(`FAIL  ${name}`); }
}
function fresh(seed = 'puzzle-validation') {
  newRun('surveyor', { daily: seed, testMode: true });
  closeCutscene();
}
function puzzleSignature(type, seed) {
  fresh(seed); startPuzzle(type); const p = run.puzzle;
  if (p.type === 'mines') return p.board.cells.map(cell => cell.mine ? 1 : 0).join('');
  return JSON.stringify({ solution:p.solution, values:p.values, prompt:p.prompt, clues:[p.rowClues, p.colClues], difficulty:p.difficulty });
}

/* Sudoku: all supported sizes are valid, complete, unique, and difficulty-scaled. */
for (const [type, size] of [['sudoku',4], ['sudoku-medium',6], ['sudoku-hard',9]]) {
  fresh(`sudoku-${size}`); startPuzzle(type); const p = run.puzzle;
  const initial = p.solution.map((value, index) => p.givens.includes(index) ? value : 0);
  test(`${size}x${size} Sudoku has a valid completed solution`, isValidSudoku(p.solution, size, p.boxRows, p.boxCols, false));
  test(`${size}x${size} Sudoku givens are valid and unique`, isValidSudoku(initial, size, p.boxRows, p.boxCols, true)
    && countSudokuSolutions(initial, size, p.boxRows, p.boxCols) === 1);
}
fresh('sudoku-notes'); startPuzzle('sudoku-hard');
const sudokuBlank = run.puzzle.values.findIndex((value, index) => !value && !run.puzzle.givens.includes(index));
toggleSudokuNoteMode(); setLogicPuzzleCell(sudokuBlank, run.puzzle.solution[sudokuBlank]);
test('large Sudoku supports non-destructive candidate notes', run.puzzle.values[sudokuBlank] === 0 && run.puzzle.notes[sudokuBlank].length === 1);
saveRun('sudoku-notes'); toggleSudokuNoteMode(); loadRun('sudoku-notes');
test('Sudoku candidate notes and note mode survive save/restore', run.puzzle.noteMode && run.puzzle.notes[sudokuBlank].length === 1);
deleteSave('sudoku-notes');

/* Crosswords: real word squares, separate clues, intersections, locale, and exact validation. */
for (const [type, size] of [['crossword',3], ['crossword-medium',4], ['crossword-hard',5]]) {
  fresh(`crossword-${size}`); startPuzzle(type); const p = run.puzzle;
  test(`${size}x${size} crossword has valid intersections and non-answer clues`, validateCrossword(p, size));
  test(`${size}x${size} crossword carries distinct localized clue lists`, p.locale === 'en-CA'
    && p.acrossClues.length === size && p.downClues.length === size
    && p.acrossClues.some((clue, i) => clue !== p.downClues[i]));
}

/* Procedural nonograms: generated clues match the answer and admit one solution. */
for (const [type, size] of [['nonogram',5], ['nonogram-medium',5], ['nonogram-hard',7]]) {
  let valid = true;
  for (let seed = 0; seed < 30; seed++) {
    fresh(`${type}-${seed}`); startPuzzle(type); const p = run.puzzle;
    const clues = nonogramClues(p.solution, p.size);
    valid &&= p.size === size
      && JSON.stringify(clues.rowClues) === JSON.stringify(p.rowClues)
      && JSON.stringify(clues.colClues) === JSON.stringify(p.colClues)
      && countNonogramSolutions(p.rowClues, p.colClues, p.size) === 1;
  }
  test(`${type} generates 30 valid unique clue sets`, valid);
}
fresh('nonogram-input'); startPuzzle('nonogram-medium');
toggleNonogramCell(0); toggleNonogramCell(0);
test('nonogram cells cycle through unknown, filled, and crossed', run.puzzle.values[0] === 2);
run.puzzle.solution.forEach((value, index) => {
  if (value === 1) { while (run.puzzle.values[index] !== 1) toggleNonogramCell(index); }
  else if (run.puzzle.values[index] === 1) toggleNonogramCell(index);
});
checkLogicPuzzle();
test('nonogram completion accepts either crossed or unknown empty cells', run.puzzle.solved);

/* Lights Out: every generated board is solvable and has a measured floor. */
for (const [type, size, floor] of [['lights',3,2], ['lights-medium',3,4], ['lights-hard',4,7]]) {
  let valid = true;
  for (let seed = 0; seed < 30; seed++) {
    fresh(`${type}-${seed}`); startPuzzle(type); const p = run.puzzle;
    const minimum = minimumLightsSolution(p.values, p.size);
    valid &&= p.size === size && minimum != null && minimum >= floor && p.minimumMoves === minimum;
  }
  test(`${type} generates 30 solvable boards above its move floor`, valid);
}

/* Minesweeper: every procedural difficulty remains no-guess and correctly sized. */
for (const [type, size] of [['mines',6], ['mines-medium',7], ['mines-hard',8]]) {
  let valid = true;
  for (let seed = 0; seed < 30; seed++) {
    fresh(`${type}-${seed}`); startPuzzle(type); const p = run.puzzle;
    const mines = new Set(p.board.cells.flatMap((cell, index) => cell.mine ? [index] : []));
    const opening = p.board.cells.findIndex((cell, index) => cell.revealed && !cell.mine
      && neighborsOf(index, size).every(neighbor => !p.board.cells[neighbor].mine));
    valid &&= p.board.cells.length === size * size && opening >= 0 && solveScore(mines, size, opening) >= 1;
  }
  test(`${type} generates 30 fully provable boards`, valid);
}

/* Sequences: each level has one offered answer and gives no solving explanation. */
for (const type of ['sequence', 'sequence-medium', 'sequence-hard']) {
  fresh(type); startPuzzle(type); const p = run.puzzle;
  test(`${type} offers one unambiguous answer`, new Set(p.choices).size === p.choices.length
    && p.choices.filter(choice => choice === p.answer).length === 1 && !('explanation' in p));
}

/* Shared behavior: reproducibility, incomplete validation, persistence, and navigation. */
for (const type of ['mines-hard','sudoku-hard','crossword-hard','sequence-hard','lights-hard','nonogram-hard']) {
  test(`${type} is reproducible for daily seeds`, puzzleSignature(type, `daily-${type}`) === puzzleSignature(type, `daily-${type}`));
}
fresh('incomplete'); startPuzzle('sudoku-medium'); checkLogicPuzzle();
test('incomplete logic answers do not resolve or fail', !run.puzzle.solved && !run.puzzle.failed);

fresh('wrong-sudoku'); startPuzzle('sudoku');
const wrongSudoku = run.puzzle.values.findIndex((value, index) => !value && !run.puzzle.givens.includes(index));
run.puzzle.solution.forEach((value, index) => setLogicPuzzleCell(index, index === wrongSudoku ? (value % run.puzzle.size) + 1 : value));
checkLogicPuzzle(); test('a complete incorrect Sudoku fails validation', run.puzzle.failed);
fresh('wrong-crossword'); startPuzzle('crossword');
run.puzzle.solution.forEach((value, index) => setLogicPuzzleCell(index, index ? value : (value === 'A' ? 'B' : 'A')));
checkLogicPuzzle(); test('a complete incorrect crossword fails validation', run.puzzle.failed);
fresh('wrong-nonogram'); startPuzzle('nonogram');
run.puzzle.solution.forEach((value, index) => { if ((index === 0 ? 1 - value : value) === 1) toggleNonogramCell(index); });
checkLogicPuzzle(); test('an incorrect nonogram fill fails validation', run.puzzle.failed);
fresh('wrong-sequence'); startPuzzle('sequence'); answerSequence(run.puzzle.choices.find(value => value !== run.puzzle.answer));
test('an incorrect sequence choice fails validation', run.puzzle.failed);
fresh('wrong-mines'); startPuzzle('mines'); puzzleClick(run.puzzle.board.cells.findIndex(cell => cell.mine));
test('opening a mine fails Minesweeper validation', run.puzzle.failed);

for (const type of ['mines-medium','sudoku-medium','crossword-medium','sequence-medium','lights-medium','nonogram-medium']) {
  fresh(`save-${type}`); startPuzzle(type);
  if (run.puzzle.type === 'mines') {
    const safe = run.puzzle.board.cells.findIndex(cell => !cell.mine && !cell.revealed);
    if (safe >= 0) puzzleClick(safe);
  } else if (run.puzzle.type === 'sudoku' || run.puzzle.type === 'crossword') {
    const index = run.puzzle.type === 'sudoku' ? run.puzzle.values.findIndex((v, i) => !v && !run.puzzle.givens.includes(i)) : 0;
    setLogicPuzzleCell(index, run.puzzle.solution[index]);
  } else if (run.puzzle.type === 'lights') toggleLightsCell(0);
  else toggleNonogramCell(0);
  const state = JSON.stringify(run.puzzle);
  saveRun(`restore-${type}`);
  if (run.puzzle.values) run.puzzle.values[0] = 'changed';
  else if (run.puzzle.board) run.puzzle.board.cells[0].revealed = !run.puzzle.board.cells[0].revealed;
  else run.puzzle.prompt = 'changed';
  loadRun(`restore-${type}`);
  test(`${type} state survives save/restore`, JSON.stringify(run.puzzle) === state);
  deleteSave(`restore-${type}`);
}

test('arrow-key navigation respects rows, columns, and boundaries',
  gridNavigationIndex('ArrowRight', 0, 3) === 1
  && gridNavigationIndex('ArrowLeft', 0, 3) === 0
  && gridNavigationIndex('ArrowDown', 1, 3) === 4
  && gridNavigationIndex('ArrowUp', 4, 3) === 1
  && gridNavigationIndex('Enter', 4, 3) === 4);

const screens = fs.readFileSync(new URL('../src/ui/screens.jsx', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../src/styles.css', import.meta.url), 'utf8');
test('all grid puzzles wire keyboard navigation into focusable controls',
  (screens.match(/puzzleGridKeyDown/g) || []).length >= 5 && screens.includes('data-logic-grid'));
test('puzzle grids constrain both phone and large-display widths',
  /nonogram-board[^}]+min\(94vw, 430px\)/s.test(css)
  && /sudoku-grid[^}]+min\(100%, 460px\)/s.test(css)
  && /crossword-grid[^}]+min\(100%, 410px\)/s.test(css));

if (failures) {
  console.error(`\n${failures} PUZZLE VALIDATION FAILURE${failures === 1 ? '' : 'S'}`);
  process.exit(1);
}
console.log('\nALL PUZZLE VALIDATION TESTS PASS');
