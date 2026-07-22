import homeTheme from '../assets/music/raw/home-theme.mp3';
import topsoilCrypts from '../assets/music/raw/delve-topsoil-crypts.mp3';
import fogGalleries from '../assets/music/raw/delve-fog-galleries.mp3';
import machineSeam from '../assets/music/raw/delve-machine-seam.mp3';
import machineRequiem from '../assets/music/raw/machine-requiem.mp3';
import fallingCandlelight from '../assets/music/raw/falling-candlelight.mp3';
import coinwhiskersBargain from '../assets/music/raw/coinwhiskers-bargain.mp3';
import wardensBelow from '../assets/music/raw/wardens-below.mp3';
import survivorsDawn from '../assets/music/raw/survivors-dawn.mp3';
import cryptRemembered from '../assets/music/raw/crypt-remembered.mp3';
import defeatLament from '../assets/music/raw/defeat-lament.mp3';

/* CRYPTSWEEPER — recorded soundtrack plus a quiet generative ambient layer.
   The supplied songs carry the melody while WebAudio adds a slow drone,
   cave details, and combat pulse. Each stratum gets its own recording.
   Music owns a separate AudioContext from sfx so visibility changes never
   interfere with effect playback.
   Browsers gate audio behind a user gesture, so the score arms itself and
   starts on the first pointer/key input. No-ops outside the browser. */

const AC = typeof window !== 'undefined' ? (window.AudioContext || window.webkitAudioContext) : null;

const BASE_ROOT = 55; // A1 — drones live here, plucks two-plus octaves up

/* semis: transpose from A1 · scale: pluck intervals · density: pluck chance per tick
   drone/cutoff: bed volume and lowpass color · pulse: heartbeat period in seconds */
const MOODS = {
  /* Every mode stays inside the crypt: minor seconds, minor thirds, diminished fifths,
     and no bright oscillator voice. Screens change pace and pressure, not genre.
     drip/bell: per-tick chance of a cave drip or distant graveyard toll · wind: draft level */
  title:   { semis: -5, scale: [0, 1, 3, 5, 6, 8, 10], density: .12, drone: .58, cutoff: 620,  pulse: 0,    interval: 1, bright: false, drip: .05, bell: .010, wind: .6 },
  delve:   { semis: -7, scale: [0, 1, 3, 5, 7, 8, 10], density: .16, drone: .60, cutoff: 820,  pulse: 0,    interval: 7, bright: false, drip: .06, bell: .006, wind: .8 },
  camp:    { semis: -3, scale: [0, 2, 3, 5, 7, 8, 10], density: .09, drone: .43, cutoff: 980,  pulse: 0,    interval: 3, bright: false, drip: .04, bell: .005, wind: .4 },
  shop:    { semis: -2, scale: [0, 1, 3, 5, 7, 8, 11], density: .19, drone: .40, cutoff: 1050, pulse: 0,    interval: 3, bright: false, drip: .03, bell: 0,    wind: .3 },
  combat:  { semis: -8, scale: [0, 1, 3, 5, 6, 8, 10], density: .29, drone: .65, cutoff: 1250, pulse: 1.05, interval: 6, bright: false, drip: .04, bell: 0,    wind: 1.0 },
  boss:    { semis: -11,scale: [0, 1, 3, 4, 6, 8, 9],  density: .35, drone: .74, cutoff: 1400, pulse: .78,  interval: 6, bright: false, drip: .04, bell: .004, wind: 1.2 },
  defeat:  { semis: -10,scale: [0, 1, 3, 5, 6],        density: .04, drone: .42, cutoff: 420,  pulse: 0,    interval: 1, bright: false, drip: .06, bell: .020, wind: .7 },
  victory: { semis: -1, scale: [0, 2, 3, 5, 7, 8, 11], density: .18, drone: .48, cutoff: 1200, pulse: 0,    interval: 3, bright: false, drip: .03, bell: .012, wind: .4 },
  finale:  { semis: -1, scale: [0, 2, 3, 5, 7, 8, 11], density: .10, drone: .44, cutoff: 1050, pulse: 0,    interval: 3, bright: false, drip: .02, bell: .010, wind: .3 },
};
const DARKENED = new Set(['delve', 'combat', 'boss']);

