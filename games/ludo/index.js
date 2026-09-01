/* ═══════════════════════════════════════════════════════════════
   games/ludo/index.js — Ludo's entry point.

   The shell hands us a host element and a way back to the shelf.
   Everything this game needs — markup, listeners, timers — is
   created here and torn down again in unmount().
   ═══════════════════════════════════════════════════════════════ */

import { ORDER, COLORS, CPU_NAMES, cellOf } from './config.js';
import { createController } from './game.js';
import { sfx, unlock } from '../../js/audio.js';

export const meta = { id: 'ludo', title: 'Ludo' };

const TEMPLATE = `
<div class="ludo">

  <!-- ── who is playing ── -->
  <section class="ludo-screen is-active" data-screen="setup">
    <div class="setup-wrap">
      <h2 class="game-name">Ludo</h2>
      <p class="setup-who">Who's playing?</p>
      <p class="setup-hint">Tap a piece to swap between a person, the computer, and nobody &middot; tap a name to change it</p>

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

</div>`;

const CYCLE = { human: 'cpu', cpu: 'off', off: 'human' };

/* Who's usually round the table. Every one of these is editable on the
   setup screen, and the edits are remembered on that device — this is
   only what a fresh tablet starts with. */
const DEFAULT_NAMES = { red: 'Chueen', green: 'Mama', yellow: 'Papa', blue: 'Dada' };

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
  const seats = { red: 'human', green: 'human', yellow: 'off', blue: 'off' };
  const names = { ...DEFAULT_NAMES };

  const load = (key, into, valid) => {
    try {
      const saved = JSON.parse(localStorage.getItem(key) || 'null');
      if (saved && ORDER.every(valid(saved))) Object.assign(into, saved);
    } catch { /* private mode, or something we didn't write */ }
  };
  load('khel.ludo.seats', seats, (s) => (c) => ['human', 'cpu', 'off'].includes(s[c]));
  load('khel.ludo.names', names, (s) => (c) => typeof s[c] === 'string');

  /* ── who's ahead ──────────────────────────────────────────────
     Wins are counted against the name, not the colour, so Chueen keeps
     her tally whichever piece she picks. Kept on this device only, and
     there's a Reset when the scores stop being fun.                  */
  let tally = {};
  try { tally = JSON.parse(localStorage.getItem('khel.ludo.tally') || '{}') || {}; } catch { /* ignore */ }

  const save = () => {
    try {
      localStorage.setItem('khel.ludo.seats', JSON.stringify(seats));
      localStorage.setItem('khel.ludo.names', JSON.stringify(names));
      localStorage.setItem('khel.ludo.tally', JSON.stringify(tally));
    } catch { /* ignore */ }
  };

  // clearing a name shouldn't leave a nameless player at the table
  const nameOf = (color) => names[color].trim() || DEFAULT_NAMES[color] || COLORS[color].name;

  // what this seat is called in the scores, person or computer
  const labelFor = (color) => (seats[color] === 'cpu' ? CPU_NAMES[color] : nameOf(color));

  function recordWin(order) {
    const champion = order[0];
    const name = labelFor(champion);
    tally[name] = (tally[name] || 0) + 1;
    save();

    // the running score, best first, on the win card
    const line = ORDER
      .filter((c) => seats[c] !== 'off')
      .map((c) => ({ name: labelFor(c), wins: tally[labelFor(c)] || 0 }))
      .sort((a, b) => b.wins - a.wins)
      .map(({ name: n, wins }) => `${n} ${wins}`)
      .join('  ·  ');
    el('tallyRow').textContent = line;

    refreshSeats();
  }

  el('seats').innerHTML = ORDER.map((color) => `
    <div class="seat" data-color="${color}" data-state="${seats[color]}">
      <button class="seat-pawn" data-role="cycle" aria-label="Change who plays ${COLORS[color].name}">
        ${pawnSVG(color)}
      </button>
      <input class="seat-name" data-role="name" maxlength="10" spellcheck="false"
             autocapitalize="words" autocomplete="off" enterkeyhint="done"
             aria-label="Name of the ${COLORS[color].name} player" value="${nameOf(color)}" />
      <span class="seat-fixed" data-role="fixed"></span>
      <span class="seat-tally" data-role="tally"></span>
    </div>`).join('');

  function refreshSeats() {
    el('seats').querySelectorAll('.seat').forEach((card) => {
      const color = card.dataset.color;
      card.dataset.state = seats[color];

      const input = card.querySelector('[data-role="name"]');
      const fixed = card.querySelector('[data-role="fixed"]');

      // only a person gets to be called something
      if (seats[color] === 'human') {
        if (document.activeElement !== input) input.value = nameOf(color);
      } else {
        fixed.textContent = seats[color] === 'cpu' ? `🤖 ${CPU_NAMES[color]}` : 'Not playing';
      }

      const wins = tally[labelFor(color)] || 0;
      card.querySelector('[data-role="tally"]').textContent =
        seats[color] === 'off' || !wins ? '' : `🏆 ${wins}`;
    });

    const playing = ORDER.filter((c) => seats[c] !== 'off');
    const humans = ORDER.filter((c) => seats[c] === 'human');
    const ok = playing.length >= 2 && humans.length >= 1;
    el('play').disabled = !ok;
    el('play').textContent = ok
      ? (playing.length === 2 ? 'Play' : `Play with ${playing.length}`)
      : 'Pick 2 players';

    el('reset').hidden = Object.values(tally).every((n) => !n);

    save();
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

  const game = createController(root, el, { onGameOver: recordWin });

  function start() {
    unlock();
    showBoard();
    game.start({ ...seats }, { ...names });
  }

  /* ── wiring ── */
  const on = (name, ev, fn) => el(name).addEventListener(ev, fn);

  el('seats').addEventListener('click', (ev) => {
    const pawn = ev.target.closest('[data-role="cycle"]');
    if (!pawn) return;
    const color = pawn.closest('.seat').dataset.color;
    unlock();
    seats[color] = CYCLE[seats[color]];
    sfx.tap();
    refreshSeats();
  });

  el('seats').addEventListener('input', (ev) => {
    const input = ev.target.closest('[data-role="name"]');
    if (!input) return;
    names[input.closest('.seat').dataset.color] = input.value;
    save();
  });

  // typing a name and hitting return shouldn't leave the keyboard up
  el('seats').addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter' && ev.target.closest('[data-role="name"]')) ev.target.blur();
  });

  el('seats').addEventListener('blur', (ev) => {
    if (ev.target.closest('[data-role="name"]')) refreshSeats();
  }, true);

  on('play', 'click', start);

  on('quick', 'click', () => {
    seats.red = 'human'; seats.green = 'cpu'; seats.yellow = 'off'; seats.blue = 'off';
    refreshSeats();
    start();
  });

  on('reset', 'click', () => {
    tally = {};
    sfx.tap();
    refreshSeats();
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
    game.start({ ...seats }, { ...names });
  });

  on('changePlayers', 'click', () => {
    game.stop();
    el('winOverlay').classList.remove('is-active');
    showSetup();
  });

  refreshSeats();
  showSetup();

  /* for the automated tests */
  globalThis.LUDO = { game, seats, names, start, refreshSeats, geom: { cellOf } };

  return function unmount() {
    game.destroy();
    delete globalThis.LUDO;
  };
}
