/* ═══════════════════════════════════════════════════════════════
   rules.js — Snakes & Ladders, with no rendering in sight.

     · everyone starts on square 1, one piece each
     · roll and walk that many squares
     · a ladder's foot carries you up, a snake's head carries you down
     · reaching 100, or rolling past it, finishes you
     · a 6 earns another roll; three in a row forfeits the turn
     · the round runs on until everyone has a placing
   ═══════════════════════════════════════════════════════════════ */

import { ORDER, COLORS, CPU_NAMES, FINAL, START, JUMPS, isSnake } from './config.js';

export function createGame(seats, names = {}) {
  const players = ORDER
    .filter((c) => seats[c] && seats[c] !== 'off')
    .map((color) => ({
      color,
      kind: seats[color],
      label: seats[color] === 'cpu'
        ? CPU_NAMES[color]
        : (names[color]?.trim() || COLORS[color].name),
      pos: START,
    }));

  return {
    players,
    turn: 0,
    dice: null,
    sixStreak: 0,
    winner: null,
    finished: [],       // colours, in the order they got home
    phase: 'roll',      // 'roll' | 'rolling' | 'moving' | 'over'
  };
}

export const current = (g) => g.players[g.turn];
export const isDone = (player) => player.pos >= FINAL;

/**
 * Play one roll for the current player.
 * Returns everything the screen needs to animate it:
 *   walk  — the squares stepped through, one at a time
 *   jump  — { kind, from, to } if a snake or ladder took over
 */
export function applyRoll(g, dice) {
  const me = current(g);
  const events = [];

  const landed = Math.min(me.pos + dice, FINAL);
  const walk = [];
  for (let s = me.pos + 1; s <= landed; s++) walk.push(s);
  me.pos = landed;

  let jump = null;
  if (landed < FINAL && JUMPS[landed] !== undefined) {
    const to = JUMPS[landed];
    jump = { kind: isSnake(landed) ? 'snake' : 'ladder', from: landed, to };
    me.pos = to;
    events.push({ type: jump.kind, label: me.label, from: landed, to });
  }

  if (isDone(me)) {
    g.finished.push(me.color);
    if (!g.winner) g.winner = me.color;
    events.push({ type: 'finish', color: me.color, label: me.label, place: g.finished.length });

    if (g.finished.length >= g.players.length - 1) {
      for (const p of g.players) {
        if (!g.finished.includes(p.color)) g.finished.push(p.color);
      }
      g.phase = 'over';
      events.push({ type: 'over', order: [...g.finished] });
      return { events, walk, jump, extraTurn: false, over: true };
    }
    return { events, walk, jump, extraTurn: false, over: false };
  }

  return { events, walk, jump, extraTurn: dice === 6, over: false };
}

/** Hand the turn to the next player who is still climbing. */
export function nextTurn(g) {
  for (let i = 1; i <= g.players.length; i++) {
    const next = (g.turn + i) % g.players.length;
    if (!isDone(g.players[next])) { g.turn = next; break; }
  }
  g.dice = null;
  g.sixStreak = 0;
  g.phase = 'roll';
}

/** Keep the turn but clear the die (after a 6). */
export function sameTurn(g) {
  g.dice = null;
  g.phase = 'roll';
}