let ctx = null, master = null, filter = null, droneGain = null, delaySend = null, windGain = null;
let droneOscs = [];
let timer = null, started = false, armed = false;
let desired = { mood: 'title', stratum: 0 };
let preview = null; // jukebox override: { id, mood, stratum } — wins over `desired` until cleared
let recording = null, recordingId = null;
let paused = false, looping = true, musicVolume = 1;
const PARAM_DEFAULTS = {
  ambient: 0.65, activity: 0.5, cave: 0.5, pulse: 0.5,
  branch: 0.35, segment: 0.4, distance: 0.35,
};
let parameterProfiles = { game: { ...PARAM_DEFAULTS }, jukebox: { ...PARAM_DEFAULTS } };
let nextRemixAt = 0;
let danger = 0;
let stepIx = 4;
let nextPulse = 0;
let off = false;
try { off = typeof localStorage !== 'undefined' && localStorage.getItem('cs_music_off') === '1'; } catch { /* private mode */ }
try { looping = typeof localStorage === 'undefined' || localStorage.getItem('cs_music_loop') !== '0'; } catch { /* private mode */ }
try { musicVolume = Math.max(0, Math.min(1, Number(localStorage.getItem('cs_music_volume') ?? 1))); } catch { /* private mode */ }
function cleanParams(saved = {}) {
  return Object.fromEntries(Object.entries(PARAM_DEFAULTS).map(([key, fallback]) => [key,
    Math.max(0, Math.min(1, Number.isFinite(Number(saved[key])) ? Number(saved[key]) : fallback))]));
}
try {
  const legacy = JSON.parse(localStorage.getItem('cs_infinite_music_params') || '{}');
  parameterProfiles.game = cleanParams(JSON.parse(localStorage.getItem('cs_infinite_music_game') || JSON.stringify(legacy)));
  parameterProfiles.jukebox = cleanParams(JSON.parse(localStorage.getItem('cs_infinite_music_jukebox') || '{}'));
} catch { parameterProfiles = { game: { ...PARAM_DEFAULTS }, jukebox: { ...PARAM_DEFAULTS } }; }

function active() { return preview || desired; }
function mood() { return MOODS[active().mood] || MOODS.title; }
function profileName() { return preview ? 'jukebox' : 'game'; }
function activeParams() { return parameterProfiles[profileName()]; }
function infinitePlayback() { return !preview || preview.playbackMode !== 'direct'; }
function ambientGain() { return infinitePlayback() ? Math.max(0.0001, 0.1 * activeParams().ambient * musicVolume) : 0.0001; }

const RECORDINGS = {
  home: homeTheme,
  topsoil: topsoilCrypts,
  fog: fogGalleries,
  machineSeam,
  machineRequiem,
  camp: fallingCandlelight,
  shop: coinwhiskersBargain,
  boss: wardensBelow,
  victory: survivorsDawn,
  finale: cryptRemembered,
  defeat: defeatLament,
};

function recordingFor(state = active()) {
  if (state.recording) return state.recording;
  if (state.mood === 'title') return 'home';
  if (state.mood === 'camp') return 'camp';
  if (state.mood === 'shop') return 'shop';
  if (state.mood === 'defeat') return 'defeat';
  if (state.mood === 'victory') return 'victory';
  if (state.mood === 'finale') return 'finale';
  if (state.mood === 'boss') return state.stratum >= 2 ? 'machineRequiem' : 'boss';
  if (state.mood === 'delve' || state.mood === 'combat') {
    return ['topsoil', 'fog', 'machineSeam'][Math.max(0, Math.min(2, state.stratum || 0))];
  }
  return null;
}

function stopRecording() {
  if (recording) {
    recording.pause();
    recording.removeAttribute('src');
    recording.load();
  }
  recording = null;
  recordingId = null;
}

