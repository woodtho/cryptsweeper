import openingArt from '../assets/cutscenes/opening.webp';
import campArt from '../assets/cutscenes/camp.webp';
import archivesArt from '../assets/cutscenes/sunk-archives.webp';
import clockworkArt from '../assets/cutscenes/clockwork-depths.webp';
import collapserArt from '../assets/cutscenes/collapser.webp';
import fogfatherArt from '../assets/cutscenes/fogfather.webp';
import nn99Art from '../assets/cutscenes/nn99.webp';
import finaleArt from '../assets/cutscenes/finale.webp';
/* One canonical cutscene set ships for every player. */
export const CUTSCENE_ART = {
  opening: openingArt,
  camp: campArt,
  archives: archivesArt,
  clockwork: clockworkArt,
  collapser: collapserArt,
  fogfather: fogfatherArt,
  nn99: nn99Art,
  finale: finaleArt,
};

export function cutsceneArt(key) {
  return CUTSCENE_ART[key];
}
