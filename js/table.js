/* ═══════════════════════════════════════════════════════════════
   table.js — "who's playing", shared by every game that seats
   two to four people round one device.

   Owns: the seat cards, whose seat is whose, the names people type,
   the running score, and remembering all of it on this device.
   Knows nothing about any particular game.
   ═══════════════════════════════════════════════════════════════ */

import { pawnSVG } from './pawn.js';
import { sfx, unlock } from './audio.js';

const CYCLE = { human: 'cpu', cpu: 'off', off: 'human' };

/**
 * @param opts.seatsEl   container for the seat cards
 * @param opts.playEl    the Play button (its label tracks the table)
 * @param opts.resetEl   the "clear the scores" button (hidden when there's nothing to clear)
 * @param opts.prefix    localStorage prefix, e.g. 'khel.ludo'
 * @param opts.order     colour keys, in turn order
 * @param opts.colors    { red: { main, dark, name }, … }
 * @param opts.cpuNames  { red: 'Robo Red', … }
 * @param opts.defaults  { red: 'Chueen', … } — a fresh device's table
 */
export function createTable(opts) {
  const { seatsEl, playEl, resetEl, prefix, order, colors, cpuNames, defaults } = opts;

  const seats = { ...opts.startingSeats };
  const names = { ...defaults };
  let tally = {};

  const read = (key, fallback) => {
    try { return JSON.parse(localStorage.getItem(`${prefix}.${key}`) || 'null') ?? fallback; }
    catch { return fallback; }          // private mode, or something we didn't write
  };

  const savedSeats = read('seats', null);
  if (savedSeats && order.every((c) => ['human', 'cpu', 'off'].includes(savedSeats[c]))) {
    Object.assign(seats, savedSeats);
  }
  const savedNames = read('names', null);
  if (savedNames && order.every((c) => typeof savedNames[c] === 'string')) {
    Object.assign(names, savedNames);
  }
  tally = read('tally', {}) || {};

  function save() {
    try {
      localStorage.setItem(`${prefix}.seats`, JSON.stringify(seats));
      localStorage.setItem(`${prefix}.names`, JSON.stringify(names));
      localStorage.setItem(`${prefix}.tally`, JSON.stringify(tally));
    } catch { /* ignore */ }
  }

  // clearing a name shouldn't leave a nameless player at the table
  const nameOf = (c) => names[c].trim() || defaults[c] || colors[c].name;

  // what this seat is called in the scores, person or computer
  const labelFor = (c) => (seats[c] === 'cpu' ? cpuNames[c] : nameOf(c));

  seatsEl.innerHTML = order.map((color) => `
    <div class="seat" data-color="${color}" data-state="${seats[color]}">
      <button class="seat-pawn" data-role="cycle" aria-label="Change who plays ${colors[color].name}">
        ${pawnSVG(colors[color])}
      </button>
      <input class="seat-name" data-role="name" maxlength="10" spellcheck="false"
             autocapitalize="words" autocomplete="off" enterkeyhint="done"
             aria-label="Name of the ${colors[color].name} player" value="${nameOf(color)}" />
      <span class="seat-fixed" data-role="fixed"></span>
      <span class="seat-tally" data-role="tally"></span>
    </div>`).join('');

  function refresh() {
    seatsEl.querySelectorAll('.seat').forEach((card) => {
      const color = card.dataset.color;
      card.dataset.state = seats[color];

      const input = card.querySelector('[data-role="name"]');
      const fixed = card.querySelector('[data-role="fixed"]');

      // only a person gets to be called something
      if (seats[color] === 'human') {
        if (document.activeElement !== input) input.value = nameOf(color);
      } else {
        fixed.textContent = seats[color] === 'cpu' ? `🤖 ${cpuNames[color]}` : 'Not playing';
      }

      const wins = tally[labelFor(color)] || 0;
      card.querySelector('[data-role="tally"]').textContent =
        seats[color] === 'off' || !wins ? '' : `🏆 ${wins}`;
    });

    const playing = order.filter((c) => seats[c] !== 'off');
    const humans = order.filter((c) => seats[c] === 'human');
    const ok = playing.length >= 2 && humans.length >= 1;
    playEl.disabled = !ok;
    playEl.textContent = ok
      ? (playing.length === 2 ? 'Play' : `Play with ${playing.length}`)
      : 'Pick 2 players';

    if (resetEl) resetEl.hidden = Object.values(tally).every((n) => !n);
    save();
  }

  /* ── the seat cards ──────────────────────────────────────── */
  seatsEl.addEventListener('click', (ev) => {
    const pawn = ev.target.closest('[data-role="cycle"]');
    if (!pawn) return;
    const color = pawn.closest('.seat').dataset.color;
    unlock();
    seats[color] = CYCLE[seats[color]];
    sfx.tap();
    refresh();
  });

  seatsEl.addEventListener('input', (ev) => {
    const input = ev.target.closest('[data-role="name"]');
    if (!input) return;
    names[input.closest('.seat').dataset.color] = input.value;
    save();
  });

  // typing a name and hitting return shouldn't leave the keyboard up
  seatsEl.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter' && ev.target.closest('[data-role="name"]')) ev.target.blur();
  });

  seatsEl.addEventListener('blur', (ev) => {
    if (ev.target.closest('[data-role="name"]')) refresh();
  }, true);

  resetEl?.addEventListener('click', () => {
    tally = {};
    sfx.tap();
    refresh();
  });

  /* ── the score ───────────────────────────────────────────── */
  function recordWin(finishOrder) {
    const name = labelFor(finishOrder[0]);
    tally[name] = (tally[name] || 0) + 1;
    save();
    refresh();

    return order
      .filter((c) => seats[c] !== 'off')
      .map((c) => ({ name: labelFor(c), wins: tally[labelFor(c)] || 0 }))
      .sort((a, b) => b.wins - a.wins)
      .map(({ name: n, wins }) => `${n} ${wins}`)
      .join('  ·  ');
  }

  function soloVsComputer() {
    const [first, second] = order;
    for (const c of order) seats[c] = 'off';
    seats[first] = 'human';
    seats[second] = 'cpu';
    refresh();
  }

  return {
    seats, names, refresh, labelFor, recordWin, soloVsComputer,
    get tally() { return tally; },
  };
}