function syncRecording() {
  if (off || paused || !started || typeof Audio === 'undefined') return;
  const id = recordingFor();
  if (!id || !RECORDINGS[id]) { stopRecording(); return; }
  if (recordingId !== id) {
    stopRecording();
    recording = new Audio(RECORDINGS[id]);
    recording.loop = infinitePlayback() || looping;
    recording.preload = 'auto';
    recording.volume = 0.58 * musicVolume;
    recordingId = id;
    nextRemixAt = 0;
  }
  recording.play().catch(() => {
    /* A platform may still defer playback until its next user gesture. */
  });
}

function rootHz() {
  const darken = DARKENED.has(active().mood) ? active().stratum : 0;
  return BASE_ROOT * 2 ** ((mood().semis - darken) / 12);
}

function applyMood() {
  if (!ctx) return;
  const m = mood();
  const p = activeParams();
  const t = ctx.currentTime;
  const f = rootHz();
  droneOscs[0]?.frequency.setTargetAtTime(f, t, 1.2);
  droneOscs[1]?.frequency.setTargetAtTime(f * 1.007, t, 1.2); // slow beating against the root
  droneOscs[2]?.frequency.setTargetAtTime(f * 2 ** (m.interval / 12), t, 1.2);
  filter.frequency.setTargetAtTime(m.cutoff + danger * 160, t, 1.0);
  droneGain.gain.setTargetAtTime(m.drone * 0.085, t, 1.5);
  master.gain.setTargetAtTime(ambientGain(), t, 0.08);
  windGain?.gain.setTargetAtTime(m.wind * 0.044 * p.cave, t, 2.0);
  nextPulse = t + 0.8;
  syncRecording();
}

/* a single water drop somewhere off in the dark, caught by the cavern echo */
function drip() {
  const t0 = ctx.currentTime + 0.02;
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.type = 'sine';
  const f = 1400 + Math.random() * 1300;
  osc.frequency.setValueAtTime(f, t0);
  osc.frequency.exponentialRampToValueAtTime(f * 0.4, t0 + 0.07);
  env.gain.setValueAtTime(0.045, t0);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.09);
  osc.connect(env);
  env.connect(delaySend); // mostly echo — the drop is far away
  osc.start(t0);
  osc.stop(t0 + 0.12);
}

/* a distant, slightly out-of-tune graveyard bell */
function bell() {
  const t0 = ctx.currentTime + 0.02;
  const base = 98 * (1 + (Math.random() - 0.5) * 0.015);
  for (const [ratio, g, dur] of [[1, .05, 4.5], [2.76, .02, 3.2], [5.4, .01, 1.8]]) {
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(base * ratio, t0);
    env.gain.setValueAtTime(g, t0);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(env);
    env.connect(filter);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }
}

function pluck() {
  const m = mood();
  const scale = m.scale;
  const span = scale.length * 2; // walk across two octaves
  stepIx += [-2, -1, -1, 1, 1, 2][Math.floor(Math.random() * 6)];
  stepIx = Math.max(0, Math.min(span - 1, stepIx));
  const freq = rootHz() * 2 ** (2 + Math.floor(stepIx / scale.length) + scale[stepIx % scale.length] / 12);

  const t0 = ctx.currentTime + 0.03;
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.type = m.bright ? 'square' : 'triangle';
  osc.frequency.setValueAtTime(freq, t0);
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.exponentialRampToValueAtTime(m.bright ? 0.038 : 0.07, t0 + 0.02);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + 2.2);
  osc.connect(env);
  env.connect(filter);
  env.connect(delaySend);
  osc.start(t0);
  osc.stop(t0 + 2.3);
}

function heartbeat() {
  const t0 = ctx.currentTime + 0.02;
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(rootHz() * 2, t0);
  osc.frequency.exponentialRampToValueAtTime(rootHz(), t0 + 0.3);
  env.gain.setValueAtTime(0.18 * activeParams().pulse, t0);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.32);
  osc.connect(env);
  env.connect(master);
  osc.start(t0);
  osc.stop(t0 + 0.35);
}

