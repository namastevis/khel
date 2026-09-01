/* ═══════════════════════════════════════════════════════════════
   game.js — turn flow, animation, HUD.

   There are no decisions to make in Snakes & Ladders, so there is no
   opponent to write: everybody rolls, and the board does the rest.
   What the screen owes the player is a clear view of the counting.
   ═══════════════════════════════════════════════════════════════ */

import { COLORS, cellOf } from './config.js';
import { createGame, current, applyRoll, nextTurn, sameTurn, isDone } from './rules.js';
import { createRenderer } from './render.js';
import { rollDie, drawDie } from '../../js/dice.js';
import { sfx, unlock } from '../../js/audio.js';
import { toast } from '../../js/toast.js';
import { confetti } from '../../js/confetti.js';

const ORDINAL = { 1: 'first', 2: 'second', 3: 'third', 4: 'fourth' };
const MEDAL = { 1: '🥇', 2: '🥈', 3: '🥉', 4: '🎗️' };

export function createController(root, el, hooks = {}) {
  const canvas = el('board');
  const renderer = createRenderer(canvas);

  let g = null;
  let gen = 0;
  let moving = null;
  let stopConfetti = null;
  let running = false;

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const alive = (my) => my === gen;
  const setHint = (t) => { el('hint').textContent = t; };

  function updateHUD() {
    if (!g) return;
    const me = current(g);
    el('turnDot').style.background = COLORS[me.color].main;
    el('turnName').textContent = me.label;
    el('turnSquare').textContent = `on ${me.pos}`;
  }

  function layout() {
    const stage = root.querySelector('.stage');
    const panel = root.querySelector('.panel');
    if (!stage || !stage.clientWidth) return;
    const landscape = window.innerWidth > window.innerHeight;
    const pad = 44;
    const availW = stage.clientWidth - (landscape ? panel.offsetWidth + pad : pad);
    const availH = stage.clientHeight - (landscape ? pad : panel.offsetHeight + pad);
    renderer.resize(Math.min(availW, availH, 760));
  }

  function frame() {
    if (!running) return;
    if (g) renderer.draw(g, { moving });
    requestAnimationFrame(frame);
  }

  /* ── turns ─────────────────────────────────────────────── */
  async function beginTurn(my) {
    if (!alive(my) || !g || g.phase === 'over') return;
    updateHUD();
    drawDie(el('diceFace'), null);
    const me = current(g);

    if (me.kind === 'cpu') {
      el('dice').disabled = true;
      el('dice').classList.remove('is-ready');
      setHint(`${me.label} is rolling…`);
      await sleep(600);
      if (!alive(my)) return;
      doRoll(my);
    } else {
      el('dice').disabled = false;
      el('dice').classList.add('is-ready');
      setHint('Tap the dice!');
    }
  }

  async function doRoll(my) {
    if (!alive(my) || !g || g.phase !== 'roll') return;
    g.phase = 'rolling';
    el('dice').disabled = true;
    el('dice').classList.remove('is-ready');
    el('dice').classList.add('is-rolling');
    sfx.roll();

    for (let i = 0; i < 6; i++) {
      drawDie(el('diceFace'), 1 + ((Math.random() * 6) | 0));
      await sleep(70);
      if (!alive(my)) return;
    }

    const d = rollDie();
    g.dice = d;
    g.sixStreak = d === 6 ? g.sixStreak + 1 : 0;
    drawDie(el('diceFace'), d);
    el('dice').classList.remove('is-rolling');
    sfx.land();
    await sleep(300);
    if (!alive(my)) return;

    if (g.sixStreak === 3) {
      toast('Three sixes! Turn passes 🎲');
      sfx.skip();
      await sleep(1100);
      if (!alive(my)) return;
      nextTurn(g);
      return beginTurn(my);
    }

    return walkIt(my, d);
  }

  async function walkIt(my, dice) {
    g.phase = 'moving';
    const pi = g.turn;
    const from = current(g).pos;
    const { events, walk, jump, extraTurn, over } = applyRoll(g, dice);

    // one square at a time, counting out loud
    let prev = cellOf(from);
    for (const square of walk) {
      const next = cellOf(square);
      sfx.hop();
      setHint(String(square));
      await tween(my, pi, prev, next, walk.length > 4 ? 115 : 150);
      if (!alive(my)) return;
      prev = next;
    }

    if (jump) {
      await sleep(320);
      if (!alive(my)) return;
      const to = cellOf(jump.to);
      if (jump.kind === 'ladder') {
        sfx.home();
        setHint(`Up to ${jump.to}!`);
        toast(`${current(g).label} climbs to ${jump.to}! 🪜`, 1800);
      } else {
        sfx.capture();
        setHint(`Down to ${jump.to}`);
        toast(`Oh no — ${current(g).label} slides to ${jump.to} 🐍`, 1800);
      }
      await tween(my, pi, prev, to, 620, jump.kind === 'snake');
      if (!alive(my)) return;
    }

    moving = null;
    updateHUD();

    for (const e of events) {
      if (e.type === 'finish') {
        sfx.win();
        toast(e.place === 1 ? `${e.label} is home first! 🏆` : `${e.label} finishes ${ORDINAL[e.place]}!`, 2200);
      }
    }

    if (over) {
      setHint('');
      await sleep(1400);
      if (!alive(my)) return;
      showWin(g.finished);
      return;
    }

    await sleep(300);
    if (!alive(my)) return;

    if (isDone(current(g))) {
      await sleep(700);
      if (!alive(my)) return;
      nextTurn(g);
      return beginTurn(my);
    }

    if (extraTurn) {
      toast('Another turn! ✨', 1100);
      sameTurn(g);
    } else {
      nextTurn(g);
    }
    return beginTurn(my);
  }

  function tween(my, playerIdx, from, to, ms, slither = false) {
    return new Promise((resolve) => {
      const t0 = performance.now();
      (function step(t) {
        if (!alive(my)) return resolve();
        const k = Math.min(1, (t - t0) / ms);
        const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        // a hop between squares; a wobble when a snake is doing the moving
        const lift = slither ? Math.sin(k * Math.PI * 3) * 0.12 : Math.sin(Math.PI * k) * 0.22;
        moving = {
          player: playerIdx,
          cell: [from[0] + (to[0] - from[0]) * e + (slither ? lift : 0),
            from[1] + (to[1] - from[1]) * e - (slither ? 0 : lift)],
        };
        if (k < 1) requestAnimationFrame(step); else resolve();
      })(performance.now());
    });
  }

  function showWin(order) {
    const byColour = (c) => g.players.find((p) => p.color === c);
    const champ = byColour(order[0]);

    el('winTitle').textContent = `${champ.label} wins!`;
    el('winSub').textContent = order.length > 2 ? 'Here\'s how everyone finished' : 'Well played, both of you';
    el('podium').innerHTML = order.map((c, i) => {
      const p = byColour(c);
      return `<li class="podium-row" style="--c:${COLORS[c].main}">
        <span class="podium-medal">${MEDAL[i + 1] || ''}</span>
        <span class="podium-pawn"></span>
        <span class="podium-name">${p.label}</span>
      </li>`;
    }).join('');

    hooks.onGameOver?.(order);
    el('winOverlay').classList.add('is-active');
    stopConfetti = confetti(el('confetti'));
  }

  /* ── input ─────────────────────────────────────────────── */
  const onDiceClick = () => {
    unlock();
    if (g && g.phase === 'roll' && current(g).kind === 'human') doRoll(gen);
  };
  const onOrientation = () => setTimeout(layout, 250);

  el('dice').addEventListener('click', onDiceClick);
  window.addEventListener('resize', layout);
  window.addEventListener('orientationchange', onOrientation);
  window.visualViewport?.addEventListener('resize', layout);

  return {
    start(seats, names) {
      gen++;
      stopConfetti?.(); stopConfetti = null;
      el('winOverlay').classList.remove('is-active');
      g = createGame(seats, names);
      moving = null;
      running = true;
      requestAnimationFrame(frame);
      layout();
      setTimeout(layout, 60);
      drawDie(el('diceFace'), null);
      beginTurn(gen);
    },
    stop() {
      gen++;
      running = false;
      stopConfetti?.(); stopConfetti = null;
      g = null;
    },
    destroy() {
      this.stop();
      el('dice').removeEventListener('click', onDiceClick);
      window.removeEventListener('resize', layout);
      window.removeEventListener('orientationchange', onOrientation);
      window.visualViewport?.removeEventListener('resize', layout);
    },
    layout,
    get state() { return g; },
  };
}
