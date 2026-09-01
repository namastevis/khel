/* ═══════════════════════════════════════════════════════════════
   games/snakes/index.js — Snakes & Ladders' entry point.
   ═══════════════════════════════════════════════════════════════ */

import { ORDER, COLORS, CPU_NAMES, CPU_FACES } from './config.js';
import { createController } from './game.js';
import { createTable } from '../../js/table.js';
import { unlock } from '../../js/audio.js';

export const meta = { id: 'snakes', title: 'Snakes & Ladders' };


const TEMPLATE = `
<div class="snakes">

  <section class="game-screen is-active" data-screen="setup">
    <div class="setup-wrap">
      <h2 class="game-name">Snakes &amp; Ladders</h2>
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

  <section class="game-screen" data-screen="board">
    <div class="stage">
      <div class="board-holder">
        <canvas class="board" data-el="board" aria-label="Snakes and ladders board"></canvas>
      </div>

      <aside class="panel">
        <div class="turn-card">
          <span class="turn-dot" data-el="turnDot"></span>
          <span class="turn-text">
            <span class="turn-name" data-el="turnName">Red</span>
            <span class="turn-square" data-el="turnSquare">on 1</span>
          </span>
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

  <div class="overlay" data-el="helpOverlay">
    <div class="help-card">
      <h2>How to play</h2>
      <ol>
        <li><b>Tap the dice</b> and your piece walks that many squares.</li>
        <li>Land at the bottom of a <b>ladder</b> and you climb all the way up. 🪜</li>
        <li>Land on a <b>snake's head</b> and you slide back down to its tail. 🐍</li>
        <li>Roll a <b>6</b> and you go again.</li>
        <li>First to <b>square 100</b> wins &mdash; and you don't need the exact number.</li>
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
    game: 'snakes',
    order: ORDER,
    colors: COLORS,
    cpuNames: CPU_NAMES,
    cpuFaces: CPU_FACES,
  });

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

  globalThis.SNAKES = { game, table, start };

  return function unmount() {
    game.destroy();
    table.destroy();
    delete globalThis.SNAKES;
  };
}
