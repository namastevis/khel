/* ═══════════════════════════════════════════════════════════════
   game.js — one tablet, four secret chits.

   The hard part of this game on a single screen is the secret. So a
   round starts by handing the tablet round: each person taps their own
   name, holds a finger down to peek at their chit, lets go, and passes
   it on. The chit only shows while the finger is down, so a quick
   glance over a shoulder gets nothing.

   After that everything is public, the way it is on the floor: the
   Raja shows himself, the Mantri shows himself, the Mantri points.
   ═══════════════════════════════════════════════════════════════ */

import { ORDER, COLORS, ROLE, PACE, ROUNDS } from './config.js';
import { createGame, deal, judge, holder, suspects, peekers, cpuGuess, standings, isOver } from './rules.js';
import { chitSVG, FOLDED } from './chits.js';
import { sfx, unlock } from '../../js/audio.js';
import { toast } from '../../js/toast.js';
import { confetti } from '../../js/confetti.js';
import { escapeHtml } from '../../js/text.js';

const MEDALS = ['🥇', '🥈', '🥉', '🎖️'];

export function createController(el, { onGameOver, cpu }) {
  let g = null;
  let gen = 0;                 // bumps on every start/stop, so stale timers do nothing
  let stopConfetti = null;
  let shown = new Set();       // colours whose chit is face up for everyone
  let accusing = false;

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const alive = (my) => my === gen && !!g;
  const by = (color) => g.players.find((p) => p.color === color);
  const panel = (html) => { el('panel').innerHTML = html; };

  /* ── the four places round the table ───────────────────── */
  function buildTable() {
    el('table').innerHTML = g.players.map((p) => `
      <button class="rseat" data-colour="${p.color}" style="--c:${COLORS[p.color].main}" disabled>
        <span class="rchit" data-role="chit">${FOLDED}</span>
        <span class="rname">${escapeHtml(p.name)}</span>
        <span class="rtotal" data-role="total">${p.total}</span>
        <span class="rgain" data-role="gain"></span>
      </button>`).join('');
  }

  function paintTable() {
    el('round').textContent = `Round ${g.round} of ${g.rounds}`;
    for (const p of g.players) {
      const seat = el('table').querySelector(`[data-colour="${p.color}"]`);
      const role = g.roles[p.color];
      const open = shown.has(p.color);
      seat.classList.toggle('is-open', open);
      seat.querySelector('[data-role="chit"]').innerHTML = open
        ? `${chitSVG(role)}<span class="rchit-name">${ROLE[role].name}</span>`
        : FOLDED;
      seat.querySelector('[data-role="total"]').textContent = p.total;
      const gain = g.last ? g.last.gains[p.color] : null;
      seat.querySelector('[data-role="gain"]').textContent = gain === null ? '' : `+${gain}`;
      seat.classList.toggle('has-gain', gain !== null);
    }
  }

  /* ── a round ────────────────────────────────────────────── */
  async function round(my) {
    deal(g);
    shown = new Set();
    accusing = false;
    el('table').querySelectorAll('.rseat').forEach((s) => {
      s.disabled = true;
      s.classList.remove('is-suspect', 'is-accused', 'is-right', 'is-wrong');
    });
    paintTable();
    sfx.flip();

    // 1. everyone with a finger looks at their own chit
    for (const p of peekers(g)) {
      await peek(my, p);
      if (!alive(my)) return;
    }

    // 2. the Raja, then the Mantri, show themselves
    panel(`<p class="rsay">Everyone has a chit.</p><p class="rbig">Who is the Raja?</p>`);
    await sleep(PACE.reveal);
    if (!alive(my)) return;
    const raja = holder(g, 'raja');
    shown.add(raja.color);
    paintTable();
    sfx.home();
    panel(`<p class="rbig">👑 ${escapeHtml(raja.name)} is the Raja!</p>
           <p class="rsay">The Raja calls out: <b>“Mera Mantri kaun?”</b></p>`);
    await sleep(PACE.reveal + 300);
    if (!alive(my)) return;

    const mantri = holder(g, 'mantri');
    shown.add(mantri.color);
    paintTable();
    sfx.pop();
    await sleep(350);
    if (!alive(my)) return;

    // 3. the Mantri points
    const pick = suspects(g);
    pick.forEach((p) => {
      const seat = el('table').querySelector(`[data-colour="${p.color}"]`);
      seat.classList.add('is-suspect');
      seat.disabled = mantri.kind !== 'human';
    });

    if (mantri.kind === 'human') {
      panel(`<p class="rbig">📜 ${escapeHtml(mantri.name)} is the Mantri!</p>
             <p class="rsay">Mantri, find the Chor: <b>tap the one you think it is.</b></p>`);
      accusing = true;
      return;                       // the tap on a seat carries on in accuse()
    }

    panel(`<p class="rbig">📜 ${escapeHtml(mantri.name)} is the Mantri!</p>
           <p class="rsay">${escapeHtml(mantri.name)} is thinking…</p>`);
    await sleep(PACE.think);
    if (!alive(my)) return;
    await settle(my, cpuGuess(g));
  }

  /* One person's turn with the tablet. Resolves when they pass it on. */
  function peek(my, p) {
    return new Promise((resolve) => {
      const done = () => { if (alive(my)) resolve(); };

      // the hand-over: big name, one button, nothing to read beyond it
      panel(`<p class="rsay">Pass the tablet to</p>
             <p class="rwho" style="--c:${COLORS[p.color].main}">${escapeHtml(p.name)}</p>
             <button class="big-btn" data-act="me">That’s me</button>`);

      el('panel').querySelector('[data-act="me"]').addEventListener('click', () => {
        unlock();
        sfx.tap();
        const role = g.roles[p.color];
        panel(`<button class="rpeek" data-act="peek" aria-label="Hold to see your chit">
                 <span class="rpeek-shut">${FOLDED}</span>
                 <span class="rpeek-open">${chitSVG(role)}
                   <span class="rpeek-name">${ROLE[role].name}</span>
                   <span class="rpeek-en">${ROLE[role].english}</span></span>
               </button>
               <p class="rsay" data-role="say">Hold your finger on the chit to see it</p>
               <button class="big-btn" data-act="done" hidden>Done — pass it on</button>`);

        const chit = el('panel').querySelector('[data-act="peek"]');
        const open = (ev) => {
          ev.preventDefault();
          chit.classList.add('is-open');
          sfx.flip();
          el('panel').querySelector('[data-act="done"]').hidden = false;
          el('panel').querySelector('[data-role="say"]').textContent = 'Let go to hide it again';
        };
        const shut = () => {
          if (!chit.classList.contains('is-open')) return;
          chit.classList.remove('is-open');
          el('panel').querySelector('[data-role="say"]').textContent = 'Shh — keep it secret!';
        };
        chit.addEventListener('pointerdown', open);
        chit.addEventListener('pointerup', shut);
        chit.addEventListener('pointerleave', shut);
        chit.addEventListener('pointercancel', shut);
        chit.addEventListener('contextmenu', (e) => e.preventDefault());

        el('panel').querySelector('[data-act="done"]').addEventListener('click', () => {
          sfx.tap();
          done();
        });
      }, { once: true });
    });
  }

  async function accuse(color) {
    if (!accusing || !g) return;
    if (!suspects(g).some((p) => p.color === color)) return;
    accusing = false;
    unlock();
    sfx.tap();
    await settle(gen, color);
  }

  async function settle(my, accused) {
    el('table').querySelectorAll('.rseat').forEach((s) => { s.disabled = true; });
    el('table').querySelector(`[data-colour="${accused}"]`).classList.add('is-accused');
    const mantri = holder(g, 'mantri');
    panel(`<p class="rbig">${escapeHtml(mantri.name)} points at ${escapeHtml(by(accused).name)}…</p>`);
    await sleep(PACE.judge);
    if (!alive(my)) return;

    const res = judge(g, accused);
    for (const p of suspects(g)) shown.add(p.color);
    el('table').querySelectorAll('.rseat').forEach((s) => s.classList.remove('is-suspect'));
    el('table').querySelector(`[data-colour="${accused}"]`)
      .classList.add(res.caught ? 'is-right' : 'is-wrong');
    paintTable();

    const chor = holder(g, 'chor');
    if (res.caught) {
      sfx.capture();
      toast('Pakda gaya! Caught! 🎉', 1800);
      panel(`<p class="rbig">Caught! ${escapeHtml(chor.name)} was the Chor.</p>
             <p class="rsay">The Mantri keeps 800.</p>`);
    } else {
      sfx.skip();
      toast('Wrong one — the Chor gets away! 🏃', 1800);
      panel(`<p class="rbig">Wrong! ${escapeHtml(chor.name)} was the Chor.</p>
             <p class="rsay">The Chor runs off with the Mantri’s 800.</p>`);
    }

    const last = isOver(g);
    el('panel').insertAdjacentHTML('beforeend',
      `<button class="big-btn" data-act="next">${last ? 'Who won?' : 'Next round'}</button>`);
    el('panel').querySelector('[data-act="next"]').addEventListener('click', () => {
      sfx.tap();
      if (last) finish(); else round(gen);
    });
  }

  /* ── the end ────────────────────────────────────────────── */
  function finish() {
    const order = standings(g);
    const top = order[0];
    const drawn = order[1] && order[1].total === top.total;

    el('winTitle').textContent = drawn ? "It's a draw!" : `${top.name} wins!`;
    el('winSub').textContent = `After ${g.rounds} rounds`;

    let place = 0;
    el('podium').innerHTML = order.map((p, i) => {
      if (i && p.total !== order[i - 1].total) place = i;
      return `<li class="podium-row" style="--c:${COLORS[p.color].main}">
        <span class="podium-medal">${MEDALS[place] || ''}</span>
        <span class="podium-pawn"></span>
        <span class="podium-name">${escapeHtml(p.name)}</span>
        <span class="podium-pairs">${p.total}</span>
      </li>`;
    }).join('');

    el('winOverlay').classList.add('is-active');
    stopConfetti = confetti(el('confetti'));
    sfx.win();
    onGameOver?.(order.map((p) => p.color), drawn);
  }

  /* ── input ──────────────────────────────────────────────── */
  const onTable = (ev) => {
    const seat = ev.target.closest('.rseat');
    if (seat && !seat.disabled) accuse(seat.dataset.colour);
  };
  el('table').addEventListener('click', onTable);

  return {
    start(seats, names) {
      gen++;
      stopConfetti?.(); stopConfetti = null;
      el('winOverlay').classList.remove('is-active');
      g = createGame({ seats, names, cpu, order: ORDER, rounds: ROUNDS });
      buildTable();
      round(gen);
    },
    stop() {
      gen++;
      stopConfetti?.(); stopConfetti = null;
      g = null;
      accusing = false;
    },
    destroy() {
      this.stop();
      el('table').removeEventListener('click', onTable);
    },
    get state() { return g; },
    accuse,
  };
}
