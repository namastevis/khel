/* ═══════════════════════════════════════════════════════════════
   ship.mjs — everything between "it works on my laptop" and "it's
   on her tablet", in one command:

       npm run ship -- "what changed"

   Runs the tests, bumps the offline cache so installed devices
   actually pick the new version up, re-checks, commits, pushes.
   Stops at the first thing that fails, and never pushes a half
   state. Add --dry to do all of it except the push.
   ═══════════════════════════════════════════════════════════════ */

import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(new URL('..', import.meta.url).pathname);

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const message = args.filter((a) => !a.startsWith('--')).join(' ').trim();

const say = (s = '') => console.log(s);
const step = (s) => say(`\n\x1b[1m${s}\x1b[0m`);
const done = (s) => say(`  ✓ ${s}`);

function die(what, hint) {
  console.error(`\n\x1b[31m✗ ${what}\x1b[0m`);
  if (hint) console.error(`  ${hint}`);
  process.exit(1);
}

/** Quiet git, for asking questions. */
function git(...a) {
  return execFileSync('git', a, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
}

/** Loud anything, for doing work — output goes straight to the terminal. */
function run(cmd, a, failure) {
  const r = spawnSync(cmd, a, { cwd: ROOT, stdio: 'inherit' });
  if (r.status !== 0) die(failure, 'nothing was committed or pushed.');
}

/* ── 0. is there anything to do ─────────────────────────────── */
try { git('rev-parse', '--git-dir'); }
catch { die('this isn\'t a git checkout', `expected one at ${ROOT}`); }

let baseline = null;
try { git('rev-parse', '--verify', 'origin/main'); baseline = 'origin/main'; } catch { /* never pushed */ }

const dirty = git('status', '--porcelain').split('\n').filter(Boolean);
const unpushed = baseline ? git('log', '--oneline', `${baseline}..HEAD`).split('\n').filter(Boolean) : [];

if (!dirty.length && !unpushed.length) {
  say('\nNothing to ship — everything is already pushed.');
  process.exit(0);
}

if (dirty.length && !message) {
  die('no message', 'say what changed:  npm run ship -- "fixed the dice"');
}

say(`\nShipping from ${ROOT}`);
say(`  ${dirty.length} changed file(s), ${unpushed.length} commit(s) already waiting`);

/* ── 1. the rules still hold ────────────────────────────────── */
step('Checking the rules');
run('node', ['test/simulate.mjs', '1000'], 'Ludo broke its own rules');
run('node', ['test/simulate-snakes.mjs', '1000'], 'Snakes & Ladders broke its own rules');

/* ── 2. the browser tests, if Playwright is here ────────────── */
if (existsSync(join(ROOT, 'node_modules', 'playwright'))) {
  step('Driving a real browser');
  run('node', ['test/browser.mjs'], 'the browser tests failed');
  run('node', ['test/install.mjs'], 'the Add to Home Screen flow failed');
} else {
  step('Skipping the browser tests');
  say('  Playwright isn\'t installed here. Run "npm i" once if you want them in this step.');
}

/* ── 3. bump the cache, or installed tablets keep the old copy ─ */
step('Preparing the release');

const cacheOf = (src) => (src.match(/const CACHE = '([^']+)'/) || [])[1];
const onDisk = cacheOf(readFileSync(join(ROOT, 'sw.js'), 'utf8'));
const live = baseline ? cacheOf(git('show', `${baseline}:sw.js`)) : null;

const shippedChanged = baseline
  ? git('diff', '--name-only', baseline, '--')
    .split('\n').filter(Boolean)
    .filter((f) => !f.startsWith('test/') && !f.startsWith('tools/')
      && f !== 'README.md' && f !== 'icons/share-card.png')
  : ['everything'];

if (!shippedChanged.length) {
  done(`nothing that ships has changed — cache stays at ${onDisk}`);
} else if (live && live !== onDisk) {
  done(`cache already bumped: ${live} → ${onDisk}`);
} else {
  run('node', ['tools/bump-cache.mjs'], 'could not bump the cache name');
}

/* ── 4. the sanity checks, now that the cache is right ──────── */
step('Sanity checks');
run('node', ['test/sanity.mjs'], 'the sanity checks failed');

/* ── 5. commit and push ─────────────────────────────────────── */
step(dry ? 'Committing (dry run — not pushing)' : 'Committing and pushing');

if (git('status', '--porcelain')) {
  run('git', ['add', '-A'], 'could not stage the changes');
  run('git', ['commit', '-m', message], 'could not commit');
  done('committed');
} else {
  done('nothing new to commit');
}

if (dry) {
  say('\n\x1b[1mDry run finished.\x1b[0m Nothing was pushed.');
  process.exit(0);
}

run('git', ['push'], 'could not push — fix that and run ship again');

say('\n\x1b[32m\x1b[1mShipped.\x1b[0m  https://namastevis.in/khel/');
say('Open it once online and it updates itself; offline, it keeps the copy it has.');
