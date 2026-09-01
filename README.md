# Khel

Games made to be played together, round one tablet — or on your own against the
computer when nobody else is about.

Every game on my niece's tablet was stuffed with ads, so I built her ones that aren't.

No ads, no tracking, no in-app purchases, no accounts, no network calls at all.
Installs to the home screen on an iPad, an Android tablet, or a laptop, and works
completely offline.

**Play:** https://namastevis.in/khel/

## On the shelf

| Game | |
|---|---|
| **Ludo** | Race your four pieces home |
| **Snakes & Ladders** | Climb the ladders, dodge the snakes |
| **Memory** | Turn two cards, find the pair |

All three seat two to four people round one device, in any mix of people and computer
opponents, and share the same setup screen — so the family, the seats and the running
score work the same way everywhere, and each game keeps its own scores.

They deliberately reward different things. Ludo and Snakes & Ladders are dice: nobody
wins them by being good, which is exactly why the youngest player wins as often as
anyone. Memory is not luck at all, and it is the one where a five-year-old beats the
adults on merit.

## The family

Everyone who plays is a record with an id that never changes; the name is a label on
it. So correcting a spelling is an edit, not a new person, and the score follows —
which name-keyed scores could never do. A seat holds a member's id, the computer, or
nobody, and choosing is a picker of faces rather than a text box, which a small player
can use without being able to spell.

The row lives under the games on the shelf: tap someone to rename or recolour them,
tap ＋ to add someone, and their wins across every game show beside their name. It's
the house scoreboard as well as the roster. Removing someone takes their scores with
them, and asks twice.

A fresh device starts with Chueen, Mamma and Dada, and seats the first two, who are
usually the ones holding the tablet. Everyone else gets added when they turn up.

The computer's players are animals in the colour of the piece they're playing — Red
Panda, Green Frog, Yellow Duck, Blue Whale. Easier to root against than "Player 2",
and easier to say out loud. The seat card shows only the animal, since the piece
beside it already says which colour it is.

`js/family.js` owns all of it, and carries the old name-keyed scores across on first
load so nothing built up before this is lost.

## Ludo

- **Classic rules** — a 6 to leave the house, 52-square loop, safe stars, captures,
  the exact roll needed to finish, extra turns for a 6 / a capture / a piece reaching
  home, and three sixes forfeits the turn.
- **Auto-move** when only one piece can legally move, so nobody has to hunt for
  the one legal tap.
- **1–4 players on one device**, in any mix of people and computer opponents.
- **Real names on the board.** The setup screen seats people from the family, so the
  turn card says *Chueen* and the win card says *Mamma wins!* — see **The family** above.
- **Everyone gets a placing.** A round doesn't stop when the first player is home —
  the rest play on for 2nd, 3rd and 4th, so nobody is simply cut off. The win card is
  a podium.
