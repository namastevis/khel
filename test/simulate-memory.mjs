/* Plays thousands of full rounds of Memory with no browser, and checks
   the things that would quietly ruin it: a round that isn't spread across
   the colours, a "play again" that deals the board somebody just learned,
   a pair that can't be found, a computer that remembers more than it is
   allowed to. Run with: node test/simulate-memory.mjs [rounds] */

import { createGame, flip, resolve, current, isOver, cpuChoice, pickPictures, layOut, standings }
  from '../games/memory/rules.js';
import { DECK, FAMILIES, byId } from '../games/memory/deck.js';
import { SIZES, ORDER, CPU_SPAN, gridFor } from '../games/memory/config.js';

const ROUNDS = Number(process.argv[2] || 2000);
let problems = 0;
const fail = (msg) => { if (problems++ < 12) console.error('  ✗', msg); };

/* ── the deck itself has to make sense ── */
{
  const seen = new Set();
  for (const p of DECK) {
    if (seen.has(p.id)) fail(`two pictures share the id "${p.id}"`);
    seen.add(p.id);
    if (!FAMILIES.includes(p.family)) fail(`${p.id} is in unknown family "${p.family}"`);
    if (!/^[A-Z]/.test(p.name)) fail(`${p.id} has no readable name`);
    if (!/<(circle|ellipse|rect|path|g)\b/.test(p.art)) fail(`${p.id} draws nothing`);
  }
  for (const f of FAMILIES) {
    const n = DECK.filter((p) => p.family === f).length;
    if (n !== 4) fail(`family "${f}" has ${n} pictures, not 4 — buildRound stops spreading evenly`);
  }
  const biggest = Math.max(...SIZES.map((s) => s.pairs));
  if (biggest > DECK.length) fail(`the biggest round wants ${biggest} pictures and the deck has ${DECK.length}`);
  for (const [i, s] of SIZES.entries()) {
    if (s.grid[0] * s.grid[1] !== s.pairs * 2) fail(`${s.label}: a ${s.grid} grid doesn't hold ${s.pairs * 2} cards`);
    const port = gridFor(i, false), land = gridFor(i, true);
    if (port.cols * port.rows !== s.cards || land.cols * land.rows !== s.cards) fail(`${s.label}: grid doesn't fit both ways up`);
  }
}

/* ── every round is spread across the colours ── */
for (let i = 0; i < 400; i++) {
  for (const s of SIZES) {
    const ids = pickPictures(s.pairs);
    if (ids.length !== s.pairs) fail(`${s.label}: asked for ${s.pairs} pictures, got ${ids.length}`);
    if (new Set(ids).size !== ids.length) fail(`${s.label}: the same picture twice in one round`);

    const per = {};
    for (const id of ids) per[byId(id).family] = (per[byId(id).family] || 0) + 1;
    const counts = Object.values(per);
    const ideal = Math.ceil(s.pairs / FAMILIES.length);
    if (Math.max(...counts) > ideal) {
      fail(`${s.label}: ${Math.max(...counts)} pictures from one colour, ${ideal} is the most it should be`);
    }
    // and at the small sizes, every card on the table is its own colour
    if (s.pairs <= FAMILIES.length && Math.max(...counts) !== 1) {
      fail(`${s.label}: should be one picture per colour, got ${Math.max(...counts)}`);
    }
  }
}

/* ── a replay is never the board you just learned ── */
{
  const ids = pickPictures(6);
  let deal = layOut(ids);
  for (let i = 0; i < 300; i++) {
    const next = layOut(ids, Math.random, deal);
    const same = next.filter((id, k) => id === deal[k]).length;
    if (same > Math.floor(next.length / 3)) fail(`a replay kept ${same} of ${next.length} cards where they were`);
    deal = next;
  }
}

/* ── and the pictures change too ── */
{
  let previous = { pictures: pickPictures(3), deal: null };
  let repeats = 0;
  for (let i = 0; i < 200; i++) {
    const next = pickPictures(3, Math.random, previous.pictures);
    repeats += next.filter((id) => previous.pictures.includes(id)).length;
    previous = { pictures: next, deal: null };
  }
  // three pairs from twenty-four: back-to-back repeats should be rare
  if (repeats > 60) fail(`${repeats} pictures carried over in 200 replays — the avoid list isn't working`);
}

/* ── nobody at the table ──
   The Play button is disabled in this state, but "Playing on my own" can
   reach it with an empty family, and a crash there would be the worst
   possible first impression. */
{
  const names = Object.fromEntries(ORDER.map((c) => [c, c]));
  const seats = { red: 'off', green: 'off', yellow: 'off', blue: 'off' };
  try {
    const g = createGame({ size: 0, seats, names, order: ORDER });
    if (g.players.length) fail('an empty table produced players');
    if (!isOver(g)) fail('an empty table did not end immediately');
    if (current(g) !== undefined) fail('an empty table has a current player');
  } catch (err) {
    fail(`an empty table threw: ${err.message}`);
  }
}

