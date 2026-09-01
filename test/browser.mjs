/* Drives the real thing in a headless browser: the shelf, opening a
   game, playing it, and coming back out again — watching for console
   errors and leaked listeners the whole way.
   Run with:  node test/browser.mjs                                     */

import pkg from 'playwright';
const { chromium } = pkg;
import { serve } from './serve.mjs';

const PORT = 8123;
const server = await serve(PORT);
const browser = await chromium.launch();

const errors = [];
const results = [];
const check = (label, pass) => results.push([label, pass]);

async function open(name, viewport) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`[${name}] ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`[${name}] ${e.message}`));
  await page.goto(`http://localhost:${PORT}/`);
  await page.waitForTimeout(400);
  return { ctx, page };
}

/* ── the shelf, and getting in and out of a game ── */
{
  const { ctx, page } = await open('shelf', { width: 820, height: 1180 });

  check('shelf lists Ludo', await page.isVisible('.game-card[data-id="ludo"]'));
  await page.screenshot({ path: '/tmp/khel-shelf.png' });

  await page.click('.game-card[data-id="ludo"]');
  await page.waitForTimeout(600);
  check('tapping the card routes to #/ludo', page.url().endsWith('#/ludo'));
  check('the game mounted', await page.evaluate(() => KHEL.active === 'ludo'));
  check('Ludo\'s setup screen is up', await page.isVisible('[data-screen="setup"]'));
  await page.screenshot({ path: '/tmp/khel-ludo-setup.png' });

  // the table is named people, not colours
  const shown = await page.$$eval('.seat', (cards) => cards.map((c) => ({
    state: c.dataset.state,
    name: c.querySelector('[data-role="name"]').value,
    fixed: c.querySelector('[data-role="fixed"]').textContent,
  })));
  check('seats start with family names', shown.map((s) => s.name).join(',') === 'Chueen,Mama,Papa,Dada');
  check('it starts set up for two people, not one',
    shown.filter((s) => s.state === 'human').length === 2);
  check('a person\'s name is editable', await page.isVisible('.seat[data-state="human"] [data-role="name"]'));
  check('an empty seat has no name to edit', !(await page.isVisible('.seat[data-state="off"] [data-role="name"]')));

  // rename someone, and check it reaches the board
  await page.fill('.seat[data-color="red"] [data-role="name"]', 'Nani');
  await page.click('[data-el="play"]');
  await page.waitForTimeout(900);
  check('the renamed player is announced on the board',
    (await page.textContent('[data-el="turnName"]')) === 'Nani');

  await page.click('[data-el="quit"]');
  await page.waitForTimeout(400);
  await page.goto(`http://localhost:${PORT}/#/ludo`);
  await page.waitForTimeout(700);
  check('the new name is remembered next time',
    (await page.inputValue('.seat[data-color="red"] [data-role="name"]')) === 'Nani');
  await page.fill('.seat[data-color="red"] [data-role="name"]', 'Chueen');
  await page.waitForTimeout(100);

  // tapping the pawn cycles the seat: person → computer → nobody
  await page.click('.seat[data-color="red"] [data-role="cycle"]');
  await page.waitForTimeout(150);
  check('tapping a piece hands the seat to the computer',
    (await page.getAttribute('.seat[data-color="red"]', 'data-state')) === 'cpu');
  await page.click('.seat[data-color="red"] [data-role="cycle"]');
  await page.click('.seat[data-color="red"] [data-role="cycle"]');
  await page.waitForTimeout(150);
  check('and back round to a person again',
    (await page.getAttribute('.seat[data-color="red"]', 'data-state')) === 'human');

  await page.click('[data-el="back"]');
  await page.waitForTimeout(400);
  check('“All games” returns to the shelf', await page.isVisible('#screen-shelf.is-active'));
  check('the game unmounted', await page.evaluate(() => KHEL.active === null));
  check('nothing left in the host', await page.evaluate(() => !document.getElementById('game-host').firstChild));
  check('the game\'s globals are gone', await page.evaluate(() => typeof LUDO === 'undefined'));

  // a direct link straight into the game must work too
  await page.goto(`http://localhost:${PORT}/#/ludo`);
  await page.waitForTimeout(700);
  check('deep link #/ludo opens the game', await page.evaluate(() => KHEL.active === 'ludo'));

  // and an unknown one must fall back to the shelf rather than break
  await page.goto(`http://localhost:${PORT}/#/nosuchgame`);
  await page.waitForTimeout(500);
  check('unknown route falls back to the shelf', await page.isVisible('#screen-shelf.is-active'));

  await ctx.close();
}

