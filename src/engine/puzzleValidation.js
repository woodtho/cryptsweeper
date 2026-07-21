export function sudokuShape(size) {
  if (size === 4) return [2, 2];
  if (size === 6) return [2, 3];
  if (size === 9) return [3, 3];
  return null;
}

export function sudokuCandidates(values, size, boxRows, boxCols, index) {
  if (values[index]) return [];
  const used = new Set();
  const row = Math.floor(index / size), col = index % size;
  for (let i = 0; i < size; i++) {
    used.add(values[row * size + i]);
    used.add(values[i * size + col]);
  }
  const row0 = Math.floor(row / boxRows) * boxRows;
  const col0 = Math.floor(col / boxCols) * boxCols;
  for (let r = row0; r < row0 + boxRows; r++) for (let c = col0; c < col0 + boxCols; c++) used.add(values[r * size + c]);
  return Array.from({ length:size }, (_, i) => i + 1).filter(value => !used.has(value));
}

export function isValidSudoku(values, size, boxRows, boxCols, allowIncomplete = true) {
  if (!Array.isArray(values) || values.length !== size * size || boxRows * boxCols !== size) return false;
  const validGroup = group => {
    const filled = group.filter(Boolean);
    return filled.every(value => Number.isInteger(value) && value >= 1 && value <= size)
      && new Set(filled).size === filled.length
      && (allowIncomplete || filled.length === size);
  };
  for (let r = 0; r < size; r++) if (!validGroup(values.slice(r * size, (r + 1) * size))) return false;
  for (let c = 0; c < size; c++) if (!validGroup(Array.from({ length:size }, (_, r) => values[r * size + c]))) return false;
  for (let r0 = 0; r0 < size; r0 += boxRows) for (let c0 = 0; c0 < size; c0 += boxCols) {
    const box = [];
    for (let r = r0; r < r0 + boxRows; r++) for (let c = c0; c < c0 + boxCols; c++) box.push(values[r * size + c]);
    if (!validGroup(box)) return false;
  }
  return true;
}

export function solveSudoku(values, size, boxRows, boxCols) {
  const grid = values.slice();
  function solve() {
    let best = -1, candidates = null;
    for (let i = 0; i < grid.length; i++) {
      if (grid[i]) continue;
      const next = sudokuCandidates(grid, size, boxRows, boxCols, i);
      if (!next.length) return false;
      if (!candidates || next.length < candidates.length) { best = i; candidates = next; }
    }
    if (best < 0) return true;
    for (const value of candidates) {
      grid[best] = value;
      if (solve()) return true;
    }
    grid[best] = 0;
    return false;
  }
  return solve() ? grid : null;
}

export function countSudokuSolutions(values, size, boxRows, boxCols, limit = 2) {
  const grid = values.slice(); let count = 0;
  function search() {
    if (count >= limit) return;
    let best = -1, candidates = null;
    for (let i = 0; i < grid.length; i++) {
      if (grid[i]) continue;
      const next = sudokuCandidates(grid, size, boxRows, boxCols, i);
      if (!next.length) return;
      if (!candidates || next.length < candidates.length) { best = i; candidates = next; }
    }
    if (best < 0) { count++; return; }
    for (const value of candidates) {
      grid[best] = value; search(); grid[best] = 0;
      if (count >= limit) return;
    }
  }
  if (isValidSudoku(grid, size, boxRows, boxCols, true)) search();
  return count;
}

export function sudokuDifficulty(values, size, boxRows, boxCols) {
  const grid = values.slice(); let rounds = 0, singles = 0;
  while (grid.some(value => !value)) {
    const placements = new Map();
    for (let i = 0; i < grid.length; i++) {
      if (grid[i]) continue;
      const candidates = sudokuCandidates(grid, size, boxRows, boxCols, i);
      if (candidates.length === 1) placements.set(i, candidates[0]);
    }
    const groups = [];
    for (let r = 0; r < size; r++) groups.push(Array.from({ length:size }, (_, c) => r * size + c));
    for (let c = 0; c < size; c++) groups.push(Array.from({ length:size }, (_, r) => r * size + c));
    for (let r0 = 0; r0 < size; r0 += boxRows) for (let c0 = 0; c0 < size; c0 += boxCols) {
      const group = [];
      for (let r = r0; r < r0 + boxRows; r++) for (let c = c0; c < c0 + boxCols; c++) group.push(r * size + c);
      groups.push(group);
    }
    for (const group of groups) for (let value = 1; value <= size; value++) {
      const spots = group.filter(i => !grid[i] && sudokuCandidates(grid, size, boxRows, boxCols, i).includes(value));
      if (spots.length === 1) placements.set(spots[0], value);
    }
    if (!placements.size) return { label:'hard', solvedBySingles:false, rounds, singles, unresolved:grid.filter(value => !value).length };
    for (const [index, value] of placements) grid[index] = value;
    singles += placements.size; rounds++;
  }
  return { label:rounds <= 2 ? 'introductory' : rounds <= 5 ? 'moderate' : 'challenging', solvedBySingles:true, rounds, singles, unresolved:0 };
}

