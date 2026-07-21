/* Builds the fully coloured variant of the artist-authored main icon sheet.

   main-icons.svg holds 89 white compound paths, one per icon. Two drawing
   styles exist in the set:
     - solid icons (heart, ghosts, golems...): the path is the body, interior
       detail is holes. These take a base coat plus colour regions clipped to
       the path (evenodd), so regions tint the body without touching the ink.
     - outline icons (chest, tools, scrolls...): the path is line work and the
       interiors are holes. These are coloured like a colouring book: paint
       layers go UNDER the line art, clipped to the icon's outer silhouette.
       The silhouette clip is derived per icon by re-winding every subpath to
       a common direction so a nonzero fill unions line work and interiors.

   Every icon below was coloured by hand against the artwork (wood grips,
   steel heads, glass, liquids, flame cores, bone, brass...), finished with a
   uniform soft shadow + top-light. Region coordinates are tile-local
   (~33.87 units per tile). Regenerate with:

   node scripts/generate-color-main-icons.mjs */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { ATLAS_LAYOUT, atlasSlots } from '../src/ui/iconSets.js';

const here = dirname(fileURLToPath(import.meta.url));
const src = resolve(here, '../src/assets/icon-atlas/sets/main-icons.svg');
const out = resolve(here, '../src/assets/icon-atlas/sets/main-icons-color.svg');

/* ---------------- path re-winding for silhouette clips ---------------- */

const NUM = /-?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g;
const ARITY = { m: 2, l: 2, h: 1, v: 1, c: 6, a: 7, z: 0 };

/* Parse a path into subpaths of absolute segments: L [x,y], C [c1,c2,to], A [rx,ry,rot,laf,swf,to]. */
function parseSubpaths(d) {
  const tokens = d.match(new RegExp(`[mlhvcazMLHVCAZ]|${NUM.source}`, 'g'));
  const subs = [];
  let sub = null, x = 0, y = 0, sx = 0, sy = 0, i = 0;
  const flush = () => { if (sub && sub.segs.length) subs.push(sub); sub = null; };
  while (i < tokens.length) {
    const cmdTok = tokens[i++];
    const cmd = cmdTok.toLowerCase();
    const rel = cmdTok === cmdTok.toLowerCase();
    if (!(cmd in ARITY)) throw new Error(`Unsupported path command ${cmdTok}`);
    if (cmd === 'z') { if (sub) sub.closed = true; x = sx; y = sy; continue; }
    let first = cmd === 'm';
    while (i < tokens.length && !/^[a-zA-Z]$/.test(tokens[i])) {
      const args = tokens.slice(i, i + ARITY[cmd]).map(Number);
      i += ARITY[cmd];
      if (first) { // moveto starts a new subpath; subsequent pairs are linetos
        flush();
        x = rel ? x + args[0] : args[0];
        y = rel ? y + args[1] : args[1];
        sx = x; sy = y;
        sub = { start: [x, y], segs: [], closed: false };
        first = false;
        continue;
      }
      if (cmd === 'm' || cmd === 'l') {
        x = rel ? x + args[0] : args[0];
        y = rel ? y + args[1] : args[1];
        sub.segs.push({ t: 'L', to: [x, y] });
      } else if (cmd === 'h') {
        x = rel ? x + args[0] : args[0];
        sub.segs.push({ t: 'L', to: [x, y] });
      } else if (cmd === 'v') {
        y = rel ? y + args[0] : args[0];
        sub.segs.push({ t: 'L', to: [x, y] });
      } else if (cmd === 'c') {
        const [a1, a2, a3, a4, a5, a6] = args;
        const c1 = rel ? [x + a1, y + a2] : [a1, a2];
        const c2 = rel ? [x + a3, y + a4] : [a3, a4];
        const to = rel ? [x + a5, y + a6] : [a5, a6];
        sub.segs.push({ t: 'C', c1, c2, to });
        [x, y] = to;
      } else if (cmd === 'a') {
        const [rx, ry, rot, laf, swf, ax, ay] = args;
        const to = rel ? [x + ax, y + ay] : [ax, ay];
        sub.segs.push({ t: 'A', rx, ry, rot, laf, swf, to });
        [x, y] = to;
      }
    }
  }
  flush();
  return subs;
}

/* Sample curves so the winding sign is reliable even for subpaths drawn as a
   couple of large beziers (a bell body, a map fold). Endpoint-only polygons
   can degenerate and report the wrong orientation. */
function samplePoints(sub) {
  const pts = [sub.start];
  let from = sub.start;
  for (const seg of sub.segs) {
    if (seg.t === 'C') {
      for (const t of [0.25, 0.5, 0.75]) {
        const u = 1 - t;
        pts.push([
          u * u * u * from[0] + 3 * u * u * t * seg.c1[0] + 3 * u * t * t * seg.c2[0] + t * t * t * seg.to[0],
          u * u * u * from[1] + 3 * u * u * t * seg.c1[1] + 3 * u * t * t * seg.c2[1] + t * t * t * seg.to[1],
        ]);
      }
    }
    pts.push(seg.to);
    from = seg.to;
  }
  return pts;
}

