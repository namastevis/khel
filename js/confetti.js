/* Paper for the winner. Runs for a few seconds, then clears itself;
   the returned function stops it early. */

const PALETTE = ['#F0544F', '#3FBF6F', '#FFC531', '#4A9BE8', '#FFFDF6'];

export function confetti(canvas, { pieces = 130, ms = 9000 } = {}) {
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(globalThis.devicePixelRatio || 1, 2);
  const W = canvas.clientWidth || 320;
  const H = canvas.clientHeight || 480;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const bits = Array.from({ length: pieces }, () => ({
    x: Math.random() * W,
    y: -20 - Math.random() * H * 0.7,
    vx: (Math.random() - 0.5) * 1.6,
    vy: 1.6 + Math.random() * 2.6,
    w: 6 + Math.random() * 8,
    h: 8 + Math.random() * 10,
    a: Math.random() * Math.PI,
    va: (Math.random() - 0.5) * 0.22,
    c: PALETTE[(Math.random() * PALETTE.length) | 0],
  }));

  let stop = false;
  const t0 = performance.now();

  (function frame(t) {
    if (stop) return;
    ctx.clearRect(0, 0, W, H);
    for (const b of bits) {
      b.x += b.vx; b.y += b.vy; b.a += b.va;
      if (b.y > H + 30) { b.y = -20; b.x = Math.random() * W; }
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.a);
      ctx.fillStyle = b.c;
      ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h);
      ctx.restore();
    }
    if (t - t0 < ms) requestAnimationFrame(frame);
    else ctx.clearRect(0, 0, W, H);
  })(t0);

  return () => { stop = true; ctx.clearRect(0, 0, W, H); };
}
