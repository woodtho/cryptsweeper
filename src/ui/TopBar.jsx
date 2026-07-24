import { STRATA, CLASSES, TRINKETS, GADGETS } from '../engine/data.js';
import { run, ui, openDeckModal } from '../engine/engine.js';
import { loadPreferences } from '../engine/preferences.js';
import { itemVector } from './themedIcons.jsx';
import { GameIcon } from './gameIcons.jsx';
import { CHALLENGES } from '../engine/legacy.js';

export function TopBar({ children }) {
  const prefs = loadPreferences();
  const combat = ui.screen === 'combat';
  const critical = run.hp / run.maxHp <= 0.25;
  return (
    <div className={`topbar-shell ${combat ? 'combat-topbar-shell' : ''}`}>
      <div className="topbar-menu-row">
        <button className="btn top-home" onClick={() => window.dispatchEvent(new Event('cryptsweeper:open-game-menu'))} title="Game menu"><GameIcon name="menu" preferences={prefs} /> Menu</button>
      </div>
      <div className={`topbar ${combat ? 'combat-topbar' : ''}`}>
        <span className={`stat hpbar ${critical ? 'critical' : ''}`} data-mechanic="health" tabIndex="0" style={{ position: 'relative' }}>
          <GameIcon name="health" preferences={prefs} /> <b>{run.hp}</b>/{run.maxHp}
          {critical && <small className="critical-label">CRITICAL</small>}
          {ui.dmg.filter(d => d.kind === 'player').map((d, k) => (
            <span key={d.id} className={`dmgfloat player ${d.amount > 0 ? '' : 'soft'}`}
              style={{ left: 4 + (k % 3) * 22 }}>
              {d.amount > 0 ? `−${d.amount}` : d.note}
            </span>
          ))}
        </span>
        <span className="stat gold" data-mechanic="gold" tabIndex="0"><GameIcon name="gold" preferences={prefs} /> <b>{run.gold}</b>g</span>
        <span className="stat dim hud-secondary">
          {STRATA[run.stratum].name}{run.stratum === 3 ? ` · Depth ${run.veinDepth || 0}` : ''}
        </span>
        {run.challenge && <span className="stat challenge-hud" title={CHALLENGES[run.challenge]?.desc}>{CHALLENGES[run.challenge]?.mark} {CHALLENGES[run.challenge]?.name}</span>}
        <span className={`classsig hud-secondary ${run.cls}`} title={CLASSES[run.cls].passive.replace(/<[^>]+>/g, '')}>
          {CLASSES[run.cls].name.replace('THE ', '')}
        </span>
        <span className="stat hud-secondary">
          <span className="pile" data-mechanic="deck" tabIndex="0" style={{ cursor: 'pointer' }} onClick={openDeckModal}>Deck: {run.deck.length}</span>
        </span>
        <span className="trinketrow hud-secondary">
          {run.trinkets.map(t => (
            <span key={t} className={`trinket ${TRINKETS[t].tier === 'boss' ? 'boss' : ''}`}
              title={`${TRINKETS[t].name}${run.relicUpgrades?.[t] ? ` +${run.relicUpgrades[t]}` : ''}: ${TRINKETS[t].desc}`}>{itemVector(t, prefs)}</span>
          ))}
        </span>
        {run.gadgets.length > 0 && ui.screen !== 'combat' && (
          <span className="stat dim hud-secondary gadget-icons">Gadgets: {run.gadgets.map(g => <i key={g}>{itemVector(g, prefs)}</i>)}</span>
        )}
        {children}
      </div>
    </div>
  );
}
