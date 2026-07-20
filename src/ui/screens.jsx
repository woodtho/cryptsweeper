import { useState } from 'react';
import { CLASSES, TRINKETS, GADGETS, STRATA } from '../engine/data.js';
import {
  run, ui, MAP_ROWS, newRun, reachableNodes, enterNode, score, resetToTitle,
  takeRewardCard, takeRewardTrinket, takeBossTrinket, takeRewardGadget, finishReward,
  campHeal, campUpgrade, campSurvey, campTrainPicks, PICKS_PER_TURN,
  buyShopCard, buyShopTrinket, buyShopGadget, buyRemoval, gotoMap,
  eventChoice, toggleFlagMode, togglePuzzleScan,
  listSaves, loadRun, saveRun, deleteSave,
} from '../engine/engine.js';
import { TopBar } from './TopBar.jsx';
import { CardView } from './CardView.jsx';
import { BoardView } from './BoardView.jsx';
import { UNLOCKS, isDelverUnlocked, loadProgression } from '../engine/progression.js';
import sapperPortrait from '../assets/delvers/sapper-cartoon.webp';
import surveyorPortrait from '../assets/delvers/surveyor-cartoon.webp';
import terraformerPortrait from '../assets/delvers/terraformer-cartoon.webp';
import lamplighterPortrait from '../assets/delvers/lamplighter.webp';
import gamblerPortrait from '../assets/delvers/gambler.webp';
import chirurgeonPortrait from '../assets/delvers/chirurgeon.webp';
import archivistPortrait from '../assets/delvers/archivist.webp';
import wardenPortrait from '../assets/delvers/warden.webp';
import hexwrightPortrait from '../assets/delvers/hexwright.webp';
import revenantPortrait from '../assets/delvers/revenant.webp';
import ratMerchantPortrait from '../assets/npcs/rat-merchant.webp';
import { decorateMechanics } from './mechanics.js';

/* ---------------- title / class select ---------------- */
const PANEL_TITLES = { play: 'Choose your Delver', how: 'How to play', saves: 'Saved descents', settings: 'Settings', daily: 'Daily challenge' };
const DELVER_PORTRAITS = {
  sapper: sapperPortrait, surveyor: surveyorPortrait, terraformer: terraformerPortrait,
  lamplighter: lamplighterPortrait, gambler: gamblerPortrait, chirurgeon: chirurgeonPortrait,
  archivist: archivistPortrait, warden: wardenPortrait, hexwright: hexwrightPortrait,
  revenant: revenantPortrait,
};

const BOSS_AFTERMATH = [
  {
    name: 'The Collapser', mark: '🕳️',
    lines: [
      ['narrator', 'The last stones settle. For the first time in an age, the passage ahead holds.'],
      ['player', 'One seam quiet. Two more below.'],
    ],
  },
  {
    name: 'The Fogfather', mark: '🌁️',
    lines: [
      ['narrator', 'The fog thins into silver threads, revealing a shaft that was never on the map.'],
      ['player', 'Good. I was running out of sensible ways down.'],
    ],
  },
  {
    name: 'NN-99', mark: '🛰️',
    lines: [
      ['narrator', 'NN-99 counts down through broken numbers, then falls silent. Something deeper answers once.'],
      ['player', 'The seam is quiet. The mine is not.'],
    ],
  },
];

function NarrativeCutscene({ kind, lines, title, mark, onDone }) {
  const [beat, setBeat] = useState(0);
  const [speaker, text] = lines[beat];
  const isMerchant = kind === 'merchant';
  const advance = () => {
    if (beat < lines.length - 1) setBeat(beat + 1);
    else onDone();
  };
  return (
    <div className="cutscene-overlay" role="dialog" aria-modal="true" aria-label={title}>
      <section className={`cutscene ${kind}`}>
        <div className="cutscene-visual">
          <img className={`cutscene-main-art ${isMerchant ? '' : 'player-main'}`}
            src={isMerchant ? ratMerchantPortrait : DELVER_PORTRAITS[run.cls]}
            alt={isMerchant ? 'The Rat Merchant at his underground stall' : `${CLASSES[run.cls].name}, the delver`} />
          {isMerchant ? (
            <div className={`cutscene-player ${speaker === 'player' ? 'speaking' : ''}`}>
              <img src={DELVER_PORTRAITS[run.cls]} alt={CLASSES[run.cls].name} />
            </div>
          ) : (
            <div className="cutscene-bossmark" aria-label={title}><span>{mark}</span><small>DEFEATED</small></div>
          )}
          <div className="cutscene-vignette" />
        </div>
        <div className="cutscene-dialogue">
          <div className="cutscene-speaker">
            {speaker === 'player' ? CLASSES[run.cls].name : speaker === 'merchant' ? 'Rat Merchant' : title}
          </div>
          <p>{text}</p>
          <div className="cutscene-actions">
            <button className="cutscene-skip" onClick={onDone}>Skip</button>
            <button className="btn primary" onClick={advance}>
              {beat < lines.length - 1 ? 'Continue' : isMerchant ? 'See the wares' : 'Claim the spoils'} ▸
            </button>
          </div>
        </div>
        <div className="cutscene-progress" aria-hidden="true">
          {lines.map((_, i) => <i key={i} className={i <= beat ? 'on' : ''} />)}
        </div>
      </section>
    </div>
  );
}

function localDateKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function DelverPicker({ daily = null }) {
  const progress = loadProgression();
  return (
    <div className="classgrid">
      {Object.entries(CLASSES).map(([k, c]) => {
        const unlocked = isDelverUnlocked(k, progress);
        return (
        <button type="button" key={k} className={`classcard ${unlocked ? '' : 'locked'}`} disabled={!unlocked}
          onClick={() => newRun(k, daily ? { daily } : {})}>
          <div className="delver-art"><img src={DELVER_PORTRAITS[k]} alt={`${c.name} portrait`} /></div>
          <div className="delver-body">
            <h3>{c.name}</h3>
            <div className="role">{c.role}</div>
            <div className="hp">❤ {c.hp} HP</div>
            <p>{c.blurb}</p>
            <div className="passive" dangerouslySetInnerHTML={{ __html: decorateMechanics(c.passive) }} />
          </div>
          <div className="trink">
            Starts with: {TRINKETS[c.trinket].emoji} <b>{TRINKETS[c.trinket].name}</b> — {TRINKETS[c.trinket].desc}
          </div>
          {!unlocked && <div className="unlock-rule"><b>LOCKED</b><span>{UNLOCKS[k].label}</span></div>}
        </button>
      );})}
    </div>
  );
}

export function TitleScreen({ muted, preferences, onMutedChange, onPreferenceChange }) {
  const [panel, setPanel] = useState('home');
  const [saveRevision, setSaveRevision] = useState(0);
  const saves = listSaves();
  const auto = saves.find(s => s.slot === 'auto');
  const daily = localDateKey();
  const open = next => setPanel(next);

  return (
    <main className="home-screen">
      <header className="home-hero">
        <p className="eyebrow">Roguelite deckbuilder × minesweeper · v{__APP_VERSION__}</p>
        <h1 className="logo">CRYPT<span className="flag">SWEEPER</span></h1>
        <p className="tagline">Every fight is a board. Every card is a guess you don't have to make.</p>
      </header>

      {panel === 'home' ? (
        <div className="home-menu" aria-label="Main menu">
          {auto && <button className="home-action primary" onClick={() => loadRun('auto')}><span>Continue descent</span><small>Depth {auto.stratum + 1} · {auto.hp}/{auto.maxHp} HP · {auto.floors} floors</small></button>}
          <button className="home-action" onClick={() => open('play')}><span>New run</span><small>Choose a Delver and enter the Undermine</small></button>
          <button className="home-action daily" onClick={() => open('daily')}><span>Daily challenge</span><small>{daily} · one shared seeded crypt</small></button>
          <div className="home-menu-grid">
            <button className="home-action compact" onClick={() => open('how')}><span>How to play</span><small>Rules, combat, and controls</small></button>
            <button className="home-action compact" onClick={() => open('saves')}><span>Saves</span><small>{saves.length} checkpoint{saves.length === 1 ? '' : 's'}</small></button>
            <button className="home-action compact" onClick={() => open('settings')}><span>Settings</span><small>Sound, motion, and display</small></button>
          </div>
        </div>
      ) : (
        <section className="home-panel screenpanel">
          <div className="home-panel-head">
            <button className="btn" onClick={() => open('home')}>← Back</button>
            <p className="eyebrow">{PANEL_TITLES[panel]}</p>
          </div>

          {panel === 'play' && <DelverPicker />}
          {panel === 'daily' && <>
            <div className="daily-brief">
              <div className="daily-rune">◆</div>
              <div><h2>{daily}</h2><p>The map, boards, encounters, and rewards use today's fixed seed. Choose any Delver; retries remain identical for that class.</p></div>
            </div>
            <DelverPicker daily={daily} />
          </>}
          {panel === 'how' && <HowToPlay />}
          {panel === 'saves' && <div className="save-list">
            {['auto', 'slot1', 'slot2', 'slot3'].map((slot, i) => {
              const item = saves.find(s => s.slot === slot);
              const label = slot === 'auto' ? 'Autosave' : `Save slot ${i}`;
              return <div className="save-row" key={`${slot}-${saveRevision}`}>
                <div><b>{label}</b>{item
                  ? <small>{CLASSES[item.cls]?.name || item.cls} · Depth {item.stratum + 1} · {item.hp}/{item.maxHp} HP · {new Date(item.savedAt).toLocaleString()}</small>
                  : <small>Empty</small>}</div>
                <div className="save-actions">
                  {item && <button className="btn primary" onClick={() => loadRun(slot)}>Load</button>}
                  {slot !== 'auto' && run && <button className="btn" onClick={() => { saveRun(slot); setSaveRevision(x => x + 1); }}>Save here</button>}
                  {item && <button className="btn danger" onClick={() => { deleteSave(slot); setSaveRevision(x => x + 1); }}>Delete</button>}
                </div>
              </div>;
            })}
            {!run && <p className="dim">Start or load a run before writing a named save slot.</p>}
          </div>}
          {panel === 'settings' && <div className="settings-list">
            <SettingToggle label="Sound effects" detail="Synthesized combat and interface audio" checked={!muted} onChange={onMutedChange} />
            <SettingToggle label="Reduce motion" detail="Disables shakes, floating effects, and decorative animation" checked={preferences.reducedMotion} onChange={() => onPreferenceChange('reducedMotion', !preferences.reducedMotion)} />
            <SettingToggle label="High contrast" detail="Brightens text, borders, and board information" checked={preferences.highContrast} onChange={() => onPreferenceChange('highContrast', !preferences.highContrast)} />
            <SettingToggle label="Large tiles" detail="Increases board tiles where the screen has room" checked={preferences.largeTiles} onChange={() => onPreferenceChange('largeTiles', !preferences.largeTiles)} />
            <p className="dim settings-note">Settings are saved automatically in this browser.</p>
          </div>}
        </section>
      )}
    </main>
  );
}

