/* Plays thousands of full games of Ludo headlessly and checks the rules
   never produce an impossible board. Run with:  node test/simulate.mjs   */

import { createGame, legalMoves, applyMove, nextTurn, sameTurn, rollDie, current, isDone } from '../games/ludo/rules.js';
import { chooseMove } from '../games/ludo/ai.js';
import { HOME_REL, TRACK_END, absIndex, isSafeRel, SAFE_INDICES } from '../games/ludo/config.js';

const GAMES = Number(process.argv[2] || 2000);
let problems = 0;
const fail = (msg) => { if (problems++ < 12) console.error('  ✗', msg); };

function checkBoard(g, where) {
  // every position must be legal
  for (const p of g.players) {
    for (const rel of p.tokens) {
      if (rel !== -1 && (rel < 0 || rel > HOME_REL || !Number.isInteger(rel))) {
        fail(`${where}: ${p.color} has an impossible position ${rel}`);
      }
    }
  }
  // two players may only share a square if it is a safe one
  const occupied = new Map();
  for (const p of g.players) {
    for (const rel of p.tokens) {
      if (rel < 0 || rel > TRACK_END) continue;
      const abs = absIndex(p.color, rel);
      const prev = occupied.get(abs);
      if (prev && prev !== p.color && !SAFE_INDICES.has(abs)) {
        fail(`${where}: ${p.color} and ${prev} share unsafe square ${abs}`);
      }
      occupied.set(abs, p.color);
    }
  }
}

function playOne(seats) {
  const g = createGame(seats);
  let turns = 0;

  while (g.phase !== 'over') {
    if (++turns > 20000) { fail('game did not finish in 20000 rolls'); return null; }

    const d = rollDie();
    g.dice = d;
    g.sixStreak = d === 6 ? g.sixStreak + 1 : 0;

    if (g.sixStreak === 3) { nextTurn(g); continue; }

    const moves = legalMoves(g, d);

    // the rules must never offer an illegal move
    for (const m of moves) {
      if (m.to > HOME_REL) fail(`move overshoots home: ${m.from} + ${d}`);
      if (m.isEntry && d !== 6) fail('entry offered without a 6');
      if (m.captures.length && isSafeRel(current(g).color, m.to)) fail('capture offered on a safe square');
    }

    if (moves.length === 0) { nextTurn(g); continue; }

    const { extraTurn, over } = applyMove(g, chooseMove(g, moves));
    checkBoard(g, `roll ${turns}`);
    if (over) break;
    if (extraTurn && !isDone(current(g))) sameTurn(g); else nextTurn(g);
  }

  // everyone must come away with a placing, and only one of each
  if (g.finished.length !== g.players.length) fail(`only ${g.finished.length} of ${g.players.length} players placed`);
  if (new Set(g.finished).size !== g.finished.length) fail('a player placed twice');
  if (g.finished[0] !== g.winner) fail('the winner is not the first to finish');

  const champ = g.players.find((p) => p.color === g.winner);
  if (!champ.tokens.every((t) => t === HOME_REL)) fail('winner does not have all four pieces home');

  // everyone but the last player must genuinely be home
  for (const color of g.finished.slice(0, -1)) {
    const p = g.players.find((q) => q.color === color);
    if (!isDone(p)) fail(`${color} was placed without finishing`);
  }
  return { turns, winner: g.winner, players: g.players.length };
}

const LINEUPS = [
  { red: 'human', green: 'cpu', yellow: 'off', blue: 'off' },
  { red: 'human', green: 'cpu', yellow: 'cpu', blue: 'off' },
  { red: 'human', green: 'cpu', yellow: 'cpu', blue: 'cpu' },
  { red: 'off', green: 'human', yellow: 'off', blue: 'cpu' },
];

const wins = {};
let totalTurns = 0, played = 0, longest = 0;

for (let i = 0; i < GAMES; i++) {
  const r = playOne(LINEUPS[i % LINEUPS.length]);
  if (!r) continue;
  played++;
  totalTurns += r.turns;
  longest = Math.max(longest, r.turns);
  wins[r.winner] = (wins[r.winner] || 0) + 1;
}

console.log(`played      : ${played} games`);
console.log(`avg rolls   : ${(totalTurns / played).toFixed(1)}`);
console.log(`longest game: ${longest} rolls`);
console.log('winners     :', wins);
console.log(problems === 0 ? '\n✅ no rule violations' : `\n❌ ${problems} problems`);
process.exit(problems === 0 ? 0 : 1);
