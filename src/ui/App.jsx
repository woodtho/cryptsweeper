import { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as NativeApp } from '@capacitor/app';
import { useGame } from './useGame.js';
import {
  run, ui, cbt, endTurn, cancelTargeting, closeModal, closeCutscene, goHome,
} from '../engine/engine.js';
import { isMuted, toggleMuted } from '../engine/sfx.js';
import { setMood, isMusicOff, toggleMusicOff } from '../engine/music.js';
import { applyPreferences, loadPreferences, savePreferences } from '../engine/preferences.js';
import { TitleScreen, MapScreen, RewardScreen, CampScreen, ShopScreen, EventScreen, PuzzleScreen, GameOverScreen, InGameMenu } from './screens.jsx';
import { CombatScreen } from './CombatScreen.jsx';
import { ModalHost } from './ModalHost.jsx';
import { Toasts } from './Toasts.jsx';
import { MechanicTooltip } from './MechanicTooltip.jsx';
import { Cutscene } from './Cutscene.jsx';
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

export function App() {
  useGame();
  const [muted, setMuted] = useState(isMuted());
  const [musicOff, setMusicOff] = useState(isMusicOff());
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
    if (run && ui.screen !== 'title') {
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
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [ui.screen]);

  useEffect(() => {
    const onKey = ev => {
      if (ev.key === 'Escape') { if (handleBack(false)) ev.preventDefault(); return; }
      if (ui.cutscene) return;
      if (!run) return;
      const k = ev.key.toLowerCase();
      if (k === 'e' && ui.screen === 'combat' && run.combat && !cbt().over) endTurn();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return undefined;
    let listener;
    NativeApp.addListener('backButton', () => {
      // full back chain; if nothing consumed it we're at a top level, so leave the app
      if (!handleBack(true)) NativeApp.exitApp();
    }).then(handle => { listener = handle; });
    return () => listener?.remove();
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
      preferences={preferences}
      onMutedChange={() => setMuted(toggleMuted())}
      onMusicOffChange={() => setMusicOff(toggleMusicOff())}
      onPreferenceChange={(key, value) => setPreferences(prev => savePreferences({ ...prev, [key]: value }))}
      onTestAll={() => startTestTour(TEST_ALL_CASES)}
      onTestSection={startTestTour}
    />
  );
  else if (ui.screen === 'map') screen = <MapScreen />;
  else if (ui.screen === 'combat') screen = <CombatScreen preferences={preferences} />;
  else if (ui.screen === 'reward') screen = <RewardScreen />;
  else if (ui.screen === 'camp') screen = <CampScreen />;
  else if (ui.screen === 'shop') screen = <ShopScreen />;
  else if (ui.screen === 'event') screen = <EventScreen />;
  else if (ui.screen === 'puzzle') screen = <PuzzleScreen />;
  else if (ui.screen === 'gameover') screen = <GameOverScreen won={false} />;
  else if (ui.screen === 'victory') screen = <GameOverScreen won={true} />;

  return (
    <>
      <div id="app">
        {screen}
        <Toasts />
        <ModalHost />
      </div>
      {ui.cutscene && <Cutscene key={ui.cutscene.id} />}
      {gameMenuOpen && run && <InGameMenu
        muted={muted} musicOff={musicOff} preferences={preferences}
        onMutedChange={() => setMuted(toggleMuted())}
        onMusicOffChange={() => setMusicOff(toggleMusicOff())}
        onPreferenceChange={(key, value) => setPreferences(prev => savePreferences({ ...prev, [key]: value }))}
        onClose={() => setGameMenuOpen(false)} />}
      <MechanicTooltip />
      {testTour && <TestTour tour={testTour} onStop={() => setTestTour(null)} onMove={delta => {
        const next = testTour.index + delta;
        if (next >= testTour.cases.length) { setTestTour(null); return; }
        if (next < 0) return;
        setTestTour({ ...testTour, index: next }); runTestCase(testTour.cases[next]);
      }} />}
    </>
  );
}
