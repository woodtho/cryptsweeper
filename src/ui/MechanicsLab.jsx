import { useMemo, useState } from 'react';
import { ENEMY_MODIFIERS, ENEMY_EFFECTS } from '../engine/engine.js';
import { MECHANICS } from './mechanics.js';
import { GameIcon } from './gameIcons.jsx';
import { BattleMechanicStory } from './BattleMechanicStory.jsx';
import { MechanicTerms } from './MechanicTerms.jsx';

const RESOURCE_KEYS = ['health','gold','deck','mines','turn','block','plating','insight','picks','max picks','energy','vein'];
const BOARD_KEYS = ['reveal','detonate','scan','defuse','chord','entomb','flag','verified flag','full clear','instinct','mine damage','lair','construct'];
const COMBAT_KEYS = ['power','exhaust','exposed','jammed','sundered'];
const MODIFIER_KEYS = ['armoured','burrowing','cursed','unstable'];
const CURSE_KEYS = ['claustrophobia','vertigo','exhaustion','night terrors','paranoia'];
const DELVER_KEYS = ['archivist','chirurgeon','gambler','hexwright','lamplighter','revenant','sapper','surveyor','terraformer','warden'];

const MECHANIC_ICONS = {
  health:'health', gold:'gold', deck:'deck', mines:'mines', turn:'turn',
  vein:'picks',
  reveal:'safe', detonate:'bomb', scan:'scan', defuse:'services', chord:'target', entomb:'buried',
  block:'block', plating:'plating', insight:'insight', picks:'picks', 'max picks':'picks', energy:'energy',
  flag:'flag', 'verified flag':'flag', 'full clear':'victory', instinct:'instinct', 'mine damage':'bomb',
  lair:'lair', construct:'sentry', power:'energy', exhaust:'exhaust',
  exposed:'target', jammed:'relay', sundered:'attack',
  claustrophobia:'mines', vertigo:'picks', exhaustion:'draw', 'night terrors':'energy', paranoia:'flag',
  archivist:'exhaust', chirurgeon:'health', gambler:'flag', hexwright:'safe', lamplighter:'energy',
  revenant:'health', sapper:'bomb', surveyor:'scan', terraformer:'sentry', warden:'block',
};

const CONDITION_MARKS = Object.fromEntries([
  ...Object.entries(ENEMY_EFFECTS).map(([key, effect]) => [key, effect.mark]),
  ...Object.entries(ENEMY_MODIFIERS).map(([key, modifier]) => [key, modifier.mark]),
]);
const ENTRIES = {
  ...Object.fromEntries(Object.entries(MECHANICS).map(([key, entry]) => [key, { ...entry, icon:MECHANIC_ICONS[key], mark:CONDITION_MARKS[key] }])),
};

export const MECHANICS_LAB_SESSIONS = [
  { key:'resources', title:'Resources & survival', icon:'energy', description:'Health, defenses, currencies, piles, turns, and action limits.', keys:RESOURCE_KEYS },
  { key:'board', title:'Board & deduction', icon:'mines', description:'Every way to read, mark, alter, damage, and clear the crypt board.', keys:BOARD_KEYS },
  { key:'combat', title:'Cards & enemy conditions', icon:'attack', description:'Card states, player-inflicted conditions, and all enemy modifiers.', keys:[...COMBAT_KEYS, ...MODIFIER_KEYS] },
  { key:'curses', title:'Persistent curses', icon:'exhaust', description:'Every Curse card and the run-wide penalty it creates.', keys:CURSE_KEYS },
  { key:'delvers', title:'Documented passives', icon:'picks', description:'Delver-specific mechanics referenced throughout the rulebook.', keys:DELVER_KEYS },
];

const ALL_KEYS = MECHANICS_LAB_SESSIONS.flatMap(session => session.keys);
const LAB_STORAGE = 'cryptsweeper.tutorial.mechanics.v1';

