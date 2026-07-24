import { useMemo, useState } from 'react';
import { CARDS, CLASSES, ENEMIES, GADGETS, STRATA, TRINKETS } from '../engine/data.js';
import { loadCollection } from '../engine/collection.js';
import { isDelverUnlocked, loadProgression, UNLOCKS } from '../engine/progression.js';
import { decorateMechanics } from './mechanics.js';
import { enemyIcon } from './enemyIcons.jsx';
import { itemVector } from './themedIcons.jsx';
import { GameIcon } from './gameIcons.jsx';
import { delverPortrait } from './portraits.js';
import { FullArtViewer } from './FullArtViewer.jsx';
import { ENEMY_MODIFIERS, ENEMY_EFFECTS } from '../engine/engine.js';

function Totals({ found, total, noun, suffix = 'discovered' }) {
  return <div className="index-total"><b>{found}</b> / {total} {noun} {suffix}</div>;
}

function UnknownEntry({ label }) {
  return <article className="index-entry unknown"><div className="index-icon">?</div><div><b>Unknown {label}</b><small>Encounter it during a descent to reveal this entry.</small></div></article>;
}

function IndexSearch({ kind, value, onChange }) {
  return <label className="index-search"><span className="sr-only">Search {kind} index</span><input type="search" value={value} onChange={event => onChange(event.target.value)} placeholder={`Search ${kind}…`} aria-label={`Search ${kind} index`} />{value && <button type="button" onClick={() => onChange('')} aria-label={`Clear ${kind} search`}>×</button>}</label>;
}

function IndexEmpty({ kind }) {
  return <div className="index-empty"><b>No matching {kind}</b><small>Try another name, type, class, or mechanic.</small></div>;
}