function signedArea(sub) {
  const pts = samplePoints(sub);
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % pts.length];
    area += x1 * y2 - x2 * y1;
  }
  return area / 2;
}

function reverseSub(sub) {
  const pts = [sub.start, ...sub.segs.map(s => s.to)];
  const segs = [];
  for (let i = sub.segs.length - 1; i >= 0; i--) {
    const seg = sub.segs[i];
    const to = pts[i]; // reversed segment lands on the original segment's start
    if (seg.t === 'L') segs.push({ t: 'L', to });
    else if (seg.t === 'C') segs.push({ t: 'C', c1: seg.c2, c2: seg.c1, to });
    else segs.push({ t: 'A', rx: seg.rx, ry: seg.ry, rot: seg.rot, laf: seg.laf, swf: seg.swf ? 0 : 1, to });
  }
  return { start: pts[pts.length - 1], segs, closed: sub.closed };
}

const fmt = n => Number(n.toFixed(3));
function subToD(sub) {
  let d = `M ${fmt(sub.start[0])},${fmt(sub.start[1])}`;
  for (const seg of sub.segs) {
    if (seg.t === 'L') d += ` L ${fmt(seg.to[0])},${fmt(seg.to[1])}`;
    else if (seg.t === 'C') d += ` C ${fmt(seg.c1[0])},${fmt(seg.c1[1])} ${fmt(seg.c2[0])},${fmt(seg.c2[1])} ${fmt(seg.to[0])},${fmt(seg.to[1])}`;
    else d += ` A ${seg.rx} ${seg.ry} ${seg.rot} ${seg.laf} ${seg.swf} ${fmt(seg.to[0])},${fmt(seg.to[1])}`;
  }
  return d + ' Z';
}

/* All subpaths re-wound to the dominant direction: nonzero then fills holes,
   yielding the outer silhouette (union of every drawn part). */
function silhouetteD(d) {
  const subs = parseSubpaths(d);
  const dominant = Math.sign(signedArea(subs.reduce((a, b) => Math.abs(signedArea(a)) >= Math.abs(signedArea(b)) ? a : b)));
  return subs.map(sub => Math.sign(signedArea(sub)) === dominant || Math.abs(signedArea(sub)) < 1e-6
    ? subToD(sub) : subToD(reverseSub(sub))).join(' ');
}

/* ---------------- the hand-authored colouring ---------------- */

const WOOD = '#8a6238', WOOD_LT = '#a97a4a', STEEL = '#a8b1bf', STEEL_DK = '#6b7280',
  STEEL_LT = '#c2cbd8', IRON = '#4a505e', IRON_LT = '#5d6475', GOLD = '#dfae3c',
  GOLD_LT = '#ecd27c', GOLD_DK = '#b8892e', BONE = '#e6dfc8', BONE_DK = '#c9bfa0',
  PARCH = '#e2dcc8', BRASS = '#c08a4a', BRASS_DK = '#96682f', RED = '#cc4b40',
  FLAME = '#ef9a3f', FLAME_HOT = '#f4d054', SKIN = '#d8a97e', GLASS = '#cfe4ea',
  VIOLET = '#9a78c8', CYAN = '#7fd4e8', GREEN = '#78b878', MOSS = '#6f8f5c';

/* base: colour of the drawn path (body for solid icons, line work for outline
   icons) · u: underpaint below the lines, clipped to the silhouette ·
   n: underpaint below the lines with NO clip, for open-stroke drawings whose
   pockets no silhouette can cover (fitted to the art by hand) ·
   o: tints above the path, clipped to the path itself (evenodd).
   shapes: r rect [x,y,w,h] · c circle [cx,cy,r] · e ellipse [cx,cy,rx,ry] ·
   p polygon [points]; last string is the fill, optional trailing opacity. */
