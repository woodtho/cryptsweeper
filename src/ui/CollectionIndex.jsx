import { useMemo, useState } from 'react';
import { CARDS, ENEMIES, GADGETS, STRATA, TRINKETS } from '../engine/data.js';
import { loadCollection } from '../engine/collection.js';
import { decorateMechanics } from './mechanics.js';
import { BEAST_MARKS, BEAST_NAMES, enemyIcon } from './enemyIcons.jsx';

const EMOJI_CHOICES = ['🪱', '👺', '🗿', '👻', '🐛', '🤖', '⚙️', '💀', '🦇', '🐀', '🕷️', '🐸', '🦂', '🧟', '👁️', '☠️'];

function Totals({ found, total, noun }) {
  return <div className="index-total"><b>{found}</b> / {total} {noun} discovered</div>;
}

function UnknownEntry({ label }) {
  return <article className="index-entry unknown"><div className="index-icon">?</div><div><b>Unknown {label}</b><small>Encounter it during a descent to reveal this entry.</small></div></article>;
}

export function CollectionIndex({ kind, preferences, onPreferenceChange }) {
  const collection = useMemo(loadCollection, [kind]);
  const [editingEmoji, setEditingEmoji] = useState(null);

  if (kind === 'enemies') {
    const entries = Object.entries(ENEMIES);
    const found = entries.filter(([key]) => collection.enemies[key]?.discovered).length;
    const chooseEmoji = (key, emoji) => {
      onPreferenceChange('enemyEmojis', { ...(preferences.enemyEmojis || {}), [key]: emoji });
      setEditingEmoji(null);
    };
    return <div className="index-page">
      <Totals found={found} total={entries.length} noun="enemies" />
      <p className="dim index-help">Tap a discovered enemy’s face to give it a different emoji. This only changes its appearance.</p>
      <div className="index-grid">
        {entries.map(([key, def]) => {
          const stat = collection.enemies[key];
          if (!stat?.discovered) return <UnknownEntry key={key} label="enemy" />;
          const emoji = enemyIcon(key, def, preferences);
          const custom = preferences.enemyEmojis?.[key] || '';
          return <article className="index-entry" key={key}>
            <button className="index-icon editable" onClick={() => setEditingEmoji(editingEmoji === key ? null : key)} aria-label={`Change ${def.name} emoji`}>{emoji}</button>
            <div className="index-copy">
              <b>{def.name}</b>
              <small>{def.boss ? 'Boss' : def.elite ? 'Elite' : STRATA[def.home]?.name || 'The Undermine'} · {def.hp} base HP</small>
              <span>Met {stat.encountered || 0} · Defeated {stat.defeated || 0}</span>
              {editingEmoji === key && <div className="emoji-picker" role="group" aria-label="Choose enemy emoji">
                {EMOJI_CHOICES.map(choice => <button key={choice} onClick={() => chooseEmoji(key, choice)}>{choice}</button>)}
                {BEAST_NAMES.map(name => (
                  <button key={name} className={`markchoice ${custom === `svg:${name}` ? 'picked' : ''}`}
                    title={`${name} — Delver's Bestiary`} onClick={() => chooseEmoji(key, `svg:${name}`)}>
                    {BEAST_MARKS[name]}
                  </button>
                ))}
                <input className="emoji-free" type="text" maxLength={8} placeholder={def.emoji}
                  value={custom.startsWith('svg:') ? '' : custom} aria-label="Type any emoji"
                  onChange={e => onPreferenceChange('enemyEmojis', { ...(preferences.enemyEmojis || {}), [key]: e.target.value })} />
                <button onClick={() => chooseEmoji(key, def.emoji)} title="Restore default">↺</button>
              </div>}
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
            <div className="index-icon">{def.type === 'Attack' ? '⚔️' : def.type === 'Power' ? '✦' : '◆'}</div>
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
          <div className="index-icon">{def.emoji}</div>
          <div className="index-copy"><b>{def.name}</b><small>{type}{def.tier ? ` · ${def.tier}` : ''}</small><p>{def.desc}</p><span>Seen {stat.seen || stat.obtained || 0} · Obtained {stat.obtained || 0}</span></div>
        </article>;
      })}
    </div>
  </div>;
}
