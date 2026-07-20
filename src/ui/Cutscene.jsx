import { useEffect, useRef, useState } from 'react';
import { CLASSES } from '../engine/data.js';
import { closeCutscene, run, ui } from '../engine/engine.js';
import { sfx } from '../engine/sfx.js';
import { delverPortrait, ratMerchantPortrait } from './portraits.js';
import { loadPreferences } from '../engine/preferences.js';
import { enemyIcon } from './enemyIcons.jsx';
import { GameIcon } from './gameIcons.jsx';
import { ENEMIES } from '../engine/data.js';
import { cutsceneArt } from './cutsceneArt.js';

const TYPE_INTERVAL_MS = 22;

const BOSS_SCENES = [
  {
    name: 'The Collapser', enemyKey: 'collapser', artKey: 'collapser',
    intro: [
      ['narrator', 'The tunnel opens into a chamber held together by one groaning column. Something beneath it turns.'],
      ['boss', 'Every brace breaks. Every roof comes down.'],
      ['player', 'Then I had better choose where it lands.'],
    ],
    aftermath: [
      ['narrator', 'The last stones settle. For the first time in an age, the passage ahead holds.'],
      ['player', 'One seam quiet. Two more below.'],
    ],
  },
  {
    name: 'The Fogfather', enemyKey: 'fogfather', artKey: 'fogfather',
    intro: [
      ['narrator', 'A bell sounds somewhere inside the fog. The answer comes from directly behind you.'],
      ['boss', 'Maps are only promises made by the lost.'],
      ['player', 'Good thing I brought a lamp.'],
    ],
    aftermath: [
      ['narrator', 'The fog thins into silver threads, revealing a shaft that was never on the map.'],
      ['player', 'Good. I was running out of sensible ways down.'],
    ],
  },
  {
    name: 'NN-99', enemyKey: 'nn99', artKey: 'nn99',
    intro: [
      ['narrator', 'An ancient survey engine unfolds above the seam. Its red lens fixes on your heartbeat.'],
      ['boss', 'FAULT DETECTED. DELVER CONFIDENCE EXCEEDS SAFE LIMIT.'],
      ['player', 'Put that in your final report.'],
    ],
    aftermath: [
      ['narrator', 'NN-99 counts down through broken numbers, then falls silent. Something deeper answers once.'],
      ['player', 'The seam is quiet. The mine is not.'],
    ],
  },
];

const SHOP_LINES = [
  [
    ['merchant', 'Easy now, delver. Nothing on my shelves bites unless you haggle.'],
    ['player', 'I need tools, not teeth.'],
    ['merchant', 'Then we understand one another. Dig gold, spend gold, eh?'],
  ],
  [
    ['merchant', 'You made it past the fog. I had six gold riding on the fog.'],
    ['player', 'Add it to my discount.'],
    ['merchant', 'Ha! You are learning the local language.'],
  ],
  [
    ['merchant', 'Deep stock today. Nothing cursed enough to admit it.'],
    ['player', 'And nothing stolen?'],
    ['merchant', 'Everything down here belonged to someone else first.'],
  ],
];

function getScene(id, context = {}) {
  if (id === 'opening') return {
    kind: 'opening', title: 'The Mouth of the Undermine', art: cutsceneArt('opening'), iconName: 'picks', markLabel: 'DESCEND', finalLabel: 'Enter the crypt',
    lines: [
      ['narrator', 'The lift stops where the maps begin lying. Beneath your boots, the Undermine shifts in its sleep.'],
      ['player', 'Lantern trimmed. Deck checked. One way left to go.'],
      ['narrator', 'Every fight is a board. Every choice leaves a mark. Dig carefully.'],
    ],
  };
  if (id === 'shop') return {
    kind: 'merchant', title: 'The Rat Merchant', art: ratMerchantPortrait(), finalLabel: 'See the wares',
    lines: SHOP_LINES[Math.max(0, Math.min(2, context.stratum ?? run.stratum))],
  };
  if (id === 'camp') return {
    kind: 'camp', title: 'A Candle in the Dark', art: cutsceneArt('camp'), iconName: 'camp', markLabel: 'RESPITE', finalLabel: 'Choose how to rest',
    lines: [
      ['narrator', 'A dry ledge, an old fire ring, and just enough silence to hear yourself think.'],
      ['player', 'The dark can wait one more minute.'],
    ],
  };
  if (id === 'descent-1') return {
    kind: 'descent', title: 'The Sunk Archives', art: cutsceneArt('archives'), iconName: 'deck', markLabel: 'STRATUM II', finalLabel: 'Descend',
    lines: [
      ['narrator', 'Below the broken supports, drowned shelves lean into corridors filled with silver fog.'],
      ['player', 'Someone catalogued this place. Let us see what they were afraid to name.'],
    ],
  };
  if (id === 'descent-2') return {
    kind: 'descent', title: 'The Clockwork Depths', art: cutsceneArt('clockwork'), iconName: 'services', markLabel: 'STRATUM III', finalLabel: 'Descend',
    lines: [
      ['narrator', 'The stone gives way to brass. Far below, buried machinery resumes counting your steps.'],
      ['player', 'So much for being unexpected.'],
    ],
  };
  if (id === 'finale') return {
    kind: 'finale', title: 'The Seam Is Silent', art: cutsceneArt('finale'), iconName: 'victory', markLabel: 'FOR NOW', finalLabel: 'See the reckoning',
    lines: [
      ['narrator', 'The last red lens goes dark. Dust drifts through a silence deeper than stone.'],
      ['player', 'Not the bottom. Just the end of this map.'],
      ['narrator', 'Far beneath the Clockwork Depths, the First Mine keeps counting.'],
    ],
  };
  const bossMatch = id.match(/^boss-(intro|aftermath)-(\d)$/);
  if (bossMatch) {
    const phase = bossMatch[1];
    const boss = BOSS_SCENES[Number(bossMatch[2])];
    if (!boss) return null;
    return {
      kind: phase === 'intro' ? 'boss-intro' : 'boss',
      title: boss.name,
      art: cutsceneArt(boss.artKey),
      enemyKey: boss.enemyKey,
      markLabel: phase === 'intro' ? 'BOSS AHEAD' : 'DEFEATED',
      finalLabel: phase === 'intro' ? 'Face the boss' : 'Claim the spoils',
      lines: boss[phase],
    };
  }
  return null;
}

