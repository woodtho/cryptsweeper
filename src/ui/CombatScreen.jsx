import { useEffect, useRef, useState } from 'react';
import { CARDS, GADGETS, TRINKETS } from '../engine/data.js';
import {
  run, ui, cbt, board, curTarget, effCost, endTurn,
  clickHandCard, cancelTargeting, selectEnemy, useGadget,
  openPileModal, LAIR_COLORS,
  ENEMY_MODIFIERS,
} from '../engine/engine.js';
import { TopBar } from './TopBar.jsx';
import { enemyIcon } from './enemyIcons.jsx';
import { itemVector } from './themedIcons.jsx';
import { BoardView } from './BoardView.jsx';
import { CardView } from './CardView.jsx';
import { GameIcon, IconText } from './gameIcons.jsx';

const SPEC_TEXT = {
  hidden: 'a hidden tile', open: 'a revealed tile', number: 'a revealed number',
  row: 'a row', anytile: 'any tile',
};

function EnemyView({ e, idx, hitMode, onHover, focused, onFocus, emoji, preferences }) {
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
  const cls = ['enemy', targeted ? 'targeted' : '', focused ? 'focused' : '', e.hp <= 0 ? 'dead' : '',
    hitMode === 'sure' ? 'willhit' : '', hitMode === 'maybe' ? 'willhit-maybe' : '',
    wasHit ? 'ehit' : ''].filter(Boolean).join(' ');
  return (
    <div className={cls} onClick={() => onFocus(idx)}
      onMouseEnter={() => onHover(idx)} onMouseLeave={() => onHover(-1)}>
      {targeted && !buried && <div className="targetchip">⌖ TARGET</div>}
      {myFx.map((d, k) => (
        <span key={d.id} className={`dmgfloat ${d.amount > 0 ? '' : 'soft'}`}
          style={{ right: 14 + (k % 3) * 26 }}>
          {d.amount > 0 ? `−${d.amount}` : d.note}
        </span>
      ))}
      <div className="art">{buried ? <GameIcon name="buried" preferences={preferences} /> : emoji}</div>
      <div className="einfo">
        <div className="ename">
          {e.def.name}
          {e.modifier && <span className={`enemy-modifier ${e.modifier}`} title={ENEMY_MODIFIERS[e.modifier].desc}>{ENEMY_MODIFIERS[e.modifier].mark} {ENEMY_MODIFIERS[e.modifier].name}</span>}
          {e.def.boss ? <> <span className="elite">BOSS</span></> : e.def.elite ? <> <span className="elite">ELITE</span></> : null}
          {buried ? <> <span className="dim">(buried — untargetable)</span></> : null}
        </div>
        <div className="hpline"><div className="hpfill" style={{ width: `${pct}%` }} /></div>
        <div className="estats">
          {e.hp}/{e.maxHp}
          {e.block ? <> · <GameIcon name="block" preferences={preferences} />{e.block}</> : ''}
          {lairLeft > 0 && (
            <span title="Its lair: reveal these tiles to hurt it — safe tiles deal their number, detonated mines deal 10.">
              {' · '}
              <span className="lairswatch" style={{ background: LAIR_COLORS[idx % LAIR_COLORS.length] }} />
              <GameIcon name="lair" preferences={preferences} /> {lairLeft}
            </span>
          )}
          {e.def.gated ? <> · <span className="dim">{e.def.gateNote}</span></> : null}
        </div>
      </div>
      <div className={`intent ${e.intent ? e.intent.cls : ''}`}>{e.intent ? e.intent.label : ''}</div>
    </div>
  );
}

function EnemyToken({ e, idx, selected, onClick, emoji, preferences }) {
  if (e.hp <= 0) return null;
  const intentIcon = <GameIcon name={e.intent?.cls === 'atk' ? 'attack' : e.intent?.cls === 'defend' ? 'defend' : 'lair'} preferences={preferences} />;
  return <button type="button" className={`enemy-token ${selected ? 'selected' : ''}`} onClick={() => onClick(idx)}
    aria-label={`${e.def.name}, ${e.hp} of ${e.maxHp} health. ${e.intent?.label || 'No intent'}`}>
    <span className="enemy-token-art">{e.data.buried ? <GameIcon name="buried" preferences={preferences} /> : emoji}</span>
    {e.modifier && <span className={`enemy-token-modifier ${e.modifier}`} title={`${ENEMY_MODIFIERS[e.modifier].name}: ${ENEMY_MODIFIERS[e.modifier].desc}`}>{ENEMY_MODIFIERS[e.modifier].mark}</span>}
    <span className="enemy-token-hp"><GameIcon name="health" preferences={preferences} /> {e.hp}</span>
    <span className={`enemy-token-intent ${e.intent?.cls || ''}`} title={e.intent?.label}>{intentIcon}</span>
    {curTarget() === e && !e.data.buried && <span className="enemy-token-target">⌖</span>}
  </button>;
}

