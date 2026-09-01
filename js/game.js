/* ═══════════════════════════════════════════════════════════════
   game.js — the controller: turn flow, animation, input, HUD.
   ═══════════════════════════════════════════════════════════════ */

import { COLORS, HOME_REL, cellOf } from './config.js';
import { createGame, current, rollDie, legalMoves, pathOf, applyMove, nextTurn, sameTurn } from './rules.js';
import { chooseMove } from './ai.js';
import { createRenderer, confettiBurst } from './render.js';
import { sfx, unlock } from './audio.js';

const $ = (id) => document.getElementById(id);

/* pip layout for each die face, in a 100 × 100 box */
const PIPS = {
  1: [[50, 50]],
  2: [[30, 30], [70, 70]],
  3: [[28, 28], [50, 50], [72, 72]],
  4: [[30, 30], [70, 30], [30, 70], [70, 70]],
  5: [[30, 30], [70, 30], [50, 50], [30, 70], [70, 70]],
  6: [[30, 26], [70, 26], [30, 50], [70, 50], [30, 74], [70, 74]],
};

export function createController(onGameOver) {
  const canvas = $('board');
  const renderer = createRenderer(canvas);

  let g = null;
  let gen = 0;                 // bumped on quit/restart to cancel pending timers
  let moving = null;           // { player, token, cell:[x,y] }
  let highlight = [];
  let stopConfetti = null;
  let running = false;

  /* ── helpers ───────────────────────────────────────────── */
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const alive = (my) => my === gen;

  function toast(text, ms = 1500) {
    const el = $('toast');
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove('show'), ms);
  }

  function setHint(text) { $('hint').textContent = text; }

  function drawDie(n) {
    const svg = $('dice-face');
    if (!n) { svg.innerHTML = '<circle cx="50" cy="50" r="8" fill="#CBBBA0"/>'; return; }
    svg.innerHTML = PIPS[n]
      .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="9.5" fill="#43331F"/>`)
      .join('');
  }

  function updateHUD() {
    if (!g) return;
    const me = current(g);
    $('turn-dot').style.background = COLORS[me.color].main;
    $('turn-name').textContent = me.label;
  }

  function layout() {
    const stage = document.querySelector('.stage');
    const panel = document.querySelector('.panel');
    if (!stage || !stage.clientWidth) return;
    const landscape = window.innerWidth > window.innerHeight;
    const gapAndPad = 44;
    const availW = stage.clientWidth - (landscape ? panel.offsetWidth + gapAndPad : gapAndPad);
    const availH = stage.clientHeight - (landscape ? gapAndPad : panel.offsetHeight + gapAndPad);
    renderer.resize(Math.min(availW, availH, 760));
  }

  function frame(t) {
    if (!running) return;
    if (g) renderer.draw(g, { moving, highlight, time: t });
    requestAnimationFrame(frame);
  }

  /* ── turn flow ─────────────────────────────────────────── */

  async function beginTurn(my) {
    if (!alive(my) || !g || g.winner) return;
    updateHUD();
    highlight = [];
    drawDie(null);
    const me = current(g);

    if (me.kind === 'cpu') {
      $('dice').disabled = true;
      $('dice').classList.remove('is-ready');
      setHint(`${me.label} is thinking…`);
      await sleep(620);
      if (!alive(my)) return;
      doRoll(my);
    } else {
      $('dice').disabled = false;
      $('dice').classList.add('is-ready');
      setHint('Tap the dice!');
    }
  }

  async function doRoll(my) {
    if (!alive(my) || !g || g.phase !== 'roll') return;
    g.phase = 'rolling';
    $('dice').disabled = true;
    $('dice').classList.remove('is-ready');
    $('dice').classList.add('is-rolling');
    sfx.roll();

    // tumble through a few faces before settling
    for (let i = 0; i < 6; i++) { drawDie(1 + ((Math.random() * 6) | 0)); await sleep(70); if (!alive(my)) return; }

    const d = rollDie();
    g.dice = d;
    g.sixStreak = d === 6 ? g.sixStreak + 1 : 0;
    drawDie(d);
    $('dice').classList.remove('is-rolling');
    sfx.land();
    await sleep(320);
    if (!alive(my)) return;

    const me = current(g);

    if (g.sixStreak === 3) {
      toast('Three sixes! Turn passes 🎲');
      sfx.skip();
      await sleep(1100);
      if (!alive(my)) return;
      nextTurn(g);
      return beginTurn(my);
    }

    const moves = legalMoves(g, d);

    if (moves.length === 0) {
      setHint(d === 6 ? 'Nothing to move!' : 'No move this time');
      toast(`${me.label}: no move`);
      sfx.skip();
      await sleep(1000);
      if (!alive(my)) return;
      nextTurn(g);
      return beginTurn(my);
    }

    if (moves.length === 1) {
      setHint('Off it goes!');
      await sleep(260);
      if (!alive(my)) return;
      return performMove(my, moves[0]);
    }

    if (me.kind === 'cpu') {
      await sleep(480);
      if (!alive(my)) return;
      return performMove(my, chooseMove(g, moves));
    }

    g.phase = 'pick';
    highlight = moves.map((m) => m.token);
    setHint('Tap a glowing piece');
  }

  async function performMove(my, move) {
    if (!alive(my) || !g) return;
    g.phase = 'moving';
    highlight = [];
    const me = current(g);
    const pi = g.turn;

    // hop from cell to cell so the counting is visible
    const steps = pathOf(move);
    let fromCell = cellOf(me.color, move.from, move.isEntry ? move.token : 0);
    for (const rel of steps) {
      const toCell = cellOf(me.color, rel, rel === HOME_REL ? move.token : 0);
      sfx.hop();
      await tween(my, pi, move.token, fromCell, toCell, steps.length > 4 ? 105 : 145);
      if (!alive(my)) return;
      fromCell = toCell;
    }
    moving = null;

    const { events, extraTurn, winner } = applyMove(g, move);

    for (const e of events) {
      if (e.type === 'enter') sfx.enter();
      if (e.type === 'capture') { sfx.capture(); toast(`${e.by} sent ${e.victim} home!`, 1700); }
      if (e.type === 'home') { sfx.home(); toast('A piece is home! 🏠', 1500); }
    }

    if (winner) {
      sfx.win();
      g.phase = 'over';
      setHint('');
      await sleep(500);
      if (!alive(my)) return;
      showWin(winner);
      return;
    }

    await sleep(280);
    if (!alive(my)) return;

    if (extraTurn) {
      toast('Another turn! ✨', 1100);
      sameTurn(g);
    } else {
      nextTurn(g);
    }
    return beginTurn(my);
  }

  function tween(my, playerIdx, token, from, to, ms) {
    return new Promise((resolve) => {
      const t0 = performance.now();
      (function step(t) {
        if (!alive(my)) return resolve();
        const k = Math.min(1, (t - t0) / ms);
        const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;   // ease in-out
        const hop = Math.sin(Math.PI * k) * 0.22;                          // little arc
        moving = {
          player: playerIdx,
          token,
          cell: [from[0] + (to[0] - from[0]) * e, from[1] + (to[1] - from[1]) * e - hop],
        };
        if (k < 1) requestAnimationFrame(step); else resolve();
      })(performance.now());
    });
  }

  function showWin(colorKey) {
    const winner = g.players.find((p) => p.color === colorKey);
    $('win-title').textContent = `${winner.label} wins!`;
    $('win-sub').textContent = winner.kind === 'cpu' ? 'Good try — go again?' : 'Brilliant playing!';
    $('win-overlay').classList.add('is-active');
    stopConfetti = confettiBurst($('confetti'));
    onGameOver?.();
  }

  /* ── input ─────────────────────────────────────────────── */
  canvas.addEventListener('pointerdown', (ev) => {
    if (!g || g.phase !== 'pick') return;
    const ti = renderer.tokenAt(g, ev.clientX, ev.clientY);
    if (ti === null || !highlight.includes(ti)) return;
    const move = legalMoves(g, g.dice).find((m) => m.token === ti);
    if (!move) return;
    sfx.tap();
    performMove(gen, move);
  });

  $('dice').addEventListener('click', () => {
    unlock();
    if (g && g.phase === 'roll' && current(g).kind === 'human') doRoll(gen);
  });

  window.addEventListener('resize', layout);
  window.addEventListener('orientationchange', () => setTimeout(layout, 250));

  /* ── public API ────────────────────────────────────────── */
  return {
    start(seats) {
      gen++;
      stopConfetti?.(); stopConfetti = null;
      $('win-overlay').classList.remove('is-active');
      g = createGame(seats);
      moving = null; highlight = [];
      running = true;
      requestAnimationFrame(frame);
      layout();
      setTimeout(layout, 60);          // after the screen has actually been shown
      drawDie(null);
      beginTurn(gen);
    },
    stop() {
      gen++;
      running = false;
      stopConfetti?.(); stopConfetti = null;
      g = null;
    },
    layout,
    get state() { return g; },
    get pickable() { return highlight; },
  };
}