function tick() {
  if (!ctx || ctx.state !== 'running') return;
  const m = mood();
  const p = activeParams();
  if (infinitePlayback()) {
    const activity = 0.25 + p.activity * 1.5;
    if (Math.random() < m.density * activity) pluck();
    if (Math.random() < m.drip * p.cave * 2) drip();
    if (Math.random() < m.bell * p.cave * 2) bell();
    if (m.pulse && p.pulse > 0 && ctx.currentTime >= nextPulse) {
      heartbeat(); nextPulse = ctx.currentTime + m.pulse * (1 - danger * 0.25);
    }
    remixTick(p);
  }
}

/* The infinite player periodically branches to another distant section of the
   same recording. It is intentionally conservative: direct mode never seeks,
   and short/unfinished media simply loops without branching. */
function remixTick(p) {
  if (!recording || recording.paused || !Number.isFinite(recording.duration) || recording.duration < 45) return;
  const sectionLength = 5 + p.segment * 20;
  if (!nextRemixAt) nextRemixAt = recording.currentTime + sectionLength;
  if (recording.currentTime < nextRemixAt) return;
  if (Math.random() < p.branch) {
    const margin = 8;
    const minimumDistance = 10 + p.distance * Math.min(80, recording.duration / 2);
    let target = recording.currentTime;
    for (let attempt = 0; attempt < 12 && Math.abs(target - recording.currentTime) < minimumDistance; attempt++) {
      target = margin + Math.random() * Math.max(1, recording.duration - margin * 2);
    }
    if (Math.abs(target - recording.currentTime) >= minimumDistance) recording.currentTime = target;
  }
  nextRemixAt = recording.currentTime + sectionLength;
}

function start() {
  if (started || off || !AC) return;
  started = true;
  ctx = new AC();

  master = ctx.createGain();
  master.gain.setValueAtTime(0.0001, ctx.currentTime);
  /* The generated bed stays below the mastered soundtrack recordings. */
  master.gain.exponentialRampToValueAtTime(ambientGain(), ctx.currentTime + 4);
  master.connect(ctx.destination);

  filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 800;
  filter.Q.value = 0.6;
  filter.connect(master);

  droneGain = ctx.createGain();
  droneGain.gain.value = 0.0001;
  droneGain.connect(filter);
  droneOscs = ['sine', 'sine', 'triangle'].map(type => {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = BASE_ROOT;
    osc.connect(droneGain);
    osc.start();
    return osc;
  });

  /* the drone breathes — a very slow LFO wobbles its gain */
  const lfo = ctx.createOscillator();
  const lfoDepth = ctx.createGain();
  lfo.frequency.value = 0.06;
  lfoDepth.gain.value = 0.014;
  lfo.connect(lfoDepth);
  lfoDepth.connect(droneGain.gain);
  lfo.start();

  /* a draft moving through the tunnels — looped noise, muffled low, slowly swelling */
  const windLen = Math.floor(ctx.sampleRate * 2);
  const windBuf = ctx.createBuffer(1, windLen, ctx.sampleRate);
  const wd = windBuf.getChannelData(0);
  for (let i = 0; i < windLen; i++) wd[i] = Math.random() * 2 - 1;
  const windSrc = ctx.createBufferSource();
  windSrc.buffer = windBuf;
  windSrc.loop = true;
  const windFilter = ctx.createBiquadFilter();
  windFilter.type = 'lowpass';
  windFilter.frequency.value = 170;
  windFilter.Q.value = 1.1;
  windGain = ctx.createGain();
  windGain.gain.value = 0.0001;
  windSrc.connect(windFilter);
  windFilter.connect(windGain);
  windGain.connect(master);
  windSrc.start();
  const windLfo = ctx.createOscillator();
  const windLfoDepth = ctx.createGain();
  windLfo.frequency.value = 0.037;
  windLfoDepth.gain.value = 0.011;
  windLfo.connect(windLfoDepth);
  windLfoDepth.connect(windGain.gain);
  windLfo.start();

  /* cavern echo for the plucks */
  delaySend = ctx.createGain();
  delaySend.gain.value = 0.55;
  const delay = ctx.createDelay(1.5);
  delay.delayTime.value = 0.42;
  const fb = ctx.createGain();
  fb.gain.value = 0.38;
  delaySend.connect(delay);
  delay.connect(fb);
  fb.connect(delay);
  delay.connect(filter);

  applyMood();
  timer = setInterval(tick, 250);
}

