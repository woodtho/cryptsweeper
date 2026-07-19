import { CLASSES, TRINKETS, GADGETS, STRATA } from '../engine/data.js';
import {
  run, ui, MAP_ROWS, newRun, reachableNodes, enterNode, score, resetToTitle,
  takeRewardCard, takeRewardTrinket, takeBossTrinket, takeRewardGadget, finishReward,
  campHeal, campUpgrade, campSurvey,
  buyShopCard, buyShopTrinket, buyShopGadget, buyRemoval, gotoMap,
  eventChoice, toggleFlagMode, togglePuzzleScan,
} from '../engine/engine.js';
import { TopBar } from './TopBar.jsx';
import { CardView } from './CardView.jsx';
import { BoardView } from './BoardView.jsx';

/* ---------------- title / class select ---------------- */
export function TitleScreen() {
  return (
    <>
      <header style={{ padding: '40px 0 10px' }}>
        <p className="eyebrow">Roguelite deckbuilder × minesweeper · vertical slice v0.3</p>
        <h1 className="logo">CRYPT<span className="flag">SWEEPER</span></h1>
        <p className="tagline">Every fight is a board. Every card is a guess you don't have to make.</p>
      </header>
      <p className="eyebrow">Choose your Delver</p>
      <div className="classgrid">
        {Object.entries(CLASSES).map(([k, c]) => (
          <div key={k} className="classcard" onClick={() => newRun(k)}>
            <h3>{c.name}</h3>
            <div className="role">{c.role}</div>
            <div className="hp">❤ {c.hp} HP</div>
            <p>{c.blurb}</p>
            <div className="trink">
              Starts with: {TRINKETS[c.trinket].emoji} <b>{TRINKETS[c.trinket].name}</b> — {TRINKETS[c.trinket].desc}
            </div>
          </div>
        ))}
      </div>
      <div className="screenpanel" style={{ marginTop: 24 }}>
        <h2 style={{ fontSize: 16 }}>How to play</h2>
        <ul style={{ fontSize: 14, lineHeight: 1.6 }}>
          <li><b>Left-click</b> a hidden tile to <span className="kw reveal">Reveal</span> it. <b>Right-click</b> (or Flag mode) to place a ⚑ flag — free, unlimited, unverified.</li>
          <li>Numbers count adjacent mines. Revealing a mine <span className="kw detonate">Detonates</span> it: mine damage <b>pierces Block</b> — only <span className="kw gridk">Plating</span> stops it.</li>
          <li>Each turn: 3⚡, draw 5. Cards reveal, scan, defuse, detonate, and edit tiles — and hurt the enemies beside the board.</li>
          <li>The ⌖ TARGET marker shows who your attacks hit — click an enemy to switch. Each card's label says who it strikes: <b>⌖ target</b>, <b>✸ random</b>, or <b>☄ all</b>; hover a card to see exactly who it will hit.</li>
          <li>Enemies attack you <i>and</i> the board: lay mines, fog tiles, scramble your reads — always telegraphed.</li>
          <li>Every enemy nests in a tinted <b>⛏ lair</b> on the board. Revealing a safe lair tile wounds its owner by the tile's number; a mine detonating in a lair deals 10 to it; entombing deals 3. Kill an enemy and its lair <b>crumbles open</b> — mines defused, tiles revealed. Sweeping is fighting.</li>
          <li><b>Full Clear</b> the board (reveal every safe tile — the green ▦ counter) to collapse it: <b>50 damage to ALL enemies</b> and an upgraded card reward. The crypt then re-seals with a fresh board — <b>only killing every enemy wins the fight</b>.</li>
          <li>Once per combat, <b>Instinct</b> saves you from one revealed mine (Depth 0 training wheel).</li>
        </ul>
      </div>
    </>
  );
}

/* ---------------- map ---------------- */
const NODE_ICONS = { dig: '⚔️', elite: '💀', camp: '🔥', shop: '💰', treasure: '🎁', event: '❓', boss: '☠️' };

