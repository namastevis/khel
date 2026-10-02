/* The die: one fair roll, and the cowrie shells that show it. */

export function rollDie() {
  if (globalThis.crypto?.getRandomValues) {
    const buf = new Uint8Array(1);
    do { crypto.getRandomValues(buf); } while (buf[0] > 251);   // avoid modulo bias
    return (buf[0] % 6) + 1;
  }
  return Math.floor(Math.random() * 6) + 1;
}

/* Pips are cowrie shells — what Pachisi and Chaupar were thrown with
   before anyone had a dice. Still one number per face, still counted at
   a glance: only the thing doing the counting has changed. Each shell
   leans a little differently so a face looks thrown, not printed. */
const TILT = [-18, 14, -6, 22, -14, 8];

/* Shells are bigger than pips, so they get their own layout: spread
   wider, and scaled up when there are only a few to show. */
const SHELLS = {
  1: { s: 1.7, at: [[50, 50]] },
  2: { s: 1.4, at: [[32, 32], [68, 68]] },
  3: { s: 1.15, at: [[27, 27], [50, 50], [73, 73]] },
  4: { s: 1.3, at: [[30, 30], [70, 30], [30, 70], [70, 70]] },
  5: { s: 1.12, at: [[28, 28], [72, 28], [50, 50], [28, 72], [72, 72]] },
  6: { s: 1.05, at: [[30, 20], [70, 20], [30, 50], [70, 50], [30, 80], [70, 80]] },
};

function cowrie(x, y, i, s = 1) {
  return `<g transform="translate(${x} ${y}) rotate(${TILT[i % TILT.length]}) scale(${s})">
    <ellipse rx="8.8" ry="11.2" fill="#FBEFD6" stroke="#9C7A4B" stroke-width="2"/>
    <path d="M0 -7.6C2.4 -3.4 2.4 3.4 0 7.6-2.4 3.4-2.4 -3.4 0 -7.6z" fill="#43331F"/>
    <path d="M-2.2 -4.2h-2.2M-2.6 0h-2.6M-2.2 4.2h-2.2M2.2 -4.2h2.2M2.6 0h2.6M2.2 4.2h2.2"
      stroke="#9C7A4B" stroke-width="1.3" stroke-linecap="round"/>
  </g>`;
}

/** Paint a face into an <svg viewBox="0 0 100 100">; null paints a resting die. */
export function drawDie(svg, n) {
  if (!n) { svg.innerHTML = '<circle cx="50" cy="50" r="8" fill="#CBBBA0"/>'; return; }
  const { s, at } = SHELLS[n];
  svg.innerHTML = at.map(([x, y], i) => cowrie(x, y, i, s)).join('');
}
