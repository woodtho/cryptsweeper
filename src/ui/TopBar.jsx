import { useState } from 'react';
import { STRATA, CLASSES, TRINKETS, GADGETS } from '../engine/data.js';
import { run, ui, openDeckModal } from '../engine/engine.js';
import { loadPreferences } from '../engine/preferences.js';
import { itemVector } from './themedIcons.jsx';
import { GameIcon } from './gameIcons.jsx';

export function TopBar({ children }) {
  const [expanded, setExpanded] = useState(false);
  const prefs = loadPreferences();
  return (
    <div className={`topbar ${expanded ? 'expanded' : ''}`}>
      <span className="stat hpbar" data-mechanic="health" tabIndex="0" style={{ position: 'relative' }}>
        <GameIcon name="health" preferences={prefs} /> <b>{run.hp}</b>/{run.maxHp}
        {ui.dmg.filter(d => d.kind === 'player').map((d, k) => (
          <span key={d.id} className={`dmgfloat player ${d.amount > 0 ? '' : 'soft'}`}
            style={{ left: 4 + (k % 3) * 22 }}>
            {d.amount > 0 ? `−${d.amount}` : d.note}
          </span>
        ))}
      </span>
      <span className="stat gold" data-mechanic="gold" tabIndex="0"><GameIcon name="gold" preferences={prefs} /> <b>{run.gold}</b>g</span>
      <span className="stat dim hud-secondary">{STRATA[run.stratum].name}</span>
      <span className={`classsig hud-secondary ${run.cls}`} title={CLASSES[run.cls].passive.replace(/<[^>]+>/g, '')}>
        {CLASSES[run.cls].name.replace('THE ', '')}
      </span>
      <span className="stat hud-secondary">
        <span className="pile" data-mechanic="deck" tabIndex="0" style={{ cursor: 'pointer' }} onClick={openDeckModal}>Deck: {run.deck.length}</span>
      </span>
      <span className="trinketrow hud-secondary">
        {run.trinkets.map(t => (
          <span key={t} className={`trinket ${TRINKETS[t].tier === 'boss' ? 'boss' : ''}`}
            title={`${TRINKETS[t].name}: ${TRINKETS[t].desc}`}>{itemVector(t, prefs)}</span>
        ))}
      </span>
      {run.gadgets.length > 0 && ui.screen !== 'combat' && (
        <span className="stat dim hud-secondary gadget-icons">Gadgets: {run.gadgets.map(g => <i key={g}>{itemVector(g, prefs)}</i>)}</span>
      )}
      {children}
      <button className="btn hud-more" onClick={() => setExpanded(x => !x)} aria-expanded={expanded}>{expanded ? 'Less' : 'More'}</button>
      <button className="btn top-home" onClick={() => window.dispatchEvent(new Event('cryptsweeper:open-game-menu'))} title="Game menu"><GameIcon name="menu" preferences={prefs} /> Menu</button>
    </div>
  );
}
