import { useEffect, useState } from 'react';
import { CLASSES, CARDS, TRINKETS, GADGETS, STRATA, ENEMIES } from '../engine/data.js';
import {
  run, ui, MAP_ROWS, newRun, reachableNodes, enterNode, score, resetToTitle,
  takeRewardCard, takeRewardTrinket, takeBossTrinket, takeRewardGadget, finishReward,
  campHeal, campUpgrade, campSurvey, campTrainPicks, PICKS_PER_TURN,
  buyShopCard, buyShopTrinket, buyShopGadget, buyRemoval, gotoMap,
  EVENT_CATALOG, TEST_CUTSCENES, eventChoice, togglePuzzleScan, setLogicPuzzleCell, checkLogicPuzzle,
  toggleLightsCell, toggleNonogramCell, answerSequence,
  testLaunch, testRefill,
  listSaves, loadRun, saveRun, deleteSave,
} from '../engine/engine.js';
import { TopBar } from './TopBar.jsx';
import { CardView } from './CardView.jsx';
import { BoardView } from './BoardView.jsx';
import { UNLOCKS, isDelverUnlocked, loadProgression } from '../engine/progression.js';
import { localDateKey, loadDailyRecords } from '../engine/daily.js';
import { loadPreferences } from '../engine/preferences.js';
import { decorateMechanics, MECHANICS } from './mechanics.js';
import { DELVER_PORTRAITS, ratMerchantPortrait } from './portraits.js';
import { CollectionIndex } from './CollectionIndex.jsx';
import { MARKS, MARK_NAMES, resolveMapIcon, isMarkToken } from './mapIcons.jsx';
import { ENEMY_ICON_STYLES, resolveEnemyIcon } from './enemyIcons.jsx';

/* ---------------- title / class select ---------------- */
const PANEL_TITLES = {
  play: 'Choose your Delver', how: 'How to play', saves: 'Saved descents', settings: 'Settings', daily: 'Daily challenge',
  enemies: 'Enemy index', items: 'Item index', cards: 'Card index', test: 'Undermine test lab',
};

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

export function TitleScreen({ muted, musicOff, preferences, onMutedChange, onMusicOffChange, onPreferenceChange }) {
  const [panel, setPanel] = useState('home');
  const [titleTaps, setTitleTaps] = useState(0);
  const [testUnlocked, setTestUnlocked] = useState(() => {
    try { return sessionStorage.getItem('cryptsweeper.testLab') === 'unlocked'; } catch { return false; }
  });
  const [saveRevision, setSaveRevision] = useState(0);
  const saves = listSaves();
  const auto = saves.find(s => s.slot === 'auto');
  const daily = localDateKey();
  const open = next => setPanel(next);
  const tapTitle = () => {
    if (testUnlocked) { open('test'); return; }
    setTitleTaps(count => {
      const next = count + 1;
      if (next >= 10) {
        try { sessionStorage.setItem('cryptsweeper.testLab', 'unlocked'); } catch { /* private storage */ }
        setTestUnlocked(true); setPanel('test');
        return 10;
      }
      return next;
    });
  };

  return (
    <main className="home-screen">
      <header className="home-hero">
        <p className="eyebrow">Roguelite deckbuilder × minesweeper · v{__APP_VERSION__}</p>
        <h1 className="logo tappable-logo" onClick={tapTitle}>CRYPT<span className="flag">SWEEPER</span></h1>
        {!testUnlocked && titleTaps >= 7 && <p className="test-knock mono">{10 - titleTaps} sealed knock{10 - titleTaps === 1 ? '' : 's'} remain…</p>}
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
          <div className="home-index-grid" aria-label="Collection indexes">
            <button className="home-action compact" onClick={() => open('enemies')}><span>Enemy index</span><small>Encounters, defeats, and custom faces</small></button>
            <button className="home-action compact" onClick={() => open('items')}><span>Item index</span><small>Trinkets and gadgets discovered</small></button>
            <button className="home-action compact" onClick={() => open('cards')}><span>Card index</span><small>Cards seen, obtained, and played</small></button>
          </div>
          {testUnlocked && <button className="home-action test-lab-action" onClick={() => open('test')}><span>Test lab</span><small>Launch encounters, puzzles, scenes, rewards, and combat directly</small></button>}
        </div>
      ) : (
        <section className="home-panel screenpanel">
          <div className="home-panel-head">
            <button className="btn" onClick={() => open('home')}>← Back</button>
            <p className="eyebrow">{PANEL_TITLES[panel]}</p>
          </div>

          {panel === 'play' && <DelverPicker />}
          {panel === 'daily' && <DailyPanel today={daily} />}
          {panel === 'test' && <TestLab />}
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
          {['enemies', 'items', 'cards'].includes(panel) && <CollectionIndex kind={panel} preferences={preferences} onPreferenceChange={onPreferenceChange} />}
          {panel === 'settings' && <div className="settings-list">
            <SettingToggle label="Sound effects" detail="Synthesized combat and interface audio" checked={!muted} onChange={onMutedChange} />
            <SettingToggle label="Music" detail="Generative ambient score that shifts with each screen and depth" checked={!musicOff} onChange={onMusicOffChange} />
            <SettingToggle label="Reduce motion" detail="Disables shakes, floating effects, and decorative animation" checked={preferences.reducedMotion} onChange={() => onPreferenceChange('reducedMotion', !preferences.reducedMotion)} />
            <SettingToggle label="High contrast" detail="Brightens text, borders, and board information" checked={preferences.highContrast} onChange={() => onPreferenceChange('highContrast', !preferences.highContrast)} />
            <SettingToggle label="Large tiles" detail="Increases board tiles where the screen has room" checked={preferences.largeTiles} onChange={() => onPreferenceChange('largeTiles', !preferences.largeTiles)} />
            <SettingToggle label="Large text" detail="Increases interface text without enlarging the board" checked={preferences.largeText} onChange={() => onPreferenceChange('largeText', !preferences.largeText)} />
            <SettingToggle label="Compact cards" detail="Fits more of your hand on narrow phone screens" checked={preferences.compactCards} onChange={() => onPreferenceChange('compactCards', !preferences.compactCards)} />
            <SettingToggle label="Left-handed controls" detail="Moves primary combat actions toward the left edge" checked={preferences.leftHanded} onChange={() => onPreferenceChange('leftHanded', !preferences.leftHanded)} />
            <SettingToggle label="Consistent emoji" detail="Draw all emoji with the bundled Noto artwork so the game looks identical on every device" checked={preferences.notoEmoji} onChange={() => onPreferenceChange('notoEmoji', !preferences.notoEmoji)} />
            <MapIconSettings preferences={preferences} onPreferenceChange={onPreferenceChange} />
            <EnemyIconSettings preferences={preferences} onPreferenceChange={onPreferenceChange} />
            <button className="setting-row setting-link" onClick={() => open('enemies')}>
              <span><b>Enemy faces</b><small>Give any discovered enemy a custom emoji in the Enemy index</small></span>
              <span className="setting-link-arrow" aria-hidden="true">▸</span>
            </button>
            <p className="dim settings-note">Settings are saved automatically in this browser.</p>
          </div>}
        </section>
      )}
    </main>
  );
}

