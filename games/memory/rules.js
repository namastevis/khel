/* ═══════════════════════════════════════════════════════════════
   rules.js — the game, with no screen attached.

   Nothing here touches the DOM, so the whole thing can be played
   thousands of times over in node to prove it behaves.
   ═══════════════════════════════════════════════════════════════ */

import { DECK, FAMILIES } from './deck.js';
import { SIZES, CPU_SPAN, MERCY } from './config.js';

const random = () => Math.random();

/* ── choosing the pictures ─────────────────────────────────
   Round-robin across the colour families, never a flat random draw.
   A flat draw from twenty-four can hand you four green things and
   nothing else, which is the round that ends in tears; going round
   the families guarantees the table is spread as widely as the size
   allows, and it is what turns "more cards" into "harder cards"
   at the top end. */
export function pickPictures(pairs, rng = random, avoid = []) {
  const stale = new Set(avoid);

  const byFamily = FAMILIES.map((f) => {
    const pool = shuffle(DECK.filter((p) => p.family === f).map((p) => p.id), rng);
    // last round's pictures go to the back of their own family, so a
    // replay is a fresh table rather than the one just memorised
    return [...pool.filter((id) => !stale.has(id)), ...pool.filter((id) => stale.has(id))];
  });

  const families = shuffle(byFamily.map((_, i) => i), rng);
  const picked = [];
  for (let round = 0; picked.length < pairs; round++) {
    if (round >= 4) break;                    // four pictures per family, and no more
    for (const f of families) {
      if (picked.length >= pairs) break;
      const id = byFamily[f][round];
      if (id) picked.push(id);
    }
  }
  return picked;
}

/* ── laying them out ───────────────────────────────────────
   Every round is shuffled from scratch, and never into the
   arrangement it just had: a "play again" must not be the board
   somebody already learned. */
export function layOut(ids, rng = random, previous = null) {
  const cards = [...ids, ...ids];
  for (let attempt = 0; attempt < 30; attempt++) {
    const deal = shuffle(cards, rng);
    if (!previous || previous.length !== deal.length) return deal;
    const same = deal.filter((id, i) => id === previous[i]).length;
    if (same <= Math.floor(deal.length / 3)) return deal;
  }
  return shuffle(cards, rng);
}

function shuffle(list, rng) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ── a round ───────────────────────────────────────────────
   @param seats  { red: 'human' | 'cpu' | 'off', … }
   @param names  { red: 'Chueen', … }                             */
export function createGame({ size = 1, seats, names, order, rng = random, previous = null }) {
  const { pairs } = SIZES[size];
  const ids = pickPictures(pairs, rng, previous?.pictures || []);
  const deal = layOut(ids, rng, previous?.deal || null);

  const players = order
    .filter((c) => seats[c] !== 'off')
    .map((color) => ({
      color,
      kind: seats[color],
      name: names[color],
      pairs: 0,
      memory: [],                 // what a computer player has seen lately
    }));

  return {
    size,
    pictures: ids,
    deal,
    cards: deal.map((id, index) => ({ id, index, faceUp: false, takenBy: null })),
    players,
    turn: 0,
    flipped: [],                  // indices face up in this go, 0–2
    phase: players.length ? 'playing' : 'over',
    finished: [],
    left: pairs,
  };
}

export const current = (g) => g.players[g.turn];
export const isOver = (g) => g.phase === 'over';
const live = (c) => !c.takenBy && !c.faceUp;

/** True when this card can be turned over right now. */
export function canFlip(g, i) {
  if (g.phase !== 'playing' || g.flipped.length >= 2) return false;
  const card = g.cards[i];
  return !!card && live(card);
}

/** Turn one card face up. Returns how many are now up, or 0 if refused. */
export function flip(g, i) {
  if (!canFlip(g, i)) return 0;
  g.cards[i].faceUp = true;
  g.flipped.push(i);
  for (const p of g.players) if (p.kind === 'cpu') remember(p, g.cards[i]);
  return g.flipped.length;
}

/* Two are up: do they match? The caller decides how long to let
   everyone look before calling this. */
export function resolve(g) {
  if (g.flipped.length !== 2) return null;
  const [i, j] = g.flipped;
  const a = g.cards[i], b = g.cards[j];
  const me = current(g);
  const matched = a.id === b.id;

  if (matched) {
    a.takenBy = b.takenBy = me.color;
    me.pairs += 1;
    g.left -= 1;
    for (const p of g.players) if (p.kind === 'cpu') forget(p, a.id);
  } else {
    a.faceUp = b.faceUp = false;
  }

  g.flipped = [];

  if (g.left === 0) {
    g.phase = 'over';
    g.finished = standings(g).map((p) => p.color);
  } else if (!matched) {
    g.turn = (g.turn + 1) % g.players.length;
  }

  return { matched, cards: [i, j], id: a.id, by: me.color, over: g.phase === 'over' };
}

/** Everyone, best first. Ties go to whoever sat down first. */
export function standings(g) {
  return g.players
    .map((p, seat) => ({ ...p, seat }))
    .sort((x, y) => y.pairs - x.pairs || x.seat - y.seat);
}

/* ── the computer ──────────────────────────────────────────
   It sees every card anyone turns over — the same information a
   person at the table has — and remembers the last CPU_SPAN of them.
   That single number is its whole difficulty, and MERCY is the thumb
   on the scale: a quarter of the time it knows exactly where a pair
   is and goes poking about somewhere else instead. */
function remember(p, card) {
  p.memory = p.memory.filter((m) => m.index !== card.index);
  p.memory.push({ index: card.index, id: card.id });
  while (p.memory.length > CPU_SPAN) p.memory.shift();
}

function forget(p, id) {
  p.memory = p.memory.filter((m) => m.id !== id);
}

/** The card the computer would turn over next. */
export function cpuChoice(g, rng = random) {
  const me = current(g);
  const open = g.cards.filter((c) => live(c)).map((c) => c.index);
  if (!open.length) return null;

  const known = me.memory.filter((m) => open.includes(m.index));
  const pick = (list) => list[Math.floor(rng() * list.length)];

  if (g.flipped.length === 0) {
    const pair = knownPair(known);
    if (pair && rng() > MERCY) return pair[0];
    return pick(open);
  }

  // one is already up: is its twin somewhere it remembers?
  const up = g.cards[g.flipped[0]];
  const twin = known.find((m) => m.id === up.id && m.index !== up.index);
  if (twin && rng() > MERCY) return twin.index;
  return pick(open);
}

function knownPair(known) {
  for (let i = 0; i < known.length; i++) {
    for (let j = i + 1; j < known.length; j++) {
      if (known[i].id === known[j].id) return [known[i].index, known[j].index];
    }
  }
  return null;
}
