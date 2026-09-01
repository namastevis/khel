/* Drives the real thing in a headless browser: the shelf, opening a
   game, playing it, and coming back out again — watching for console
   errors and leaked listeners the whole way.
   Run with:  node test/browser.mjs                                     */

import pkg from 'playwright';
const { chromium } = pkg;
import { serve } from './serve.mjs';

const PORT = 8123;
const server = await serve(PORT);
// CHROME=... lets a machine with Chromium already on disk skip
// `npx playwright install`.
const browser = await chromium.launch(
  process.env.CHROME ? { executablePath: process.env.CHROME } : {});

const errors = [];
const results = [];
const check = (label, pass) => results.push([label, pass]);

async function open(name, viewport, init) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`[${name}] ${m.text()}`); });
  page.on('pageerror', (e) => errors.push(`[${name}] ${e.message}`));
  if (init) await page.addInitScript(init.fn, init.arg);
  await page.goto(`http://localhost:${PORT}/`);
  await page.waitForTimeout(400);
  return { ctx, page };
}

/* Games now open straight onto the board when the same people are playing
   as last time, so a test that wants the setup screen has to ask for it
   the way an adult would — the 👥 button. */
async function toSetup(page) {
  await page.waitForSelector('[data-el="who"], [data-screen="setup"].is-active');
  if (await page.isVisible('[data-el="who"]')) {
    await page.click('[data-el="who"]');
    await page.waitForTimeout(300);
  }
  await page.waitForSelector('.seats .seat');
}

/* A loaded die, so that a test about finishing a round isn't a test
   about luck. rollDie() reads one byte and returns (byte % 6) + 1. */
const alwaysRolls = (value) => ({
  arg: value,
  fn: (want) => {
    const real = crypto.getRandomValues.bind(crypto);
    crypto.getRandomValues = (buf) => {
      if (buf.length === 1) { buf[0] = want - 1; return buf; }
      return real(buf);
    };
  },
});

