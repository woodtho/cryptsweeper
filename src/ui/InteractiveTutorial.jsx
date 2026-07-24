import { useEffect, useMemo, useState } from 'react';
import { ENEMIES } from '../engine/data.js';
import { enemyIcon } from './enemyIcons.jsx';
import { GameIcon } from './gameIcons.jsx';
import { CardView } from './CardView.jsx';
import { MechanicsLab } from './MechanicsLab.jsx';
import { MechanicTerms } from './MechanicTerms.jsx';

const LESSONS = [
  { title:'Choose a route', goal:'Tap the connected Dig node.', copy:'A descent moves one connected node at a time. Icons tell you whether the next room is a fight, camp, shop, event, treasure, or boss.' },
  { title:'Read the stone', goal:'Reveal the glowing safe tile.', copy:'Manual reveals spend Picks. A number counts mines in its eight neighboring tiles; zeroes automatically open connected safe ground.' },
  { title:'Prove and Chord', goal:'Flag the mine, play Resonant Tap, then target the revealed 1.', copy:'Flags are free notes, not proof. Chording is card-only: the flag count and positions must both be correct. Try a false flag if you want to see the mine detonate, then solve the position and complete the Chord.' },
  { title:'Choose a target', goal:'Tap the enemy portrait.', copy:'Enemy intent is always shown before it acts. Tap an enemy to target it and inspect Health, Block, lair rules, modifiers, and conditions.' },
  { title:'Spend Energy', goal:'Play Fault Line.', copy:'Cards spend Energy but normally do not spend Picks. Attacks can target one enemy, a random enemy, or every enemy. Remaining cards are discarded at End Turn.' },
  { title:'Exploit a condition', goal:'Strike the Exposed enemy.', copy:'Exposed makes the next hit deal 25% more damage. Jammed weakens a direct attack; Sundered removes Block and limits the next Block gain. All three work on bosses.' },
  { title:'Invade the lair', goal:'Reveal the tinted lair tile.', copy:'Safe lair tiles damage their owner by the revealed number. Lair mines deal 10 when detonated, and Entombing a lair tile deals 3.' },
  { title:'Layer your defenses', goal:'Play Brace, then End Turn.', copy:'Enemy attacks spend Block first, then persistent Plating, then Health. Mines and hostile blasts bypass Block but still consume Plating; voluntary Health costs bypass both.' },
  { title:'Know the rooms', goal:'Inspect every room type.', copy:'Camps offer one recovery or improvement action. Shops spend run Gold. Events create lasting choices, puzzles award upgrades, and bosses guard each deeper stratum.' },
  { title:'Break a boss rule', goal:'Choose how to disable NN-99’s signal shield.', copy:'Bosses have unique mechanics and phase changes. Read the battle preview, intent, and rule text before committing cards or Picks.' },
  { title:'Take a reward', goal:'Choose one card reward.', copy:'After combat, choose or skip a card. Elites can award trinkets, gadgets are consumable, and boss rewards alter the rest of the descent.' },
];

const ROOM_TYPES = ['Camp','Shop','Event','Puzzle','Boss'];
const GUIDED_STORAGE = 'cryptsweeper.tutorial.guided.v2';
const INITIAL_TUTORIAL_STATE = {
  hp:32, maxHp:32, energy:3, picks:3, block:0, plating:2, enemyHp:24,
  target:false, exposed:false, guarded:false, rooms:[], reward:null,
  chordFlag:null, chordArmed:false, chordFailed:false, bossFeedback:null,
};

function loadGuidedProgress() {
  try {
    const saved = JSON.parse(localStorage.getItem(GUIDED_STORAGE) || 'null');
    if (!saved || !Number.isInteger(saved.step) || saved.step < 0 || saved.step > LESSONS.length || !saved.state || !Array.isArray(saved.snapshots)) throw new Error('invalid');
    return saved;
  } catch {
    return { step:0, state:{ ...INITIAL_TUTORIAL_STATE }, snapshots:[{ ...INITIAL_TUTORIAL_STATE }] };
  }
}

