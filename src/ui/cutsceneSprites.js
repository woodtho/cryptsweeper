import sapper from '../assets/sprites/fullbody/delvers/sapper.webp';
import surveyor from '../assets/sprites/fullbody/delvers/surveyor.webp';
import terraformer from '../assets/sprites/fullbody/delvers/terraformer.webp';
import lamplighter from '../assets/sprites/fullbody/delvers/lamplighter.webp';
import gambler from '../assets/sprites/fullbody/delvers/gambler.webp';
import chirurgeon from '../assets/sprites/fullbody/delvers/chirurgeon.webp';
import archivist from '../assets/sprites/fullbody/delvers/archivist.webp';
import warden from '../assets/sprites/fullbody/delvers/warden.webp';
import hexwright from '../assets/sprites/fullbody/delvers/hexwright.webp';
import revenant from '../assets/sprites/fullbody/delvers/revenant.webp';
import grubber from '../assets/sprites/fullbody/enemies/grubber.webp';
import minelayer from '../assets/sprites/fullbody/enemies/minelayer.webp';
import stoneWarden from '../assets/sprites/fullbody/enemies/stone-warden.webp';
import wisp from '../assets/sprites/fullbody/enemies/wisp.webp';
import shade from '../assets/sprites/fullbody/enemies/shade.webp';
import tunneler from '../assets/sprites/fullbody/enemies/tunneler.webp';
import clockwork from '../assets/sprites/fullbody/enemies/clockwork.webp';
import gearhusk from '../assets/sprites/fullbody/enemies/gearhusk.webp';
import ossuary from '../assets/sprites/fullbody/enemies/ossuary.webp';
import miscounter from '../assets/sprites/fullbody/enemies/miscounter.webp';
import detonata from '../assets/sprites/fullbody/enemies/detonata.webp';
import collapser from '../assets/sprites/fullbody/enemies/collapser.webp';
import fogfather from '../assets/sprites/fullbody/enemies/fogfather.webp';
import nn99 from '../assets/sprites/fullbody/enemies/nn99.webp';
import ratMerchant from '../assets/sprites/fullbody/npcs/rat-merchant.webp';
import sapperSheet from '../assets/sprites/animations/sheets/sapper.webp';
import surveyorSheet from '../assets/sprites/animations/sheets/surveyor.webp';
import terraformerSheet from '../assets/sprites/animations/sheets/terraformer.webp';
import lamplighterSheet from '../assets/sprites/animations/sheets/lamplighter.webp';
import gamblerSheet from '../assets/sprites/animations/sheets/gambler.webp';
import chirurgeonSheet from '../assets/sprites/animations/sheets/chirurgeon.webp';
import archivistSheet from '../assets/sprites/animations/sheets/archivist.webp';
import wardenSheet from '../assets/sprites/animations/sheets/warden.webp';
import hexwrightSheet from '../assets/sprites/animations/sheets/hexwright.webp';
import revenantSheet from '../assets/sprites/animations/sheets/revenant.webp';
import grubberSheet from '../assets/sprites/animations/sheets/grubber.webp';
import minelayerSheet from '../assets/sprites/animations/sheets/minelayer.webp';
import stoneWardenSheet from '../assets/sprites/animations/sheets/stone-warden.webp';
import wispSheet from '../assets/sprites/animations/sheets/wisp.webp';
import shadeSheet from '../assets/sprites/animations/sheets/shade.webp';
import tunnelerSheet from '../assets/sprites/animations/sheets/tunneler.webp';
import clockworkSheet from '../assets/sprites/animations/sheets/clockwork.webp';
import gearhuskSheet from '../assets/sprites/animations/sheets/gearhusk.webp';
import ossuarySheet from '../assets/sprites/animations/sheets/ossuary.webp';
import miscounterSheet from '../assets/sprites/animations/sheets/miscounter.webp';
import detonataSheet from '../assets/sprites/animations/sheets/detonata.webp';
import ratMerchantSheet from '../assets/sprites/animations/sheets/rat-merchant.webp';
import collapserSheet from '../assets/sprites/animations/sheets/collapser.webp';
import fogfatherSheet from '../assets/sprites/animations/sheets/fogfather.webp';
import nn99Sheet from '../assets/sprites/animations/sheets/nn99.webp';
import grubberBattle from '../assets/sprites/battle/sheets/grubber.webp';
import minelayerBattle from '../assets/sprites/battle/sheets/minelayer.webp';
import stoneWardenBattle from '../assets/sprites/battle/sheets/stone-warden.webp';
import wispBattle from '../assets/sprites/battle/sheets/wisp.webp';
import shadeBattle from '../assets/sprites/battle/sheets/shade.webp';
import tunnelerBattle from '../assets/sprites/battle/sheets/tunneler.webp';
import clockworkBattle from '../assets/sprites/battle/sheets/clockwork.webp';
import gearhuskBattle from '../assets/sprites/battle/sheets/gearhusk.webp';
import ossuaryBattle from '../assets/sprites/battle/sheets/ossuary.webp';
import miscounterBattle from '../assets/sprites/battle/sheets/miscounter.webp';
import detonataBattle from '../assets/sprites/battle/sheets/detonata.webp';
import collapserBattle from '../assets/sprites/battle/sheets/collapser.webp';
import fogfatherBattle from '../assets/sprites/battle/sheets/fogfather.webp';
import nn99Battle from '../assets/sprites/battle/sheets/nn99.webp';

