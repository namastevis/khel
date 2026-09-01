/* ═══════════════════════════════════════════════════════════════
   render.js — everything that draws on the canvas.
   ═══════════════════════════════════════════════════════════════ */

import {
  GRID, COLORS, TRACK, START_INDEX, STAR_INDICES,
  HOME_COLUMN, YARD_ORIGIN, HOME_REL, cellOf,
} from './config.js';

const BOARD_BG = '#FFFDF6';
const CELL_BG  = '#FFFFFF';
const LINE     = '#E3D8C4';
const LINE_STRONG = '#CBBBA0';

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  let size = 0;        // css pixels, square
  let cell = 0;

  function resize(cssSize) {
    const dpr = Math.min(globalThis.devicePixelRatio || 1, 3);
    size = Math.max(120, Math.floor(cssSize));
    cell = size / GRID;
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';
    canvas.width = Math.floor(size * dpr);
    canvas.height = Math.floor(size * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  const px = (v) => v * cell;

  /* ── static board ─────────────────────────────────────────── */
  function drawBoard() {
    ctx.fillStyle = BOARD_BG;
    ctx.fillRect(0, 0, size, size);

    // yards
    for (const color of Object.keys(YARD_ORIGIN)) {
      const [ox, oy] = YARD_ORIGIN[color];
      const c = COLORS[color];
      roundRect(px(ox) + px(0.12), px(oy) + px(0.12), px(5.76), px(5.76), px(0.7));
      ctx.fillStyle = c.main; ctx.fill();

      roundRect(px(ox + 1), px(oy + 1), px(4), px(4), px(0.5));
      ctx.fillStyle = '#FFFDF6'; ctx.fill();

      for (let s = 0; s < 4; s++) {
        const [gx, gy] = cellOf(color, -1, s);
        ctx.beginPath();
        ctx.arc(px(gx), px(gy), px(0.46), 0, Math.PI * 2);
        ctx.fillStyle = c.light;
        ctx.fill();
        ctx.lineWidth = px(0.045);
        ctx.strokeStyle = c.main;
        ctx.stroke();
      }
    }

    // main track
    TRACK.forEach(([c, r], i) => {
      const owner = Object.keys(START_INDEX).find((k) => START_INDEX[k] === i);
      drawCell(c, r, owner ? COLORS[owner].light : CELL_BG);
    });

    // home columns
    for (const color of Object.keys(HOME_COLUMN)) {
      for (const [c, r] of HOME_COLUMN[color]) drawCell(c, r, COLORS[color].main);
    }

    // stars on the safe squares
    for (const i of STAR_INDICES) {
      const [c, r] = TRACK[i];
      drawStar(px(c + 0.5), px(r + 0.5), px(0.3), '#E4BE55');
    }
    // a coloured star on each start square
    for (const color of Object.keys(START_INDEX)) {
      const [c, r] = TRACK[START_INDEX[color]];
      drawStar(px(c + 0.5), px(r + 0.5), px(0.28), COLORS[color].main);
    }

    drawCentre();

    // outer frame
    ctx.lineWidth = px(0.09);
    ctx.strokeStyle = LINE_STRONG;
    roundRect(px(0.05), px(0.05), size - px(0.1), size - px(0.1), px(0.6));
    ctx.stroke();
  }

  function drawCell(c, r, fill) {
    roundRect(px(c) + px(0.045), px(r) + px(0.045), px(0.91), px(0.91), px(0.16));
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.lineWidth = px(0.035);
    ctx.strokeStyle = LINE;
    ctx.stroke();
  }

  function drawCentre() {
    const x0 = px(6), y0 = px(6), s = px(3);
    const cx = x0 + s / 2, cy = y0 + s / 2;

    roundRect(x0, y0, s, s, px(0.3));
    ctx.save();
    ctx.clip();
    const tri = [
      ['red',    [x0, y0], [x0, y0 + s]],
      ['green',  [x0, y0], [x0 + s, y0]],
      ['yellow', [x0 + s, y0], [x0 + s, y0 + s]],
      ['blue',   [x0, y0 + s], [x0 + s, y0 + s]],
    ];
    for (const [color, a, b] of tri) {
      ctx.beginPath();
      ctx.moveTo(cx, cy); ctx.lineTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.closePath();
      ctx.fillStyle = COLORS[color].main;
      ctx.fill();
    }
    ctx.restore();

    ctx.lineWidth = px(0.06);
    ctx.strokeStyle = '#FFFDF6';
    roundRect(x0, y0, s, s, px(0.3));
    ctx.stroke();

    drawStar(cx, cy, px(0.42), 'rgba(255,253,246,.9)');
  }

  /* ── tokens ───────────────────────────────────────────────── */

  /**
   * opts = { moving: {player, token, cell:[x,y]} | null,
   *          highlight: [tokenIdx…], time: ms }
   */
  function drawTokens(g, opts = {}) {
    const { moving = null, highlight = [], time = 0 } = opts;
    const spots = [];

    g.players.forEach((p, pi) => {
      p.tokens.forEach((rel, ti) => {
        if (moving && moving.player === pi && moving.token === ti) return;
        const slot = (rel === -1 || rel === HOME_REL) ? ti : 0;
        const [gx, gy] = cellOf(p.color, rel, slot);
        spots.push({ pi, ti, color: p.color, gx, gy, stackable: rel >= 0 && rel < HOME_REL });
      });
    });

    // fan out tokens that share a square
    const groups = new Map();
    for (const s of spots) {
      if (!s.stackable) continue;
      const key = `${Math.round(s.gx * 4)}:${Math.round(s.gy * 4)}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(s);
    }
    for (const list of groups.values()) {
      if (list.length < 2) continue;
      list.forEach((s, i) => {
        const a = (i / list.length) * Math.PI * 2 - Math.PI / 2;
        s.gx += Math.cos(a) * 0.17;
        s.gy += Math.sin(a) * 0.17;
        s.small = true;
      });
    }

    for (const s of spots) {
      const glow = s.pi === g.turn && highlight.includes(s.ti) && !g.winner;
      pawn(px(s.gx), px(s.gy), px(s.small ? 0.30 : 0.36), s.color, glow, time);
    }

    if (moving) {
      const p = g.players[moving.player];
      pawn(px(moving.cell[0]), px(moving.cell[1]), px(0.40), p.color, false, time, true);
    }
  }

  function pawn(x, y, r, colorKey, glow, time, lifted = false) {
    const c = COLORS[colorKey];

    if (glow) {
      const t = (Math.sin(time / 260) + 1) / 2;
      ctx.beginPath();
      ctx.arc(x, y - r * 0.1, r * (1.35 + t * 0.22), 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 205, 60, ${0.20 + t * 0.28})`;
      ctx.fill();
    }

    // ground shadow
    ctx.beginPath();
    ctx.ellipse(x, y + r * 0.72, r * (lifted ? 0.65 : 0.8), r * 0.26, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(67,51,31,.20)';
    ctx.fill();

    const lift = lifted ? -r * 0.28 : 0;

    // body
    ctx.beginPath();
    ctx.arc(x, y + r * 0.24 + lift, r * 0.66, 0, Math.PI * 2);
    ctx.fillStyle = c.main; ctx.fill();
    ctx.lineWidth = r * 0.16; ctx.strokeStyle = c.dark; ctx.stroke();

    // head
    ctx.beginPath();
    ctx.arc(x, y - r * 0.46 + lift, r * 0.44, 0, Math.PI * 2);
    ctx.fillStyle = c.main; ctx.fill();
    ctx.lineWidth = r * 0.16; ctx.strokeStyle = c.dark; ctx.stroke();

    // glossy dot
    ctx.beginPath();
    ctx.ellipse(x - r * 0.16, y - r * 0.58 + lift, r * 0.15, r * 0.11, -0.5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,.75)';
    ctx.fill();
  }

  /* ── hit testing ──────────────────────────────────────────── */
  function tokenAt(g, clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const x = (clientX - rect.left) / rect.width * GRID;
    const y = (clientY - rect.top) / rect.height * GRID;
    const me = g.players[g.turn];
    let best = null, bestD = 1.0;
    me.tokens.forEach((rel, ti) => {
      const [gx, gy] = cellOf(me.color, rel, (rel === -1 || rel === HOME_REL) ? ti : 0);
      const d = Math.hypot(gx - x, gy - y);
      if (d < bestD) { bestD = d; best = ti; }
    });
    return best;
  }

  /* ── small shape helpers ──────────────────────────────────── */
  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawStar(cx, cy, r, fill) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const rad = i % 2 === 0 ? r : r * 0.45;
      const a = (Math.PI / 5) * i - Math.PI / 2;
      const x = cx + Math.cos(a) * rad, y = cy + Math.sin(a) * rad;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
  }

  function draw(g, opts) {
    drawBoard();
    drawTokens(g, opts);
  }

  return { resize, draw, tokenAt, get size() { return size; } };
}

/* ═══════════════ confetti for the winner ═══════════════ */
export function confettiBurst(canvas) {
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(globalThis.devicePixelRatio || 1, 2);
  const W = canvas.clientWidth || 320, H = canvas.clientHeight || 480;
  canvas.width = W * dpr; canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const palette = [COLORS.red.main, COLORS.green.main, COLORS.yellow.main, COLORS.blue.main, '#FFFDF6'];
  const bits = Array.from({ length: 130 }, () => ({
    x: Math.random() * W,
    y: -20 - Math.random() * H * 0.7,
    vx: (Math.random() - 0.5) * 1.6,
    vy: 1.6 + Math.random() * 2.6,
    w: 6 + Math.random() * 8,
    h: 8 + Math.random() * 10,
    a: Math.random() * Math.PI,
    va: (Math.random() - 0.5) * 0.22,
    c: palette[(Math.random() * palette.length) | 0],
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
      ctx.translate(b.x, b.y); ctx.rotate(b.a);
      ctx.fillStyle = b.c;
      ctx.fillRect(-b.w / 2, -b.h / 2, b.w, b.h);
      ctx.restore();
    }
    if (t - t0 < 9000) requestAnimationFrame(frame);
    else ctx.clearRect(0, 0, W, H);
  })(t0);

  return () => { stop = true; ctx.clearRect(0, 0, W, H); };
}