function SettingToggle({ label, detail, checked, onChange }) {
  return <label className="setting-row">
    <span><b>{label}</b><small>{detail}</small></span>
    <input type="checkbox" checked={checked} onChange={onChange} />
  </label>;
}

function HowToPlay() {
  return <div className="how-grid">
    <div>
      <h2>Dig. Read. Survive.</h2>
        <ul style={{ fontSize: 14, lineHeight: 1.6 }}>
          <li><b>Left-click</b> a hidden tile to <span className="kw reveal">Reveal</span> it — you get <b data-mechanic="picks">⛏ 4 free digs per turn</b> (a cascade counts as one), and cards or trinkets can grant more. <b data-mechanic="flag">Flags</b> are free and unlimited: <b>right-click</b> or Flag mode.</li>
          <li>Cards are your powered tools: their reveals, scans, defusals, chords, and detonations <b>never cost picks</b>. When the picks run out, the deck keeps digging.</li>
          <li>Boards come in shapes — crosses, diamonds, donuts, caverns — and both sides can reshape them: enemies <b>Excavate</b> new mined ground; your cards can annex safe tiles or bury fresh mines.</li>
          <li>Numbers count adjacent mines. Revealing a mine <span className="kw detonate">Detonates</span> it: <span data-mechanic="mine damage">mine damage</span> <b data-mechanic="block">pierces Block</b> — only <span className="kw gridk">Plating</span> stops it.</li>
          <li>Each turn: 3⚡, draw 5. Cards reveal, scan, defuse, detonate, and edit tiles — and hurt the enemies beside the board.</li>
          <li>The ⌖ TARGET marker shows who your attacks hit — click an enemy to switch. Each card's label says who it strikes: <b>⌖ target</b>, <b>✸ random</b>, or <b>☄ all</b>; hover a card to see exactly who it will hit.</li>
          <li>Enemies attack you <i>and</i> the board: lay mines, fog tiles, scramble your reads — always telegraphed.</li>
          <li>Every enemy nests in a tinted <b>⛏ lair</b> on the board. Revealing a safe lair tile wounds its owner by the tile's number; a mine detonating in a lair deals 10 to it; entombing deals 3. Kill an enemy and its lair <b>crumbles open</b> — mines defused, tiles revealed. Sweeping is fighting.</li>
          <li><b data-mechanic="full clear">Full Clear</b> the board (reveal every safe tile — the green ▦ counter) to collapse it: <b>50 damage to ALL enemies</b> and an upgraded card reward. The crypt then re-seals with a fresh board — <b>only killing every enemy wins the fight</b>.</li>
          <li>Once per combat, <b data-mechanic="instinct">Instinct</b> saves you from one revealed mine (Depth 0 training wheel).</li>
        </ul>
    </div>
    <aside className="controls-card">
      <h2>Controls</h2>
      <p><kbd>Left click</kbd><span>Dig / select</span></p>
      <p><kbd>Right click</kbd><span>Place a flag</span></p>
      <p><kbd>F</kbd><span>Toggle flag mode</span></p>
      <p><kbd>E</kbd><span>End turn</span></p>
      <p><kbd>Esc</kbd><span>Cancel / close</span></p>
    </aside>
  </div>;
}

