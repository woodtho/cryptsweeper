import { useRef, useState } from 'react';
import {
  run, ui, cbt, board, numAt, neighborsOf, aliveEnemies, tileEligible,
  clickTile, toggleFlag, puzzleClick, puzzleToggleFlag, LAIR_COLORS,
} from '../engine/engine.js';
import { loadPreferences } from '../engine/preferences.js';
import { enemyIcon } from './enemyIcons.jsx';
import { interfaceIcon } from './gameIcons.jsx';

function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }

const LONG_PRESS_MS = 420;
const MOVE_SLOP_PX = 10;

/* orthogonal neighbor index or -1 when off-grid */
function orthIdx(i, size, dir) {
  const r = Math.floor(i / size), c = i % size;
  if (dir === 'top') return r > 0 ? i - size : -1;
  if (dir === 'bottom') return r < size - 1 ? i + size : -1;
  if (dir === 'left') return c > 0 ? i - 1 : -1;
  return c < size - 1 ? i + 1 : -1;
}

function focusBoardTile(current, i, size, key) {
  const offsets = { ArrowUp:-size, ArrowDown:size, ArrowLeft:-1, ArrowRight:1 };
  if (!(key in offsets)) return false;
  const row = Math.floor(i / size);
  let next = i + offsets[key];
  if ((key === 'ArrowLeft' && i % size === 0) || (key === 'ArrowRight' && Math.floor(next / size) !== row)) return true;
  const boardEl = current.closest('.board');
  while (next >= 0 && next < size * size) {
    const target = boardEl?.querySelector(`[data-board-tile="${next}"]`);
    if (target) { target.focus(); break; }
    next += offsets[key];
  }
  return true;
}

