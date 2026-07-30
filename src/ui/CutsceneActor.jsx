import { cutsceneSprite } from './cutsceneSprites.js';

export function CutsceneActor({
  actorKey,
  placement = 'player',
  speaking = false,
  state = 'idle',
}) {
  const actor = cutsceneSprite(actorKey);
  if (!actor) return null;

  const motion = speaking ? 'speaking' : state;
  const sheetStyle = actor.sheet ? {
    '--cutscene-sprite-sheet': `url("${actor.sheet}")`,
    '--cutscene-sprite-row': actor.motions[motion] || actor.motions.idle,
  } : undefined;
  return (
    <div
      className={`cutscene-actor cutscene-actor-${placement} cutscene-actor-${actor.role}`}
      data-actor={actorKey}
      data-motion={motion}
      data-signature={actor.signature}
      aria-hidden="true"
    >
      <div className="cutscene-actor-motion">
        {actor.sheet
          ? <span className="cutscene-actor-sheet" style={sheetStyle} />
          : <img src={actor.src} alt="" draggable="false" />}
      </div>
    </div>
  );
}