function TestLab() {
  return (
    <div className="test-lab">
      <p className="dim">Developer shortcuts create or reuse a boosted test run. Progress from the lab is autosaved, so use a named save before testing destructive outcomes.</p>

      <section className="test-lab-section">
        <h3>Test run</h3>
        <div className="test-button-grid">
          {Object.entries(CLASSES).map(([key, cls]) => <button className="btn" key={key} onClick={() => testLaunch('reset', key)}>Fresh {cls.name}</button>)}
          <button className="btn primary" onClick={testRefill}>Refill HP, gold, energy, picks</button>
          <button className="btn" onClick={() => testLaunch('map')}>Map</button>
          <button className="btn" onClick={() => testLaunch('shop')}>Shop</button>
          <button className="btn" onClick={() => testLaunch('camp')}>Camp</button>
        </div>
      </section>

      <section className="test-lab-section">
        <h3>Combat and rewards</h3>
        <div className="test-button-grid">
          <button className="btn" onClick={() => testLaunch('combat', 'dig')}>Normal fight</button>
          <button className="btn" onClick={() => testLaunch('combat', 'elite')}>Elite fight</button>
          {[0, 1, 2].map(i => <button className="btn danger" key={i} onClick={() => testLaunch('boss', i)}>Boss · {STRATA[i].name}</button>)}
          {['dig', 'elite', 'boss'].map(kind => <button className="btn" key={kind} onClick={() => testLaunch('reward', kind)}>{kind[0].toUpperCase() + kind.slice(1)} reward</button>)}
          <button className="btn" onClick={() => testLaunch('gameover')}>Game over screen</button>
          <button className="btn" onClick={() => testLaunch('victory')}>Victory screen</button>
        </div>
      </section>

      <section className="test-lab-section">
        <h3>Honest puzzles</h3>
        <div className="test-button-grid">
          {[
            ['mines', '6×6 Mines'], ['mines-medium', '7×7 Mines'], ['mines-hard', '8×8 Mines'],
            ['sudoku', '4×4 Sudoku'], ['sudoku-medium', '6×6 Sudoku'], ['sudoku-hard', '9×9 Sudoku'],
            ['crossword', '3×3 Crossword'], ['crossword-medium', '4×4 Crossword'], ['crossword-hard', '5×5 Crossword'],
            ['sequence-medium', 'Sequence'], ['sequence-hard', 'Hard sequence'],
            ['lights-medium', '3×3 Lights Out'], ['lights-hard', '4×4 Lights Out'], ['nonogram', '5×5 Nonogram'],
          ].map(([key, label]) => <button className="btn" key={key} onClick={() => testLaunch('puzzle', key)}>{label}</button>)}
        </div>
      </section>

      <section className="test-lab-section">
        <h3>Events</h3>
        <div className="test-button-grid event-buttons">
          {Object.entries(EVENT_CATALOG).map(([key, event]) => <button className="btn" key={key} onClick={() => testLaunch('event', key)}>{event.emoji} {event.title}</button>)}
        </div>
      </section>

      <section className="test-lab-section">
        <h3>Cutscenes</h3>
        <div className="test-button-grid">
          {TEST_CUTSCENES.map(([id, label]) => <button className="btn" key={id} onClick={() => testLaunch('cutscene', id)}>{label}</button>)}
        </div>
      </section>
    </div>
  );
}

/* Daily challenge archive: a calendar of every date's seeded crypt. Days show
   whether they were cleared on the actual day, cleared later, or only attempted. */
