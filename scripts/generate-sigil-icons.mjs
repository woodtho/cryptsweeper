/* An original icon set: 89 geometric monoline "sigil" drawings, one per atlas
   slot, designed from scratch for this game (not derived from the artist's
   main sheet). Angular, symmetric, minimal — a deliberate counterpoint to the
   hand-drawn main set. Each icon is authored below as primitives in a 34-unit
   tile space, one material colour plus an optional accent.

   node scripts/generate-sigil-icons.mjs */
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { ATLAS_LAYOUT, atlasSlots } from '../src/ui/iconSets.js';

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, '../src/assets/icon-atlas/sets/sigil-icons.svg');

const GOLD = '#e0b23c', BONE = '#e2d9c0', STEEL = '#aab4c2', RED = '#d8564a',
  FLAME = '#eb9a42', CYAN = '#7fc9dc', GREEN = '#84bd7c', VIOLET = '#a98bd4',
  WOOD = '#b9855a', PINK = '#d893b4', MOSS = '#8fae6a', FOG = '#a9c0b4';

/* Primitives (coords in 0..34 tile space; 'a' suffix = accent colour):
   s  stroke path        f  filled path
   c  stroke circle      C  filled circle
   l  line               G  stroke polygon (closed)   g  filled polygon */
const ICONS = {
  /* ---------------- map ---------------- */
  'map:dig': { col: STEEL, acc: WOOD, draw: [ // pick striking cracked ground
    ['s', 'M7 6 Q17 1 27 6', 0], ['l', 17, 4, 12, 26, 'a'],
    ['l', 4, 29, 30, 29], ['l', 14, 29, 11, 33], ['l', 20, 29, 24, 33], ['l', 17, 29, 17, 32],
  ] },
  'map:elite': { col: BONE, acc: RED, draw: [ // horned war-helm
    ['s', 'M9 12 Q9 5 17 5 Q25 5 25 12 L25 24 L9 24 Z'],
    ['s', 'M9 10 Q3 8 4 2'], ['s', 'M25 10 Q31 8 30 2'],
    ['l', 12, 17, 15, 17, 'a'], ['l', 19, 17, 22, 17, 'a'], ['l', 17, 24, 17, 29],
  ] },
  'map:event': { col: VIOLET, acc: CYAN, draw: [ // scrying orb on stand
    ['c', 17, 14, 9], ['s', 'M12 12 Q17 8 22 12 Q19 16 12 12', 'a'],
    ['l', 10, 27, 24, 27], ['s', 'M13 23 L21 23'],
    ['C', 26, 5, 1.3, 'a'], ['C', 7, 9, 1, 'a'],
  ] },
  'map:shop': { col: GOLD, acc: BONE, draw: [ // merchant scales
    ['l', 17, 4, 17, 26], ['l', 8, 8, 26, 8], ['l', 11, 28, 23, 28],
    ['s', 'M4 15 Q8 20 12 15', 'a'], ['l', 8, 8, 4, 15, 'a'], ['l', 8, 8, 12, 15, 'a'],
    ['s', 'M22 15 Q26 20 30 15', 'a'], ['l', 26, 8, 22, 15, 'a'], ['l', 26, 8, 30, 15, 'a'],
  ] },
  'map:treasure': { col: CYAN, acc: GOLD, draw: [ // faceted gem
    ['G', '17,4 28,12 22,29 12,29 6,12'], ['l', 6, 12, 28, 12],
    ['l', 17, 4, 12, 12], ['l', 17, 4, 22, 12], ['l', 12, 12, 17, 29], ['l', 22, 12, 17, 29],
    ['C', 10, 8, 1, 'a'],
  ] },
  'map:camp': { col: FLAME, acc: BONE, draw: [ // tent under a moon
    ['G', '17,6 30,29 4,29'], ['l', 17, 6, 17, 29], ['l', 13, 29, 17, 20], ['l', 21, 29, 17, 20],
    ['s', 'M27 4 A5 5 0 1 0 31 10 A4 4 0 0 1 27 4', 'a'],
  ] },
  'map:boss': { col: RED, acc: GOLD, draw: [ // crowned descent gate
    ['G', '5,10 11,14 17,8 23,14 29,10 27,20 7,20', 'a'],
    ['l', 9, 24, 25, 24], ['l', 11, 28, 23, 28], ['l', 14, 32, 20, 32],
  ] },
  /* ---------------- enemies ---------------- */
  'enemy:grubber': { col: GOLD, acc: PINK, draw: [ // burrowing worm
    ['C', 8, 24, 4.5], ['C', 14, 21, 5.2], ['C', 21, 17, 6],
    ['c', 26, 12, 4], ['C', 27.5, 10.5, 1, 'a'], ['s', 'M28 5 Q30 3 29 1', 'a'],
  ] },
  'enemy:minelayer': { col: VIOLET, acc: RED, draw: [ // spider with a payload
    ['c', 17, 14, 6], ['C', 17, 25, 3, 'a'],
    ['l', 12, 11, 4, 5], ['l', 12, 15, 3, 15], ['l', 13, 18, 6, 25],
    ['l', 22, 11, 30, 5], ['l', 22, 15, 31, 15], ['l', 21, 18, 28, 25],
  ] },
  'enemy:warden': { col: STEEL, acc: GOLD, draw: [ // sealed visor shield
    ['s', 'M17 3 L29 8 L29 18 Q29 27 17 31 Q5 27 5 18 L5 8 Z'],
    ['l', 10, 14, 24, 14, 'a'], ['l', 17, 19, 17, 25],
  ] },
  'enemy:wisp': { col: CYAN, acc: BONE, draw: [ // wandering flame
    ['s', 'M17 4 Q24 12 20 18 Q26 17 25 23 Q24 29 17 29 Q10 29 9 23 Q8 17 14 18 Q10 12 17 4'],
    ['C', 14, 22, 1.2, 'a'], ['C', 20, 22, 1.2, 'a'],
  ] },
  'enemy:shade': { col: VIOLET, acc: BONE, draw: [ // hooded absence
    ['s', 'M8 30 Q6 8 17 5 Q28 8 26 30'], ['s', 'M12 30 Q12 24 17 24 Q22 24 22 30'],
    ['C', 13, 15, 1.4, 'a'], ['C', 21, 15, 1.4, 'a'],
  ] },
  'enemy:tunneler': { col: WOOD, acc: STEEL, draw: [ // claws breaching the floor
    ['l', 3, 27, 31, 27], ['s', 'M4 32 Q17 29 30 32'],
    ['g', '8,27 10,15 13,27', 'a'], ['g', '15,27 17,11 19,27', 'a'], ['g', '21,27 24,15 26,27', 'a'],
  ] },
  'enemy:clockwork': { col: STEEL, acc: GOLD, draw: [ // ticking gear
    ['c', 17, 17, 9], ['l', 17, 4, 17, 8], ['l', 17, 26, 17, 30], ['l', 4, 17, 8, 17],
    ['l', 26, 17, 30, 17], ['l', 8, 8, 11, 11], ['l', 26, 26, 23, 23], ['l', 26, 8, 23, 11], ['l', 8, 26, 11, 23],
    ['l', 17, 17, 17, 11, 'a'], ['l', 17, 17, 22, 19, 'a'], ['C', 17, 17, 1.2, 'a'],
  ] },
  'enemy:gearhusk': { col: WOOD, acc: STEEL, draw: [ // gear with dead teeth
    ['c', 17, 17, 8.5], ['l', 17, 5, 17, 8.5], ['l', 5, 17, 8.5, 17], ['l', 17, 25.5, 17, 29],
    ['l', 25.5, 17, 29, 17], ['l', 9, 9, 11.5, 11.5],
    ['s', 'M13 17 L21 17 M17 13 L17 21', 'a'], ['s', 'M23 25 L29 31', 'a'],
  ] },
  'enemy:ossuary': { col: BONE, acc: STEEL, draw: [ // crossed bones and a watcher
    ['l', 8, 12, 26, 28], ['l', 26, 12, 8, 28],
    ['C', 7, 11, 2], ['C', 10, 8, 2], ['C', 27, 11, 2], ['C', 24, 8, 2],
    ['C', 7, 29, 2], ['C', 10, 32, 2], ['C', 27, 29, 2], ['C', 24, 32, 2],
    ['C', 17, 5, 1.4, 'a'],
  ] },
  'enemy:miscounter': { col: WOOD, acc: RED, draw: [ // abacus telling lies
    ['G', '6,8 28,8 28,26 6,26'], ['l', 6, 14, 28, 14], ['l', 6, 20, 28, 20],
    ['C', 11, 14, 2, 'a'], ['C', 17, 14, 2, 'a'], ['C', 23, 20, 2, 'a'], ['C', 26, 31, 2, 'a'],
  ] },
  'enemy:detonata': { col: STEEL, acc: FLAME, draw: [ // eager bomb
    ['c', 15, 20, 8.5], ['s', 'M20 13 Q23 9 26 8'],
    ['l', 26, 8, 24, 4, 'a'], ['l', 26, 8, 30, 6, 'a'], ['l', 26, 8, 29, 11, 'a'],
    ['l', 11, 18, 15, 22], ['l', 15, 18, 11, 22],
  ] },
  'enemy:collapser': { col: VIOLET, acc: 0, draw: [ // the spiral down
    ['s', 'M17 17 Q22 15 21 11 Q19 6 13 8 Q6 11 8 19 Q10 28 20 27 Q30 25 29 14'],
  ] },
  'enemy:fogfather': { col: FOG, acc: GOLD, draw: [ // bell sunk in fog
    ['s', 'M11 16 Q11 7 17 7 Q23 7 23 16 L25 19 L9 19 Z'],
    ['C', 17, 22, 1.4, 'a'],
    ['l', 4, 26, 30, 26], ['l', 7, 30, 27, 30], ['l', 11, 34, 23, 34],
  ] },
  'enemy:nn99': { col: CYAN, acc: RED, draw: [ // the counting machine's eye
    ['G', '17,3 29,10 29,24 17,31 5,24 5,10'],
    ['c', 17, 17, 5], ['C', 17, 17, 1.6, 'a'],
    ['l', 17, 3, 17, 8], ['l', 5, 24, 10, 21], ['l', 29, 24, 24, 21],
  ] },
  /* ---------------- interface ---------------- */
  'interface:health': { col: RED, acc: 0, draw: [
    ['f', 'M17 29 L6 18 Q2 13 6 9 Q11 4 17 11 Q23 4 28 9 Q32 13 28 18 Z'],
  ] },
  'interface:gold': { col: GOLD, acc: 0, draw: [
    ['c', 17, 17, 11], ['g', '17,10 23,17 17,24 11,17'],
  ] },
  'interface:menu': { col: STEEL, acc: 0, draw: [
    ['l', 7, 9, 27, 9], ['l', 7, 17, 27, 17], ['l', 7, 25, 27, 25],
  ] },
  'interface:deck': { col: CYAN, acc: BONE, draw: [
    ['G', '8,6 22,6 22,24 8,24'], ['G', '12,10 26,10 26,28 12,28', 'a'],
  ] },
  'interface:block': { col: CYAN, acc: 0, draw: [
    ['s', 'M17 3 L29 8 L29 18 Q29 27 17 31 Q5 27 5 18 L5 8 Z'], ['l', 17, 8, 17, 26],
  ] },
  'interface:plating': { col: WOOD, acc: STEEL, draw: [ // riveted scale plates
    ['s', 'M5 7 Q17 13 29 7'], ['s', 'M5 15 Q17 21 29 15'], ['s', 'M5 23 Q17 29 29 23'],
    ['C', 17, 10, 1.2, 'a'], ['C', 10, 17, 1.2, 'a'], ['C', 24, 17, 1.2, 'a'], ['C', 17, 26, 1.2, 'a'],
  ] },
  'interface:insight': { col: CYAN, acc: GOLD, draw: [
    ['s', 'M4 17 Q17 6 30 17 Q17 28 4 17 Z'], ['c', 17, 17, 4.5], ['C', 17, 17, 1.5, 'a'],
  ] },
  'interface:mines': { col: RED, acc: 0, draw: [
    ['c', 17, 17, 8], ['l', 17, 5, 17, 9], ['l', 17, 25, 17, 29], ['l', 5, 17, 9, 17],
    ['l', 25, 17, 29, 17], ['l', 9, 9, 12, 12], ['l', 25, 25, 22, 22], ['l', 25, 9, 22, 12], ['l', 9, 25, 12, 22],
  ] },
  'interface:picks': { col: STEEL, acc: WOOD, draw: [
    ['s', 'M5 12 Q12 3 22 5'], ['l', 13, 4, 8, 30, 'a'],
    ['s', 'M29 12 Q22 3 12 5'], ['l', 21, 4, 26, 30, 'a'],
  ] },
  'interface:energy': { col: GOLD, acc: 0, draw: [
    ['g', '19,3 9,19 15,19 13,31 25,15 18,15'],
  ] },
  'interface:turn': { col: CYAN, acc: 0, draw: [
    ['s', 'M26 10 A11 11 0 1 0 28 20'], ['g', '26,4 26,12 19,9'],
  ] },
  'interface:draw': { col: GREEN, acc: BONE, draw: [
    ['G', '10,5 24,5 24,25 10,25'], ['l', 17, 10, 17, 20, 'a'], ['s', 'M13 16 L17 21 L21 16', 'a'],
    ['l', 8, 30, 26, 30],
  ] },
  'interface:discard': { col: RED, acc: BONE, draw: [
    ['G', '10,5 24,5 24,25 10,25'], ['l', 13, 11, 21, 19, 'a'], ['l', 21, 11, 13, 19, 'a'],
    ['s', 'M8 30 Q17 33 26 30'],
  ] },
  'interface:exhaust': { col: FLAME, acc: RED, draw: [ // card burning away
    ['s', 'M10 8 L10 26 L24 26 L24 14'], ['s', 'M24 14 Q24 6 17 8 Q19 3 14 4', 'a'],
    ['l', 13, 14, 19, 14], ['l', 13, 19, 21, 19],
  ] },
  'interface:instinct': { col: PINK, acc: 0, draw: [ // paw
    ['C', 9, 12, 2.6], ['C', 15, 8, 2.6], ['C', 21, 8, 2.6], ['C', 27, 12, 2.6],
    ['f', 'M11 24 Q11 17 18 17 Q25 17 25 24 Q25 29 18 29 Q11 29 11 24'],
  ] },
  'interface:target': { col: RED, acc: 0, draw: [
    ['c', 17, 17, 8], ['l', 17, 3, 17, 11], ['l', 17, 23, 17, 31],
    ['l', 3, 17, 11, 17], ['l', 23, 17, 31, 17], ['C', 17, 17, 1.6],
  ] },
  'interface:bag': { col: WOOD, acc: GOLD, draw: [ // satchel with a buckled flap
    ['s', 'M6 13 L28 13 L30 29 L4 29 Z'], ['s', 'M6 13 Q6 18 12 18 L22 18 Q28 18 28 13'],
    ['C', 17, 22, 1.6, 'a'], ['s', 'M12 13 Q12 7 17 7 Q22 7 22 13'],
  ] },
  'interface:log': { col: BONE, acc: 0, draw: [
    ['s', 'M9 4 Q6 4 6 7 L6 27 Q6 30 9 30 L25 30 Q28 30 28 27 L28 7 Q28 4 25 4 Z'],
    ['l', 11, 10, 23, 10], ['l', 11, 15, 23, 15], ['l', 11, 20, 20, 20], ['l', 11, 25, 17, 25],
  ] },
  'interface:cards': { col: CYAN, acc: 0, draw: [
    ['G', '5,9 14,6 19,22 10,25'], ['G', '15,6 24,6 24,22 15,22'], ['G', '20,6 29,9 24,25 15,22'],
  ] },
  'interface:items': { col: GREEN, acc: VIOLET, draw: [ // flask
    ['s', 'M14 4 L20 4 M15 4 L15 12 L9 24 Q7 30 13 30 L21 30 Q27 30 25 24 L19 12 L19 4'],
    ['s', 'M11 22 L23 22', 'a'], ['C', 15, 26, 1.2, 'a'],
  ] },
  'interface:services': { col: STEEL, acc: 0, draw: [ // open-end wrench
    ['s', 'M21 4 A6.5 6.5 0 1 0 28.5 12'], ['l', 19.5, 12.5, 8, 26], ['C', 7.2, 27, 2.6],
  ] },
  'interface:puzzle': { col: GREEN, acc: 0, draw: [
    ['s', 'M8 12 L14 12 Q11 6 17 6 Q23 6 20 12 L26 12 L26 18 Q31 15 31 21 Q31 27 26 24 L26 30 L8 30 Z'],
  ] },
  'interface:scan': { col: CYAN, acc: GOLD, draw: [
    ['s', 'M8 26 A13 13 0 0 1 8 8'], ['s', 'M13 22 A7 7 0 0 1 13 12'],
    ['C', 17, 17, 1.8, 'a'], ['l', 17, 17, 29, 8, 'a'],
  ] },
  'interface:upgrade': { col: GREEN, acc: 0, draw: [
    ['s', 'M7 18 L17 8 L27 18'], ['s', 'M7 27 L17 17 L27 27'],
  ] },
  'interface:victory': { col: GOLD, acc: 0, draw: [ // star over laurel
    ['g', '17,4 19.4,11 27,11 21,15.6 23.3,23 17,18.5 10.7,23 13,15.6 7,11 14.6,11'],
    ['s', 'M6 24 Q10 30 17 30 Q24 30 28 24'],
  ] },
  'interface:bossRelic': { col: GOLD, acc: RED, draw: [
    ['G', '6,10 12,15 17,7 22,15 28,10 26,24 8,24'], ['C', 17, 20, 1.5, 'a'],
  ] },
  'interface:camp': { col: FLAME, acc: WOOD, draw: [
    ['s', 'M17 5 Q22 12 19 16 Q24 15 23 21 Q22 26 17 26 Q12 26 11 21 Q10 15 15 16 Q12 12 17 5'],
    ['l', 6, 31, 28, 27, 'a'], ['l', 6, 27, 28, 31, 'a'],
  ] },
  'interface:buried': { col: WOOD, acc: BONE, draw: [
    ['s', 'M4 29 Q17 21 30 29'], ['l', 13, 10, 21, 18, 'a'], ['l', 21, 10, 13, 18, 'a'],
  ] },
  'interface:lair': { col: MOSS, acc: GOLD, draw: [
    ['s', 'M5 29 L5 17 Q5 6 17 6 Q29 6 29 17 L29 29'],
    ['C', 13, 20, 1.5, 'a'], ['C', 21, 20, 1.5, 'a'],
  ] },
  'interface:attack': { col: STEEL, acc: WOOD, draw: [
    ['l', 25, 5, 11, 22], ['l', 25, 5, 27, 9], ['l', 8, 19, 14, 25],
    ['l', 9, 24, 5, 29, 'a'], ['C', 4, 30, 1.2, 'a'],
  ] },
  'interface:defend': { col: GREEN, acc: 0, draw: [
    ['s', 'M17 3 L29 8 L29 18 Q29 27 17 31 Q5 27 5 18 L5 8 Z'], ['s', 'M11 16 L16 21 L24 12'],
  ] },
  'interface:crater': { col: STEEL, acc: 0, draw: [
    ['s', 'M8 22 Q8 15 17 15 Q26 15 26 22 Q26 27 17 27 Q8 27 8 22'],
    ['l', 10, 12, 7, 7], ['l', 17, 11, 17, 5], ['l', 24, 12, 27, 7],
  ] },
  'interface:sentry': { col: BONE, acc: GOLD, draw: [
    ['G', '12,10 22,10 24,30 10,30'], ['l', 9, 10, 25, 10],
    ['l', 12, 5, 12, 10], ['l', 17, 5, 17, 10], ['l', 22, 5, 22, 10],
    ['C', 17, 17, 1.6, 'a'], ['l', 17, 21, 17, 26, 'a'],
  ] },
  'interface:bulwark': { col: FLAME, acc: 0, draw: [
    ['G', '5,10 29,10 29,28 5,28'], ['l', 5, 16, 29, 16], ['l', 5, 22, 29, 22],
    ['l', 13, 10, 13, 16], ['l', 21, 10, 21, 16], ['l', 9, 16, 9, 22], ['l', 25, 16, 25, 22],
    ['l', 13, 22, 13, 28], ['l', 21, 22, 21, 28],
  ] },
  'interface:relay': { col: STEEL, acc: GOLD, draw: [
    ['l', 17, 8, 17, 30], ['l', 11, 30, 23, 30], ['l', 17, 14, 11, 30], ['l', 17, 14, 23, 30],
    ['s', 'M11 8 Q17 3 23 8', 'a'], ['s', 'M8 12 Q17 5 26 12', 'a'], ['C', 17, 8, 1.4, 'a'],
  ] },
  'interface:grub': { col: GOLD, acc: WOOD, draw: [ // worm surfacing from its burrow
    ['l', 4, 22, 30, 22, 'a'], ['s', 'M9 32 Q9 26 13 26 Q17 26 17 30', 'a'],
    ['c', 21, 15, 5], ['C', 23, 13, 1.1], ['s', 'M24 11 Q26 9 25 6'],
  ] },
  'interface:flag': { col: RED, acc: STEEL, draw: [
    ['l', 9, 4, 9, 30, 'a'], ['s', 'M9 6 L26 9 L20 13 L26 17 L9 20'],
  ] },
  'interface:bomb': { col: STEEL, acc: FLAME, draw: [
    ['c', 15, 20, 8.5], ['s', 'M20 13 Q23 9 26 8'],
    ['l', 26, 8, 24, 4, 'a'], ['l', 26, 8, 30, 6, 'a'], ['l', 26, 8, 29, 11, 'a'],
  ] },
  'interface:safe': { col: GREEN, acc: GOLD, draw: [
    ['G', '6,6 28,6 28,28 6,28'], ['c', 17, 17, 5], ['l', 17, 13, 17, 17],
    ['l', 24, 9, 24, 12, 'a'], ['l', 8, 31, 10, 31], ['l', 24, 31, 26, 31],
  ] },
  'interface:event': { col: VIOLET, acc: 0, draw: [
    ['s', 'M11 12 Q11 5 17 5 Q23 5 23 11 Q23 16 17 17 L17 22'], ['C', 17, 28, 1.7],
  ] },
  'interface:shop': { col: GOLD, acc: WOOD, draw: [ // coin purse
    ['s', 'M12 9 Q10 4 15 5 L19 5 Q24 4 22 9', 'a'],
    ['s', 'M12 9 L22 9 Q28 15 26 24 Q24 30 17 30 Q10 30 8 24 Q6 15 12 9'],
    ['c', 17, 19, 3.2],
  ] },
  /* ---------------- camp ---------------- */
  'camp:rest': { col: CYAN, acc: GOLD, draw: [
    ['s', 'M20 4 A9.5 9.5 0 1 0 30 15 A8 8 0 0 1 20 4'],
    ['l', 7, 8, 13, 8, 'a'], ['l', 13, 8, 7, 14, 'a'], ['l', 7, 14, 13, 14, 'a'],
  ] },
  'camp:smith': { col: STEEL, acc: WOOD, draw: [
    ['s', 'M6 14 L28 14 L28 18 Q22 18 22 23 L24 28 L10 28 L12 23 Q12 18 6 18 Z'],
    ['l', 22, 4, 27, 9, 'a'], ['l', 24.5, 6.5, 19, 12], ['l', 19, 12, 17, 10],
  ] },
  'camp:survey': { col: WOOD, acc: CYAN, draw: [
    ['s', 'M5 22 L23 8 L27 13 L9 27 Z'], ['l', 25, 10.5, 30, 6, 'a'], ['c', 30, 5, 1.5, 'a'],
    ['l', 9, 27, 7, 32], ['l', 9, 27, 14, 30],
  ] },
  'camp:train': { col: RED, acc: WOOD, draw: [
    ['c', 17, 13, 8], ['c', 17, 13, 4], ['C', 17, 13, 1.2],
    ['l', 17, 21, 17, 31, 'a'], ['l', 11, 31, 23, 31, 'a'],
  ] },
  /* ---------------- items ---------------- */
  'item:blastgoggles': { col: GOLD, acc: CYAN, draw: [
    ['c', 10.5, 18, 5.5], ['c', 23.5, 18, 5.5], ['l', 16, 18, 18, 18],
    ['s', 'M5 18 Q3 12 8 10'], ['s', 'M29 18 Q31 12 26 10'],
    ['C', 10.5, 18, 2, 'a'], ['C', 23.5, 18, 2, 'a'],
  ] },
  'item:dowsingcharm': { col: VIOLET, acc: GOLD, draw: [
    ['s', 'M9 5 Q17 12 25 5', 'a'], ['l', 17, 9, 17, 15, 'a'],
    ['G', '17,15 23,21 17,30 11,21'], ['l', 14, 21, 20, 21],
  ] },
  'item:keystone': { col: STEEL, acc: MOSS, draw: [
    ['G', '10,6 24,6 28,28 6,28'], ['l', 13, 12, 21, 12, 'a'], ['l', 15, 17, 19, 17, 'a'], ['l', 17, 12, 17, 23],
  ] },
  'item:emberjar': { col: FLAME, acc: STEEL, draw: [
    ['s', 'M11 10 L23 10 L25 26 Q25 30 21 30 L13 30 Q9 30 9 26 Z', 'a'], ['l', 13, 6, 21, 6, 'a'],
    ['l', 15, 10, 15, 6, 'a'], ['l', 19, 10, 19, 6, 'a'],
    ['s', 'M17 14 Q20 18 18 21 Q22 20 21 24 Q20 27 17 27 Q14 27 13 24 Q12 20 16 21 Q14 18 17 14'],
  ] },
  'item:loadedcoin': { col: GOLD, acc: RED, draw: [
    ['c', 17, 17, 10], ['C', 21, 21, 2.4, 'a'], ['l', 12, 12, 16, 16],
  ] },
  'item:fieldkit': { col: RED, acc: BONE, draw: [
    ['G', '6,10 28,10 28,28 6,28'], ['s', 'M12 10 Q12 6 17 6 Q22 6 22 10'],
    ['l', 17, 15, 17, 23, 'a'], ['l', 13, 19, 21, 19, 'a'],
  ] },
  'item:indexcard': { col: BONE, acc: CYAN, draw: [
    ['G', '6,8 28,8 28,26 6,26'], ['l', 6, 13, 28, 13, 'a'],
    ['l', 10, 18, 24, 18], ['l', 10, 22, 19, 22],
  ] },
  'item:wardplate': { col: CYAN, acc: GOLD, draw: [
    ['s', 'M17 3 L29 8 L29 18 Q29 27 17 31 Q5 27 5 18 L5 8 Z'],
    ['G', '17,10 22,14 20,21 14,21 12,14', 'a'],
  ] },
  'item:hexkey': { col: STEEL, acc: 0, draw: [
    ['G', '13,5 21,5 25,12 21,19 13,19 9,12'], ['c', 17, 12, 2.5], ['l', 17, 19, 17, 30], ['l', 17, 30, 22, 30],
  ] },
  'item:gravebell': { col: WOOD, acc: BONE, draw: [
    ['s', 'M11 17 Q11 7 17 7 Q23 7 23 17 L25 21 L9 21 Z'], ['l', 17, 4, 17, 7],
    ['C', 17, 24, 1.5, 'a'], ['s', 'M10 28 Q17 31 24 28', 'a'],
  ] },
  'item:luckycompass': { col: GOLD, acc: RED, draw: [
    ['c', 17, 17, 11], ['g', '17,8 20,17 17,26 14,17'], ['C', 17, 17, 1.4, 'a'],
  ] },
  'item:quill': { col: BONE, acc: CYAN, draw: [
    ['s', 'M25 4 Q13 8 9 26'], ['s', 'M25 4 Q27 14 13 22'], ['s', 'M25 4 Q19 8 15 16'],
    ['l', 9, 26, 7, 31], ['s', 'M5 31 Q10 29 14 31', 'a'],
  ] },
  'item:detector': { col: MOSS, acc: GOLD, draw: [
    ['G', '8,8 26,8 26,28 8,28'], ['s', 'M12 14 L16 14 L18 12 L20 16 L22 14', 'a'],
    ['c', 17, 22, 2.6], ['l', 24, 8, 28, 3],
  ] },
  'item:tally': { col: BONE, acc: RED, draw: [
    ['l', 8, 8, 8, 26], ['l', 13, 8, 13, 26], ['l', 18, 8, 18, 26], ['l', 23, 8, 23, 26],
    ['l', 4, 24, 27, 10, 'a'],
  ] },
  'item:pitons': { col: STEEL, acc: 0, draw: [
    ['l', 10, 5, 10, 25], ['g', '10,31 7,24 13,24'], ['c', 10, 8, 2.8],
    ['l', 22, 9, 22, 29], ['g', '22,3 19,10 25,10'], ['c', 22, 26, 2.8],
  ] },
  'item:canary': { col: GOLD, acc: WOOD, draw: [
    ['s', 'M7 30 L7 14 Q7 4 17 4 Q27 4 27 14 L27 30', 'a'], ['l', 4, 30, 30, 30, 'a'],
    ['l', 12, 4, 12, 30, 'a'], ['l', 22, 4, 22, 30, 'a'],
    ['C', 17, 20, 3.4], ['g', '20,19 24,20 20,22'], ['C', 18.5, 18.5, .7],
  ] },
  'item:lamp': { col: GOLD, acc: FLAME, draw: [
    ['s', 'M13 10 L21 10 L24 18 L21 26 L13 26 L10 18 Z'], ['s', 'M13 10 Q13 5 17 5 Q21 5 21 10'],
    ['l', 13, 30, 21, 30], ['l', 17, 26, 17, 30],
    ['g', '17,14 19,18 17,22 15,18', 'a'],
  ] },
  'item:dowsingrod': { col: WOOD, acc: 0, draw: [
    ['s', 'M17 30 L17 17 Q17 12 12 9 Q9 7 8 4'], ['s', 'M17 17 Q17 12 22 9 Q25 7 26 4'],
  ] },
  'item:metaldetector': { col: STEEL, acc: GOLD, draw: [
    ['l', 24, 4, 12, 24], ['s', 'M24 4 L28 6', 'a'],
    ['s', 'M6 27 Q6 23 11 23 Q16 23 16 27 Q16 30 11 30 Q6 30 6 27'],
    ['s', 'M20 28 Q23 30 26 28', 'a'],
  ] },
  'item:chalk': { col: BONE, acc: 0, draw: [
    ['s', 'M8 24 L22 8 L26 12 L12 28 Z'], ['l', 8, 24, 12, 28],
    ['l', 17, 31, 20, 31], ['l', 24, 28, 26, 28], ['l', 28, 22, 29, 22],
  ] },
  'item:nitro': { col: RED, acc: FLAME, draw: [
    ['s', 'M8 24 L22 8 Q26 4 28 8 Q30 12 26 14 L12 30 Q8 32 6 28 Q5 25 8 24'],
    ['l', 15, 15, 20, 20], ['s', 'M27 6 Q30 4 31 2', 'a'], ['C', 32, 1.5, 1, 'a'],
  ] },
  'item:platingdraught': { col: VIOLET, acc: STEEL, draw: [
    ['s', 'M13 4 L17 4 M14 4 L14 10 L10 18 Q9 26 15 26 L15 26 Q21 26 20 18 L16 10 L16 4'],
    ['l', 11, 20, 19, 20],
    ['s', 'M22 18 L30 21 L30 26 Q30 30 26 32 Q22 30 22 26 Z', 'a'],
  ] },
  'item:smokebomb': { col: STEEL, acc: FOG, draw: [
    ['c', 14, 22, 7.5], ['l', 14, 14.5, 14, 11],
    ['s', 'M14 8 Q18 3 23 6 Q29 4 29 10 Q33 12 30 16', 'a'], ['C', 25, 12, 1.3, 'a'],
  ] },
};

