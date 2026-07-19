import { STRATA, TRINKETS, GADGETS } from '../engine/data.js';
import { run, ui, openDeckModal, goHome } from '../engine/engine.js';

export function TopBar({ children }) {
  return (
    <div className="topbar">
      <span className="stat hpbar" style={{ position: 'relative' }}>
        ❤ <b>{run.hp}</b>/{run.maxHp}
        {ui.dmg.filter(d => d.kind === 'player').map((d, k) => (
          <span key={d.id} className={`dmgfloat player ${d.amount > 0 ? '' : 'soft'}`}
            style={{ left: 4 + (k % 3) * 22 }}>
            {d.amount > 0 ? `−${d.amount}` : d.note}
          </span>
        ))}
      </span>
      <span className="stat gold">◈ <b>{run.gold}</b>g</span>
      <span className="stat dim">{STRATA[run.stratum].name}</span>
      <span className="stat">
        <span className="pile" style={{ cursor: 'pointer' }} onClick={openDeckModal}>Deck: {run.deck.length}</span>
      </span>
      <span className="trinketrow">
        {run.trinkets.map(t => (
          <span key={t} className={`trinket ${TRINKETS[t].tier === 'boss' ? 'boss' : ''}`}
            title={`${TRINKETS[t].name}: ${TRINKETS[t].desc}`}>{TRINKETS[t].emoji}</span>
        ))}
      </span>
      {run.gadgets.length > 0 && ui.screen !== 'combat' && (
        <span className="stat dim">Gadgets: {run.gadgets.map(g => GADGETS[g].emoji).join(' ')}</span>
      )}
      {children}
      <button className="btn top-home" onClick={goHome} title="Autosave and return home">⌂ Home</button>
    </div>
  );
}