const SPEC = {
  /* ---- map ---- */
  'map:dig': { base: '#c9a15a', u: [['r', 8, 5, 18, 26, '#3a332b'], ['p', '13,4 18,6 15,19 10,17', WOOD_LT], ['e', 11.5, 23, 5, 6, '#98a2b0']] },
  'map:elite': { base: BONE, o: [['r', 5, 1, 24, 11, GOLD]] },
  'map:event': { base: '#7a5cb8', o: [['c', 17, 17, 14, '#8f6fd0'], ['c', 17, 17, 8.5, '#5c4392'], ['r', 11, 6, 12, 20, GOLD_LT]] },
  'map:shop': { base: '#d9b269', u: [['e', 17, 20, 11, 10, '#a67c3a'], ['r', 9, 1, 16, 8, '#6d4d2b']], o: [['c', 17, 20, 7, GOLD_LT]] },
  'map:treasure': { base: '#c9973b', u: [['r', 4, 5, 26, 24, '#7d5630'], ['r', 3, 13, 28, 4.5, GOLD_DK]], o: [['c', 17, 17.5, 3.9, GOLD_LT]] },
  'map:camp': { base: FLAME, o: [['e', 17, 13, 5, 8, FLAME_HOT], ['r', 3, 23, 28, 10, WOOD]] },
  'map:boss': { base: '#b03a30', o: [
    ['p', '0,2 10,6 6,16 0,12', '#dbcfb2'], ['p', '24,6 34,2 34,12 28,16', '#dbcfb2'],
    ['r', 10, 0, 14, 9, GOLD], ['r', 9, 23, 16, 10, BONE],
  ] },
  /* ---- enemies ---- */
  'enemy:grubber': { base: '#cec084', o: [['e', 18, 10, 10, 5, '#e0d49a'], ['e', 8, 18, 6, 6, '#d8bc8e']] },
  'enemy:minelayer': { base: '#7b5fc0', o: [['c', 17, 7.5, 6, IRON], ['c', 23, 2.5, 2.2, FLAME_HOT]] },
  'enemy:warden': { base: STEEL, o: [['r', 10, 0, 14, 9, STEEL_LT], ['c', 27.5, 19, 6, BRASS], ['r', 8, 26, 18, 8, '#8b95a5']] },
  'enemy:wisp': { base: '#a5dce8', o: [['e', 17, 12, 9, 8, '#d0f0f4']] },
  'enemy:shade': { base: '#b9bfd8', o: [['r', 4, 0, 26, 12, '#8f96b8']] },
  'enemy:tunneler': { base: '#8b6a49', o: [['r', 8, 1, 17, 8, GOLD], ['r', 2, 22, 30, 10, '#dcccb2'], ['e', 19, 15, 4, 3, '#d8a090']] },
  'enemy:clockwork': { base: '#8fb4cc', o: [['c', 17, 8.5, 6.5, '#ece6cf'], ['r', 10, 19, 14, 8, '#6f92aa']] },
  'enemy:gearhusk': { base: '#b08a50', o: [['c', 17, 10, 10, '#8a683a'], ['c', 17, 10, 5.5, '#d9cdb1'], ['r', 6, 27, 22, 7, '#8a683a']] },
  'enemy:ossuary': { base: BONE, o: [['r', 6, 22, 22, 12, BONE_DK]] },
  'enemy:miscounter': { base: WOOD, o: [['r', 7, 7, 20, 6, RED], ['r', 7, 13, 20, 6, GOLD], ['r', 7, 19, 20, 7, '#58a89a']] },
  'enemy:detonata': { base: IRON, o: [['c', 13, 16, 7, IRON_LT], ['r', 22, 0, 11, 10, FLAME_HOT], ['r', 19, 7, 6, 5, '#8b95a5']] },
  'enemy:collapser': { base: '#99a191', o: [['c', 23.5, 7.5, 5, '#cdd2c6'], ['c', 9, 19, 3.2, MOSS], ['c', 20, 27, 2.6, MOSS]] },
  'enemy:fogfather': { base: '#a3bcb0', o: [['p', '11,5 23,5 25,22 9,22', '#47665c'], ['c', 17, 11, 3.2, '#d9e2d4']] },
  'enemy:nn99': { base: '#ddd5be', o: [['r', 0, 26, 34, 8, '#8b6a49'], ['e', 20, 8, 8, 5, '#cabfe8', .55]] },
  /* ---- interface ---- */
  'interface:health': { base: '#d84556', o: [['e', 11, 10, 6, 5, '#f0808e']] },
  'interface:gold': { base: GOLD, u: [['e', 12, 17, 11, 10, '#a87c28']],
    n: [['p', '26.5,13.5 32,17.5 26.5,24.5 21,17.5', '#4aa8c8']],
    o: [['p', '19,12 34,12 27,26', CYAN], ['r', 4, 5, 16, 7, GOLD_LT]] },
  'interface:menu': { base: '#9ba8bd', o: [['r', 0, 13, 34, 5, '#b7c2d4']] },
  'interface:deck': { base: '#a8c0dc', u: [['r', 3, 3, 28, 24, '#48688f'], ['p', '11,19 23,19 21,34 9,34', SKIN]] },
  'interface:block': { base: '#6c96e8', o: [['r', 4, 2, 26, 6, '#9db8f0']] },
  'interface:plating': { base: STEEL_LT, u: [['r', 5, 7, 24, 22, '#5f6874'], ['r', 2, 4, 10, 8, '#8f6534'], ['r', 22, 4, 10, 8, '#8f6534']] },
  'interface:insight': { base: '#c8c4b0', u: [['e', 17, 15, 13, 8, '#ded9c8'], ['c', 17, 14.5, 5.5, '#3f96b4'], ['c', 17, 14.8, 2.6, '#23262c']] },
  'interface:mines': { base: '#8b95a5', u: [['c', 17, 17, 13.5, IRON], ['c', 13, 13, 4.5, IRON_LT]] },
  'interface:picks': { base: STEEL_LT, u: [['p', '2,1 32,1 31,13 3,13', '#6d7684'], ['p', '16,8 24,12 12,34 4,30', WOOD]],
    o: [['p', '16,8 24,12 12,34 4,30', WOOD_LT]] },
  'interface:energy': { base: '#f2cc4a', o: [['p', '8,2 16,2 10,18 6,16', '#f8e58a']] },
  'interface:turn': { base: WOOD_LT, u: [
    ['r', 7, 7, 20, 20, '#31424c'], ['p', '13,10 21,10 17,16', GOLD], ['p', '10,20 24,20 20,27 14,27', GOLD],
    ['r', 6, 1, 22, 6, WOOD], ['r', 6, 27, 22, 6, WOOD],
  ] },
  'interface:draw': { base: '#b09a72', u: [['r', 14, 2, 16, 26, PARCH], ['p', '2,10 14,10 16,34 2,34', SKIN]] },
  'interface:discard': { base: STEEL_LT, u: [['r', 5, 10, 24, 21, '#5f6874'], ['r', 4, 4, 26, 6, '#758090']] },
  'interface:exhaust': { base: '#cc6a50', u: [['r', 8, 2, 18, 29, PARCH]] },
  'interface:instinct': { base: '#d88ab0', o: [['e', 11, 13, 7, 6, '#e8aac6'], ['p', '20,22 28,22 26,30 18,28', '#b86f94']] },
  'interface:target': { base: '#d95043', o: [['c', 17, 17, 4, '#e87f6f']] },
  'interface:bag': { base: '#c99a62', u: [['e', 17, 18, 12, 13, '#8a6437'], ['r', 8, 2, 18, 9, '#6d4d2b'], ['r', 11, 20, 12, 9, '#75552e']] },
  'interface:log': { base: '#e0d8c0', u: [['r', 2, 3, 30, 28, '#a5895a']] },
  'interface:cards': { base: '#d8d2bc', u: [['r', 2, 4, 14, 26, '#c9c2a8'], ['r', 12, 4, 12, 26, '#b8b098'], ['r', 22, 4, 12, 26, '#5878a8']] },
  'interface:items': { base: '#c9b489', u: [
    ['r', 13, 1, 20, 15, '#a08a5f'], ['r', 3, 9, 11, 8, '#31424c'], ['r', 3, 16, 11, 13, '#3f8f68'],
    ['p', '15,23 33,26 31,32 15,29', GOLD_DK],
  ], o: [['r', 15, 21, 19, 12, GOLD]] },
  'interface:services': { base: STEEL_LT, u: [['p', '5,25 11,31 29,11 23,5', '#5f6874']] },
  'interface:puzzle': { base: '#7fb069', u: [['r', 5, 5, 24, 24, '#4d7a42']] },
  'interface:scan': { base: '#a8ccd8', u: [['p', '3,7 27,20 15,31 1,17', '#3f6a7a'], ['p', '12,22 20,26 26,34 8,34', IRON]],
    o: [['r', 22, 0, 12, 13, '#f0d048']] },
  'interface:upgrade': { base: STEEL, u: [['r', 2, 13, 30, 15, '#4f5764'], ['r', 11, 1, 12, 11, '#3f8f5c']],
    o: [['r', 10, 0, 14, 13, '#78d890']] },
  'interface:victory': { base: GOLD, u: [['e', 17, 10, 11, 8, GOLD_DK], ['r', 9, 22, 16, 11, '#8a6a20']], o: [['r', 8, 4, 8, 7, GOLD_LT]] },
  'interface:bossRelic': { base: GOLD, u: [['p', '5,7 29,7 28,28 6,28', '#9a7a1c']] },
  'interface:camp': { base: '#d98d55', u: [['p', '17,2 32,30 2,30', '#9a5c34'], ['c', 17, 26, 5, FLAME], ['c', 17, 27, 2.8, FLAME_HOT]] },
  'interface:buried': { base: '#c9bfa0', u: [
    ['r', 0, 21, 34, 13, '#6d5438'], ['p', '12,16 20,22 14,28 8,22', '#6d7684'], ['p', '22,0 28,4 18,20 14,16', WOOD_LT],
  ], o: [['r', 3, 1, 11, 11, RED]] },
  'interface:lair': { base: '#9aa096', u: [
    ['e', 17, 16, 14, 12, '#4a4f45'], ['e', 17, 18, 7, 8, '#22261f'], ['c', 26, 24, 5, BONE], ['e', 10, 5, 7, 3.5, MOSS],
  ] },
  'interface:attack': { base: '#c8d0da',
    n: [['p', '26,4 29,7 15,21 12,18', '#7d8794'], ['p', '8,23 11,26 6,31 3,28', WOOD]],
    o: [['p', '6,17 17,15 19,21 8,23', GOLD]] },
  'interface:defend': { base: GREEN, u: [['p', '6,3 28,3 27,20 17,30 7,20', '#3f6a3f'], ['r', 13, 8, 8, 16, BONE], ['r', 7, 14, 20, 6, BONE]],
    o: [['r', 13, 8, 8, 16, BONE], ['r', 7, 14, 20, 6, BONE]] },
  'interface:crater': { base: '#8a8f98', u: [['e', 17, 16, 11, 6, '#23262c']] },
  'interface:sentry': { base: '#c2b7a0', u: [['r', 8, 8, 18, 22, '#6f6656'], ['r', 4, 2, 26, 8, '#7d7462']] },
  'interface:bulwark': { base: '#b57448', o: [['r', 5, 8, 7, 5, '#c98a5c'], ['r', 17, 15, 8, 5, '#c98a5c'], ['r', 9, 22, 7, 5, '#c98a5c']] },
  'interface:relay': { base: STEEL_LT, u: [['p', '11,8 23,8 30,33 4,33', '#3f444f']],
    o: [['r', 0, 2, 8, 12, '#f0d048'], ['r', 26, 2, 8, 12, '#f0d048'], ['c', 17, 5, 2.5, '#d95043']] },
  'interface:grub': { base: '#b6c257', o: [['c', 10, 10, 5.5, '#e8e0c0']] },
  'interface:flag': { base: '#e0706a', u: [['r', 6, 1, 3.5, 32, '#5f6874']],
    n: [['p', '11,5 29,8 27,18 11,15', '#a83430']] },
  'interface:bomb': { base: '#8b95a5', u: [['c', 15, 18, 10.5, IRON], ['c', 12, 15, 4, IRON_LT]], o: [['r', 24, 0, 10, 9, FLAME_HOT]] },
  'interface:safe': { base: STEEL_LT, u: [['r', 4, 4, 26, 26, '#5f6874'], ['r', 8, 8, 18, 18, '#6d7684'], ['c', 16, 16, 4, GOLD]] },
  'interface:event': { base: '#e0d8c0', u: [['r', 6, 3, 22, 26, '#a5895a']], o: [['r', 9, 6, 14, 18, '#b898e0']] },
  'interface:shop': { base: '#d9b269', u: [['e', 17, 20, 11, 10, '#a67c3a'], ['r', 9, 1, 16, 8, '#6d4d2b']], o: [['c', 17, 20, 7, GOLD_LT]] },
  /* ---- camp ---- */
  'camp:rest': { base: '#c9a879', u: [['r', 2, 15, 30, 15, WOOD], ['r', 6, 17, 22, 8, '#4a6fa8'], ['c', 9, 16, 4, '#ded9c8']],
    o: [['r', 14, 0, 20, 12, GOLD_LT]] },
  'camp:smith': { base: STEEL, u: [['r', 2, 13, 30, 15, '#4f5764'], ['r', 6, 1, 10, 8, '#5f6874'], ['p', '13,6 30,10 29,14 12,10', WOOD]] },
  'camp:survey': { base: '#d0c8b0', u: [['p', '2,8 24,2 26,9 4,15', BRASS_DK]],
    n: [['p', '13.5,19 30.5,17.5 30,31 14.5,32', '#b09a6d']],
    o: [['p', '2,8 24,2 26,9 4,15', BRASS]] },
  'camp:train': { base: '#d9b269', u: [
    ['r', 9, 2, 16, 26, '#9a7438'], ['c', 17, 17, 6.5, RED], ['c', 17, 17, 2.7, '#e8e0c0'],
    ['r', 0, 12, 10, 4, WOOD], ['r', 24, 12, 10, 4, WOOD], ['r', 14, 26, 6, 8, WOOD],
  ] },
  /* ---- items ---- */
  'item:blastgoggles': { base: BRASS, u: [['c', 10.5, 19, 5.5, '#3f96b4'], ['c', 23.5, 19, 5.5, '#3f96b4']] },
  'item:dowsingcharm': { base: '#c9a25c', u: [['e', 17, 23, 5.5, 7.5, VIOLET], ['e', 15.5, 21, 2, 3, '#cdb2ec']] },
  'item:keystone': { base: '#b8b0d0', u: [['p', '7,3 25,3 28,29 6,29', '#6f6890']] },
  'item:emberjar': { base: '#c8d4d8', u: [
    ['r', 8, 13, 18, 19, '#3a4a50'], ['c', 17, 22, 5.5, FLAME], ['c', 17, 23, 3, FLAME_HOT],
    ['r', 10, 8, 14, 5, BRASS_DK], ['p', '10,0 24,0 22,9 12,9', FLAME], ['c', 17, 4, 3, FLAME_HOT],
  ] },
  'item:loadedcoin': { base: GOLD, u: [['c', 17, 17, 12, GOLD_DK], ['e', 16, 18, 7, 8, '#6d5518']] },
  'item:fieldkit': { base: '#e0685c', u: [
    ['r', 4, 9, 26, 21, '#9c3028'], ['r', 14, 13, 6, 12, '#efe9d8'], ['r', 10, 16, 14, 6, '#efe9d8'], ['r', 11, 2, 12, 7, '#7c261f'],
  ] },
  'item:indexcard': { base: '#e0d8c0', u: [['r', 4, 4, 26, 26, '#b8a070']] },
  'item:wardplate': { base: '#a3c0e4', u: [['p', '6,2 28,2 27,22 17,32 7,22', '#3f5f8f']] },
  'item:hexkey': { base: STEEL_LT, u: [['p', '3,25 8,31 29,11 24,5', '#5f6874']] },
  'item:gravebell': { base: '#d9a860', u: [['c', 17, 30, 2, BONE]],
    n: [['p', '12.5,7 21.5,7 25,21.5 9,21.5', BRASS_DK], ['r', 6, 22.5, 22, 3.2, '#7c5220']] },
  'item:luckycompass': { base: '#d9a860', u: [['c', 17, 18, 11.5, BRASS_DK], ['c', 17, 18, 8.5, '#463f33'], ['p', '13,12 21,24 18,26 11,14', RED]] },
  'item:quill': { base: '#e8ecf4', u: [['p', '3,21 10,26 4,32 0,27', '#5f6874']],
    n: [['p', '15,3 30,2.5 28,11 14,16', '#8890b8']] },
  'item:detector': { base: '#a8b888', u: [
    ['r', 7, 4, 20, 29, '#5a6a44'], ['r', 9, 6, 16, 7, GLASS], ['c', 17, 24, 4, BONE], ['r', 24, 0, 4, 8, '#8b95a5'],
  ] },
  'item:tally': { base: BONE },
  'item:pitons': { base: STEEL_LT, u: [['r', 2, 2, 10, 30, '#6d7684'], ['r', 16, 2, 14, 10, '#4f5764'], ['p', '18,10 26,12 20,32 14,30', WOOD]] },
  'item:canary': { base: '#d9a860', u: [
    ['e', 17, 17, 11, 13, '#332c22'], ['e', 15, 20, 6, 4.5, '#e0b830'], ['c', 19, 15, 3, '#e0b830'], ['r', 4, 28, 26, 6, '#7c5220'],
  ] },
  'item:lamp': { base: '#d9a860', u: [
    ['r', 9, 8, 16, 21, BRASS_DK], ['r', 11, 13, 12, 10, '#c89838'], ['c', 17, 19, 3, FLAME_HOT],
    ['r', 10, 2, 14, 6, '#7c5220'], ['r', 8, 28, 18, 6, '#7c5220'],
  ] },
  'item:dowsingrod': { base: WOOD_LT, u: [['p', '0,20 32,6 34,16 2,32', WOOD]] },
  'item:metaldetector': { base: STEEL_LT,
    n: [['p', '9,26.5 24.5,5 26.5,7 11,28.5', '#5f6874'], ['e', 9.5, 28, 7, 3, BRASS_DK], ['p', '23.5,5 27,3 29.5,6 26,9', '#8a4a42']] },
  'item:chalk': { base: '#eee8d8', u: [['p', '6,22 24,4 30,10 12,28', '#d5cfba']] },
  'item:nitro': { base: '#e0706a', u: [
    ['p', '6,26 22,6 30,14 14,34', '#a83430'], ['p', '12,14 24,20 21,26 9,20', '#d8ccae'], ['r', 22, 4, 6, 6, '#6d7684'],
  ], o: [['r', 26, 0, 8, 7, FLAME_HOT]] },
  'item:platingdraught': { base: '#b9cfd8', u: [
    ['r', 4, 10, 15, 21, '#31424c'], ['r', 4, 19, 15, 12, VIOLET], ['r', 7, 2, 9, 7, WOOD], ['p', '18,12 33,12 32,26 25,33 19,26', '#3f5f8f'],
  ] },
  'item:smokebomb': { base: '#c2cbd8', u: [['c', 14, 21, 9.5, IRON], ['c', 11, 18, 3.5, IRON_LT], ['r', 14, 0, 20, 13, '#8890a0']] },
};

