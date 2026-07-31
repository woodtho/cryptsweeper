import {
  advanceSpritePlayback,
  normalizeSpriteFrames,
  SPRITE_PLAYBACK_MODES,
  spriteSheetPosition,
} from '../src/ui/spritePlayback.js';

let failures = 0;
function test(name, condition) {
  console.log(`${condition ? 'PASS' : 'FAIL'}  ${name}`);
  if (!condition) failures++;
}

test('sprite playback exposes loop, once, and hold modes',
  JSON.stringify(SPRITE_PLAYBACK_MODES) === JSON.stringify(['loop', 'once', 'hold']));
test('loop playback wraps from the last entry to the first',
  JSON.stringify(advanceSpritePlayback(5, 6, 'loop')) === JSON.stringify({ cursor: 0, finished: false }));
test('one-shot playback returns to its first pose after completing',
  JSON.stringify(advanceSpritePlayback(5, 6, 'once')) === JSON.stringify({ cursor: 0, finished: true }));
test('hold playback remains on its final pose after completing',
  JSON.stringify(advanceSpritePlayback(5, 6, 'hold')) === JSON.stringify({ cursor: 5, finished: true }));
test('playback advances normally before the final entry',
  JSON.stringify(advanceSpritePlayback(2, 6, 'hold')) === JSON.stringify({ cursor: 3, finished: false }));
test('frame normalization preserves authored order, duplicates, and removals',
  JSON.stringify(normalizeSpriteFrames([0, 2, 2, 5, 1], 6)) === JSON.stringify([0, 2, 2, 5, 1]));
test('frame normalization rejects out-of-sheet entries',
  JSON.stringify(normalizeSpriteFrames([-1, 0, 7, 3], 6)) === JSON.stringify([0, 3]));
test('six-by-four sheets map their final frame and row to 100 percent',
  JSON.stringify(spriteSheetPosition(5, 6, 3, 4)) === JSON.stringify({ x: 100, y: 100 }));
test('battle sheets map their middle positions correctly',
  JSON.stringify(spriteSheetPosition(2, 4, 1, 2)) === JSON.stringify({ x: 66.66666666666666, y: 100 }));

if (failures) {
  console.error(`\n${failures} SPRITE PLAYBACK FAILURE${failures === 1 ? '' : 'S'}`);
  process.exit(1);
}
console.log('\nALL SPRITE PLAYBACK TESTS PASS');