/* ── the shelf, and getting in and out of a game ── */
{
  const { ctx, page } = await open('shelf', { width: 820, height: 1180 });

  check('shelf lists Ludo', await page.isVisible('.game-card[data-id="ludo"]'));
  await page.screenshot({ path: '/tmp/khel-shelf.png' });

  await page.click('.game-card[data-id="ludo"]');
  await page.waitForTimeout(600);
  check('tapping the card routes to #/ludo', page.url().endsWith('#/ludo'));
  check('the game mounted', await page.evaluate(() => KHEL.active === 'ludo'));
  // the whole point of the change: yesterday's line-up just plays
  check('a familiar line-up goes straight to the board',
    await page.isVisible('[data-screen="board"].is-active'));
  await toSetup(page);
  check('and 👥 gets back to who\'s playing',
    await page.isVisible('[data-screen="setup"].is-active'));
  await page.screenshot({ path: '/tmp/khel-ludo-setup.png' });

  // the seats are filled from the family, and nobody types a name here
  const shown = await page.$$eval('.seat', (cards) => cards.map((c) => ({
    state: c.dataset.state,
    who: c.querySelector('[data-role="who"]').textContent,
  })));
  check('the child and her mother are seated by default',
    shown.slice(0, 2).map((s) => s.who).join(',') === 'Chueen,Mamma');
  check('the rest start empty', shown.slice(2).every((s) => s.state === 'off'));

  // tapping a seat opens the picker rather than a text box
  await page.click('.seat[data-colour="yellow"]');
  await page.waitForTimeout(250);
  check('tapping a seat opens the picker', await page.isVisible('[data-el="pick"].is-active'));
  check('people already seated can\'t be picked twice',
    await page.evaluate(() => [...document.querySelectorAll('.pick-option')]
      .some((o) => o.disabled && o.textContent.includes('Chueen'))));

  await page.click('.pick-option[data-who="cpu"]');
  await page.waitForTimeout(250);
  check('picking the computer fills the seat',
    (await page.getAttribute('.seat[data-colour="yellow"]', 'data-state')) === 'cpu');
  check('and it\'s an animal, not a robot',
    (await page.textContent('.seat[data-colour="yellow"] [data-role="who"]')).includes('Duck'));

  await page.click('.seat[data-colour="yellow"]');
  await page.waitForTimeout(200);
  await page.click('.pick-option[data-who="off"]');
  await page.waitForTimeout(200);
  check('and emptying it again works',
    (await page.getAttribute('.seat[data-colour="yellow"]', 'data-state')) === 'off');

  await page.click('[data-el="play"]');
  await page.waitForTimeout(900);
  // the turn card now carries her creature as well as her name, which is
  // the half a five-year-old can actually read
  const turn = await page.textContent('[data-el="turnName"]');
  check('the family name is announced on the board', turn.includes('Chueen'));
  check('and so is her creature', /\p{Extended_Pictographic}/u.test(turn));
  await page.click('[data-el="quit"]');
  await page.waitForTimeout(400);
  await page.goto(`http://localhost:${PORT}/#/ludo`);
  await page.waitForTimeout(700);
  await toSetup(page);

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
  // a loaded die here too: entering the board needs a 6, and "did anything
  // move in 45 seconds" is otherwise a coin toss the suite occasionally loses
  const { ctx, page } = await open('play', { width: 820, height: 1180 }, alwaysRolls(6));
  await page.click('.game-card[data-id="ludo"]');
  await page.waitForTimeout(600);
  await toSetup(page);

  await page.evaluate(() => {
    LUDO.table.assign('green', 'cpu');
    LUDO.table.assign('yellow', 'cpu');
    LUDO.table.assign('blue', 'cpu');
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
  const { ctx, page } = await open('podium', { width: 820, height: 1180 }, alwaysRolls(6));
  await page.click('.game-card[data-id="ludo"]');
  await page.waitForTimeout(600);

  await page.evaluate(() => LUDO.start());
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
    (await page.textContent('.podium-row:first-child .podium-name')).includes('Chueen'));
  check('the running score is shown',
    (await page.textContent('[data-el="tallyRow"]')).includes('Chueen 1'));
  await page.screenshot({ path: '/tmp/khel-podium.png' });

  await page.click('[data-el="changePlayers"]');
  await page.waitForTimeout(400);
  check('the win shows on her seat',
    (await page.textContent('.seat[data-colour="red"] [data-role="tally"]')).includes('1'));
  check('there\'s a way to clear the scores', await page.isVisible('[data-el="reset"]'));
  await page.screenshot({ path: '/tmp/khel-setup-tally.png' });

  await page.click('[data-el="reset"]');
  await page.waitForTimeout(250);
  check('clearing the scores works',
    (await page.textContent('.seat[data-colour="red"] [data-role="tally"]')) === ''
    && !(await page.isVisible('[data-el="reset"]')));

  await ctx.close();
}

/* ── the second game ── */
{
  const { ctx, page } = await open('snakes', { width: 820, height: 1180 });

  // one card per catalogue row, whatever the catalogue holds today
  check('the shelf shows every game in the catalogue', await page.evaluate(
    () => document.querySelectorAll('.game-card').length === KHEL.GAMES.length && KHEL.GAMES.length >= 2));
  check('Snakes & Ladders is on the shelf', await page.isVisible('.game-card[data-id="snakes"]'));
  await page.screenshot({ path: '/tmp/khel-shelf.png' });

  await page.click('.game-card[data-id="snakes"]');
  await page.waitForTimeout(500);
  await toSetup(page);
  await page.waitForTimeout(800);
  check('it opens', await page.evaluate(() => KHEL.active === 'snakes'));
  check('the same family sits down',
    (await page.textContent('.seat[data-colour="red"] [data-role="who"]')) === 'Chueen');

  await page.evaluate(() => {
    SNAKES.table.assign('green', 'cpu');
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
    (await page.textContent('.seat[data-colour="red"] [data-role="tally"]')) === '');

  await ctx.close();
}

/* ── the family: add, rename, remove ── */
{
  const { ctx, page } = await open('family', { width: 820, height: 1180 });

  check('the shelf shows who lives here',
    (await page.$$eval('.member:not(.member-add) .member-name', (els) => els.map((e) => e.textContent.trim())))
      .join(',') === 'Chueen,Mamma,Dada');
  check('everyone has a creature of their own', await page.evaluate(() => {
    const faces = KHEL.family.all().map((m) => m.face);
    return faces.every(Boolean) && new Set(faces).size === faces.length;
  }));
  await page.screenshot({ path: '/tmp/khel-family.png' });

  // add someone
  await page.click('.member-add');
  await page.waitForTimeout(250);
  check('the add sheet opens', await page.isVisible('#member-sheet.is-active'));
  await page.fill('#member-name', 'Nani');
  await page.click('#member-done');
  await page.waitForTimeout(300);
  check('they join the family',
    (await page.$$('.member:not(.member-add)')).length === 4);

  // a typo, then the fix — the whole point of the exercise
  await page.click('.member:nth-child(4)');
  await page.waitForTimeout(250);
  await page.fill('#member-name', 'Chuen');
  await page.click('#member-done');
  await page.waitForTimeout(250);

  const idBefore = await page.evaluate(() => KHEL.family.all().find((m) => m.name === 'Chuen')?.id);
  await page.click('.member:nth-child(4)');
  await page.waitForTimeout(250);
  await page.fill('#member-name', 'Chueen2');
  await page.click('#member-done');
  await page.waitForTimeout(250);
  const idAfter = await page.evaluate(() => KHEL.family.all().find((m) => m.name === 'Chueen2')?.id);
  check('fixing a spelling keeps the same person', !!idBefore && idBefore === idAfter);
  check('and doesn\'t create a second one',
    (await page.$$('.member:not(.member-add)')).length === 4);

  // they show up in a game's picker
  await page.click('.game-card[data-id="ludo"]');
  await page.waitForTimeout(700);
  await toSetup(page);
  await page.click('.seat[data-colour="yellow"]');
  await page.waitForTimeout(250);
  check('a new family member can take a seat',
    (await page.textContent('[data-role="pick-list"]')).includes('Chueen2'));
  await page.click('[data-role="pick-close"]');
  await page.click('[data-el="back"]');
  await page.waitForTimeout(400);

  // remove takes two taps, on purpose
  await page.click('.member:nth-child(4)');
  await page.waitForTimeout(250);
  await page.click('#member-remove');
  await page.waitForTimeout(150);
  check('removing asks first', await page.isVisible('#member-sheet.is-active'));
  await page.click('#member-remove');
  await page.waitForTimeout(300);
  check('and then removes them',
    (await page.$$('.member:not(.member-add)')).length === 3);

  check('the family survives a reload', await (async () => {
    await page.reload();
    await page.waitForTimeout(500);
    const names = await page.$$eval('.member:not(.member-add)', (els) => els.map((e) => e.textContent.trim()));
    return names.length === 3;
  })());

  await ctx.close();
}

/* ── Memory ── */
{
  const { ctx, page } = await open('memory', { width: 820, height: 1180 });
  await page.goto(`http://localhost:${PORT}/#/memory`);
  await toSetup(page);

  check('Memory: the sizes are offered', (await page.$$('.size')).length === 4);

  await page.click('.size[data-size="0"]');            // Tiny — six cards
  check('Memory: choosing a size sticks',
    await page.$eval('.size[data-size="0"]', (el) => el.classList.contains('is-on')));

  await page.click('[data-el="play"]');
  await page.waitForSelector('.mcard');
  check('Memory: six cards are dealt', (await page.$$('.mcard')).length === 6);
  check('Memory: every card starts face down', (await page.$$('.mcard.is-up')).length === 0);

  // the board must fit the space it is given, not spill under the scores
  check('Memory: the board fits above the scores', await page.evaluate(() => {
    const board = document.querySelector('.mboard').getBoundingClientRect();
    const scores = document.querySelector('.mscores').getBoundingClientRect();
    const wrap = document.querySelector('.mboard-wrap').getBoundingClientRect();
    return board.bottom <= scores.top + 1 && board.height <= wrap.height + 1 && board.width > 40;
  }));

  check('Memory: every picture is there exactly twice', await page.evaluate(() => {
    const seen = {};
    MEMORY.game.state.cards.forEach((c) => { seen[c.id] = (seen[c.id] || 0) + 1; });
    return Object.values(seen).every((n) => n === 2) && Object.keys(seen).length === 3;
  }));

  // a tiny round is one picture per colour — the point of the whole deck
  check('Memory: the round is spread across the colours', await page.evaluate(async () => {
    const { byId } = await import('/games/memory/deck.js');
    const families = MEMORY.game.state.pictures.map((id) => byId(id).family);
    return new Set(families).size === families.length;
  }));

  check('Memory: tapping turns a card over', await (async () => {
    await page.click('.mcard[data-i="0"]');
    await page.waitForTimeout(450);
    return (await page.$$('.mcard.is-up')).length === 1;
  })());

  check('Memory: no third card while two are up', await (async () => {
    await page.click('.mcard[data-i="1"]');
    await page.waitForTimeout(80);
    await page.click('.mcard[data-i="2"]').catch(() => {});
    await page.waitForTimeout(120);
    return (await page.$$('.mcard.is-up')).length <= 2;
  })());

  /* Played by driving the rules, not by guessing — this is a test about
     the screen keeping up, not about being lucky. */
  check('Memory: finding a pair keeps the turn and names it', await (async () => {
    await page.waitForTimeout(1500);
    return page.evaluate(async () => {
      const g = MEMORY.game.state;
      const before = g.turn;
      // the two cards turned over above may have matched by luck, so count
      // from where this player actually is rather than from zero
      const had = g.players[before].pairs;
      const first = g.cards.find((c) => !c.takenBy);
      const twin = g.cards.find((c) => c.id === first.id && c.index !== first.index);
      document.querySelector(`.mcard[data-i="${first.index}"]`).click();
      document.querySelector(`.mcard[data-i="${twin.index}"]`).click();
      await new Promise((r) => setTimeout(r, 1100));
      const badge = document.querySelector('.mfound');
      return g.turn === before && g.players[before].pairs === had + 1
        && badge.classList.contains('is-shown') && badge.textContent.length > 2;
    });
  })());

  check('Memory: the round ends with a podium', await (async () => {
    await page.evaluate(async () => {
      const g = MEMORY.game.state;
      while (g.left > 0) {
        const first = g.cards.find((c) => !c.takenBy);
        const twin = g.cards.find((c) => c.id === first.id && c.index !== first.index);
        document.querySelector(`.mcard[data-i="${first.index}"]`).click();
        document.querySelector(`.mcard[data-i="${twin.index}"]`).click();
        await new Promise((r) => setTimeout(r, 950));
      }
    });
    await page.waitForSelector('.podium-row', { timeout: 8000 });
    return (await page.$$('.podium-row')).length === 2;
  })());

  check('Memory: and its own score', /\d/.test(await page.textContent('[data-el="tallyRow"]')));

  check('Memory: playing again deals a different table', await (async () => {
    const before = await page.evaluate(() => MEMORY.game.state.deal.join());
    await page.click('[data-el="again"]');
    await page.waitForTimeout(600);
    const after = await page.evaluate(() => MEMORY.game.state.deal.join());
    return before !== after;
  })());

  check('Memory: leaving cleans up', await (async () => {
    await page.click('[data-el="quit"]');
    await page.waitForTimeout(500);
    return (await page.evaluate(() => typeof globalThis.MEMORY)) === 'undefined'
      && await page.isVisible('#screen-shelf');
  })());

  await ctx.close();
}

/* ── Memory: a level round ──
   About one round in five ends level at these sizes, so it must not hand a
   trophy to whoever happened to sit down first. The table is set up level
   with one pair left, and that last pair is then played for real. */
{
  const { ctx, page } = await open('memory-draw', { width: 820, height: 1180 });
  await page.goto(`http://localhost:${PORT}/#/memory`);
  await toSetup(page);
  await page.click('.size[data-size="1"]');          // six pairs, so 3–3 is possible
  await page.click('[data-el="play"]');
  await page.waitForSelector('.mcard');

  const before = await page.evaluate(() => {
    const g = MEMORY.game.state;
    const ids = [...new Set(g.cards.map((c) => c.id))];
    const last = ids.pop();
    ids.forEach((id, k) => {
      const owner = g.players[k % g.players.length];
      g.cards.filter((c) => c.id === id).forEach((c) => { c.takenBy = owner.color; });
      owner.pairs += 1;
    });
    g.left = 1;
    g.turn = g.players.indexOf(g.players.reduce((a, b) => (b.pairs < a.pairs ? b : a)));
    const stored = JSON.parse(localStorage.getItem('khel.memory.tally') || '{}');
    g.cards.filter((c) => c.id === last)
      .forEach((c) => document.querySelector(`.mcard[data-i="${c.index}"]`).click());
    return stored;
  });

  await page.waitForSelector('.podium-row', { timeout: 8000 });
  await page.waitForTimeout(300);
  const after = await page.evaluate(() => JSON.parse(localStorage.getItem('khel.memory.tally') || '{}'));
  const pairs = await page.$$eval('.podium-pairs', (els) => els.map((e) => e.textContent));
  const medals = await page.$$eval('.podium-medal', (els) => els.map((e) => e.textContent));

  check('Memory: a level round really is level', pairs[0] === pairs[1]);
  check('Memory: and it is called a draw',
    (await page.textContent('[data-el="winTitle"]')).includes('draw'));
  check('Memory: level players share a place', medals[0] === medals[1]);
  check('Memory: and nobody banks a win', JSON.stringify(before) === JSON.stringify(after));

  await ctx.close();
}

/* ── the shared toast, and the family listener ──
   Both are things that fail silently: a missing #toast swallows every
   message in every game without an error, and a listener kept after a game
   unmounts makes the next family edit refresh screens that no longer
   exist. Neither shows up in a screenshot, so they are asserted here. */
{
  const { ctx, page } = await open('plumbing', { width: 820, height: 1180 });

  check('the toast has somewhere to appear', await page.evaluate(async () => {
    const { toast } = await import('/js/toast.js');
    toast('hello', 4000);
    const el = document.getElementById('toast');
    return !!el && el.classList.contains('show') && el.textContent === 'hello';
  }));

  check('a game releases its family listener when it closes', await page.evaluate(async () => {
    const family = await import('/js/family.js');
    const baseline = family.listenerCount();          // the shelf's own
    for (const id of KHEL.GAMES.map((g) => g.id)) {
      location.hash = `#/${id}`;
      await new Promise((r) => setTimeout(r, 800));
      KHEL.goHome();
      await new Promise((r) => setTimeout(r, 400));
    }
    return family.listenerCount() === baseline && baseline > 0;
  }));

  await ctx.close();
}

/* ── the five UX changes ──
   Faces, the shelf's memory of the last round, and going straight to the
   board. All three break silently, so each is asserted here. */
{
  const { ctx, page } = await open('polish', { width: 820, height: 1180 });

  check('a creature can be changed, and stays changed', await page.evaluate(async () => {
    const me = KHEL.family.all()[0];
    const wanted = KHEL.family.FACES.find((f) => f !== me.face);
    KHEL.family.reface(me.id, wanted);
    const again = await import('/js/family.js');
    again.load();
    return again.byId(me.id).face === wanted;
  }));

  check('two people never share a creature', await page.evaluate(() => {
    const taken = new Set(KHEL.family.all().map((m) => m.face));
    return taken.size === KHEL.family.all().length;
  }));

  check('the shelf says nothing before anything has been played',
    await page.evaluate(() => document.getElementById('last-round').hidden));

  check('and remembers the last round afterwards', await (async () => {
    await page.evaluate(() => {
      localStorage.setItem('khel.lastRound',
        JSON.stringify({ game: 'ludo', winner: '\u{1F98A} Chueen', at: Date.now() - 86400000 }));
    });
    await page.reload();
    await page.waitForTimeout(500);
    const line = await page.textContent('#last-round');
    return !(await page.evaluate(() => document.getElementById('last-round').hidden))
      && line.includes('Chueen') && line.includes('Ludo') && line.includes('Yesterday');
  })());

  check('a round from a game that no longer exists is not invented', await (async () => {
    await page.evaluate(() => {
      localStorage.setItem('khel.lastRound', JSON.stringify({ game: 'nosuchgame', winner: 'X', at: Date.now() }));
    });
    await page.reload();
    await page.waitForTimeout(400);
    return page.evaluate(() => document.getElementById('last-round').hidden);
  })());

  check('and finishing a round is what writes it', await (async () => {
    await page.evaluate(() => localStorage.removeItem('khel.lastRound'));
    await page.goto(`http://localhost:${PORT}/#/memory`);
    await toSetup(page);
    await page.click('.size[data-size="0"]');
    await page.click('[data-el="play"]');
    await page.waitForSelector('.mcard');
    await page.evaluate(async () => {
      const g = MEMORY.game.state;
      while (g.left > 0) {
        const first = g.cards.find((c) => !c.takenBy);
        const twin = g.cards.find((c) => c.id === first.id && c.index !== first.index);
        document.querySelector(`.mcard[data-i="${first.index}"]`).click();
        document.querySelector(`.mcard[data-i="${twin.index}"]`).click();
        await new Promise((r) => setTimeout(r, 950));
      }
    });
    await page.waitForSelector('.podium-row', { timeout: 8000 });
    const last = await page.evaluate(() => JSON.parse(localStorage.getItem('khel.lastRound') || 'null'));
    return !!last && last.game === 'memory' && !!last.winner;
  })());

  await ctx.close();
}

/* ── knowing which copy you are on ──
   An installed tablet has no address bar, so a stale copy is invisible
   until someone notices a game is missing. */
{
  const { ctx, page } = await open('version', { width: 820, height: 1180 });
  await page.evaluate(async () => {
    await caches.open('khel-v1');            // an old copy left behind
    await caches.open('khel-v42');
  });
  await page.reload();
  await page.waitForTimeout(600);
  check('the shelf says which build this device is running',
    (await page.textContent('#version')).trim() === 'khel-v42');
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