function DailyPanel({ today: initialToday }) {
  const [selected, setSelected] = useState(initialToday);
  const [view, setView] = useState({ y: Number(initialToday.slice(0, 4)), m: Number(initialToday.slice(5, 7)) - 1 });
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const today = localDateKey(new Date(now)); // live, so midnight rolls the calendar over
  const msLeft = new Date(now).setHours(24, 0, 0, 0) - now;
  const countdown = [Math.floor(msLeft / 3600000), Math.floor(msLeft / 60000) % 60, Math.floor(msLeft / 1000) % 60]
    .map((n, i) => (i ? String(n).padStart(2, '0') : n)).join(':');
  const records = loadDailyRecords();
  const daysIn = new Date(view.y, view.m + 1, 0).getDate();
  const firstDow = new Date(view.y, view.m, 1).getDay();
  const monthLabel = new Date(view.y, view.m, 1).toLocaleString(undefined, { month: 'long', year: 'numeric' });
  const atCurrentMonth = today.startsWith(`${view.y}-${String(view.m + 1).padStart(2, '0')}`);
  const shiftMonth = delta => setView(v => {
    const d = new Date(v.y, v.m + delta, 1);
    return { y: d.getFullYear(), m: d.getMonth() };
  });

  const rec = records[selected];
  const status = !rec?.attempts ? 'Never attempted'
    : rec.won ? (rec.onTime ? '◆ Cleared on the day' : '◆ Cleared from the archive')
      : `Attempted ${rec.attempts}×, never cleared`;

  return <>
    <div className="daily-cal">
      <div className="daily-cal-head">
        <button className="btn" onClick={() => shiftMonth(-1)} aria-label="Previous month">‹</button>
        <b>{monthLabel}</b>
        <button className="btn" onClick={() => shiftMonth(1)} disabled={atCurrentMonth} aria-label="Next month">›</button>
      </div>
      <div className="daily-cal-grid">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <span key={`h${i}`} className="daily-cal-dow">{d}</span>)}
        {Array.from({ length: firstDow }, (_, i) => <span key={`pad${i}`} />)}
        {Array.from({ length: daysIn }, (_, i) => {
          const key = `${view.y}-${String(view.m + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`;
          const r = records[key];
          const state = r?.won ? (r.onTime ? 'won-ontime' : 'won-late') : r?.attempts ? 'tried' : '';
          return (
            <button key={key} disabled={key > today}
              className={`daily-day ${state} ${key === today ? 'today' : ''} ${key === selected ? 'selected' : ''}`}
              onClick={() => setSelected(key)}
              aria-label={`${key}: ${records[key]?.won ? 'cleared' : records[key]?.attempts ? 'attempted' : 'unplayed'}`}>
              <span>{i + 1}</span>
              {r?.won ? <i className="mark">◆</i> : r?.attempts ? <i className="mark">•</i> : null}
            </button>
          );
        })}
      </div>
      <div className="daily-cal-legend">
        <span><i className="chip ontime" />cleared that day</span>
        <span><i className="chip late" />cleared later</span>
        <span><i className="chip tried" />attempted</span>
      </div>
    </div>
    <div className="daily-brief">
      <div className="daily-rune">◆</div>
      <div>
        <h2>{selected}{selected === today ? ' — today' : ''}</h2>
        {selected === today && <p className="daily-countdown">⏳ {countdown} left to clear it on the day</p>}
        <p><b>{status}</b>{rec?.best ? <> · best score {rec.best} ({CLASSES[rec.cls]?.name || rec.cls})</> : null}</p>
        <p>The map, boards, encounters, and rewards use this date's fixed seed. Choose any Delver; retries remain identical for that class.</p>
      </div>
    </div>
    <DelverPicker daily={selected} />
  </>;
}

function MapIconSettings({ preferences, onPreferenceChange }) {
  const styleKey = MAP_ICON_STYLES[preferences.mapIconStyle] ? preferences.mapIconStyle : 'emoji';
  const style = MAP_ICON_STYLES[styleKey];
  const isMarks = styleKey === 'marks';
  const overrides = preferences.mapEmojis || {};
  const marks = preferences.mapMarks || {};
  const hasOverrides = isMarks
    ? Object.keys(marks).length > 0
    : Object.values(overrides).some(v => v?.trim());
  const cycleMark = (type, current) => {
    const next = MARK_NAMES[(MARK_NAMES.indexOf(current) + 1) % MARK_NAMES.length];
    onPreferenceChange('mapMarks', { ...marks, [type]: next });
  };
  return (
    <div className="setting-block">
      <span><b>Map icons</b><small>{isMarks
        ? 'Ten marks drawn for the Undermine — tap a slot to cycle it through the set.'
        : 'Pick a set, or type any emoji into a slot to make it yours.'}</small></span>
      <div className="emoji-style-row" role="radiogroup" aria-label="Map icon set">
        {Object.entries(MAP_ICON_STYLES).map(([key, s]) => (
          <button key={key} type="button" role="radio" aria-checked={styleKey === key}
            className={`emoji-style ${styleKey === key ? 'active' : ''} ${key === 'runes' ? 'runeface' : ''}`}
            onClick={() => onPreferenceChange('mapIconStyle', key)}>
            <span>{resolveMapIcon(s.icons.dig)} {resolveMapIcon(s.icons.elite)} {resolveMapIcon(s.icons.boss)}</span>
            <small>{s.label}</small>
          </button>
        ))}
      </div>
      <div className="emoji-map-grid">
        {NODE_TYPE_LABELS.map(([type, label]) => {
          if (isMarks) {
            const current = MARKS[marks[type]] ? marks[type] : style.icons[type].slice(4);
            return (
              <div key={type} className="emoji-slot">
                <small>{label}</small>
                <button type="button" className="mark-slot" title={`${current} — tap to change`}
                  onClick={() => cycleMark(type, current)}>
                  {MARKS[current]}
                </button>
              </div>
            );
          }
          return (
            <label key={type} className="emoji-slot">
              <small>{label}</small>
              <input type="text" maxLength={8} value={overrides[type] || ''} placeholder={style.icons[type]}
                onChange={e => onPreferenceChange('mapEmojis', { ...overrides, [type]: e.target.value })} />
            </label>
          );
        })}
      </div>
      {hasOverrides && (
        <button className="btn emoji-reset" onClick={() => onPreferenceChange(isMarks ? 'mapMarks' : 'mapEmojis', {})}>
          Reset custom icons
        </button>
      )}
    </div>
  );
}

function EnemyIconSettings({ preferences, onPreferenceChange }) {
  const active = ENEMY_ICON_STYLES[preferences.enemyIconStyle] ? preferences.enemyIconStyle : 'classic';
  const previewKeys = ['grubber', 'ossuary', 'nn99'];
  return (
    <div className="setting-block">
      <span><b>Enemy icons</b><small>How monsters appear in combat and the index. Per-enemy custom faces from the Enemy index always win.</small></span>
      <div className="emoji-style-row" role="radiogroup" aria-label="Enemy icon set">
        {Object.entries(ENEMY_ICON_STYLES).map(([key, s]) => (
          <button key={key} type="button" role="radio" aria-checked={active === key}
            className={`emoji-style ${active === key ? 'active' : ''}`}
            onClick={() => onPreferenceChange('enemyIconStyle', key)}>
            <span>{previewKeys.map(k => (
              <i key={k} className="preview-ico">{resolveEnemyIcon(s.icons[k]) ?? ENEMIES[k].emoji}</i>
            ))}</span>
            <small>{s.label}</small>
          </button>
        ))}
      </div>
    </div>
  );
}

