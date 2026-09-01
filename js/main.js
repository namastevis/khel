/* ═══════════════════════════════════════════════════════════════
   main.js — menu, player setup, screen switching, service worker.
   ═══════════════════════════════════════════════════════════════ */

import { ORDER, COLORS, cellOf } from './config.js';
import { createController } from './game.js';
import { sfx, unlock, isMuted, toggleMute } from './audio.js';

const $ = (id) => document.getElementById(id);

/* who is sitting in each seat */
const seats = { red: 'human', green: 'cpu', yellow: 'off', blue: 'off' };
const CYCLE = { human: 'cpu', cpu: 'off', off: 'human' };

try {
  const saved = JSON.parse(localStorage.getItem('ludo.seats') || 'null');
  if (saved && ORDER.every((c) => ['human', 'cpu', 'off'].includes(saved[c]))) Object.assign(seats, saved);
} catch { /* ignore */ }

const game = createController();

/* ── seat buttons ──────────────────────────────────────────── */
function pawnSVG(color) {
  const c = COLORS[color];
  return `<svg viewBox="0 0 100 100" aria-hidden="true">
    <ellipse cx="50" cy="86" rx="30" ry="9" fill="rgba(67,51,31,.18)"/>
    <circle cx="50" cy="62" r="26" fill="${c.main}" stroke="${c.dark}" stroke-width="6"/>
    <circle cx="50" cy="30" r="18" fill="${c.main}" stroke="${c.dark}" stroke-width="6"/>
    <ellipse cx="43" cy="24" rx="6" ry="4" fill="rgba(255,255,255,.8)" transform="rotate(-25 43 24)"/>
  </svg>`;
}

/* The card stays short so it never wraps; the computer's full name
   ("Robo Red") shows on the board, where there is room for it.       */
function seatLabel(color) {
  if (seats[color] === 'human') return `🙂 ${COLORS[color].name}`;
  if (seats[color] === 'cpu') return `🤖 ${COLORS[color].name}`;
  return 'Not playing';
}

function buildSeats() {
  $('seats').innerHTML = ORDER.map((color) => `
    <button class="seat" data-color="${color}" data-state="${seats[color]}">
      ${pawnSVG(color)}
      <span class="who">${seatLabel(color)}</span>
    </button>`).join('');

  $('seats').querySelectorAll('.seat').forEach((btn) => {
    btn.addEventListener('click', () => {
      unlock();
      const color = btn.dataset.color;
      seats[color] = CYCLE[seats[color]];
      sfx.tap();
      refreshSeats();
    });
  });
}

function refreshSeats() {
  $('seats').querySelectorAll('.seat').forEach((btn) => {
    const color = btn.dataset.color;
    btn.dataset.state = seats[color];
    btn.querySelector('.who').textContent = seatLabel(color);
  });

  const playing = ORDER.filter((c) => seats[c] !== 'off');
  const humans = ORDER.filter((c) => seats[c] === 'human');
  const ok = playing.length >= 2 && humans.length >= 1;
  $('btn-play').disabled = !ok;
  $('btn-play').textContent = ok
    ? (playing.length === 2 ? 'Play' : `Play with ${playing.length}`)
    : 'Pick 2 players';

  try { localStorage.setItem('ludo.seats', JSON.stringify(seats)); } catch { /* ignore */ }
}

/* ── screens ───────────────────────────────────────────────── */
function show(which) {
  $('screen-menu').classList.toggle('is-active', which === 'menu');
  $('screen-game').classList.toggle('is-active', which === 'game');
}

function startGame() {
  unlock();
  show('game');
  game.start({ ...seats });
}

/* ── wiring ────────────────────────────────────────────────── */
buildSeats();
refreshSeats();

$('btn-play').addEventListener('click', startGame);

$('btn-quick').addEventListener('click', () => {
  seats.red = 'human'; seats.green = 'cpu'; seats.yellow = 'off'; seats.blue = 'off';
  refreshSeats();
  startGame();
});

$('btn-how').addEventListener('click', () => $('help-overlay').classList.add('is-active'));
$('btn-help-close').addEventListener('click', () => $('help-overlay').classList.remove('is-active'));

$('btn-quit').addEventListener('click', () => {
  game.stop();
  $('win-overlay').classList.remove('is-active');
  show('menu');
});

$('btn-again').addEventListener('click', () => {
  $('win-overlay').classList.remove('is-active');
  game.start({ ...seats });
});

$('btn-menu').addEventListener('click', () => {
  game.stop();
  $('win-overlay').classList.remove('is-active');
  show('menu');
});

const soundBtn = $('btn-sound');
function paintSound() {
  soundBtn.classList.toggle('is-muted', isMuted());
  soundBtn.textContent = isMuted() ? '🔇' : '🔊';
}
soundBtn.addEventListener('click', () => { toggleMute(); paintSound(); unlock(); sfx.tap(); });
paintSound();

/* keep the board sized correctly when the keyboard/toolbars move around */
if (window.visualViewport) window.visualViewport.addEventListener('resize', () => game.layout());

/* ── add to home screen ────────────────────────────────────
   Android and desktop fire `beforeinstallprompt`, which we save and
   replay when the button is tapped. iOS never fires it — Safari only
   installs through the share sheet — so there we show the steps.     */

const installed = () =>
  matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);   // iPadOS pretends to be a Mac

let deferredInstall = null;

const NUDGE_AGAIN_AFTER = 7 * 24 * 60 * 60 * 1000;   // a stray tap shouldn't hide it forever

function dismissed() {
  try {
    const at = Number(localStorage.getItem('ludo.installDismissedAt') || 0);
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
  try { localStorage.removeItem('ludo.installDismissedAt'); } catch { /* ignore */ }
});

$('btn-install').addEventListener('click', async () => {
  sfx.tap();
  if (deferredInstall) {
    deferredInstall.prompt();
    const { outcome } = await deferredInstall.userChoice;
    deferredInstall = null;
    if (outcome === 'accepted') $('install-bar').hidden = true;
    return;
  }
  $('ios-overlay').classList.add('is-active');       // iOS, or a browser with no prompt API
});

$('btn-ios-close').addEventListener('click', () => $('ios-overlay').classList.remove('is-active'));

$('btn-install-x').addEventListener('click', () => {
  $('install-bar').hidden = true;
  try { localStorage.setItem('ludo.installDismissedAt', String(Date.now())); } catch { /* ignore */ }
});

// iOS gets no event, so decide straight away
if (isIOS) showInstallBar();

/* ── service worker (offline) ──────────────────────────────── */
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => { /* offline support is optional */ });
  });
}

/* expose a little of the state for debugging / automated tests */
globalThis.LUDO = {
  game, seats, start: startGame,
  geom: { cellOf },
  get pickable() { return game.pickable; },
};
