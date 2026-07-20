import sapperPortrait from '../assets/delvers/sapper.webp';
import surveyorPortrait from '../assets/delvers/surveyor.webp';
import terraformerPortrait from '../assets/delvers/terraformer.webp';
import lamplighterPortrait from '../assets/delvers/lamplighter.webp';
import gamblerPortrait from '../assets/delvers/gambler.webp';
import chirurgeonPortrait from '../assets/delvers/chirurgeon.webp';
import archivistPortrait from '../assets/delvers/archivist.webp';
import wardenPortrait from '../assets/delvers/warden.webp';
import hexwrightPortrait from '../assets/delvers/hexwright.webp';
import revenantPortrait from '../assets/delvers/revenant.webp';
import ratMerchantArt from '../assets/npcs/rat-merchant.webp';

/* One canonical portrait set ships for every player. */
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

export const NPC_PORTRAITS = { merchant: ratMerchantArt };

export function npcPortrait(key) {
  return NPC_PORTRAITS[key];
}

export function ratMerchantPortrait() {
  return npcPortrait('merchant');
}