export function MapScreen() {
  const m = run.map;
  const reach = reachableNodes();
  const isReach = (r, c) => reach.some(n => n.r === r && n.c === c);
  const lines = [];
  for (const [key, set] of Object.entries(m.edges)) {
    const [r, c] = key.split(',').map(Number);
    for (const nc of set) {
      if (m.nodes[r + 1][nc] === undefined) continue;
      lines.push(
        <line key={`${key}-${nc}`} x1={(c + 0.5) * 20} y1={r + 0.5} x2={(nc + 0.5) * 20} y2={r + 1.5}
          stroke="var(--line)" strokeWidth="0.25" />,
      );
    }
  }
  return (
    <>
      <TopBar />
      <p className="eyebrow" style={{ textAlign: 'center' }}>Tunnel map — choose your descent</p>
      <div className="mapwrap" style={{ height: MAP_ROWS * 64 }}>
        <svg viewBox={`0 0 100 ${MAP_ROWS}`} preserveAspectRatio="none">{lines}</svg>
        {m.nodes.map((row, r) => (
          <div key={r} className="maprow">
            {Object.keys(row).map(cs => {
              const c = +cs;
              const type = row[cs];
              const cls = ['mapnode',
                type === 'boss' ? 'boss' : '',
                isReach(r, c) ? 'reachable' : '',
                run.pos && run.pos.r === r && run.pos.c === c ? 'current' : '',
                (run.visited[`${r},${c}`] || (run.pos && r < run.pos.r)) ? 'done' : '',
              ].filter(Boolean).join(' ');
              return (
                <div key={c} className={cls} title={type}
                  style={{ position: 'absolute', left: `calc(${(c + 0.5) * 20}% - 23px)` }}
                  onClick={() => isReach(r, c) && enterNode(r, c)}>
                  {NODE_ICONS[type]}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <p className="maplegend">⚔️ dig · 💀 elite · ❓ event · 💰 shop · 🎁 treasure · 🔥 camp · ☠️ boss</p>
    </>
  );
}

/* ---------------- reward ---------------- */
export function RewardScreen() {
  const r = run.reward;
  return (
    <>
      <TopBar />
      <div className="screenpanel">
        <h2>{r.fullClear ? '★ FULL CLEAR — ' : ''}Victory</h2>
        <p className="dim">
          Loot from the {r.kind}.{' '}
          {r.fullClear ? <>The card reward is shown <b style={{ color: 'var(--n2)' }}>upgraded</b> and you found +15 bonus gold.</> : null}
        </p>
        <p>◈ <b className="gold">+{r.gold} gold</b> collected.</p>
        {r.trinket && (
          <p>💎 Elite spoils: <b>{TRINKETS[r.trinket].emoji} {TRINKETS[r.trinket].name}</b> — {TRINKETS[r.trinket].desc}{' '}
            <button className="btn" onClick={takeRewardTrinket}>Take</button></p>
        )}
        {r.bossTrinkets && r.bossTrinkets.length > 0 && (
          <>
            <p>👑 Boss relic — choose one:</p>
            <div className="choicelist">
              {r.bossTrinkets.map(k => (
                <div key={k} className="choice" onClick={() => takeBossTrinket(k)}>
                  <span className="cname">{TRINKETS[k].emoji} {TRINKETS[k].name}</span>
                  <div className="cdesc">{TRINKETS[k].desc}</div>
                </div>
              ))}
            </div>
          </>
        )}
        {r.gadget && (
          <p>🎒 Found gadget: <b>{GADGETS[r.gadget].emoji} {GADGETS[r.gadget].name}</b> — {GADGETS[r.gadget].desc}{' '}
            {run.gadgets.length < 3
              ? <button className="btn" onClick={takeRewardGadget}>Take</button>
              : <span className="dim">(slots full)</span>}
          </p>
        )}
        {!r.cardTaken ? (
          <>
            <p>Choose a card (or skip):</p>
            <div className="cardpick">
              {r.cards.map((cd, i) => (
                <CardView key={i} card={{ id: i, key: cd.key, up: cd.up }} onClick={() => takeRewardCard(i)} />
              ))}
            </div>
          </>
        ) : <p className="dim">Card added.</p>}
        <button className="btn primary" onClick={finishReward}>Continue ▸</button>
      </div>
    </>
  );
}

/* ---------------- camp ---------------- */
export function CampScreen() {
  return (
    <>
      <TopBar />
      <div className="screenpanel">
        <h2>🔥 Camp</h2>
        <p className="dim">The dark is patient. Choose one.</p>
        <div className="choicelist">
          <div className="choice" onClick={campHeal}>
            <span className="cname">Rest</span>
            <div className="cdesc">Heal {Math.floor(run.maxHp * 0.3)} HP (30%).</div>
          </div>
          <div className="choice" onClick={campUpgrade}>
            <span className="cname">Smith</span>
            <div className="cdesc">Upgrade a card permanently.</div>
          </div>
          <div className="choice" onClick={campSurvey}>
            <span className="cname">Survey</span>
            <div className="cdesc">Your next combat's board starts 25% pre-revealed.</div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ---------------- shop ---------------- */
export function ShopScreen() {
  const s = run.shop;
  return (
    <>
      <TopBar />
      <div className="screenpanel">
        <h2>💰 The Rat Merchant</h2>
        <p className="dim">"Dig gold, spend gold, eh?"</p>
        <div className="shopgrid">
          {s.cards.map((it, i) => (
            <div key={i} className={`shopitem ${it.sold ? 'sold' : ''}`}>
              <CardView card={{ id: i, key: it.key, up: 0 }} onClick={() => buyShopCard(i)} />
              <div className="price">{it.price}g</div>
            </div>
          ))}
        </div>
        <div className="shopgrid">
          {s.trinkets.map((it, i) => (
            <div key={it.key} className={`shopitem ${it.sold ? 'sold' : ''}`}>
              <div className="choice" onClick={() => buyShopTrinket(i)}>
                <span className="cname">{TRINKETS[it.key].emoji} {TRINKETS[it.key].name}</span>
                <div className="cdesc">{TRINKETS[it.key].desc}</div>
              </div>
              <div className="price">{it.price}g</div>
            </div>
          ))}
          {s.gadgets.map((it, i) => (
            <div key={`g${i}`} className={`shopitem ${it.sold ? 'sold' : ''}`}>
              <div className="choice" onClick={() => buyShopGadget(i)}>
                <span className="cname">{GADGETS[it.key].emoji} {GADGETS[it.key].name}</span>
                <div className="cdesc">{GADGETS[it.key].desc}</div>
              </div>
              <div className="price">{it.price}g</div>
            </div>
          ))}
        </div>
        <p><button className="btn" onClick={buyRemoval}>Remove a card — {run.removalCost}g</button></p>
        <button className="btn primary" onClick={gotoMap}>Leave ▸</button>
      </div>
    </>
  );
}

/* ---------------- events ---------------- */
export function EventScreen() {
  if (run.event === 'shrine') {
    return (
      <>
        <TopBar />
        <div className="screenpanel">
          <h2>🚪 The 50/50 Shrine</h2>
          <p>Two doors of scorched brass. Behind one: a delver's prize. Behind the other: a blast that never
            went off — until now. The one honest coin flip in the Undermine, priced up front.</p>
          <div className="choicelist">
            <div className="choice" onClick={() => eventChoice('left')}>
              <span className="cname">The left door</span>
              <div className="cdesc">50%: gadget + 30 gold · 50%: heavy mine damage.</div>
            </div>
            <div className="choice" onClick={() => eventChoice('right')}>
              <span className="cname">The right door</span>
              <div className="cdesc">Same odds. It's a coin flip; the door doesn't care.</div>
            </div>
            <div className="choice" onClick={() => eventChoice('walk')}>
              <span className="cname">Walk away</span>
              <div className="cdesc">No flip, no prize.</div>
            </div>
          </div>
        </div>
      </>
    );
  }
  return (
    <>
      <TopBar />
      <div className="screenpanel">
        <h2>🪦 The Cartographer's Corpse</h2>
        <p>He mapped three strata and died six feet from a camp. His satchel bulges with annotated charts.
          His hand still grips a charcoal stick.</p>
        <div className="choicelist">
          <div className="choice" onClick={() => eventChoice('take')}>
            <span className="cname">Take his maps</span>
            <div className="cdesc">Gain a rare trinket — and his Claustrophobia (curse: boards spawn +2 mines).</div>
          </div>
          <div className="choice" onClick={() => eventChoice('bury')}>
            <span className="cname">Bury him properly</span>
            <div className="cdesc">+3 max HP.</div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ---------------- puzzle ---------------- */
export function PuzzleScreen() {
  const p = run.puzzle;
  return (
    <>
      <TopBar />
      <div className="screenpanel" style={{ maxWidth: 640 }}>
        <h2>🧩 An Honest Puzzle</h2>
        <p className="dim">A small handcrafted board. No enemy. No turn limit. Solve it flawlessly for a card
          upgrade; detonate anything and it's gone.</p>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <BoardView mode="puzzle" />
        </div>
        <div className="boardinfo" style={{ justifyContent: 'center' }}>
          <button className="btn" onClick={toggleFlagMode}
            style={ui.flagMode ? { borderColor: 'var(--flag)', color: 'var(--flag)' } : undefined}>
            ⚑ Flag mode: {ui.flagMode ? 'ON' : 'off'}
          </button>
          <button className="btn" disabled={!p.scans} onClick={togglePuzzleScan}
            style={p.scanMode ? { borderColor: 'var(--n2)', color: 'var(--n2)' } : undefined}>
            🔎 Scan ({p.scans} left)
          </button>
        </div>
        {p.failed && (
          <>
            <p className="flagc mono">The engraving fades. Nothing gained.</p>
            <button className="btn primary" onClick={gotoMap}>Leave</button>
          </>
        )}
        {p.solved && (
          <>
            <p className="mono" style={{ color: 'var(--n2)' }}>★ Flawless. Choose a card to upgrade.</p>
            <button className="btn primary" onClick={campUpgrade}>Upgrade a card</button>
          </>
        )}
        {!p.failed && !p.solved && <button className="btn" onClick={gotoMap}>Abandon</button>}
      </div>
    </>
  );
}

/* ---------------- game over / victory ---------------- */
export function GameOverScreen({ won }) {
  return (
    <div className="gameover">
      <h1 style={{ color: won ? 'var(--gold)' : 'var(--flag)' }}>{won ? 'THE SEAM IS SILENT' : 'BURIED'}</h1>
      <p className="tagline">
        {won
          ? 'NN-99 collapses into scrap. Somewhere deeper, the First Mine is still counting. (The Vein — with all three Detonator Keys — awaits a future update.)'
          : 'The Undermine keeps what it kills.'}
      </p>
      <p className="scoreline">
        Floors: {run.floors} · Stratum: {run.stratum + 1} · Full Clears: {run.fullClears} · Gold: {run.gold} · HP: {run.hp}
      </p>
      <p className="scoreline" style={{ fontSize: 18, color: 'var(--gold)' }}>SCORE: {score()}</p>
      <button className="btn primary" onClick={resetToTitle}>New run ▸</button>
    </div>
  );
}
