import { useEffect, useRef, useState } from 'react';
import { CARDS, GADGETS } from '../engine/data.js';
import {
  run, ui, cbt, board, curTarget, effCost, endTurn,
  clickHandCard, cancelTargeting, selectEnemy, useGadget, toggleFlagMode,
  openPileModal, LAIR_COLORS,
} from '../engine/engine.js';
import { TopBar } from './TopBar.jsx';
import { BoardView } from './BoardView.jsx';
import { CardView } from './CardView.jsx';

const SPEC_TEXT = {
  hidden: 'a hidden tile', open: 'a revealed tile', number: 'a revealed number',
  row: 'a row', anytile: 'any tile',
};

function EnemyView({ e, idx, hitMode, onHover }) {
  const pct = Math.max(0, (e.hp / e.maxHp) * 100);
  const targeted = curTarget() === e;
  const buried = e.data.buried;
  const b = board();
  const lairLeft = (e.lair || []).filter(i => {
    const cell = b.cells[i];
    return cell && !cell.void && !cell.revealed && !cell.entombed;
  }).length;
  const myFx = ui.dmg.filter(d => d.kind === 'enemy' && d.idx === idx);
  const wasHit = myFx.some(d => d.amount > 0);
  const cls = ['enemy', targeted ? 'targeted' : '', e.hp <= 0 ? 'dead' : '',
    hitMode === 'sure' ? 'willhit' : '', hitMode === 'maybe' ? 'willhit-maybe' : '',
    wasHit ? 'ehit' : ''].filter(Boolean).join(' ');
  return (
    <div className={cls} onClick={() => selectEnemy(idx)}
      onMouseEnter={() => onHover(idx)} onMouseLeave={() => onHover(-1)}>
      {targeted && !buried && <div className="targetchip">⌖ TARGET</div>}
      {myFx.map((d, k) => (
        <span key={d.id} className={`dmgfloat ${d.amount > 0 ? '' : 'soft'}`}
          style={{ right: 14 + (k % 3) * 26 }}>
          {d.amount > 0 ? `−${d.amount}` : d.note}
        </span>
      ))}
      <div className="art">{buried ? '🕳️' : e.def.emoji}</div>
      <div className="einfo">
        <div className="ename">
          {e.def.name}
          {e.def.boss ? <> <span className="elite">BOSS</span></> : e.def.elite ? <> <span className="elite">ELITE</span></> : null}
          {buried ? <> <span className="dim">(buried — untargetable)</span></> : null}
        </div>
        <div className="hpline"><div className="hpfill" style={{ width: `${pct}%` }} /></div>
        <div className="estats">
          {e.hp}/{e.maxHp}
          {e.block ? ` · 🛡${e.block}` : ''}
          {lairLeft > 0 && (
            <span title="Its lair: reveal these tiles to hurt it — safe tiles deal their number, detonated mines deal 10.">
              {' · '}
              <span className="lairswatch" style={{ background: LAIR_COLORS[idx % LAIR_COLORS.length] }} />
              ⛏ {lairLeft}
            </span>
          )}
          {e.def.gated ? <> · <span className="dim">{e.def.gateNote}</span></> : null}
        </div>
      </div>
      <div className={`intent ${e.intent ? e.intent.cls : ''}`}>{e.intent ? e.intent.label : ''}</div>
    </div>
  );
}

