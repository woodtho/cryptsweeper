import openingArt from '../assets/cutscenes/opening-pixel-coarse.webp';
import campArt from '../assets/cutscenes/camp-pixel-coarse.webp';
import archivesArt from '../assets/cutscenes/sunk-archives-pixel-coarse.webp';
import clockworkArt from '../assets/cutscenes/clockwork-depths-pixel-coarse.webp';
import collapserArt from '../assets/cutscenes/collapser-pixel-coarse.webp';
import fogfatherArt from '../assets/cutscenes/fogfather-pixel-coarse.webp';
import nn99Art from '../assets/cutscenes/nn99-pixel-coarse.webp';
import finaleArt from '../assets/cutscenes/finale-pixel-coarse.webp';
import merchantShopArt from '../assets/cutscenes/rat-merchant-shop-pixel-coarse.webp';
/* The canonical scenes use a 160 × 90 logical pixel canvas, scaled exactly
   6× so WebView rendering never has to invent softened intermediate pixels. */
export const CUTSCENE_ART = {
  opening: openingArt,
  camp: campArt,
  archives: archivesArt,
  clockwork: clockworkArt,
  collapser: collapserArt,
  fogfather: fogfatherArt,
  nn99: nn99Art,
  finale: finaleArt,
  merchantShop: merchantShopArt,
};

export function cutsceneArt(key) {
  return CUTSCENE_ART[key];
}