export function CombatScreen({ preferences = {} }) {
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
  const [focusedEnemy, setFocusedEnemy] = useState(-1);
  const [showLog, setShowLog] = useState(false);
  const [showHand, setShowHand] = useState(false);
  const [showItems, setShowItems] = useState(false);
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
  const focusEnemy = idx => {
    selectEnemy(idx);
    setFocusedEnemy(current => current === idx ? -1 : idx);
  };
  const enemyRoster = (className, keyPrefix, compact = false) => <div className={`enemy-roster ${className}`}>
    <div className="enemy-roster-head"><b>Enemies</b><small>Tap to target and focus</small></div>
    <div className="enemy-roster-list">
      {compact ? c.enemies.map((e, i) => (
        <EnemyToken key={`${keyPrefix}-${i}`} e={e} idx={i} selected={focusedEnemy === i} onClick={focusEnemy}
          emoji={enemyIcon(e.key, e.def, preferences)} preferences={preferences} />
      )) : c.enemies.map((e, i) => (
        <EnemyView key={`${keyPrefix}-${i}`} e={e} idx={i} hitMode={hitModeFor(e)} onHover={setHoverLair}
          focused={focusedEnemy === i} onFocus={focusEnemy} emoji={enemyIcon(e.key, e.def, preferences)} preferences={preferences} />
      ))}
    </div>
    {compact && focusedEnemy >= 0 && c.enemies[focusedEnemy]?.hp > 0 && <div className="enemy-detail-popover">
      <button type="button" className="enemy-detail-close" onClick={() => setFocusedEnemy(-1)} aria-label="Close enemy details">×</button>
      <EnemyView e={c.enemies[focusedEnemy]} idx={focusedEnemy} hitMode={hitModeFor(c.enemies[focusedEnemy])}
        onHover={setHoverLair} focused onFocus={focusEnemy}
        emoji={enemyIcon(c.enemies[focusedEnemy].key, c.enemies[focusedEnemy].def, preferences)} preferences={preferences} />
    </div>}
  </div>;
  const itemEntries = [
    ...run.trinkets.map(key => ({ id: `trinket:${key}`, key, kind: 'trinket', def: TRINKETS[key] })),
    ...run.gadgets.map(key => ({ id: `gadget:${key}`, key, kind: 'gadget', def: GADGETS[key] })),
  ].reduce((entries, item) => {
    const found = entries.find(entry => entry.id === item.id);
    if (found) found.count++;
    else entries.push({ ...item, count: 1 });
    return entries;
  }, []);

  return (
    <>
      <TopBar>
        <span className="stat" data-mechanic="block"><GameIcon name="block" preferences={preferences} /> <b>{c.block}</b></span>
        <span className="stat" data-mechanic="plating" style={{ color: 'var(--n4)' }}><GameIcon name="plating" preferences={preferences} /> <b>{c.plating}</b></span>
        {(run.cls === 'surveyor' || c.insight > 0) && (
          <span className="stat" data-mechanic="insight" aria-label={`${c.insight} Insight`} title="Insight" style={{ color: 'var(--n2)' }}><GameIcon name="insight" preferences={preferences} /> <b>{c.insight}</b><span className="stat-label"> Insight</span></span>
        )}
        <span className="seg" data-mechanic="mines" tabIndex="0" title="hidden mines − flags"><GameIcon name="mines" preferences={preferences} /> {String(Math.max(0, minesLeft - flags)).padStart(2, '0')}</span>
        <span className="seg" data-mechanic="full clear" title="safe tiles left" style={{ color: '#7fe89a', textShadow: '0 0 7px rgba(90,160,114,.75)' }}><GameIcon name="safe" preferences={preferences} /> {String(safeLeft).padStart(2, '0')}</span>
        <span className="seg" data-mechanic="max picks" title="current / max picks" style={{ color: '#e8c06a', textShadow: '0 0 7px rgba(201,151,59,.75)' }}><GameIcon name="picks" preferences={preferences} /> {c.picks}/{c.maxPicks}</span>
        <span className="seg" data-mechanic="turn" tabIndex="0" title="turn"><GameIcon name="turn" preferences={preferences} /> {String(c.turn).padStart(2, '0')}</span>
        <span className="seg energy-stat" data-mechanic="energy" tabIndex="0"><GameIcon name="energy" preferences={preferences} /> {c.energy}</span>
        <button className="header-pile" onClick={() => openPileModal('draw')} title="Open draw pile"><GameIcon name="draw" preferences={preferences} /> {c.draw.length}</button>
        <button className="header-pile" onClick={() => openPileModal('discard')} title="Open discard pile"><GameIcon name="discard" preferences={preferences} /> {c.discard.length}</button>
        {c.exhaust.length > 0 && <button className="header-pile" onClick={() => openPileModal('exhaust')} title="Open exhaust pile"><GameIcon name="exhaust" preferences={preferences} /> {c.exhaust.length}</button>}
        {!c.instinctUsed && (
          <span className="stat dim" data-mechanic="instinct" aria-label="Instinct ready" title="Instinct ready"><GameIcon name="instinct" preferences={preferences} /><span className="stat-label"> instinct ready</span></span>
        )}
      </TopBar>

      {enemyRoster('mobile-enemy-roster', 'mobile', true)}

      {t && (
        <div className="hint">
          <GameIcon name="target" preferences={preferences} /> {CARDS[c.hand[t.handIdx].key].name}: pick {SPEC_TEXT[spec] || ''} ({t.picked.length}/{t.specs.length})
          {t.optional && t.picked.length > 0 ? ' · click the card again to finish' : ''}
          {' · '}
          <a style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={cancelTargeting}>cancel</a>
        </div>
      )}
      {!t && ui.gadgetTargeting && (
        <div className="hint">
          <GameIcon name="target" preferences={preferences} /> {GADGETS[ui.gadgetTargeting].name}: pick a tile
          {' · '}
          <a style={{ cursor: 'pointer', textDecoration: 'underline' }} onClick={cancelTargeting}>cancel</a>
        </div>
      )}

      <div className="combat">
        <div className="boardcol">
          <BoardView mode="combat" hiliteLair={hoverLair} />
        </div>
        <div className="sidecol" aria-label="Enemies and combat tools">
          {enemyRoster('desktop-enemy-roster', 'desktop')}
          <div className="combat-utility-row">
            {itemEntries.length > 0 && <button type="button" className="item-toggle" onClick={() => setShowItems(x => !x)} aria-expanded={showItems}>
                <span className="item-toggle-bag"><GameIcon name="bag" preferences={preferences} /></span>
                <span className="item-preview">
                  {itemEntries.slice(0, 4).map(item => <span className="item-preview-icon" key={item.id}>{itemVector(item.key, preferences)}<small>{item.count}</small></span>)}
                  {itemEntries.length > 4 && <b>+{itemEntries.length - 4}</b>}
                </span>
                <span className="item-total">{itemEntries.reduce((sum, item) => sum + item.count, 0)}</span>
                <span>{showItems ? '▲' : '▼'}</span>
              </button>}
            <button className={`btn log-toggle ${showLog ? 'active' : ''}`} onClick={() => setShowLog(x => !x)}><GameIcon name="log" preferences={preferences} /> Log {showLog ? '▲' : '▼'}</button>
          </div>
          {showItems && <div className="item-tray">
              {itemEntries.map(item => item.kind === 'gadget'
                ? <button key={item.id} className="item-tray-entry usable" onClick={() => { setShowItems(false); useGadget(item.key); }}>
                    <span>{itemVector(item.key, preferences)}</span><b>{item.def.name}</b><small>{item.def.desc}</small><i>×{item.count} · Use</i>
                  </button>
                : <div key={item.id} className="item-tray-entry">
                    <span>{itemVector(item.key, preferences)}</span><b>{item.def.name}</b><small>{item.def.desc}</small><i>×{item.count}</i>
                  </div>)}
            </div>}
          {c.powersPlayed.length > 0 && (
            <div className="gadgetrow dim">Powers: {c.powersPlayed.map(p => CARDS[p.key].name).join(', ')}</div>
          )}
          {showLog && <div className="log" ref={logRef}>
            {c.log.length ? c.log.map((x, i) => <div key={i} className="entry"><IconText preferences={preferences}>{x}</IconText></div>) : <div className="entry">The crypt is quiet.</div>}
          </div>}
        </div>
      </div>

      <div className={`hand-drawer ${showHand ? 'open' : ''}`}>
        <div className="combat-primary-actions">
          <button className="btn hand-toggle" aria-expanded={showHand} onClick={() => setShowHand(x => !x)}>
            {showHand ? <>▼ Hide cards</> : <><GameIcon name="cards" preferences={preferences} /> Show cards ({c.hand.length})</>}
          </button>
          <button className="btn primary end-turn" onClick={endTurn}>END TURN ▸</button>
        </div>
        {showHand && <div className="handzone"><div className="hand">
          {c.hand.map((card, i) => {
            const def = CARDS[card.key];
            const affordable = def.cost != null && effCost(card) <= c.energy;
            const center = (c.hand.length - 1) / 2;
            const isNew = !seenRef.current.ids.has(card.id);
            const invalid = ui.invalidCard?.cardId === card.id;
            return (
              <div key={invalid ? `${card.id}-${ui.invalidCard.seq}` : card.id}
                className={`handslot ${isNew ? 'deal' : ''} ${invalid ? 'invalid-card' : ''}`}
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
        </div></div>}
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
