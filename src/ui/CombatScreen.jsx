import { useEffect, useRef, useState } from 'react';
import { CARDS, GADGETS, TRINKETS } from '../engine/data.js';
import {
  run, ui, cbt, board, curTarget, effCost, endTurn,
  clickHandCard, cancelTargeting, selectEnemy,
  openPileModal, openMechanicModal, LAIR_COLORS,
  ENEMY_MODIFIERS, ENEMY_EFFECTS, MAX_INSIGHT,
} from '../engine/engine.js';
import { TopBar } from './TopBar.jsx';
import { enemyIcon, enemySpriteKey } from './enemyIcons.jsx';
import { itemVector } from './themedIcons.jsx';
import { BoardView } from './BoardView.jsx';
import { CardView } from './CardView.jsx';
import { GameIcon, IconText } from './gameIcons.jsx';
import { Mark } from './mapIcons.jsx';
import { SpriteAnimation } from './SpriteAnimation.jsx';
import { useDialogFocus } from './useDialogFocus.js';

const SPEC_TEXT = {
  hidden: 'a hidden tile', open: 'an empty safe revealed tile', number: 'a revealed number',
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
    <div className={cls} onClick={() => onFocus(idx)} role="button" tabIndex="0"
      onKeyDown={event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onFocus(idx);
        }
      }}
      aria-label={`${e.def.name}, ${e.hp} of ${e.maxHp} Health, ${e.intent?.label || 'no intent'}`}
      onMouseEnter={() => onHover(idx)} onMouseLeave={() => onHover(-1)}>
      {targeted && !buried && <div className="targetchip">⌖ TARGET</div>}
      {myFx.map((d, k) => (
        <span key={d.id} className={`dmgfloat ${d.amount > 0 ? '' : 'soft'}`}
          style={{ right: 14 + (k % 3) * 26 }}>
          {d.amount > 0 ? `−${d.amount}` : d.note}
        </span>
      ))}
      <div className="art">{buried
        ? <GameIcon name="buried" preferences={preferences} />
        : preferences.animatedBoardEnemies
          ? <SpriteAnimation actorKey={enemySpriteKey(e.key)} motion={focused || targeted ? 'action' : 'idle'}
            variant="battle" className="battle-enemy-sprite" />
          : emoji}</div>
      <div className="einfo">
        <div className="ename">
          {e.def.name}
          {e.modifier && <span className={`enemy-modifier ${e.modifier}`} title={ENEMY_MODIFIERS[e.modifier].desc}>{ENEMY_MODIFIERS[e.modifier].mark} {ENEMY_MODIFIERS[e.modifier].name}</span>}
          {Object.entries(e.effects || {}).filter(([, stacks]) => stacks > 0).map(([key, stacks]) => (
            <span key={key} className={`enemy-effect ${key}`} title={ENEMY_EFFECTS[key]?.desc}>{ENEMY_EFFECTS[key]?.mark} {ENEMY_EFFECTS[key]?.name} {stacks}</span>
          ))}
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
      <div className={`intent ${e.intent ? e.intent.cls : ''}`} title={e.intent?.detail || e.intent?.label}>
        <b>{e.intent ? e.intent.label : ''}</b>
        {e.intent?.detail && <small>{e.intent.detail}</small>}
      </div>
    </div>
  );
}

function EnemyToken({ e, idx, selected, onClick, emoji, preferences }) {
  if (e.hp <= 0) return null;
  const targeted = curTarget() === e && !e.data.buried;
  return <button type="button" className={`enemy-token ${selected ? 'selected' : ''} ${targeted ? 'targeted' : ''}`} onClick={() => onClick(idx)}
    aria-label={`${e.def.name}, ${e.hp} of ${e.maxHp} health${targeted ? ', targeted' : ''}. Open details.`}>
    <span className="enemy-token-name">{e.def.name}</span>
    <span className="enemy-token-art">{e.data.buried
      ? <GameIcon name="buried" preferences={preferences} />
      : preferences.animatedBoardEnemies
        ? <SpriteAnimation actorKey={enemySpriteKey(e.key)} motion={selected ? 'action' : 'idle'}
          variant="battle" className="battle-enemy-sprite" />
        : emoji}</span>
    <span className="enemy-token-hp"><GameIcon name="health" preferences={preferences} /> {e.hp}/{e.maxHp}</span>
    {targeted && <span className="enemy-token-target"><GameIcon name="target" preferences={preferences} /> Target</span>}
  </button>;
}

