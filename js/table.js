/* ═══════════════════════════════════════════════════════════════
   table.js — "who's playing", shared by every game that seats two
   to four people round one device.

   A seat holds a family member's id, 'cpu', or 'off'. Nobody types a
   name here: they pick a face. Scores are counted against the member
   id, so they survive a rename and never fork on a typo.
   ═══════════════════════════════════════════════════════════════ */

import * as family from './family.js';
import { pawnSVG } from './pawn.js';
import { sfx, unlock } from './audio.js';
import { readJSON, writeJSON } from './store.js';
import { escapeHtml } from './text.js';

/**
 * @param opts.seatsEl   container for the seat cards
 * @param opts.playEl    the Play button (its label tracks the table)
 * @param opts.resetEl   "clear the scores" (hidden when there's nothing to clear)
 * @param opts.pickEl    the sheet that opens when a seat is tapped
 * @param opts.game      'ludo' — used for this game's own seats and scores
 * @param opts.order     colour keys, in turn order
 * @param opts.colors    { red: { main, dark, name }, … }
 * @param opts.cpuNames  { red: 'Red Panda', … }
 * @param opts.cpuFaces  { red: '🐼', … }
 */
export function createTable(opts) {
  const { seatsEl, playEl, resetEl, pickEl, game, order, colors, cpuNames, cpuFaces } = opts;
  const KEY = { seats: `khel.${game}.seats`, tally: `khel.${game}.tally` };

  const read = readJSON;
  const write = writeJSON;

  /* ── who is in which seat ─────────────────────────────────── */
  let occupants = read(KEY.seats, null) || {};
  let tally = read(KEY.tally, {}) || {};

  function tidy() {
    // a seat pointing at someone who has left the family is empty again
    for (const colour of order) {
      const who = occupants[colour];
      if (who !== 'cpu' && who !== 'off' && !family.byId(who)) occupants[colour] = 'off';
    }
    // and nobody sits in two seats at once
    const seen = new Set();
    for (const colour of order) {
      const who = occupants[colour];
      if (who === 'cpu' || who === 'off' || !who) continue;
      if (seen.has(who)) occupants[colour] = 'off'; else seen.add(who);
    }
    if (order.every((c) => occupants[c] === 'off' || !occupants[c])) seatFirstTwo();
  }

  function seatFirstTwo() {
    const people = family.all();
    order.forEach((colour, i) => { occupants[colour] = people[i] ? people[i].id : 'off'; });
    for (const colour of order.slice(2)) occupants[colour] = 'off';
  }

  if (!Object.keys(occupants).length) seatFirstTwo();
  tidy();

  const save = () => { write(KEY.seats, occupants); write(KEY.tally, tally); };

  const isPerson = (who) => who !== 'cpu' && who !== 'off' && !!who;
  const labelOf = (colour) => {
    const who = occupants[colour];
    if (who === 'cpu') return cpuNames[colour];
    return isPerson(who) ? family.label(who) : colors[colour].name;
  };

  /* ── the seat cards ───────────────────────────────────────── */
  seatsEl.innerHTML = order.map((colour) => `
    <button class="seat" data-colour="${colour}" data-state="off"
            aria-label="Choose who plays ${colors[colour].name}">
      ${pawnSVG(colors[colour])}
      <span class="seat-who" data-role="who"></span>
      <span class="seat-tally" data-role="tally"></span>
    </button>`).join('');

  function refresh() {
    tidy();
    seatsEl.querySelectorAll('.seat').forEach((card) => {
      const colour = card.dataset.colour;
      const who = occupants[colour];
      card.dataset.state = who === 'cpu' ? 'cpu' : (isPerson(who) ? 'human' : 'off');
      // the piece already says which colour it is, so the card only needs
      // the animal — the full "Yellow Duck" shows wherever there's room
      const animal = cpuNames[colour].split(' ').pop();
      card.querySelector('[data-role="who"]').textContent =
        who === 'cpu' ? `${cpuFaces[colour]} ${animal}` : (isPerson(who) ? family.label(who) : 'Empty');

      const wins = isPerson(who) ? (tally[who] || 0) : 0;
      card.querySelector('[data-role="tally"]').textContent = wins ? `🏆 ${wins}` : '';
    });

    const playing = order.filter((c) => occupants[c] !== 'off');
    const people = order.filter((c) => isPerson(occupants[c]));
    const ok = playing.length >= 2 && people.length >= 1;
    playEl.disabled = !ok;
    playEl.textContent = ok
      ? (playing.length === 2 ? 'Play' : `Play with ${playing.length}`)
      : 'Pick 2 players';

    if (resetEl) resetEl.hidden = Object.values(tally).every((n) => !n);
    save();
  }

  /* ── choosing who sits here ───────────────────────────────── */
  let pickingColour = null;

  function openPicker(colour) {
    pickingColour = colour;
    const taken = new Set(order.filter((c) => c !== colour && isPerson(occupants[c])).map((c) => occupants[c]));

    pickEl.querySelector('[data-role="pick-title"]').textContent = `Who's playing ${colors[colour].name}?`;
    pickEl.querySelector('[data-role="pick-list"]').innerHTML = [
      ...family.all().map((m) => `
        <button class="pick-option" data-who="${m.id}" ${taken.has(m.id) ? 'disabled' : ''}>
          <span class="pick-dot" style="background:${m.tint}"></span>
          <span class="pick-name">${escapeHtml(m.name)}</span>
          ${occupants[colour] === m.id ? '<span class="pick-tick">✓</span>' : ''}
          ${taken.has(m.id) ? '<span class="pick-note">already playing</span>' : ''}
        </button>`),
      `<button class="pick-option" data-who="cpu">
         <span class="pick-dot pick-robot">${cpuFaces[colour]}</span>
         <span class="pick-name">${cpuNames[colour]}</span>
         ${occupants[colour] === 'cpu' ? '<span class="pick-tick">✓</span>' : ''}
       </button>`,
      `<button class="pick-option" data-who="off">
         <span class="pick-dot pick-empty"></span>
         <span class="pick-name">Nobody</span>
         ${occupants[colour] === 'off' ? '<span class="pick-tick">✓</span>' : ''}
       </button>`,
    ].join('');

    pickEl.classList.add('is-active');
  }

  function closePicker() {
    pickEl.classList.remove('is-active');
    pickingColour = null;
  }

  seatsEl.addEventListener('click', (ev) => {
    const card = ev.target.closest('.seat');
    if (!card) return;
    unlock();
    sfx.tap();
    openPicker(card.dataset.colour);
  });

  pickEl.addEventListener('click', (ev) => {
    const option = ev.target.closest('.pick-option');
    if (option && !option.disabled && pickingColour) {
      occupants[pickingColour] = option.dataset.who;
      sfx.tap();
      closePicker();
      refresh();
      return;
    }
    if (ev.target === pickEl || ev.target.closest('[data-role="pick-close"]')) closePicker();
  });

  const offFamily = family.onChange(refresh);

  /* ── the score ────────────────────────────────────────────── */
  /** The running score, as one line. Changes nothing. */
  function tallyText() {
    return order
      .filter((c) => occupants[c] !== 'off')
      .map((c) => ({ name: labelOf(c), wins: isPerson(occupants[c]) ? (tally[occupants[c]] || 0) : 0 }))
      .sort((a, b) => b.wins - a.wins)
      .map(({ name, wins }) => `${name} ${wins}`)
      .join('  ·  ');
  }

  /** A win for whoever finished first, and the line that shows it. */
  function recordWin(finishOrder) {
    const champion = occupants[finishOrder[0]];
    if (isPerson(champion)) tally[champion] = (tally[champion] || 0) + 1;
    save();
    refresh();
    return tallyText();
  }

  resetEl?.addEventListener('click', () => {
    tally = {};
    sfx.tap();
    refresh();
  });

  function soloVsComputer() {
    const first = family.all()[0];
    order.forEach((c, i) => { occupants[c] = i === 0 ? (first?.id || 'off') : (i === 1 ? 'cpu' : 'off'); });
    refresh();
  }

  /** What the game itself needs: a kind and a name per colour. */
  function lineup() {
    const seats = {}, names = {};
    for (const colour of order) {
      const who = occupants[colour];
      seats[colour] = who === 'cpu' ? 'cpu' : (isPerson(who) ? 'human' : 'off');
      names[colour] = labelOf(colour);
    }
    return [seats, names];
  }

  return {
    refresh, recordWin, tallyText, soloVsComputer, lineup, closePicker,
    /* The family outlives any one game, so its listener has to be let go
       when the game does — otherwise every visit leaves another one behind,
       holding on to a screen that no longer exists. */
    destroy() { offFamily(); },
    get occupants() { return occupants; },
    assign(colour, who) { occupants[colour] = who; refresh(); },
  };
}