function SettingToggle({ label, detail, checked, onChange }) {
  return <label className="setting-row">
    <span><b>{label}</b><small>{detail}</small></span>
    <input type="checkbox" checked={checked} onChange={onChange} />
  </label>;
}

function HowSection({ icon, title, children, open = false }) {
  return <details className="how-section" open={open}>
    <summary><span>{icon}</span>{title}</summary>
    <div className="how-section-body">{children}</div>
  </details>;
}

function HowToPlay() {
  return <div className="rulebook">
    <div className="rulebook-intro">
      <div className="daily-rune">⛏</div>
      <div><h2>Dig. Read. Survive.</h2><p>Cryptsweeper combines Minesweeper deduction with a turn-based deckbuilder. Open safe ground, use cards to control uncertainty, and defeat every enemy before the crypt buries you.</p></div>
    </div>

    <HowSection icon="◆" title="The run and map" open>
      <ul>
        <li>A run crosses <b>three strata</b>. Each stratum has a branching map and ends with a boss. Boards grow larger, carry more mines, and deal more mine damage at greater depths.</li>
        <li>Choose one connected node at a time: <b>⚔ dig</b> is a normal fight, <b>☠ elite</b> is harder with better loot, <b>▲ camp</b> gives one recovery choice, <b>◈ shop</b> spends Gold, <b>◆ treasure</b> grants loot, <b>? event</b> presents a risk or puzzle, and <b>♛ boss</b> ends the stratum.</li>
        <li>The game autosaves after actions. <b>Home</b> safely leaves the run resumable; named save slots can preserve additional checkpoints.</li>
        <li>The <b>Daily Challenge</b> uses a date-based seed. The map, fights, boards, events, and rewards repeat for that date and Delver.</li>
        <li>Winning, reaching deeper strata, and lifetime achievements unlock additional Delvers. Collection indexes record enemies, items, and cards as you discover them.</li>
      </ul>
    </HowSection>

    <HowSection icon="▦" title="Reading and changing the board" open>
      <ul>
        <li>Tap a hidden tile to <b data-mechanic="reveal">Reveal</b> it. A number counts mines in its eight neighboring spaces. A revealed zero cascades through connected safe tiles.</li>
        <li>Manual digs spend one <b data-mechanic="picks">Pick</b>; a whole cascade still costs one. Picks refill to your Max Picks each turn. Card actions normally do not spend Picks.</li>
        <li>Long-press a hidden tile on touch—or right-click with a mouse—to place a free <b data-mechanic="flag">Flag</b>. A normal flag is only your guess; a verified flag is guaranteed correct.</li>
        <li><b data-mechanic="scan">Scan</b> identifies a tile without opening it. <b data-mechanic="defuse">Defuse</b> safely removes a mine. <b data-mechanic="chord">Chord</b> opens every unflagged neighbor of a number once enough adjacent flags are present.</li>
        <li><b data-mechanic="detonate">Detonate</b> deliberately triggers and removes a mine. Controlled card detonations attack enemies safely unless the card says you take damage.</li>
        <li><b data-mechanic="entomb">Entomb</b> permanently seals a tile and counts it as resolved. Constructs occupy revealed tiles and perform their listed effect each turn.</li>
        <li>Boards may be rectangles, crosses, diamonds, rings, or caverns. Excavate and Annex effects add new ground; Seed and Bury effects can add mines; some bosses destroy whole regions.</li>
      </ul>
      <div className="symbol-grid">
        <span><b>⚑</b> suspected mine</span><span><b>◆</b> scanned safe</span><span><b>☠</b> scanned mine</span>
        <span><b>💣</b> primed mine</span><span><b>▼</b> incoming mine</span><span><b>▦</b> entombed tile</span>
        <span><b>✸</b> spent crater</span><span><b>Glow</b> provably safe</span><span><b>Tint</b> enemy lair</span>
      </div>
    </HowSection>

    <HowSection icon="⚔" title="Combat turns, targeting, and enemies">
      <ul>
        <li>A normal turn begins with <b>3 Energy</b>, a five-card hand, refilled Picks, and visible enemy intents. End Turn discards the remaining hand, activates constructs, then lets every living enemy act.</li>
        <li>The header tracks Health, Gold, Block, Plating, hidden mines, safe tiles, Picks, turn, Energy, draw pile, and discard pile. Tap a tracker to read its explanation.</li>
        <li>Enemy tokens show their face, Health, intent category, and ⌖ target marker. Tap a token to target it and open its full Health, Block, lair, and intent details.</li>
        <li>Card attack labels are <b>⌖ target</b>, <b>✸ random</b>, or <b>☄ all</b>. Choosing a card may ask for one or more eligible board tiles before it resolves.</li>
        <li>Enemy intents are telegraphed. Besides attacking, enemies can gain Block, lay or move mines, fog information, prime tiles, excavate ground, devour regions, or alter the board's numbers.</li>
        <li>Each enemy owns a colored <b data-mechanic="lair">Lair</b>. Revealing a safe lair tile deals its number to the owner, detonating a lair mine deals 10, and Entombing a lair tile deals 3. Killing the owner crumbles its lair safely open.</li>
        <li>Some enemies are buried or gated and cannot be damaged until their stated condition is met. Bosses have unique rules and may change phases.</li>
      </ul>
    </HowSection>

    <HowSection icon="❤" title="Damage, defenses, and clearing">
      <ul>
        <li>Enemy attacks remove <b data-mechanic="block">Block</b> before Health. Block normally resets at your next turn; the Warden retains a quarter.</li>
        <li><b data-mechanic="plating">Plating</b> persists between turns and absorbs uncontrolled mine damage. Mine damage bypasses Block. Its value rises in deeper strata.</li>
        <li><b data-mechanic="instinct">Instinct</b> prevents the first accidentally revealed mine in a combat by verified-flagging it instead. Some Delvers or items modify this safety net.</li>
        <li>A <b data-mechanic="full clear">Full Clear</b> resolves every safe tile. The board collapses for <b>50 damage to all enemies</b>, grants an upgraded card reward, and re-seals if anything survives.</li>
        <li>A Full Clear is powerful but does not itself win combat: every enemy must be killed. Reaching zero Health ends the run.</li>
      </ul>
    </HowSection>

    <HowSection icon="🃏" title="Cards, piles, and upgrades">
      <ul>
        <li>Press <b>Show Cards</b> to open your hand. A card's gem is its Energy cost; dim cards are unaffordable or currently unplayable.</li>
        <li><b>Attack</b> cards deal damage, <b>Skill</b> cards provide utility or defense, and <b data-mechanic="power">Power</b> cards create a combat-long effect.</li>
        <li>Played cards normally enter the discard pile. When the draw pile empties, discard is shuffled into a new draw pile. <b data-mechanic="exhaust">Exhausted</b> cards stay out for the rest of combat.</li>
        <li>Card rewards may be skipped. Upgrading a card improves its green-highlighted values; upgraded cards show a <b>+</b>. Removal permanently thins the run's deck and becomes more expensive each time.</li>
        <li>Curses are harmful cards or run modifiers. They can be removed like other cards when a removal service is available.</li>
      </ul>
    </HowSection>

    <HowSection icon="🎒" title="Gold, rewards, items, camps, and shops">
      <ul>
        <li>Combat rewards include Gold and a card choice. Elites can award trinkets, ordinary fights can find gadgets, and bosses offer boss relics before the next stratum.</li>
        <li><b>Trinkets</b> are passive and last for the run. <b>Gadgets</b> are consumable tools; you can carry at most three gadget copies. Tap the bag to inspect all items and use gadgets.</li>
        <li>Shops sell cards, trinkets, gadgets, and card removal. Gold is run-specific and prices vary; each removal raises the next removal cost.</li>
        <li>At camp, choose one: Rest heals 30% max Health, Smith upgrades a card, Survey starts the next fight 25% revealed, or Train adds one Max Pick up to the run's +2 training cap.</li>
        <li><b>Honest Puzzles</b> begin with no-guess Minesweeper, 4×4 Sudoku, and 3×3 word squares. Deeper strata unlock larger versions plus number sequences, Lights Out, and nonograms. Minesweeper offers limited scans and flags; other puzzles explain their controls in the room. Solve flawlessly for an upgrade, or abandon without the prize.</li>
      </ul>
    </HowSection>

    <HowSection icon="⛏" title="Delvers and passives">
      <div className="delver-rules">
        {Object.entries(CLASSES).map(([key, cls]) => <article key={key}>
          <b>{cls.name}</b><small>{cls.role}</small>
          <p dangerouslySetInnerHTML={{ __html: decorateMechanics(cls.passive) }} />
        </article>)}
      </div>
    </HowSection>

    <HowSection icon="☝" title="Touch and keyboard controls">
      <div className="controls-grid">
        <p><kbd>Tap</kbd><span>Reveal, select, or activate</span></p><p><kbd>Hold</kbd><span>Flag a hidden tile</span></p>
        <p><kbd>Enemy</kbd><span>Target and inspect</span></p><p><kbd>Tracker</kbd><span>Explain a stat</span></p>
        <p><kbd>Back</kbd><span>Close the top layer</span></p><p><kbd>Right click</kbd><span>Flag with a mouse</span></p>
        <p><kbd>E</kbd><span>End the combat turn</span></p><p><kbd>Esc</kbd><span>Cancel or close</span></p>
      </div>
    </HowSection>

    <HowSection icon="?" title="Complete mechanic glossary">
      <p className="dim">Every named mechanic used by cards and the HUD is listed here. Tap a term for related rules.</p>
      <div className="glossary-grid">
        {Object.entries(MECHANICS).map(([key, entry]) => <article key={key}>
          <button type="button" data-mechanic={key}>{entry.name}</button><p>{entry.summary}</p>
        </article>)}
      </div>
    </HowSection>
  </div>;
}

