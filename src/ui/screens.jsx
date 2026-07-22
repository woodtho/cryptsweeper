import { useEffect, useRef, useState } from 'react';
import { CLASSES, CARDS, TRINKETS, GADGETS, STRATA, ENEMIES } from '../engine/data.js';
import {
  run, ui, MAP_ROWS, newRun, reachableNodes, mapClosure, enterNode, score, resetToTitle,
  takeRewardCard, takeRewardTrinket, takeBossTrinket, takeRewardGadget, finishReward,
  campHeal, campUpgrade, campSurvey, campTrainPicks, basePicksFor,
  buyShopCard, buyShopTrinket, buyShopGadget, buyRemoval, gotoMap,
  EVENT_CATALOG, eventChoice, togglePuzzleScan, setLogicPuzzleCell, checkLogicPuzzle,
  toggleLightsCell, toggleNonogramCell, toggleSudokuNoteMode, answerSequence,
  currentEventView,
  listSaves, loadRun, saveRun, deleteSave, goHome,
} from '../engine/engine.js';
import { TopBar } from './TopBar.jsx';
import { CardView } from './CardView.jsx';
import { BoardView } from './BoardView.jsx';
import { UNLOCKS, isDelverUnlocked, loadProgression } from '../engine/progression.js';
import {
  TRACKS, previewTrack, stopPreview, previewingTrackId,
  isMusicPaused, setMusicPaused, restartMusic, isMusicLooping, setMusicLooping,
  getInfiniteMusicParams, setInfiniteMusicParam,
} from '../engine/music.js';
import { localDateKey, loadDailyRecords } from '../engine/daily.js';
import { loadPreferences } from '../engine/preferences.js';
import { decorateMechanics, MECHANICS } from './mechanics.js';
import { delverPortrait, ratMerchantPortrait } from './portraits.js';
import { CollectionIndex } from './CollectionIndex.jsx';
import { MARKS, MARK_NAMES, MAP_ICON_STYLES, resolveMapIcon, isMarkToken } from './mapIcons.jsx';
import { ENEMY_ICON_STYLES, getEnemyIconStyles, resolveEnemyIcon } from './enemyIcons.jsx';
import { itemVector, campVector } from './themedIcons.jsx';
import { ART_STYLE_LABELS, getArtStyleKeys, GameIcon, INTERFACE_ICON_CATEGORIES, interfaceIcon, interfaceIconForStyle } from './gameIcons.jsx';
import { TEST_LAB_SECTIONS, runTestCase, testCasesForSection } from './testCatalog.js';
import { customIconSets, customSetBase, customSetIcon, iconSetLabel } from './iconSets.js';
import { registerBackHandler } from './backNav.js';
import { FullArtViewer } from './FullArtViewer.jsx';
import { gridNavigationIndex } from '../engine/puzzleValidation.js';
import { ACHIEVEMENTS, CHALLENGES, clearGraveyard, loadAchievements, loadGraveyard } from '../engine/legacy.js';

/* ---------------- title / class select ---------------- */
const PANEL_TITLES = {
  play: 'Choose your Delver', how: 'How to play', saves: 'Saved descents', settings: 'Settings', daily: 'Daily challenge',
  delvers: 'Delver index', enemies: 'Enemy index', items: 'Item index', cards: 'Card index', test: 'Undermine test lab',
  music: 'The crypt jukebox',
  graveyard: 'The Delver Graveyard', achievements: 'Carved achievements', challenges: 'Challenge descents',
};

function DelverPicker({ daily = null, challenge = null }) {
  const progress = loadProgression();
  const prefs = loadPreferences();
  const [fullArt, setFullArt] = useState(null);
  return (
    <>
      <div className="classgrid">
        {Object.entries(CLASSES).map(([k, c]) => {
          const earned = isDelverUnlocked(k, progress);
          const locked = !earned;
          const portrait = delverPortrait(k);
          return (
          <article key={k} className={`classcard ${locked ? 'locked' : ''}`}>
            <button type="button" className="delver-art" onClick={() => setFullArt({ src: portrait, title: c.name })}
              aria-haspopup="dialog" aria-label={`View full artwork for ${c.name}`}>
              <img src={portrait} alt={`${c.name} portrait`} />
              <span className="art-expand-hint">Full art</span>
            </button>
            <button type="button" className="delver-select" disabled={!earned}
              onClick={() => newRun(k, { ...(daily ? { daily } : {}), ...(challenge ? { challenge } : {}) })}>
              <div className="delver-body">
                <h3>{c.name}</h3>
                <div className="role">{c.role}</div>
                <div className="hp"><GameIcon name="health" preferences={prefs} /> {c.hp} HP · <GameIcon name="picks" preferences={prefs} /> {c.picks} Picks</div>
                <p>{c.blurb}</p>
                <div className="passive" dangerouslySetInnerHTML={{ __html: decorateMechanics(c.passive) }} />
              </div>
              <div className="trink">
                Starts with: <span className="inline-vector-icon">{itemVector(c.trinket, prefs)}</span> <b>{TRINKETS[c.trinket].name}</b> — {TRINKETS[c.trinket].desc}
              </div>
              {!earned && <div className="unlock-rule"><b>LOCKED</b><span>{UNLOCKS[k].label}</span></div>}
            </button>
          </article>
        );})}
      </div>
      {fullArt && <FullArtViewer src={fullArt.src} alt={`${fullArt.title} full portrait`} title={fullArt.title} onClose={() => setFullArt(null)} />}
    </>
  );
}

