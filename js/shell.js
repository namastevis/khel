/* ═══════════════════════════════════════════════════════════════
   shell.js — the shelf, the router, the install banner, the
   service worker. Everything that is not a game.

   Routing is by hash (#/ludo) so the whole thing stays one page:
   no server config, works offline, and the tablet's back gesture
   does the sane thing.
   ═══════════════════════════════════════════════════════════════ */

import { GAMES } from './catalog.js';
import * as family from './family.js';
import { sfx, unlock, isMuted, toggleMute } from './audio.js';
import { toast, hideToast } from './toast.js';

const $ = (id) => document.getElementById(id);

/* ── the shelf ─────────────────────────────────────────────── */
function buildShelf() {
  $('shelf').innerHTML = GAMES.map((g) => `
    <button class="game-card" data-id="${g.id}" style="--accent:${g.accent}">
      ${g.art()}
      <span class="card-text">
        <span class="card-title">${g.title}</span>
        <span class="card-blurb">${g.blurb}</span>
        ${g.note ? `<span class="card-note">${g.note}</span>` : ''}
      </span>
    </button>`).join('');

  $('shelf').querySelectorAll('.game-card').forEach((card) => {
    card.addEventListener('click', () => {
      unlock();
      sfx.tap();
      location.hash = `#/${card.dataset.id}`;
    });
  });
}

/* ── who lives here ────────────────────────────────────────
   A row of people under the games: tap one to edit them, tap ＋ to
   add someone. Wins are totalled across every game, so the row is
   also the house scoreboard. */
function buildFamily() {
  const standings = family.standings();
  const canAdd = standings.length < family.MAX_MEMBERS;

  $('family-row').innerHTML = standings.map((m) => `
    <button class="member" data-id="${m.id}" style="--tint:${m.tint}">
      <span class="member-dot"></span>
      <span class="member-name">${escapeHtml(m.name.trim() || 'Someone')}</span>
      ${m.wins ? `<span class="member-wins">🏆 ${m.wins}</span>` : ''}
    </button>`).join('')
    + (canAdd ? '<button class="member member-add" data-add="1">＋ Add someone</button>' : '');

  $('family-row').querySelectorAll('.member').forEach((btn) => {
    btn.addEventListener('click', () => {
      unlock();
      sfx.tap();
      if (btn.dataset.add) openMember(null); else openMember(btn.dataset.id);
    });
  });
}

/* ── adding or editing someone ─────────────────────────────── */
let editing = null;          // member id, or null when adding
let chosenTint = null;

function openMember(id) {
  editing = id;
  const member = id ? family.byId(id) : null;
  chosenTint = member ? member.tint : null;

  $('member-title').textContent = member ? 'Edit' : 'Add someone';
  $('member-name').value = member ? member.name : '';
  $('member-remove').hidden = !member || family.all().length <= 1;
  $('member-note').textContent = member
    ? ''
    : 'They\'ll show up in every game, and keep their own score.';

  $('member-tints').innerHTML = family.TINTS.map((t) => `
    <button class="tint" data-tint="${t}" style="--tint:${t}"
            aria-label="Colour" aria-pressed="${t === chosenTint}"></button>`).join('');

  $('member-sheet').classList.add('is-active');
  setTimeout(() => $('member-name').focus(), 60);
}

function closeMember() {
  $('member-sheet').classList.remove('is-active');
  editing = null;
}

function commitMember() {
  const name = $('member-name').value.trim();
  if (editing) {
    if (name) family.rename(editing, name);
    if (chosenTint) family.recolour(editing, chosenTint);
  } else if (name) {
    const added = family.add(name);
    if (added && chosenTint) family.recolour(added.id, chosenTint);
  }
  closeMember();
  buildFamily();
}

$('member-tints').addEventListener('click', (ev) => {
  const swatch = ev.target.closest('.tint');
  if (!swatch) return;
  chosenTint = swatch.dataset.tint;
  $('member-tints').querySelectorAll('.tint')
    .forEach((t) => t.setAttribute('aria-pressed', String(t.dataset.tint === chosenTint)));
});

$('member-done').addEventListener('click', commitMember);
$('member-name').addEventListener('keydown', (ev) => { if (ev.key === 'Enter') commitMember(); });
$('member-sheet').addEventListener('click', (ev) => { if (ev.target === $('member-sheet')) closeMember(); });

$('member-remove').addEventListener('click', () => {
  const member = editing && family.byId(editing);
  if (!member) return;
  const note = $('member-note');
  if (note.dataset.confirming !== editing) {          // one tap to ask, another to mean it
    note.dataset.confirming = editing;
    note.textContent = `Remove ${member.name.trim() || 'them'}? Their wins go too. Tap again to confirm.`;
    $('member-remove').textContent = 'Yes, remove them';
    return;
  }
  family.remove(editing);
  delete note.dataset.confirming;
  $('member-remove').textContent = 'Remove from the family';
  closeMember();
  buildFamily();
});

