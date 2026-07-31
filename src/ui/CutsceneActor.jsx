import { cutsceneSprite } from './cutsceneSprites.js';
import { SpriteAnimation } from './SpriteAnimation.jsx';

export function CutsceneActor({
  actorKey,
  placement = 'player',
  speaking = false,
  state = 'idle',
  allowMovement = false,
}) {
  const actor = cutsceneSprite(actorKey);
  if (!actor) return null;

  const conversationalActor = actor.role === 'delver' || actor.role === 'npc';
  const requestedMotion = speaking && conversationalActor ? 'speaking' : state;
  const motion = !allowMovement && (requestedMotion === 'moving' || requestedMotion === 'walking')
    ? 'idle'
    : requestedMotion;
  const facing = actor.motionFacing?.[motion] || (placement === 'featured' ? 'right' : 'left');
  const style = {
    '--actor-offset-x': `${actor.stageOffsetX || 0}%`,
  };
  return (
    <div
      className={`cutscene-actor cutscene-actor-${placement} cutscene-actor-${actor.role}`}
      style={style}
      data-actor={actorKey}
      data-motion={motion}
      data-facing={facing}
      data-signature={actor.signature}
      aria-hidden="true"
    >
      <div className="cutscene-actor-motion">
        <SpriteAnimation actorKey={actorKey} motion={motion} facing={facing}
          playbackMode={actor.playback[motion]}
          className="cutscene-actor-sheet" />
      </div>
    </div>
  );
}