/* ---------------- map ---------------- */
/* Emoji artwork is drawn by the device's emoji font, so the exact look follows
   the platform; the "Carved runes" set keeps the original monochrome glyphs. */
/* Ten selectable map sets. Every node type has its own unique icon in each set. */
export const MAP_ICON_STYLES = {
  emoji: { label: 'Emoji', icons: { dig: '⚔️', elite: '☠️', event: '🔮', shop: '🛒', treasure: '💰', camp: '🏕️', boss: '👑' } },
  crypt: { label: 'Graveyard', icons: { dig: '⛏️', elite: '🧟', event: '🦇', shop: '🐀', treasure: '⚱️', camp: '🕯️', boss: '😈' } },
  marks: { label: "Delver's Marks", icons: { dig: 'svg:picks', elite: 'svg:fangskull', event: 'svg:eye', shop: 'svg:scales', treasure: 'svg:gem', camp: 'svg:fire', boss: 'svg:crown' } },
  runes: { label: 'Carved runes', icons: { dig: '⚔︎', elite: '☠︎', event: '?', shop: '◈', treasure: '◆', camp: '▲', boss: '♛' } },
  dungeon: { label: 'Dungeon', icons: { dig: '🗡️', elite: '👹', event: '🎲', shop: '🧙', treasure: '🏆', camp: '⛺', boss: '🐉' } },
  deepwild: { label: 'Deep wild', icons: { dig: '🪓', elite: '🦂', event: '🍄', shop: '🐌', treasure: '💎', camp: '🌙', boss: '🕷️' } },
  sunken: { label: 'Sunken', icons: { dig: '🤿', elite: '🦈', event: '🐚', shop: '🦀', treasure: '🪙', camp: '🏮', boss: '🐙' } },
  arcane: { label: 'Arcane', icons: { dig: '🪄', elite: '🧛', event: '✨', shop: '🧿', treasure: '📜', camp: '🌛', boss: '🧞' } },
  gearworks: { label: 'Gearworks', icons: { dig: '🔧', elite: '🤖', event: '🎰', shop: '⚖️', treasure: '🔋', camp: '🔌', boss: '🛸' } },
  beasts: { label: 'Beasts', icons: { dig: '🐾', elite: '🐺', event: '🦉', shop: '🦝', treasure: '🥚', camp: '🐈‍⬛', boss: '🐻' } },
};
const NODE_TYPE_LABELS = [
  ['dig', 'Dig'], ['elite', 'Elite'], ['event', 'Event'], ['shop', 'Shop'],
  ['treasure', 'Treasure'], ['camp', 'Camp'], ['boss', 'Boss'],
];
function mapIcons(prefs) {
  const styleKey = MAP_ICON_STYLES[prefs?.mapIconStyle] ? prefs.mapIconStyle : 'emoji';
  const icons = { ...MAP_ICON_STYLES[styleKey].icons };
  if (styleKey === 'marks') {
    for (const [type, name] of Object.entries(prefs?.mapMarks || {})) {
      if (MARKS[name]) icons[type] = `svg:${name}`;
    }
  }
  for (const [type, glyph] of Object.entries(prefs?.mapEmojis || {})) {
    if (typeof glyph === 'string' && glyph.trim()) icons[type] = glyph.trim();
  }
  return icons;
}

