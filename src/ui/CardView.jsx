import { CARDS } from '../engine/data.js';
import { effCost, isPlayLethal } from '../engine/engine.js';
import { decorateMechanics } from './mechanics.js';

const TYPE_GLYPHS = { Attack: '▲', Skill: '◆', Power: '⬢', Item: '◇', Status: '✕', Curse: '✕' };
const HIT_LABELS = { target: '⌖ target', random: '✸ random', all: '☄ all', mixed: '◇ conditional' };
const RARITY_SEGMENTS = { starter: 1, common: 1, uncommon: 2, rare: 3 };
const TARGET_LABELS = {
  hidden: 'hidden tile',
  open: 'revealed tile',
  number: 'revealed number',
  row: 'row',
  anytile: 'tile',
};

function targetLabel(def) {
  const targets = def.targets || [];
  if (!targets.length) return null;
  const unique = [...new Set(targets)];
  if (unique.length === 1) {
    const count = targets.length;
    const noun = TARGET_LABELS[unique[0]] || unique[0];
    return `Choose ${def.optionalTargets ? 'up to ' : ''}${count} ${noun}${count === 1 ? '' : 's'}`;
  }
  return `Choose ${targets.map(target => TARGET_LABELS[target] || target).join(' + ')}`;
}

export function CardView({ card, onClick, inCombat = false, selected = false, dim = false }) {
  const def = CARDS[card.key];
  const selection = targetLabel(def);
  const level = Math.max(0, Math.min(2, Number(card.up || 0)));
  const cost = def.cost == null ? null
    : (inCombat ? effCost(card) : (def.cost.length >= 3
      ? def.cost[level]
      : Math.max(0, def.cost[level ? 1 : 0] - (level >= 2 ? 1 : 0))));
  const rar = def.rarity === 'special'
    ? (def.type === 'Curse' ? 'curse' : def.type === 'Item' ? 'item' : '')
    : def.rarity;
  const rarLabel = def.type === 'Curse' ? 'curse' : def.rarity;
  const segments = RARITY_SEGMENTS[def.rarity] ?? 1;
  const glyph = TYPE_GLYPHS[def.type] || '◆';
  const lethal = inCombat && isPlayLethal(card);
  const risen = Boolean(card.risen);
  const cls = ['card', rar, risen ? 'risen' : '', (def.unplayable || dim) ? 'unplayable' : '', selected ? 'selected' : '', lethal ? 'lethal' : '']
    .filter(Boolean).join(' ');
  return (
    <div className={cls} onClick={onClick} role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick();
        }
      } : undefined}
      aria-label={onClick ? `${def.name}${card.up ? `, upgrade ${card.up}` : ''}` : undefined}
      data-ctype={def.type} data-cclass={def.cls || 'neutral'} data-glyph={glyph}>
      <span className="brk tl" /><span className="brk tr" /><span className="brk bl" /><span className="brk br" />
      <span className="ctab" />
      {lethal ? <span className="clethal" title="Playing this now would end your run.">◆ Lethal</span> : null}
      <div className="cstrip">
        <span className={`chip ccost ${cost === 0 ? 'free' : ''} ${cost == null ? 'na' : ''}`.trim()}>{cost == null ? '—' : cost}</span>
        <span className="chip ctype">{def.type}</span>
        {def.hits ? <span className={`chip chit hm-${def.hits}`}>{HIT_LABELS[def.hits]}</span> : null}
      </div>
      <div className="cname">{def.name}{card.up ? <span className="upg">{card.up >= 2 ? '++' : '+'}</span> : null}</div>
      <div className="cid">{def.cls || 'neutral'}</div>
      <div className="rules"><span className="rrun" dangerouslySetInnerHTML={{ __html: decorateMechanics(def.text(card.up || 0)) }} /></div>
      {risen ? <div className="risen-rule"><b>↑ Risen{def.type === 'Attack' ? ' · +50% damage' : ''}</b><span>Exhausts after play</span></div> : null}
      {selection ? <div className="targetline">{selection}</div> : null}
      <div className="cbar">
        <span className="segs">{[0, 1, 2].map(i => <i key={i} className={i < segments ? 'on' : ''} />)}</span>
        <span className="crar">{rarLabel}</span>
        <span className="cglyph">{glyph}</span>
      </div>
    </div>
  );
}