function loadCompleted() {
  try { return new Set(JSON.parse(localStorage.getItem(LAB_STORAGE) || '[]').filter(key => ALL_KEYS.includes(key))); }
  catch { return new Set(); }
}

function saveCompleted(completed) {
  try { localStorage.setItem(LAB_STORAGE, JSON.stringify([...completed])); } catch { /* unavailable storage */ }
  return completed;
}

function alteredRule(summary, mode) {
  const replacements = mode === 'timing' ? [
    [/\bpersistent\b/i, 'temporary'], [/\bremains\b/i, 'resets'], [/\bfirst\b/i, 'every'],
    [/\bnext\b/i, 'every'], [/\bbefore\b/i, 'after'], [/\bafter\b/i, 'before'],
    [/25%/i, '50%'], [/40%/i, '20%'], [/\bthree\b/i, 'one'], [/\bquarter\b/i, 'half'],
  ] : [
    [/\bBlock\b/i, 'Energy'], [/\bPlating\b/i, 'Block'], [/\bEnergy\b/i, 'Picks'],
    [/\bPicks\b/i, 'Energy'], [/\bHealth\b/i, 'Gold'], [/\bmine damage\b/i, 'enemy attacks'],
    [/\bmines\b/i, 'safe tiles'], [/\bflags\b/i, 'scans'], [/\bbosses\b/i, 'non-boss enemies'],
  ];
  for (const [pattern, replacement] of replacements) {
    if (pattern.test(summary)) return summary.replace(pattern, replacement);
  }
  return mode === 'timing'
    ? `${summary} It also triggers automatically at the start of every turn.`
    : `${summary} It affects every target on the board regardless of its listed limits.`;
}

function choicesFor(key, position) {
  const correct = ENTRIES[key].summary;
  const choices = [
    { text:correct, correct:true },
    { text:alteredRule(correct, 'timing'), correct:false, feedback:'That version changes the mechanic’s timing, duration, limit, or trigger.' },
    { text:alteredRule(correct, 'priority'), correct:false, feedback:'That version changes the affected resource, defense, tile, or target.' },
  ];
  const shift = position % choices.length;
  return [...choices.slice(shift), ...choices.slice(0, shift)];
}