function Tile({ i, mode, hiliteLair, inspectMode, onInspect }) {
  const prefs = loadPreferences();
  const b = mode === 'puzzle' ? run.puzzle.board : board();
  const cell = b.cells[i];
  const num = mode === 'puzzle'
    ? neighborsOf(i, b.size).filter(j => b.cells[j].mine).length
    : numAt(i);
  const cls = ['tile'];
  const title = [];
  let content = '';
  if (cell.void) {
    return <div className="tile void" />;
  }
  if (cell.entombed) { cls.push('entombed'); content = '▦'; title.push('Entombed — counts as revealed for Full Clear'); }
  else if (cell.revealed) {
    cls.push('open');
    if (cell.crater) { cls.push('crater'); content = interfaceIcon('crater', prefs); title.push('Crater — a mine detonated here'); }
    else if (cell.construct) {
      cls.push('construct');
      const icons = { sentry: interfaceIcon('sentry', prefs), bulwark: interfaceIcon('bulwark', prefs), relay: interfaceIcon('relay', prefs) };
      const labels = { sentry: 'Sentry — fires at end of turn', bulwark: 'Bulwark — Plating + Block at end of turn', relay: 'Survey Relay — scans and grants Block at end of turn' };
      content = icons[cell.construct.kind] || '◆'; title.push(labels[cell.construct.kind] || 'Construct');
    }
    else if (num > 0) {
      let shown = num;
      if (mode !== 'puzzle' && cbt().lie && cbt().lie.tile === i) {
        shown = clamp(num + cbt().lie.delta, 0, 8);
        cls.push('shimmer');
      }
      if (shown > 0) { cls.push(`numc${shown}`); content = String(shown); }
    }
  } else {
    if (cell.grub) {
      cls.push('grub'); content = interfaceIcon('grub', prefs);
      title.push('Grubber burrow — reveal this tile to unearth it');
    }
    if (cell.flag) {
      cls.push('flag'); if (cell.flag === 2) cls.push('verified'); content = interfaceIcon('flag', prefs);
      title.push(cell.flag === 2 ? 'Verified flag — this IS a mine' : 'Flag (your annotation, unverified)');
    }
    if (cell.primed) {
      cls.push('primed');
      if (!cell.flag) content = interfaceIcon('bomb', prefs);
      title.push('PRIMED — flag, defuse, or reveal it before Detonata strikes!');
    }
    if (cell.glow) { cls.push('glow'); title.push('Dowsing Rod: provably safe'); }
    if (cell.scan) title.push(cell.scan === 'mine' ? 'Scanned: MINE' : 'Scanned: safe');
  }

  /* incoming-mines telegraph (Lay intents) */
  let teleTop = false;
  if (mode !== 'puzzle' && !cell.revealed && !cell.entombed) {
    for (const e of aliveEnemies()) {
      if (e.intent && e.intent.kind === 'lay' && e.intent.col === i % b.size) {
        cls.push('telegraph');
        title.push('Incoming mines will land in this column');
        let above = i - b.size;
        teleTop = true;
        while (above >= 0) { if (!b.cells[above].void) { teleTop = false; break; } above -= b.size; }
        break;
      }
    }
  }

  if (mode !== 'puzzle' && ui.targeting) {
    const spec = ui.targeting.specs[ui.targeting.picked.length];
    if (spec && tileEligible(i, spec, ui.targeting.picked)) cls.push('targetable');
  }
  if (mode !== 'puzzle' && ui.gadgetTargeting) cls.push('targetable');

  /* lair territory: tint + boundary edges + faint owner sigil at the center */
  let lairIdx = -1, lairStyle = null, lairGhost = null;
  if (mode !== 'puzzle') {
    const enemies = cbt().enemies;
    lairIdx = enemies.findIndex(e => e.hp > 0 && e.lair && e.lair.includes(i));
    if (lairIdx >= 0) {
      const owner = enemies[lairIdx];
      const color = LAIR_COLORS[lairIdx % LAIR_COLORS.length];
      lairStyle = { background: `${color}1d` };
      for (const dir of ['top', 'bottom', 'left', 'right']) {
        const j = orthIdx(i, b.size, dir);
        if (j < 0 || !owner.lair.includes(j)) {
          lairStyle[`border${dir[0].toUpperCase()}${dir.slice(1)}`] = `2px solid ${color}aa`;
        }
      }
      if (owner.lair[Math.floor(owner.lair.length / 2)] === i) lairGhost = enemyIcon(owner.key, owner.def, prefs);
      title.push(`${owner.def.name}'s lair — dig here to wound it (numbers hit harder; its mines deal 10 to it)`);
      if (hiliteLair === lairIdx) cls.push('lairhi');
    }
  }

  /* out of picks: free digging is spent for this turn */
  if (mode !== 'puzzle' && !cell.revealed && !cell.entombed && !cell.flag
    && cbt().picks <= 0 && !ui.targeting && !ui.gadgetTargeting && !ui.flagMode) {
    cls.push('nopicks');
  }

  /* touch: long-press places a flag (iOS has no contextmenu; Android's contextmenu
     is deduped against our timer via the `fired` latch). */
  const lp = useRef({ t: null, fired: false, type: 'mouse', x: 0, y: 0 });
  const flagAction = () => {
    if (mode === 'puzzle') puzzleToggleFlag(i);
    else if (!ui.targeting && !ui.gadgetTargeting) toggleFlag(i);
  };
  const cancelPress = () => { clearTimeout(lp.current.t); lp.current.t = null; };
  const onPointerDown = ev => {
    lp.current.type = ev.pointerType;
    if (ev.pointerType !== 'touch') return;
    lp.current.fired = false;
    lp.current.x = ev.clientX; lp.current.y = ev.clientY;
    cancelPress();
    lp.current.t = setTimeout(() => { lp.current.fired = true; flagAction(); }, LONG_PRESS_MS);
  };
  const onPointerMove = ev => {
    if (lp.current.t && Math.hypot(ev.clientX - lp.current.x, ev.clientY - lp.current.y) > MOVE_SLOP_PX) cancelPress();
  };
  const onClick = () => {
    if (lp.current.fired) { lp.current.fired = false; return; }
    if (inspectMode) { onInspect(i, title.join('\n') || 'Unmarked stone'); return; }
    if (mode === 'puzzle') puzzleClick(i); else clickTile(i);
  };
  const onContextMenu = ev => {
    ev.preventDefault();
    cancelPress();
    if (lp.current.type === 'touch') {
      if (!lp.current.fired) { lp.current.fired = true; flagAction(); }
    } else {
      flagAction();
    }
  };

  const inspect = () => onInspect(i, title.join('\n') || (cell.revealed ? 'Cleared stone' : 'Unmarked hidden stone'));
  const onKeyDown = event => {
    if (focusBoardTile(event.currentTarget, i, b.size, event.key)) { event.preventDefault(); return; }
    if (event.key.toLowerCase() === 'f') { event.preventDefault(); flagAction(); return; }
    if (event.key.toLowerCase() === 'i') { event.preventDefault(); inspect(); }
  };

  return (
    <button type="button" className={cls.join(' ')} title={title.join('\n') || undefined}
      data-board-tile={i} aria-label={`Tile ${Math.floor(i / b.size) + 1}, ${i % b.size + 1}. ${title.join('. ') || (cell.revealed ? 'Cleared' : 'Hidden')}`}
      onClick={onClick} onContextMenu={onContextMenu}
      onFocus={() => { if (inspectMode) inspect(); }} onKeyDown={onKeyDown}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove}
      onPointerUp={cancelPress} onPointerCancel={cancelPress} onPointerLeave={cancelPress}>
      {lairStyle ? <span className="lairzone" style={lairStyle} /> : null}
      {lairGhost ? <span className="lairghost">{lairGhost}</span> : null}
      {content}
      {!cell.revealed && !cell.entombed && cell.scan
        ? <span className={`scanmark ${cell.scan}`}>{interfaceIcon(cell.scan === 'mine' ? 'bomb' : 'safe', prefs)}</span> : null}
      {teleTop ? <span className="telemark">▼</span> : null}
    </button>
  );
}