export function InteractiveTutorial({ preferences, onClose }) {
  const [mode, setMode] = useState('menu');
  if (mode === 'mechanics') return <MechanicsLab preferences={preferences} onMenu={() => setMode('menu')} onClose={onClose} />;
  if (mode === 'guided') return <GuidedTutorial preferences={preferences} onMenu={() => setMode('menu')} onMechanics={() => setMode('mechanics')} onClose={onClose} />;
  return <section className="tutorial tutorial-menu" aria-label="Interactive tutorial menu">
    <header className="tutorial-head">
      <div><p className="eyebrow">Practice crypt · no run progress affected</p><h2>Interactive tutorial</h2></div>
      <button className="btn" type="button" onClick={onClose}>Close ×</button>
    </header>
    <div className="tutorial-menu-intro"><h3>Choose a practice session</h3><p>Start with the guided descent, then use the Mechanics Lab to interact with every resource, board action, condition, curse, modifier, and documented passive.</p></div>
    <div className="tutorial-mode-grid">
      <button type="button" onClick={() => setMode('guided')}><GameIcon name="picks" preferences={preferences} /><span><b>Guided descent</b><small>11 hands-on lessons covering the complete run and combat loop.</small><i>Recommended first</i></span></button>
      <button type="button" onClick={() => setMode('mechanics')}><GameIcon name="energy" preferences={preferences} /><span><b>Mechanics Lab</b><small>48 interactive drills in five focused sessions.</small><i>Every mechanic</i></span></button>
    </div>
  </section>;
}