export function MechanicsLab({ preferences, onMenu, onClose }) {
  const [sessionKey, setSessionKey] = useState(null);
  const [position, setPosition] = useState(0);
  const [completed, setCompleted] = useState(loadCompleted);
  const [answer, setAnswer] = useState(null);
  const [storyStep, setStoryStep] = useState(-1);
  const session = MECHANICS_LAB_SESSIONS.find(item => item.key === sessionKey);
  const key = session?.keys[position];
  const entry = key ? ENTRIES[key] : null;
  const choices = useMemo(() => key ? choicesFor(key, ALL_KEYS.indexOf(key)) : [], [key]);
  const correct = Boolean(answer?.correct);

  const startSession = selected => {
    const target = MECHANICS_LAB_SESSIONS.find(item => item.key === selected);
    const firstIncomplete = target.keys.findIndex(item => !completed.has(item));
    setSessionKey(selected); setPosition(firstIncomplete < 0 ? 0 : firstIncomplete); setAnswer(null); setStoryStep(-1);
  };
  const choose = choice => {
    setAnswer(choice);
    if (choice.correct) setStoryStep(0);
    else setStoryStep(-1);
  };
  const advanceStory = () => setStoryStep(current => {
    const nextStep = Math.min(2,current + 1);
    if (nextStep === 2) setCompleted(done => saveCompleted(new Set([...done, key])));
    return nextStep;
  });
  const move = delta => {
    setPosition(current => Math.max(0, Math.min(session.keys.length - 1, current + delta)));
    setAnswer(null); setStoryStep(-1);
  };
  const next = () => {
    if (position < session.keys.length - 1) { move(1); return; }
    setSessionKey(null); setPosition(0); setAnswer(null); setStoryStep(-1);
  };

  return <MechanicTerms><section className="tutorial mechanics-lab" aria-label="Interactive mechanics lab">
    <header className="tutorial-head">
      <div><p className="eyebrow">Every documented mechanic · no save changes</p><h2>Mechanics Lab</h2></div>
      <div className="tutorial-head-actions"><button className="btn" type="button" onClick={onMenu}>Tutorial menu</button><button className="btn" type="button" onClick={onClose}>Close ×</button></div>
    </header>

    {!session ? <>
      <div className="mechanics-lab-summary"><b>{completed.size} / {ALL_KEYS.length}</b><span>mechanics practiced</span><button type="button" className="btn" disabled={!completed.size} onClick={() => setCompleted(saveCompleted(new Set()))}>Reset progress</button><div><i style={{ width:`${completed.size / ALL_KEYS.length * 100}%` }} /></div></div>
      <p className="dim mechanics-lab-intro">Choose a session. Each mechanic presents three concrete rules; select the accurate one to unlock its explanation and advance. Wrong answers explain that the rule belongs elsewhere.</p>
      <div className="mechanics-session-grid">{MECHANICS_LAB_SESSIONS.map(item => {
        const count = item.keys.filter(itemKey => completed.has(itemKey)).length;
        return <button type="button" key={item.key} onClick={() => startSession(item.key)} className={count === item.keys.length ? 'complete' : ''}>
          <GameIcon name={item.icon} preferences={preferences} /><span><b>{item.title}</b><small>{item.description}</small><i>{count}/{item.keys.length} complete</i></span>
        </button>;
      })}</div>
    </> : <>
      <div className="tutorial-progress mechanics-progress" aria-label={`${session.title}: mechanic ${position + 1} of ${session.keys.length}`}>
        {session.keys.map((itemKey,index) => <span key={itemKey} className={completed.has(itemKey) ? 'done' : index === position ? 'current' : ''} />)}
      </div>
      <div className="mechanic-drill-head">
        <div className="mechanic-drill-icon" title={`${entry.name} icon`}>{entry.mark
          ? <strong aria-hidden="true">{entry.mark}</strong>
          : <GameIcon name={entry.icon} preferences={preferences} />}</div>
        <div><small>{session.title} · {position + 1}/{session.keys.length}</small><h3>{entry.name}</h3><p>Which rule correctly describes <b>{entry.name}</b>?</p></div>
      </div>
      <div className="mechanic-drill-choices">{choices.map(choice => {
        const selected = answer?.text === choice.text;
        return <button type="button" key={choice.text} disabled={correct} className={selected ? (choice.correct ? 'correct' : 'wrong') : ''} onClick={() => choose(choice)}>{choice.text}</button>;
      })}</div>
      {answer && <div className={`mechanic-feedback ${correct ? 'correct' : 'wrong'}`} role="status">
        <b>{correct ? 'Correct' : 'Check the altered detail'}</b><p>{correct ? entry.summary : `${answer.feedback} The actual rule is: ${entry.summary}`}</p>
      </div>}
      {correct && <BattleMechanicStory mechanicKey={key} entry={entry} preferences={preferences} step={storyStep} onAdvance={advanceStory} />}
      <div className="tutorial-nav mechanics-nav">
        <button className="btn" type="button" disabled={position === 0} onClick={() => move(-1)}>← Previous</button>
        <button className="btn" type="button" onClick={() => { setSessionKey(null); setAnswer(null); setStoryStep(-1); }}>All sessions</button>
        <button className="btn primary" type="button" disabled={!correct || storyStep < 2} onClick={next}>{position === session.keys.length - 1 ? 'Finish session' : 'Next mechanic →'}</button>
      </div>
    </>}
  </section></MechanicTerms>;
}

export const MECHANICS_LAB_KEYS = ALL_KEYS;