/* uniform finishing: soft floor shadow + top-left sheen over the whole icon */
const SHADE = ['r', 0, 22, 34, 12, '#000000', .14];
const LIGHT = ['e', 12, 8.5, 11, 6.5, '#ffffff', .12];

const GEOM_ARGS = { r: 4, c: 3, e: 4, p: 1 };
function shapeSvg(shape) {
  const [kind, ...rest] = shape;
  const fill = rest[GEOM_ARGS[kind]];
  const opacity = typeof rest[GEOM_ARGS[kind] + 1] === 'number' ? rest[GEOM_ARGS[kind] + 1] : null;
  if (typeof fill !== 'string' || !/^#|^rgb/.test(fill)) throw new Error(`Bad fill in ${JSON.stringify(shape)}`);
  const attrs = `fill="${fill}"${opacity != null ? ` opacity="${opacity}"` : ''}`;
  if (kind === 'r') return `<rect x="${rest[0]}" y="${rest[1]}" width="${rest[2]}" height="${rest[3]}" ${attrs}/>`;
  if (kind === 'c') return `<circle cx="${rest[0]}" cy="${rest[1]}" r="${rest[2]}" ${attrs}/>`;
  if (kind === 'e') return `<ellipse cx="${rest[0]}" cy="${rest[1]}" rx="${rest[2]}" ry="${rest[3]}" ${attrs}/>`;
  if (kind === 'p') return `<polygon points="${rest[0]}" ${attrs}/>`;
  throw new Error(`Unknown shape kind ${kind}`);
}

/* ---------------- assembly ---------------- */

const svg = await readFile(src, 'utf8');
const slots = atlasSlots('all');
const viewBox = svg.match(/viewBox="([\d. ]+)"/)[1].split(' ').map(Number);
const tileW = viewBox[2] / ATLAS_LAYOUT.columns;
const tileH = viewBox[3] / ATLAS_LAYOUT.rows;
const unit = tileW / 33.8667; // spec coordinates are authored on a ~34-unit tile

const paths = [...svg.matchAll(/<path\b[^>]*?\/>/gs)];
if (paths.length !== slots.length) {
  throw new Error(`Expected ${slots.length} paths, found ${paths.length} — the sheet layout changed.`);
}

const icons = new Map();
for (const match of paths) {
  const d = match[0].match(/\bd="([^"]+)"/)[1];
  const [, x, y] = d.match(/^[mM]\s*([-\d.eE+]+)[,\s]+([-\d.eE+]+)/);
  const slot = slots[Math.floor(Number(y) / tileH) * ATLAS_LAYOUT.columns + Math.floor(Number(x) / tileW)];
  if (!slot) throw new Error('Path landed on an unused tile');
  const key = `${slot.domain}:${slot.key}`;
  if (icons.has(key)) throw new Error(`Two paths claim ${key}`);
  icons.set(key, { element: match[0], d });
}
const missing = slots.map(s => `${s.domain}:${s.key}`).filter(k => !icons.has(k));
if (missing.length) throw new Error(`Slots with no path: ${missing.join(', ')}`);

