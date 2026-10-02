/* Plays thousands of games of Raja Mantri Chor Sipahi with no browser
   and checks the rules hold: four different chits every round, the
   points always add up, the swap happens exactly when the Mantri is
   wrong, and five rounds means five rounds.
   Run with: node test/simulate-raja.mjs [games] */

import { createGame, deal, judge, suspects, cpuGuess, holder, standings, isOver }
  from '../games/raja/rules.js';
import { ORDER, ROLES, ROLE, ROUNDS, CPU_NAMES, CPU_FACES } from '../games/raja/config.js';

const GAMES = Number(process.argv[2] || 2000);
let problems = 0;
const fail = (msg) => { if (problems++ < 12) console.error('  ✗', msg); };

const cpu = Object.fromEntries(ORDER.map((c) => [c, `${CPU_FACES[c]} ${CPU_NAMES[c]}`]));
const caughtRate = [];
const winners = {};
const roleCount = Object.fromEntries(ORDER.map((c) => [c, Object.fromEntries(ROLES.map((r) => [r, 0]))]));

for (let n = 0; n < GAMES; n++) {
  // a different mix of people and empty seats every game
  const kinds = ['human', 'cpu', 'off'];
  const seats = Object.fromEntries(ORDER.map((c, i) => [c, i === 0 ? 'human' : kinds[(n + i) % 3]]));
  const names = Object.fromEntries(ORDER.map((c) => [c, `P-${c}`]));
  const g = createGame({ seats, names, cpu, order: ORDER });

  if (g.players.length !== 4) fail('a game without four players');
  for (const p of g.players) {
    if (seats[p.color] === 'off' && p.name !== cpu[p.color]) fail('an empty seat was not filled by the computer');
    if (seats[p.color] === 'off' && p.kind !== 'cpu') fail('an empty seat is not played by the computer');
  }

  let caught = 0;
  while (!isOver(g)) {
    deal(g);
    const dealt = Object.values(g.roles).sort().join();
    if (dealt !== [...ROLES].sort().join()) fail(`round dealt ${dealt}`);
    for (const p of g.players) roleCount[p.color][g.roles[p.color]]++;

    const s = suspects(g);
    if (s.length !== 2) fail('the Mantri should have exactly two to choose from');
    if (s.includes(holder(g, 'raja')) || s.includes(holder(g, 'mantri'))) fail('Raja or Mantri among the suspects');

    const before = Object.fromEntries(g.players.map((p) => [p.color, p.total]));
    const accused = cpuGuess(g);
    const res = judge(g, accused);
    if (res.caught !== (g.roles[accused] === 'chor')) fail('caught/not caught got muddled');
    if (res.caught) caught++;

    const sum = Object.values(res.gains).reduce((a, b) => a + b, 0);
    const expect = ROLES.reduce((a, r) => a + ROLE[r].points, 0);
    if (sum !== expect) fail(`a round handed out ${sum} points, not ${expect}`);

    const mantri = holder(g, 'mantri').color, chor = holder(g, 'chor').color;
    if (res.caught && (res.gains[mantri] !== 800 || res.gains[chor] !== 0)) fail('caught, but the points are wrong');
    if (!res.caught && (res.gains[mantri] !== 0 || res.gains[chor] !== 800)) fail('not caught, but no swap');
    if (res.gains[holder(g, 'raja').color] !== 1000) fail('the Raja did not get 1000');

    for (const p of g.players) if (p.total !== before[p.color] + res.gains[p.color]) fail('a total drifted');
  }

  if (g.round !== ROUNDS) fail(`a game lasted ${g.round} rounds`);
  try { judge(g, suspects(g)[0].color); } catch { /* fine either way: */ }
  caughtRate.push(caught / ROUNDS);
  const top = standings(g)[0];
  winners[top.color] = (winners[top.color] || 0) + 1;

  // accusing someone who isn't a suspect must be refused
  const g2 = createGame({ seats, names, cpu, order: ORDER });
  deal(g2);
  let refused = false;
  try { judge(g2, holder(g2, 'raja').color); } catch { refused = true; }
  if (!refused) fail('the Mantri was allowed to accuse the Raja');
}

// fairness: over many games every seat should get every chit about equally
for (const c of ORDER) {
  for (const r of ROLES) {
    const share = roleCount[c][r] / (GAMES * ROUNDS);
    if (share < 0.2 || share > 0.3) fail(`${c} got ${r} ${(share * 100).toFixed(1)}% of the time`);
  }
}

const rate = caughtRate.reduce((a, b) => a + b, 0) / caughtRate.length;
if (rate < 0.4 || rate > 0.6) fail(`a guessing Mantri caught the Chor ${(rate * 100).toFixed(0)}% of the time`);

console.log(`games       : ${GAMES} × ${ROUNDS} rounds`);
console.log(`chor caught : ${(rate * 100).toFixed(1)}% (a coin toss, as it should be)`);
console.log('winners     :', winners);
console.log(problems ? `\n❌ ${problems} problem(s)` : '\n✅ no rule violations');
process.exit(problems ? 1 : 0);