/* ── play them out ── */
function playOne(seats, size) {
  const names = Object.fromEntries(ORDER.map((c) => [c, c]));
  const g = createGame({ size, seats, names, order: ORDER });
  const total = SIZES[size].pairs;
  let turns = 0;

  while (!isOver(g)) {
    if (++turns > 100000) { fail('a round never finished'); return null; }

    const me = current(g);
    const before = g.turn;

    for (let n = 0; n < 2; n++) {
      // the person here remembers nothing at all and turns cards over at
      // random — the worst player there could be, which is what makes the
      // computer's win rate below a fair worst case rather than a boast
      const open = g.cards.filter((c) => !c.takenBy && !c.faceUp).map((c) => c.index);
      const choice = me.kind === 'cpu'
        ? cpuChoice(g)
        : open[Math.floor(Math.random() * open.length)];
      if (choice === null || choice === undefined) { fail('nothing left to turn over, but the round is not over'); return null; }
      if (flip(g, choice) !== n + 1) { fail('a card refused to turn over'); return null; }
    }

    if (g.cards.filter((c) => c.faceUp && !c.takenBy).length !== 2) fail('more than two cards face up at once');

    const out = resolve(g);
    if (!out) { fail('two cards were up and nothing resolved'); return null; }
    if (out.matched && g.cards.filter((c) => c.takenBy === out.by).length % 2 !== 0) {
      fail('a player holds an odd number of cards');
    }
    if (!out.matched && g.turn === before && g.players.length > 1) fail('a miss did not pass the turn');
    if (out.matched && g.turn !== before && !out.over) fail('a match lost the extra turn');

    for (const p of g.players) {
      if (p.kind === 'cpu' && p.memory.length > CPU_SPAN) fail(`the computer remembered ${p.memory.length} cards, ${CPU_SPAN} is the limit`);
    }
  }

  const taken = g.players.reduce((n, p) => n + p.pairs, 0);
  if (taken !== total) fail(`${taken} pairs were taken out of ${total}`);
  if (g.cards.some((c) => !c.takenBy)) fail('the round ended with a card still on the table');
  if (g.finished.length !== g.players.length) fail('not everyone got a placing');
  if (new Set(g.finished).size !== g.finished.length) fail('a player placed twice');

  const order = standings(g);
  for (let i = 1; i < order.length; i++) {
    if (order[i - 1].pairs < order[i].pairs) fail('the podium is out of order');
  }
  return { turns, winner: g.finished[0], top: order[0].pairs };
}

const LINEUPS = [
  { red: 'human', green: 'off', yellow: 'off', blue: 'off' },     // on your own
  { red: 'human', green: 'human', yellow: 'off', blue: 'off' },
  { red: 'human', green: 'cpu', yellow: 'off', blue: 'off' },
  { red: 'human', green: 'cpu', yellow: 'cpu', blue: 'off' },
  { red: 'human', green: 'human', yellow: 'human', blue: 'cpu' },
];

const wins = {};
let played = 0, totalTurns = 0;
for (let i = 0; i < ROUNDS; i++) {
  const r = playOne(LINEUPS[i % LINEUPS.length], i % SIZES.length);
  if (!r) continue;
  played++; totalTurns += r.turns;
  wins[r.winner] = (wins[r.winner] || 0) + 1;
}

/* ── is the computer beatable? ──
   A person who never remembers anything against a computer that does.
   If the computer wins nearly everything, the span or the mercy is
   wrong and the newest player at the table stops enjoying it. */
{
  let cpuWon = 0, rounds = 600;
  for (let i = 0; i < rounds; i++) {
    const r = playOne({ red: 'human', green: 'cpu', yellow: 'off', blue: 'off' }, 1);
    if (r?.winner === 'green') cpuWon++;
  }
  const share = cpuWon / rounds;
  console.log(`computer wins : ${(share * 100).toFixed(0)}% against a player who forgets everything`);
  if (share > 0.85) fail(`the computer wins ${(share * 100).toFixed(0)}% of the time — too strong to be fun`);
}

console.log(`played        : ${played} rounds`);
console.log(`avg goes      : ${(totalTurns / played).toFixed(1)}`);
console.log('winners       :', wins);
console.log(problems === 0 ? '\n✅ no rule violations' : `\n❌ ${problems} problems`);
process.exit(problems === 0 ? 0 : 1);
