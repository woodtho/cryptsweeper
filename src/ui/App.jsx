import { useEffect, useRef, useState } from 'react';
import { useGame } from './useGame.js';
import {
  run, ui, cbt, endTurn, cancelTargeting, closeModal, toggleFlagMode,
} from '../engine/engine.js';
import { isMuted, toggleMuted } from '../engine/sfx.js';
import { applyPreferences, loadPreferences, savePreferences } from '../engine/preferences.js';
import { TitleScreen, MapScreen, RewardScreen, CampScreen, ShopScreen, EventScreen, PuzzleScreen, GameOverScreen } from './screens.jsx';
import { CombatScreen } from './CombatScreen.jsx';
import { ModalHost } from './ModalHost.jsx';
import { Toasts } from './Toasts.jsx';

export function App() {
  useGame();
  const [muted, setMuted] = useState(isMuted());
  const [preferences, setPreferences] = useState(loadPreferences);
  const shakeRef = useRef(ui.shakeSeq);

  useEffect(() => {
    applyPreferences(preferences);
  }, [preferences]);

  useEffect(() => {
    const onKey = ev => {
      if (ev.key === 'Escape') {
        cancelTargeting();
        if (ui.modal) closeModal();
      }
      if (!run) return;
      const k = ev.key.toLowerCase();
      if (k === 'f' && (ui.screen === 'combat' || ui.screen === 'puzzle')) toggleFlagMode();
      if (k === 'e' && ui.screen === 'combat' && run.combat && !cbt().over) endTurn();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
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
      preferences={preferences}
      onMutedChange={() => setMuted(toggleMuted())}
      onPreferenceChange={(key, value) => setPreferences(prev => savePreferences({ ...prev, [key]: value }))}
    />
  );
  else if (ui.screen === 'map') screen = <MapScreen />;
  else if (ui.screen === 'combat') screen = <CombatScreen />;
  else if (ui.screen === 'reward') screen = <RewardScreen />;
  else if (ui.screen === 'camp') screen = <CampScreen />;
  else if (ui.screen === 'shop') screen = <ShopScreen />;
  else if (ui.screen === 'event') screen = <EventScreen />;
  else if (ui.screen === 'puzzle') screen = <PuzzleScreen />;
  else if (ui.screen === 'gameover') screen = <GameOverScreen won={false} />;
  else if (ui.screen === 'victory') screen = <GameOverScreen won={true} />;

  return (
    <>
      <button className="sndbtn" title={muted ? 'Unmute sounds' : 'Mute sounds'}
        onClick={() => setMuted(toggleMuted())}>
        {muted ? '🔇' : '🔊'}
      </button>
      <div id="app">
        {screen}
        <Toasts />
        <ModalHost />
      </div>
    </>
  );
}
