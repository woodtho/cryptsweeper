import { useEffect, useMemo, useState } from 'react';
import { cutsceneSprite } from './cutsceneSprites.js';
import {
  advanceSpritePlayback,
  normalizeSpriteFrames,
  SPRITE_PLAYBACK_MODES,
  spriteSheetPosition,
} from './spritePlayback.js';

const PLAYBACK_MODES = new Set(SPRITE_PLAYBACK_MODES);
const LARGE_SIGNATURE_ACTORS = new Set(['archivist', 'terraformer', 'gambler', 'warden']);

function reducedMotionEnabled() {
  if (typeof document === 'undefined') return false;
  return document.documentElement.classList.contains('reduce-motion')
    || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

export function SpriteAnimation({
  actorKey,
  motion = 'idle',
  variant = 'full',
  fps = null,
  playbackMode = null,
  paused = false,
  frame = null,
  frames = null,
  restartKey = '',
  facing = 'source',
  className = '',
  label = '',
  style: customStyle = null,
  onFrameChange = null,
  onComplete = null,
}) {
  const actor = cutsceneSprite(actorKey);
  const profile = variant === 'battle' && actor?.battle ? actor.battle : actor;
  const sheet = profile?.sheet || null;
  const columns = profile?.columns || 1;
  const rows = profile?.rows || 1;
  const row = profile?.motions?.[motion] ?? profile?.motions?.idle ?? 0;
  const configuredFrames = frames || profile?.sequences?.[motion] || actor?.sequences?.[motion];
  const sequenceKey = normalizeSpriteFrames(configuredFrames, columns).join(',');
  const sequence = useMemo(
    () => normalizeSpriteFrames(sequenceKey.split(',').map(Number), columns),
    [columns, sequenceKey],
  );
  const configuredMode = playbackMode || profile?.playback?.[motion] || actor?.playback?.[motion] || 'loop';
  const mode = PLAYBACK_MODES.has(configuredMode) ? configuredMode : 'loop';
  const playbackFps = Math.max(
    1,
    Number(fps || profile?.fps?.[motion] || actor?.fps?.[motion] || actor?.fps?.idle || 4),
  );
  const [cursor, setCursor] = useState(0);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    setCursor(0);
    setFinished(false);
  }, [actorKey, motion, variant, mode, sequenceKey, restartKey]);

  useEffect(() => {
    if (!sheet || paused || frame !== null || finished || reducedMotionEnabled()) return undefined;
    const timer = window.setTimeout(() => {
      const next = advanceSpritePlayback(cursor, sequence.length, mode);
      setCursor(next.cursor);
      setFinished(next.finished);
      if (next.finished) onComplete?.();
    }, 1000 / playbackFps);
    return () => window.clearTimeout(timer);
  }, [
    cursor,
    finished,
    frame,
    mode,
    onComplete,
    paused,
    playbackFps,
    sequence.length,
    sheet,
  ]);

  const requestedFrame = frame === null ? sequence[Math.min(cursor, sequence.length - 1)] : Number(frame);
  const visibleFrame = Math.max(0, Math.min(columns - 1, Number.isFinite(requestedFrame) ? requestedFrame : 0));
  const resolvedFacing = facing === 'source'
    ? actor.motionFacing?.[motion] || actor.sourceFacing
    : facing;
  const isFlipped = resolvedFacing !== actor.sourceFacing;
  const motionScale = actor.role !== 'delver'
    ? 1
    : (motion === 'moving' || motion === 'walking')
      ? 1.2
      : motion === 'speaking'
        ? 1.1
        : motion === 'signature' && LARGE_SIGNATURE_ACTORS.has(actorKey)
          ? 1.1
        : 1;
  const { x: frameX, y: rowY } = spriteSheetPosition(visibleFrame, columns, row, rows);
  const style = {
    ...(customStyle || {}),
    '--sprite-facing-scale': isFlipped ? -1 : 1,
    '--sprite-motion-scale': motionScale,
    ...(sheet ? {
      backgroundImage: `url("${sheet}")`,
      backgroundSize: `${columns * 100}% ${rows * 100}%`,
      backgroundPosition: `${frameX}% ${rowY}%`,
    } : {}),
  };

  useEffect(() => {
    onFrameChange?.(visibleFrame, {
      cursor,
      finished,
      mode,
      sequence,
    });
  }, [cursor, finished, mode, onFrameChange, sequence, visibleFrame]);

  if (!actor) return null;

  return (
    <span
      className={`sprite-animation ${sheet ? 'has-sheet' : 'is-static'} ${paused ? 'paused' : ''} ${finished ? 'finished' : ''} ${isFlipped ? 'facing-flipped' : 'facing-authored'} ${className}`.trim()}
      style={style}
      role={label ? 'img' : undefined}
      aria-label={label || undefined}
      aria-hidden={label ? undefined : 'true'}
      data-actor={actorKey}
      data-motion={motion}
      data-variant={variant}
      data-facing={resolvedFacing}
      data-frame={visibleFrame}
      data-playback={mode}
      data-finished={finished || undefined}
    >
      {!sheet && <img src={actor.src} alt="" draggable="false" />}
    </span>
  );
}
