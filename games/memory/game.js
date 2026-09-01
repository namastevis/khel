/* ═══════════════════════════════════════════════════════════════
   game.js — the round on screen.

   The board is real DOM rather than canvas: a card is a button, so a
   tap target is a tap target, the flip is a CSS transform the browser
   animates for free, and the whole thing works with a screen reader
   without being reinvented.
   ═══════════════════════════════════════════════════════════════ */

import {
  createGame, flip, resolve, current, isOver, canFlip, cpuChoice, standings,
} from './rules.js';
import { COLORS, SIZES, DEFAULT_SIZE, gridFor } from './config.js';
import { pictureSVG, byId } from './deck.js';
import { sfx, isMuted } from '../../js/audio.js';
import { confetti } from '../../js/confetti.js';
import { say, stopSaying } from './voice.js';

/* How long two cards stay up before they are judged. Long enough for
   the slowest person at the table to have actually looked. */
const LOOK_MATCH = 700;
const LOOK_MISS = 1150;
const CPU_THINK = 620;

export function createController(root, el, { onGameOver }) {
  let g = null;
  let size = DEFAULT_SIZE;
  let previous = null;              // last round's pictures and layout
  let busy = false;                 // a pair is being judged; ignore taps
  let timers = [];

  const later = (fn, ms) => { const t = setTimeout(fn, ms); timers.push(t); return t; };
  const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };

  /* ── the grid ───────────────────────────────────────────────
     Which way up the grid goes isn't guessed from the window: both
     arrangements are measured against the space actually available and
     the one with the bigger cards wins. A phone held sideways and a
     tablet in portrait then both get the largest board that fits, with
     no orientation special cases. */
  function fit() {
    const board = el('board');
    const wrap = board.parentElement;
    const space = { w: wrap.clientWidth, h: wrap.clientHeight };
    if (!space.w || !space.h) return null;

    const gap = parseFloat(getComputedStyle(board).gap) || 8;
    const cellFor = ({ cols, rows }) => Math.min(
      (space.w - gap * (cols - 1)) / cols,
      (space.h - gap * (rows - 1)) / rows,
    );

    const options = [gridFor(size, true), gridFor(size, false)];
    const best = options.reduce((a, b) => (cellFor(b) > cellFor(a) ? b : a));
    const cell = cellFor(best);

    board.style.setProperty('--cols', best.cols);
    board.style.setProperty('--rows', best.rows);
    board.style.width = `${cell * best.cols + gap * (best.cols - 1)}px`;
    board.style.height = `${cell * best.rows + gap * (best.rows - 1)}px`;
    return best;
  }

  function build() {
    const board = el('board');


    board.innerHTML = g.cards.map((c, i) => `
      <button class="mcard" data-i="${i}" aria-label="Card ${i + 1}">
        <span class="mcard-inner">
          <span class="mcard-back"><span class="mcard-mark"></span></span>
          <span class="mcard-face">${pictureSVG(c.id)}</span>
        </span>
      </button>`).join('');
  }

  function paint() {
    const buttons = el('board').querySelectorAll('.mcard');
    g.cards.forEach((c, i) => {
      const btn = buttons[i];
      if (!btn) return;
      btn.classList.toggle('is-up', c.faceUp || !!c.takenBy);
      btn.classList.toggle('is-taken', !!c.takenBy);
      btn.style.setProperty('--taken', c.takenBy ? COLORS[c.takenBy].main : 'transparent');
      btn.disabled = !!c.takenBy;
      btn.setAttribute('aria-label',
        (c.faceUp || c.takenBy) ? byId(c.id).name : `Card ${i + 1}`);
    });
    paintScores();
    // after the score row, never before: it is part of what's left over
    // for the board, and measuring first pushed the bottom row off screen
    fit();
  }

  function paintScores() {
    const me = current(g);
    el('scores').innerHTML = g.players.map((p) => `
      <span class="mscore ${p === me && !isOver(g) ? 'is-turn' : ''}" style="--c:${COLORS[p.color].main}">
        <span class="mscore-dot"></span>
        <span class="mscore-name">${escapeHtml(p.name)}</span>
        <span class="mscore-pairs">${p.pairs}</span>
      </span>`).join('');

    if (!isOver(g)) {
      el('turnName').textContent = me.name;
      el('turnName').style.color = COLORS[me.color].dark;
      el('hint').textContent = me.kind === 'cpu'
        ? 'Watching…'
        : (g.flipped.length === 1 ? 'Now find its twin' : 'Turn over two cards');
    }
  }

  /* ── a go ───────────────────────────────────────────────── */
  function tap(i) {
    if (busy || !g || isOver(g)) return;
    if (current(g).kind === 'cpu') return;
    turnOver(i);
  }

  function turnOver(i) {
    if (!canFlip(g, i)) return;
    flip(g, i);
    sfx.hop();
    paint();
    if (g.flipped.length === 2) judge();
    else if (current(g).kind === 'cpu') later(cpuGo, CPU_THINK);
  }

  function judge() {
    busy = true;
    const [a, b] = g.flipped;
    const matched = g.cards[a].id === g.cards[b].id;

    later(() => {
      const name = byId(g.cards[a].id).name;
      const out = resolve(g);
      busy = false;
      paint();
      if (!out) return;

      if (out.matched) {
        sfx.enter();
        showName(name);
      } else {
        sfx.skip();
      }

      if (out.over) later(finish, 650);
      else if (current(g).kind === 'cpu') later(cpuGo, CPU_THINK);
    }, matched ? LOOK_MATCH : LOOK_MISS);
  }

  /* The name of the pair, big for a moment — and said aloud, which is
     how a picture book teaches a word. No reading required either way. */
  function showName(text) {
    const badge = el('found');
    badge.textContent = text;
    badge.classList.remove('is-shown');
    void badge.offsetWidth;                     // restart the animation
    badge.classList.add('is-shown');
    if (!isMuted()) say(text);
  }

  function cpuGo() {
    if (!g || isOver(g) || busy || current(g).kind !== 'cpu') return;
    const i = cpuChoice(g);
    if (i === null || i === undefined) return;
    turnOver(i);
  }

  /* ── the end ────────────────────────────────────────────── */
  function finish() {
    const order = standings(g);
    const champion = order[0];

    el('winTitle').textContent = `${champion.name} wins!`;
    el('winSub').textContent = order.length > 1
      ? `${champion.pairs} pair${champion.pairs === 1 ? '' : 's'}`
      : `You found all ${champion.pairs}!`;

    const MEDALS = ['🥇', '🥈', '🥉', '🎖️'];
    el('podium').innerHTML = order.map((p, i) => `
      <li class="podium-row" style="--c:${COLORS[p.color].main}">
        <span class="podium-medal">${MEDALS[i] || '🎖️'}</span>
        <span class="podium-name">${escapeHtml(p.name)}</span>
        <span class="podium-pairs">${p.pairs}</span>
      </li>`).join('');

    el('winOverlay').classList.add('is-active');
    confetti(el('confetti'));
    sfx.win();
    onGameOver?.(g.finished);
  }

  /* ── public ─────────────────────────────────────────────── */
  function start(seats, names) {
    clearTimers();
    stopSaying();
    busy = false;
    g = createGame({ size, seats, names, order: Object.keys(COLORS), previous });
    previous = { pictures: g.pictures, deal: g.deal };
    build();
    paint();
    el('sizeName').textContent = SIZES[size].label;
    if (current(g).kind === 'cpu') later(cpuGo, CPU_THINK);
  }

  function setSize(next) {
    size = Math.max(0, Math.min(SIZES.length - 1, next));
    previous = null;                 // a different size is a different deal
    return size;
  }

  function stop() { clearTimers(); stopSaying(); busy = false; g = null; }

  // Re-fitting is just arithmetic on the existing buttons, so a rotation
  // never rebuilds the board — which would have reset every flip.
  const onResize = () => { if (g) fit(); };
  window.addEventListener('resize', onResize);
  window.addEventListener('orientationchange', onResize);

  el('board').addEventListener('click', (ev) => {
    const card = ev.target.closest('.mcard');
    if (card) tap(Number(card.dataset.i));
  });

  return {
    start, stop, setSize,
    get size() { return size; },
    get state() { return g; },
    destroy() {
      stop();
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    },
  };
}

const escapeHtml = (s) => String(s).replace(/[&<>"]/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
