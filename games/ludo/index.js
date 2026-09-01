/* ═══════════════════════════════════════════════════════════════
   games/ludo/index.js — Ludo's entry point.

   The shell hands us a host element and a way back to the shelf.
   Everything this game needs — markup, listeners, timers — is
   created here and torn down again in unmount().
   ═══════════════════════════════════════════════════════════════ */

import { ORDER, COLORS, cellOf } from './config.js';
import { createController } from './game.js';
import { sfx, unlock } from '../../js/audio.js';

export const meta = { id: 'ludo', title: 'Ludo' };

const TEMPLATE = `
<div class="ludo">

  <!-- ── who is playing ── -->
  <section class="ludo-screen is-active" data-screen="setup">
    <div class="setup-wrap">
      <h2 class="game-name">Ludo</h2>
      <p class="setup-hint">Tap a colour to change who plays</p>

      <div class="seats" data-el="seats"></div>

      <button class="big-btn" data-el="play">Play</button>

      <div class="setup-foot">
        <button class="ghost-btn" data-el="quick">Just me vs the computer</button>
        <button class="ghost-btn" data-el="how">How to play</button>
        <button class="ghost-btn" data-el="back">&larr; All games</button>
      </div>
    </div>
  </section>

  <!-- ── the board ── -->
  <section class="ludo-screen" data-screen="board">
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

</div>`;

const CYCLE = { human: 'cpu', cpu: 'off', off: 'human' };

function pawnSVG(color) {
  const c = COLORS[color];
  return `<svg viewBox="0 0 100 100" aria-hidden="true">
    <ellipse cx="50" cy="86" rx="30" ry="9" fill="rgba(67,51,31,.18)"/>
    <circle cx="50" cy="62" r="26" fill="${c.main}" stroke="${c.dark}" stroke-width="6"/>
    <circle cx="50" cy="30" r="18" fill="${c.main}" stroke="${c.dark}" stroke-width="6"/>
    <ellipse cx="43" cy="24" rx="6" ry="4" fill="rgba(255,255,255,.8)" transform="rotate(-25 43 24)"/>
  </svg>`;
}

export function mount(host, shell) {
  host.innerHTML = TEMPLATE;
  const root = host.firstElementChild;
  const el = (name) => root.querySelector(`[data-el="${name}"]`);
  const screen = (name) => root.querySelector(`[data-screen="${name}"]`);

  /* ── who is playing ── */
  const seats = { red: 'human', green: 'cpu', yellow: 'off', blue: 'off' };
  try {
    const saved = JSON.parse(localStorage.getItem('khel.ludo.seats') || 'null');
    if (saved && ORDER.every((c) => ['human', 'cpu', 'off'].includes(saved[c]))) Object.assign(seats, saved);
  } catch { /* ignore */ }

  /* The card stays short so it never wraps; the computer's full name
     ("Robo Red") shows on the board, where there is room for it. */
  const seatLabel = (color) =>
    seats[color] === 'off' ? 'Not playing'
      : `${seats[color] === 'human' ? '🙂' : '🤖'} ${COLORS[color].name}`;

  el('seats').innerHTML = ORDER.map((color) => `
    <button class="seat" data-color="${color}" data-state="${seats[color]}">
      ${pawnSVG(color)}
      <span class="who">${seatLabel(color)}</span>
    </button>`).join('');

  function refreshSeats() {
    el('seats').querySelectorAll('.seat').forEach((btn) => {
      const color = btn.dataset.color;
      btn.dataset.state = seats[color];
      btn.querySelector('.who').textContent = seatLabel(color);
    });

    const playing = ORDER.filter((c) => seats[c] !== 'off');
    const humans = ORDER.filter((c) => seats[c] === 'human');
    const ok = playing.length >= 2 && humans.length >= 1;
    el('play').disabled = !ok;
    el('play').textContent = ok
      ? (playing.length === 2 ? 'Play' : `Play with ${playing.length}`)
      : 'Pick 2 players';

    try { localStorage.setItem('khel.ludo.seats', JSON.stringify(seats)); } catch { /* ignore */ }
  }

  /* ── screens ── */
  const showSetup = () => {
    screen('setup').classList.add('is-active');
    screen('board').classList.remove('is-active');
  };
  const showBoard = () => {
    screen('setup').classList.remove('is-active');
    screen('board').classList.add('is-active');
  };

  const game = createController(root, el);

  function start() {
    unlock();
    showBoard();
    game.start({ ...seats });
  }

  /* ── wiring ── */
  const on = (name, ev, fn) => el(name).addEventListener(ev, fn);

  el('seats').querySelectorAll('.seat').forEach((btn) => {
    btn.addEventListener('click', () => {
      unlock();
      seats[btn.dataset.color] = CYCLE[seats[btn.dataset.color]];
      sfx.tap();
      refreshSeats();
    });
  });

  on('play', 'click', start);

  on('quick', 'click', () => {
    seats.red = 'human'; seats.green = 'cpu'; seats.yellow = 'off'; seats.blue = 'off';
    refreshSeats();
    start();
  });

  on('how', 'click', () => el('helpOverlay').classList.add('is-active'));
  on('helpClose', 'click', () => el('helpOverlay').classList.remove('is-active'));
  on('back', 'click', () => shell.goHome());

  on('quit', 'click', () => {
    game.stop();
    el('winOverlay').classList.remove('is-active');
    shell.goHome();
  });

  on('again', 'click', () => {
    el('winOverlay').classList.remove('is-active');
    game.start({ ...seats });
  });

  on('changePlayers', 'click', () => {
    game.stop();
    el('winOverlay').classList.remove('is-active');
    showSetup();
  });

  refreshSeats();
  showSetup();

  /* for the automated tests */
  globalThis.LUDO = { game, seats, start, refreshSeats, geom: { cellOf } };

  return function unmount() {
    game.destroy();
    delete globalThis.LUDO;
  };
}
