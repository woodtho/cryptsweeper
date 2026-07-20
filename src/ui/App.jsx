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
import { TitleScreen, MapScreen, RewardScreen, CampScreen, ShopScreen, EventScreen, PuzzleScreen, GameOverScreen } from './screens.jsx';
import { CombatScreen } from './CombatScreen.jsx';
import { ModalHost } from './ModalHost.jsx';
import { Toasts } from './Toasts.jsx';
import { MechanicTooltip } from './MechanicTooltip.jsx';
import { Cutscene } from './Cutscene.jsx';

export function App() {
  useGame();
  const [muted, setMuted] = useState(isMuted());
  const [musicOff, setMusicOff] = useState(isMusicOff());
  const [preferences, setPreferences] = useState(loadPreferences);
  const shakeRef = useRef(ui.shakeSeq);

  useEffect(() => {
    applyPreferences(preferences);
  }, [preferences]);

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
      if (ev.key === 'Escape') {
        if (ui.cutscene) { closeCutscene(); return; }
        cancelTargeting();
        if (ui.modal) closeModal();
      }
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
      if (ui.cutscene) { closeCutscene(); return; }
      if (document.querySelector('.mechanic-tooltip')) {
        window.dispatchEvent(new Event('cryptsweeper:close-tooltip'));
        return;
      }
      if (ui.modal) { closeModal(); return; }
      if (ui.targeting || ui.gadgetTargeting) { cancelTargeting(); return; }
      if (!run || ui.screen === 'title') { NativeApp.exitApp(); return; }
      goHome();
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
      <MechanicTooltip />
    </>
  );
}
