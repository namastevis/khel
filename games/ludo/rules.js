/* ═══════════════════════════════════════════════════════════════
   rules.js — classic Ludo rules, with no rendering in sight.

   Implemented:
     · a 6 is needed to bring a token out of the yard
     · 52-square loop, then a 5-square home column
     · the exact number is needed to finish (rel 56)
     · landing on an opponent on an unsafe square sends it home
     · start squares and the four stars are safe
     · extra turn for a 6, for a capture, and for finishing a token
     · three 6s in a row forfeits the turn
   ═══════════════════════════════════════════════════════════════ */

import { ORDER, COLORS, CPU_NAMES, HOME_REL, TRACK_END, absIndex, isSafeRel } from './config.js';

/**
 * @param seats { red: 'human'|'cpu'|'off', … }
 * @param names { red: 'Chueen', … } — what a human player calls themselves
 */
export function createGame(seats, names = {}) {
  const players = ORDER
    .filter((c) => seats[c] && seats[c] !== 'off')
    .map((color) => ({
      color,
      kind: seats[color],
      label: seats[color] === 'cpu'
        ? CPU_NAMES[color]
        : (names[color]?.trim() || COLORS[color].name),
      tokens: [-1, -1, -1, -1],
    }));

  return {
    players,
    turn: 0,
    dice: null,
    sixStreak: 0,
    winner: null,
    finished: [],       // colours, in the order they got all four pieces home
    phase: 'roll',      // 'roll' | 'pick' | 'over'
  };
}

export const current = (g) => g.players[g.turn];

export function rollDie() {
  if (globalThis.crypto?.getRandomValues) {
    const buf = new Uint8Array(1);
    do { crypto.getRandomValues(buf); } while (buf[0] > 251);   // avoid modulo bias
    return (buf[0] % 6) + 1;
  }
  return Math.floor(Math.random() * 6) + 1;
}

/** Every legal move for the current player with the given die. */
export function legalMoves(g, dice) {
  const me = current(g);
  const moves = [];

  me.tokens.forEach((rel, token) => {
    let to;
    if (rel === -1) {
      if (dice !== 6) return;
      to = 0;
    } else if (rel === HOME_REL) {
      return;                              // already finished
    } else {
      to = rel + dice;
      if (to > HOME_REL) return;           // needs the exact roll
    }

    moves.push({
      token,
      from: rel,
      to,
      isEntry: rel === -1,
      entersHome: to === HOME_REL,
      captures: capturesAt(g, me, to),
    });
  });

  return moves;
}

function capturesAt(g, me, to) {
  const hits = [];
  if (to < 0 || to > TRACK_END) return hits;      // the home column is private
  if (isSafeRel(me.color, to)) return hits;       // stars and start squares protect

  const target = absIndex(me.color, to);
  g.players.forEach((p, pi) => {
    if (p === me) return;
    p.tokens.forEach((rel, ti) => {
      if (rel < 0 || rel > TRACK_END) return;
      if (absIndex(p.color, rel) === target) hits.push({ player: pi, token: ti });
    });
  });
  return hits;
}

/** The cells a token passes through, used for the hop animation. */
export function pathOf(move) {
  if (move.isEntry) return [0];
  const cells = [];
  for (let r = move.from + 1; r <= move.to; r++) cells.push(r);
  return cells;
}

export const isDone = (player) => player.tokens.every((t) => t === HOME_REL);

/** Apply a move. Returns { events, extraTurn, over }. */
export function applyMove(g, move) {
  const me = current(g);
  const events = [];

  me.tokens[move.token] = move.to;

  if (move.isEntry) events.push({ type: 'enter', color: me.color });
  for (const hit of move.captures) {
    g.players[hit.player].tokens[hit.token] = -1;
    events.push({ type: 'capture', by: me.label, victim: g.players[hit.player].label });
  }
  if (move.entersHome) events.push({ type: 'home', color: me.color });

  // Someone getting all four pieces home takes a place — it does not end
  // the game. Everyone else plays on for the places below, so nobody is
  // simply cut off mid-race.
  if (isDone(me)) {
    g.finished.push(me.color);
    if (!g.winner) g.winner = me.color;
    events.push({ type: 'finish', color: me.color, label: me.label, place: g.finished.length });

    // when only one player is still going, they take the last place
    if (g.finished.length >= g.players.length - 1) {
      for (const p of g.players) {
        if (!g.finished.includes(p.color)) g.finished.push(p.color);
      }
      g.phase = 'over';
      events.push({ type: 'over', order: [...g.finished] });
      return { events, extraTurn: false, over: true };
    }

    return { events, extraTurn: false, over: false };   // their race is run
  }

  const extraTurn = g.dice === 6 || move.captures.length > 0 || move.entersHome;
  return { events, extraTurn, over: false };
}

/** Hand the turn to the next player who still has pieces to move. */
export function nextTurn(g) {
  for (let i = 1; i <= g.players.length; i++) {
    const next = (g.turn + i) % g.players.length;
    if (!isDone(g.players[next])) { g.turn = next; break; }
  }
  g.dice = null;
  g.sixStreak = 0;
  g.phase = 'roll';
}

/** Keep the turn but clear the die (after a 6, a capture, or a finish). */
export function sameTurn(g) {
  g.dice = null;
  g.phase = 'roll';
}