const escapeHtml = (s) => String(s).replace(/[&<>"]/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ── routing ───────────────────────────────────────────────── */
let active = null;          // { id, unmount }
let loading = null;         // id currently being imported

function show(which) {
  $('screen-shelf').classList.toggle('is-active', which === 'shelf');
  $('screen-game').classList.toggle('is-active', which === 'game');
}

function styleFor(id) {
  const href = `games/${id}/${id}.css`;
  if (document.querySelector(`link[href="${href}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}

async function openGame(id) {
  if (active?.id === id || loading === id) return;
  closeGame();
  loading = id;
  styleFor(id);
  show('game');
  $('game-loading').hidden = false;

  try {
    const mod = await import(`../games/${id}/index.js`);
    if (loading !== id) return;                  // navigated away while importing
    $('game-loading').hidden = true;
    const unmount = mod.mount($('game-host'), { goHome });
    active = { id, unmount };
  } catch (err) {
    console.error(`could not open "${id}"`, err);
    $('game-loading').hidden = true;
    toast("That game didn't want to open. Try again?", 2600);
    goHome();
  } finally {
    if (loading === id) loading = null;
  }
}

function closeGame() {
  loading = null;
  hideToast();
  if (!active) return;
  try { active.unmount?.(); } catch (err) { console.error(err); }
  $('game-host').replaceChildren();
  active = null;
}

function goHome() {
  if (location.hash === '' || location.hash === '#/') route();
  else location.hash = '#/';
}

function route() {
  const id = decodeURIComponent(location.hash.replace(/^#\/?/, '')).trim();
  const game = GAMES.find((g) => g.id === id);
  if (game) openGame(game.id);
  else { closeGame(); show('shelf'); }
}

window.addEventListener('hashchange', route);

/* ── sound ─────────────────────────────────────────────────── */
function paintSound() {
  const b = $('btn-sound');
  b.classList.toggle('is-muted', isMuted());
  b.textContent = isMuted() ? '🔇' : '🔊';
}
$('btn-sound').addEventListener('click', () => { toggleMute(); paintSound(); unlock(); sfx.tap(); });

/* ── add to home screen ────────────────────────────────────
   Android and desktop fire `beforeinstallprompt`, which we save and
   replay when the button is tapped. iOS never fires it — Safari only
   installs through the share sheet — so there we show the steps.     */

const installed = () =>
  matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);   // iPadOS pretends to be a Mac

const NUDGE_AGAIN_AFTER = 7 * 24 * 60 * 60 * 1000;   // a stray tap shouldn't hide it forever
let deferredInstall = null;

function dismissed() {
  try {
    const at = Number(localStorage.getItem('khel.installDismissedAt') || 0);
    return at > 0 && Date.now() - at < NUDGE_AGAIN_AFTER;
  } catch { return false; }
}

function showInstallBar() {
  if (installed() || dismissed()) return;
  $('install-bar').hidden = false;
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstall = e;
  showInstallBar();
});

window.addEventListener('appinstalled', () => {
  $('install-bar').hidden = true;
  try { localStorage.removeItem('khel.installDismissedAt'); } catch { /* ignore */ }
});

/* Safari has no install API, so all we can do is point at its own
   Share button — bottom bar on a phone, top right on an iPad. */
function showCoach() {
  const coach = $('ios-overlay');
  const wide = Math.min(window.innerWidth, window.innerHeight) >= 700;
  coach.classList.toggle('at-top', wide);
  coach.classList.toggle('at-bottom', !wide);
  coach.hidden = false;
}

$('ios-overlay').addEventListener('click', () => { $('ios-overlay').hidden = true; });

$('btn-install').addEventListener('click', async () => {
  sfx.tap();
  if (deferredInstall) {
    deferredInstall.prompt();
    const { outcome } = await deferredInstall.userChoice;
    deferredInstall = null;
    if (outcome === 'accepted') $('install-bar').hidden = true;
    return;
  }
  showCoach();                    // iOS, or a browser with no prompt API
});

$('btn-install-x').addEventListener('click', () => {
  $('install-bar').hidden = true;
  try { localStorage.setItem('khel.installDismissedAt', String(Date.now())); } catch { /* ignore */ }
});

if (isIOS) showInstallBar();     // iOS gets no event, so decide straight away

/* ── go ────────────────────────────────────────────────────── */
family.load();
buildShelf();
buildFamily();
paintSound();
route();
family.onChange(buildFamily);

// ask the browser not to throw the scores away when space runs short
navigator.storage?.persist?.().catch(() => { /* not supported everywhere */ });

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  // If a worker is already running the page, a new one taking over means a
  // new version has landed — reload once so nobody is left on last week's
  // copy. (Only when there was a controller to begin with, or the very first
  // visit would reload itself for no reason.)
  if (navigator.serviceWorker.controller) {
    let reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloading) return;
      reloading = true;
      location.reload();
    });
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => { /* offline support is optional */ });
  });
}

/* a little of the state, for the automated tests */
globalThis.KHEL = {
  GAMES, goHome, family, buildFamily, buildShelf,
  get active() { return active?.id ?? null; },
};