function GuidedTutorial({ preferences, onMenu, onMechanics, onClose }) {
  const saved = useMemo(loadGuidedProgress, []);
  const [step, setStep] = useState(saved.step);
  const [state, setState] = useState(saved.state);
  const [snapshots, setSnapshots] = useState(saved.snapshots);
  const lesson = LESSONS[step];
  const rat = useMemo(() => enemyIcon('grubber', ENEMIES.grubber, preferences), [preferences]);
  useEffect(() => {
    try { localStorage.setItem(GUIDED_STORAGE, JSON.stringify({ step, state, snapshots })); } catch { /* unavailable */ }
  }, [step, state, snapshots]);
  const advance = patch => {
    setState(current => {
      const next = { ...current, ...patch };
      const nextStep = Math.min(LESSONS.length, step + 1);
      setSnapshots(previous => { const copy = previous.slice(); copy[nextStep] = next; return copy; });
      setStep(nextStep);
      return next;
    });
  };
  const restart = () => {
    setState({ ...INITIAL_TUTORIAL_STATE });
    setSnapshots([{ ...INITIAL_TUTORIAL_STATE }]);
    setStep(0);
  };
  const previous = () => {
    const target = Math.max(0, step - 1);
    setState({ ...(snapshots[target] || INITIAL_TUTORIAL_STATE) });
    setStep(target);
  };
  const tryChord = () => {
    if (state.chordFlag === 1) {
      setState(current => ({ ...current, chordArmed:true, chordFailed:false }));
      return;
    }
    setState(current => ({ ...current, chordFlag:null, chordArmed:false, chordFailed:true, plating:0, hp:Math.max(1,current.hp - 6) }));
  };
  const inspectRoom = room => {
    const rooms = state.rooms.includes(room) ? state.rooms : [...state.rooms, room];
    setState(current => ({ ...current, rooms }));
    if (rooms.length === ROOM_TYPES.length) {
      const next = { ...state, rooms };
      setSnapshots(previous => { const copy = previous.slice(); copy[9] = next; return copy; });
      setStep(9);
    }
  };

  return <MechanicTerms><section className="tutorial" aria-label="Interactive tutorial">
    <header className="tutorial-head">
      <div><p className="eyebrow">Practice crypt · no run progress affected</p><h2>Interactive tutorial</h2></div>
      <div className="tutorial-head-actions"><button className="btn" type="button" onClick={onMenu}>Tutorial menu</button><button className="btn" type="button" onClick={onClose}>Close ×</button></div>
    </header>
    <div className="tutorial-progress" aria-label={`Lesson ${Math.min(step + 1, LESSONS.length)} of ${LESSONS.length}`}>
      {LESSONS.map((entry, index) => <span key={entry.title} className={index < step ? 'done' : index === step ? 'current' : ''} />)}
    </div>

    {step < LESSONS.length ? <>
      <div className="tutorial-lesson">
        <small>Lesson {step + 1} of {LESSONS.length}</small><h3>{lesson.title}</h3><p>{lesson.copy}</p><b>{lesson.goal}</b>
      </div>
      <div className="tutorial-hud" aria-label="Practice combat statistics">
        <span><GameIcon name="health" preferences={preferences} /> <b>{state.hp}/{state.maxHp}</b><small>Health</small></span>
        <span><GameIcon name="block" preferences={preferences} /> <b>{state.block}</b><small>Block</small></span>
        <span><GameIcon name="plating" preferences={preferences} /> <b>{state.plating}</b><small>Plating</small></span>
        <span><GameIcon name="picks" preferences={preferences} /> <b>{state.picks}</b><small>Picks</small></span>
        <span><GameIcon name="energy" preferences={preferences} /> <b>{state.energy}</b><small>Energy</small></span>
      </div>
      <div className="tutorial-stage">
        {step === 0 && <div className="tutorial-map">
          <button type="button" disabled>Start</button><i>· · ·</i><button type="button" className="available" onClick={() => advance({})}><GameIcon name="attack" preferences={preferences} /> Dig</button><button type="button" disabled>Camp</button>
        </div>}
        {step === 1 && <MiniBoard preferences={preferences} mode="reveal" onAction={() => advance({ picks:2 })} />}
        {step === 2 && <ChordPractice preferences={preferences} state={state}
          onFlag={index => setState(current => ({ ...current, chordFlag:index, chordArmed:false, chordFailed:false }))}
          onChord={tryChord}
          onTarget={() => advance({ chordFlag:null, chordArmed:false, chordFailed:false, hp:32, plating:2 })} />}
        {step === 3 && <TutorialEnemy enemy={rat} state={state} preferences={preferences} onClick={() => advance({ target:true })} />}
        {step === 4 && <div className="tutorial-combat-stage"><TutorialEnemy enemy={rat} state={state} preferences={preferences} /><PracticeCard cardKey="faultline" onPlay={() => advance({ energy:2, enemyHp:19, exposed:true })} /></div>}
        {step === 5 && <div className="tutorial-combat-stage"><TutorialEnemy enemy={rat} state={state} preferences={preferences} /><button type="button" className="tutorial-card attack" onClick={() => advance({ energy:1, enemyHp:11, exposed:false })}><small>1 Energy · Attack</small><b>Stone Strike</b><span>Deal 6 (Exposed: 8).</span></button></div>}
        {step === 6 && <MiniBoard preferences={preferences} mode="lair" onAction={() => advance({ picks:1, enemyHp:8 })} />}
        {step === 7 && <div className="tutorial-turn-actions">
          <PracticeCard cardKey="brace" upgraded disabled={state.guarded} className={state.guarded ? 'played' : ''} onPlay={() => setState(current => ({ ...current, guarded:true, energy:2, block:8 }))} />
          <button type="button" className="btn primary" disabled={!state.guarded} onClick={() => advance({ block:0, plating:0, hp:state.hp, energy:3, picks:3, guarded:false })}>End Turn · 8 Block + 2 Plating absorb Attack 10</button>
        </div>}
        {step === 8 && <div className="tutorial-rooms">{ROOM_TYPES.map(room => <button type="button" className={state.rooms.includes(room) ? 'checked' : ''} key={room} onClick={() => inspectRoom(room)}><b>{state.rooms.includes(room) ? '✓ ' : ''}{room}</b><small>{({ Camp:'Heal, upgrade, survey, or train', Shop:'Buy cards, items, or removal', Event:'Make choices with later consequences', Puzzle:'Solve for a card upgrade', Boss:'Defeat a unique stratum guardian' })[room]}</small></button>)}</div>}
        {step === 9 && <div className="tutorial-choice-list">
          <button type="button" onClick={() => advance({ bossFeedback:null })}><b>Reveal 3 safe tiles or play a Chord card</b><small>Use the board to disrupt the signal before attacking.</small></button>
          <button type="button" onClick={() => setState(current => ({ ...current, bossFeedback:'NN-99 is still shielded: those attacks are reduced. Read the preview and weaken the signal first.' }))}><b>Spend every attack immediately</b><small>Commit damage before interacting with the signal shield.</small></button>
          {state.bossFeedback && <p className="tutorial-correction" role="status">{state.bossFeedback}</p>}
        </div>}
        {step === 10 && <div className="tutorial-rewards">{['Bandage','Signal Jam','Lantern Loan'].map(card => <button type="button" key={card} onClick={() => advance({ reward:card })}><small>Card reward</small><b>{card}</b><span>{card === 'Bandage' ? 'Recover Health.' : card === 'Signal Jam' ? 'Weaken an enemy attack.' : 'Scan tiles and gain a Pick.'}</span></button>)}</div>}
      </div>
      <div className="tutorial-nav"><button className="btn" type="button" disabled={step === 0} onClick={previous}>← Previous lesson</button><button className="btn" type="button" onClick={restart}>Restart</button></div>
    </> : <div className="tutorial-complete">
      <GameIcon name="bossRelic" preferences={preferences} /><h3>Ready for the Undermine</h3>
      <p>You practiced routing, deduction, flags, targeting, cards, Energy, conditions, lairs, defense, enemy turns, boss rules, and rewards. The searchable rulebook below covers every enemy and the deeper systems.</p>
      <div><button className="btn" type="button" onClick={restart}>Practice again</button><button className="btn primary" type="button" onClick={onMechanics}>Open Mechanics Lab</button><button className="btn" type="button" onClick={onClose}>Return to How to Play</button></div>
    </div>}
  </section></MechanicTerms>;
}