function stop() {
  if (timer) { clearInterval(timer); timer = null; }
  if (ctx) {
    const closing = ctx;
    try { master.gain.setTargetAtTime(0.0001, closing.currentTime, 0.12); } catch { /* context already dead */ }
    setTimeout(() => closing.close().catch(() => {}), 500);
  }
  ctx = master = filter = droneGain = delaySend = windGain = null;
  droneOscs = [];
  stopRecording();
  started = false;
}

/* Browsers refuse audio before a user gesture; start on the first one. */
function arm() {
  if (armed || started || off || !AC) return;
  armed = true;
  const kick = () => {
    window.removeEventListener('pointerdown', kick);
    window.removeEventListener('keydown', kick);
    armed = false;
    start();
  };
  window.addEventListener('pointerdown', kick);
  window.addEventListener('keydown', kick);
}

export function setMood(name, stratum = 0) {
  const next = MOODS[name] ? name : 'title';
  /* leaving the title screen ends any jukebox preview — the run takes over */
  if (preview && next !== 'title') preview = null;
  const changed = desired.mood !== next || desired.stratum !== stratum;
  desired = { mood: next, stratum };
  if (started) { if (changed && !preview) applyMood(); }
  else arm();
}

export function setMusicDanger(next) {
  const value = Math.max(0, Math.min(1, Number(next) || 0));
  if (value === danger) return;
  danger = value;
  if (ctx) applyMood();
}

/* ---- jukebox: play any unlocked mood from the title screen ----
   The catalog names match the soundtrack plan in docs/music-prompts.md, so
   when composed tracks replace these generative moods the list stands. */
export const TRACKS = [
  { id: 'title', name: 'Home', detail: 'Main theme', mood: 'title', stratum: 0, recording: 'home', unlock: () => true, hint: '' },
  { id: 'delve1', name: 'Delve — The Topsoil Crypts', detail: 'Stratum 1', mood: 'delve', stratum: 0, recording: 'topsoil', unlock: () => true, hint: '' },
  { id: 'camp', name: 'Falling Candlelight', detail: 'Camp', mood: 'camp', stratum: 0, recording: 'camp', unlock: p => p.campVisits >= 1, hint: 'Rest at a camp' },
  { id: 'shop', name: "Coinwhiskers' Bargain", detail: 'Rat Merchant', mood: 'shop', stratum: 0, recording: 'shop', unlock: p => p.shopVisits >= 1, hint: 'Trade with the Rat Merchant' },
  { id: 'boss', name: 'The Wardens Below', detail: 'Collapser and Fogfather', mood: 'boss', stratum: 0, recording: 'boss', unlock: p => p.bossFights >= 1, hint: 'Face a boss' },
  { id: 'delve2', name: 'Delve — The Fog Galleries', detail: 'Stratum 2', mood: 'delve', stratum: 1, recording: 'fog', unlock: p => p.deepestStratum >= 1, hint: 'Reach Stratum 2' },
  { id: 'delve3', name: 'Delve — The Machine Seam', detail: 'Stratum 3', mood: 'delve', stratum: 2, recording: 'machineSeam', unlock: p => p.deepestStratum >= 2, hint: 'Reach Stratum 3' },
  { id: 'nn99', name: 'The Machine Requiem', detail: 'NN-99', mood: 'boss', stratum: 2, recording: 'machineRequiem', unlock: p => p.deepestStratum >= 2, hint: 'Reach Stratum 3' },
  { id: 'defeat', name: 'Falling Again', detail: 'Defeat', mood: 'defeat', stratum: 0, recording: 'defeat', unlock: p => p.losses >= 1, hint: 'Fall in the Undermine' },
  { id: 'victory', name: "Survivor's Dawn", detail: 'Victory', mood: 'victory', stratum: 0, recording: 'victory', unlock: p => p.wins >= 1, hint: 'Win a run' },
  { id: 'finale', name: 'The Crypt Remembered', detail: 'Finale', mood: 'finale', stratum: 0, recording: 'finale', unlock: p => p.wins >= 1, hint: 'Win a run' },
];