/* ── actually play, four players, portrait ── */
{
  const { ctx, page } = await open('play', { width: 820, height: 1180 });
  await page.click('.game-card[data-id="ludo"]');
  await page.waitForTimeout(600);

  await page.evaluate(() => {
    Object.assign(LUDO.seats, { red: 'human', green: 'cpu', yellow: 'cpu', blue: 'cpu' });
    LUDO.refreshSeats();
    LUDO.start();
  });
  await page.waitForTimeout(1400);
  check('the board is showing', await page.isVisible('[data-screen="board"]'));
  await page.screenshot({ path: '/tmp/khel-board.png' });

  const before = await page.evaluate(() => LUDO.game.state.players.flatMap((p) => p.tokens).join(','));

  const deadline = Date.now() + 45000;
  while (Date.now() < deadline) {
    if (await page.evaluate(() => !!LUDO.game.state?.winner)) break;
    const phase = await page.evaluate(() => LUDO.game.state?.phase);
    if (phase === 'roll') {
      await page.click('[data-el="dice"]', { force: true }).catch(() => {});
    } else if (phase === 'pick') {
      const pt = await page.evaluate(() => {
        const g = LUDO.game.state;
        const r = document.querySelector('[data-el="board"]').getBoundingClientRect();
        const me = g.players[g.turn];
        const ti = LUDO.game.pickable[0];
        const t = me.tokens[ti];
        const [gx, gy] = LUDO.geom.cellOf(me.color, t, (t === -1 || t === 56) ? ti : 0);
        return { x: r.left + (gx / 15) * r.width, y: r.top + (gy / 15) * r.height };
      }).catch(() => null);
      if (pt) await page.mouse.click(pt.x, pt.y);
    }
    await page.waitForTimeout(110);
  }

  const after = await page.evaluate(() => LUDO.game.state.players.flatMap((p) => p.tokens).join(','));
  check('pieces actually moved around the board', before !== after);

  // leaving mid-game must stop everything cleanly
  await page.click('[data-el="quit"]');
  await page.waitForTimeout(500);
  check('the house button returns to the shelf', await page.isVisible('#screen-shelf.is-active'));
  check('no game left running', await page.evaluate(() => KHEL.active === null));

  await ctx.close();
}

/* ── finishing a round: everyone gets a placing, and the score sticks ── */
{
  const { ctx, page } = await open('podium', { width: 820, height: 1180 });
  await page.click('.game-card[data-id="ludo"]');
  await page.waitForTimeout(600);

  await page.evaluate(() => {
    Object.assign(LUDO.seats, { red: 'human', green: 'human', yellow: 'off', blue: 'off' });
    Object.assign(LUDO.names, { red: 'Chueen', green: 'Mama' });
    LUDO.refreshSeats();
    LUDO.start();
  });
  await page.waitForTimeout(1000);

  // put Chueen one exact roll from home, so the round ends quickly
  await page.evaluate(() => {
    const g = LUDO.game.state;
    g.players[0].tokens = [56, 56, 56, 50];
    g.players[1].tokens = [12, 20, 28, 36];
  });

  const deadline = Date.now() + 60000;
  while (Date.now() < deadline) {
    if (await page.evaluate(() => LUDO.game.state?.phase === 'over')) break;
    const phase = await page.evaluate(() => LUDO.game.state?.phase);
    if (phase === 'roll') {
      await page.click('[data-el="dice"]', { force: true }).catch(() => {});
    } else if (phase === 'pick') {
      const pt = await page.evaluate(() => {
        const g = LUDO.game.state;
        const r = document.querySelector('[data-el="board"]').getBoundingClientRect();
        const me = g.players[g.turn];
        const ti = LUDO.game.pickable[0];
        const t = me.tokens[ti];
        const [gx, gy] = LUDO.geom.cellOf(me.color, t, (t === -1 || t === 56) ? ti : 0);
        return { x: r.left + (gx / 15) * r.width, y: r.top + (gy / 15) * r.height };
      }).catch(() => null);
      if (pt) await page.mouse.click(pt.x, pt.y);
    }
    await page.waitForTimeout(90);
  }

  // wait for the podium itself rather than a hopeful sleep
  await page.waitForSelector('.podium-row', { timeout: 15000 }).catch(() => {});
  check('the round ended', await page.evaluate(() => LUDO.game.state?.phase === 'over'));
  check('everyone got a placing', (await page.$$('.podium-row')).length === 2);
  check('Chueen is on top of the podium',
    (await page.textContent('.podium-row:first-child .podium-name')) === 'Chueen');
  check('the running score is shown',
    (await page.textContent('[data-el="tallyRow"]')).includes('Chueen 1'));
  await page.screenshot({ path: '/tmp/khel-podium.png' });

  await page.click('[data-el="changePlayers"]');
  await page.waitForTimeout(400);
  check('the win shows on her seat',
    (await page.textContent('.seat[data-color="red"] [data-role="tally"]')).includes('1'));
  check('there\'s a way to clear the scores', await page.isVisible('[data-el="reset"]'));
  await page.screenshot({ path: '/tmp/khel-setup-tally.png' });

  await page.click('[data-el="reset"]');
  await page.waitForTimeout(250);
  check('clearing the scores works',
    (await page.textContent('.seat[data-color="red"] [data-role="tally"]')) === ''
    && !(await page.isVisible('[data-el="reset"]')));

  await ctx.close();
}

