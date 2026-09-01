/* ═══════════════════════════════════════════════════════════════
   games/memory/index.js — Memory's entry point.
   ═══════════════════════════════════════════════════════════════ */

import { ORDER, COLORS, CPU_NAMES, CPU_FACES, SIZES, DEFAULT_SIZE } from './config.js';
import { createController } from './game.js';
import { createTable } from '../../js/table.js';
import { unlock, sfx } from '../../js/audio.js';

export const meta = { id: 'memory', title: 'Memory' };

/* The size buttons draw their own grid, so nothing has to be read to
   know which is which — the picture is the label. */
const sizeArt = (cols, rows) => {
  const gap = 4, box = (44 - gap * (Math.max(cols, rows) - 1)) / Math.max(cols, rows);
  const w = cols * box + (cols - 1) * gap, h = rows * box + (rows - 1) * gap;
  const x0 = (48 - w) / 2, y0 = (48 - h) / 2;
  let out = '';
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      out += `<rect x="${(x0 + c * (box + gap)).toFixed(1)}" y="${(y0 + r * (box + gap)).toFixed(1)}"
        width="${box.toFixed(1)}" height="${box.toFixed(1)}" rx="${Math.min(3, box / 3).toFixed(1)}"/>`;
    }
  }
  return `<svg viewBox="0 0 48 48" aria-hidden="true">${out}</svg>`;
};

const TEMPLATE = `
<div class="memory">

  <section class="game-screen is-active" data-screen="setup">
    <div class="setup-wrap">
      <h2 class="game-name">Memory</h2>
      <p class="setup-who">Who's playing?</p>
      <p class="setup-hint">Tap a piece to choose who plays it</p>

      <div class="seats" data-el="seats"></div>

      <p class="setup-who">How many cards?</p>
      <div class="sizes" data-el="sizes"></div>

      <button class="big-btn" data-el="play">Play</button>

      <div class="setup-foot">
        <button class="ghost-btn" data-el="quick">Playing on my own</button>
        <button class="ghost-btn" data-el="how">How to play</button>
        <button class="ghost-btn" data-el="reset" hidden>Clear the scores</button>
        <button class="ghost-btn" data-el="back">&larr; All games</button>
      </div>
    </div>
  </section>

  <section class="game-screen" data-screen="board">
    <div class="mstage">
      <header class="mtop">
        <span class="mturn"><b data-el="turnName">Red</b> <span data-el="hint">Turn over two cards</span></span>
        <span class="msize" data-el="sizeName"></span>
        <button class="icon-btn" data-el="quit" aria-label="Back to the games">&#127968;</button>
      </header>

      <div class="mboard-wrap">
        <div class="mboard" data-el="board"></div>
        <div class="mfound" data-el="found" aria-live="polite"></div>
      </div>

      <div class="mscores" data-el="scores"></div>
    </div>
  </section>

  <div class="overlay" data-el="winOverlay">
    <canvas class="confetti" data-el="confetti"></canvas>
    <div class="win-card">
      <div class="win-crown">&#128081;</div>
      <h2 data-el="winTitle">Red wins!</h2>
      <p data-el="winSub"></p>
      <ol class="podium" data-el="podium"></ol>
      <p class="tally-row" data-el="tallyRow"></p>
      <button class="big-btn" data-el="again">Play again</button>
      <button class="ghost-btn" data-el="bigger" hidden>Try a bigger one</button>
      <button class="ghost-btn" data-el="changePlayers">Change players</button>
    </div>
  </div>

  <div class="overlay" data-el="helpOverlay">
    <div class="help-card">
      <h2>How to play</h2>
      <ol>
        <li><b>Turn over two cards.</b> Everyone can see them.</li>
        <li>The <b>same picture twice</b> and you keep the pair &mdash; and go again. 🎉</li>
        <li>Not the same? They turn back over and it's the next person's go.</li>
        <li>When the table is empty, <b>whoever has the most pairs wins</b>.</li>
        <li>Try a bigger board when this one gets easy &mdash; more cards means more of
            the same colour, so you have to look at the picture, not just the colour.</li>
      </ol>
      <button class="big-btn" data-el="helpClose">Got it</button>
    </div>
  </div>

  <div class="sheet" data-el="pick">
    <div class="sheet-card">
      <h2 class="sheet-title" data-role="pick-title">Who's playing?</h2>
      <div class="pick-list" data-role="pick-list"></div>
      <button class="ghost-btn" data-role="pick-close">Close</button>
    </div>
  </div>
</div>`;

