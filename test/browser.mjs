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
