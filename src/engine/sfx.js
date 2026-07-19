/* CRYPTSWEEPER — synthesized sound effects (WebAudio, no assets).
   No-ops outside the browser so the engine stays testable in Node.
   The AudioContext is created lazily inside user-gesture call stacks. */

const AC = typeof window !== 'undefined' ? (window.AudioContext || window.webkitAudioContext) : null;
let ctx = null;
let master = null;
let muted = false;
try { muted = typeof localStorage !== 'undefined' && localStorage.getItem('cs_muted') === '1'; } catch { /* private mode */ }
const lastPlayed = {};

function ensure() {
  if (!AC) return null;
  if (!ctx) {
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.4;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function isMuted() { return muted; }
export function toggleMuted() {
  muted = !muted;
  try { localStorage.setItem('cs_muted', muted ? '1' : '0'); } catch { /* private mode */ }
  return muted;
}

function tone({ f = 440, f2, t = 0.12, type = 'sine', g = 0.18, when = 0 }) {
  const o = ctx.createOscillator();
  const gn = ctx.createGain();
  const t0 = ctx.currentTime + when;
  o.type = type;
  o.frequency.setValueAtTime(f, t0);
  if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t0 + t);
  gn.gain.setValueAtTime(g, t0);
  gn.gain.exponentialRampToValueAtTime(0.0001, t0 + t);
  o.connect(gn); gn.connect(master);
  o.start(t0); o.stop(t0 + t + 0.02);
}

function noise({ t = 0.15, fc = 1000, fc2, q = 1, g = 0.25, type = 'lowpass', when = 0 }) {
  const len = Math.max(1, Math.floor(ctx.sampleRate * t));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource(); src.buffer = buf;
  const flt = ctx.createBiquadFilter(); flt.type = type;
  const t0 = ctx.currentTime + when;
  flt.frequency.setValueAtTime(fc, t0);
  if (fc2) flt.frequency.exponentialRampToValueAtTime(Math.max(20, fc2), t0 + t);
  flt.Q.value = q;
  const gn = ctx.createGain();
  gn.gain.setValueAtTime(g, t0);
  gn.gain.exponentialRampToValueAtTime(0.0001, t0 + t);
  src.connect(flt); flt.connect(gn); gn.connect(master);
  src.start(t0);
}

const RECIPES = {
  /* board */
  dig:      () => { noise({ t: .07, fc: 900, g: .16 }); tone({ f: 190, f2: 130, t: .07, type: 'triangle', g: .11 }); },
  cascade:  () => { for (let i = 0; i < 4; i++) tone({ f: 240 + i * 90, t: .06, type: 'triangle', g: .08, when: i * 0.045 }); noise({ t: .2, fc: 700, g: .09 }); },
  flag:     () => tone({ f: 660, f2: 990, t: .07, type: 'square', g: .06 }),
  scan:     () => { tone({ f: 1180, t: .16, g: .09 }); tone({ f: 1180, t: .1, g: .035, when: .18 }); },
  entomb:   () => { tone({ f: 90, f2: 55, t: .18, type: 'triangle', g: .3 }); noise({ t: .12, fc: 300, g: .2 }); },
  boom:     () => { noise({ t: .5, fc: 900, fc2: 70, g: .5 }); tone({ f: 110, f2: 38, t: .45, g: .5 }); },
  chord:    () => { [220, 262, 330, 440].forEach((f, i) => tone({ f, t: .18, type: 'triangle', g: .08, when: i * .05 })); },
  boardattack: () => { tone({ f: 130, t: .25, type: 'sawtooth', g: .09 }); tone({ f: 184, t: .25, type: 'sawtooth', g: .07, when: .02 }); },
  /* cards */
  draw:     () => noise({ t: .1, fc: 2400, type: 'highpass', g: .05 }),
  play:     () => { noise({ t: .09, fc: 1800, type: 'highpass', g: .06 }); tone({ f: 330, f2: 520, t: .09, type: 'triangle', g: .07 }); },
  /* combat */
  hit:      () => { tone({ f: 200, f2: 120, t: .09, type: 'square', g: .13 }); noise({ t: .05, fc: 1200, g: .11 }); },
  death:    () => { tone({ f: 300, f2: 55, t: .3, type: 'sawtooth', g: .15 }); noise({ t: .25, fc: 500, fc2: 90, g: .17 }); },
  hurt:     () => tone({ f: 150, f2: 80, t: .17, type: 'sawtooth', g: .2 }),
  block:    () => tone({ f: 520, f2: 470, t: .08, type: 'triangle', g: .11 }),
  plating:  () => { tone({ f: 620, t: .06, type: 'square', g: .07 }); tone({ f: 470, t: .08, type: 'square', g: .07, when: .07 }); },
  fullclear:() => { [262, 330, 392, 523, 659].forEach((f, i) => tone({ f, t: .22, type: 'triangle', g: .1, when: i * .08 })); },
  /* meta */
  coin:     () => { tone({ f: 1568, t: .07, type: 'square', g: .05 }); tone({ f: 2093, t: .12, type: 'square', g: .05, when: .08 }); },
  turn:     () => noise({ t: .18, fc: 500, fc2: 150, g: .11 }),
  defeat:   () => { [330, 262, 208, 156].forEach((f, i) => tone({ f, t: .35, type: 'triangle', g: .12, when: i * .22 })); },
  victory:  () => { [392, 523, 659, 784, 1046].forEach((f, i) => tone({ f, t: .3, type: 'triangle', g: .11, when: i * .12 })); },
};

export function sfx(name) {
  if (muted || !AC) return;
  const recipe = RECIPES[name];
  if (!recipe) return;
  const now = Date.now();
  if (lastPlayed[name] && now - lastPlayed[name] < 60) return; // de-stack burst calls
  lastPlayed[name] = now;
  try {
    if (!ensure()) return;
    recipe();
  } catch { /* audio unavailable */ }
}