function ClassMechanicToken({ mechanic }) {
  const description = `${mechanic.label}: ${mechanic.value}. ${mechanic.detailLabel}`;
  return (
    <button type="button"
      className={`enemy-token class-mechanic-token ${mechanic.cls} ${Number(mechanic.current ?? mechanic.value) > 0 ? 'charged' : ''}`}
      onClick={() => openMechanicModal(mechanic)}
      aria-label={`${description} Tap for help and details.`}
      title={`${description} · Open mechanic details`}>
      <span className="class-mechanic-token-label">{mechanic.label}</span>
      <span className="class-mechanic-token-art" aria-hidden="true">{mechanic.icon}</span>
      <span className="class-mechanic-token-value">{mechanic.value}</span>
      <span className="class-mechanic-token-detail" aria-hidden="true">
        {mechanic.detailIcon}
        {mechanic.detailValue != null && <small>{mechanic.detailValue}</small>}
      </span>
    </button>
  );
}

function CombatToolToken({ kind, count, preferences, onClick }) {
  const label = kind === 'items' ? 'Bag' : 'Log';
  return (
    <button type="button" className={`enemy-token combat-tool-token ${kind}`} onClick={onClick}
      aria-label={`Open ${label}${count != null ? `, ${count}` : ''}`}
      title={`Open ${label}`}>
      <span className="combat-tool-token-label">{label}</span>
      <span className="combat-tool-token-art"><GameIcon name={kind === 'items' ? 'bag' : 'log'} preferences={preferences} /></span>
      {count != null && <span className="combat-tool-token-count">{count}</span>}
    </button>
  );
}

const COMBAT_COACH_STEPS = [
  { selector:'.mobile-enemy-roster,.desktop-enemy-roster', title:'Read the threat', copy:'Tap an enemy icon to target it and open its full Health, intent, lair, modifier, and condition details.' },
  { selector:'.board', title:'Work the board', copy:'Use Picks to reveal tiles and long-press to flag. Numbers count all eight neighboring spaces.' },
  { selector:'.hand-toggle', title:'Open your hand', copy:'Cards use Energy and perform the advanced actions: Scan, Defuse, Entomb, Construct, and Chord.' },
  { selector:'.end-turn', title:'Commit the turn', copy:'Check every enemy intent, then End Turn. Surviving enemies act before Energy, Picks, and your next hand refresh.' },
];

const DELVER_RESOURCE_MARKS = {
  sapper: <Mark><path d="M8 8 L5 5 Q3 3 5 2 Q7 1 9 3 L12 6 M16 16 L19 19 Q21 21 19 22 Q17 23 15 21 L12 18 M8 16 L16 8" /><path d="M12 2 V6 M10 4 H14 M12 18 V22 M10 20 H14" /></Mark>,
  surveyor: <Mark><path d="M3 12 Q12 4 21 12 Q12 20 3 12 Z" /><circle cx="12" cy="12" r="3" /><path d="M12 2 V5 M12 19 V22 M2 12 H5 M19 12 H22" /></Mark>,
  terraformer: <Mark><path d="M3 20 V10 L7 7 L11 10 L15 6 L21 10 V20 M3 15 H21 M8 20 V14 M16 20 V13" /><path d="M12 3 V7 M10 5 H14" /></Mark>,
  lamplighter: <Mark><path d="M8 8 H16 L18 11 V18 H6 V11 Z M9 8 V5 H15 V8 M9 21 H15" /><path d="M12 10 Q15 13 12 16 Q9 14 12 10 Z" /></Mark>,
  gambler: <Mark><circle cx="12" cy="12" r="9" /><path d="M8 7 H14 Q18 8 15 12 Q12 15 16 18 M8 17 L16 7" /><circle cx="7" cy="12" r=".8" fill="currentColor" /></Mark>,
  chirurgeon: <Mark><path d="M12 2 Q19 10 19 15 A7 7 0 0 1 5 15 Q5 10 12 2 Z" /><path d="M12 9 V18 M8 13.5 H16" /></Mark>,
  archivist: <Mark><path d="M4 5 H20 V20 H4 Z M7 2 H17 V5 M4 10 H20 M8 14 H16 M8 17 H14" /><path d="M16 12 V19" /></Mark>,
  warden: <Mark><path d="M12 3 L20 6 V11 Q20 17 12 21 Q4 17 4 11 V6 Z" /><path d="M12 7 L16 12 L12 17 L8 12 Z" /></Mark>,
  hexwright: <Mark><circle cx="12" cy="12" r="9" /><path d="M7 17 L10 7 L14 17 L17 7 M8 13 H16" /><circle cx="12" cy="12" r="1" fill="currentColor" /></Mark>,
  revenant: <Mark><path d="M6 21 V10 Q6 4 12 4 Q18 4 18 10 V21 Z M3 21 H21 M9 10 H15 M12 7 V14" /><path d="M8 18 Q12 15 16 18" /></Mark>,
};

