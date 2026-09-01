/* ═══════════════════════════════════════════════════════════════
   render.js — the board, the snakes, the ladders, the pieces.
   ═══════════════════════════════════════════════════════════════ */

import { SIDE, COLORS, LADDERS, SNAKES, FINAL, cellOf } from './config.js';
import { drawPawn } from '../../js/pawn.js';

const BOARD_BG = '#FFFDF6';
const CELL_A = '#FFFFFF';
const CELL_B = '#FFF3DC';
const LINE = '#E3D8C4';
const WOOD = '#C98B45';
const WOOD_D = '#A26C31';

/* Enough greens and teals that neighbouring snakes never match. */
const SNAKE_SKINS = [
  ['#4FAE7C', '#2F7F57'], ['#7C6BD1', '#59499E'], ['#E0803C', '#B25F26'],
  ['#3FA9C9', '#2A7E97'], ['#C4608F', '#94456B'],
];

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  let size = 0;
  let cell = 0;

  function resize(cssSize) {
    const dpr = Math.min(globalThis.devicePixelRatio || 1, 3);
    size = Math.max(140, Math.floor(cssSize));
    cell = size / SIDE;
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';
    canvas.width = Math.floor(size * dpr);
    canvas.height = Math.floor(size * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  const px = (v) => v * cell;
  const at = (n) => { const [c, r] = cellOf(n); return [px(c), px(r)]; };

  /* ── the grid ─────────────────────────────────────────────── */
  function drawCells() {
    ctx.fillStyle = BOARD_BG;
    ctx.fillRect(0, 0, size, size);

    for (let n = 1; n <= FINAL; n++) {
      const [cx, cy] = at(n);
      const x = cx - cell / 2, y = cy - cell / 2;

      ctx.fillStyle = n % 2 === 0 ? CELL_B : CELL_A;
      ctx.fillRect(x, y, cell, cell);

      if (n === FINAL) {
        ctx.fillStyle = 'rgba(255,197,49,.45)';
        ctx.fillRect(x, y, cell, cell);
      }

      ctx.lineWidth = Math.max(1, px(0.012));
      ctx.strokeStyle = LINE;
      ctx.strokeRect(x, y, cell, cell);
    }
  }

  /* Numbers go on last so a snake never sits on top of one. */
  function drawNumbers() {
    if (cell <= 26) return;
    ctx.font = `700 ${px(0.2)}px system-ui, sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.lineJoin = 'round';

    for (let n = 1; n <= FINAL; n++) {
      const [cx, cy] = at(n);
      const x = cx - cell / 2 + px(0.09);
      const y = cy - cell / 2 + px(0.07);
      ctx.lineWidth = px(0.075);
      ctx.strokeStyle = 'rgba(255,253,246,.92)';   // a halo, so it reads over anything
      ctx.strokeText(String(n), x, y);
      ctx.fillStyle = 'rgba(90,77,60,.9)';
      ctx.fillText(String(n), x, y);
    }

    const [fx, fy] = at(FINAL);
    ctx.font = `800 ${px(0.34)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🏁', fx, fy + px(0.14));
  }

  function drawFrame() {
    ctx.lineWidth = px(0.09);
    ctx.strokeStyle = '#CBBBA0';
    ctx.strokeRect(px(0.045), px(0.045), size - px(0.09), size - px(0.09));
  }

  /* ── ladders ──────────────────────────────────────────────── */
  function drawLadder(from, to) {
    const [x0, y0] = at(from);
    const [x1, y1] = at(to);
    const dx = x1 - x0, dy = y1 - y0;
    const len = Math.hypot(dx, dy);
    const ux = dx / len, uy = dy / len;
    const nx = -uy, ny = ux;                    // across the ladder
    const half = px(0.15);

    ctx.lineCap = 'round';
    ctx.lineWidth = px(0.075);

    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(x0 + nx * half * s, y0 + ny * half * s);
      ctx.lineTo(x1 + nx * half * s, y1 + ny * half * s);
      ctx.strokeStyle = WOOD_D;
      ctx.stroke();
    }

    const rungs = Math.max(2, Math.round(len / px(0.52)));
    ctx.lineWidth = px(0.055);
    ctx.strokeStyle = WOOD;
    for (let i = 1; i < rungs; i++) {
      const t = i / rungs;
      const cx = x0 + dx * t, cy = y0 + dy * t;
      ctx.beginPath();
      ctx.moveTo(cx + nx * half, cy + ny * half);
      ctx.lineTo(cx - nx * half, cy - ny * half);
      ctx.stroke();
    }
  }

  /* ── snakes ───────────────────────────────────────────────── */
  function drawSnake(head, tail, skin) {
    const [hx, hy] = at(head);
    const [tx, ty] = at(tail);
    const dx = tx - hx, dy = ty - hy;
    const len = Math.hypot(dx, dy);
    const ux = dx / len, uy = dy / len;
    const nx = -uy, ny = ux;

    const waves = Math.max(1.5, Math.round(len / px(1.6)) + 0.5);
    const amp = Math.min(px(0.42), len * 0.11);
    const N = 48;

    const spine = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const wobble = Math.sin(t * Math.PI * waves) * amp * (1 - t * 0.25);
      spine.push([hx + dx * t + nx * wobble, hy + dy * t + ny * wobble]);
    }

    // a body that tapers from head to tail
    const left = [], right = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const w = px(0.19) * (1 - t * 0.72);
      const [ax, ay] = spine[Math.max(0, i - 1)];
      const [bx, by] = spine[Math.min(N, i + 1)];
      const sx = bx - ax, sy = by - ay;
      const sl = Math.hypot(sx, sy) || 1;
      const px_ = -sy / sl, py_ = sx / sl;
      left.push([spine[i][0] + px_ * w, spine[i][1] + py_ * w]);
      right.push([spine[i][0] - px_ * w, spine[i][1] - py_ * w]);
    }

    ctx.beginPath();
    ctx.moveTo(left[0][0], left[0][1]);
    for (const [x, y] of left) ctx.lineTo(x, y);
    for (let i = N; i >= 0; i--) ctx.lineTo(right[i][0], right[i][1]);
    ctx.closePath();
    ctx.fillStyle = skin[0];
    ctx.fill();
    ctx.lineWidth = px(0.03);
    ctx.strokeStyle = skin[1];
    ctx.stroke();

    // markings
    ctx.fillStyle = 'rgba(255,255,255,.35)';
    for (let i = 4; i < N - 4; i += 5) {
      const t = i / N;
      ctx.beginPath();
      ctx.arc(spine[i][0], spine[i][1], px(0.055) * (1 - t * 0.6), 0, Math.PI * 2);
      ctx.fill();
    }

    // the head, facing back up the board
    ctx.beginPath();
    ctx.ellipse(hx, hy, px(0.27), px(0.21), Math.atan2(dy, dx), 0, Math.PI * 2);
    ctx.fillStyle = skin[0];
    ctx.fill();
    ctx.lineWidth = px(0.035);
    ctx.strokeStyle = skin[1];
    ctx.stroke();

    for (const s of [-1, 1]) {
      const ex = hx + nx * px(0.09) * s - ux * px(0.05);
      const ey = hy + ny * px(0.09) * s - uy * px(0.05);
      ctx.beginPath();
      ctx.arc(ex, ey, px(0.052), 0, Math.PI * 2);
      ctx.fillStyle = '#FFFDF6';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(ex, ey, px(0.026), 0, Math.PI * 2);
      ctx.fillStyle = '#43331F';
      ctx.fill();
    }
  }

  function drawJumps() {
    for (const [from, to] of Object.entries(LADDERS)) drawLadder(Number(from), Number(to));
    Object.entries(SNAKES).forEach(([from, to], i) => {
      drawSnake(Number(from), Number(to), SNAKE_SKINS[i % SNAKE_SKINS.length]);
    });
  }

  /* ── pieces ───────────────────────────────────────────────── */
  function drawPieces(g, { moving = null } = {}) {
    const spots = [];
    g.players.forEach((p, pi) => {
      if (moving && moving.player === pi) return;
      const [cx, cy] = cellOf(p.pos);
      spots.push({ pi, color: p.color, gx: cx, gy: cy });
    });

    // share a square politely
    const groups = new Map();
    for (const s of spots) {
      const key = `${Math.round(s.gx * 4)}:${Math.round(s.gy * 4)}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(s);
    }
    for (const list of groups.values()) {
      if (list.length < 2) continue;
      list.forEach((s, i) => {
        const a = (i / list.length) * Math.PI * 2 - Math.PI / 2;
        s.gx += Math.cos(a) * 0.19;
        s.gy += Math.sin(a) * 0.19;
        s.small = true;
      });
    }

    for (const s of spots) {
      drawPawn(ctx, px(s.gx), px(s.gy), px(s.small ? 0.26 : 0.32), COLORS[s.color]);
    }

    if (moving) {
      drawPawn(ctx, px(moving.cell[0]), px(moving.cell[1]), px(0.36),
        COLORS[g.players[moving.player].color], { lifted: true });
    }
  }

  function draw(g, opts) {
    drawCells();
    drawJumps();
    drawNumbers();
    drawFrame();
    drawPieces(g, opts);
  }

  return { resize, draw, get size() { return size; } };
}