export function CombatScreen() {
  const c = cbt();
  const b = board();
  const logRef = useRef(null);

  /* --- card life-cycle animation state --- */
  const seenRef = useRef({ combat: null, ids: new Set() });   // ids already dealt in
  const nodesRef = useRef(new Map());                         // card id -> hand DOM node
  const rectsRef = useRef(new Map());                         // card id -> last known rect
  const prevHandRef = useRef([]);                             // hand snapshot from last render
  const [ghosts, setGhosts] = useState([]);                   // flying copies of departed cards
  const [hoverHits, setHoverHits] = useState(null);           // hit-mode of the hovered hand card
  const [hoverLair, setHoverLair] = useState(-1);             // hovered enemy -> highlight its lair
  if (seenRef.current.combat !== c) {
    seenRef.current = { combat: c, ids: new Set() };
    nodesRef.current = new Map();
    rectsRef.current = new Map();
    prevHandRef.current = [];
  }

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
    // remember where each hand card sits, so it can fly from there when it leaves
    for (const [id, node] of nodesRef.current) {
      if (node.isConnected) rectsRef.current.set(id, node.getBoundingClientRect());
    }
    const currentIds = new Set(c.hand.map(x => x.id));
    const removed = prevHandRef.current.filter(x => !currentIds.has(x.id));
    if (removed.length) {
      // one card leaving = played (flies to the board); many = end-of-turn discard
      const modeCls = removed.length > 2 ? 'discard' : 'played';
      const spawned = removed
        .map(x => ({ ...x, mode: modeCls, rect: rectsRef.current.get(x.id) }))
        .filter(x => x.rect);
      if (spawned.length) {
        setGhosts(g => [...g, ...spawned]);
        setTimeout(() => setGhosts(g => g.filter(x => !spawned.includes(x))), 650);
      }
    }
    prevHandRef.current = c.hand.map(x => ({ id: x.id, key: x.key, up: x.up }));
    for (const card of c.hand) seenRef.current.ids.add(card.id);
  });

  const minesLeft = b.cells.filter(x => x.mine && !x.void).length;
  const flags = b.cells.filter(x => x.flag && !x.revealed && !x.void).length;
  const safeLeft = b.cells.filter(x => !x.mine && !x.void && !x.revealed && !x.entombed).length;
  const t = ui.targeting;
  const spec = t ? t.specs[t.picked.length] : null;
  /* which enemies would the active (targeting or hovered) card hit? */
  const activeHits = t ? (CARDS[c.hand[t.handIdx].key].hits || null) : hoverHits;
  const hitModeFor = e => {
    if (!activeHits || e.hp <= 0 || e.data.buried) return null;
    if (activeHits === 'target') return curTarget() === e ? 'sure' : null;
    if (activeHits === 'all') return 'sure';
    return 'maybe'; // random
  };

  return (
    <>
      <TopBar>
        <span className="stat">🛡 <b>{c.block}</b></span>
        <span className="stat" style={{ color: 'var(--n4)' }}>⛨ <b>{c.plating}</b></span>
        {(run.cls === 'surveyor' || c.insight > 0) && (
          <span className="stat" style={{ color: 'var(--n2)' }}>👁 <b>{c.insight}</b> Insight</span>
        )}
        <span className="seg" title="hidden mines − flags">☀ {String(Math.max(0, minesLeft - flags)).padStart(2, '0')}</span>
        <span className="seg" title="safe tiles left — reveal them all to FULL CLEAR: the board collapses for 50 damage to ALL enemies, then re-seals" style={{ color: '#7fe89a', textShadow: '0 0 7px rgba(90,160,114,.75)' }}>▦ {String(safeLeft).padStart(2, '0')}</span>
        <span className="seg" title="turn">T{String(c.turn).padStart(2, '0')}</span>
        {!c.instinctUsed && (
          <span className="stat dim" title="Once per combat, a revealed mine is flagged instead of detonating.">🐾 instinct ready</span>
        )}
      </TopBar>

      {t && (
        <div className="hint">
          🎯 {CARDS[c.hand[t.handIdx].key].name}: pick {SPEC_TEXT[spec] || ''} ({t.picked.length}/{t.specs.length})
          {t.optional && t.picked.length > 0 ? ' · click the card again to finish' : ''}
          {' · '}
          <a style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={cancelTargeting}>cancel</a>
        </div>
      )}
      {!t && ui.gadgetTargeting && (
        <div className="hint">
          🎯 {GADGETS[ui.gadgetTargeting].name}: pick a tile
          {' · '}
          <a style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={cancelTargeting}>cancel</a>
        </div>
      )}

      <div className="combat">
        <div className="boardcol">
          <BoardView mode="combat" hiliteLair={hoverLair} />
          <div className="boardinfo">
            <button className="btn" onClick={toggleFlagMode}
              style={ui.flagMode ? { borderColor: 'var(--flag)', color: 'var(--flag)' } : undefined}>
              ⚑ Flag mode: {ui.flagMode ? 'ON' : 'off'}
            </button>
            <span className="dim">right-click also flags</span>
          </div>
        </div>
        <div className="sidecol">
          <div className="targethint">
            ⌖ marks your target — click an enemy to switch it.
            Cards say who they hit: <b>⌖ target</b> · <b>✸ random</b> · <b>☄ all</b>.
            <br />⛏ Each enemy nests in a tinted <b>lair</b>: revealing its tiles wounds it
            (numbers hit harder), detonating its mines deals 10. Kill it and its lair crumbles open.
          </div>
          {c.enemies.map((e, i) => (
            <EnemyView key={i} e={e} idx={i} hitMode={hitModeFor(e)} onHover={setHoverLair} />
          ))}
          {run.gadgets.length > 0 && (
            <div className="gadgetrow">
              Gadgets:
              {run.gadgets.map((g, i) => (
                <button key={`${g}-${i}`} className="gadget" title={GADGETS[g].desc} onClick={() => useGadget(g)}>
                  {GADGETS[g].emoji} {GADGETS[g].name}
                </button>
              ))}
            </div>
          )}
          {c.powersPlayed.length > 0 && (
            <div className="gadgetrow dim">Powers: {c.powersPlayed.map(p => CARDS[p.key].name).join(', ')}</div>
          )}
          <div className="log" ref={logRef}>
            {c.log.map((x, i) => <div key={i} className="entry">{x}</div>)}
          </div>
        </div>
      </div>

      <div className="handzone">
        <div className="pilerow">
          <span className="energyorb">{c.energy}⚡</span>
          <span className="pile" onClick={() => openPileModal('draw')}>Draw: {c.draw.length}</span>
          <span className="pile" onClick={() => openPileModal('discard')}>Discard: {c.discard.length}</span>
          {c.exhaust.length > 0 && (
            <span className="pile" onClick={() => openPileModal('exhaust')}>Exhaust: {c.exhaust.length}</span>
          )}
          <button className="btn primary" style={{ marginLeft: 'auto' }} onClick={endTurn}>END TURN ▸</button>
        </div>
        <div className="hand">
          {c.hand.map((card, i) => {
            const def = CARDS[card.key];
            const affordable = def.cost != null && effCost(card) <= c.energy;
            const center = (c.hand.length - 1) / 2;
            const isNew = !seenRef.current.ids.has(card.id);
            return (
              <div key={card.id}
                className={`handslot ${isNew ? 'deal' : ''}`}
                style={{
                  '--rot': `${(i - center) * 2}deg`,
                  '--dip': `${Math.abs(i - center) * 4}px`,
                  animationDelay: isNew ? `${i * 60}ms` : undefined,
                }}
                onMouseEnter={() => setHoverHits(def.hits || null)}
                onMouseLeave={() => setHoverHits(null)}
                ref={el => {
                  if (el) nodesRef.current.set(card.id, el);
                  else nodesRef.current.delete(card.id);
                }}>
                <CardView card={card} inCombat
                  selected={t ? t.handIdx === i : false}
                  dim={!affordable || def.unplayable}
                  onClick={() => clickHandCard(i)} />
              </div>
            );
          })}
        </div>
      </div>
      {ghosts.map(g => (
        <div key={`ghost-${g.id}`} className={`cardghost ${g.mode}`}
          style={{ left: g.rect.left, top: g.rect.top, width: g.rect.width }}>
          <CardView card={{ id: g.id, key: g.key, up: g.up }} />
        </div>
      ))}
    </>
  );
}
