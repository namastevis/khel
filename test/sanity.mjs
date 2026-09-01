/* Checks the things that break a static site quietly: a file that isn't
   in the offline list, an import that points at nothing, a manifest icon
   that was renamed. No dependencies. Run with: node test/sanity.mjs      */

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname, resolve, extname } from 'node:path';

const ROOT = resolve(new URL('..', import.meta.url).pathname);
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

let problems = 0;
const fail = (msg) => { problems++; console.error('  ✗', msg); };
const ok = (msg) => console.log('  ✓', msg);

/* every file the app actually ships */
function shipped(dir = '', out = []) {
  for (const name of readdirSync(join(ROOT, dir))) {
    if (['node_modules', '.git', 'test', 'tools'].includes(name)) continue;
    const rel = dir ? `${dir}/${name}` : name;
    if (statSync(join(ROOT, rel)).isDirectory()) shipped(rel, out);
    else out.push(rel);
  }
  return out;
}

const files = shipped();

/* ── 1. the offline list matches what's on disk ── */
{
  const sw = read('sw.js');
  const listed = [...sw.matchAll(/^\s*'([^']+)',/gm)].map((m) => m[1]).filter((p) => p !== './');

  for (const p of listed) {
    if (!existsSync(join(ROOT, p))) fail(`sw.js caches "${p}", which doesn't exist`);
  }

  const shouldCache = files.filter((f) =>
    ['.js', '.css', '.png', '.webmanifest'].includes(extname(f))
    && !f.startsWith('icons/share-card')      // for chat previews, not the app
    && f !== 'sw.js');
  for (const f of shouldCache) {
    if (!listed.includes(f)) fail(`"${f}" ships but isn't in the sw.js cache list`);
  }
  if (!problems) ok(`offline cache lists all ${listed.length} files, and they all exist`);

  const version = sw.match(/const CACHE = '([^']+)'/)?.[1];
  if (!version) fail('sw.js has no CACHE name');
  else ok(`cache version is "${version}"`);
}

/* ── 2. every import resolves ── */
{
  let checked = 0;
  for (const f of files.filter((f) => f.endsWith('.js'))) {
    const src = read(f);
    const specs = [
      ...[...src.matchAll(/from\s+'([^']+)'/g)].map((m) => m[1]),
      ...[...src.matchAll(/import\(\s*`([^`$]+)`/g)].map((m) => m[1]),
    ];
    for (const spec of specs) {
      if (!spec.startsWith('.')) continue;
      const target = resolve(dirname(join(ROOT, f)), spec);
      if (!existsSync(target)) fail(`${f} imports "${spec}", which doesn't exist`);
      checked++;
    }
  }
  ok(`${checked} imports all resolve`);
}

/* ── 3. every game on the shelf is really there ── */
{
  const catalog = read('js/catalog.js');
  const ids = [...catalog.matchAll(/id:\s*'([^']+)'/g)].map((m) => m[1]);
  if (!ids.length) fail('the shelf has no games');

  for (const id of ids) {
    for (const needed of [`games/${id}/index.js`, `games/${id}/${id}.css`]) {
      if (!existsSync(join(ROOT, needed))) fail(`game "${id}" is missing ${needed}`);
    }
    const entry = existsSync(join(ROOT, `games/${id}/index.js`)) ? read(`games/${id}/index.js`) : '';
    if (!entry.includes('export function mount')) fail(`game "${id}" doesn't export mount()`);
    if (!entry.includes('return function unmount')) fail(`game "${id}" never cleans up after itself`);
  }

  // a folder in games/ that nobody can reach is a mistake, not a secret
  for (const dir of readdirSync(join(ROOT, 'games'))) {
    if (!ids.includes(dir)) fail(`games/${dir}/ exists but isn't on the shelf`);
  }
  ok(`${ids.length} games on the shelf: ${ids.join(', ')}`);
}

/* ── 4. the manifest ── */
{
  let manifest;
  try { manifest = JSON.parse(read('manifest.webmanifest')); }
  catch (e) { fail(`manifest.webmanifest isn't valid JSON: ${e.message}`); }

  if (manifest) {
    for (const icon of manifest.icons || []) {
      if (!existsSync(join(ROOT, icon.src))) fail(`manifest icon "${icon.src}" is missing`);
    }
    for (const s of manifest.shortcuts || []) {
      const id = s.url.replace(/^\.\/#\//, '');
      if (!existsSync(join(ROOT, `games/${id}/index.js`))) fail(`shortcut "${s.url}" points at no game`);
    }
    if (manifest.start_url !== './' || manifest.scope !== './') {
      fail('manifest start_url/scope should stay relative, or a custom domain breaks it');
    }
    ok('manifest is valid, and its icons and shortcuts exist');
  }
}

/* ── 5. index.html points at real files ── */
{
  const html = read('index.html');
  const refs = [...html.matchAll(/(?:href|src)="([^":]+)"/g)].map((m) => m[1]);
  for (const r of refs) {
    if (!existsSync(join(ROOT, r))) fail(`index.html references "${r}", which doesn't exist`);
  }
  const og = html.match(/property="og:image" content="([^"]+)"/)?.[1] || '';
  const file = og.split('/').slice(-2).join('/');
  if (og && !existsSync(join(ROOT, file))) fail(`the link preview image "${file}" is missing`);
  ok(`index.html's ${refs.length} local references all exist`);
}

/* ── 6. nothing calls the audience by name ── */
{
  const banned = /\b(kids?|child|children)\b/i;
  for (const f of files.filter((f) => /\.(html|js|css|md|webmanifest)$/.test(f))) {
    read(f).split('\n').forEach((line, i) => {
      if (line.includes('nth-child')) return;
      if (banned.test(line)) fail(`${f}:${i + 1} says "${line.match(banned)[0]}" — copy stays family-first`);
    });
  }
  ok('copy never names who it was made for');
}

/* ── 7. shipping a change means bumping the cache ──────────────────
   Without this, an installed tablet can load the new page against the
   old JavaScript. It's the one deploy step a human has to remember, so
   it shouldn't be left to a human. */
{
  const git = (...args) =>
    execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  const cacheIn = (rev) => (git('show', `${rev}:sw.js`).match(/const CACHE = '([^']+)'/) || [])[1];
  // compare what's about to ship — the working tree — not the last commit
  const onDisk = (read('sw.js').match(/const CACHE = '([^']+)'/) || [])[1];

  try {
    // compare against what's actually deployed, if we know it
    let baseline = 'HEAD';
    try { git('rev-parse', '--verify', 'origin/main'); baseline = 'origin/main'; } catch { /* never pushed */ }

    const changed = git('diff', '--name-only', baseline, '--')
      .split('\n')
      .filter(Boolean)
      .filter((f) => !f.startsWith('test/') && !f.startsWith('tools/') && f !== 'README.md');

    if (!changed.length) {
      ok(`nothing shipped has changed since ${baseline}`);
    } else if (cacheIn(baseline) === onDisk) {
      fail(`${changed.length} shipped file(s) changed since ${baseline}, but CACHE is still `
        + `"${onDisk}" — run: npm run release`);
    } else {
      ok(`cache bumped for this deploy: ${cacheIn(baseline)} → ${onDisk}`);
    }
  } catch {
    console.log('  ·  not a git checkout — skipping the deploy check');
  }
}

console.log(problems === 0 ? '\n✅ everything checks out' : `\n❌ ${problems} problems`);
process.exit(problems === 0 ? 0 : 1);
