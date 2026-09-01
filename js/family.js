/* ═══════════════════════════════════════════════════════════════
   family.js — who lives here.

   A person is a record with an id that never changes. The name is a
   label on that record, so correcting a spelling is an edit, not a
   new person — which is the whole reason this exists. Scores key on
   the id, in every game, so nothing is ever lost to a typo.

   Everything is kept on this device. Nothing is sent anywhere.
   ═══════════════════════════════════════════════════════════════ */

import { GAMES } from './catalog.js';
import { readJSON, writeJSON, drop } from './store.js';

const KEY = 'khel.family';

/* Every game on the shelf keeps its own tally; the row under the games
   adds them up. Taken from the catalogue so adding a game can never
   quietly leave its scores out of the house scoreboard. */
const SCORED = () => GAMES.map((g) => g.id);

/* Their own creature. A five-year-old can't read "Mamma" but reads a fox
   instantly, so this is what makes the turn card legible to her — and
   picking your own is the kind of small ownership that matters at that
   age. The computer's players have had animals from the start; it was odd
   that the actual family got a coloured dot and a word. */
export const FACES = [
  '🦊', '🐼', '🐰', '🐨', '🦁', '🐸', '🐵', '🐷',
  '🐯', '🐮', '🐧', '🦄', '🐙', '🦋', '🐢', '🐝',
];

/* Their own colour, which is theirs whatever piece they play today. */
export const TINTS = [
  '#F0544F', '#3FBF6F', '#FFC531', '#4A9BE8',
  '#9B6BD6', '#F08A3C', '#38B7B0', '#E86FA6',
];

const SEED = ['Chueen', 'Mamma', 'Dada'];   // anyone else gets added when they turn up
export const MAX_MEMBERS = 8;

let members = [];
let listeners = [];

const read = readJSON;
const write = writeJSON;

function save() {
  write(KEY, { v: 1, members });
  listeners.forEach((fn) => fn(members));
}

const newId = () => (globalThis.crypto?.randomUUID?.() ?? `m${Date.now()}${Math.random()}`).slice(0, 12);

/* ── one-time move from the old name-keyed scores ───────────
   The first version stored a name per colour per game, and counted
   wins against that name. Carry those across rather than starting
   everyone at zero. */
function migrate() {
  const OLD = ['ludo', 'snakes'];  // only these two ever stored names per colour
  const seen = new Map();          // name → member

  for (const game of OLD) {
    const names = read(`khel.${game}.names`, null);
    if (!names) continue;
    for (const colour of ['red', 'green', 'yellow', 'blue']) {
      const name = (names[colour] || '').trim();
      if (!name || seen.has(name)) continue;
      seen.set(name, { id: newId(), name, tint: TINTS[seen.size % TINTS.length] });
    }
  }

  members = [...seen.values()];
  if (!members.length) return false;

  for (const game of OLD) {
    const oldTally = read(`khel.${game}.tally`, null);
    if (oldTally) {
      const moved = {};
      for (const [name, wins] of Object.entries(oldTally)) {
        const m = seen.get(name);
        if (m && wins) moved[m.id] = wins;      // the computer's wins don't follow anyone
      }
      write(`khel.${game}.tally`, moved);
    }

    const oldSeats = read(`khel.${game}.seats`, null);
    const names = read(`khel.${game}.names`, null);
    if (oldSeats && names) {
      const seats = {};
      for (const colour of ['red', 'green', 'yellow', 'blue']) {
        if (oldSeats[colour] === 'human') seats[colour] = seen.get((names[colour] || '').trim())?.id || 'off';
        else seats[colour] = oldSeats[colour] || 'off';
      }
      write(`khel.${game}.seats`, seats);
    }
  }

  // The old name-per-colour lists have done their job. Leaving them behind
  // would mean migrating a second time, from stale names, if the family
  // were ever cleared and rebuilt.
  for (const game of OLD) drop(`khel.${game}.names`);

  return true;
}

