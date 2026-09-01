/* Checks the "Add to Home Screen" offer on the shelf:
     · Android / desktop  → replays the browser's own install prompt
     · iOS Safari         → points at Safari's own Share button
     · already installed  → the bar never appears at all
   Run with:  node test/install.mjs                                    */

import pkg from 'playwright';
const { chromium } = pkg;
import { serve } from './serve.mjs';

const PORT = 8126;
const server = await serve(PORT);

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

// CHROME=... lets a machine with Chromium already on disk skip
// `npx playwright install`.
const browser = await chromium.launch(
  process.env.CHROME ? { executablePath: process.env.CHROME } : {});
const errors = [];
const results = [];
const check = (label, pass) => results.push([label, pass]);

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

  // The dismiss × belongs in the box's own top-right corner. Hung off the
  // side it shoves the whole bar off-centre, which is what it used to do.
  {
    const box = await page.locator('#btn-install').boundingBox();
    const x = await page.locator('#btn-install-x').boundingBox();
    const page_w = await page.evaluate(() => document.documentElement.clientWidth);
    const inside = x.x >= box.x && x.y >= box.y
      && x.x + x.width <= box.x + box.width + 1
      && x.y + x.height <= box.y + box.height + 1;
    const topRight = x.x > box.x + box.width / 2 && x.y < box.y + box.height / 2;
    const offCentre = Math.abs((box.x + box.width / 2) - page_w / 2);
    check('iOS: the × sits inside the box, top right', inside && topRight);
    check('iOS: and the box stays centred', offCentre <= 2);
  }

  await page.click('#btn-install');
  await page.waitForTimeout(250);
  check('iOS: tapping it points at the Share button', await page.isVisible('#ios-overlay'));
  check('iOS: the pointer aims at the right edge of the screen',
    await page.evaluate(() => document.getElementById('ios-overlay').classList.contains('at-top')));
  await page.click('#ios-overlay', { position: { x: 40, y: 500 } });
  await page.waitForTimeout(150);
  check('iOS: any tap closes it', !(await page.isVisible('#ios-overlay')));
  await page.click('#btn-install-x');
  await page.waitForTimeout(150);
  check('iOS: dismissing hides the bar', !(await page.isVisible('#install-bar')));
  await page.reload();
  await page.waitForTimeout(350);
  check('iOS: it stays dismissed on the next visit', !(await page.isVisible('#install-bar')));

  // …but dismissing must never be a one-way door
  check('iOS: the quiet link is still there after dismissing',
    await page.isVisible('#btn-install-mini'));
  check('iOS: and it opens the same steps', await (async () => {
    await page.click('#btn-install-mini');
    await page.waitForTimeout(250);
    return page.isVisible('#ios-overlay');
  })());
  await ctx.close();
}

/* ── iOS, having already been shown the steps once ──
   Safari can't tell us the app is installed, so the banner backs off on
   its own after the steps have been seen; the quiet link stays. */
{
  const { ctx, page } = await open('ios-again', {
    ua: IPAD,
    init: () => {
      Object.defineProperty(navigator, 'maxTouchPoints', { get: () => 5 });
      try { localStorage.setItem('khel.installCoached', '1'); } catch { /* ignore */ }
    },
  });
  check('iOS: the banner stops nagging once the steps have been shown',
    !(await page.isVisible('#install-bar')));
  check('iOS: but installing is still one tap away',
    await page.isVisible('#btn-install-mini'));
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
  check('desktop: no iOS pointer here', !(await page.isVisible('#ios-overlay')));
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
  check(`${name}: and so does the quiet link`, !(await page.isVisible('#btn-install-mini')));
  await ctx.close();
}

/* ── 4. A browser that can't install at all ──
   Firefox, or a desktop Chrome that already has the app: no event, not
   iOS. Offering a route that would only show iPad instructions is worse
   than offering nothing. */
{
  const { ctx, page } = await open('no-install-api');
  check('no install API: neither route is offered',
    !(await page.isVisible('#install-bar')) && !(await page.isVisible('#btn-install-mini')));
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
console.log(ok ? '\n✅ install flow is correct' : `\n❌ ${failed} failed`);
process.exit(ok ? 0 : 1);