const DELVER_MODIFIER_MARKS = {
  turn: <Mark><path d="M6 8 A7 7 0 1 1 5 15 M6 8 V3 M6 8 H11" /><path d="M12 8 V13 L15 15" /></Mark>,
  banked: <Mark><path d="M4 8 H20 V20 H4 Z M7 8 V5 H17 V8 M4 12 H20" /><circle cx="12" cy="16" r="1.5" /></Mark>,
  heat: <Mark><path d="M12 3 Q18 9 16 14 Q15 10 12 9 Q13 13 10 16 Q8 18 12 21 Q5 20 5 14 Q5 9 12 3 Z" /></Mark>,
  fading: <Mark><path d="M15 4 A8 8 0 1 0 20 17 A7 7 0 0 1 15 4 Z M5 5 L7 7 M3 10 H6 M6 17 L8 15" /></Mark>,
  preserved: <Mark><rect x="5" y="10" width="14" height="11" rx="1" /><path d="M8 10 V7 A4 4 0 0 1 16 7 V10 M12 14 V18" /></Mark>,
  ready: <Mark><circle cx="12" cy="12" r="9" /><path d="M7 12 L10 15 L17 8" /></Mark>,
  rigged: <Mark><path d="M5 7 L15 3 L21 9 L17 19 L7 21 L3 15 Z" /><circle cx="9" cy="10" r="1" fill="currentColor" /><circle cx="15" cy="14" r="1" fill="currentColor" /></Mark>,
  recoverable: <Mark><path d="M12 3 Q19 10 19 15 A7 7 0 0 1 5 15 Q5 10 12 3 Z" /><path d="M12 9 V18 M8 13.5 H16 M4 5 L7 5 L7 8" /></Mark>,
  citations: <Mark><path d="M5 7 H10 V12 Q10 17 6 19 M14 7 H19 V12 Q19 17 15 19" /><path d="M6 4 H18" /></Mark>,
  riposte: <Mark><path d="M10 4 L17 7 V12 Q17 17 10 20 Q3 17 3 12 V7 Z" /><path d="M13 14 L21 6 M16 6 H21 V11" /></Mark>,
  runePower: <Mark><path d="M12 2 L14 9 L21 12 L14 15 L12 22 L10 15 L3 12 L10 9 Z" /><circle cx="12" cy="12" r="2" /></Mark>,
  rise: <Mark><path d="M5 21 H19 M7 21 V13 H17 V21 M12 16 V3 M8 7 L12 3 L16 7" /></Mark>,
};