/* ── the list ─────────────────────────────────────────────── */
export function load() {
  const stored = read(KEY, null);
  if (stored?.members?.length) {
    members = stored.members;
    if (giveFaces()) save();          // people who joined before faces existed
    return members;
  }

  if (!migrate()) {
    members = SEED.map((name, i) => ({
      id: newId(), name, tint: TINTS[i % TINTS.length], face: FACES[i % FACES.length],
    }));
  }
  giveFaces();
  save();
  return members;
}

/** Hands a creature to anyone who hasn't got one. True if anything changed. */
function giveFaces() {
  let changed = false;
  for (const m of members) {
    if (m.face) continue;
    const taken = new Set(members.map((x) => x.face).filter(Boolean));
    m.face = FACES.find((f) => !taken.has(f)) || FACES[0];
    changed = true;
  }
  return changed;
}

export const all = () => members;
export const byId = (id) => members.find((m) => m.id === id) || null;
export const nameOf = (id) => byId(id)?.name || 'Someone';
export const tintOf = (id) => byId(id)?.tint || TINTS[0];

export function add(name = '') {
  if (members.length >= MAX_MEMBERS) return null;
  const used = new Set(members.map((m) => m.tint));
  const taken = new Set(members.map((m) => m.face));
  const member = {
    id: newId(),
    name: name.trim() || 'Someone',
    tint: TINTS.find((t) => !used.has(t)) || TINTS[members.length % TINTS.length],
    face: FACES.find((f) => !taken.has(f)) || FACES[members.length % FACES.length],
  };
  members.push(member);
  save();
  return member;
}

export function rename(id, name) {
  const m = byId(id);
  if (!m) return;
  m.name = name;                    // kept exactly as typed; trimmed only when shown
  save();
}

export function recolour(id, tint) {
  const m = byId(id);
  if (!m) return;
  m.tint = tint;
  save();
}

/* Two people sharing a creature would undo the whole point of having one,
   so this is a swap rather than an assignment: whoever had it takes the
   one being given up. The picker greys out taken creatures anyway — this
   is the guarantee underneath it, true whatever the caller does. */
export function reface(id, face) {
  const m = byId(id);
  if (!m || m.face === face) return;
  const holder = members.find((x) => x.face === face && x.id !== id);
  if (holder) holder.face = m.face;
  m.face = face;
  save();
}

/** Removing someone takes their scores with them, everywhere. */
export function remove(id) {
  members = members.filter((m) => m.id !== id);
  for (const game of SCORED()) {
    const tally = read(`khel.${game}.tally`, {});
    if (tally[id] !== undefined) { delete tally[id]; write(`khel.${game}.tally`, tally); }

    const seats = read(`khel.${game}.seats`, null);
    if (seats) {
      let touched = false;
      for (const colour of Object.keys(seats)) {
        if (seats[colour] === id) { seats[colour] = 'off'; touched = true; }
      }
      if (touched) write(`khel.${game}.seats`, seats);
    }
  }
  save();
}

/** Wins across every game, best first — the house scoreboard. */
export function standings() {
  const totals = new Map(members.map((m) => [m.id, 0]));
  for (const game of SCORED()) {
    for (const [id, wins] of Object.entries(read(`khel.${game}.tally`, {}))) {
      if (totals.has(id)) totals.set(id, totals.get(id) + wins);
    }
  }
  return members
    .map((m) => ({ ...m, wins: totals.get(m.id) || 0 }))
    .sort((a, b) => b.wins - a.wins);
}

export function onChange(fn) {
  listeners.push(fn);
  return () => { listeners = listeners.filter((f) => f !== fn); };
}

/* Only the tests use this: a game that forgets to let go of its listener
   leaks silently — the leftover screens still redraw, off-screen, forever —
   so the count is asserted rather than hoped for. */
export const listenerCount = () => listeners.length;

/** The display name, never blank. */
export const label = (id) => (byId(id)?.name || '').trim() || 'Someone';

export const faceOf = (id) => byId(id)?.face || FACES[0];

/** Face and name together — what a game shows on a turn card. */
export const badge = (id) => `${faceOf(id)} ${label(id)}`;