const FORWARD = [0, 1, 2, 3, 4, 5];
const PING_PONG = [0, 1, 2, 3, 4, 5, 4, 3, 2, 1];

const DEFAULT_FPS = {
  idle: 4,
  moving: 8,
  walking: 8,
  speaking: 6,
  action: 10,
  threatening: 7,
  signature: 9,
  offer: 6,
  defeated: 7,
};

const DEFAULT_SEQUENCES = {
  idle: FORWARD,
  moving: FORWARD,
  walking: FORWARD,
  speaking: PING_PONG,
  action: FORWARD,
  threatening: PING_PONG,
  signature: FORWARD,
  offer: PING_PONG,
  defeated: FORWARD,
};

const DEFAULT_PLAYBACK = {
  idle: 'loop',
  moving: 'loop',
  walking: 'loop',
  speaking: 'loop',
  action: 'once',
  threatening: 'loop',
  signature: 'hold',
  offer: 'loop',
  defeated: 'hold',
};

const sprite = (src, name, role, signature, sheet = null, options = {}) => {
  const battleSheet = options.battleSheet || null;
  return {
    src,
    name,
    role,
    signature,
    /* The production cast uses a consistent screen-left three-quarter stance.
       SpriteAnimation mirrors only when the scene placement requires it. */
    sourceFacing: options.sourceFacing || 'left',
    motionFacing: options.motionFacing || {},
    /* Generated animation sheets use the production layout documented in
       docs/art/cutscene-animation.md. Static art remains a complete fallback. */
    sheet,
    columns: 6,
    rows: 4,
    fps: { ...DEFAULT_FPS, ...options.fps },
    sequences: { ...DEFAULT_SEQUENCES, ...options.sequences },
    playback: { ...DEFAULT_PLAYBACK, ...options.playback },
    motions: {
      idle: 0,
      moving: 1,
      walking: 1,
      speaking: 2,
      action: 2,
      threatening: 2,
      signature: 3,
      offer: 3,
      defeated: 3,
    },
    stageOffsetX: options.stageOffsetX || 0,
    battle: battleSheet ? {
      sheet: battleSheet,
      columns: 4,
      rows: 2,
      fps: { idle: 4, action: 8 },
      sequences: { idle: [0, 1, 2, 3], action: [0, 1, 2, 3] },
      playback: { idle: 'loop', action: 'loop' },
      motions: { idle: 0, action: 1, threatening: 1 },
    } : null,
  };
};