function speakerName(speaker, scene) {
  if (speaker === 'player') return CLASSES[run.cls].name;
  if (speaker === 'merchant') return 'Rat Merchant';
  if (speaker === 'boss') return scene.title;
  return scene.title;
}

function reduceMotion() {
  return typeof document !== 'undefined' && document.documentElement.classList.contains('reduce-motion');
}

export function Cutscene() {
  const active = ui.cutscene;
  const scene = active ? getScene(active.id, active.context) : null;
  const [beat, setBeat] = useState(0);
  const [shown, setShown] = useState(reduceMotion() ? Infinity : 0);
  const skipTypeRef = useRef(false);
  const prefs = loadPreferences();

  const [speaker, line] = scene ? scene.lines[beat] : ['narrator', ''];
  const typing = shown < line.length;
  const lastBeat = scene ? scene.lines.length - 1 : 0;

  const advance = () => {
    if (typing) { setShown(Infinity); return; }
    if (beat < lastBeat) { sfx('draw'); setBeat(current => current + 1); }
    else closeCutscene();
  };
  const goBack = () => {
    if (beat === 0) return;
    skipTypeRef.current = true;
    setBeat(current => current - 1);
  };

  useEffect(() => {
    if (!line || reduceMotion()) return undefined;
    if (skipTypeRef.current) { skipTypeRef.current = false; setShown(Infinity); return undefined; }
    setShown(0);
    const timer = setInterval(() => {
      setShown(current => {
        if (current >= line.length) { clearInterval(timer); return current; }
        return current + 1;
      });
    }, TYPE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [beat, line]);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      if (event.target instanceof HTMLElement && event.target.tagName === 'BUTTON') return;
      event.preventDefault();
      advance();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!active || !scene) return null;

  return (
    <div className="cutscene-overlay" role="dialog" aria-modal="true" aria-label={scene.title}>
      <section className={`cutscene ${scene.kind}`}>
        <div className="cutscene-visual" onClick={advance}>
          <img className={`cutscene-main-art ${speaker === 'merchant' || speaker === 'boss' ? 'speaking' : ''}`}
            src={scene.art} alt={`${scene.title} cutscene`} />
          <div className={`cutscene-player ${speaker === 'player' ? 'speaking' : ''}`}>
            <img src={delverPortrait(run.cls)} alt={CLASSES[run.cls].name} />
          </div>
          {(scene.iconName || scene.enemyKey) && (
            <div className="cutscene-mark" aria-label={`${scene.title}: ${scene.markLabel}`}>
              <span>{scene.enemyKey ? enemyIcon(scene.enemyKey, ENEMIES[scene.enemyKey], prefs) : <GameIcon name={scene.iconName} preferences={prefs} />}</span><small>{scene.markLabel}</small>
            </div>
          )}
          <div className="cutscene-vignette" />
          <span className="cutscene-tap-hint">{typing ? 'Tap to reveal' : 'Tap scene to continue'}</span>
        </div>
        <div className="cutscene-dialogue">
          <div className={`cutscene-speaker ${speaker}`}>{speakerName(speaker, scene)}</div>
          <p className={speaker === 'narrator' ? 'narration' : ''} aria-live="polite">
            <span aria-hidden="true">
              {typing ? line.slice(0, shown) : line}
              {typing && <span className="cutscene-caret" />}
            </span>
            <span className="cutscene-srtext">{line}</span>
          </p>
          <div className="cutscene-actions">
            <button className="cutscene-skip" onClick={closeCutscene}>Skip</button>
            {beat > 0 && <button className="cutscene-back" onClick={goBack}>◂ Back</button>}
            <button className="btn primary" onClick={advance}>
              {typing ? 'Reveal' : beat < lastBeat ? 'Continue' : scene.finalLabel} ▸
            </button>
          </div>
        </div>
        <div className="cutscene-progress" aria-hidden="true">
          {scene.lines.map((_, i) => <i key={i} className={i <= beat ? 'on' : ''} />)}
        </div>
      </section>
    </div>
  );
}
