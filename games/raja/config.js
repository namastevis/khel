/* ═══════════════════════════════════════════════════════════════
   config.js — the four chits, the points, the table.

   The version played here: the Raja shows himself and calls for his
   Mantri; the Mantri shows himself and has to point at the Chor.
   Caught, and the Mantri keeps his 800. Wrong, and the Mantri and
   the Chor swap — the thief walks off with the minister's points.
   ═══════════════════════════════════════════════════════════════ */

export const ORDER = ['red', 'green', 'yellow', 'blue'];

export const COLORS = {
  red:    { main: '#F0544F', dark: '#C43C38', light: '#FFD9D7', name: 'Red' },
  green:  { main: '#3FBF6F', dark: '#2C9954', light: '#CFEFDC', name: 'Green' },
  yellow: { main: '#FFC531', dark: '#D99E17', light: '#FFEEC2', name: 'Yellow' },
  blue:   { main: '#4A9BE8', dark: '#2E76B8', light: '#D3E8FB', name: 'Blue' },
};

export const CPU_NAMES = {
  red: 'Red Panda', green: 'Green Frog', yellow: 'Yellow Duck', blue: 'Blue Whale',
};
export const CPU_FACES = { red: '🐼', green: '🐸', yellow: '🦆', blue: '🐳' };

/* The order chits are dealt in doesn't matter; the order they are
   revealed in does, and that lives in game.js. */
export const ROLES = ['raja', 'mantri', 'sipahi', 'chor'];

export const ROLE = {
  raja:   { name: 'Raja',   english: 'King',     points: 1000 },
  mantri: { name: 'Mantri', english: 'Minister', points: 800 },
  sipahi: { name: 'Sipahi', english: 'Soldier',  points: 500 },
  chor:   { name: 'Chor',   english: 'Thief',    points: 0 },
};

/* Five rounds is about ten minutes round a table: long enough for luck
   to even out a little, short enough to finish before dinner. */
export const ROUNDS = 5;

/* How long the computer takes over each thing, so a person can follow. */
export const PACE = { reveal: 1300, think: 1500, judge: 900 };
