/* Plays thousands of full games of Snakes & Ladders and checks the board
   never does anything impossible. Run with: node test/simulate-snakes.mjs */

import { createGame, applyRoll, nextTurn, sameTurn, current, isDone } from '../games/snakes/rules.js';
import { rollDie } from '../js/dice.js';
import { FINAL, START, JUMPS, LADDERS, SNAKES, cellOf, SIDE } from '../games/snakes/config.js';

const GAMES = Number(process.argv[2] || 2000);
let problems = 0;
const fail = (msg) => { if (problems++ < 12) console.error('  ✗', msg); };

/* ── the board itself has to make sense ── */
function checkBoard() {
  for (const [from, to] of Object.entries(LADDERS)) {
    if (Number(to) <= Number(from)) fail(`ladder ${from} → ${to} doesn't go up`);
  }
  for (const [from, to] of Object.entries(SNAKES)) {
    if (Number(to) >= Number(from)) fail(`snake ${from} → ${to} doesn't go down`);
  }
  for (const [from, to] of Object.entries(JUMPS)) {
    if (JUMPS[to] !== undefined) fail(`${from} lands on ${to}, which jumps again`);
    if (Number(from) === START) fail('a jump starts on the square everyone begins on');
    if (Number(from) >= FINAL || Number(to) > FINAL) fail(`jump ${from} → ${to} runs off the board`);
  }
  // every square must map to its own cell, and the walk must snake properly
  const seen = new Set();
  for (let n = 1; n <= FINAL; n++) {
    const [c, r] = cellOf(n);
    if (c < 0 || c > SIDE || r < 0 || r > SIDE) fail(`square ${n} is off the grid`);
    const key = `${c}:${r}`;
    if (seen.has(key)) fail(`square ${n} shares a cell with another square`);
    seen.add(key);
    if (n > 1) {
      const [pc, pr] = cellOf(n - 1);
      const step = Math.abs(c - pc) + Math.abs(r - pr);
      if (step !== 1) fail(`square ${n} isn't next to ${n - 1}`);
    }
  }
}

function playOne(seats) {
  const g = createGame(seats);
  let rolls = 0;

  while (g.phase !== 'over') {
    if (++rolls > 20000) { fail('game did not finish in 20000 rolls'); return null; }

    const d = rollDie();
    g.dice = d;
    g.sixStreak = d === 6 ? g.sixStreak + 1 : 0;
    if (g.sixStreak === 3) { nextTurn(g); continue; }

    const me = current(g);
    const before = me.pos;
    const { walk, jump, extraTurn, over } = applyRoll(g, d);

    if (walk.length !== Math.min(before + d, FINAL) - before) fail('the walk is the wrong length');
    if (walk.length && walk[walk.length - 1] !== Math.min(before + d, FINAL)) fail('the walk ends on the wrong square');
    if (jump && JUMPS[jump.from] !== jump.to) fail(`invented a jump from ${jump.from}`);
    if (me.pos < START || me.pos > FINAL) fail(`landed on square ${me.pos}`);
    if (me.pos !== FINAL && JUMPS[me.pos] !== undefined) fail(`stopped on ${me.pos}, which is a snake or ladder`);

    if (over) break;
    if (extraTurn && !isDone(current(g))) sameTurn(g); else nextTurn(g);
  }

  if (g.finished.length !== g.players.length) fail('not everyone got a placing');
  if (new Set(g.finished).size !== g.finished.length) fail('a player placed twice');
  if (g.finished[0] !== g.winner) fail('the winner is not the first one home');
  for (const c of g.finished.slice(0, -1)) {
    if (!isDone(g.players.find((p) => p.color === c))) fail(`${c} was placed without reaching 100`);
  }
  return { rolls, winner: g.winner };
}

checkBoard();

const LINEUPS = [
  { red: 'human', green: 'human', yellow: 'off', blue: 'off' },
  { red: 'human', green: 'cpu', yellow: 'cpu', blue: 'off' },
  { red: 'human', green: 'cpu', yellow: 'cpu', blue: 'cpu' },
];

const wins = {};
let total = 0, played = 0, longest = 0;
for (let i = 0; i < GAMES; i++) {
  const r = playOne(LINEUPS[i % LINEUPS.length]);
  if (!r) continue;
  played++; total += r.rolls; longest = Math.max(longest, r.rolls);
  wins[r.winner] = (wins[r.winner] || 0) + 1;
}

console.log(`played      : ${played} games`);
console.log(`avg rolls   : ${(total / played).toFixed(1)}`);
console.log(`longest game: ${longest} rolls`);
console.log('winners     :', wins);
console.log(problems === 0 ? '\n✅ no rule violations' : `\n❌ ${problems} problems`);
process.exit(problems === 0 ? 0 : 1);