/* ---------------- map ---------------- */
const NODE_ICONS = { dig: '⚔︎', elite: '☠︎', camp: '▲', shop: '◈', treasure: '◆', event: '?', boss: '♛' };

export function MapScreen() {
  const m = run.map;
  const reach = reachableNodes();
  const isReach = (r, c) => reach.some(n => n.r === r && n.c === c);
  const lines = [];
  for (const [key, set] of Object.entries(m.edges)) {
    const [r, c] = key.split(',').map(Number);
    for (const nc of set) {
      if (m.nodes[r + 1][nc] === undefined) continue;
      lines.push(<g key={`${key}-${nc}`}>
        <line className="mapline-shadow" x1={(c + 0.5) * 20} y1={r + 0.5} x2={(nc + 0.5) * 20} y2={r + 1.5} />
        <line className="mapline" x1={(c + 0.5) * 20} y1={r + 0.5} x2={(nc + 0.5) * 20} y2={r + 1.5} />
      </g>);
    }
  }
  return (
    <>
      <TopBar />
      <p className="eyebrow" style={{ textAlign: 'center' }}>Tunnel map — choose your descent</p>
      <div className="mapwrap" style={{ height: `calc(var(--map-row) * ${MAP_ROWS})` }}>
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
                  style={{ position: 'absolute', left: `${(c + 0.5) * 20}%` }}
                  onClick={() => isReach(r, c) && enterNode(r, c)}>
                  <span className="mapicon" aria-hidden="true">{NODE_ICONS[type]}</span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <p className="maplegend">⚔︎ dig · ☠︎ elite · ? event · ◈ shop · ◆ treasure · ▲ camp · ♛ boss</p>
    </>
  );
}

/* ---------------- reward ---------------- */
export function RewardScreen() {
  const r = run.reward;
  const [showAftermath, setShowAftermath] = useState(r.kind === 'boss');
  const aftermath = BOSS_AFTERMATH[run.stratum];
  return (
    <>
      {showAftermath && aftermath && (
        <NarrativeCutscene kind="boss" title={aftermath.name} mark={aftermath.mark}
          lines={aftermath.lines} onDone={() => setShowAftermath(false)} />
      )}
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
          <div className={`choice ${(run.pickBonus || 0) >= 2 ? 'disabled' : ''}`} onClick={campTrainPicks}>
            <span className="cname">Trail Training</span>
            <div className="cdesc">
              {(run.pickBonus || 0) >= 2
                ? `Training mastered: ${PICKS_PER_TURN + run.pickBonus} base max picks each turn.`
                : `Permanently gain +1 max pick each turn this run (currently ${PICKS_PER_TURN + (run.pickBonus || 0)}; cap +2).`}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ---------------- shop ---------------- */
export function ShopScreen() {
  const s = run.shop;
  const [showIntro, setShowIntro] = useState(true);
  const merchantLines = [
    ['merchant', 'Easy now, delver. Nothing on my shelves bites unless you haggle.'],
    ['player', 'I need tools, not teeth.'],
    ['merchant', 'Then we understand one another. Dig gold, spend gold, eh?'],
  ];
  return (
    <>
      {showIntro && (
        <NarrativeCutscene kind="merchant" title="The Rat Merchant" lines={merchantLines}
          onDone={() => setShowIntro(false)} />
      )}
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
      <button className="btn primary" onClick={resetToTitle}>Return home ▸</button>
    </div>
  );
}
