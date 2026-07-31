import { useMemo, useState } from 'react';
import { CUTSCENE_ART } from './cutsceneArt.js';
import { CUTSCENE_SPRITES } from './cutsceneSprites.js';
import { SpriteAnimation } from './SpriteAnimation.jsx';

const BACKGROUNDS = [
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

const MODES = [
  ['loop', 'Loop'],
  ['once', 'One shot'],
  ['hold', 'Hold last'],
];

function motionsFor(actor) {
  if (actor.role === 'enemy' || actor.role === 'boss') {
    return ['idle', 'moving', 'action', 'defeated'];
  }
  return ['idle', 'moving', 'speaking', actor.role === 'npc' ? 'offer' : 'signature'];
}

function actorDraft(id, actorKey, x, facing, layer) {
  const actor = CUTSCENE_SPRITES[actorKey];
  return {
    id,
    actorKey,
    motion: 'idle',
    x,
    y: 0,
    scale: actor.role === 'boss' ? 1.25 : .9,
    facing,
    layer,
    playbackMode: actor.playback.idle,
    fps: actor.fps.idle,
    manualFrame: false,
    frame: 0,
  };
}

function downloadJson(filename, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function CutsceneComposer() {
  const actorKeys = useMemo(() => Object.keys(CUTSCENE_SPRITES), []);
  const [backgroundKey, setBackgroundKey] = useState('merchantShop');
  const [title, setTitle] = useState('Untitled cutscene');
  const [notes, setNotes] = useState('');
  const [actors, setActors] = useState([
    actorDraft(1, 'rat-merchant', 28, 'right', 1),
    actorDraft(2, 'sapper', 80, 'left', 2),
  ]);
  const [selectedId, setSelectedId] = useState(1);
  const [nextId, setNextId] = useState(3);
  const [exportStatus, setExportStatus] = useState('');

  const selected = actors.find(actor => actor.id === selectedId) || actors[0];
  const selectedDefinition = selected ? CUTSCENE_SPRITES[selected.actorKey] : null;

  const updateSelected = patch => {
    setActors(current => current.map(actor => actor.id === selectedId ? { ...actor, ...patch } : actor));
  };
  const addActor = () => {
    const draft = actorDraft(nextId, 'sapper', 50, 'left', actors.length + 1);
    setActors(current => [...current, draft]);
    setSelectedId(nextId);
    setNextId(value => value + 1);
  };
  const removeActor = () => {
    if (!selected || actors.length === 1) return;
    const remaining = actors.filter(actor => actor.id !== selectedId);
    setActors(remaining);
    setSelectedId(remaining[0].id);
  };
  const changeActor = actorKey => {
    const definition = CUTSCENE_SPRITES[actorKey];
    updateSelected({
      actorKey,
      motion: 'idle',
      facing: definition.motionFacing?.idle || definition.sourceFacing,
      playbackMode: definition.playback.idle,
      fps: definition.fps.idle,
      scale: definition.role === 'boss' ? 1.25 : .9,
      manualFrame: false,
      frame: 0,
    });
  };
  const changeMotion = motion => {
    updateSelected({
      motion,
      playbackMode: selectedDefinition.playback[motion],
      fps: selectedDefinition.fps[motion],
      manualFrame: false,
      frame: 0,
    });
  };
  const payload = () => ({
    schema: 'flag-the-deep.cutscene-composition/v1',
    createdAt: new Date().toISOString(),
    title,
    backgroundKey,
    notes,
    actors: actors.map(({ id, ...actor }) => actor),
  });
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload(), null, 2));
      setExportStatus('Composition JSON copied.');
    } catch {
      setExportStatus('Clipboard unavailable; use Download JSON.');
    }
  };

  return (
    <div className="cutscene-composer">
      <div className="animation-composer-stage">
        <img src={CUTSCENE_ART[backgroundKey]} alt="" />
        {[...actors].sort((a, b) => a.layer - b.layer).map(draft => (
          <button type="button" key={draft.id}
            className={`composer-actor ${draft.id === selectedId ? 'selected' : ''}`}
            style={{
              left: `${draft.x}%`,
              bottom: `${draft.y}%`,
              width: `${34 * draft.scale}%`,
              zIndex: draft.layer + 1,
            }}
            onClick={() => setSelectedId(draft.id)}
            aria-label={`Edit ${CUTSCENE_SPRITES[draft.actorKey].name}`}>
            <SpriteAnimation actorKey={draft.actorKey} motion={draft.motion}
              fps={draft.fps} playbackMode={draft.playbackMode}
              frame={draft.manualFrame ? draft.frame : null}
              facing={draft.facing} className="composer-sprite" />
          </button>
        ))}
        <span className="composer-safe-line" aria-hidden="true" />
      </div>

      <div className="composer-scene-fields">
        <label><span>Composition name</span><input value={title} onChange={event => setTitle(event.target.value)} /></label>
        <label><span>Background</span><select value={backgroundKey} onChange={event => setBackgroundKey(event.target.value)}>
          {BACKGROUNDS.map(([key, label]) => <option value={key} key={key}>{label}</option>)}
        </select></label>
      </div>

      <div className="composer-actor-list">
        {actors.map(draft => <button key={draft.id} className={`btn ${draft.id === selectedId ? 'primary' : ''}`}
          onClick={() => setSelectedId(draft.id)}>
          {draft.layer} · {CUTSCENE_SPRITES[draft.actorKey].name}
        </button>)}
        <button className="btn" onClick={addActor}>＋ Add sprite</button>
      </div>

      {selected && selectedDefinition && <section className="composer-inspector">
        <header><h3>Selected sprite</h3><button className="btn danger" disabled={actors.length === 1} onClick={removeActor}>Remove</button></header>
        <div className="composer-grid">
          <label><span>Character</span><select value={selected.actorKey} onChange={event => changeActor(event.target.value)}>
            {actorKeys.map(key => <option value={key} key={key}>{CUTSCENE_SPRITES[key].name}</option>)}
          </select></label>
          <label><span>Motion</span><select value={selected.motion} onChange={event => changeMotion(event.target.value)}>
            {motionsFor(selectedDefinition).map(motion => <option value={motion} key={motion}>{motion}</option>)}
          </select></label>
          <label><span>Facing</span><select value={selected.facing} onChange={event => updateSelected({ facing: event.target.value })}>
            <option value="left">Left</option><option value="right">Right</option>
          </select></label>
          <label><span>Playback</span><select value={selected.playbackMode} onChange={event => updateSelected({ playbackMode: event.target.value })}>
            {MODES.map(([key, label]) => <option value={key} key={key}>{label}</option>)}
          </select></label>
        </div>
        <div className="composer-sliders">
          <label><span>Horizontal <b>{selected.x}%</b></span><input type="range" min="0" max="100" value={selected.x}
            onChange={event => updateSelected({ x: Number(event.target.value) })} /></label>
          <label><span>Vertical <b>{selected.y}%</b></span><input type="range" min="-10" max="55" value={selected.y}
            onChange={event => updateSelected({ y: Number(event.target.value) })} /></label>
          <label><span>Scale <b>{selected.scale.toFixed(2)}×</b></span><input type="range" min=".3" max="2" step=".05" value={selected.scale}
            onChange={event => updateSelected({ scale: Number(event.target.value) })} /></label>
          <label><span>Layer <b>{selected.layer}</b></span><input type="range" min="1" max="12" value={selected.layer}
            onChange={event => updateSelected({ layer: Number(event.target.value) })} /></label>
          <label><span>Speed <b>{selected.fps} FPS</b></span><input type="range" min="2" max="14" value={selected.fps}
            onChange={event => updateSelected({ fps: Number(event.target.value) })} /></label>
          <label className="composer-frame-lock"><span>Frame override</span>
            <input type="checkbox" checked={selected.manualFrame}
              onChange={event => updateSelected({ manualFrame: event.target.checked })} />
            <input type="range" min="0" max={selectedDefinition.columns - 1} value={selected.frame}
              disabled={!selected.manualFrame}
              onChange={event => updateSelected({ frame: Number(event.target.value) })} />
            <b>{selected.frame + 1}</b>
          </label>
        </div>
      </section>}

      <label className="composer-notes"><span>Direction notes</span>
        <textarea value={notes} onChange={event => setNotes(event.target.value)}
          placeholder="Dialogue beat, timing, entrance, camera, or correction notes…" />
      </label>
      <div className="composer-export">
        <button className="btn primary" onClick={copy}>Copy composition JSON</button>
        <button className="btn" onClick={() => {
          downloadJson(`cutscene-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'composition'}.json`, payload());
          setExportStatus('Composition JSON downloaded.');
        }}>Download JSON</button>
        {exportStatus && <span>{exportStatus}</span>}
      </div>
    </div>
  );
}