/* ---------------- assembly ---------------- */

const { columns, rows, tile } = { columns: ATLAS_LAYOUT.columns, rows: ATLAS_LAYOUT.rows, tile: ATLAS_LAYOUT.tile };
const scale = tile / 34; // icons are authored on a 34-unit tile
const slots = atlasSlots('all');
const W = 2.2; // monoline weight in tile units

function primitive(shape, col, acc) {
  const accent = shape[shape.length - 1] === 'a';
  const colour = accent ? (acc || col) : col;
  const stroke = `stroke="${colour}" stroke-width="${W}" stroke-linecap="round" stroke-linejoin="round" fill="none"`;
  const [kind, ...a] = shape;
  if (kind === 's') return `<path d="${a[0]}" ${stroke}/>`;
  if (kind === 'f') return `<path d="${a[0]}" fill="${colour}"/>`;
  if (kind === 'c') return `<circle cx="${a[0]}" cy="${a[1]}" r="${a[2]}" ${stroke}/>`;
  if (kind === 'C') return `<circle cx="${a[0]}" cy="${a[1]}" r="${a[2]}" fill="${colour}"/>`;
  if (kind === 'l') return `<line x1="${a[0]}" y1="${a[1]}" x2="${a[2]}" y2="${a[3]}" ${stroke}/>`;
  if (kind === 'G') return `<polygon points="${a[0]}" ${stroke}/>`;
  if (kind === 'g') return `<polygon points="${a[0]}" fill="${colour}"/>`;
  throw new Error(`Unknown primitive ${kind}`);
}

const missing = slots.map(s => `${s.domain}:${s.key}`).filter(k => !ICONS[k]);
if (missing.length) throw new Error(`No sigil designed for: ${missing.join(', ')}`);

const tiles = slots.map((slot, index) => {
  const icon = ICONS[`${slot.domain}:${slot.key}`];
  const x = (index % columns) * tile, y = Math.floor(index / columns) * tile;
  const body = icon.draw.map(shape => primitive(shape, icon.col, icon.acc)).join('');
  return `<g transform="translate(${x} ${y}) scale(${scale})">${body}</g>`;
});

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${columns * tile}" height="${rows * tile}" viewBox="0 0 ${columns * tile} ${rows * tile}">
<title>Cryptsweeper sigil icon set</title>
${tiles.join('\n')}
</svg>\n`;

await writeFile(out, svg);
console.log(`Drew ${slots.length} sigils -> ${out}`);