export const CUTSCENE_SPRITES = {
  sapper: sprite(sapper, 'The Sapper', 'delver', 'detonate', sapperSheet),
  surveyor: sprite(surveyor, 'The Surveyor', 'delver', 'survey', surveyorSheet),
  terraformer: sprite(terraformer, 'The Terraformer', 'delver', 'construct', terraformerSheet, {
    fps: { speaking: 6 },
    sequences: { speaking: [2, 4, 1, 3, 5, 4] },
    playback: { speaking: 'loop' },
    motionFacing: {
      idle: 'right',
      moving: 'right',
      speaking: 'right',
      signature: 'right',
    },
  }),
  lamplighter: sprite(lamplighter, 'The Lamplighter', 'delver', 'flare', lamplighterSheet, {
    fps: { moving: 8, speaking: 6 },
    sequences: {
      moving: [0, 1, 2, 3, 4],
      speaking: [0, 1, 2, 3, 4, 4],
    },
    playback: { moving: 'loop', speaking: 'loop' },
  }),
  gambler: sprite(gambler, 'The Gambler', 'delver', 'wager', gamblerSheet, {
    fps: { speaking: 6 },
    sequences: { speaking: [0, 2, 4, 1, 3, 5] },
    playback: { speaking: 'loop' },
  }),
  chirurgeon: sprite(chirurgeon, 'The Chirurgeon', 'delver', 'triage', chirurgeonSheet),
  archivist: sprite(archivist, 'The Archivist', 'delver', 'recall', archivistSheet, {
    fps: { signature: 9 },
    sequences: { signature: [0, 1, 2, 1, 3, 5] },
    playback: { signature: 'once' },
  }),
  warden: sprite(warden, 'The Warden', 'delver', 'riposte', wardenSheet, {
    fps: { signature: 9 },
    sequences: { signature: [0, 1, 2, 3, 4] },
    playback: { signature: 'once' },
  }),
  hexwright: sprite(hexwright, 'The Hexwright', 'delver', 'inscribe', hexwrightSheet, {
    fps: { signature: 9 },
    sequences: { signature: [0, 1, 2, 2, 3, 4] },
    playback: { signature: 'once' },
  }),
  revenant: sprite(revenant, 'The Revenant', 'delver', 'rise', revenantSheet, {
    fps: { idle: 3, speaking: 5, signature: 7 },
    sequences: { idle: PING_PONG, signature: [3, 4, 5, 0, 1, 2] },
    playback: { signature: 'hold' },
  }),
  grubber: sprite(grubber, 'Grubber', 'enemy', 'claw', grubberSheet, { battleSheet: grubberBattle }),
  minelayer: sprite(minelayer, 'Minelayer Imp', 'enemy', 'lay-mine', minelayerSheet, {
    battleSheet: minelayerBattle,
    fps: { idle: 4, moving: 7, action: 8 },
    sequences: { moving: PING_PONG, action: [0, 1, 2, 3, 5] },
  }),
  'stone-warden': sprite(stoneWarden, 'Stone Warden', 'enemy', 'stone-slam', stoneWardenSheet, { battleSheet: stoneWardenBattle }),
  wisp: sprite(wisp, 'Fog Wisp', 'enemy', 'fog-pulse', wispSheet, { battleSheet: wispBattle }),
  shade: sprite(shade, 'Marsh Shade', 'enemy', 'shadow-lunge', shadeSheet, { battleSheet: shadeBattle }),
  tunneler: sprite(tunneler, 'Tunneler Grub', 'enemy', 'burrow', tunnelerSheet, { battleSheet: tunnelerBattle }),
  clockwork: sprite(clockwork, 'Clockwork Sapper', 'enemy', 'wind-charge', clockworkSheet, { battleSheet: clockworkBattle }),
  gearhusk: sprite(gearhusk, 'Gear Husk', 'enemy', 'piston-strike', gearhuskSheet, { battleSheet: gearhuskBattle }),
  ossuary: sprite(ossuary, 'Ossuary Warden', 'enemy', 'bone-guard', ossuarySheet, { battleSheet: ossuaryBattle }),
  miscounter: sprite(miscounter, 'The Miscounter', 'enemy', 'miscount', miscounterSheet, {
    battleSheet: miscounterBattle,
    fps: { idle: 3, moving: 6, action: 8 },
    sequences: { idle: PING_PONG },
  }),
  detonata: sprite(detonata, 'Detonata', 'enemy', 'overload', detonataSheet, { battleSheet: detonataBattle }),
  collapser: sprite(collapser, 'The Collapser', 'boss', 'cave-in', collapserSheet, {
    battleSheet: collapserBattle,
    stageOffsetX: -3,
    fps: { idle: 3, moving: 6, action: 8, defeated: 5 },
    sequences: { idle: PING_PONG, action: [3, 0, 1, 2, 2, 5] },
    playback: { action: 'once' },
  }),
  fogfather: sprite(fogfather, 'The Fogfather', 'boss', 'fog-front', fogfatherSheet, {
    battleSheet: fogfatherBattle,
    stageOffsetX: -2,
    fps: { idle: 3, moving: 5, action: 7, defeated: 5 },
    sequences: { idle: PING_PONG, action: [0, 2, 2, 3, 0, 2, 3, 5] },
    playback: { action: 'once' },
  }),
  nn99: sprite(nn99, 'NN-99', 'boss', 'calculate', nn99Sheet, {
    battleSheet: nn99Battle,
    stageOffsetX: -3,
    fps: { idle: 3, moving: 6, action: 8, defeated: 5 },
    sequences: { idle: PING_PONG },
  }),
  'rat-merchant': sprite(ratMerchant, 'Rat Merchant', 'npc', 'offer', ratMerchantSheet, {
    stageOffsetX: -1,
    fps: { idle: 3, moving: 6, speaking: 5, offer: 5 },
    sequences: { idle: PING_PONG, moving: PING_PONG, speaking: PING_PONG, offer: PING_PONG },
  }),
};

export function cutsceneSprite(key) {
  return CUTSCENE_SPRITES[key] || null;
}