function buildSheet(specFor, shade, light, outPath) {
  let index = 0;
  const defs = [];
  let coloured = svg;
  for (const [key, icon] of icons) {
    const spec = specFor(key);
    if (!spec) throw new Error(`No colour spec for ${key}`);
    const id = `mi${index++}`;
    const start = icon.d.match(/^[mM]\s*([-\d.eE+]+)[,\s]+([-\d.eE+]+)/);
    const tx = Math.floor(Number(start[1]) / tileW) * tileW;
    const ty = Math.floor(Number(start[2]) / tileH) * tileH;
    const local = shapes => `<g transform="translate(${fmt(tx)} ${fmt(ty)}) scale(${unit.toFixed(5)})">${shapes.map(shapeSvg).join('')}</g>`;

    let block = '';
    if (spec.n) block += local(spec.n); // hand-fitted underpaint for open-stroke pockets
    if (spec.u) { // underpaint below the line art, held inside the outer silhouette
      defs.push(`<clipPath id="s-${id}"><path d="${silhouetteD(icon.d)}" clip-rule="nonzero"/></clipPath>`);
      block += `<g clip-path="url(#s-${id})">${local(spec.u)}</g>`;
    }
    block += icon.element.replaceAll('fill:#ffffff', `fill:${spec.base}`);
    defs.push(`<clipPath id="c-${id}"><path d="${icon.d}" clip-rule="evenodd"/></clipPath>`);
    /* line-work tints hug the drawn strokes; shadow+sheen cover the whole icon
       (silhouette when underpainted, the body alone when solid) */
    if (spec.o) block += `<g clip-path="url(#c-${id})">${local(spec.o)}</g>`;
    if (shade && light) block += `<g clip-path="url(#${spec.u ? `s-${id}` : `c-${id}`})">${local([shade, light])}</g>`;

    coloured = coloured.replace(icon.element, block);
  }
  coloured = coloured.replace('<defs\n     id="defs1" />', `<defs id="defs1">${defs.join('')}</defs>`);
  if (!coloured.includes('clipPath')) throw new Error('defs insertion failed — check the defs element markup.');
  return writeFile(outPath, coloured).then(() => console.log(`Coloured ${icons.size} icons (${defs.length} clips) -> ${outPath}`));
}