export function previewTrack(track, playbackMode = 'infinite') {
  if (!track || !MOODS[track.mood]) return;
  preview = {
    id: track.id, mood: track.mood, stratum: track.stratum || 0, recording: track.recording,
    playbackMode: playbackMode === 'direct' ? 'direct' : 'infinite',
  };
  /* previews come from a click, so the gesture gate is open */
  if (started) applyMood();
  else if (!off) start();
}
export function stopPreview() {
  if (!preview) return;
  preview = null;
  if (started) applyMood();
}
export function previewingTrackId() { return preview?.id ?? null; }

export function isMusicPaused() { return paused; }
export function setMusicPaused(next) {
  paused = Boolean(next);
  if (paused) recording?.pause();
  else syncRecording();
  return paused;
}
export function restartMusic() {
  if (recording) recording.currentTime = 0;
  if (!paused) syncRecording();
}
export function isMusicLooping() { return looping; }
export function setMusicLooping(next) {
  looping = Boolean(next);
  if (recording) recording.loop = infinitePlayback() || looping;
  try { localStorage.setItem('cs_music_loop', looping ? '1' : '0'); } catch { /* private mode */ }
  return looping;
}
export function getMusicVolume() { return musicVolume; }
export function setMusicVolume(next) {
  musicVolume = Math.max(0, Math.min(1, Number(next)));
  if (recording) recording.volume = 0.58 * musicVolume;
  if (master && ctx) master.gain.setTargetAtTime(ambientGain(), ctx.currentTime, 0.05);
  try { localStorage.setItem('cs_music_volume', String(musicVolume)); } catch { /* private mode */ }
  return musicVolume;
}

export function getInfiniteMusicParams(scope = 'game') {
  const selected = scope === 'jukebox' ? 'jukebox' : 'game';
  return { ...parameterProfiles[selected] };
}
export function setInfiniteMusicParam(scope, key, next) {
  const selected = scope === 'jukebox' ? 'jukebox' : 'game';
  if (!(key in PARAM_DEFAULTS)) return getInfiniteMusicParams(selected);
  parameterProfiles = {
    ...parameterProfiles,
    [selected]: { ...parameterProfiles[selected], [key]: Math.max(0, Math.min(1, Number(next))) },
  };
  try { localStorage.setItem(`cs_infinite_music_${selected}`, JSON.stringify(parameterProfiles[selected])); } catch { /* private mode */ }
  if (ctx && profileName() === selected) applyMood();
  return getInfiniteMusicParams(selected);
}

export function suspendMusic() {
  recording?.pause();
  ctx?.suspend().catch(() => {});
}
export function resumeMusic() {
  if (off) return;
  ctx?.resume().then(() => { if (!paused) syncRecording(); }).catch(() => {});
}

export function isMusicOff() { return off; }
export function toggleMusicOff() {
  off = !off;
  try { localStorage.setItem('cs_music_off', off ? '1' : '0'); } catch { /* private mode */ }
  if (off) { preview = null; stop(); } // silencing music also ends any jukebox preview
  else start(); // called from the toggle's own click, so the gesture gate is open
  return off;
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) suspendMusic();
    else resumeMusic();
  });
  window.addEventListener('pagehide', suspendMusic);
}