export function CollectionIndex({ kind, preferences, onPreferenceChange }) {
  const collection = useMemo(loadCollection, [kind]);
  const [fullArt, setFullArt] = useState(null);
  const [query, setQuery] = useState('');
  const search = query.trim().toLocaleLowerCase();
  const named = entries => entries.slice().sort((a,b) => a[1].name.localeCompare(b[1].name));
  const includes = (...values) => !search || values.join(' ').toLocaleLowerCase().includes(search);
  if (kind === 'delvers') {
    const allEntries = named(Object.entries(CLASSES));
    const entries = allEntries.filter(([,def]) => includes(def.name, def.role, def.blurb, def.passive));
    const progress = loadProgression();
    const played = allEntries.filter(([key]) => (collection.delvers[key]?.attempts || 0) > 0).length;
    return <div className="index-page delver-index">
      <Totals found={played} total={allEntries.length} noun="delvers" suffix="played" />
      <IndexSearch kind="delvers" value={query} onChange={setQuery} />
      <p className="dim index-help">Stats update throughout each real run. Test Lab runs are excluded.</p>
      <div className="delver-index-grid">
        {entries.map(([key, def]) => {
          const stat = collection.delvers[key] || {};
          const unlocked = isDelverUnlocked(key, progress);
          const completed = stat.completed || 0;
          const wins = stat.wins || 0;
          const winRate = completed ? Math.round((wins / completed) * 100) : 0;
          const deepest = stat.deepestStratum || 0;
          const portrait = delverPortrait(key);
          return <article className={`delver-index-entry ${unlocked ? '' : 'locked'}`} key={key}>
            <button type="button" className="delver-index-art" onClick={() => setFullArt({ src: portrait, title: def.name })}
              aria-haspopup="dialog" aria-label={`View full artwork for ${def.name}`}>
              <img src={portrait} alt={`${def.name} portrait`} />
              <span className="art-expand-hint">Full art</span>
            </button>
            <div className="delver-index-copy">
              <div className="delver-index-title"><div><b>{def.name}</b><small>{def.role}</small></div><i>{unlocked ? 'Unlocked' : 'Locked'}</i></div>
              {!unlocked && <p className="delver-unlock-rule">{UNLOCKS[key]?.label}</p>}
              <div className="delver-stat-grid">
                <span><small>Attempts</small><b>{stat.attempts || 0}</b></span>
                <span><small>Wins</small><b>{wins}</b></span>
                <span><small>Win rate</small><b>{winRate}%</b></span>
                <span><small>Deepest</small><b>{deepest ? STRATA[deepest - 1]?.name || `Stratum ${deepest}` : '—'}</b></span>
                <span><small>Best Vein depth</small><b>{stat.deepestVein || '—'}</b></span>
                <span><small>Floors</small><b>{stat.floors || 0}</b></span>
                <span><small>Full clears</small><b>{stat.fullClears || 0}</b></span>
                <span><small>Safe reveals</small><b>{stat.safeReveals || 0}</b></span>
                <span><small>Upgrades</small><b>{stat.upgrades || 0}</b></span>
                <span><small>Most gold</small><b>{stat.mostGold || 0}</b></span>
                <span><small>Best score</small><b>{stat.bestScore || 0}</b></span>
                <span><small>Base picks</small><b>{def.picks}</b></span>
              </div>
            </div>
          </article>;
        })}
      </div>
      {!entries.length && <IndexEmpty kind="delvers" />}
      {fullArt && <FullArtViewer src={fullArt.src} alt={`${fullArt.title} full portrait`} title={fullArt.title} onClose={() => setFullArt(null)} />}
    </div>;
  }
  if (kind === 'enemies') {
    const allEntries = named(Object.entries(ENEMIES));
    const entries = allEntries.filter(([key,def]) => !search || (collection.enemies[key]?.discovered && includes(def.name, def.desc, def.boss ? 'boss' : '', def.elite ? 'elite' : '', STRATA[def.home]?.name || '')));
    const modifiers = Object.entries(ENEMY_MODIFIERS).sort((a,b) => a[1].name.localeCompare(b[1].name)).filter(([,def]) => includes(def.name, def.desc));
    const effects = Object.entries(ENEMY_EFFECTS).sort((a,b) => a[1].name.localeCompare(b[1].name)).filter(([,def]) => includes(def.name, def.desc));
    const found = allEntries.filter(([key]) => collection.enemies[key]?.discovered).length;
    return <div className="index-page">
      <Totals found={found} total={allEntries.length} noun="enemies" />
      <IndexSearch kind="enemies" value={query} onChange={setQuery} />
      <p className="dim index-help">Enemy artwork follows the selected or imported icon set.</p>
      {modifiers.length > 0 && <section className="enemy-modifier-guide" aria-labelledby="enemy-modifier-guide-title">
        <header><b id="enemy-modifier-guide-title">Enemy modifiers</b><small>Non-boss enemies may enter a fight with one of these marks. Elite enemies are more likely to be modified.</small></header>
        <div>{modifiers.map(([key, modifier]) => <article className={key} key={key}>
          <span>{modifier.mark}</span><p><b data-mechanic={key}>{modifier.name}</b><small>{modifier.desc}</small></p>
        </article>)}</div>
      </section>}
      {effects.length > 0 && <section className="enemy-modifier-guide enemy-effect-guide" aria-labelledby="enemy-effect-guide-title">
        <header><b id="enemy-effect-guide-title">Player-inflicted conditions</b><small>Cards can place these temporary effects on any enemy, including bosses. The number beside a mark is its remaining stack count.</small></header>
        <div>{effects.map(([key, effect]) => <article className={key} key={key}>
          <span>{effect.mark}</span><p><b>{effect.name}</b><small>{effect.desc}</small></p>
        </article>)}</div>
      </section>}
      <div className="index-grid">
        {entries.map(([key, def]) => {
          const stat = collection.enemies[key];
          if (!stat?.discovered) return <UnknownEntry key={key} label="enemy" />;
          const emoji = enemyIcon(key, def, preferences);
          return <article className="index-entry" key={key}>
            <button type="button" className="index-icon index-icon-button" onClick={() => setFullArt({ content: emoji, title: def.name })}
              aria-haspopup="dialog" aria-label={`Zoom artwork for ${def.name}`}>{emoji}</button>
            <div className="index-copy">
              <b>{def.name}</b>
              <small>{def.boss ? 'Boss' : def.elite ? 'Elite' : STRATA[def.home]?.name || 'The Undermine'} · {def.hp} base HP</small>
              <p dangerouslySetInnerHTML={{ __html: decorateMechanics(def.desc) }} />
              <span>Met {stat.encountered || 0} · Defeated {stat.defeated || 0}</span>
            </div>
          </article>;
        })}
      </div>
      {!entries.length && !modifiers.length && !effects.length && <IndexEmpty kind="enemies" />}
      {fullArt && <FullArtViewer alt={`${fullArt.title} enlarged icon`} title={fullArt.title} onClose={() => setFullArt(null)}>{fullArt.content}</FullArtViewer>}
    </div>;
  }

  if (kind === 'cards') {
    const allEntries = named(Object.entries(CARDS).filter(([, def]) => def.rarity !== 'curse' || collection.cards));
    const entries = allEntries.filter(([key,def]) => !search || (collection.cards[key]?.discovered && includes(def.name, def.rarity, def.type, def.cls, def.text(0))));
    const found = allEntries.filter(([key]) => collection.cards[key]?.discovered).length;
    return <div className="index-page">
      <Totals found={found} total={allEntries.length} noun="cards" />
      <IndexSearch kind="cards" value={query} onChange={setQuery} />
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
      {!entries.length && <IndexEmpty kind="cards" />}
    </div>;
  }

  const allEntries = named([
    ...Object.entries(TRINKETS).map(([key, def]) => [`trinket:${key}`, def, 'Trinket']),
    ...Object.entries(GADGETS).map(([key, def]) => [`gadget:${key}`, def, 'Gadget']),
  ]);
  const entries = allEntries.filter(([key,def,type]) => !search || (collection.items[key]?.discovered && includes(def.name, def.desc, def.tier || '', type)));
  const found = allEntries.filter(([key]) => collection.items[key]?.discovered).length;
  return <div className="index-page">
    <Totals found={found} total={allEntries.length} noun="items" />
    <IndexSearch kind="items" value={query} onChange={setQuery} />
    <div className="index-grid">
      {entries.map(([key, def, type]) => {
        const stat = collection.items[key];
        if (!stat?.discovered) return <UnknownEntry key={key} label="item" />;
        const icon = itemVector(key.split(':')[1], preferences);
        return <article className="index-entry" key={key}>
          <button type="button" className="index-icon index-icon-button" onClick={() => setFullArt({ content: icon, title: def.name })}
            aria-haspopup="dialog" aria-label={`Zoom artwork for ${def.name}`}>{icon}</button>
          <div className="index-copy"><b>{def.name}</b><small>{type}{def.tier ? ` · ${def.tier}` : ''}</small><p dangerouslySetInnerHTML={{ __html: decorateMechanics(def.desc) }} /><span>Seen {stat.seen || stat.obtained || 0} · Obtained {stat.obtained || 0}</span></div>
        </article>;
      })}
    </div>
    {!entries.length && <IndexEmpty kind="items" />}
    {fullArt && <FullArtViewer alt={`${fullArt.title} enlarged icon`} title={fullArt.title} onClose={() => setFullArt(null)}>{fullArt.content}</FullArtViewer>}
  </div>;
}