- **A running score.** Counted against the person, not the piece or the spelling of
  their name. It shows on the seats and on the win card, lives on that device only, and
  there's a *Clear the scores* when it stops being fun.
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
npm run shots             # screenshots of the shelf at three widths, to look at
```

`npm run sanity` and `npm test` need nothing installed. The browser tests need
Playwright. If Chromium is already on the machine, `CHROME=/path/to/chrome` uses it
instead of downloading another one.

`npm run shots` isn't a test — it writes `/tmp/shots/*.png` of the shelf at phone,
tablet and laptop widths, each with the games there are today and with six, so the
card grid and the install bar can be eyeballed before a deploy.

`test/simulate.mjs` imports the rules engine directly and asserts that no piece ever
lands on an impossible square, that two colours never share an unsafe square, that entry
is only offered on a 6, and that the winner really does have all four pieces home.
`test/simulate-snakes.mjs` does the same for the other board, and additionally checks the
board itself: every ladder goes up, every snake goes down, no jump lands on another jump,
and square *n* is always next to square *n−1*.

`test/simulate-memory.mjs` plays Memory out the same way and checks the things that
would quietly spoil it: that every round is spread across the colour families, that a
replay never deals the table somebody has just learned, that the computer never
remembers more than it is allowed to — and that it stays beatable, by measuring its win
rate against a player who remembers nothing at all and failing if it climbs too high.

## How it fits together

```
index.html            the shelf, and the empty host a game mounts into
app.css               the shell: colours, buttons, overlays, toast, cards
js/shell.js           routing, the install banner, sound, service worker
js/catalog.js         what's on the shelf — one row per game
js/family.js          who lives here — the roster, and wins across every game
js/table.js           "who's playing" — the seats for one game, and its scores
js/pawn.js            the playing piece, on canvas and as SVG
js/dice.js            one fair roll, and the pips that show it
js/audio.js           sounds, generated in the browser; no audio files
js/confetti.js        paper for the winner
js/toast.js           the shared message at the top of the screen
games/ludo/           one folder per game
games/snakes/
games/memory/
sw.js                 offline cache — lists every file
tools/make-icons.py   redraws the app icons and the link-preview card
tools/bump-cache.mjs  bumps the offline cache name before a deploy
tools/ship.mjs        test, bump, check, commit, push — in one command
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

## Memory

Turn over two cards; the same picture twice and you keep the pair and go again. It is
the one game here with no dice in it.

**The pictures.** Twenty-four of them, in six colour families of four — reds, oranges,
yellows, greens, blues, pinks. That grouping is not decoration, it's the difficulty
ladder. A round takes its pictures round-robin across the families, never as a flat
random draw, so:

| round | pictures per colour | what it asks of you |
|---|---|---|
| 3 pairs, 6 cards | one, from three families | every card a different colour — match colours |
| 6 pairs, 12 cards | one from each | still colour, but all six on the table |
| 8 pairs, 16 cards | two families doubled | colour narrows it, mostly |
| 12 pairs, 24 cards | two of every colour | colour tells you nothing; look at the picture |

So the board doesn't only get bigger, it gets harder in kind — and that comes out of the
structure rather than being bolted on. A flat random draw could also hand you four green
things and nothing else, which is the round that ends in tears.

Two rules held the set together, and both matter more than they look. **One nameable
thing per card**, because the way a small player holds positions in their head is verbal
— "elephant, top corner" — so a card has to be a noun they already own; a pattern has no
name and nothing to rehearse. And **nothing in a family is confusable with anything else
in it**: an apple and a tomato are both round and red, and two of those in one round is a
card you lose to a glance rather than to memory. That is why there is no tomato in the
deck, and no moon beside the banana. One picture was drawn as a whale, kept reading as a
fish, and is now called Fish — the spoken name has to match what she actually sees.

**Naming what you found.** A matched pair puts its name on screen for a moment and says
it aloud, using the speech synthesiser every browser already has, so there are no audio
files and it works in aeroplane mode like everything else. It follows the sound button,
and the word is on screen either way — a device with no voice loses nothing. Nothing is
ever printed on a card face: reading before recognising is slower, and it would turn the
game into homework.

**Repetition.** Individual pictures recur, which is fine and rather the point. The
*combination* doesn't: six from twenty-four is about 135,000 tables. And the layout is
reshuffled every round including "play again", never into the arrangement it just had, so
a replay is not the board somebody has already memorised.

**The computer** remembers the last three cards it saw turned over — about where a
five-year-old is — and two goes in five it knows where a pair is and goes poking about
somewhere else anyway. That is measured rather than guessed: against a player who
remembers nothing it wins about 70% of the time, and the simulation fails the build if
that ever climbs past 85%.

There is no timer, and there won't be. It turns a calm game into a stressful one, and
it's the one thing that would reliably make her lose to an adult.

The board is real DOM rather than canvas: a card is a button, the flip is a CSS
transform the browser animates itself, and it works with a screen reader without being
reinvented. `game.js` measures the space and lays the grid out whichever way up gives
the bigger cards, so a phone held sideways and a tablet in portrait both get the largest
board that fits, with no orientation special cases.

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

One command does the whole thing:

```bash
npm run ship -- "what changed"
```

It runs the rules tests (and the browser tests, if Playwright is installed), bumps
`CACHE` in `sw.js` — which is what tells an already-installed tablet there's something
new — re-runs the sanity checks, then commits and pushes. It stops at the first failure
and never pushes half a change. `--dry` does everything except the push.

By hand, the same thing is `npm run sanity`, `npm run release`, then commit and push. Opening the page always
goes to the network first, so a deploy shows up straight away and the cache is only the
fallback for when there's no internet; everything else is served from the cache and
refreshed quietly in the background. When a new worker takes over, the page reloads
itself once so nobody is left looking at last week's copy.
