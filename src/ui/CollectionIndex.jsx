import { useMemo } from 'react';
import { CARDS, ENEMIES, GADGETS, STRATA, TRINKETS } from '../engine/data.js';
import { loadCollection } from '../engine/collection.js';
import { decorateMechanics } from './mechanics.js';
import { enemyIcon } from './enemyIcons.jsx';
import { itemVector } from './themedIcons.jsx';
import { GameIcon } from './gameIcons.jsx';

function Totals({ found, total, noun }) {
  return <div className="index-total"><b>{found}</b> / {total} {noun} discovered</div>;
}

function UnknownEntry({ label }) {
  return <article className="index-entry unknown"><div className="index-icon">?</div><div><b>Unknown {label}</b><small>Encounter it during a descent to reveal this entry.</small></div></article>;
}

export function CollectionIndex({ kind, preferences, onPreferenceChange }) {
  const collection = useMemo(loadCollection, [kind]);
  if (kind === 'enemies') {
    const entries = Object.entries(ENEMIES);
    const found = entries.filter(([key]) => collection.enemies[key]?.discovered).length;
    return <div className="index-page">
      <Totals found={found} total={entries.length} noun="enemies" />
      <p className="dim index-help">Enemy artwork follows the selected or imported icon set.</p>
      <div className="index-grid">
        {entries.map(([key, def]) => {
          const stat = collection.enemies[key];
          if (!stat?.discovered) return <UnknownEntry key={key} label="enemy" />;
          const emoji = enemyIcon(key, def, preferences);
          return <article className="index-entry" key={key}>
            <div className="index-icon">{emoji}</div>
            <div className="index-copy">
              <b>{def.name}</b>
              <small>{def.boss ? 'Boss' : def.elite ? 'Elite' : STRATA[def.home]?.name || 'The Undermine'} · {def.hp} base HP</small>
              <span>Met {stat.encountered || 0} · Defeated {stat.defeated || 0}</span>
            </div>
          </article>;
        })}
      </div>
    </div>;
  }

  if (kind === 'cards') {
    const entries = Object.entries(CARDS).filter(([, def]) => def.rarity !== 'curse' || collection.cards);
    const found = entries.filter(([key]) => collection.cards[key]?.discovered).length;
    return <div className="index-page">
      <Totals found={found} total={entries.length} noun="cards" />
      <div className="index-grid cards-index">
        {entries.map(([key, def]) => {
          const stat = collection.cards[key];
          if (!stat?.discovered) return <UnknownEntry key={key} label="card" />;
          return <article className="index-entry" key={key}>
            <div className="index-icon"><GameIcon name={def.type === 'Attack' ? 'attack' : def.type === 'Power' ? 'energy' : 'cards'} preferences={preferences} /></div>
            <div className="index-copy"><b>{def.name}</b><small>{def.rarity} · {def.type} · {def.cls}</small>
              <p dangerouslySetInnerHTML={{ __html: decorateMechanics(def.text(0)) }} />
              <span>Seen {stat.seen || stat.obtained || 0} · Obtained {stat.obtained || 0} · Played {stat.played || 0}</span>
            </div>
          </article>;
        })}
      </div>
    </div>;
  }

  const entries = [
    ...Object.entries(TRINKETS).map(([key, def]) => [`trinket:${key}`, def, 'Trinket']),
    ...Object.entries(GADGETS).map(([key, def]) => [`gadget:${key}`, def, 'Gadget']),
  ];
  const found = entries.filter(([key]) => collection.items[key]?.discovered).length;
  return <div className="index-page">
    <Totals found={found} total={entries.length} noun="items" />
    <div className="index-grid">
      {entries.map(([key, def, type]) => {
        const stat = collection.items[key];
        if (!stat?.discovered) return <UnknownEntry key={key} label="item" />;
        return <article className="index-entry" key={key}>
          <div className="index-icon">{itemVector(key.split(':')[1], preferences)}</div>
          <div className="index-copy"><b>{def.name}</b><small>{type}{def.tier ? ` · ${def.tier}` : ''}</small><p>{def.desc}</p><span>Seen {stat.seen || stat.obtained || 0} · Obtained {stat.obtained || 0}</span></div>
        </article>;
      })}
    </div>
  </div>;
}
