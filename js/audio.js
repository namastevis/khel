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

export const sfx = {
  tap:     () => tone(660, 0, 0.07, { type: 'triangle', gain: 0.10 }),
  roll:    () => { for (let i = 0; i < 5; i++) tone(240 + Math.random() * 260, i * 0.055, 0.05, { type: 'square', gain: 0.05 }); },
  land:    () => tone(520, 0, 0.10, { type: 'triangle', gain: 0.12, slideTo: 700 }),
  hop:     () => tone(880, 0, 0.055, { type: 'sine', gain: 0.07 }),
  enter:   () => { tone(523, 0, 0.10); tone(784, 0.08, 0.14); },
  capture: () => { tone(420, 0, 0.16, { type: 'sawtooth', gain: 0.13, slideTo: 130 }); },
  home:    () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.085, 0.20, { gain: 0.13 })); },
  skip:    () => tone(300, 0, 0.16, { type: 'sine', gain: 0.09, slideTo: 200 }),
  win:     () => {
    [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) =>
      tone(f, i * 0.13, 0.30, { type: 'triangle', gain: 0.15 }));
  },
};
