# Khel

Games made to be played together, round one tablet — or on your own against the
computer when nobody else is about.

Every game on my niece's tablet was stuffed with ads, so I built her ones that aren't.

No ads, no tracking, no in-app purchases, no accounts, no network calls at all.
Installs to the home screen on an iPad, an Android tablet, or a laptop, and works
completely offline.

**Play:** https://namastevis.in/khel/

## On the shelf

| Game | | |
|---|---|---|
| **Ludo** | Race your four pieces home | 2–4 round one tablet, or one vs the computer |
| **Snakes & Ladders** | Climb the ladders, dodge the snakes | 2–4 round one tablet, or one vs the computer |

Both games share the shell's setup screen, so the table of people, the names and the
running score work the same way in each — and each keeps its own scores.

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
- **Everyone gets a placing.** A round doesn't stop when the first player is home —
  the rest play on for 2nd, 3rd and 4th, so nobody is simply cut off. The win card is
  a podium.
- **A running score.** Wins are counted against the name, not the colour, so Chueen
  keeps her tally whichever piece she picks. It shows on the seats and on the win card,
  lives on that device only, and there's a *Clear the scores* when it stops being fun.
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
npm run sanity            # nothing missing from the offline list, no dead imports
npm test                  # thousands of full games of each; the rules never break
npm i                     # Playwright, for the two browser tests
npm run test:browser      # the shelf, opening a game, playing it, leaving it
npm run test:install      # the Add to Home Screen flow
```

`npm run sanity` and `npm test` need nothing installed. The two browser tests need
Playwright.

`test/simulate.mjs` imports the rules engine directly and asserts that no piece ever
lands on an impossible square, that two colours never share an unsafe square, that entry
is only offered on a 6, and that the winner really does have all four pieces home.
`test/simulate-snakes.mjs` does the same for the other board, and additionally checks the
board itself: every ladder goes up, every snake goes down, no jump lands on another jump,
and square *n* is always next to square *n−1*.

## How it fits together

```
index.html            the shelf, and the empty host a game mounts into
app.css               the shell: colours, buttons, overlays, toast, cards
js/shell.js           routing, the install banner, sound, service worker
js/catalog.js         what's on the shelf — one row per game
js/table.js           "who's playing" — seats, names, the running score
js/pawn.js            the playing piece, on canvas and as SVG
js/dice.js            one fair roll, and the pips that show it
js/audio.js           sounds, generated in the browser; no audio files
js/confetti.js        paper for the winner
js/toast.js           the shared message at the top of the screen
games/ludo/           one folder per game
games/snakes/
sw.js                 offline cache — lists every file
tools/make-icons.py   redraws the app icons and the link-preview card
tools/bump-cache.mjs  bumps the offline cache name before a deploy
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

## Snakes & Ladders

The classic board, with two changes. The ladder at square 1 starts at 2 instead, since
everyone begins standing on 1. And the 98 → 78 snake is gone: losing on square 98 is
funny exactly once, and this is not the audience for it. Reaching 100 wins whether or
not the roll is exact, because needing the precise number strands a small player on 97
for five turns, which is where a game like this loses them.

A round takes about 80 rolls, against roughly 300 for Ludo — so it's the one to reach
for when there isn't much time.

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

Before pushing, run `npm run release` — it bumps `CACHE` in `sw.js`, which is what tells
an already-installed tablet that there's something new. Opening the page always
goes to the network first, so a deploy shows up straight away and the cache is only the
fallback for when there's no internet; everything else is served from the cache and
refreshed quietly in the background. When a new worker takes over, the page reloads
itself once so nobody is left looking at last week's copy.