function classMechanicReadout(runState, combat, combatBoard) {
  const constructs = combatBoard.cells.filter(cell => cell.construct);
  const heatedConstructs = constructs.filter(cell => ['sentry', 'relay'].includes(cell.construct?.kind));
  const maxHeat = Math.max(0, ...heatedConstructs.map(cell => Number(cell.construct?.heat || 0)));
  const heatCap = 3 + Number(combat.powers?.heatTolerance || 0);
  const runes = combatBoard.cells.filter(cell => cell.rune);
  const runePower = runes.reduce((sum, cell) => sum + Number(cell.rune?.value || 0), 0);
  const loadedCap = Number(combat.classState.loadedCap || 3);
  const resolveCap = Number(combat.classState.resolveCap || 10);
  const hasDaisyChain = runState.trinkets?.includes('daisychain');
  const byClass = {
    sapper: {
      mechanic: 'blast chain', label: 'Blast Chain', value: Number(combat.classState.blastChain || 0),
      detailKey: 'turn', detailLabel: hasDaisyChain
        ? 'Daisy Chain carries up to 2 unused links into your next turn.'
        : 'This count resets at the start of your next turn.',
      help: `Controlled mine detonations add links to your Blast Chain. Sapper cards reward building a longer chain during the current turn. ${hasDaisyChain
        ? 'Daisy Chain retains up to 2 unused links when your next turn begins.'
        : 'The chain resets when your next turn begins.'}`,
    },
    surveyor: {
      mechanic: 'insight', label: 'Insight', value: `${Number(combat.insight || 0)}/${MAX_INSIGHT}`,
      current: Number(combat.insight || 0), max: MAX_INSIGHT,
      detailKey: 'banked', detailLabel: `Insight is banked until spent, up to its ${MAX_INSIGHT}-point cap.`,
      help: `Gain Insight by surveying safe ground and using Surveyor effects. Insight remains banked between turns until a card spends it for stronger scans, defense, or attacks. You cannot bank more than ${MAX_INSIGHT} Insight.`,
    },
    terraformer: {
      mechanic: 'construct', label: 'Constructs', value: `${constructs.length}/3`,
      detailKey: 'heat', detailValue: `${maxHeat}/${heatCap}`,
      detailLabel: heatedConstructs.length
        ? `The hottest active Construct has ${maxHeat} of ${heatCap} Heat.`
        : `No active Construct has Heat; the overload threshold is ${heatCap}.`,
      current: constructs.length, max: 3,
      help: 'Build up to 3 Constructs on empty safe revealed tiles. Constructs provide repeatable effects at End Turn. Heat-bearing Constructs overload when they reach their Heat threshold.',
    },
    lamplighter: {
      mechanic: 'light', label: 'Light', value: `${Number(combat.classState.light || 0)}/10`,
      detailKey: Number(combat.classState.preserveLight || 0) ? 'preserved' : 'fading',
      detailValue: Number(combat.classState.preserveLight || 0) || null,
      detailLabel: Number(combat.classState.preserveLight || 0)
        ? `${combat.classState.preserveLight} Light is protected from the next turn-start fade.`
        : 'Half of unpreserved Light fades at the start of your turn.',
      current: Number(combat.classState.light || 0), max: 10,
      help: 'Gain Light from large safe cascades and Lamplighter cards, then spend it to strengthen your effects. At the start of a turn, half of any unpreserved Light fades.',
    },
    gambler: {
      mechanic: 'loaded', label: 'Loaded', value: `${Number(combat.classState.loaded || 0)}/${loadedCap}`,
      detailKey: Number(combat.classState.riggedWagers || 0) ? 'rigged' : 'ready',
      detailValue: Number(combat.classState.riggedWagers || 0) || null,
      detailLabel: Number(combat.classState.riggedWagers || 0)
        ? `${combat.classState.riggedWagers} upcoming Wager${combat.classState.riggedWagers === 1 ? ' is' : 's are'} rigged to Heads.`
        : 'No Wager is currently rigged; Loaded can force a future result to Heads.',
      current: Number(combat.classState.loaded || 0), max: loadedCap,
      help: 'Correct manual flags earn Loaded. Gambler cards can spend Loaded to force uncertain Wagers to Heads, turning risk into a predictable payoff.',
    },
    chirurgeon: {
      mechanic: 'blood', label: 'Untreated Blood', value: Number(combat.classState.untreatedBlood || 0),
      detailKey: 'recoverable', detailLabel: 'This much Blood remains recoverable through treatment.',
      help: 'Health paid to Chirurgeon cards becomes Untreated Blood. Treatment effects can recover that Health, but each wound can only be treated once.',
    },
    archivist: {
      mechanic: 'archive', label: 'Archive', value: combat.archive.length,
      detailKey: 'citations', detailValue: Number(combat.classState.citations || 0),
      detailLabel: `${Number(combat.classState.citations || 0)} Citations are banked for Archive and Recall effects.`,
      help: 'Filed cards enter the Archive instead of the discard pile. Recall effects return chosen archived cards to your hand, usually upgraded. The cards currently filed are shown below.',
    },
    warden: {
      mechanic: 'resolve', label: 'Resolve', value: `${Number(combat.classState.resolve || 0)}/${resolveCap}`,
      detailKey: 'riposte', detailLabel: 'Resolve is stored fuel for Riposte effects.',
      current: Number(combat.classState.resolve || 0), max: resolveCap,
      help: 'Gain Resolve when Block or Plating absorbs enemy damage. Resolve remains stored until Warden cards spend it on Ripostes and defensive payoffs.',
    },
    hexwright: {
      mechanic: 'rune', label: 'Runes', value: runes.length,
      detailKey: 'runePower', detailValue: runePower,
      detailLabel: `Inscribed Runes have ${runePower} total power.`,
      help: 'Inscribe truthful revealed numbers as Runes without changing the board clue. Hexwright cards use Rune count, values, parity, and sums, and may consume the Runes.',
    },
    revenant: {
      mechanic: 'grave', label: 'Grave', value: combat.grave.length,
      detailKey: 'rise', detailLabel: 'Cards in the Grave are available to Rise effects.',
      help: 'Grave cards enter the Grave the first time they are played. Rise effects return them upgraded and marked Risen. Risen Attacks deal 50% more damage, and every risen card Exhausts after play. The cards currently buried are shown below.',
    },
  };
  const readout = byClass[runState.cls];
  return readout ? {
    ...readout, cls: runState.cls,
    icon: DELVER_RESOURCE_MARKS[runState.cls],
    detailIcon: DELVER_MODIFIER_MARKS[readout.detailKey],
  } : null;
}