/* ── the second game ── */
{
  const { ctx, page } = await open('snakes', { width: 820, height: 1180 });

  check('the shelf has both games', (await page.$$('.game-card')).length === 2);
  check('Snakes & Ladders is on the shelf', await page.isVisible('.game-card[data-id="snakes"]'));
  await page.screenshot({ path: '/tmp/khel-shelf-two.png' });

  await page.click('.game-card[data-id="snakes"]');
  await page.waitForTimeout(800);
  check('it opens', await page.evaluate(() => KHEL.active === 'snakes'));
  check('the same table of people', await page.isVisible('.seat[data-color="red"] [data-role="name"]'));
  check('it keeps its own names, apart from Ludo\'s',
    (await page.inputValue('.seat[data-color="red"] [data-role="name"]')) === 'Chueen');

  await page.evaluate(() => {
    Object.assign(SNAKES.table.seats, { red: 'human', green: 'cpu', yellow: 'off', blue: 'off' });
    SNAKES.table.refresh();
    SNAKES.start();
  });
  await page.waitForTimeout(1200);
  check('the board is up', await page.isVisible('[data-el="board"]'));
  check('everyone starts on square 1',
    await page.evaluate(() => SNAKES.game.state.players.every((p) => p.pos === 1)));
  await page.screenshot({ path: '/tmp/khel-snakes.png' });

  // walk a few real turns so the board, ladders and snakes all get exercised
  for (let i = 0; i < 14; i++) {
    if (await page.evaluate(() => SNAKES.game.state?.phase === 'roll'
      && SNAKES.game.state.players[SNAKES.game.state.turn].kind === 'human')) {
      await page.click('[data-el="dice"]', { force: true }).catch(() => {});
    }
    await page.waitForTimeout(500);
  }
  check('pieces climbed the board',
    await page.evaluate(() => SNAKES.game.state.players.some((p) => p.pos > 1)));
  await page.screenshot({ path: '/tmp/khel-snakes-play.png' });

  // put someone on the doorstep so the round finishes
  await page.evaluate(() => { SNAKES.game.state.players[0].pos = 99; });
  const deadline = Date.now() + 45000;
  while (Date.now() < deadline) {
    if (await page.evaluate(() => SNAKES.game.state?.phase === 'over')) break;
    if (await page.evaluate(() => SNAKES.game.state?.phase === 'roll'
      && SNAKES.game.state.players[SNAKES.game.state.turn].kind === 'human')) {
      await page.click('[data-el="dice"]', { force: true }).catch(() => {});
    }
    await page.waitForTimeout(220);
  }
  await page.waitForSelector('.podium-row', { timeout: 15000 }).catch(() => {});
  check('the round finishes', await page.evaluate(() => SNAKES.game.state?.phase === 'over'));
  check('with a podium', (await page.$$('.podium-row')).length === 2);
  check('and its own score', (await page.textContent('[data-el="tallyRow"]')).includes('Chueen 1'));
  await page.screenshot({ path: '/tmp/khel-snakes-win.png' });

  await page.click('[data-el="changePlayers"]');
  await page.waitForTimeout(400);
  await page.click('[data-el="back"]');
  await page.waitForTimeout(500);
  check('leaving cleans up', await page.evaluate(() => KHEL.active === null && typeof SNAKES === 'undefined'));

  // and Ludo's scores are untouched by any of it
  await page.goto(`http://localhost:${PORT}/#/ludo`);
  await page.waitForTimeout(700);
  check('the two games keep separate scores',
    (await page.textContent('.seat[data-color="red"] [data-role="tally"]')) === '');

  await ctx.close();
}

/* ── landscape ── */
{
  const { ctx, page } = await open('landscape', { width: 1180, height: 760 });
  await page.goto(`http://localhost:${PORT}/#/ludo`);
  await page.waitForTimeout(700);
  await page.evaluate(() => LUDO.start());
  await page.waitForTimeout(2200);
  check('landscape board renders', await page.isVisible('[data-el="board"]'));
  await page.screenshot({ path: '/tmp/khel-landscape.png' });
  await ctx.close();
}

await browser.close();
server.close();

let failed = 0;
for (const [label, pass] of results) {
  if (!pass) failed++;
  console.log(`${pass ? '  ✓' : '  ✗'} ${label}`);
}
if (errors.length) console.error('\nconsole errors:\n' + errors.join('\n'));
const ok = failed === 0 && errors.length === 0;
console.log(ok ? '\n✅ shell and game behave' : `\n❌ ${failed} failed`);
process.exit(ok ? 0 : 1);
