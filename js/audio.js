/* ═══════════════════════════════════════════════════════════════
   audio.js — small, friendly sounds made with the Web Audio API.
   No files to download, nothing to load, nothing to block.
   ═══════════════════════════════════════════════════════════════ */

let ctx = null;
let muted = false;

/* 'ludo.muted' is what this was called before the app became Khel;
   read it once so nobody's setting resets under them. */
try {
  const stored = localStorage.getItem('khel.muted') ?? localStorage.getItem('ludo.muted');
  muted = stored === '1';
} catch { /* private mode */ }

function ac() {
  if (!ctx) {
    const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

/** Browsers need a user gesture before any sound plays. */
export function unlock() { ac(); }

export function isMuted() { return muted; }

export function toggleMute() {
  muted = !muted;
  try {
    localStorage.setItem('khel.muted', muted ? '1' : '0');
    localStorage.removeItem('ludo.muted');
  } catch { /* ignore */ }
  return muted;
}

function tone(freq, start, dur, { type = 'sine', gain = 0.16, slideTo = null } = {}) {
  const a = ac();
  if (!a || muted) return;
  const t = a.currentTime + start;
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(a.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

/* ── noise ────────────────────────────────────────────────
   Oscillators alone can only ever sound like a beep. A card sliding, a
   die rattling in a cup and a piece landing on wood are all *noise*
   shaped by a filter, so there's a short noise buffer here — made once,
   reused, and still nothing to download. */
let noiseBuffer = null;

function noise(start, dur, { gain = 0.1, from = 2000, to = 600, q = 1 } = {}) {
  const a = ac();
  if (!a || muted) return;
  if (!noiseBuffer) {
    noiseBuffer = a.createBuffer(1, a.sampleRate * 0.5, a.sampleRate);
    const d = noiseBuffer.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const t = a.currentTime + start;
  const src = a.createBufferSource();
  src.buffer = noiseBuffer;
  src.loop = true;

  const filter = a.createBiquadFilter();
  filter.type = 'bandpass';
  filter.Q.value = q;
  filter.frequency.setValueAtTime(from, t);
  filter.frequency.exponentialRampToValueAtTime(to, t + dur);

  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

  src.connect(filter).connect(g).connect(a.destination);
  src.start(t);
  src.stop(t + dur + 0.02);
}

/* ── the sounds ───────────────────────────────────────────
   Every one of these is generated here and now: nothing to download,
   nothing to block the first tap, and it all works in aeroplane mode.
   They are deliberately short — a sound a five-year-old will hear a
   hundred times in a sitting has to be over before it can annoy. */
export const sfx = {
  tap:     () => tone(660, 0, 0.06, { type: 'triangle', gain: 0.09 }),
  pop:     () => { tone(880, 0, 0.05, { type: 'sine', gain: 0.10, slideTo: 1250 }); },

  // a card actually leaving the table: a short paper hiss, then a tap
  flip:    () => { noise(0, 0.09, { gain: 0.055, from: 5200, to: 1600, q: 0.7 });
                   tone(520, 0.06, 0.05, { type: 'triangle', gain: 0.07 }); },

  // a die in a cupped hand — several knocks, then it settles
  roll:    () => { for (let i = 0; i < 6; i++) {
                     noise(i * 0.045, 0.05, { gain: 0.05, from: 1400 + Math.random() * 900, to: 380, q: 3 });
                   }
                   tone(180, 0.29, 0.10, { type: 'triangle', gain: 0.09, slideTo: 120 }); },

  land:    () => { noise(0, 0.05, { gain: 0.06, from: 900, to: 260, q: 2 });
                   tone(300, 0, 0.09, { type: 'triangle', gain: 0.10, slideTo: 200 }); },

  hop:     () => tone(760, 0, 0.05, { type: 'sine', gain: 0.07, slideTo: 900 }),

  // finding something: two notes up, and a little sparkle on top
  enter:   () => { tone(587, 0, 0.10, { type: 'triangle', gain: 0.13 });
                   tone(880, 0.075, 0.16, { type: 'triangle', gain: 0.13 });
                   tone(1760, 0.10, 0.10, { type: 'sine', gain: 0.05 }); },

  // getting it wrong should be gentle: a shrug, not a buzzer
  skip:    () => { tone(400, 0, 0.11, { type: 'sine', gain: 0.075, slideTo: 300 });
                   tone(300, 0.08, 0.12, { type: 'sine', gain: 0.06, slideTo: 230 }); },

  // sending someone home is meant to be funny
  capture: () => { tone(760, 0, 0.20, { type: 'sawtooth', gain: 0.11, slideTo: 120 });
                   noise(0.16, 0.07, { gain: 0.05, from: 700, to: 200, q: 2 }); },

  // the tablet has changed hands
  turn:    () => { tone(523, 0, 0.07, { type: 'sine', gain: 0.07 });
                   tone(698, 0.055, 0.11, { type: 'sine', gain: 0.07 }); },

  home:    () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.08, 0.20, { gain: 0.12 })); },

  win:     () => {
    [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) =>
      tone(f, i * 0.13, 0.30, { type: 'triangle', gain: 0.14 }));
    [0, 0.26, 0.52].forEach((t) => noise(t, 0.35, { gain: 0.035, from: 6000, to: 2200, q: 0.6 }));
  },
};