function CombatCoach({ step, onStep, onFinish, onRevealCards }) {
  const entry = COMBAT_COACH_STEPS[step];
  useEffect(() => {
    const targets = [...document.querySelectorAll(entry.selector)].filter(node => node.offsetParent !== null);
    targets.forEach(node => node.classList.add('combat-coach-focus'));
    targets[0]?.scrollIntoView?.({ block:'nearest', inline:'nearest', behavior:'smooth' });
    if (step === 2) onRevealCards();
    return () => targets.forEach(node => node.classList.remove('combat-coach-focus'));
  }, [entry.selector, step, onRevealCards]);
  return <aside className="combat-coach" role="dialog" aria-label={`Combat coach ${step + 1} of ${COMBAT_COACH_STEPS.length}`}>
    <small>Live battle guide · {step + 1}/{COMBAT_COACH_STEPS.length}</small><b>{entry.title}</b><p>{entry.copy}</p>
    <div><button type="button" className="btn" disabled={step === 0} onClick={() => onStep(step - 1)}>←</button>
      <button type="button" className="btn primary" onClick={() => step === COMBAT_COACH_STEPS.length - 1 ? onFinish() : onStep(step + 1)}>{step === COMBAT_COACH_STEPS.length - 1 ? 'Finish' : 'Next →'}</button>
      <button type="button" className="btn" onClick={onFinish}>Don’t show again</button></div>
  </aside>;
}

