/* Checks the "Add to Home Screen" flow on the landing page:
     · Android / desktop  → replays the browser's own install prompt
     · iOS Safari         → shows the share-sheet steps instead
     · already installed  → the bar never appears at all
   Run with:  node test/install.mjs                                    */

import pkg from 'playwright';
const { chromium } = pkg;
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const PORT = 8126;
const TYPES = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
  '.png': 'image/png', '.webmanifest': 'application/manifest+json',
};

const server = createServer(async (req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  try {
    const file = join(ROOT, normalize(p).replace(/^(\.\.[/\\])+/, ''));
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404); res.end('not found'); }
});
await new Promise((r) => server.listen(PORT, r));

const IPAD = 'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 '
  + '(KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';

/* what the page sees in each situation */
const asIPad = () => Object.defineProperty(navigator, 'maxTouchPoints', { get: () => 5 });
const asInstalledIOS = () => {
  Object.defineProperty(navigator, 'standalone', { get: () => true });
  Object.defineProperty(navigator, 'maxTouchPoints', { get: () => 5 });
};
const asInstalledElsewhere = () => {
  const real = window.matchMedia.bind(window);
  window.matchMedia = (q) => q.includes('display-mode: standalone')
    ? { matches: true, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }
    : real(q);
};

const browser = await chromium.launch();
const errors = [];
const results = [];
const check = (label, pass) => { results.push([label, pass]); };

async function open(name, { init, ua } = {}) {
  const ctx = await browser.newContext({ viewport: { width: 820, height: 1180 }, ...(ua ? { userAgent: ua } : {}) });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`${name}: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`${name}: ${m.text()}`); });
  if (init) await page.addInitScript(init);
  await page.goto(`http://localhost:${PORT}/`);
  await page.waitForTimeout(350);
  return { ctx, page };
}

/** Fire the event Chrome fires on an install-eligible visit. */
const fireInstallPrompt = (page) => page.evaluate(() => {
  const e = new Event('beforeinstallprompt');
  e.prompt = () => { window.__prompted = true; };
  e.userChoice = Promise.resolve({ outcome: 'accepted' });
  window.dispatchEvent(e);
});

/* ── 1. iOS Safari: no prompt API, so we show the steps ── */
{
  const { ctx, page } = await open('ios', { init: asIPad, ua: IPAD });
  check('iOS: bar is offered', await page.isVisible('#install-bar'));
  await page.click('#btn-install');
  await page.waitForTimeout(250);
  check('iOS: tapping it shows the Safari steps', await page.isVisible('#ios-overlay'));
  await page.click('#btn-ios-close');
  await page.waitForTimeout(150);
  check('iOS: steps close again', !(await page.isVisible('#ios-overlay')));
  await page.click('#btn-install-x');
  await page.waitForTimeout(150);
  check('iOS: dismissing hides the bar', !(await page.isVisible('#install-bar')));
  await page.reload();
  await page.waitForTimeout(350);
  check('iOS: it stays dismissed on the next visit', !(await page.isVisible('#install-bar')));
  await ctx.close();
}

/* ── 2. Android / desktop: replay the browser's own prompt ── */
{
  const { ctx, page } = await open('desktop');
  check('desktop: no bar until the browser says it can install', !(await page.isVisible('#install-bar')));
  await fireInstallPrompt(page);
  await page.waitForTimeout(200);
  check('desktop: bar appears on beforeinstallprompt', await page.isVisible('#install-bar'));
  await page.click('#btn-install');
  await page.waitForTimeout(250);
  check('desktop: the native prompt is called', await page.evaluate(() => !!window.__prompted));
  check('desktop: bar goes away once accepted', !(await page.isVisible('#install-bar')));
  check('desktop: iOS steps never shown here', !(await page.isVisible('#ios-overlay')));
  await ctx.close();
}

/* ── 3. Already installed: never nag ── */
for (const [name, init, ua] of [
  ['installed on iOS', asInstalledIOS, IPAD],
  ['installed on Android/desktop', asInstalledElsewhere, undefined],
]) {
  const { ctx, page } = await open(name, { init, ua });
  await fireInstallPrompt(page);          // even this must not resurrect it
  await page.waitForTimeout(200);
  check(`${name}: bar stays hidden`, !(await page.isVisible('#install-bar')));
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
console.log(failed === 0 && errors.length === 0 ? '\n✅ install flow is correct' : `\n❌ ${failed} failed`);
process.exit(failed === 0 && errors.length === 0 ? 0 : 1);
