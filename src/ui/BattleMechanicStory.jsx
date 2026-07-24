import { useEffect, useMemo, useRef } from 'react';
import { ENEMIES } from '../engine/data.js';
import { enemyIcon } from './enemyIcons.jsx';
import { GameIcon } from './gameIcons.jsx';
import { MechanicTerms } from './MechanicTerms.jsx';
import { MECHANIC_EXAMPLES } from './mechanicExamples.js';

const HUD_FOCUS = {
  health:'health', gold:'gold', deck:'deck', mines:'mines', turn:'turn', block:'block', plating:'plating',
  insight:'insight', picks:'picks', 'max picks':'picks', energy:'energy', exhaustion:'deck',
  'night terrors':'energy', vertigo:'picks', paranoia:'mines', claustrophobia:'mines',
  archivist:'deck', chirurgeon:'health', gambler:'deck', hexwright:'mines', lamplighter:'energy',
  revenant:'health', sapper:'mines', surveyor:'insight', terraformer:'plating', warden:'block',
};
const BOARD_KEYS = new Set(['reveal','detonate','scan','defuse','chord','entomb','flag','verified flag','full clear','instinct','mine damage','lair','construct']);
const ENEMY_KEYS = new Set(['exposed','jammed','sundered']);
const MODIFIER_KEYS = new Set(['armoured','burrowing','cursed','unstable']);
const DELVER_KEYS = new Set(['archivist','chirurgeon','gambler','hexwright','lamplighter','revenant','sapper','surveyor','terraformer','warden']);

function storyTargets(key) {
  if (MODIFIER_KEYS.has(key)) return ['preview','enemy','log'];
  if (ENEMY_KEYS.has(key)) return ['card','enemy','log'];
  if (BOARD_KEYS.has(key)) return ['card','board','log'];
  if (key === 'power' || key === 'exhaust') return ['card','deck','log'];
  if (DELVER_KEYS.has(key)) return ['delver', `hud:${HUD_FOCUS[key]}`,'log'];
  if (['claustrophobia','vertigo','exhaustion','night terrors','paranoia'].includes(key)) return ['card',`hud:${HUD_FOCUS[key]}`,'log'];
  if (HUD_FOCUS[key]) return [key === 'gold' ? 'enemy' : 'card', `hud:${HUD_FOCUS[key]}`,'log'];
  return ['card','board','log'];
}

function stageNarration(key, entry, step) {
  const example = MECHANIC_EXAMPLES[key];
  if (example) return [example.setup, example.action, example.result][Math.min(step, 2)];
  const targets = storyTargets(key);
  if (step === 0) {
    if (targets[0] === 'preview') return `${entry.name} is shown on the enemy briefing before the board becomes interactive.`;
    if (targets[0] === 'delver') return `${entry.name} begins with the Delver identity and passive shown beside the battle statistics.`;
    if (targets[0] === 'enemy') return `The enemy action or reward is the source of this ${entry.name} change.`;
    return `The card in your hand states exactly when ${entry.name} will be used or changed.`;
  }
  if (step === 1) return entry.summary;
  return `The affected battle element updates immediately, then the combat log records the ${entry.name} result so you can verify what happened.`;
}

function statValue(name, key, step) {
  const changed = step >= 1;
  const values = {
    health: changed && ['health','chirurgeon','revenant'].includes(key) ? '24/32' : '32/32', gold: changed && key === 'gold' ? '57' : '42',
    block: changed && ['block','warden','chirurgeon','sundered'].includes(key) ? '8' : '0', plating: changed && ['plating','mine damage','terraformer'].includes(key) ? '6' : '2',
    mines: changed && ['mines','claustrophobia','paranoia','sapper','hexwright'].includes(key) ? '12' : '10',
    picks: changed && ['picks','max picks','vertigo'].includes(key) ? '3/4' : '4/4', insight: changed && ['insight','surveyor'].includes(key) ? '3' : '1',
    energy: changed && ['energy','night terrors','lamplighter'].includes(key) ? '2/3' : '3/3', turn: changed && key === 'turn' ? '2' : '1', deck: changed && ['deck','exhaust','exhaustion','archivist','gambler'].includes(key) ? '8' : '9',
  };
  return values[name];
}