export function CombatScreen({ preferences = {}, onPreferenceChange = () => {} }) {
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
  const [bottomPanel, setBottomPanel] = useState('stats');
  const showHand = bottomPanel === 'hand';
  const [showItems, setShowItems] = useState(false);
  const [coachStep, setCoachStep] = useState(0);
  const [mobileWindow, setMobileWindow] = useState(null);
  const combatWindowRef = useRef(null);
  useDialogFocus(combatWindowRef, () => setMobileWindow(null), Boolean(mobileWindow));
  if (seenRef.current.combat !== c) {
    seenRef.current = { combat: c, ids: new Set() };
    nodesRef.current = new Map();
    rectsRef.current = new Map();
    prevHandRef.current = [];
  }

  useEffect(() => {
    setBottomPanel('stats');
  }, [c]);

  useEffect(() => {
    if (c.cleanup) setBottomPanel('stats');
  }, [c.cleanup]);

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
    prevHandRef.current = c.hand.map(x => ({ id: x.id, key: x.key, up: x.up, risen: x.risen }));
    // A closed mobile drawer has no card nodes to animate. Keep unseen cards
    // fresh until the player opens the hand, then deal them into view.
    if (showHand) {
      for (const card of c.hand) seenRef.current.ids.add(card.id);
    }
  });

  const minesLeft = b.cells.filter(x => x.mine && !x.void).length;
  const flags = b.cells.filter(x => x.flag && !x.revealed && !x.void).length;
  const safeLeft = b.cells.filter(x => !x.mine && !x.void && !x.revealed && !x.entombed).length;
  const classMechanic = classMechanicReadout(run, c, b);
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
    {!compact && <div className="enemy-roster-head"><b>Enemies</b></div>}
    <div className="enemy-roster-list">
      {compact ? <>
        <span className="enemy-token-group">
          {c.enemies.map((e, i) => (
            <EnemyToken key={`${keyPrefix}-${i}`} e={e} idx={i} selected={focusedEnemy === i} onClick={focusEnemy}
              emoji={enemyIcon(e.key, e.def, preferences)} preferences={preferences} />
          ))}
        </span>
        <span className="combat-token-group">
          {classMechanic && <ClassMechanicToken mechanic={classMechanic} />}
          <CombatToolToken kind="items" count={itemEntries.reduce((sum, item) => sum + item.count, 0)}
            preferences={preferences} onClick={() => setMobileWindow('items')} />
          <CombatToolToken kind="log" count={c.log.length} preferences={preferences}
            onClick={() => setMobileWindow('log')} />
        </span>
      </> : c.enemies.map((e, i) => (
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
  ].reduce((entries, item) => {
    const found = entries.find(entry => entry.id === item.id);
    if (found) found.count++;
    else entries.push({ ...item, count: 1 });
    return entries;
  }, []);

  return (
    <>
      <TopBar combatQuickStats={<>
        <span className="stat combat-quick-stat energy-stat" data-mechanic="energy" tabIndex="0"
          aria-label={`Energy ${c.cleanup ? 0 : c.energy}`}>
          <GameIcon name="energy" preferences={preferences} /> <b>{c.cleanup ? 0 : c.energy}</b>
        </span>
        <span className="stat combat-quick-stat" data-mechanic="max picks"
          title={c.cleanup ? 'Unlimited Picks during board cleanup' : 'current / max Picks'}
          aria-label={c.cleanup ? 'Unlimited Picks' : `Picks ${c.picks} of ${c.maxPicks}`}>
          <GameIcon name="picks" preferences={preferences} /> <b>{c.cleanup ? '∞' : `${c.picks}/${c.maxPicks}`}</b>
        </span>
      </>} />

      {enemyRoster('mobile-enemy-roster', 'mobile', true)}

      {t && (
        <div className="hint">
          <GameIcon name="target" preferences={preferences} /> {CARDS[c.hand[t.handIdx].key].name}: pick {SPEC_TEXT[spec] || ''} ({t.picked.length}/{t.specs.length})
          {t.optional && t.picked.length > 0 ? ' · click the card again to finish' : ''}
          {' · '}
          <button type="button" className="hint-cancel" onClick={cancelTargeting}>Cancel targeting</button>
        </div>
      )}
      {!t && ui.gadgetTargeting && (
        <div className="hint">
          <GameIcon name="target" preferences={preferences} /> {GADGETS[ui.gadgetTargeting].name}: pick a tile
          {' · '}
          <button type="button" className="hint-cancel" onClick={cancelTargeting}>Cancel targeting</button>
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
              {itemEntries.map(item =>
                <div key={item.id} className="item-tray-entry">
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

      <div className={`combat-bottom-dock hand-drawer panel-${bottomPanel}`}>
        <nav className="combat-primary-actions combat-bottom-tabs" aria-label="Combat panels">
          <button type="button" className={`btn ${bottomPanel === 'stats' ? 'primary' : ''}`}
            aria-pressed={bottomPanel === 'stats'} onClick={() => setBottomPanel('stats')}>Stats</button>
          <button type="button" className={`btn hand-toggle ${bottomPanel === 'hand' ? 'primary' : ''}`}
            disabled={c.cleanup} aria-pressed={bottomPanel === 'hand'}
            onClick={() => setBottomPanel('hand')}>
            <GameIcon name="cards" preferences={preferences} /> Hand ({c.hand.length})
          </button>
          <button type="button" className="btn primary end-turn" disabled={c.cleanup} onClick={endTurn}>End Turn ▸</button>
        </nav>
        {bottomPanel === 'stats' && <section className="combat-bottom-panel combat-stats-panel" aria-label="Combat statistics">
          <div className="combat-stats-grid">
            <span className="stat gold" data-mechanic="gold"><GameIcon name="gold" preferences={preferences} /> <b>{run.gold}</b>g</span>
            <span className="stat" data-mechanic="block"><GameIcon name="block" preferences={preferences} /> <b>{c.block}</b></span>
            <span className="stat" data-mechanic="plating" style={{ color: 'var(--n4)' }}><GameIcon name="plating" preferences={preferences} /> <b>{c.plating}</b></span>
            <span className="stat" data-mechanic="mines" title="hidden mines − flags"><GameIcon name="mines" preferences={preferences} /> <b>{String(Math.max(0, minesLeft - flags)).padStart(2, '0')}</b></span>
            <span className="stat" data-mechanic="full clear" title="safe tiles left" style={{ color: '#7fe89a' }}><GameIcon name="safe" preferences={preferences} /> <b>{String(safeLeft).padStart(2, '0')}</b></span>
            <span className="stat" data-mechanic="turn" title="turn"><GameIcon name="turn" preferences={preferences} /> <b>{String(c.turn).padStart(2, '0')}</b></span>
            {!c.cleanup && <button className="header-pile" onClick={() => openPileModal('draw')} title="Open draw pile"><GameIcon name="draw" preferences={preferences} /> {c.draw.length}</button>}
            {!c.cleanup && <button className="header-pile" onClick={() => openPileModal('discard')} title="Open discard pile"><GameIcon name="discard" preferences={preferences} /> {c.discard.length}</button>}
            {!c.cleanup && c.exhaust.length > 0 && <button className="header-pile" onClick={() => openPileModal('exhaust')} title="Open exhaust pile"><GameIcon name="exhaust" preferences={preferences} /> {c.exhaust.length}</button>}
            {!c.cleanup && !c.instinctUsed && <span className="stat dim" data-mechanic="instinct" aria-label="Instinct ready" title="Instinct ready"><GameIcon name="instinct" preferences={preferences} /></span>}
          </div>
        </section>}
        {showHand && !c.cleanup && <div className="handzone"><div className="hand">
          {c.hand.map((card, i) => {
            const def = CARDS[card.key];
            const affordable = def.cost != null && effCost(card) <= c.energy;
            const center = (c.hand.length - 1) / 2;
            const isNew = !seenRef.current.ids.has(card.id);
            const invalid = ui.invalidCard?.cardId === card.id;
            const selected = t ? t.handIdx === i : false;
            return (
              <div key={invalid ? `${card.id}-${ui.invalidCard.seq}` : card.id}
                className={`handslot ${isNew ? 'deal' : ''} ${invalid ? 'invalid-card' : ''} ${selected ? 'selected' : ''}`}
                style={{
                  '--rot': `${(i - center) * 2}deg`,
                  '--dip': `${Math.abs(i - center) * 4}px`,
                  '--hand-order': i + 1,
                  animationDelay: isNew ? `${i * 60}ms` : undefined,
                }}
                onMouseEnter={() => setHoverHits(def.hits || null)}
                onMouseLeave={() => setHoverHits(null)}
                ref={el => {
                  if (el) nodesRef.current.set(card.id, el);
                  else nodesRef.current.delete(card.id);
                }}>
                <CardView card={card} inCombat
                  selected={selected}
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
          <CardView card={{ id: g.id, key: g.key, up: g.up, risen: g.risen }} />
        </div>
      ))}
      {mobileWindow && (
        <div className="overlay combat-tool-overlay" onClick={event => {
          if (event.target === event.currentTarget) setMobileWindow(null);
        }}>
          <section ref={combatWindowRef} tabIndex="-1" className="modal combat-tool-modal" role="dialog" aria-modal="true"
            aria-label={mobileWindow === 'items' ? 'Bag' : 'Combat log'}>
            <header>
              <span><GameIcon name={mobileWindow === 'items' ? 'bag' : 'log'} preferences={preferences} /></span>
              <div><small>Combat window</small><h2>{mobileWindow === 'items' ? 'Bag' : 'Log'}</h2></div>
              <button type="button" className="btn" onClick={() => setMobileWindow(null)} aria-label="Close">×</button>
            </header>
            {mobileWindow === 'items' ? (
              <div className="combat-window-items">
                {itemEntries.length ? itemEntries.map(item =>
                  <div key={item.id} className="item-tray-entry">
                      <span>{itemVector(item.key, preferences)}</span><b>{item.def.name}</b>
                      <small>{item.def.desc}</small><i>×{item.count}</i>
                  </div>)
                  : <p className="dim">Your bag is empty.</p>}
              </div>
            ) : (
              <div className="log combat-window-log">
                {c.log.length ? c.log.map((entry, index) => (
                  <div key={index} className="entry"><IconText preferences={preferences}>{entry}</IconText></div>
                )) : <div className="entry">The crypt is quiet.</div>}
              </div>
            )}
          </section>
        </div>
      )}
      {preferences.showCombatHints && <CombatCoach step={coachStep} onStep={setCoachStep}
        onRevealCards={() => setBottomPanel('hand')} onFinish={() => onPreferenceChange('showCombatHints', false)} />}
    </>
  );
}
