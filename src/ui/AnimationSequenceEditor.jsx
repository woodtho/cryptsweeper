import { useCallback, useEffect, useMemo, useState } from 'react';
import { CUTSCENE_ART } from './cutsceneArt.js';
import { CUTSCENE_SPRITES } from './cutsceneSprites.js';
import { SpriteAnimation } from './SpriteAnimation.jsx';

const PLAYBACK_OPTIONS = [
  ['loop', 'Loop'],
  ['once', 'One shot'],
  ['hold', 'Hold last'],
];

const SCENE_OPTIONS = [
  ['studio', 'Studio'],
  ['merchantShop', 'Rat Merchant shop'],
  ['collapser', 'Collapser arena'],
  ['fogfather', 'Fogfather gallery'],
  ['nn99', 'NN-99 vault'],
  ['opening', 'Undermine mouth'],
  ['camp', 'Camp'],
  ['archives', 'Sunk Archives'],
  ['clockwork', 'Clockwork Depths'],
  ['finale', 'The Vein'],
];

const STAGE_POSITIONS = [
  ['featured', 'Featured · left'],
  ['center', 'Centre'],
  ['player', 'Delver · right'],
];

function downloadJson(filename, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function motionOptions(actor) {
  if (actor.role === 'enemy' || actor.role === 'boss') return [
    ['idle', 'Idle'],
    ['moving', 'Movement'],
    ['action', 'Attack / special'],
    ['defeated', 'Damage / defeat'],
  ];
  return [
    ['idle', 'Idle'],
    ['moving', 'Walk'],
    ['speaking', 'Speaking'],
    [actor.role === 'npc' ? 'offer' : 'signature', actor.role === 'npc' ? 'Offer' : 'Signature'],
  ];
}

export function AnimationSequenceEditor({ onClose }) {
  const keys = useMemo(() => Object.keys(CUTSCENE_SPRITES), []);
  const [actorIndex, setActorIndex] = useState(0);
  const [motionIndex, setMotionIndex] = useState(0);
  const [fps, setFps] = useState(4);
  const [paused, setPaused] = useState(false);
  const [facing, setFacing] = useState('left');
  const [playbackMode, setPlaybackMode] = useState('loop');
  const [controlledFrame, setControlledFrame] = useState(null);
  const [visibleFrame, setVisibleFrame] = useState(0);
  const [finished, setFinished] = useState(false);
  const [restartKey, setRestartKey] = useState(0);
  const [boundaryTest, setBoundaryTest] = useState(false);
  const [sceneKey, setSceneKey] = useState('studio');
  const [stagePosition, setStagePosition] = useState('center');
  const [inspectionZoom, setInspectionZoom] = useState(1);
  const [editSequence, setEditSequence] = useState([0, 1, 2, 3, 4, 5]);
  const [selectedSequenceIndex, setSelectedSequenceIndex] = useState(0);
  const [frameTransforms, setFrameTransforms] = useState({});
  const [compareFrame, setCompareFrame] = useState(null);
  const [compareOpacity, setCompareOpacity] = useState(.42);
  const [notes, setNotes] = useState('');
  const [exportStatus, setExportStatus] = useState('');

  const actorKey = keys[actorIndex];
  const actor = CUTSCENE_SPRITES[actorKey];
  const motions = motionOptions(actor);
  const [motion, motionLabel] = motions[motionIndex % motions.length];
  const motionFrames = actor.sequences[motion] || [0, 1, 2, 3, 4, 5];
  const boundaryFrames = boundaryTest
    ? [editSequence[editSequence.length - 1], editSequence[0]]
    : editSequence;
  const sceneArt = sceneKey === 'studio' ? null : CUTSCENE_ART[sceneKey];
  const activeFrame = controlledFrame ?? visibleFrame;
  const activeTransform = {
    x: 0,
    y: 0,
    scale: 1,
    flip: false,
    ...(frameTransforms[activeFrame] || {}),
  };
  const comparedTransform = compareFrame === null ? null : {
    x: 0,
    y: 0,
    scale: 1,
    flip: false,
    ...(frameTransforms[compareFrame] || {}),
  };
  const facingFor = transform => transform?.flip
    ? (facing === 'left' ? 'right' : 'left')
    : facing;
  const styleFor = (transform, extra = {}) => ({
    '--preview-edit-x': `${transform?.x || 0}px`,
    '--preview-edit-y': `${transform?.y || 0}px`,
    '--preview-edit-zoom': (transform?.scale || 1) * inspectionZoom,
    ...extra,
  });
  const updateActiveTransform = patch => {
    setFrameTransforms(current => ({
      ...current,
      [activeFrame]: { ...activeTransform, ...patch },
    }));
  };

  const restart = useCallback(() => {
    setControlledFrame(null);
    setFinished(false);
    setPaused(false);
    setRestartKey(value => value + 1);
  }, []);

  useEffect(() => {
    setFps(actor.fps[motion] || actor.fps.idle || 4);
    setPlaybackMode(actor.playback[motion] || 'loop');
    setFacing(actor.motionFacing?.[motion] || actor.sourceFacing);
    setBoundaryTest(false);
    setControlledFrame(null);
    setFinished(false);
    setPaused(false);
    setEditSequence([...motionFrames]);
    setSelectedSequenceIndex(0);
    setFrameTransforms({});
    setCompareFrame(null);
    setNotes('');
    setExportStatus('');
    setRestartKey(value => value + 1);
  }, [actor, motion, motionFrames]);

  useEffect(() => {
    const onKey = event => {
      if (event.key === 'Escape') onClose();
      else if (event.target instanceof HTMLElement && ['INPUT', 'SELECT'].includes(event.target.tagName)) return;
      else if (event.key === 'ArrowLeft') setActorIndex(index => (index - 1 + keys.length) % keys.length);
      else if (event.key === 'ArrowRight') setActorIndex(index => (index + 1) % keys.length);
      else if (event.key === 'ArrowUp') setMotionIndex(index => (index - 1 + motions.length) % motions.length);
      else if (event.key === 'ArrowDown') setMotionIndex(index => (index + 1) % motions.length);
      else if (event.key === '[') {
        setBoundaryTest(false);
        setPaused(true);
        setControlledFrame(frame => Math.max(0, (frame ?? visibleFrame) - 1));
      } else if (event.key === ']') {
        setBoundaryTest(false);
        setPaused(true);
        setControlledFrame(frame => Math.min(actor.columns - 1, (frame ?? visibleFrame) + 1));
      } else if (event.key === ' ') {
        restart();
      } else if (event.key.toLowerCase() === 'f') {
        setFacing(value => value === 'left' ? 'right' : 'left');
      } else return;
      event.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [actor.columns, keys.length, motions.length, onClose, restart, visibleFrame]);

  const selectActor = next => {
    setActorIndex(next);
    setMotionIndex(0);
  };
  const moveActor = delta => selectActor((actorIndex + delta + keys.length) % keys.length);
  const moveMotion = delta => setMotionIndex((motionIndex + delta + motions.length) % motions.length);
  const selectFrame = next => {
    setBoundaryTest(false);
    setPaused(true);
    setControlledFrame(Math.max(0, Math.min(actor.columns - 1, next)));
  };
  const selectSequenceEntry = index => {
    setSelectedSequenceIndex(index);
    selectFrame(editSequence[index]);
  };
  const moveSequenceEntry = delta => {
    const nextIndex = selectedSequenceIndex + delta;
    if (nextIndex < 0 || nextIndex >= editSequence.length) return;
    setEditSequence(current => {
      const next = [...current];
      [next[selectedSequenceIndex], next[nextIndex]] = [next[nextIndex], next[selectedSequenceIndex]];
      return next;
    });
    setSelectedSequenceIndex(nextIndex);
    restart();
  };
  const duplicateSequenceEntry = () => {
    setEditSequence(current => [
      ...current.slice(0, selectedSequenceIndex + 1),
      current[selectedSequenceIndex],
      ...current.slice(selectedSequenceIndex + 1),
    ]);
    setSelectedSequenceIndex(index => index + 1);
    restart();
  };
  const removeSequenceEntry = () => {
    if (editSequence.length <= 1) return;
    setEditSequence(current => current.filter((_, index) => index !== selectedSequenceIndex));
    setSelectedSequenceIndex(index => Math.max(0, Math.min(index, editSequence.length - 2)));
    restart();
  };
  const addVisibleFrame = () => {
    setEditSequence(current => [...current, visibleFrame]);
    setSelectedSequenceIndex(editSequence.length);
    restart();
  };
  const togglePlayback = () => {
    if (paused || controlledFrame !== null || finished) restart();
    else setPaused(true);
  };
  const handleFrameChange = useCallback((next, state) => {
    setVisibleFrame(next);
    setFinished(state.finished);
  }, []);

  const stageStyle = {
    '--preview-actor-x': stagePosition === 'featured' ? '29%' : stagePosition === 'player' ? '81%' : '50%',
    '--preview-actor-width': stagePosition === 'center' ? '56%' : actor.role === 'boss' ? '54%' : '40%',
    '--preview-actor-offset-x': `${actor.stageOffsetX || 0}%`,
  };
  const exportPayload = () => ({
    schema: 'flag-the-deep.animation-edit/v1',
    createdAt: new Date().toISOString(),
    actorKey,
    motion,
    sequence: editSequence,
    playback: {
      mode: playbackMode,
      fps,
    },
    transform: {
      facing,
      flippedFromSource: facing !== actor.sourceFacing,
      stagePosition,
      actorStageOffsetX: actor.stageOffsetX || 0,
      frameTransforms,
    },
    comparison: {
      frame: compareFrame,
      opacity: compareOpacity,
    },
    previewBackground: sceneKey,
    inspectionZoom,
    notes,
  });
  const copyExport = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(exportPayload(), null, 2));
      setExportStatus('Animation correction JSON copied.');
    } catch {
      setExportStatus('Clipboard unavailable; use Download JSON.');
    }
  };

  return (
    <div className="animation-sequence-editor">
        <div className={`animation-test-stage ${sceneArt ? 'has-scene' : 'studio'}`} style={stageStyle}>
          {sceneArt && <img className="animation-test-background" src={sceneArt} alt="" />}
          {compareFrame !== null && <SpriteAnimation actorKey={actorKey} motion={motion}
            paused frame={compareFrame} facing={facingFor(comparedTransform)}
            style={styleFor(comparedTransform, { '--compare-opacity': compareOpacity })}
            className="animation-test-sprite animation-compare-sprite" />}
          <SpriteAnimation actorKey={actorKey} motion={motion} fps={fps}
            playbackMode={playbackMode} paused={paused} frame={controlledFrame}
            frames={boundaryFrames} restartKey={restartKey} facing={facingFor(activeTransform)}
            style={styleFor(activeTransform)}
            className="animation-test-sprite" label={`${actor.name}, ${motionLabel} animation`}
            onFrameChange={handleFrameChange} />
          <span className="animation-test-ground" aria-hidden="true" />
          <span className="animation-frame-readout">
            Frame {visibleFrame + 1}/{actor.columns}
            {boundaryTest ? ' · boundary A/B' : ''}
            {finished ? ' · finished' : ''}
          </span>
        </div>

        <div className="animation-preview-controls">
          <label>
            <span>Background</span>
            <select value={sceneKey} onChange={event => setSceneKey(event.target.value)}>
              {SCENE_OPTIONS.map(([key, label]) => <option value={key} key={key}>{label}</option>)}
            </select>
          </label>
          <label>
            <span>Stage position</span>
            <select value={stagePosition} onChange={event => setStagePosition(event.target.value)}>
              {STAGE_POSITIONS.map(([key, label]) => <option value={key} key={key}>{label}</option>)}
            </select>
          </label>
          <label>
            <span>Inspection zoom · {inspectionZoom.toFixed(2)}×</span>
            <input type="range" min=".5" max="2.5" step=".05" value={inspectionZoom}
              onChange={event => setInspectionZoom(Number(event.target.value))} />
          </label>
        </div>

        <div className="animation-test-character">
          <button className="btn" onClick={() => moveActor(-1)} aria-label="Previous character">←</button>
          <label>
            <span>Character · {actorIndex + 1}/{keys.length}</span>
            <select value={actorIndex} onChange={event => selectActor(Number(event.target.value))}>
              {keys.map((key, index) => <option value={index} key={key}>{CUTSCENE_SPRITES[key].name}</option>)}
            </select>
          </label>
          <button className="btn" onClick={() => moveActor(1)} aria-label="Next character">→</button>
        </div>

        <div className="animation-test-motions" role="group" aria-label="Animation row">
          {motions.map(([key, name], index) => (
            <button className={`btn ${index === motionIndex ? 'primary' : ''}`} key={key}
              onClick={() => setMotionIndex(index)}>{name}</button>
          ))}
        </div>

        <section className="animation-sequence-workbench">
          <header>
            <div><b>Frame order</b><small>Tap an entry to inspect it. Duplicate frames to create timing holds.</small></div>
            <span>{editSequence.length} entries</span>
          </header>
          <div className="animation-sequence-timeline">
            {editSequence.map((frameNumber, index) => (
              <button type="button" key={`${index}-${frameNumber}`}
                className={index === selectedSequenceIndex ? 'selected' : ''}
                onClick={() => selectSequenceEntry(index)}
                aria-label={`Sequence entry ${index + 1}, source frame ${frameNumber + 1}`}>
                <SpriteAnimation actorKey={actorKey} motion={motion} paused frame={frameNumber}
                  facing={facing} className="animation-sequence-thumb" />
                <span>{index + 1}</span><b>F{frameNumber + 1}</b>
              </button>
            ))}
          </div>
          <div className="animation-sequence-actions">
            <button className="btn" disabled={selectedSequenceIndex === 0}
              onClick={() => moveSequenceEntry(-1)}>Move left</button>
            <button className="btn" disabled={selectedSequenceIndex === editSequence.length - 1}
              onClick={() => moveSequenceEntry(1)}>Move right</button>
            <button className="btn" onClick={duplicateSequenceEntry}>Duplicate</button>
            <button className="btn danger" disabled={editSequence.length === 1}
              onClick={removeSequenceEntry}>Remove</button>
            <button className="btn" onClick={addVisibleFrame}>＋ Add shown frame</button>
          </div>
        </section>

        <div className="animation-playback-modes" role="group" aria-label="Playback mode">
          {PLAYBACK_OPTIONS.map(([key, label]) => (
            <button className={`btn ${playbackMode === key ? 'primary' : ''}`} key={key}
              onClick={() => { setPlaybackMode(key); restart(); }}>{label}</button>
          ))}
          <button className={`btn ${boundaryTest ? 'primary' : ''}`}
            onClick={() => {
              setBoundaryTest(value => !value);
              setControlledFrame(null);
              setPlaybackMode('loop');
              restart();
            }}>Last ↔ First</button>
        </div>

        <div className="animation-test-transport">
          <button className="btn" onClick={() => moveMotion(-1)}>← Previous animation</button>
          <button className="btn primary" onClick={togglePlayback}>
            {paused || controlledFrame !== null || finished ? '▶ Preview edited animation' : 'Ⅱ Pause preview'}
          </button>
          <button className="btn" onClick={() => moveMotion(1)}>Next animation →</button>
        </div>

        <label className="animation-frame-scrubber">
          <span>Frame scrub <b>{(controlledFrame ?? visibleFrame) + 1}/{actor.columns}</b></span>
          <input type="range" min="0" max={actor.columns - 1} step="1"
            value={controlledFrame ?? visibleFrame}
            onChange={event => selectFrame(Number(event.target.value))} />
        </label>
        <div className="animation-frame-buttons">
          <button className="btn" onClick={() => selectFrame((controlledFrame ?? visibleFrame) - 1)}>◂ Frame</button>
          <button className="btn" onClick={() => selectFrame((controlledFrame ?? visibleFrame) + 1)}>Frame ▸</button>
        </div>

        <section className="animation-transform-editor">
          <header><b>Source frame {activeFrame + 1} transform</b><small>Offsets are stored per source frame in the exported correction.</small></header>
          <div className="animation-transform-grid">
            <label><span>Horizontal <b>{activeTransform.x}px</b></span>
              <input type="range" min="-160" max="160" value={activeTransform.x}
                onChange={event => updateActiveTransform({ x: Number(event.target.value) })} />
            </label>
            <label><span>Vertical <b>{activeTransform.y}px</b></span>
              <input type="range" min="-160" max="160" value={activeTransform.y}
                onChange={event => updateActiveTransform({ y: Number(event.target.value) })} />
            </label>
            <label><span>Frame scale <b>{activeTransform.scale.toFixed(2)}×</b></span>
              <input type="range" min=".35" max="2.5" step=".05" value={activeTransform.scale}
                onChange={event => updateActiveTransform({ scale: Number(event.target.value) })} />
            </label>
            <label><span>Compare against</span>
              <select value={compareFrame ?? ''} onChange={event => setCompareFrame(event.target.value === '' ? null : Number(event.target.value))}>
                <option value="">Comparison off</option>
                {Array.from({ length: actor.columns }, (_, index) => (
                  <option value={index} key={index}>Source frame {index + 1}</option>
                ))}
              </select>
            </label>
            <label><span>Comparison opacity <b>{Math.round(compareOpacity * 100)}%</b></span>
              <input type="range" min=".1" max=".9" step=".05" value={compareOpacity}
                disabled={compareFrame === null}
                onChange={event => setCompareOpacity(Number(event.target.value))} />
            </label>
          </div>
          <div className="animation-nudge-controls">
            <button className="btn" onClick={() => updateActiveTransform({ y: activeTransform.y + 1 })}>↑ 1px</button>
            <button className="btn" onClick={() => updateActiveTransform({ x: activeTransform.x - 1 })}>← 1px</button>
            <button className={`btn ${activeTransform.flip ? 'primary' : ''}`}
              onClick={() => updateActiveTransform({ flip: !activeTransform.flip })}>Flip frame</button>
            <button className="btn" onClick={() => updateActiveTransform({ x: activeTransform.x + 1 })}>1px →</button>
            <button className="btn" onClick={() => updateActiveTransform({ y: activeTransform.y - 1 })}>1px ↓</button>
            <button className="btn" onClick={() => updateActiveTransform({ x: 0, y: 0, scale: 1, flip: false })}>Reset frame</button>
          </div>
        </section>

        <div className="animation-test-facing" role="group" aria-label="Character facing direction">
          <span>Facing</span>
          <button className={`btn ${facing === 'left' ? 'primary' : ''}`}
            onClick={() => setFacing('left')} aria-pressed={facing === 'left'}>← Left</button>
          <button className={`btn ${facing === 'right' ? 'primary' : ''}`}
            onClick={() => setFacing('right')} aria-pressed={facing === 'right'}>Right →</button>
        </div>

        <label className="animation-test-speed">
          <span>Playback speed <b>{fps} FPS</b></span>
          <input type="range" min="2" max="14" step="1" value={fps}
            onChange={event => setFps(Number(event.target.value))} />
        </label>
        <label className="animation-editor-notes"><span>Correction notes</span>
          <textarea value={notes} onChange={event => setNotes(event.target.value)}
            placeholder="Describe popping, anatomy changes, timing, positioning, or the desired motion…" />
        </label>
        <div className="animation-export-actions">
          <button className="btn primary" onClick={copyExport}>Copy correction JSON</button>
          <button className="btn" onClick={() => {
            downloadJson(`animation-${actorKey}-${motion}.json`, exportPayload());
            setExportStatus('Animation correction JSON downloaded.');
          }}>Download JSON</button>
          {exportStatus && <span>{exportStatus}</span>}
        </div>
        <p className="dim">
          {actor.role} · {motionLabel} · {playbackMode} · facing {facing} · row {motionIndex + 1} of 4
          {boundaryTest ? ' · testing last-to-first join' : ''}
        </p>
    </div>
  );
}
