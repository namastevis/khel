/* The die: one fair roll, and the pips that show it. */

const PIPS = {
  1: [[50, 50]],
  2: [[30, 30], [70, 70]],
  3: [[28, 28], [50, 50], [72, 72]],
  4: [[30, 30], [70, 30], [30, 70], [70, 70]],
  5: [[30, 30], [70, 30], [50, 50], [30, 70], [70, 70]],
  6: [[30, 26], [70, 26], [30, 50], [70, 50], [30, 74], [70, 74]],
};

export function rollDie() {
  if (globalThis.crypto?.getRandomValues) {
    const buf = new Uint8Array(1);
    do { crypto.getRandomValues(buf); } while (buf[0] > 251);   // avoid modulo bias
    return (buf[0] % 6) + 1;
  }
  return Math.floor(Math.random() * 6) + 1;
}

/** Paint a face into an <svg viewBox="0 0 100 100">; null paints a resting die. */
export function drawDie(svg, n) {
  if (!n) { svg.innerHTML = '<circle cx="50" cy="50" r="8" fill="#CBBBA0"/>'; return; }
  svg.innerHTML = PIPS[n]
    .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="9.5" fill="#43331F"/>`)
    .join('');
}