/* ---------------- emoji-style variant ----------------
   Same drawings, restyled the way emoji art works: candy-saturated fills, a
   big glossy top-light, and the line work recoloured to a darker shade of the
   icon's own dominant colour instead of pale ink. */

function hexToHsl(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255, g = parseInt(hex.slice(3, 5), 16) / 255, b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? ((g - b) / d + (g < b ? 6 : 0)) / 6 : max === g ? ((b - r) / d + 2) / 6 : ((r - g) / d + 4) / 6;
  return { h, s, l };
}
function hslToHex({ h, s, l }) {
  const f = n => {
    const k = (n + h * 12) % 12;
    const c = l - s * Math.min(l, 1 - l) * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(c * 255).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}
const candy = hex => {
  const c = hexToHsl(hex);
  return hslToHex({ h: c.h, s: Math.min(1, c.s * 1.5 + 0.05), l: Math.min(0.92, c.l * 1.1 + 0.05) });
};
const outlineOf = hex => {
  const c = hexToHsl(hex);
  return hslToHex({ h: c.h, s: Math.min(1, c.s * 1.3 + 0.06), l: Math.max(0.17, c.l * 0.45) });
};

/* dominant = area-weighted largest mid-tone fill across the icon's layers */
function shapeArea(shape) {
  const [kind, ...rest] = shape;
  if (kind === 'r') return rest[2] * rest[3];
  if (kind === 'c') return Math.PI * rest[2] * rest[2];
  if (kind === 'e') return Math.PI * rest[2] * rest[3];
  const pts = rest[0].split(' ').map(pair => pair.split(',').map(Number));
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % pts.length];
    area += x1 * y2 - x2 * y1;
  }
  return Math.abs(area / 2);
}
function dominantFill(spec) {
  let best = null, bestArea = 0;
  for (const shape of [...(spec.u || []), ...(spec.n || []), ...(spec.o || [])]) {
    const fill = shape[GEOM_ARGS[shape[0]] + 1]; // +1: index 0 is the shape kind
    const { l } = hexToHsl(fill);
    if (l < 0.22 || l > 0.88) continue; // ignore shadow pits and paper whites
    const area = shapeArea(shape);
    if (area > bestArea) { bestArea = area; best = fill; }
  }
  return best;
}

