import { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as NativeApp } from '@capacitor/app';
import { useGame } from './useGame.js';
import {
  run, ui, cbt, endTurn, cancelTargeting, closeModal, closeCutscene, closeBattlePreview, goHome,
  setRunTimerActive,
} from '../engine/engine.js';
import { getSfxVolume, isMuted, setSfxVolume, toggleMuted } from '../engine/sfx.js';
import { isHapticsEnabled, setHapticsEnabled } from '../engine/haptics.js';
import {
  getMusicVolume, setMood, isMusicOff, setMusicVolume, toggleMusicOff,
  suspendMusic, resumeMusic, setMusicDanger,
} from '../engine/music.js';
import { applyPreferences, loadPreferences, savePreferences } from '../engine/preferences.js';
import { TitleScreen, MapScreen, RewardScreen, CampScreen, ShopScreen, EventScreen, PuzzleScreen, GameOverScreen, InGameMenu } from './screens.jsx';
import { CombatScreen } from './CombatScreen.jsx';
import { ModalHost } from './ModalHost.jsx';
import { Toasts } from './Toasts.jsx';
import { MechanicTooltip } from './MechanicTooltip.jsx';
import { Cutscene } from './Cutscene.jsx';
import { BattlePreview } from './BattlePreview.jsx';
import { TEST_ALL_CASES, runTestCase } from './testCatalog.js';
import { runBackHandlers } from './backNav.js';

/* One ordered back-intent handler for both the Android hardware back button and
   the Escape key. Dismisses the topmost thing first; returns true if it consumed
   the press. `allowLeave` lets hardware-back walk off an in-run screen back to the
   title (Escape does not, so it never abandons a run or exits). */
function handleBack(allowLeave) {
  // topmost transient popover
  if (document.querySelector('.mechanic-tooltip')) {
    window.dispatchEvent(new Event('cryptsweeper:close-tooltip'));
    return true;
  }
  if (ui.modal) { closeModal(); return true; }
  // component-local navigation: title sub-panels, in-game-menu sub-tabs
  if (runBackHandlers()) return true;
  if (document.querySelector('.game-menu-overlay')) {
    window.dispatchEvent(new Event('cryptsweeper:close-game-menu'));
    return true;
  }
  if (ui.cutscene) { closeCutscene(); return true; }
  if (ui.battlePreview) { closeBattlePreview(); return true; }
  if (ui.targeting || ui.gadgetTargeting) { cancelTargeting(); return true; }
  if (allowLeave && run && ui.screen !== 'title') { goHome(); return true; }
  return false;
}

function TestTour({ tour, onMove, onStop }) {
  const item = tour.cases[tour.index];
  if (!item) return null;
  return <aside className="test-tour" aria-live="polite">
    <div><small>{item.section} · {tour.index + 1}/{tour.cases.length}</small><b>{item.label}</b></div>
    <button className="btn" disabled={tour.index === 0} onClick={() => onMove(-1)}>←</button>
    <button className="btn primary" onClick={() => onMove(1)}>{tour.index === tour.cases.length - 1 ? 'Finish' : 'Next →'}</button>
    <button className="btn" onClick={onStop}>×</button>
  </aside>;
}

function MetaFeedback() {
  return <>
    {ui.deckChange && <aside key={ui.deckChange.id} className={`deck-change ${ui.deckChange.kind}`} aria-live="polite">
      <span className="deck-change-mark">{ui.deckChange.kind === 'upgrade' ? '✦' : ui.deckChange.kind === 'remove' ? '✕' : '+'}</span>
      <div><small>Deck changed</small><b>{ui.deckChange.label}</b></div>
    </aside>}
    {ui.achievement && <aside key={ui.achievement.id} className="achievement-unlock" aria-live="polite">
      <span>🏆</span><div><small>Achievement unearthed</small><b>{ui.achievement.name}</b></div>
    </aside>}
  </>;
}

