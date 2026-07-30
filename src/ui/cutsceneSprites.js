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

const sprite = (src, name, role, signature, sheet = null) => ({
  src,
  name,
  role,
  signature,
  /* Generated animation sheets use the production layout documented in
     docs/art/cutscene-animation.md. Static art remains a complete fallback. */
  sheet,
  columns: 6,
  rows: 4,
  motions: {
    idle: '0%',
    walking: '33.333%',
    speaking: '66.667%',
    threatening: '66.667%',
    offer: '100%',
    defeated: '100%',
  },
});

export const CUTSCENE_SPRITES = {
  sapper: sprite(sapper, 'The Sapper', 'delver', 'detonate', sapperSheet),
  surveyor: sprite(surveyor, 'The Surveyor', 'delver', 'survey', surveyorSheet),
  terraformer: sprite(terraformer, 'The Terraformer', 'delver', 'construct', terraformerSheet),
  lamplighter: sprite(lamplighter, 'The Lamplighter', 'delver', 'flare', lamplighterSheet),
  gambler: sprite(gambler, 'The Gambler', 'delver', 'wager', gamblerSheet),
  chirurgeon: sprite(chirurgeon, 'The Chirurgeon', 'delver', 'triage', chirurgeonSheet),
  archivist: sprite(archivist, 'The Archivist', 'delver', 'recall', archivistSheet),
  warden: sprite(warden, 'The Warden', 'delver', 'riposte', wardenSheet),
  hexwright: sprite(hexwright, 'The Hexwright', 'delver', 'inscribe', hexwrightSheet),
  revenant: sprite(revenant, 'The Revenant', 'delver', 'rise', revenantSheet),
  grubber: sprite(grubber, 'Grubber', 'enemy', 'claw', grubberSheet),
  minelayer: sprite(minelayer, 'Minelayer Imp', 'enemy', 'lay-mine', minelayerSheet),
  'stone-warden': sprite(stoneWarden, 'Stone Warden', 'enemy', 'stone-slam', stoneWardenSheet),
  wisp: sprite(wisp, 'Fog Wisp', 'enemy', 'fog-pulse', wispSheet),
  shade: sprite(shade, 'Marsh Shade', 'enemy', 'shadow-lunge', shadeSheet),
  tunneler: sprite(tunneler, 'Tunneler Grub', 'enemy', 'burrow', tunnelerSheet),
  clockwork: sprite(clockwork, 'Clockwork Sapper', 'enemy', 'wind-charge', clockworkSheet),
  gearhusk: sprite(gearhusk, 'Gear Husk', 'enemy', 'piston-strike', gearhuskSheet),
  ossuary: sprite(ossuary, 'Ossuary Warden', 'enemy', 'bone-guard', ossuarySheet),
  miscounter: sprite(miscounter, 'The Miscounter', 'enemy', 'miscount', miscounterSheet),
  detonata: sprite(detonata, 'Detonata', 'enemy', 'overload', detonataSheet),
  collapser: sprite(collapser, 'The Collapser', 'boss', 'cave-in', collapserSheet),
  fogfather: sprite(fogfather, 'The Fogfather', 'boss', 'fog-front', fogfatherSheet),
  nn99: sprite(nn99, 'NN-99', 'boss', 'calculate', nn99Sheet),
  'rat-merchant': sprite(ratMerchant, 'Rat Merchant', 'npc', 'offer', ratMerchantSheet),
};

export function cutsceneSprite(key) {
  return CUTSCENE_SPRITES[key] || null;
}
