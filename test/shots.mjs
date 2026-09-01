/* Screenshots of the shelf at phone / tablet / laptop widths, with the
   games it has today and with six, so the card grid and the install bar
   can be eyeballed before shipping. Not part of the test suite.

   node test/shots.mjs [outdir]                                        */

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { serve } from './serve.mjs';

const OUT = process.argv[2] || '/tmp/shots';
mkdirSync(OUT, { recursive: true });

const SIZES = [
  ['phone', 390, 844],
  ['tablet', 820, 1180],
  ['laptop', 1280, 800],
];

const EXTRA = [
  ['carrom', 'Carrom', 'Flick the coins into the pockets', '#e2703a'],
  ['memory', 'Memory', 'Turn two cards, find the pair', '#4f9d69'],
  ['dots', 'Dots & Boxes', 'Close a box, take another turn', '#7a5cc4'],
  ['hop', 'Hopscotch', 'Land it without a wobble', '#d4436d'],
];

const server = await serve(4180);
const browser = await chromium.launch(
  process.env.CHROME ? { executablePath: process.env.CHROME } : {});

for (const [label, width, height] of SIZES) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 2 });
  await page.goto('http://localhost:4180/');
  await page.waitForSelector('.game-card');

  // the install bar only shows itself on a real install-capable browser
  await page.evaluate(() => { document.getElementById('install-bar').hidden = false; });
  await page.waitForTimeout(150);
  await page.screenshot({ path: `${OUT}/${label}-2games.png` });

  await page.evaluate((extra) => {
    for (const [id, title, blurb, accent] of extra) {
      globalThis.KHEL.GAMES.push({ id, title, blurb, accent, art: () => globalThis.KHEL.GAMES[0].art() });
    }
    globalThis.KHEL.buildShelf();
  }, EXTRA);
  await page.waitForTimeout(150);
  await page.screenshot({ path: `${OUT}/${label}-6games.png`, fullPage: true });

  await page.close();
  console.log(`  ${label} ${width}×${height}`);
}

await browser.close();
server.close();
console.log(`\nwritten to ${OUT}`);