export function mount(host, shell) {
  host.innerHTML = TEMPLATE;
  const root = host.firstElementChild;
  const el = (name) => root.querySelector(`[data-el="${name}"]`);
  const screen = (name) => root.querySelector(`[data-screen="${name}"]`);

  const table = createTable({
    seatsEl: el('seats'),
    playEl: el('play'),
    resetEl: el('reset'),
    pickEl: el('pick'),
    game: 'memory',
    order: ORDER,
    colors: COLORS,
    cpuNames: CPU_NAMES,
    cpuFaces: CPU_FACES,
  });

  const game = createController(root, el, {
    onGameOver: (order) => {
      el('tallyRow').textContent = table.recordWin(order);
      // a clean win on a small board is the moment to point at the next one
      const s = game.state;
      const swept = s && s.players.length > 1 && s.players[0].pairs >= SIZES[game.size].pairs - 1;
      el('bigger').hidden = !(swept && game.size < SIZES.length - 1);
    },
  });

  /* ── how many cards ─────────────────────────────────────── */
  let chosenSize = readSize();

  function buildSizes() {
    el('sizes').innerHTML = SIZES.map((s, i) => `
      <button class="size ${i === chosenSize ? 'is-on' : ''}" data-size="${i}"
              aria-pressed="${i === chosenSize}" aria-label="${s.label}, ${s.cards} cards">
        ${sizeArt(...s.grid)}
        <span class="size-label">${s.label}</span>
        <span class="size-cards">${s.cards} cards</span>
      </button>`).join('');
  }

  el('sizes').addEventListener('click', (ev) => {
    const btn = ev.target.closest('.size');
    if (!btn) return;
    chosenSize = Number(btn.dataset.size);
    writeSize(chosenSize);
    sfx.tap();
    buildSizes();
  });

  const showSetup = () => {
    screen('setup').classList.add('is-active');
    screen('board').classList.remove('is-active');
  };
  const showBoard = () => {
    screen('setup').classList.remove('is-active');
    screen('board').classList.add('is-active');
  };

  function start() {
    unlock();
    game.setSize(chosenSize);
    showBoard();
    game.start(...table.lineup());
  }

  const on = (name, ev, fn) => el(name).addEventListener(ev, fn);

  on('play', 'click', start);
  on('quick', 'click', () => { table.soloVsComputer(); start(); });
  on('how', 'click', () => el('helpOverlay').classList.add('is-active'));
  on('helpClose', 'click', () => el('helpOverlay').classList.remove('is-active'));
  on('back', 'click', () => shell.goHome());

  on('quit', 'click', () => {
    table.closePicker();
    game.stop();
    el('winOverlay').classList.remove('is-active');
    shell.goHome();
  });

  on('again', 'click', () => {
    el('winOverlay').classList.remove('is-active');
    game.start(...table.lineup());
  });

  on('bigger', 'click', () => {
    chosenSize = Math.min(SIZES.length - 1, chosenSize + 1);
    writeSize(chosenSize);
    buildSizes();
    el('winOverlay').classList.remove('is-active');
    start();
  });

  on('changePlayers', 'click', () => {
    game.stop();
    el('winOverlay').classList.remove('is-active');
    showSetup();
  });

  buildSizes();
  table.refresh();
  showSetup();

  globalThis.MEMORY = { game, table, start, get size() { return chosenSize; } };

  return function unmount() {
    game.destroy();
    delete globalThis.MEMORY;
  };
}

/* The chosen size is per device, like everything else here. */
function readSize() {
  try {
    const n = Number(localStorage.getItem('khel.memory.size'));
    return Number.isInteger(n) && n >= 0 && n < SIZES.length ? n : DEFAULT_SIZE;
  } catch { return DEFAULT_SIZE; }
}

function writeSize(n) {
  try { localStorage.setItem('khel.memory.size', String(n)); } catch { /* private mode */ }
}