export function BattleMechanicStory({ mechanicKey, entry, preferences, step, onAdvance }) {
  const stageRef = useRef(null);
  const targets = useMemo(() => storyTargets(mechanicKey), [mechanicKey]);
  const focus = targets[Math.min(step, targets.length - 1)];
  const focusClass = target => focus === target ? 'story-focus' : '';
  const foe = useMemo(() => enemyIcon('minelayer', ENEMIES.minelayer, preferences), [preferences]);
  useEffect(() => {
    const target = stageRef.current?.querySelector(`[data-story-focus="${focus}"]`);
    target?.focus?.({ preventScroll:true });
    target?.scrollIntoView?.({ block:'nearest', inline:'nearest', behavior:'smooth' });
  }, [focus]);
  const stats = [
    ['health','health'],['gold','gold'],['block','block'],['plating','plating'],['mines','mines'],
    ['picks','picks'],['insight','insight'],['energy','energy'],['turn','turn'],['deck','deck'],
  ];
  const changed = step >= 1;
  const example = MECHANIC_EXAMPLES[mechanicKey];
  const enemyMark = entry.mark && changed ? `${entry.mark} ${entry.name}` : null;
  const delverName = DELVER_KEYS.has(mechanicKey) ? entry.name.toUpperCase() : 'SAPPER';
  return <MechanicTerms><section className="battle-story" aria-label={`${entry.name} battle demonstration`}>
    <header><small>Battle demonstration · scene {step + 1} of 3</small><p>{stageNarration(mechanicKey, entry, step)}</p></header>
    {example && <div className="battle-story-example" aria-label={`Worked example for ${entry.name}`}>
      {example.card && <span className="battle-story-example-src"><GameIcon name="deck" preferences={preferences} /><b>{example.card}</b></span>}
      <ol>
        {[['Setup', example.setup], ['Action', example.action], ['Result', example.result]].map(([label, text], index) =>
          <li key={label} className={step === index ? 'now' : step > index ? 'past' : ''}><b>{label}</b><span>{text}</span></li>)}
      </ol>
    </div>}
    <div className="lab-battle" ref={stageRef}>
      <div className={`lab-battle-preview ${focusClass('preview')}`} tabIndex="-1" data-story-focus="preview"><span>{foe}</span><b>Enemy briefing</b><small>{entry.mark ? `${entry.mark} ${entry.name}` : 'Read stats, intent, and special rules'}</small></div>
      <div className="lab-battle-hud">
        <span className={`lab-delver ${focusClass('delver')}`} tabIndex="-1" data-story-focus="delver"><b>{delverName}</b><small>{DELVER_KEYS.has(mechanicKey) ? 'Class passive' : 'Breachcraft'}</small></span>
        {stats.map(([name,icon]) => <span className={focusClass(`hud:${name}`)} key={name} tabIndex="-1" data-story-focus={`hud:${name}`}><GameIcon name={icon} preferences={preferences} /><b>{statValue(name, mechanicKey, step)}</b><small>{name}</small></span>)}
      </div>
      <div className="lab-battle-field">
        <div className={`lab-story-board ${focusClass('board')}`} tabIndex="-1" data-story-focus="board">{['1','','','1','2','','0','1',''].map((value,index) => <span className={`${index === 4 ? 'changed' : ''} ${index < 2 || index === 3 || index > 5 ? 'open' : ''}`} key={index}>{index === 4 && changed ? <GameIcon name={mechanicKey === 'flag' || mechanicKey === 'verified flag' || mechanicKey === 'paranoia' ? 'flag' : mechanicKey === 'detonate' || mechanicKey === 'mine damage' ? 'crater' : 'safe'} preferences={preferences} /> : value}</span>)}</div>
        <div className={`lab-story-enemy ${focusClass('enemy')}`} tabIndex="-1" data-story-focus="enemy"><span>{foe}</span><div><b>Minelayer</b><small>30/30 HP · Plant 2 Mines</small>{enemyMark && <i>{enemyMark}</i>}</div></div>
      </div>
      <div className="lab-story-hand">
        <div className={`lab-story-card ${focusClass('card')}`} tabIndex="-1" data-story-focus="card"><small>1 Energy · Training card</small><b>{entry.name}</b><span>{entry.summary}</span></div>
        <span className={`lab-story-deck ${focusClass('deck')}`} tabIndex="-1" data-story-focus="deck"><GameIcon name="deck" preferences={preferences} /><b>{statValue('deck', mechanicKey, step)}</b><small>Draw pile</small></span>
      </div>
      <div className={`lab-story-log ${focusClass('log')}`} tabIndex="-1" data-story-focus="log"><GameIcon name="log" preferences={preferences} /><span>{step >= 2 ? `${entry.name}: battle state updated and recorded.` : 'Combat log waits for the action to resolve.'}</span></div>
    </div>
    {step < 2 ? <button className="btn primary battle-story-next" type="button" onClick={onAdvance}>{step === 0 ? 'Set up the highlighted situation →' : `Perform the highlighted ${DELVER_KEYS.has(mechanicKey) ? 'Delver tactic' : 'action'} →`}</button> : <p className="battle-story-done">Practice action complete. Continue to the next mechanic when ready.</p>}
  </section></MechanicTerms>;
}
