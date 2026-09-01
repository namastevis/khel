# Ludo Land

A friendly, ad-free Ludo game built for a five-year-old.

No ads, no tracking, no in-app purchases, no accounts, no network calls at all.
Installs to the home screen on an iPad, an Android tablet, or a laptop, and works
completely offline.

**Play:** https://namastevis.github.io/ludo/

## What it does

- **Classic Ludo rules** — a 6 to leave the house, 52-square loop, safe stars,
  captures, the exact roll needed to finish, extra turns for a 6 / a capture / a
  piece reaching home, and three sixes forfeits the turn.
- **Auto-move** when only one piece can legally move, so a small player never has
  to hunt for the one legal tap.
- **1–4 players on one device**, in any mix of people and computer opponents.
- **Built for touch** — big pieces, big dice, portrait and landscape.
- **Gentle sounds** generated in the browser (no audio files), with a mute button.

The computer opponents play sensibly but not ruthlessly — they take a merely-fine
move about a quarter of the time so that a child wins often enough to keep playing.

## Running it locally

No build step, no dependencies. Any static server will do:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

(Opening `index.html` directly with `file://` will not work — ES modules and
service workers both need `http://`.)

## Tests

```bash
npm test              # plays 3000 full games and checks the rules never break
npm i && npm run test:browser   # drives the real game in headless Chromium
```

`test/simulate.mjs` has no dependencies — it imports the rules engine directly and
asserts that no piece ever lands on an impossible square, that two colours never
share an unsafe square, that entry is only offered on a 6, and that the winner
really does have all four pieces home. `test/browser.mjs` needs Playwright.

## Deploying

The repo is a plain static site, so GitHub Pages serves it straight from `main`:

**Settings → Pages → Source: Deploy from a branch → `main` / `(root)`**

After any change, bump `CACHE` in `sw.js` (`ludo-land-v1` → `v2`, …) so tablets
that already installed the app pick up the new version instead of the cached one.

## Layout

```
index.html      screens: menu, board, win, how-to-play
app.css         all styling
js/config.js    board geometry — the 52-cell track, home columns, yards, colours
js/rules.js     the rules engine (pure; no DOM, no canvas)
js/ai.js        computer opponents
js/render.js    canvas drawing + confetti
js/game.js      turn flow, animation, input, HUD
js/main.js      menu, player setup, service-worker registration
sw.js           offline cache
```

### How a position is stored

Every piece holds one number:

| value    | meaning                                  |
|----------|------------------------------------------|
| `-1`     | still in its house                       |
| `0`–`50` | on the shared track (`0` = own start)    |
| `51`–`55`| in its own colour column                 |
| `56`     | home, in the middle                      |

`config.js` turns that number into a board square, which keeps `rules.js` free of
any geometry.

## Installing on a tablet

- **iPad / iPhone:** open the link in Safari → Share → *Add to Home Screen*.
- **Android:** open in Chrome → menu → *Install app*.

It then launches full-screen with no browser chrome, and works with the tablet in
aeroplane mode.
