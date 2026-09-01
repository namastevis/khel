/* ═══════════════════════════════════════════════════════════════
   games/ludo/index.js — Ludo's entry point.

   The shell hands us a host element and a way back to the shelf.
   Everything this game needs — markup, listeners, timers — is
   created here and torn down again in unmount().
   ═══════════════════════════════════════════════════════════════ */

import { ORDER, COLORS, CPU_NAMES, cellOf } from './config.js';
import { createController } from './game.js';
import { createTable } from '../../js/table.js';
import { unlock } from '../../js/audio.js';

export const meta = { id: 'ludo', title: 'Ludo' };

const TEMPLATE = `
<div class="ludo">

  <!-- ── who is playing ── -->
  <section class="game-screen is-active" data-screen="setup">
    <div class="setup-wrap">
      <h2 class="game-name">Ludo</h2>
      <p class="setup-who">Who's playing?</p>
      <p class="setup-hint">Tap a piece to choose who plays it</p>

      <div class="seats" data-el="seats"></div>

      <button class="big-btn" data-el="play">Play</button>

      <div class="setup-foot">
        <button class="ghost-btn" data-el="quick">Playing on my own</button>
        <button class="ghost-btn" data-el="how">How to play</button>
        <button class="ghost-btn" data-el="reset" hidden>Clear the scores</button>
        <button class="ghost-btn" data-el="back">&larr; All games</button>
      </div>
    </div>
  </section>

  <!-- ── the board ── -->
  <section class="game-screen" data-screen="board">
    <div class="stage">
      <div class="board-holder">
        <canvas class="board" data-el="board" aria-label="Ludo board"></canvas>
      </div>

      <aside class="panel">
        <div class="turn-card">
          <span class="turn-dot" data-el="turnDot"></span>
          <span class="turn-name" data-el="turnName">Red</span>
        </div>

        <button class="dice" data-el="dice" aria-label="Roll the dice">
          <svg viewBox="0 0 100 100" data-el="diceFace"></svg>
        </button>

        <p class="hint" data-el="hint">Tap the dice!</p>

        <div class="panel-foot">
          <button class="icon-btn" data-el="quit" aria-label="Back to the games">&#127968;</button>
        </div>
      </aside>
    </div>
  </section>

  <!-- ── someone won ── -->
  <div class="overlay" data-el="winOverlay">
    <canvas class="confetti" data-el="confetti"></canvas>
    <div class="win-card">
      <div class="win-crown">&#128081;</div>
      <h2 data-el="winTitle">Red wins!</h2>
      <p data-el="winSub">Well played!</p>
      <ol class="podium" data-el="podium"></ol>
      <p class="tally-row" data-el="tallyRow"></p>
      <button class="big-btn" data-el="again">Play again</button>
      <button class="ghost-btn" data-el="changePlayers">Change players</button>
    </div>
  </div>

  <!-- ── how to play ── -->
  <div class="overlay" data-el="helpOverlay">
    <div class="help-card">
      <h2>How to play</h2>
      <ol>
        <li><b>Tap the dice</b> when it is your turn.</li>
        <li>You need a <b>6</b> to bring a piece out of its house.</li>
        <li>Tap a <b>glowing piece</b> to move it. If only one piece can move, it moves by itself.</li>
        <li>Land on someone else's piece and it goes <b>back home</b> &mdash; unless it is standing on a <b>star</b>.</li>
        <li>Roll a <b>6</b>, send someone home, or get a piece home &mdash; you get <b>another turn</b>.</li>
        <li>Get all <b>4 pieces</b> to the middle to win. You need the exact number to finish!</li>
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
    game: 'ludo',
    order: ORDER,
    colors: COLORS,
    cpuNames: CPU_NAMES,
  });

  /* ── screens ── */
  const showSetup = () => {
    screen('setup').classList.add('is-active');
    screen('board').classList.remove('is-active');
  };
  const showBoard = () => {
    screen('setup').classList.remove('is-active');
    screen('board').classList.add('is-active');
  };

  const game = createController(root, el, {
    onGameOver: (order) => { el('tallyRow').textContent = table.recordWin(order); },
  });

  function start() {
    unlock();
    showBoard();
    game.start(...table.lineup());
  }

  /* ── wiring ── */
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

  on('changePlayers', 'click', () => {
    game.stop();
    el('winOverlay').classList.remove('is-active');
    showSetup();
  });

  table.refresh();
  showSetup();

  /* for the automated tests */
  globalThis.LUDO = { game, table, start, geom: { cellOf } };

  return function unmount() {
    game.destroy();
    delete globalThis.LUDO;
  };
}