export function MapScreen() {
  const m = run.map;
  const prefs = loadPreferences();
  const icons = mapIcons(prefs);
  const iconClass = type => {
    if (isMarkToken(icons[type])) return 'svgmark';
    if (prefs.mapIconStyle !== 'runes' || Boolean(prefs.mapEmojis?.[type]?.trim())) return 'emoji';
    return '';
  };
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
      <div className="mapwrap" style={{ height: `calc(var(--map-row) * ${MAP_ROWS})`, '--map-rows': MAP_ROWS }}>
        <svg viewBox={`0 0 100 ${MAP_ROWS}`} preserveAspectRatio="none">{lines}</svg>
        {m.nodes.map((row, r) => (
          <div key={r} className="maprow" style={{ '--row': r }}>
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
                  <span className={`mapicon ${iconClass(type)}`} aria-hidden="true">{resolveMapIcon(icons[type])}</span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <p className="maplegend">
        {NODE_TYPE_LABELS.map(([t, label], i) => (
          <span key={t} className="legend-item">{i > 0 && ' · '}{resolveMapIcon(icons[t])} {label.toLowerCase()}</span>
        ))}
      </p>
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
  const [shelf, setShelf] = useState('items');
  const [selectedItem, setSelectedItem] = useState(() => {
    const trinket = s.trinkets.findIndex(item => !item.sold);
    if (trinket >= 0) return `trinket:${trinket}`;
    const gadget = s.gadgets.findIndex(item => !item.sold);
    return gadget >= 0 ? `gadget:${gadget}` : null;
  });
  const [selectedCard, setSelectedCard] = useState(() => s.cards.findIndex(item => !item.sold));
  const items = [
    ...s.trinkets.map((item, index) => ({ ...item, index, kind: 'trinket', def: TRINKETS[item.key] })),
    ...s.gadgets.map((item, index) => ({ ...item, index, kind: 'gadget', def: GADGETS[item.key] })),
  ];
  const selected = selectedItem == null ? null : items.find(item => `${item.kind}:${item.index}` === selectedItem);
  const remainingCards = s.cards.filter(item => !item.sold).length;
  const remainingItems = items.filter(item => !item.sold).length;
  const cardOffer = selectedCard >= 0 ? s.cards[selectedCard] : null;
  const buySelected = () => {
    if (!selected || selected.sold) return;
    if (selected.kind === 'trinket') buyShopTrinket(selected.index);
    else buyShopGadget(selected.index);
  };
  const buySelectedCard = () => {
    if (!cardOffer || cardOffer.sold || run.gold < cardOffer.price) return;
    buyShopCard(selectedCard);
    const next = s.cards.findIndex((item, index) => index !== selectedCard && !item.sold);
    if (next >= 0) setSelectedCard(next);
  };
  const moveSelectedCard = direction => {
    if (!s.cards.length) return;
    let next = selectedCard < 0 ? 0 : selectedCard;
    for (let tries = 0; tries < s.cards.length; tries++) {
      next = (next + direction + s.cards.length) % s.cards.length;
      if (!s.cards[next].sold) { setSelectedCard(next); return; }
    }
  };
  let quickBuy = null;
  if (shelf === 'items' && selected) {
    const disabled = selected.sold || run.gold < selected.price || (selected.kind === 'gadget' && run.gadgets.length >= 3);
    const label = selected.sold ? 'Sold'
      : run.gold < selected.price ? `Need ${selected.price - run.gold}g`
        : selected.kind === 'gadget' && run.gadgets.length >= 3 ? 'Slots full' : `Buy · ${selected.price}g`;
    quickBuy = { disabled, label, action: buySelected };
  } else if (shelf === 'cards' && cardOffer) {
    const disabled = cardOffer.sold || run.gold < cardOffer.price;
    const label = cardOffer.sold ? 'Sold' : run.gold < cardOffer.price ? `Need ${cardOffer.price - run.gold}g` : `Buy card · ${cardOffer.price}g`;
    quickBuy = { disabled, label, action: buySelectedCard };
  }
  return (
    <>
      <TopBar />
      <main className="screenpanel shop-screen">
        <header className="shop-merchant">
          <img src={ratMerchantPortrait} alt="The Rat Merchant" />
          <div><p className="eyebrow">The Rat Merchant</p><h2>Wares from deeper tunnels</h2><p>“Dig gold, spend gold, eh?”</p></div>
          <div className="shop-purse"><small>Your purse</small><b>◈ {run.gold}g</b></div>
        </header>

        <nav className="shop-shelves" aria-label="Shop shelves">
          <button className={shelf === 'items' ? 'active' : ''} onClick={() => setShelf('items')}>
            <span>🎒</span><b>Items</b><small>{remainingItems} left</small>
          </button>
          <button className={shelf === 'cards' ? 'active' : ''} onClick={() => setShelf('cards')}>
            <span>🃏</span><b>Show cards</b><small>{remainingCards} left</small>
          </button>
          <button className={shelf === 'services' ? 'active' : ''} onClick={() => setShelf('services')}>
            <span>✂</span><b>Services</b><small>Deck work</small>
          </button>
        </nav>

        {shelf === 'items' && <section className="shop-shelf-panel">
          <div className="shop-section-head"><div><h3>Items</h3><p>Tap an icon to inspect it.</p></div><span>{run.gadgets.length}/3 gadget slots</span></div>
          <div className="shop-item-tokens">
            {items.map(item => {
              const id = `${item.kind}:${item.index}`;
              return <button key={id} disabled={item.sold} className={`shop-item-token ${selectedItem === id ? 'selected' : ''} ${run.gold < item.price ? 'too-pricey' : ''}`}
                onClick={() => setSelectedItem(id)} aria-label={`${item.def.name}, ${item.price} gold`}>
                <span>{item.def.emoji}</span><b>{item.price}g</b><small>{item.kind}</small>{item.sold && <i>Sold</i>}
              </button>;
            })}
          </div>
          {selected ? <article className={`shop-item-detail ${selected.sold ? 'sold' : ''}`}>
            <div className="shop-detail-icon">{selected.def.emoji}</div>
            <div><small>{selected.kind}</small><h3>{selected.def.name}</h3><p>{selected.def.desc}</p></div>
            <button className="btn primary" disabled={selected.sold || run.gold < selected.price || (selected.kind === 'gadget' && run.gadgets.length >= 3)} onClick={buySelected}>
              {selected.sold ? 'Sold' : run.gold < selected.price ? `Need ${selected.price - run.gold}g` : selected.kind === 'gadget' && run.gadgets.length >= 3 ? 'Gadget slots full' : `Buy · ${selected.price}g`}
            </button>
          </article> : <div className="shop-empty-detail">Select an item to see its effect and price.</div>}
        </section>}

        {shelf === 'cards' && <section className="shop-shelf-panel">
          <div className="shop-section-head"><div><h3>Cards</h3><p>Choose a card to inspect it before buying.</p></div><span>Deck: {run.deck.length}</span></div>
          <div className="shop-card-tabs" role="list" aria-label="Cards for sale">
            {s.cards.map((it, i) => <button type="button" role="listitem" key={i} disabled={it.sold}
              className={`${selectedCard === i ? 'selected' : ''} ${run.gold < it.price ? 'too-pricey' : ''}`}
              onClick={() => setSelectedCard(i)}>
              <span>{CARDS[it.key].name}</span><b>{it.sold ? 'SOLD' : `${it.price}g`}</b>
            </button>)}
          </div>
          <div className="shop-card-browser" aria-label="Card navigation">
            <button type="button" className="btn" disabled={remainingCards <= 1} onClick={() => moveSelectedCard(-1)} aria-label="Previous card">‹</button>
            <span>{selectedCard >= 0 ? `${selectedCard + 1} / ${s.cards.length}` : 'No cards'}</span>
            <button type="button" className="btn" disabled={remainingCards <= 1} onClick={() => moveSelectedCard(1)} aria-label="Next card">›</button>
          </div>
          {cardOffer ? <div className={`shop-card-feature ${cardOffer.sold ? 'sold' : ''}`}>
            <CardView card={{ id: selectedCard, key: cardOffer.key, up: 0 }} />
            <div className="shop-card-buy">
              <div><small>Card for sale</small><b>{CARDS[cardOffer.key].name}</b><span>Permanent addition to this run’s deck.</span></div>
              <button className="btn primary" disabled={cardOffer.sold || run.gold < cardOffer.price} onClick={buySelectedCard}>
                {cardOffer.sold ? 'Sold' : run.gold < cardOffer.price ? `Need ${cardOffer.price - run.gold}g` : `Buy · ${cardOffer.price}g`}
              </button>
            </div>
          </div> : <div className="shop-empty-detail">The merchant has no cards left.</div>}
        </section>}

        {shelf === 'services' && <section className="shop-shelf-panel">
          <div className="shop-section-head"><div><h3>Services</h3><p>Permanent work on this run’s deck.</p></div><span>{run.deck.length} cards</span></div>
          <article className="shop-service">
            <span>✂</span><div><h3>Remove a card</h3><p>Choose one card to remove permanently. Each removal costs 25g more than the last.</p></div>
            <button className="btn" disabled={run.gold < run.removalCost} onClick={buyRemoval}>{run.gold < run.removalCost ? `Need ${run.removalCost - run.gold}g` : `Remove · ${run.removalCost}g`}</button>
          </article>
        </section>}

        <div className="shop-footer">
          <span>{remainingCards + remainingItems} wares remain</span>
          {quickBuy && <button className="btn primary shop-footer-buy" disabled={quickBuy.disabled} onClick={quickBuy.action}>{quickBuy.label}</button>}
          <button className="btn primary" onClick={gotoMap}>Leave shop ▸</button>
        </div>
      </main>
    </>
  );
}

/* ---------------- events ---------------- */
export function EventScreen() {
  const event = EVENT_CATALOG[run.event] || EVENT_CATALOG.corpse;
  return (
    <>
      <TopBar />
      <div className="screenpanel">
        <h2>{event.emoji} {event.title}</h2>
        <p>{event.text}</p>
        <div className="choicelist">
          {event.choices.map(choice => <button type="button" className="choice" key={choice.key} onClick={() => eventChoice(choice.key)}>
            <span className="cname">{choice.label}</span>
            <span className="cdesc">{choice.desc}</span>
          </button>)}
        </div>
      </div>
    </>
  );
}

/* ---------------- puzzle ---------------- */
export function PuzzleScreen() {
  const p = run.puzzle;
  const type = p.type || 'mines';
  const descriptions = {
    mines: 'A no-guess Minesweeper engraving: every safe tile is provable from the opening.',
    sudoku: `Fill every row, column, and outlined ${p.boxRows}×${p.boxCols} box with 1–${p.size} exactly once.`,
    crossword: `Fill the ${p.size}×${p.size} word square. Every answer works both across and down.`,
    sequence: 'Read the changing gaps or operations and choose the only value that continues the sequence.',
    lights: 'Tap a rune to flip it and its orthogonal neighbors. Extinguish every rune.',
    nonogram: 'Fill cells so each row and column matches its ordered run-length clues.',
  };
  return (
    <>
      <TopBar />
      <div className="screenpanel" style={{ maxWidth: 640 }}>
        <h2>🧩 An Honest Puzzle</h2>
        <p className="dim">{descriptions[type]} No enemy and no turn limit. Solve it flawlessly for a card upgrade.</p>

        {type === 'mines' && <>
          <div style={{ display: 'flex', justifyContent: 'center' }}><BoardView mode="puzzle" /></div>
          <div className="boardinfo" style={{ justifyContent: 'center' }}>
            <button className="btn" disabled={!p.scans} onClick={togglePuzzleScan}
              style={p.scanMode ? { borderColor: 'var(--n2)', color: 'var(--n2)' } : undefined}>
              🔎 Scan ({p.scans} left)
            </button>
          </div>
        </>}

        {type === 'sudoku' && <div className="logic-puzzle-wrap">
          <div className={`sudoku-grid size-${p.size}`} style={{ '--logic-size': p.size }} aria-label={`${p.size} by ${p.size} Sudoku`}>
            {p.values.map((value, i) => {
              const given = p.givens.includes(i);
              const row = Math.floor(i / p.size), col = i % p.size;
              const edge = {
                borderRight: col < p.size - 1 && (col + 1) % p.boxCols === 0 ? '3px solid var(--bone-dim)' : undefined,
                borderBottom: row < p.size - 1 && (row + 1) % p.boxRows === 0 ? '3px solid var(--bone-dim)' : undefined,
              };
              return <input key={i} style={edge} className={`logic-cell ${given ? 'given' : ''}`} aria-label={`Row ${row + 1}, column ${col + 1}`}
                inputMode="numeric" maxLength={1} readOnly={given} value={value || ''}
                onChange={e => setLogicPuzzleCell(i, e.target.value.replace(new RegExp(`[^1-${p.size}]`, 'g'), ''))} />;
            })}
          </div>
          {!p.failed && !p.solved && <button className="btn primary" onClick={checkLogicPuzzle}>Check Sudoku</button>}
        </div>}

        {type === 'crossword' && <div className="logic-puzzle-wrap crossword-layout">
          <div className="crossword-grid" style={{ '--logic-size': p.size }} aria-label={`${p.size} by ${p.size} mini crossword`}>
            {p.values.map((value, i) => <label className="crossword-cell" key={i}>
              {(i < p.size || i % p.size === 0) && <small>{i + 1}</small>}
              <input aria-label={`Crossword square ${i + 1}`} autoCapitalize="characters" maxLength={1} value={value}
                onChange={e => setLogicPuzzleCell(i, e.target.value)} />
            </label>)}
          </div>
          <div className="crossword-clues">
            <div><h3>Across</h3>{p.clues.map((clue, i) => <p key={i}><b>{i * p.size + 1}.</b> {clue}</p>)}</div>
            <div><h3>Down</h3>{p.clues.map((clue, i) => <p key={i}><b>{i + 1}.</b> {clue}</p>)}</div>
          </div>
          {!p.failed && !p.solved && <button className="btn primary" onClick={checkLogicPuzzle}>Check crossword</button>}
        </div>}

        {type === 'sequence' && <div className="logic-puzzle-wrap sequence-puzzle">
          <div className="sequence-runes">{p.prompt}</div>
          <div className="sequence-choices">{p.choices.map(value => <button className="btn" key={value} onClick={() => answerSequence(value)}>{value}</button>)}</div>
        </div>}

        {type === 'lights' && <div className="logic-puzzle-wrap">
          <div className="lights-grid" style={{ '--logic-size': p.size }} aria-label={`${p.size} by ${p.size} Lights Out board`}>
            {p.values.map((value, i) => <button key={i} className={value ? 'on' : ''} onClick={() => toggleLightsCell(i)} aria-label={`Rune ${i + 1}, ${value ? 'lit' : 'dark'}`}>{value ? '◆' : '·'}</button>)}
          </div>
          <p className="dim mono">Moves: {p.moves}</p>
        </div>}

        {type === 'nonogram' && <div className="logic-puzzle-wrap nonogram-puzzle">
          <div className="nonogram-board" style={{ '--logic-size': p.size }}>
            <div className="nonogram-corner" />
            <div className="nonogram-col-clues">{p.colClues.map((clue, i) => <span key={i}>{clue.join(' ')}</span>)}</div>
            <div className="nonogram-row-clues">{p.rowClues.map((clue, i) => <span key={i}>{clue.join(' ')}</span>)}</div>
            <div className="nonogram-grid">{p.values.map((value, i) => <button key={i} className={value ? 'filled' : ''} onClick={() => toggleNonogramCell(i)} aria-label={`Nonogram cell ${i + 1}, ${value ? 'filled' : 'empty'}`} />)}</div>
          </div>
          {!p.failed && !p.solved && <button className="btn primary" onClick={checkLogicPuzzle}>Check nonogram</button>}
        </div>}

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
