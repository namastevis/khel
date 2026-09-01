# Khel

Games made to be played together, round one tablet — or on your own against the
computer when nobody else is about.

Every game on my niece's tablet was stuffed with ads, so I built her ones that aren't.

No ads, no tracking, no in-app purchases, no accounts, no network calls at all.
Installs to the home screen on an iPad, an Android tablet, or a laptop, and works
completely offline.

**Play:** https://namastevis.github.io/khel/

## On the shelf

| Game | | |
|---|---|---|
| **Ludo** | Race your four pieces home | 2–4 round one tablet, or one vs the computer |

More to come. Snakes & Ladders is the natural next one — it reuses the dice, the
square-by-square hop, and the turn loop almost wholesale.

## Ludo

- **Classic rules** — a 6 to leave the house, 52-square loop, safe stars, captures,
  the exact roll needed to finish, extra turns for a 6 / a capture / a piece reaching
  home, and three sixes forfeits the turn.
- **Auto-move** when only one piece can legally move, so nobody has to hunt for
  the one legal tap.
- **1–4 players on one device**, in any mix of people and computer opponents.
- **Name the players** — the setup screen is a table of people, not colours. Tap a
  piece to swap a seat between a person, the computer and nobody; tap a name to change
  it. Names are remembered on that device, so the board says *Chueen's turn*, and the
  win card says *Mama wins!*. Defaults live in `DEFAULT_NAMES` in `games/ludo/index.js`.
- **Built for touch** — big pieces, big dice, portrait and landscape.

The computer opponents play sensibly but not ruthlessly: they take a merely-fine move
about a quarter of the time, so the newest player at the table still wins often enough.

## Running it locally

No build step, no dependencies. Any static server will do:

```bash
npm start          # python3 -m http.server 8000
```

(Opening `index.html` with `file://` will not work — ES modules and service workers
both need `http://`.)

## Tests

```bash
npm test                  # 3000 full games of Ludo; checks the rules never break
npm i                     # Playwright, for the two browser tests
npm run test:browser      # the shelf, opening a game, playing it, leaving it
npm run test:install      # the Add to Home Screen flow
```

`test/simulate.mjs` has no dependencies — it imports the rules engine directly and
asserts that no piece ever lands on an impossible square, that two colours never share
an unsafe square, that entry is only offered on a 6, and that the winner really does
have all four pieces home.

## How it fits together

```
index.html            the shelf, and the empty host a game mounts into
app.css               the shell: colours, buttons, overlays, toast, cards
js/shell.js           routing, the install banner, sound, service worker
js/catalog.js         what's on the shelf — one row per game
js/audio.js           sounds, generated in the browser; no audio files
js/toast.js           the shared message at the top of the screen
games/ludo/           one folder per game
sw.js                 offline cache — lists every file
tools/make-icons.py   redraws the app icons and the link-preview card
```

Routing is by hash (`#/ludo`) so the whole thing stays one page: no server config, it
works offline, and the tablet's back gesture does the sane thing.

### Adding a game

1. `games/<id>/index.js` exporting `mount(host, shell)`, which returns an `unmount`
   function. `shell.goHome()` takes the player back to the shelf.
2. `games/<id>/<id>.css` for anything the shell doesn't already style. The shell
   injects it on first open.
3. A row in `js/catalog.js` — id, title, blurb, accent colour, and an `art()` function
   returning inline SVG for the card.
4. Its files added to `ASSETS` in `sw.js`, so it works offline too.

The shell imports games lazily, so a new game costs the shelf nothing until it is
opened.

### How Ludo stores a position

Every piece holds one number:

| value    | meaning                                  |
|----------|------------------------------------------|
| `-1`     | still in its house                       |
| `0`–`50` | on the shared track (`0` = own start)    |
| `51`–`55`| in its own colour column                 |
| `56`     | home, in the middle                      |

`config.js` turns that number into a board square, which keeps `rules.js` free of any
geometry — and testable 3000 games deep with no browser.

## Installing on a tablet

The shelf offers this itself, and only when it is worth offering:

- **Android / desktop** — the browser fires `beforeinstallprompt`, which the page saves
  and replays when the button is tapped, so it is the real native install.
- **iPad / iPhone** — Safari has no such API and only installs through its own share
  sheet, so instead the page points at that button: one arrow, one line, tap anywhere
  to close. Bottom bar on a phone, top right on an iPad.
- **Already installed** — `display-mode: standalone` (or `navigator.standalone` on iOS)
  is true, so the bar never appears at all.

Dismissing it is remembered, but only for a week, so one stray tap doesn't hide it for
good.

## Deploying

A plain static site, so GitHub Pages serves it straight from `main`:

**Settings → Pages → Source: Deploy from a branch → `main` / `(root)`**

`icons/share-card.png` is what shows when the link is pasted into a chat; the Open
Graph tags in `index.html` point at it. Rerun `npm run icons` if you change the wording.

After any change, bump `CACHE` in `sw.js` (`khel-v1` → `v2`, …) or tablets that already
installed the app will keep serving the version they have.