export function TitleScreen({
  muted, musicOff, sfxLevel, musicLevel, hapticsOn, preferences,
  onMutedChange, onMusicOffChange, onSfxLevelChange, onMusicLevelChange,
  onHapticsChange, onPreferenceChange, onTestAll, onTestSection,
}) {
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
  // hardware back / Escape returns a sub-panel to the main menu instead of exiting
  useEffect(() => {
    if (panel === 'home') return undefined;
    return registerBackHandler(() => { setPanel('home'); return true; });
  }, [panel]);
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
            <button className="home-action compact" onClick={() => open('music')}><span>Jukebox</span><small>Play the music you've unlocked</small></button>
            <button className="home-action compact" onClick={() => open('challenges')}><span>Challenges</span><small>Descend under harsher rules</small></button>
            <button className="home-action compact" onClick={() => open('graveyard')}><span>Graveyard</span><small>Remember completed and fallen builds</small></button>
          </div>
          <div className="home-index-grid" aria-label="Collection indexes">
            <button className="home-action compact" onClick={() => open('delvers')}><span>Delver index</span><small>Runs, wins, depth, and lifetime stats</small></button>
            <button className="home-action compact" onClick={() => open('enemies')}><span>Enemy index</span><small>Encounters, defeats, and custom faces</small></button>
            <button className="home-action compact" onClick={() => open('items')}><span>Item index</span><small>Trinkets and gadgets discovered</small></button>
            <button className="home-action compact" onClick={() => open('cards')}><span>Card index</span><small>Cards seen, obtained, and played</small></button>
            <button className="home-action compact" onClick={() => open('achievements')}><span>Achievements</span><small>Carvings earned across every descent</small></button>
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
          {panel === 'music' && <JukeboxPanel musicOff={musicOff} musicLevel={musicLevel}
            onMusicOffChange={onMusicOffChange} onMusicLevelChange={onMusicLevelChange} />}
          {panel === 'daily' && <DailyPanel today={daily} />}
          {panel === 'challenges' && <ChallengePanel />}
          {panel === 'graveyard' && <GraveyardPanel />}
          {panel === 'achievements' && <AchievementPanel />}
          {panel === 'test' && <TestLab onTestAll={onTestAll} onTestSection={onTestSection} />}
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
          {['delvers', 'enemies', 'items', 'cards'].includes(panel) && <CollectionIndex kind={panel} preferences={preferences} onPreferenceChange={onPreferenceChange} />}
          {panel === 'settings' && <div className="settings-list">
            <SettingToggle label="Sound effects" detail="Synthesized combat and interface audio" checked={!muted} onChange={onMutedChange} />
            <SettingSlider label="SFX volume" value={sfxLevel} onChange={onSfxLevelChange} />
            <SettingToggle label="Music" detail="Recorded soundtrack with an adaptive crypt ambience" checked={!musicOff} onChange={onMusicOffChange} />
            <SettingSlider label="Music volume" value={musicLevel} onChange={onMusicLevelChange} />
            <SettingToggle label="Haptics" detail="Touch feedback for digging, flags, damage, mines, and victory" checked={hapticsOn} onChange={onHapticsChange} />
            <InfiniteJukeboxControls />
            <SettingToggle label="Reduce motion" detail="Disables shakes, floating effects, and decorative animation" checked={preferences.reducedMotion} onChange={() => onPreferenceChange('reducedMotion', !preferences.reducedMotion)} />
            <SettingToggle label="High contrast" detail="Brightens text, borders, and board information" checked={preferences.highContrast} onChange={() => onPreferenceChange('highContrast', !preferences.highContrast)} />
            <SettingToggle label="Large tiles" detail="Increases board tiles where the screen has room" checked={preferences.largeTiles} onChange={() => onPreferenceChange('largeTiles', !preferences.largeTiles)} />
            <SettingToggle label="Large text" detail="Increases interface text without enlarging the board" checked={preferences.largeText} onChange={() => onPreferenceChange('largeText', !preferences.largeText)} />
            <SettingToggle label="Compact cards" detail="Fits more of your hand on narrow phone screens" checked={preferences.compactCards} onChange={() => onPreferenceChange('compactCards', !preferences.compactCards)} />
            <SettingToggle label="Left-handed controls" detail="Moves primary combat actions toward the left edge" checked={preferences.leftHanded} onChange={() => onPreferenceChange('leftHanded', !preferences.leftHanded)} />
            <SettingToggle label="Consistent emoji" detail="Draw all emoji with the bundled Noto artwork so the game looks identical on every device" checked={preferences.notoEmoji} onChange={() => onPreferenceChange('notoEmoji', !preferences.notoEmoji)} />
            <MapIconSettings preferences={preferences} onPreferenceChange={onPreferenceChange} />
            <EnemyIconSettings preferences={preferences} onPreferenceChange={onPreferenceChange} />
            <InterfaceIconSettings preferences={preferences} onPreferenceChange={onPreferenceChange} />
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

function TestLab({ onTestAll, onTestSection }) {
  return (
    <div className="test-lab">
      <p className="dim">Developer shortcuts create or reuse a boosted test run. Progress from the lab is autosaved, so use a named save before testing destructive outcomes.</p>
      <button className="home-action primary test-all-button" onClick={onTestAll}>
        <span>Test all</span><small>Walk through every target in every section with persistent Previous and Next controls</small>
      </button>
      {TEST_LAB_SECTIONS.map(section => <section className="test-lab-section" key={section.label}>
        <div className="test-lab-section-head">
          <h3>{section.label}</h3>
          <button className="btn primary" onClick={() => onTestSection(testCasesForSection(section))}>{section.testAllLabel}</button>
        </div>
        <div className={`test-button-grid ${section.eventButtons ? 'event-buttons' : ''}`}>
          {section.entries.map(item => <button className={`btn ${item.tone}`} key={`${item.kind}:${item.value ?? ''}`} onClick={() => runTestCase(item)}>
            {section.eventButtons && <GameIcon name="event" />} {item.label}
          </button>)}
        </div>
      </section>)}
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

export function MapIconSettings({ preferences, onPreferenceChange }) {
  const styles = mapIconStyles(preferences);
  const styleKey = styles[preferences.mapIconStyle] ? preferences.mapIconStyle : 'main';
  const style = styles[styleKey];
  const isMixer = styleKey === 'mixer';
  const isMarks = Object.values(style.icons).every(isMarkToken);
  const marks = preferences.mapMarks || {};
  const cycleMark = (type, current) => {
    const next = MARK_NAMES[(MARK_NAMES.indexOf(current) + 1) % MARK_NAMES.length];
    onPreferenceChange('mapMarks', { ...marks, [type]: next });
  };
  const mix = preferences.mapIconMix || {};
  const cycleMixed = type => {
    const keys = getArtStyleKeys(preferences);
    const current = keys.indexOf(mix[type]?.style || 'emoji');
    const next = keys[(current + 1) % keys.length];
    onPreferenceChange('mapIconMix', { ...mix, [type]: { ...mix[type], style: next, custom: '' } });
  };
  return (
    <div className="setting-block">
      <span><b>Map icons</b><small>{isMarks
        ? 'Custom vector artwork — tap a slot to choose another drawn mark.'
        : 'Pick an artwork set, use Mix & Match, or add a WebP/SVG atlas.'}</small></span>
      <div className="emoji-style-row" role="radiogroup" aria-label="Map icon set">
        {Object.entries(styles).sort(([a], [b]) => a === 'main' ? -1 : b === 'main' ? 1 : 0).map(([key, s]) => {
          return (
          <button key={key} type="button" role="radio" aria-checked={styleKey === key}
            className={`emoji-style ${styleKey === key ? 'active' : ''}`}
            onClick={() => onPreferenceChange('mapIconStyle', key)}>
            <span>{resolveMapIcon(s.icons.dig, preferences)} {resolveMapIcon(s.icons.elite, preferences)} {resolveMapIcon(s.icons.boss, preferences)}</span>
            <small>{s.label}</small>
          </button>
        );})}
      </div>
      <div className="emoji-map-grid">
        {NODE_TYPE_LABELS.map(([type, label]) => {
          if (isMixer) {
            const choice = mix[type] || { style: 'emoji', custom: '' };
            const source = styles[choice.style] || styles.emoji;
            const shown = source.icons[type];
            return <div key={type} className="emoji-slot mix-icon-slot">
              <small>{label}</small>
              <button type="button" className="mark-slot" onClick={() => cycleMixed(type)} title="Tap to cycle artwork sets">{resolveMapIcon(shown, preferences)}</button>
              <span>{ART_STYLE_LABELS[choice.style] || 'Emoji'}</span>
            </div>;
          }
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
            <div key={type} className="emoji-slot">
              <small>{label}</small>
              <span className="mark-slot">{resolveMapIcon(style.icons[type], preferences)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function EnemyIconSettings({ preferences, onPreferenceChange }) {
  const styles = getEnemyIconStyles(preferences);
  const active = styles[preferences.enemyIconStyle] ? preferences.enemyIconStyle : 'main';
  const previewKeys = ['grubber', 'ossuary', 'nn99'];
  const mix = preferences.enemyIconMix || {};
  const styleKeys = Object.keys(styles).filter(key => key !== 'mixer').sort((a, b) => a === 'main' ? -1 : b === 'main' ? 1 : 0);
  const cycleMixed = key => {
    const choice = mix[key] || { style: 'classic', custom: '' };
    const at = styleKeys.indexOf(choice.style);
    const style = styleKeys[(at + 1) % styleKeys.length];
    onPreferenceChange('enemyIconMix', { ...mix, [key]: { ...choice, style, custom: '' } });
  };
  return (
    <div className="setting-block">
      <span><b>Enemy icons</b><small>How monsters appear in combat and the index. Additional families use WebP or SVG atlases.</small></span>
      <div className="emoji-style-row" role="radiogroup" aria-label="Enemy icon set">
        {Object.entries(styles).sort(([a], [b]) => a === 'main' ? -1 : b === 'main' ? 1 : 0).map(([key, s]) => {
          return (
          <button key={key} type="button" role="radio" aria-checked={active === key}
            className={`emoji-style ${active === key ? 'active' : ''}`}
            onClick={() => onPreferenceChange('enemyIconStyle', key)}>
            <span>{previewKeys.map(k => (
              <i key={k} className="preview-ico">{resolveEnemyIcon(s.icons[k], preferences) ?? ENEMIES[k].emoji}</i>
            ))}</span>
            <small>{s.label}</small>
          </button>
        );})}
      </div>
      {active === 'mixer' && <div className="icon-mixer-grid">
        {Object.entries(ENEMIES).map(([key, def]) => {
          const choice = mix[key] || { style: 'classic', custom: '' };
          const source = styles[choice.style] || styles.classic;
          const shown = source.icons[key] || def.emoji;
          return <div className="mix-icon-slot" key={key}>
            <small>{def.name}</small>
            <button type="button" className="mark-slot" onClick={() => cycleMixed(key)}>{resolveEnemyIcon(shown, preferences)}</button>
            <span>{source.label}</span>
          </div>;
        })}
      </div>}
    </div>
  );
}

export function InterfaceIconSettings({ preferences, onPreferenceChange }) {
  const active = preferences.interfaceIconStyle || 'main';
  const mix = preferences.interfaceIconMix || {};
  const cycle = key => {
    const choice = mix[key] || { style: 'emoji', custom: '' };
    const keys = getArtStyleKeys(preferences);
    const at = keys.indexOf(choice.style);
    const style = keys[(at + 1) % keys.length];
    onPreferenceChange('interfaceIconMix', { ...mix, [key]: { ...choice, style, custom: '' } });
  };
  return <div className="setting-block">
    <span><b>Interface, board, camp & item icons</b><small>Use a matching family everywhere, or mix every icon individually.</small></span>
    <div className="emoji-style-row" role="radiogroup" aria-label="Interface icon set">
      {[...getArtStyleKeys(preferences), 'mixer'].map(key => {
        return <button key={key} type="button" role="radio" aria-checked={active === key}
        className={`emoji-style ${active === key ? 'active' : ''}`}
        onClick={() => onPreferenceChange('interfaceIconStyle', key)}>
        <span>{key === 'mixer' ? '⊞' : interfaceIconForStyle('flag', key, preferences)} {key === 'mixer' ? '⊛' : interfaceIconForStyle('bomb', key, preferences)} {key === 'mixer' ? '⊟' : interfaceIconForStyle('puzzle', key, preferences)}</span>
        <small>{key === 'mixer' ? ART_STYLE_LABELS.mixer : iconSetLabel(key, preferences)}</small>
      </button>;})}
    </div>
    {active === 'mixer' && <div className="icon-mixer-grid">
      {Object.entries(INTERFACE_ICON_CATEGORIES).map(([key, [label]]) => {
        const choice = mix[key] || { style: 'emoji', custom: '' };
        return <div className="mix-icon-slot" key={key}>
          <small>{label}</small>
          <button type="button" className="mark-slot" onClick={() => cycle(key)}>{interfaceIcon(key, preferences)}</button>
          <span>{ART_STYLE_LABELS[choice.style] || 'Emoji'}</span>
        </div>;
      })}
    </div>}
  </div>;
}

function ChallengePanel() {
  const [selected, setSelected] = useState(null);
  if (selected) return <div className="challenge-picker">
    <button className="btn" onClick={() => setSelected(null)}>← Change challenge</button>
    <div className="challenge-banner"><span>{CHALLENGES[selected].mark}</span><div><b>{CHALLENGES[selected].name}</b><small>{CHALLENGES[selected].desc}</small></div></div>
    <DelverPicker challenge={selected} />
  </div>;
  return <div className="challenge-grid">
    {Object.entries(CHALLENGES).map(([key, challenge]) => <button type="button" className="challenge-card" key={key} onClick={() => setSelected(key)}>
      <span>{challenge.mark}</span><div><b>{challenge.name}</b><small>{challenge.desc}</small></div><i>Choose ▸</i>
    </button>)}
  </div>;
}

function AchievementPanel() {
  const earned = loadAchievements();
  return <div className="achievement-grid">
    {Object.entries(ACHIEVEMENTS).map(([key, achievement]) => <article className={`achievement-stone ${earned[key] ? 'earned' : ''}`} key={key}>
      <span>{earned[key] ? '✦' : '◇'}</span><div><b>{earned[key] ? achievement.name : 'Uncarved stone'}</b><small>{achievement.desc}</small>
        {earned[key] && <time>{new Date(earned[key].earnedAt).toLocaleDateString()}</time>}</div>
    </article>)}
  </div>;
}

function GraveyardPanel() {
  const [graves, setGraves] = useState(loadGraveyard);
  const [openId, setOpenId] = useState(null);
  if (!graves.length) return <div className="graveyard empty"><div className="grave-moon">☾</div><p>No names are carved here yet.</p><small>Completed and fallen descents will raise a stone in this ground.</small></div>;
  return <div className="graveyard">
    <div className="graveyard-sky"><span className="grave-moon">☾</span><p>{graves.length} remembered descent{graves.length === 1 ? '' : 's'}</p></div>
    <div className="grave-row">
      {graves.map((grave, index) => {
        const cls = CLASSES[grave.cls];
        const open = grave.id === openId;
        return <article className={`grave ${grave.won ? 'survivor' : 'fallen'} grave-shape-${index % 3}`} key={grave.id}>
          <button type="button" className="headstone" onClick={() => setOpenId(open ? null : grave.id)} aria-expanded={open}>
            <span className="grave-mark">{grave.won ? '✦' : '†'}</span><b>{cls?.name || grave.cls}</b>
            <small>{grave.won ? 'Returned from below' : grave.cause}</small><time>{new Date(grave.endedAt).toLocaleDateString()}</time>
          </button>
          {open && <div className="grave-inscription">
            <p><b>Depth:</b> Stratum {grave.stratum + 1} · {grave.floors} floors</p>
            <p><b>Record:</b> {grave.fullClears} Full Clears · {grave.safeReveals} safe tiles · {grave.gold}g</p>
            {grave.challenge && <p><b>Challenge:</b> {CHALLENGES[grave.challenge]?.name || grave.challenge}</p>}
            {(grave.bosses || []).length > 0 && <p><b>Bosses:</b> {grave.bosses.map(key => ENEMIES[key]?.name || key).join(', ')}</p>}
            <div className="grave-build"><b>Final deck ({(grave.deck || []).length})</b><span>{(grave.deck || []).map((card, i) => <i key={`${card.key}-${i}`}>{CARDS[card.key]?.name || card.key}{card.up ? '+' : ''}</i>)}</span></div>
            <p><b>Trinkets:</b> {(grave.trinkets || []).map(key => TRINKETS[key]?.name || key).join(', ') || 'None'}</p>
          </div>}
        </article>;
      })}
    </div>
    <button className="btn danger graveyard-clear" onClick={() => { clearGraveyard(); setGraves([]); }}>Clear graveyard</button>
  </div>;
}

function SettingToggle({ label, detail, checked, onChange }) {
  return <label className="setting-row">
    <span><b>{label}</b><small>{detail}</small></span>
    <input type="checkbox" checked={checked} onChange={onChange} />
  </label>;
}

function SettingSlider({ label, value, onChange }) {
  const percent = Math.round(value * 100);
  return <label className="setting-row setting-slider">
    <span><b>{label}</b><small>{percent}%</small></span>
    <input type="range" min="0" max="1" step="0.01" value={value}
      aria-label={label} aria-valuetext={`${percent}%`}
      onChange={event => onChange(Number(event.target.value))} />
  </label>;
}

function InfiniteJukeboxControls({ scope = 'game' }) {
  const [values, setValues] = useState(() => getInfiniteMusicParams(scope));
  const change = (key, value) => setValues(setInfiniteMusicParam(scope, key, value));
  return <div className="infinite-controls">
    <div className="infinite-controls-head"><b>{scope === 'jukebox' ? 'Jukebox infinite mix' : 'Game infinite mix'}</b><small>{scope === 'jukebox'
      ? 'Separate tuning used only for infinite previews in this player'
      : 'Used by the adaptive score on the home screen and throughout the delve'}</small></div>
    <SettingSlider label="Branch chance" value={values.branch} onChange={value => change('branch', value)} />
    <SettingSlider label="Section length" value={values.segment} onChange={value => change('segment', value)} />
    <SettingSlider label="Minimum jump distance" value={values.distance} onChange={value => change('distance', value)} />
    <SettingSlider label="Ambient mix" value={values.ambient} onChange={value => change('ambient', value)} />
    <SettingSlider label="Musical activity" value={values.activity} onChange={value => change('activity', value)} />
    <SettingSlider label="Cave details" value={values.cave} onChange={value => change('cave', value)} />
    <SettingSlider label="Combat pulse" value={values.pulse} onChange={value => change('pulse', value)} />
  </div>;
}

/* Home-screen jukebox: play any score mood heard so far. Locked rows show how
   to earn them; previews keep playing while browsing the menu and end when a
   run takes the score back (music.js clears the preview on any non-title mood). */
function JukeboxPanel({ musicOff, musicLevel, onMusicOffChange, onMusicLevelChange }) {
  const progress = loadProgression();
  const [playingId, setPlayingId] = useState(previewingTrackId);
  const [paused, setPaused] = useState(isMusicPaused);
  const [looping, setLooping] = useState(isMusicLooping);
  const [playbackMode, setPlaybackMode] = useState('infinite');
  const unlocked = TRACKS.filter(track => track.unlock(progress));
  const play = track => {
    if (playingId === track.id) {
      const next = setMusicPaused(!paused); setPaused(next); return;
    }
    if (musicOff) onMusicOffChange(); // playing a track is an explicit request for music
    previewTrack(track, playbackMode);
    setMusicPaused(false); setPaused(false);
    setPlayingId(track.id);
  };
  const move = delta => {
    if (!unlocked.length) return;
    const current = unlocked.findIndex(track => track.id === playingId);
    const index = current < 0 ? 0 : (current + delta + unlocked.length) % unlocked.length;
    play(unlocked[index]);
  };
  const stop = () => {
    stopPreview(); setMusicPaused(true); setPaused(true); setPlayingId(null);
  };
  const chooseMode = mode => {
    setPlaybackMode(mode);
    const current = TRACKS.find(track => track.id === playingId);
    if (current) { previewTrack(current, mode); setMusicPaused(false); setPaused(false); }
  };
  return <div className="jukebox">
    <p className="dim">Moods of the Undermine's score, collected as you meet them below. {unlocked.length} of {TRACKS.length} heard.
      {' '}Music keeps playing while you browse; starting a run hands the score back to the descent.</p>
    <div className="jukebox-player" aria-label="Jukebox controls">
      <button className="btn" onClick={() => move(-1)} disabled={!unlocked.length} aria-label="Previous track">◀</button>
      <button className="btn primary" onClick={() => {
        if (!playingId) move(1);
        else { const next = setMusicPaused(!paused); setPaused(next); }
      }}>{paused || !playingId ? '▶ Play' : 'Ⅱ Pause'}</button>
      <button className="btn" onClick={() => move(1)} disabled={!unlocked.length} aria-label="Next track">▶</button>
      <button className="btn" onClick={() => { restartMusic(); setPaused(false); setMusicPaused(false); }}>↺ Restart</button>
      <button className={`btn ${playbackMode === 'infinite' ? 'primary' : ''}`} aria-pressed={playbackMode === 'infinite'} onClick={() => chooseMode('infinite')}>∞ Infinite</button>
      <button className={`btn ${playbackMode === 'direct' ? 'primary' : ''}`} aria-pressed={playbackMode === 'direct'} onClick={() => chooseMode('direct')}>♪ Direct</button>
      <button className={`btn ${looping ? 'primary' : ''}`} disabled={playbackMode === 'infinite'} aria-pressed={looping} onClick={() => setLooping(setMusicLooping(!looping))}>↻ Direct loop</button>
      <button className="btn" onClick={stop} disabled={!playingId}>■ Stop</button>
    </div>
    <SettingSlider label="Music volume" value={musicLevel} onChange={onMusicLevelChange} />
    <InfiniteJukeboxControls scope="jukebox" />
    {TRACKS.map(track => {
      const earned = Boolean(track.unlock(progress));
      const playing = playingId === track.id;
      return <div key={track.id} className={`track-row ${earned ? '' : 'locked'}`}>
        <div className="track-info">
          <b>{earned ? track.name : 'Unheard music'}</b>
          <small>{earned ? track.detail : `Locked — ${track.hint.toLowerCase()}`}</small>
        </div>
        {playing && <span className="track-eq" aria-hidden="true"><i /><i /><i /></span>}
        {earned && <button className={`btn ${playing ? '' : 'primary'}`} onClick={() => play(track)}
          aria-label={playing ? `Stop ${track.name}` : `Play ${track.name}`}>
          {playing ? (paused ? '▶ Resume' : 'Ⅱ Pause') : '▶ Play'}
        </button>}
      </div>;
    })}
  </div>;
}

export function InGameMenu({
  muted, musicOff, sfxLevel, musicLevel, hapticsOn, preferences,
  onMutedChange, onMusicOffChange, onSfxLevelChange, onMusicLevelChange,
  onHapticsChange, onPreferenceChange, onClose,
}) {
  const [tab, setTab] = useState('game');
  const [musicPaused, setPaused] = useState(isMusicPaused);
  const [musicLoops, setLoops] = useState(isMusicLooping);
  // back steps from a sub-tab to the main tab first; only then does App close the menu
  useEffect(() => {
    if (tab === 'game') return undefined;
    return registerBackHandler(() => { setTab('game'); return true; });
  }, [tab]);
  return <div className="overlay game-menu-overlay" onClick={event => event.target === event.currentTarget && onClose()}>
    <section className="modal game-menu" role="dialog" aria-modal="true" aria-label="Game menu">
      <header><h2>Game menu</h2><button className="btn" onClick={onClose}>Close ×</button></header>
      <nav className="game-menu-tabs">
        {['game', 'settings', 'icons'].map(key => <button className={`btn ${tab === key ? 'primary' : ''}`} key={key} onClick={() => setTab(key)}>{key}</button>)}
      </nav>
      <div className="game-menu-body">
        {tab === 'game' && <div className="game-menu-actions">
          <button className="home-action primary" onClick={() => { saveRun('auto'); onClose(); }}><span>Save now</span><small>Update the autosave without leaving this screen</small></button>
          {['slot1', 'slot2', 'slot3'].map((slot, i) => <button className="home-action compact" key={slot} onClick={() => saveRun(slot)}><span>Save slot {i + 1}</span><small>Write a named checkpoint</small></button>)}
          <button className="home-action" onClick={() => { onClose(); goHome(); }}><span>Go home</span><small>Autosave and return to the title screen</small></button>
        </div>}
        {tab === 'settings' && <div className="settings-list">
          <SettingToggle label="Sound effects" detail="Combat and interface audio" checked={!muted} onChange={onMutedChange} />
          <SettingSlider label="SFX volume" value={sfxLevel} onChange={onSfxLevelChange} />
          <SettingToggle label="Music" detail="Spooky adaptive score" checked={!musicOff} onChange={onMusicOffChange} />
          <SettingSlider label="Music volume" value={musicLevel} onChange={onMusicLevelChange} />
          <SettingToggle label="Haptics" detail="Touch feedback for important actions" checked={hapticsOn} onChange={onHapticsChange} />
          <div className="setting-row music-transport"><span><b>Music player</b><small>Control the current adaptive track</small></span><div>
            <button className="btn" onClick={() => setPaused(setMusicPaused(!musicPaused))}>{musicPaused ? '▶ Resume' : 'Ⅱ Pause'}</button>
            <button className="btn" onClick={restartMusic}>↺ Restart</button>
          </div></div>
          <SettingToggle label="Loop music" detail="Repeat the current soundtrack indefinitely" checked={musicLoops} onChange={() => setLoops(setMusicLooping(!musicLoops))} />
          <InfiniteJukeboxControls />
          <SettingToggle label="Reduce motion" detail="Disable animation and screen shake" checked={preferences.reducedMotion} onChange={() => onPreferenceChange('reducedMotion', !preferences.reducedMotion)} />
          <SettingToggle label="High contrast" detail="Brighter board and interface information" checked={preferences.highContrast} onChange={() => onPreferenceChange('highContrast', !preferences.highContrast)} />
          <SettingToggle label="Large text" detail="Increase interface text" checked={preferences.largeText} onChange={() => onPreferenceChange('largeText', !preferences.largeText)} />
          <SettingToggle label="Compact cards" detail="Fit more cards on narrow screens" checked={preferences.compactCards} onChange={() => onPreferenceChange('compactCards', !preferences.compactCards)} />
        </div>}
        {tab === 'icons' && <><MapIconSettings preferences={preferences} onPreferenceChange={onPreferenceChange} /><EnemyIconSettings preferences={preferences} onPreferenceChange={onPreferenceChange} /><InterfaceIconSettings preferences={preferences} onPreferenceChange={onPreferenceChange} /></>}
      </div>
    </section>
  </div>;
}

function HowSection({ icon, title, children, open = false }) {
  return <details className="how-section" open={open}>
    <summary><span>{icon}</span>{title}</summary>
    <div className="how-section-body">{children}</div>
  </details>;
}

function HowToPlay() {
  const prefs = loadPreferences();
  const guideMap = mapIcons(prefs);
  return <div className="rulebook">
    <div className="rulebook-intro">
      <div className="daily-rune"><GameIcon name="picks" preferences={prefs} /></div>
      <div><h2>Dig. Read. Survive.</h2><p>Cryptsweeper combines Minesweeper deduction with a turn-based deckbuilder. Open safe ground, use cards to control uncertainty, and defeat every enemy before the crypt buries you.</p></div>
    </div>

    <HowSection icon={<GameIcon name="event" preferences={prefs} />} title="The run and map" open>
      <ul>
        <li>A run crosses <b>three strata</b>. Each stratum has a branching map and ends with a boss. Boards grow larger, carry more mines, and deal more mine damage at greater depths.</li>
        <li>Choose one connected node at a time: {NODE_TYPE_LABELS.map(([type, label], i) => <span key={type}>{i ? ', ' : ''}<b>{resolveMapIcon(guideMap[type])} {label.toLowerCase()}</b></span>)}. Fights, recovery, trade, risks, and bosses each use their matching node.</li>
        <li>The game autosaves after actions. <b>Home</b> safely leaves the run resumable; named save slots can preserve additional checkpoints.</li>
        <li>The <b>Daily Challenge</b> uses a date-based seed. The map, fights, boards, events, and rewards repeat for that date and Delver.</li>
        <li>Winning, reaching deeper strata, and lifetime achievements unlock additional Delvers. Collection indexes record per-Delver performance plus enemies, items, and cards as you discover them.</li>
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
        <span><b><GameIcon name="flag" preferences={prefs} /></b> suspected mine</span><span><b><GameIcon name="safe" preferences={prefs} /></b> scanned safe</span><span><b><GameIcon name="bomb" preferences={prefs} /></b> scanned mine</span>
        <span><b><GameIcon name="bomb" preferences={prefs} /></b> primed mine</span><span><b>▼</b> incoming mine</span><span><b>▦</b> entombed tile</span>
        <span><b><GameIcon name="crater" preferences={prefs} /></b> spent crater</span><span><b>Glow</b> provably safe</span><span><b>Tint</b> enemy lair</span>
      </div>
    </HowSection>

    <HowSection icon={<GameIcon name="attack" preferences={prefs} />} title="Combat turns, targeting, and enemies">
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

    <HowSection icon={<GameIcon name="health" preferences={prefs} />} title="Damage, defenses, and clearing">
      <ul>
        <li>Enemy attacks remove <b data-mechanic="block">Block</b> before Health. Block normally resets at your next turn; the Warden retains a quarter.</li>
        <li><b data-mechanic="plating">Plating</b> persists between turns and absorbs uncontrolled mine damage. Mine damage bypasses Block. Its value rises in deeper strata.</li>
        <li><b data-mechanic="instinct">Instinct</b> prevents the first accidentally revealed mine in a combat by verified-flagging it instead. Some Delvers or items modify this safety net.</li>
        <li>A <b data-mechanic="full clear">Full Clear</b> resolves every safe tile. The board collapses for <b>50 damage to all enemies</b>, grants an upgraded card reward, and re-seals if anything survives.</li>
        <li>A Full Clear is powerful but does not itself win combat: every enemy must be killed. Reaching zero Health ends the run.</li>
      </ul>
    </HowSection>

    <HowSection icon={<GameIcon name="cards" preferences={prefs} />} title="Cards, piles, and upgrades">
      <ul>
        <li>Press <b>Show Cards</b> to open your hand. A card's gem is its Energy cost; dim cards are unaffordable or currently unplayable.</li>
        <li><b>Attack</b> cards deal damage, <b>Skill</b> cards provide utility or defense, and <b data-mechanic="power">Power</b> cards create a combat-long effect.</li>
        <li>Played cards normally enter the discard pile. When the draw pile empties, discard is shuffled into a new draw pile. <b data-mechanic="exhaust">Exhausted</b> cards stay out for the rest of combat.</li>
        <li>Card rewards may be skipped. Upgrading a card improves its green-highlighted values; upgraded cards show a <b>+</b>. Removal permanently thins the run's deck and becomes more expensive each time.</li>
        <li>Curses are unplayable cards with persistent penalties: <b data-mechanic="claustrophobia">Claustrophobia</b> adds mines, <b data-mechanic="vertigo">Vertigo</b> removes Picks, <b data-mechanic="exhaustion">Exhaustion</b> reduces draw, <b data-mechanic="night terrors">Night Terrors</b> drains opening Energy, and <b data-mechanic="paranoia">Paranoia</b> plants false flags. Removal permanently clears a curse from the run.</li>
      </ul>
    </HowSection>

    <HowSection icon={<GameIcon name="bag" preferences={prefs} />} title="Gold, rewards, items, camps, and shops">
      <ul>
        <li>Combat rewards include Gold and a card choice. Elites can award trinkets, ordinary fights can find gadgets, and bosses offer boss relics before the next stratum.</li>
        <li><b>Trinkets</b> are passive and last for the run. <b>Gadgets</b> are consumable tools; you can carry at most three gadget copies. Tap the bag to inspect all items and use gadgets.</li>
        <li>Shops sell cards, trinkets, gadgets, and card removal. Gold is run-specific and prices vary; each removal raises the next removal cost.</li>
        <li>At camp, choose one: Rest heals 30% max Health, Smith upgrades a card, Survey starts the next fight 25% revealed, or Train adds one Max Pick up to the run's +2 training cap.</li>
        <li><b>Honest Puzzles</b> begin with no-guess Minesweeper, 4×4 Sudoku, and 3×3 word squares. Deeper strata unlock larger versions plus number sequences, Lights Out, and nonograms. Minesweeper offers limited scans and flags; other puzzles explain their controls in the room. Solve flawlessly for an upgrade, or abandon without the prize.</li>
      </ul>
    </HowSection>

    <HowSection icon={<GameIcon name="picks" preferences={prefs} />} title="Delvers and passives">
      <div className="delver-rules">
        {Object.entries(CLASSES).map(([key, cls]) => <article key={key}>
          <b>{cls.name}</b><small>{cls.role}</small>
          <p dangerouslySetInnerHTML={{ __html: decorateMechanics(cls.passive) }} />
        </article>)}
      </div>
    </HowSection>

    <HowSection icon={<GameIcon name="target" preferences={prefs} />} title="Touch and keyboard controls">
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
const NODE_TYPE_LABELS = [
  ['dig', 'Dig'], ['elite', 'Elite'], ['event', 'Event'], ['shop', 'Shop'],
  ['treasure', 'Treasure'], ['camp', 'Camp'], ['boss', 'Boss'],
];
function mapIcons(prefs) {
  const styles = mapIconStyles(prefs);
  const styleKey = styles[prefs?.mapIconStyle] ? prefs.mapIconStyle : 'main';
  const icons = { ...styles[styleKey].icons };
  if (styleKey === 'mixer') {
    for (const [type] of NODE_TYPE_LABELS) {
      const choice = prefs?.mapIconMix?.[type];
      const source = styles[choice?.style] || styles.emoji;
      icons[type] = source.icons[type];
    }
    return icons;
  }
  const vectorStyle = Object.values(icons).every(isMarkToken);
  if (vectorStyle) {
    for (const [type, name] of Object.entries(prefs?.mapMarks || {})) {
      if (MARKS[name]) icons[type] = `svg:${name}`;
    }
  }
  return icons;
}

function mapIconStyles(prefs) {
  const custom = Object.fromEntries(Object.keys(customIconSets(prefs)).map(id => {
    const base = customSetBase(id, prefs, 'emoji');
    const source = MAP_ICON_STYLES[base] || MAP_ICON_STYLES.emoji;
    const icons = { ...source.icons };
    for (const [type] of NODE_TYPE_LABELS) icons[type] = customSetIcon(id, 'map', type, prefs) || icons[type];
    return [id, { label: iconSetLabel(id, prefs), icons }];
  }));
  return { ...MAP_ICON_STYLES, ...custom };
}

const MAP_HOLD_MS = 300;
const MAP_HOLD_SLOP_PX = 10;

export function MapScreen() {
  const m = run.map;
  // While a cutscene (opening / descent) plays over the map, don't mount the map body:
  // its CSS entrance animation would run hidden behind the overlay and be finished by the
  // time the cutscene closes. Mounting it once the cutscene clears plays the sweep for real.
  const covered = Boolean(ui.cutscene);
  const prefs = loadPreferences();
  const icons = mapIcons(prefs);
  const iconClass = type => {
    if (isMarkToken(icons[type])) return 'svgmark';
    return 'emoji';
  };
  const reach = reachableNodes();
  const isReach = (r, c) => reach.some(n => n.r === r && n.c === c);

  /* branches the descent can no longer reach are removed entirely; the trail
     you actually walked stays as history */
  let accessible;
  if (run.pos) accessible = mapClosure(m, run.pos.r, run.pos.c);
  else {
    accessible = new Set();
    for (const c of Object.keys(m.nodes[0])) for (const key of mapClosure(m, 0, +c)) accessible.add(key);
  }
  const kept = key => Boolean(run.visited[key]) || accessible.has(key);

  /* hold a node to preview its futures: everything unreachable from it dims */
  const [previewKey, setPreviewKey] = useState(null);
  const previewSet = previewKey ? mapClosure(m, ...previewKey.split(',').map(Number)) : null;
  const hold = useRef({ t: null, fired: false, x: 0, y: 0 });
  const cancelHold = () => { clearTimeout(hold.current.t); hold.current.t = null; };
  const startHold = (ev, r, c) => {
    hold.current.fired = false;
    hold.current.x = ev.clientX; hold.current.y = ev.clientY;
    cancelHold();
    hold.current.t = setTimeout(() => { hold.current.fired = true; setPreviewKey(`${r},${c}`); }, MAP_HOLD_MS);
  };
  const moveHold = ev => {
    if (hold.current.t && Math.hypot(ev.clientX - hold.current.x, ev.clientY - hold.current.y) > MAP_HOLD_SLOP_PX) cancelHold();
  };
  const endHold = () => { cancelHold(); setPreviewKey(null); };

  const lines = [];
  for (const [key, set] of Object.entries(m.edges)) {
    const [r, c] = key.split(',').map(Number);
    for (const nc of set) {
      if (m.nodes[r + 1][nc] === undefined) continue;
      if (!kept(key) || !kept(`${r + 1},${nc}`)) continue; // pruned branch
      const ghost = previewSet && !previewSet.has(key) ? ' ghosted' : '';
      lines.push(<g key={`${key}-${nc}`}>
        <line className={`mapline-shadow${ghost}`} x1={(c + 0.5) * 20} y1={r + 0.5} x2={(nc + 0.5) * 20} y2={r + 1.5} />
        <line className={`mapline${ghost}`} x1={(c + 0.5) * 20} y1={r + 0.5} x2={(nc + 0.5) * 20} y2={r + 1.5} />
      </g>);
    }
  }
  return (
    <>
      <TopBar />
      <p className="eyebrow" style={{ textAlign: 'center' }}>Tunnel map — choose your descent · hold any node to preview its paths</p>
      {!covered && (
        <>
          <div className="mapwrap" style={{ height: `calc(var(--map-row) * ${MAP_ROWS})`, '--map-rows': MAP_ROWS }}
            onContextMenu={ev => ev.preventDefault()}>
            <svg className="map-paths" viewBox={`0 0 100 ${MAP_ROWS}`} preserveAspectRatio="none">{lines}</svg>
            {m.nodes.map((row, r) => (
              <div key={r} className="maprow" style={{ '--row': r }}>
                {Object.keys(row).filter(cs => kept(`${r},${cs}`)).map(cs => {
                  const c = +cs;
                  const type = row[cs];
                  const key = `${r},${c}`;
                  const cls = ['mapnode',
                    type === 'boss' ? 'boss' : '',
                    isReach(r, c) ? 'reachable' : '',
                    run.pos && run.pos.r === r && run.pos.c === c ? 'current' : '',
                    (run.visited[key] || (run.pos && r < run.pos.r)) ? 'done' : '',
                    previewSet && !previewSet.has(key) ? 'ghosted' : '',
                    previewKey === key ? 'preview-origin' : '',
                  ].filter(Boolean).join(' ');
                  return (
                    <div key={c} className={cls} title={type}
                      style={{ left: `${(c + 0.5) * 20}%` }}
                      onPointerDown={ev => startHold(ev, r, c)}
                      onPointerMove={moveHold}
                      onPointerUp={endHold} onPointerCancel={endHold} onPointerLeave={endHold}
                      onClick={() => {
                        if (hold.current.fired) { hold.current.fired = false; return; }
                        if (isReach(r, c)) enterNode(r, c);
                      }}>
                      <span className={`mapicon ${iconClass(type)}`} aria-hidden="true">{resolveMapIcon(icons[type], prefs)}</span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          <p className="maplegend">
            {NODE_TYPE_LABELS.map(([t, label]) => (
              <span key={t} className="legend-item">{resolveMapIcon(icons[t], prefs)} {label.toLowerCase()}</span>
            ))}
          </p>
        </>
      )}
    </>
  );
}

/* ---------------- reward ---------------- */
export function RewardScreen() {
  const r = run.reward;
  const prefs = loadPreferences();
  return (
    <>
      <TopBar />
      <div className="screenpanel">
        <h2><GameIcon name="victory" preferences={prefs} /> {r.fullClear ? 'FULL CLEAR — ' : ''}Victory</h2>
        <p className="dim">
          Loot from the {r.kind}.{' '}
          {r.fullClear ? <>The card reward is shown <b style={{ color: 'var(--n2)' }}>upgraded</b> and you found +15 bonus gold.</> : null}
        </p>
        <p>◈ <b className="gold">+{r.gold} gold</b> collected.</p>
        {r.trinket && (
          <p>Elite spoils: <b><span className="inline-vector-icon">{itemVector(r.trinket, prefs)}</span> {TRINKETS[r.trinket].name}</b> — {TRINKETS[r.trinket].desc}{' '}
            <button className="btn" onClick={takeRewardTrinket}>Take</button></p>
        )}
        {r.bossTrinkets && r.bossTrinkets.length > 0 && (
          <>
            <p><GameIcon name="bossRelic" preferences={prefs} /> Boss relic — choose one:</p>
            <div className="choicelist">
              {r.bossTrinkets.map(k => (
                <div key={k} className="choice" onClick={() => takeBossTrinket(k)}>
                  <span className="cname"><span className="inline-vector-icon">{itemVector(k, prefs)}</span> {TRINKETS[k].name}</span>
                  <div className="cdesc">{TRINKETS[k].desc}</div>
                </div>
              ))}
            </div>
          </>
        )}
        {r.gadget && (
          <p>Found gadget: <b><span className="inline-vector-icon">{itemVector(r.gadget, prefs)}</span> {GADGETS[r.gadget].name}</b> — {GADGETS[r.gadget].desc}{' '}
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
  const prefs = loadPreferences();
  return (
    <>
      <TopBar />
      <div className="screenpanel">
        <h2><GameIcon name="camp" preferences={prefs} /> Camp</h2>
        <p className="dim">The dark is patient. Choose one.</p>
        <div className="choicelist">
          <div className="choice camp-choice" onClick={campHeal}><span className="camp-action-icon">{campVector('rest', prefs)}</span>
            <span className="cname">Rest</span>
            <div className="cdesc">Heal {Math.floor(run.maxHp * 0.3)} HP (30%).</div>
          </div>
          <div className="choice camp-choice" onClick={campUpgrade}><span className="camp-action-icon">{campVector('smith', prefs)}</span>
            <span className="cname">Smith</span>
            <div className="cdesc">Upgrade a card permanently.</div>
          </div>
          <div className="choice camp-choice" onClick={campSurvey}><span className="camp-action-icon">{campVector('survey', prefs)}</span>
            <span className="cname">Survey</span>
            <div className="cdesc">Your next combat's board starts 25% pre-revealed.</div>
          </div>
          <div className={`choice camp-choice ${(run.pickBonus || 0) >= 2 ? 'disabled' : ''}`} onClick={campTrainPicks}><span className="camp-action-icon">{campVector('train', prefs)}</span>
            <span className="cname">Trail Training</span>
            <div className="cdesc">
              {(run.pickBonus || 0) >= 2
                ? `Training mastered: ${basePicksFor(run.cls) + run.pickBonus} base max picks each turn.`
                : `Permanently gain +1 max pick each turn this run (currently ${basePicksFor(run.cls) + (run.pickBonus || 0)}; cap +2).`}
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
  const prefs = loadPreferences();
  const [shelf, setShelf] = useState('items');
  const [showMerchantArt, setShowMerchantArt] = useState(false);
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
          <button type="button" className="shop-merchant-art" onClick={() => setShowMerchantArt(true)} aria-haspopup="dialog" aria-label="View full artwork for the Rat Merchant">
            <img src={ratMerchantPortrait()} alt="The Rat Merchant" />
            <span className="art-expand-hint">Full art</span>
          </button>
          <div><p className="eyebrow">The Rat Merchant</p><h2>Wares from deeper tunnels</h2><p>“Dig gold, spend gold, eh?”</p></div>
          <div className="shop-purse"><small>Your purse</small><b>◈ {run.gold}g</b></div>
        </header>

        <nav className="shop-shelves" aria-label="Shop shelves">
          <button className={shelf === 'items' ? 'active' : ''} onClick={() => setShelf('items')}>
            <span><GameIcon name="items" preferences={prefs} /></span><b>Items</b><small>{remainingItems} left</small>
          </button>
          <button className={shelf === 'cards' ? 'active' : ''} onClick={() => setShelf('cards')}>
            <span><GameIcon name="cards" preferences={prefs} /></span><b>Show cards</b><small>{remainingCards} left</small>
          </button>
          <button className={shelf === 'services' ? 'active' : ''} onClick={() => setShelf('services')}>
            <span><GameIcon name="services" preferences={prefs} /></span><b>Services</b><small>Deck work</small>
          </button>
        </nav>

        {shelf === 'items' && <section className="shop-shelf-panel">
          <div className="shop-section-head"><div><h3>Items</h3><p>Tap an icon to inspect it.</p></div><span>{run.gadgets.length}/3 gadget slots</span></div>
          <div className="shop-item-tokens">
            {items.map(item => {
              const id = `${item.kind}:${item.index}`;
              return <button key={id} disabled={item.sold} className={`shop-item-token ${selectedItem === id ? 'selected' : ''} ${run.gold < item.price ? 'too-pricey' : ''}`}
                onClick={() => setSelectedItem(id)} aria-label={`${item.def.name}, ${item.price} gold`}>
                <span>{itemVector(item.key, prefs)}</span><b>{item.price}g</b><small>{item.kind}</small>{item.sold && <i>Sold</i>}
              </button>;
            })}
          </div>
          {selected ? <article className={`shop-item-detail ${selected.sold ? 'sold' : ''}`}>
            <div className="shop-detail-icon">{itemVector(selected.key, prefs)}</div>
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
            <span><GameIcon name="services" preferences={prefs} /></span><div><h3>Remove a card</h3><p>Choose one card to remove permanently. Each removal costs 25g more than the last.</p></div>
            <button className="btn" disabled={run.gold < run.removalCost} onClick={buyRemoval}>{run.gold < run.removalCost ? `Need ${run.removalCost - run.gold}g` : `Remove · ${run.removalCost}g`}</button>
          </article>
        </section>}

        <div className="shop-footer">
          <span>{remainingCards + remainingItems} wares remain</span>
          {quickBuy && <button className="btn primary shop-footer-buy" disabled={quickBuy.disabled} onClick={quickBuy.action}>{quickBuy.label}</button>}
          <button className="btn primary" onClick={gotoMap}>Leave shop ▸</button>
        </div>
      </main>
      {showMerchantArt && <FullArtViewer src={ratMerchantPortrait()} alt="The Rat Merchant full portrait" title="The Rat Merchant" onClose={() => setShowMerchantArt(false)} />}
    </>
  );
}

/* ---------------- events ---------------- */
export function EventScreen() {
  const event = EVENT_CATALOG[run.event] || EVENT_CATALOG.corpse;
  const view = currentEventView() || event;
  const prefs = loadPreferences();
  return (
    <>
      <TopBar />
      <div className="screenpanel">
        <h2><GameIcon name="event" preferences={prefs} /> {event.title}</h2>
        {view.stageLabel && <div className="event-stage">{view.stageLabel}</div>}
        <p>{view.text}</p>
        {run.eventState?.history?.length > 0 && <div className="event-evidence"><b>Mechanism inspected</b><span>Fresh scratches expose the immediate contents of each passage.</span></div>}
        <div className="choicelist">
          {view.choices.map(choice => <button type="button" className="choice" key={choice.key} disabled={choice.disabled} onClick={() => eventChoice(choice.key)}>
            <span className="cname">{choice.label}</span>
            {choice.desc && <span className="cdesc">{choice.desc}</span>}
          </button>)}
        </div>
      </div>
    </>
  );
}

/* ---------------- puzzle ---------------- */
function focusPuzzleCell(current, index) {
  current.closest('[data-logic-grid]')?.querySelector(`[data-cell="${index}"]`)?.focus();
}
function puzzleGridKeyDown(event, index, size, count) {
  const next = gridNavigationIndex(event.key, index, size, count);
  if (next === index) return;
  event.preventDefault(); focusPuzzleCell(event.currentTarget, next);
}

export function PuzzleScreen() {
  const p = run.puzzle;
  const prefs = loadPreferences();
  const type = p.type || 'mines';
  const descriptions = {
    mines: 'Reveal every safe tile. Flags mark suspected mines; scans expose a tile without opening it.',
    sudoku: `Fill every row, column, and outlined ${p.boxRows}×${p.boxCols} box with 1–${p.size} exactly once.`,
    crossword: `Fill the ${p.size}×${p.size} word square. Every answer works both across and down.`,
    sequence: 'Choose the value that continues the sequence.',
    lights: 'Tap a rune to flip it and its orthogonal neighbors. Extinguish every rune.',
    nonogram: 'Fill cells so each row and column matches its ordered run-length clues.',
  };
  return (
    <>
      <TopBar />
      <div className="screenpanel" style={{ maxWidth: 640 }}>
        <h2><GameIcon name="puzzle" preferences={prefs} /> An Honest Puzzle</h2>
        <p className="dim">{descriptions[type]} No enemy and no turn limit.</p>
        {p.difficultyLabel && <p className="puzzle-difficulty">{p.difficultyLabel}</p>}

        {type === 'mines' && <>
          <div style={{ display: 'flex', justifyContent: 'center' }}><BoardView mode="puzzle" /></div>
          <div className="boardinfo" style={{ justifyContent: 'center' }}>
            <button className="btn" disabled={!p.scans} onClick={togglePuzzleScan}
              style={p.scanMode ? { borderColor: 'var(--n2)', color: 'var(--n2)' } : undefined}>
              <GameIcon name="scan" preferences={prefs} /> Scan ({p.scans} left)
            </button>
          </div>
        </>}

        {type === 'sudoku' && <div className="logic-puzzle-wrap">
          {p.size >= 6 && <button type="button" className={`btn note-mode ${p.noteMode ? 'active' : ''}`} aria-pressed={p.noteMode} onClick={toggleSudokuNoteMode}>
            Candidate marks: {p.noteMode ? 'on' : 'off'}
          </button>}
          <div className={`sudoku-grid size-${p.size}`} data-logic-grid style={{ '--logic-size': p.size }} role="grid" aria-label={`${p.size} by ${p.size} Sudoku`}>
            {p.values.map((value, i) => {
              const given = p.givens.includes(i);
              const row = Math.floor(i / p.size), col = i % p.size;
              const edge = {
                borderRight: col < p.size - 1 && (col + 1) % p.boxCols === 0 ? '3px solid var(--bone-dim)' : undefined,
                borderBottom: row < p.size - 1 && (row + 1) % p.boxRows === 0 ? '3px solid var(--bone-dim)' : undefined,
              };
              const notes = p.notes?.[i] || [];
              return <div key={i} style={edge} className={`sudoku-cell-wrap ${given ? 'given' : ''}`} role="gridcell">
                <input data-cell={i} className="logic-cell" aria-label={`Row ${row + 1}, column ${col + 1}${notes.length ? `, candidates ${notes.join(', ')}` : ''}`}
                  inputMode="numeric" maxLength={1} readOnly={given} value={value || ''}
                  onKeyDown={e => puzzleGridKeyDown(e, i, p.size, p.values.length)}
                  onChange={e => setLogicPuzzleCell(i, e.target.value.replace(new RegExp(`[^1-${p.size}]`, 'g'), ''))} />
                {!value && notes.length > 0 && <span className="sudoku-notes" aria-hidden="true">{notes.join(' ')}</span>}
              </div>;
            })}
          </div>
          {!p.failed && !p.solved && <button className="btn primary" onClick={checkLogicPuzzle}>Check Sudoku</button>}
        </div>}

        {type === 'crossword' && <div className="logic-puzzle-wrap crossword-layout">
          <div className="crossword-grid" data-logic-grid style={{ '--logic-size': p.size }} role="grid" aria-label={`${p.size} by ${p.size} mini crossword`}>
            {p.values.map((value, i) => <label className="crossword-cell" key={i}>
              {(i < p.size || i % p.size === 0) && <small>{i + 1}</small>}
              <input data-cell={i} aria-label={`Crossword square ${i + 1}`} autoCapitalize="characters" maxLength={1} value={value}
                onKeyDown={e => puzzleGridKeyDown(e, i, p.size, p.values.length)}
                onChange={e => { setLogicPuzzleCell(i, e.target.value); if (e.target.value && i + 1 < p.values.length) focusPuzzleCell(e.currentTarget, i + 1); }} />
            </label>)}
          </div>
          <div className="crossword-clues">
            <div><h3>Across</h3>{p.acrossClues.map((clue, i) => <p key={i}><b>{i * p.size + 1}.</b> {clue}</p>)}</div>
            <div><h3>Down</h3>{p.downClues.map((clue, i) => <p key={i}><b>{i + 1}.</b> {clue}</p>)}</div>
          </div>
          {!p.failed && !p.solved && <button className="btn primary" onClick={checkLogicPuzzle}>Check crossword</button>}
        </div>}

        {type === 'sequence' && <div className="logic-puzzle-wrap sequence-puzzle">
          <div className="sequence-runes">{p.prompt}</div>
          <div className="sequence-choices">{p.choices.map(value => <button className="btn" key={value} onClick={() => answerSequence(value)}>{value}</button>)}</div>
        </div>}

        {type === 'lights' && <div className="logic-puzzle-wrap">
          <div className="lights-grid" data-logic-grid style={{ '--logic-size': p.size }} role="grid" aria-label={`${p.size} by ${p.size} Lights Out board`}>
            {p.values.map((value, i) => <button data-cell={i} key={i} className={value ? 'on' : ''} onKeyDown={e => puzzleGridKeyDown(e, i, p.size, p.values.length)} onClick={() => toggleLightsCell(i)} aria-label={`Rune ${i + 1}, ${value ? 'lit' : 'dark'}`}>{value ? '◆' : '·'}</button>)}
          </div>
          <p className="dim mono">Moves: {p.moves}</p>
        </div>}

        {type === 'nonogram' && <div className="logic-puzzle-wrap nonogram-puzzle">
          <div className="nonogram-board" style={{ '--logic-size': p.size }}>
            <div className="nonogram-corner" />
            <div className="nonogram-col-clues">{p.colClues.map((clue, i) => <span key={i}>{clue.join(' ')}</span>)}</div>
            <div className="nonogram-row-clues">{p.rowClues.map((clue, i) => <span key={i}>{clue.join(' ')}</span>)}</div>
            <div className="nonogram-grid" data-logic-grid role="grid">{p.values.map((value, i) => {
              const state = value === 1 ? 'filled' : value === 2 ? 'crossed' : 'unknown';
              return <button data-cell={i} key={i} className={state} onKeyDown={e => puzzleGridKeyDown(e, i, p.size, p.values.length)} onClick={() => toggleNonogramCell(i)} aria-label={`Nonogram cell ${i + 1}, ${state}`}>{value === 2 ? '×' : ''}</button>;
            })}</div>
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
