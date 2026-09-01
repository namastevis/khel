/* ═══════════════════════════════════════════════════════════════
   family.js — who lives here.

   A person is a record with an id that never changes. The name is a
   label on that record, so correcting a spelling is an edit, not a
   new person — which is the whole reason this exists. Scores key on
   the id, in every game, so nothing is ever lost to a typo.

   Everything is kept on this device. Nothing is sent anywhere.
   ═══════════════════════════════════════════════════════════════ */

const KEY = 'khel.family';

/* Their own colour, which is theirs whatever piece they play today. */
export const TINTS = [
  '#F0544F', '#3FBF6F', '#FFC531', '#4A9BE8',
  '#9B6BD6', '#F08A3C', '#38B7B0', '#E86FA6',
];

const SEED = ['Chueen', 'Mama'];   // everyone else gets added when they turn up
export const MAX_MEMBERS = 8;

let members = [];
let listeners = [];

/* ── storage ──────────────────────────────────────────────── */
function read(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback; }
  catch { return fallback; }
}

function write(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode */ }
}

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
  const seen = new Map();          // name → member

  for (const game of ['ludo', 'snakes']) {
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

  for (const game of ['ludo', 'snakes']) {
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
  return true;
}

/* ── the list ─────────────────────────────────────────────── */
export function load() {
  const stored = read(KEY, null);
  if (stored?.members?.length) {
    members = stored.members;
    return members;
  }

  if (!migrate()) {
    members = SEED.map((name, i) => ({ id: newId(), name, tint: TINTS[i % TINTS.length] }));
  }
  save();
  return members;
}

export const all = () => members;
export const byId = (id) => members.find((m) => m.id === id) || null;
export const nameOf = (id) => byId(id)?.name || 'Someone';
export const tintOf = (id) => byId(id)?.tint || TINTS[0];

export function add(name = '') {
  if (members.length >= MAX_MEMBERS) return null;
  const used = new Set(members.map((m) => m.tint));
  const member = {
    id: newId(),
    name: name.trim() || 'Someone',
    tint: TINTS.find((t) => !used.has(t)) || TINTS[members.length % TINTS.length],
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

/** Removing someone takes their scores with them, everywhere. */
export function remove(id) {
  members = members.filter((m) => m.id !== id);
  for (const game of ['ludo', 'snakes']) {
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
  for (const game of ['ludo', 'snakes']) {
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

/** The display name, never blank. */
export const label = (id) => (byId(id)?.name || '').trim() || 'Someone';
