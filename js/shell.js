/* ═══════════════════════════════════════════════════════════════
   shell.js — the shelf, the router, the install banner, the
   service worker. Everything that is not a game.

   Routing is by hash (#/ludo) so the whole thing stays one page:
   no server config, works offline, and the tablet's back gesture
   does the sane thing.
   ═══════════════════════════════════════════════════════════════ */

import { GAMES } from './catalog.js';
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
        <span class="card-players">${g.players}</span>
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
buildShelf();
paintSound();
route();

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => { /* offline support is optional */ });
  });
}

/* a little of the state, for the automated tests */
globalThis.KHEL = { GAMES, goHome, get active() { return active?.id ?? null; } };
