import sapperPortrait from '../assets/delvers/sapper-pixel-coarse.webp';
import surveyorPortrait from '../assets/delvers/surveyor-pixel-coarse.webp';
import terraformerPortrait from '../assets/delvers/terraformer-pixel-coarse.webp';
import lamplighterPortrait from '../assets/delvers/lamplighter-pixel-coarse.webp';
import gamblerPortrait from '../assets/delvers/gambler-pixel-coarse.webp';
import chirurgeonPortrait from '../assets/delvers/chirurgeon-pixel-coarse.webp';
import archivistPortrait from '../assets/delvers/archivist-pixel-coarse.webp';
import wardenPortrait from '../assets/delvers/warden-pixel-coarse.webp';
import hexwrightPortrait from '../assets/delvers/hexwright-pixel-coarse.webp';
import revenantPortrait from '../assets/delvers/revenant-pixel-coarse.webp';
import sapperFullPortrait from '../assets/delvers/sapper.webp';
import surveyorFullPortrait from '../assets/delvers/surveyor.webp';
import terraformerFullPortrait from '../assets/delvers/terraformer.webp';
import lamplighterFullPortrait from '../assets/delvers/lamplighter.webp';
import gamblerFullPortrait from '../assets/delvers/gambler.webp';
import chirurgeonFullPortrait from '../assets/delvers/chirurgeon.webp';
import archivistFullPortrait from '../assets/delvers/archivist.webp';
import wardenFullPortrait from '../assets/delvers/warden.webp';
import hexwrightFullPortrait from '../assets/delvers/hexwright.webp';
import revenantFullPortrait from '../assets/delvers/revenant.webp';
import ratMerchantArt from '../assets/npcs/rat-merchant-pixel-coarse.webp';

/* The canonical runtime portraits use 96 × 128 logical 16-colour pixel-art
   masters, nearest-neighbour scaled 4× to 384 × 512 WebP files. */
export const DELVER_PORTRAITS = {
  sapper: sapperPortrait,
  surveyor: surveyorPortrait,
  terraformer: terraformerPortrait,
  lamplighter: lamplighterPortrait,
  gambler: gamblerPortrait,
  chirurgeon: chirurgeonPortrait,
  archivist: archivistPortrait,
  warden: wardenPortrait,
  hexwright: hexwrightPortrait,
  revenant: revenantPortrait,
};

export function delverPortrait(cls) {
  return DELVER_PORTRAITS[cls];
}

/* Full artist masters are reserved for opt-in archive viewing so normal
   Delver lists and battles continue to load the compact pixel portraits. */
export const DELVER_FULL_PORTRAITS = {
  sapper: sapperFullPortrait,
  surveyor: surveyorFullPortrait,
  terraformer: terraformerFullPortrait,
  lamplighter: lamplighterFullPortrait,
  gambler: gamblerFullPortrait,
  chirurgeon: chirurgeonFullPortrait,
  archivist: archivistFullPortrait,
  warden: wardenFullPortrait,
  hexwright: hexwrightFullPortrait,
  revenant: revenantFullPortrait,
};

export function delverFullPortrait(cls) {
  return DELVER_FULL_PORTRAITS[cls] || delverPortrait(cls);
}

export const NPC_PORTRAITS = { merchant: ratMerchantArt };

export function npcPortrait(key) {
  return NPC_PORTRAITS[key];
}

export function ratMerchantPortrait() {
  return npcPortrait('merchant');
}
