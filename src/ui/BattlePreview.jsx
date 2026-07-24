import { run, cbt, closeBattlePreview, ENEMY_MODIFIERS } from '../engine/engine.js';
import { STRATA } from '../engine/data.js';
import { decorateMechanics } from './mechanics.js';
import { enemyIcon } from './enemyIcons.jsx';
import { GameIcon } from './gameIcons.jsx';

function Modifier({ enemy }) {
  const modifier = ENEMY_MODIFIERS[enemy.modifier];
  if (!modifier) return null;
  return <div className={`battle-preview-modifier ${enemy.modifier}`}>
    <span>{modifier.mark}</span><div><b>{modifier.name}</b><p>{modifier.desc}</p></div>
  </div>;
}

function EnemyBrief({ enemy, index, preferences }) {
  const type = enemy.def.boss ? 'Boss' : enemy.def.elite ? 'Elite enemy' : 'Enemy';
  const lairTiles = enemy.lair?.length || 0;
  return <article className="battle-preview-enemy">
    <div className="battle-preview-type"><span>{type}</span><small>Threat {index + 1}</small></div>
    <div className="battle-preview-art" aria-label={`${enemy.def.name} artwork`}>
      {enemyIcon(enemy.key, enemy.def, preferences)}
      {enemy.modifier && <i title={ENEMY_MODIFIERS[enemy.modifier].name}>{ENEMY_MODIFIERS[enemy.modifier].mark}</i>}
    </div>
    <h2>{enemy.def.name}</h2>
    <div className="battle-preview-stats">
      <span><GameIcon name="health" preferences={preferences} /><b>{enemy.hp}/{enemy.maxHp}</b><small>Health</small></span>
      <span><GameIcon name="block" preferences={preferences} /><b>{enemy.block || 0}</b><small>Opening Block</small></span>
      <span><GameIcon name="lair" preferences={preferences} /><b>{lairTiles}</b><small>Lair tiles</small></span>
    </div>
    <p className="battle-preview-desc" dangerouslySetInnerHTML={{ __html: decorateMechanics(enemy.def.desc) }} />
    <Modifier enemy={enemy} />
    {enemy.scale > 0 && <div className="battle-preview-impact"><b>Depth scaling</b><span>Health increased by {Math.round(enemy.scale * 45)}% for fighting below its home stratum.</span></div>}
    {enemy.def.gated && <div className="battle-preview-impact"><b>Damage gate</b><span>{enemy.def.gateNote}</span></div>}
    <div className={`battle-preview-intent ${enemy.intent?.cls || ''}`}>
      <GameIcon name={enemy.intent?.cls === 'atk' ? 'attack' : enemy.intent?.cls === 'defend' ? 'defend' : 'lair'} preferences={preferences} />
      <div><small>Opening intent</small><b>{enemy.data.buried && enemy.modifier === 'burrowing' ? 'Buried — skips its action' : enemy.intent?.label || 'Unknown'}</b></div>
    </div>
  </article>;
}

export function BattlePreview({ preferences, onNeverShow }) {
  const combat = cbt();
  if (!run || !combat) return null;
  const stratum = STRATA[run.stratum];
  return <div className="battle-preview-overlay" role="dialog" aria-modal="true" aria-labelledby="battle-preview-title">
    <section className="battle-preview-screen">
      <header>
        <div><p>{combat.kind === 'boss' ? 'Boss encounter' : combat.kind === 'elite' ? 'Elite encounter' : 'Battle ahead'} · {stratum?.name}</p>
          <h1 id="battle-preview-title">Know what waits below</h1></div>
        <div className="battle-preview-board"><span><b>{combat.enemies.length}</b><small>Enemies</small></span><span><b>{combat.boardSpec.size}×{combat.boardSpec.size}</b><small>Board</small></span><span><b>{combat.boardSpec.mines}</b><small>Mines</small></span></div>
      </header>
      <div className="battle-preview-enemies">
        {combat.enemies.map((enemy, index) => <EnemyBrief enemy={enemy} index={index} preferences={preferences} key={`${enemy.key}-${index}`} />)}
      </div>
      {combat.enemies.length > 1 && <p className="battle-preview-swipe">Swipe the enemy cards to inspect every threat.</p>}
      <footer>
        <button type="button" className="btn battle-preview-never" onClick={onNeverShow}>Don’t show battle previews again</button>
        <button type="button" className="btn primary battle-preview-enter" onClick={closeBattlePreview}>Begin battle</button>
      </footer>
    </section>
  </div>;
}