export function BoardView({ mode = 'combat', hiliteLair = -1 }) {
  const [inspectMode, setInspectMode] = useState(false);
  const [inspection, setInspection] = useState(null);
  const b = mode === 'puzzle' ? run.puzzle.board : board();
  const cap = clamp(Math.floor(520 / b.size), 26, 40);
  // shrink below the cap on narrow viewports so the whole board always fits on screen
  const tile = `min(${cap}px, calc((100vw - 58px) / ${b.size}))`;
  const targeting = mode !== 'puzzle' && (ui.targeting || ui.gadgetTargeting);
  return <div className="board-shell">
    <div className="board-tools">
      <button type="button" className={`btn board-inspect-toggle ${inspectMode ? 'active' : ''}`} disabled={Boolean(targeting)}
        aria-pressed={inspectMode} onClick={() => { setInspectMode(value => !value); setInspection(null); }}>
        {inspectMode ? 'Finish inspection' : 'Inspect tiles'}
      </button>
      <small>Keyboard: arrows move · Enter digs · F flags · I inspects</small>
    </div>
    <div className="board" role="grid" aria-label="Crypt board" style={{ '--bsize': b.size, '--tile': tile }}>
      {b.cells.map((_, i) => <Tile key={i} i={i} mode={mode} hiliteLair={hiliteLair}
        inspectMode={inspectMode} onInspect={(index, text) => setInspection({ index, text })} />)}
    </div>
    {inspection && <aside className="tile-inspection" role="status">
      <div><b>Tile {Math.floor(inspection.index / b.size) + 1}, {inspection.index % b.size + 1}</b>
        {inspection.text.split('\n').map(line => <span key={line}>{line}</span>)}</div>
      <button type="button" className="btn" onClick={() => setInspection(null)}>Close</button>
    </aside>}
  </div>;
}