/* icons whose line work must keep contrast against their own dark fills */
const EMOJI_BASE_OVERRIDES = {
  'item:luckycompass': '#f2e2b8', // letters sit on the dark face
  'item:canary': '#f0cc78',       // cage bars against the dark interior
  'map:dig': '#e8c070',           // arch stones against the dark doorway
  'interface:relay': '#e8edf4',   // lattice against its dark fill
  'item:keystone': '#ded8f0',     // rune edge against the dark stone
  'interface:lair': '#c2c8bc',    // cave rim against the dark mouth
  'interface:crater': '#aab0ba',  // rim lines against the dark pit
};

function emojiSpecFor(key) {
  const spec = SPEC[key];
  const restyle = shapes => shapes?.map(shape => {
    const next = [...shape]; // opacity slot (if any) rides along untouched
    const ix = GEOM_ARGS[shape[0]] + 1; // +1: index 0 is the shape kind
    next[ix] = candy(shape[ix]);
    return next;
  });
  const solid = !spec.u && !spec.n;
  const dominant = dominantFill(spec) || spec.base;
  const base = EMOJI_BASE_OVERRIDES[key] || (solid ? candy(spec.base) : outlineOf(dominant));
  return { base, u: restyle(spec.u), n: restyle(spec.n), o: restyle(spec.o) };
}

const EMOJI_SHADE = ['r', 0, 22, 34, 12, '#000000', .10];
const EMOJI_LIGHT = ['e', 12, 8, 12, 7, '#ffffff', .24];

/* ---------------- clean line-art variant ----------------
   Pure strokes, no fills and no shading: each icon's line work in one clean
   colour taken from its dominant material, lightness-clamped so every icon
   reads on the dark board. */
function lineSpecFor(key) {
  const spec = SPEC[key];
  const c = hexToHsl(dominantFill(spec) || spec.base);
  return { base: hslToHex({
    h: c.h,
    s: Math.min(0.85, c.s * 1.15 + 0.05),
    l: Math.min(0.82, Math.max(0.62, c.l)),
  }) };
}

await buildSheet(key => SPEC[key], SHADE, LIGHT, out);
await buildSheet(emojiSpecFor, EMOJI_SHADE, EMOJI_LIGHT,
  resolve(here, '../src/assets/icon-atlas/sets/main-icons-emoji.svg'));
await buildSheet(lineSpecFor, null, null,
  resolve(here, '../src/assets/icon-atlas/sets/main-icons-line.svg'));
