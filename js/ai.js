/* ═══════════════════════════════════════════════════════════════
   ai.js — the computer players.

   Deliberately only "pretty good". A five-year-old should win
   often enough to keep playing, so the computer plays a sensible
   move most of the time and a merely-fine one the rest.
   ═══════════════════════════════════════════════════════════════ */

import { HOME_REL, TRACK_END, absIndex, isSafeRel } from './config.js';
import { current } from './rules.js';

const MERCY = 0.28;   // chance of picking a random legal move instead of the best

export function chooseMove(g, moves) {
  if (moves.length === 1) return moves[0];
  if (Math.random() < MERCY) return moves[Math.floor(Math.random() * moves.length)];

  let best = moves[0];
  let bestScore = -Infinity;
  for (const m of moves) {
    const s = score(g, m) + Math.random() * 6;   // small jitter breaks ties naturally
    if (s > bestScore) { bestScore = s; best = m; }
  }
  return best;
}

function score(g, move) {
  const me = current(g);
  let s = 0;

  if (move.captures.length) s += 100 * move.captures.length;
  if (move.entersHome) s += 90;
  if (move.isEntry) s += 55;

  // reaching a star or a start square is worth something
  if (move.to <= TRACK_END && isSafeRel(me.color, move.to)) s += 28;

  // getting out of trouble, or walking into it
  if (threatened(g, me, move.from)) s += 22;
  if (move.to <= TRACK_END && threatened(g, me, move.to)) s -= 26;

  // entering the home column is quietly good
  if (move.to > TRACK_END && move.to < HOME_REL) s += 18;

  // otherwise, push the leading token along
  s += move.to * 0.35;

  return s;
}

/** Could an opponent land on this square with a roll of 1-6? */
function threatened(g, me, rel) {
  if (rel < 0 || rel > TRACK_END) return false;
  if (isSafeRel(me.color, rel)) return false;

  const target = absIndex(me.color, rel);
  for (const p of g.players) {
    if (p === me) continue;
    for (const r of p.tokens) {
      if (r < 0 || r > TRACK_END) continue;
      for (let d = 1; d <= 6; d++) {
        const to = r + d;
        if (to <= TRACK_END && absIndex(p.color, to) === target) return true;
      }
    }
  }
  return false;
}
