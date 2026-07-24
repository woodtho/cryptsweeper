import { CARDS } from '../engine/data.js';
import { effCost } from '../engine/engine.js';
import { decorateMechanics } from './mechanics.js';

const TYPE_GLYPHS = { Attack: '▲', Skill: '◆', Power: '⬢', Status: '✕', Curse: '✕' };
const HIT_LABELS = { target: '⌖ target', random: '✸ random', all: '☄ all', mixed: '◇ conditional' };
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
  const cost = def.cost == null ? null : (inCombat ? effCost(card) : def.cost[card.up ? 1 : 0]);
  const rar = def.rarity === 'special' ? (def.type === 'Curse' ? 'curse' : '') : def.rarity;
  const cls = ['card', rar, (def.unplayable || dim) ? 'unplayable' : '', selected ? 'selected' : '']
    .filter(Boolean).join(' ');
  return (
    <div className={cls} onClick={onClick} data-ctype={def.type} data-cclass={def.cls || 'neutral'} data-glyph={TYPE_GLYPHS[def.type] || '◆'}>
      <div className="top">
        {cost == null
          ? <div className="cost free">—</div>
          : <div className={`cost ${cost === 0 ? 'free' : ''}`}>{cost}</div>}
        <div className="cname">{def.name}{card.up ? <span className="upg">+</span> : null}</div>
      </div>
      <div className="typeline">
        {def.rarity} · {def.type}
        {def.hits ? <span className={`hitmode hm-${def.hits}`}> · {HIT_LABELS[def.hits]}</span> : null}
      </div>
      <div className="rules" dangerouslySetInnerHTML={{ __html: decorateMechanics(def.text(card.up)) }} />
      {selection ? <div className="targetline">{selection}</div> : null}
    </div>
  );
}