function PracticeCard({ cardKey, upgraded = false, onPlay, disabled = false, className = '' }) {
  return <button type="button" className={`tutorial-real-card ${className}`} disabled={disabled} onClick={onPlay}>
    <CardView card={{ id:`tutorial-${cardKey}`, key:cardKey, up:upgraded ? 1 : 0 }} />
  </button>;
}

function ChordPractice({ preferences, state, onFlag, onChord, onTarget }) {
  const cells = ['1','mine','safe','1','safe','safe','0','0','0'];
  return <div className="tutorial-chord-practice">
    <div className="tutorial-board" aria-label="Chord practice board">{cells.map((kind,index) => {
      if (!['mine','safe'].includes(kind)) return index === 0 && state.chordArmed
        ? <button type="button" key={index} className="open target" onClick={onTarget} aria-label="Target revealed 1 with Resonant Tap">{kind}</button>
        : <span key={index} className="open">{kind}</span>;
      const flagged = state.chordFlag === index;
      return <button type="button" key={index} className={flagged ? 'flagged-choice' : ''} onClick={() => onFlag(index)} aria-label={`${flagged ? 'Unflag' : 'Flag'} hidden tile ${index + 1}`}>
        {flagged ? <GameIcon name="flag" preferences={preferences} /> : ''}
      </button>;
    })}</div>
    <div className="tutorial-chord-card"><PracticeCard cardKey="resonanttap" disabled={state.chordFlag == null || state.chordArmed} className={state.chordArmed ? 'played' : ''} onPlay={onChord} /></div>
    <p className={state.chordFailed ? 'tutorial-correction' : 'dim'} role="status">{state.chordFailed
      ? 'False Chord: the flag count matched, but the real mine was exposed. Plating absorbed 2 and Health lost 6. Try again.'
      : state.chordArmed ? 'Resonant Tap is selected. Tap the glowing revealed 1 to resolve the Chord.' : state.chordFlag == null ? 'Choose one hidden neighbor to flag.' : 'Now play Resonant Tap.'}</p>
  </div>;
}

function TutorialEnemy({ enemy, state, preferences, onClick }) {
  return <button type="button" className={`tutorial-enemy ${state.target ? 'targeted' : ''}`} onClick={onClick} disabled={!onClick}>
    <span className="tutorial-enemy-art">{enemy}</span><span><b>Grubber</b><small>{state.enemyHp}/24 HP · Intent: Attack 10</small>{state.exposed && <i>◇ Exposed 1</i>}</span><GameIcon name="target" preferences={preferences} />
  </button>;
}

function MiniBoard({ preferences, mode, onAction }) {
  const cells = mode === 'flag'
    ? [{v:'1',open:true},{v:'',target:true},{v:'1',open:true},{v:'1',open:true},{v:'1',open:true},{v:'1',open:true},{v:'0',open:true},{v:'0',open:true},{v:'0',open:true}]
    : mode === 'lair'
      ? [{v:'0',open:true},{v:'1',open:true},{v:''},{v:'1',open:true},{v:'3',target:true,lair:true},{v:''},{v:''},{v:''},{v:''}]
      : [{v:'0',open:true},{v:'1',open:true},{v:''},{v:'0',open:true},{v:'1',target:true},{v:''},{v:'0',open:true},{v:'1',open:true},{v:''}];
  return <div className="tutorial-board" aria-label="Practice Minesweeper board">{cells.map((cell,index) => cell.target
    ? <button type="button" key={index} className={cell.lair ? 'lair target' : 'target'} onClick={onAction} aria-label={mode === 'flag' ? 'Flag suspected mine' : mode === 'lair' ? 'Reveal enemy lair tile' : 'Reveal safe tile'}>{mode === 'flag' ? <GameIcon name="flag" preferences={preferences} /> : cell.v || '?'}</button>
    : <span key={index} className={cell.open ? 'open' : ''}>{cell.v}</span>)}</div>;
}

export const INTERACTIVE_TUTORIAL_LESSONS = LESSONS;