export function lineClue(line) {
  const groups = []; let count = 0;
  for (const value of line) {
    if (value) count++;
    else if (count) { groups.push(count); count = 0; }
  }
  if (count) groups.push(count);
  return groups.length ? groups : [0];
}

export function nonogramLineCandidates(size, clue) {
  const target = clue.length === 1 && clue[0] === 0 ? [] : clue;
  const rows = [];
  function place(group, cursor, line) {
    if (group >= target.length) { rows.push(line.slice()); return; }
    const remaining = target.slice(group).reduce((sum, n) => sum + n, 0) + (target.length - group - 1);
    for (let start = cursor; start <= size - remaining; start++) {
      const next = line.slice();
      for (let i = start; i < start + target[group]; i++) next[i] = 1;
      place(group + 1, start + target[group] + 1, next);
    }
  }
  if (!target.length) return [Array(size).fill(0)];
  place(0, 0, Array(size).fill(0));
  return rows;
}

export function countNonogramSolutions(rowClues, colClues, size, limit = 2) {
  if (rowClues.length !== size || colClues.length !== size) return 0;
  const rowOptions = rowClues.map(clue => nonogramLineCandidates(size, clue));
  const colOptions = colClues.map(clue => nonogramLineCandidates(size, clue));
  let count = 0;
  const rows = [];
  function search(row) {
    if (count >= limit) return;
    if (row === size) { count++; return; }
    for (const candidate of rowOptions[row]) {
      const viable = colOptions.every((options, col) => options.some(option => {
        for (let r = 0; r < row; r++) if (option[r] !== rows[r][col]) return false;
        return option[row] === candidate[col];
      }));
      if (!viable) continue;
      rows.push(candidate); search(row + 1); rows.pop();
    }
  }
  search(0);
  return count;
}

export function nonogramClues(solution, size) {
  const rows = Array.from({ length:size }, (_, r) => solution.slice(r * size, (r + 1) * size));
  return {
    rowClues:rows.map(lineClue),
    colClues:Array.from({ length:size }, (_, c) => lineClue(rows.map(row => row[c]))),
  };
}

function toggleLights(values, size, index) {
  const row = Math.floor(index / size), col = index % size;
  for (const [dr, dc] of [[0,0],[-1,0],[1,0],[0,-1],[0,1]]) {
    const r = row + dr, c = col + dc;
    if (r >= 0 && c >= 0 && r < size && c < size) values[r * size + c] ^= 1;
  }
}

export function minimumLightsSolution(values, size) {
  let best = Infinity;
  for (let mask = 0; mask < 2 ** size; mask++) {
    const state = values.slice(); let presses = 0;
    for (let c = 0; c < size; c++) if (mask & (1 << c)) { toggleLights(state, size, c); presses++; }
    for (let r = 1; r < size; r++) for (let c = 0; c < size; c++) {
      if (state[(r - 1) * size + c]) { toggleLights(state, size, r * size + c); presses++; }
    }
    if (state.every(value => !value)) best = Math.min(best, presses);
  }
  return Number.isFinite(best) ? best : null;
}

export function validateCrossword(template, size) {
  if (!template || template.words?.length !== size || template.acrossClues?.length !== size || template.downClues?.length !== size) return false;
  if (!template.words.every(word => typeof word === 'string' && word.length === size && /^[A-Z]+$/.test(word))) return false;
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) if (template.words[r][c] !== template.words[c][r]) return false;
  return template.words.every((word, index) => {
    const answer = word.toLowerCase();
    return template.acrossClues[index] && template.downClues[index]
      && !template.acrossClues[index].toLowerCase().includes(answer)
      && !template.downClues[index].toLowerCase().includes(answer);
  });
}

export function gridNavigationIndex(key, index, size, count = size * size) {
  const row = Math.floor(index / size), col = index % size;
  if (key === 'ArrowLeft') return col > 0 ? index - 1 : index;
  if (key === 'ArrowRight') return col < size - 1 && index + 1 < count ? index + 1 : index;
  if (key === 'ArrowUp') return row > 0 ? index - size : index;
  if (key === 'ArrowDown') return index + size < count ? index + size : index;
  return index;
}
