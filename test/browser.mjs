/* Drives the real game in a headless browser: plays a quick game to the
   end, watches for console errors, and saves screenshots.
   Run with:  node test/browser.mjs                                     */

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const PORT = 8123;
const TYPES = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
  '.mjs': 'text/javascript', '.png': 'image/png',
  '.webmanifest': 'application/manifest+json', '.json': 'application/json',
};

const server = createServer(async (req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  try {
    const file = join(ROOT, normalize(p).replace(/^(\.\.[/\\])+/, ''));
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404); res.end('not found');
  }
});
await new Promise((r) => server.listen(PORT, r));

const browser = await chromium.launch();
const errors = [];

async function session(name, viewport, run) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`[${name}] ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`[${name}] ${e.message}`));
  await page.goto(`http://localhost:${PORT}/`);
  await page.waitForTimeout(400);
  await run(page);
  await ctx.close();
}

/* ── menu, portrait tablet ── */
await session('menu', { width: 820, height: 1180 }, async (page) => {
  await page.screenshot({ path: '/tmp/shot-menu.png' });
});

/* ── a full 4-player game, driven fast ── */
await session('game-4p', { width: 820, height: 1180 }, async (page) => {
  await page.evaluate(() => {
    Object.assign(LUDO.seats, { red: 'human', green: 'cpu', yellow: 'cpu', blue: 'cpu' });
    LUDO.start();
  });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: '/tmp/shot-board-portrait.png' });

  // play until somebody wins, tapping the dice and any glowing piece
  const deadline = Date.now() + 100000;
  while (Date.now() < deadline) {
    const done = await page.evaluate(() => !!LUDO.game.state?.winner);
    if (done) break;
    const phase = await page.evaluate(() => LUDO.game.state?.phase);
    if (phase === 'roll') {
      await page.click('#dice', { force: true }).catch(() => {});
    } else if (phase === 'pick') {
      // tap the first movable piece by asking the page where it is
      const pt = await page.evaluate(() => {
        const g = LUDO.game.state;
        const c = document.getElementById('board').getBoundingClientRect();
        const mod = LUDO.geom;
        const me = g.players[g.turn];
        const ti = LUDO.pickable[0];
        const [gx, gy] = mod.cellOf(me.color, me.tokens[ti], (me.tokens[ti] === -1 || me.tokens[ti] === 56) ? ti : 0);
        return { x: c.left + (gx / 15) * c.width, y: c.top + (gy / 15) * c.height };
      }).catch(() => null);
      if (pt) await page.mouse.click(pt.x, pt.y);
    }
    await page.waitForTimeout(120);
  }

  const state = await page.evaluate(() => {
    const g = LUDO.game.state;
    return { winner: g?.winner, tokens: g?.players.map((p) => [p.color, ...p.tokens]) };
  });
  console.log('4-player game result:', JSON.stringify(state));
  await page.waitForTimeout(900);
  await page.screenshot({ path: '/tmp/shot-win.png' });
});

/* ── landscape phone-ish ── */
await session('landscape', { width: 1180, height: 760 }, async (page) => {
  await page.evaluate(() => {
    Object.assign(LUDO.seats, { red: 'human', green: 'cpu', yellow: 'off', blue: 'off' });
    LUDO.start();
  });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: '/tmp/shot-board-landscape.png' });
});

await browser.close();
server.close();

if (errors.length) { console.error('\n❌ console errors:\n' + errors.join('\n')); process.exit(1); }
console.log('\n✅ no console errors');