export function App() {
  useGame();
  const [muted, setMuted] = useState(isMuted());
  const [musicOff, setMusicOff] = useState(isMusicOff());
  const [sfxLevel, setSfxLevel] = useState(getSfxVolume());
  const [musicLevel, setMusicLevel] = useState(getMusicVolume());
  const [hapticsOn, setHapticsOn] = useState(isHapticsEnabled());
  const [preferences, setPreferences] = useState(loadPreferences);
  const [gameMenuOpen, setGameMenuOpen] = useState(false);
  const [testTour, setTestTour] = useState(null);
  const shakeRef = useRef(ui.shakeSeq);
  const startTestTour = cases => {
    if (!cases?.length) return;
    setTestTour({ index: 0, cases }); runTestCase(cases[0]);
  };

  useEffect(() => {
    applyPreferences(preferences);
  }, [preferences]);

  useEffect(() => {
    const open = () => setGameMenuOpen(true);
    const close = () => setGameMenuOpen(false);
    window.addEventListener('cryptsweeper:open-game-menu', open);
    window.addEventListener('cryptsweeper:close-game-menu', close);
    return () => {
      window.removeEventListener('cryptsweeper:open-game-menu', open);
      window.removeEventListener('cryptsweeper:close-game-menu', close);
    };
  }, []);

  /* keep the ambient score in step with wherever the player is */
  useEffect(() => {
    let mood = 'title';
    if (ui.cutscene?.id === 'finale') mood = 'finale';
    else if (run && ui.screen !== 'title') {
      if (ui.screen === 'combat') mood = run.combat?.kind === 'boss' ? 'boss' : 'combat';
      else if (ui.screen === 'camp') mood = 'camp';
      else if (ui.screen === 'shop') mood = 'shop';
      else if (ui.screen === 'gameover') mood = 'defeat';
      else if (ui.screen === 'victory') mood = 'victory';
      else mood = 'delve';
    }
    setMood(mood, run?.stratum ?? 0);
  });

  useEffect(() => {
    const ratio = run?.maxHp ? run.hp / run.maxHp : 1;
    setMusicDanger(ui.screen === 'combat' && ratio <= 0.25 ? 1 - ratio * 2 : 0);
  });

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [ui.screen]);

  useEffect(() => {
    const onKey = ev => {
      if (ev.key === 'Escape') { if (handleBack(false)) ev.preventDefault(); return; }
      if (ui.cutscene || ui.battlePreview) return;
      if (!run) return;
      const k = ev.key.toLowerCase();
      if (k === 'e' && ui.screen === 'combat' && run.combat && !cbt().over) endTurn();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return undefined;
    let backListener, stateListener;
    NativeApp.addListener('backButton', () => {
      // full back chain; if nothing consumed it we're at a top level, so leave the app
      if (!handleBack(true)) NativeApp.exitApp();
    }).then(handle => { backListener = handle; });
    /* Android lock/home/app-switch events explicitly suspend both the selected
       jukebox preview and the adaptive home/delve soundtrack. */
    NativeApp.addListener('appStateChange', ({ isActive }) => {
      setRunTimerActive(isActive);
      if (isActive) resumeMusic(); else suspendMusic();
    }).then(handle => { stateListener = handle; });
    return () => { backListener?.remove(); stateListener?.remove(); };
  }, []);

  useEffect(() => {
    const onVisibility = () => setRunTimerActive(!document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  /* mine detonations / heavy hits rattle the whole crypt */
  useEffect(() => {
    if (ui.shakeSeq === shakeRef.current) return;
    shakeRef.current = ui.shakeSeq;
    const el = document.getElementById('app');
    if (!el) return;
    el.classList.remove('shake');
    void el.offsetWidth; // restart the animation
    el.classList.add('shake');
    const t = setTimeout(() => el.classList.remove('shake'), 400);
    return () => clearTimeout(t);
  });

  let screen = null;
  if (!run || ui.screen === 'title') screen = (
    <TitleScreen
      muted={muted}
      musicOff={musicOff}
      sfxLevel={sfxLevel}
      musicLevel={musicLevel}
      hapticsOn={hapticsOn}
      preferences={preferences}
      onMutedChange={() => setMuted(toggleMuted())}
      onMusicOffChange={() => setMusicOff(toggleMusicOff())}
      onSfxLevelChange={value => setSfxLevel(setSfxVolume(value))}
      onMusicLevelChange={value => setMusicLevel(setMusicVolume(value))}
      onHapticsChange={() => setHapticsOn(setHapticsEnabled(!hapticsOn))}
      onPreferenceChange={(key, value) => setPreferences(prev => savePreferences({ ...prev, [key]: value }))}
      onTestAll={() => startTestTour(TEST_ALL_CASES)}
      onTestSection={startTestTour}
    />
  );
  else if (ui.screen === 'map') screen = <MapScreen />;
  else if (ui.screen === 'combat') screen = <CombatScreen preferences={preferences}
    onPreferenceChange={(key, value) => setPreferences(prev => savePreferences({ ...prev, [key]: value }))} />;
  else if (ui.screen === 'reward') screen = <RewardScreen />;
  else if (ui.screen === 'camp') screen = <CampScreen />;
  else if (ui.screen === 'shop') screen = <ShopScreen />;
  else if (ui.screen === 'event') screen = <EventScreen />;
  else if (ui.screen === 'puzzle') screen = <PuzzleScreen />;
  else if (ui.screen === 'gameover') screen = <GameOverScreen won={false} />;
  else if (ui.screen === 'victory') screen = <GameOverScreen won={true} />;

  return (
    <>
      <div id="app" className={run?.maxHp && run.hp / run.maxHp <= 0.25 ? 'critical-health' : ''}>
        {screen}
        <Toasts />
        <ModalHost />
      </div>
      {ui.cutscene && <Cutscene key={ui.cutscene.id} />}
      {ui.battlePreview && !ui.cutscene && <BattlePreview preferences={preferences} onNeverShow={() => {
        setPreferences(prev => savePreferences({ ...prev, showBattleBriefings: false }));
        closeBattlePreview();
      }} />}
      {gameMenuOpen && run && <InGameMenu
        muted={muted} musicOff={musicOff} sfxLevel={sfxLevel} musicLevel={musicLevel} preferences={preferences}
        onMutedChange={() => setMuted(toggleMuted())}
        onMusicOffChange={() => setMusicOff(toggleMusicOff())}
        onSfxLevelChange={value => setSfxLevel(setSfxVolume(value))}
        onMusicLevelChange={value => setMusicLevel(setMusicVolume(value))}
        hapticsOn={hapticsOn} onHapticsChange={() => setHapticsOn(setHapticsEnabled(!hapticsOn))}
        onPreferenceChange={(key, value) => setPreferences(prev => savePreferences({ ...prev, [key]: value }))}
        onClose={() => setGameMenuOpen(false)} />}
      <MechanicTooltip />
      <MetaFeedback />
      {testTour && <TestTour tour={testTour} onStop={() => setTestTour(null)} onMove={delta => {
        const next = testTour.index + delta;
        if (next >= testTour.cases.length) { setTestTour(null); return; }
        if (next < 0) return;
        setTestTour({ ...testTour, index: next }); runTestCase(testTour.cases[next]);
      }} />}
    </>
  );
}
