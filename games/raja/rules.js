/* ═══════════════════════════════════════════════════════════════
   rules.js — Raja Mantri Chor Sipahi, with no screen attached.

   Everything here is plain data and pure-ish functions, so the whole
   game can be played thousands of times in node by test/simulate-raja.

   A round: deal the four chits → everyone peeks → the Raja shows
   himself → the Mantri shows himself → the Mantri points at the one
   he thinks is the Chor → score it. Five rounds, highest total wins.
   ═══════════════════════════════════════════════════════════════ */

import { ROLES, ROLE, ROUNDS } from './config.js';

const random = (rng) => (rng ? rng() : Math.random());

function shuffle(list, rng) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random(rng) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * @param seats  { red: 'human' | 'cpu' | 'off', … }  — 'off' becomes a computer:
 *               the game needs all four chits in play, every round.
 * @param names  { red: '🦊 Chueen', … }
 * @param cpu    { red: '🐼 Red Panda', … }  — names for seats the computer fills
 */
export function createGame({ seats, names, cpu, order, rounds = ROUNDS }) {
  const players = order.map((color) => {
    const kind = seats[color] === 'human' ? 'human' : 'cpu';
    return {
      color,
      kind,
      name: kind === 'human' || seats[color] === 'cpu' ? names[color] : cpu[color],
      total: 0,
    };
  });
  return { players, rounds, round: 0, roles: {}, phase: 'ready', last: null, history: [] };
}

/** Shuffle and hand out the four chits for the next round. */
export function deal(g, rng) {
  const chits = shuffle(ROLES, rng);
  g.roles = {};
  g.players.forEach((p, i) => { g.roles[p.color] = chits[i]; });
  g.round += 1;
  g.phase = 'peek';
  g.last = null;
  return g.roles;
}

export const holder = (g, role) => g.players.find((p) => g.roles[p.color] === role);

/** The two the Mantri has to choose between, in seat order. */
export const suspects = (g) => g.players.filter((p) => {
  const r = g.roles[p.color];
  return r === 'chor' || r === 'sipahi';
});

/** People who still have to look at their own chit this round. */
export const peekers = (g) => g.players.filter((p) => p.kind === 'human');

/**
 * The Mantri points at `accused`. Returns what each person scored this
 * round and whether the Chor was caught.
 */
export function judge(g, accused) {
  const target = g.players.find((p) => p.color === accused);
  if (!target || !suspects(g).includes(target)) throw new Error(`can't accuse ${accused}`);

  const caught = g.roles[accused] === 'chor';
  const gains = {};
  for (const p of g.players) {
    const role = g.roles[p.color];
    let pts = ROLE[role].points;
    if (!caught && role === 'mantri') pts = ROLE.chor.points;   // the swap
    if (!caught && role === 'chor') pts = ROLE.mantri.points;
    gains[p.color] = pts;
    p.total += pts;
  }

  g.last = { accused, caught, gains, roles: { ...g.roles } };
  g.history.push(g.last);
  g.phase = g.round >= g.rounds ? 'over' : 'scored';
  return g.last;
}

/** A computer Mantri has nothing to go on — the real game is a guess too. */
export function cpuGuess(g, rng) {
  const s = suspects(g);
  return s[Math.floor(random(rng) * s.length)].color;
}

export const isOver = (g) => g.phase === 'over';

/** Everyone, best first; ties keep seat order. */
export const standings = (g) =>
  g.players.map((p, i) => ({ ...p, seat: i })).sort((a, b) => b.total - a.total || a.seat - b.seat);
