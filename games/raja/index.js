/* ═══════════════════════════════════════════════════════════════
   games/raja/index.js — Raja Mantri Chor Sipahi's entry point.
   ═══════════════════════════════════════════════════════════════ */

import { ORDER, COLORS, CPU_NAMES, CPU_FACES, ROUNDS } from './config.js';
import { createController } from './game.js';
import { chitSVG } from './chits.js';
import { createTable } from '../../js/table.js';
import { unlock } from '../../js/audio.js';

export const meta = { id: 'raja', title: 'Raja Mantri Chor Sipahi' };

const TEMPLATE = `
<div class="raja">

  <section class="game-screen is-active" data-screen="setup">
    <div class="setup-wrap">
      <h2 class="game-name">Raja Mantri Chor Sipahi</h2>
      <p class="setup-who">Who's playing?</p>
      <p class="setup-hint">It takes four. Empty seats are played by the animals.</p>

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
    <div class="rstage">
      <header class="rtop">
        <span class="rround" data-el="round">Round 1</span>
        <button class="icon-btn" data-el="who" aria-label="Change who is playing">&#128101;</button>
        <button class="icon-btn" data-el="quit" aria-label="Back to the games">&#127968;</button>
      </header>
      <div class="rtable" data-el="table"></div>
      <div class="rpanel" data-el="panel" aria-live="polite"></div>
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
      <button class="ghost-btn" data-el="changePlayers">Change players</button>
    </div>
  </div>

  <div class="overlay" data-el="helpOverlay">
    <div class="help-card">
      <h2>How to play</h2>
      <div class="rhelp-chits">
        <figure>${chitSVG('raja')}<figcaption><b>Raja</b> 1000</figcaption></figure>
        <figure>${chitSVG('mantri')}<figcaption><b>Mantri</b> 800</figcaption></figure>
        <figure>${chitSVG('sipahi')}<figcaption><b>Sipahi</b> 500</figcaption></figure>
        <figure>${chitSVG('chor')}<figcaption><b>Chor</b> 0</figcaption></figure>
      </div>
      <ol>
        <li>Everyone gets a <b>secret chit</b>. Pass the tablet round: tap your name, hold your finger on the chit to peek, let go, pass it on.</li>
        <li>The <b>Raja</b> shows himself and calls: <i>“Mera Mantri kaun?”</i> Then the <b>Mantri</b> shows himself.</li>
        <li>The Mantri must <b>find the Chor</b> &mdash; tap one of the other two.</li>
        <li>Caught! The Mantri keeps 800. Wrong? The <b>Chor runs off with the Mantri’s 800</b>.</li>
        <li>After ${ROUNDS} rounds, the <b>highest total wins</b>.</li>
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
    game: 'raja',
    order: ORDER,
    colors: COLORS,
    cpuNames: CPU_NAMES,
    cpuFaces: CPU_FACES,
  });

  const cpu = Object.fromEntries(ORDER.map((c) => [c, `${CPU_FACES[c]} ${CPU_NAMES[c]}`]));

  const game = createController(el, {
    cpu,
    onGameOver: (order, drawn) => {
      el('tallyRow').textContent = drawn ? table.recordDraw() : table.recordWin(order);
    },
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
    showBoard();
    game.start(...table.lineup());
  }

  const on = (name, ev, fn) => el(name).addEventListener(ev, fn);

  on('play', 'click', start);
  on('quick', 'click', () => { table.soloVsComputer(); start(); });
  on('how', 'click', () => el('helpOverlay').classList.add('is-active'));
  on('helpClose', 'click', () => el('helpOverlay').classList.remove('is-active'));
  on('back', 'click', () => shell.goHome());
  on('who', 'click', () => { game.stop(); showSetup(); });

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

  /* Straight to the table when the same people are playing as last time. */
  table.refresh();
  if (table.ready()) start(); else showSetup();

  globalThis.RAJA = { game, table, start };

  return function unmount() {
    game.destroy();
    table.destroy();
    delete globalThis.RAJA;
  };
}
