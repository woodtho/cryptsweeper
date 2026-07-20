/* CRYPTSWEEPER — generative ambient score (WebAudio, no assets).
   One slow breathing drone plus sparse echoed plucks, retuned per screen,
   with a low heartbeat pulse in combat. Each stratum drags the delve keys
   a semitone darker. Owns its own AudioContext (separate from sfx) so it
   can suspend with app visibility without touching effect playback.
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
};
const DARKENED = new Set(['delve', 'combat', 'boss']);

let ctx = null, master = null, filter = null, droneGain = null, delaySend = null, windGain = null;
let droneOscs = [];
let timer = null, started = false, armed = false;
let desired = { mood: 'title', stratum: 0 };
let stepIx = 4;
let nextPulse = 0;
let off = false;
try { off = typeof localStorage !== 'undefined' && localStorage.getItem('cs_music_off') === '1'; } catch { /* private mode */ }

function mood() { return MOODS[desired.mood] || MOODS.title; }

function rootHz() {
  const darken = DARKENED.has(desired.mood) ? desired.stratum : 0;
  return BASE_ROOT * 2 ** ((mood().semis - darken) / 12);
}

function applyMood() {
  if (!ctx) return;
  const m = mood();
  const t = ctx.currentTime;
  const f = rootHz();
  droneOscs[0]?.frequency.setTargetAtTime(f, t, 1.2);
  droneOscs[1]?.frequency.setTargetAtTime(f * 1.007, t, 1.2); // slow beating against the root
  droneOscs[2]?.frequency.setTargetAtTime(f * 2 ** (m.interval / 12), t, 1.2);
  filter.frequency.setTargetAtTime(m.cutoff, t, 1.0);
  droneGain.gain.setTargetAtTime(m.drone * 0.085, t, 1.5);
  windGain?.gain.setTargetAtTime(m.wind * 0.022, t, 2.0);
  nextPulse = t + 0.8;
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
  env.gain.setValueAtTime(0.09, t0);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.32);
  osc.connect(env);
  env.connect(master);
  osc.start(t0);
  osc.stop(t0 + 0.35);
}

function tick() {
  if (!ctx || ctx.state !== 'running') return;
  const m = mood();
  if (Math.random() < m.density) pluck();
  if (Math.random() < m.drip) drip();
  if (Math.random() < m.bell) bell();
  if (m.pulse && ctx.currentTime >= nextPulse) { heartbeat(); nextPulse = ctx.currentTime + m.pulse; }
}

function start() {
  if (started || off || !AC) return;
  started = true;
  ctx = new AC();

  master = ctx.createGain();
  master.gain.setValueAtTime(0.0001, ctx.currentTime);
  master.gain.exponentialRampToValueAtTime(0.15, ctx.currentTime + 4);
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
  const changed = desired.mood !== next || desired.stratum !== stratum;
  desired = { mood: next, stratum };
  if (started) { if (changed) applyMood(); }
  else arm();
}

export function isMusicOff() { return off; }
export function toggleMusicOff() {
  off = !off;
  try { localStorage.setItem('cs_music_off', off ? '1' : '0'); } catch { /* private mode */ }
  if (off) stop();
  else start(); // called from the toggle's own click, so the gesture gate is open
  return off;
}

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend().catch(() => {});
    else if (!off) ctx.resume().catch(() => {});
  });
}
