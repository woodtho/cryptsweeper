export const SPRITE_PLAYBACK_MODES = Object.freeze(['loop', 'once', 'hold']);

export function normalizeSpriteFrames(frames, columns) {
  const checked = (Array.isArray(frames) ? frames : [])
    .map(Number)
    .filter(frame => Number.isInteger(frame) && frame >= 0 && frame < columns);
  return checked.length ? checked : [0];
}

export function advanceSpritePlayback(cursor, length, mode) {
  const last = Math.max(0, length - 1);
  if (cursor < last) return { cursor: cursor + 1, finished: false };
  if (mode === 'loop') return { cursor: 0, finished: false };
  if (mode === 'once') return { cursor: 0, finished: true };
  return { cursor: last, finished: true };
}

export function spriteSheetPosition(frame, columns, row, rows) {
  return {
    x: columns > 1 ? (frame / (columns - 1)) * 100 : 0,
    y: rows > 1 ? (row / (rows - 1)) * 100 : 0,
  };
}
