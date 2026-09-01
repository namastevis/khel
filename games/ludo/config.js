/* ═══════════════════════════════════════════════════════════════
   config.js — board geometry, colours, constants.

   The board is a 15 × 15 grid. Coordinates are [col, row] with
   [0,0] at the top-left corner.

     · Home yards : red TL, green TR, yellow BR, blue BL
     · Main track : 52 cells, travelled clockwise
     · Home column: 5 coloured cells per player
     · Centre     : the 3 × 3 block at cols 6-8, rows 6-8

   A token's position is stored as a "relative" number:
       -1        → still in its yard
        0 … 50   → main track (0 = own start square)
        51 … 55  → own home column
        56       → home (the centre)
   ═══════════════════════════════════════════════════════════════ */

export const GRID = 15;

export const ORDER = ['red', 'green', 'yellow', 'blue'];

export const COLORS = {
  red:    { main: '#F0544F', dark: '#C43C38', light: '#FFD9D7', name: 'Red' },
  green:  { main: '#3FBF6F', dark: '#2C9954', light: '#CFEFDC', name: 'Green' },
  yellow: { main: '#FFC531', dark: '#D99E17', light: '#FFEEC2', name: 'Yellow' },
  blue:   { main: '#4A9BE8', dark: '#2E76B8', light: '#D3E8FB', name: 'Blue' },
};

/* Friendly names shown to a child instead of "Player 2" */
export const CPU_NAMES = {
  red: 'Robo Red', green: 'Go-Go Green', yellow: 'Sunny Yellow', blue: 'Bubbly Blue',
};

/* ── the 52-cell loop, clockwise, starting at Red's start square ── */
export const TRACK = [
  // red quadrant (indices 0-12)
  [1, 6], [2, 6], [3, 6], [4, 6], [5, 6],
  [6, 5], [6, 4], [6, 3], [6, 2], [6, 1], [6, 0],
  [7, 0], [8, 0],
  // green quadrant (13-25)
  [8, 1], [8, 2], [8, 3], [8, 4], [8, 5],
  [9, 6], [10, 6], [11, 6], [12, 6], [13, 6], [14, 6],
  [14, 7], [14, 8],
  // yellow quadrant (26-38)
  [13, 8], [12, 8], [11, 8], [10, 8], [9, 8],
  [8, 9], [8, 10], [8, 11], [8, 12], [8, 13], [8, 14],
  [7, 14], [6, 14],
  // blue quadrant (39-51)
  [6, 13], [6, 12], [6, 11], [6, 10], [6, 9],
  [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8],
  [0, 7], [0, 6],
];

export const START_INDEX = { red: 0, green: 13, yellow: 26, blue: 39 };

/* Start squares + the four "star" squares — no captures here. */
export const SAFE_INDICES = new Set([0, 8, 13, 21, 26, 34, 39, 47]);
export const STAR_INDICES = [8, 21, 34, 47];

/* Five coloured cells leading into the centre. */
export const HOME_COLUMN = {
  red:    [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]],
  green:  [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]],
  yellow: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]],
  blue:   [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]],
};

/* Top-left corner of each 6 × 6 yard. */
export const YARD_ORIGIN = {
  red: [0, 0], green: [9, 0], yellow: [9, 9], blue: [0, 9],
};

/* Where a token sits once it has reached the centre. */
const NEST = { red: [6.80, 7.5], green: [7.5, 6.80], yellow: [8.20, 7.5], blue: [7.5, 8.20] };

export const HOME_REL = 56;   // exact number needed to finish
export const TRACK_END = 50;  // last main-track step before the home column

/* ── position helpers ─────────────────────────────────────────── */

/** Absolute track index (0-51) for a player's relative step, or -1. */
export function absIndex(color, rel) {
  if (rel < 0 || rel > TRACK_END) return -1;
  return (START_INDEX[color] + rel) % TRACK.length;
}

/** Grid position [col, row] as floats (cell centres) for a token. */
export function cellOf(color, rel, slot = 0) {
  if (rel === HOME_REL) {
    const [nx, ny] = NEST[color];
    return [nx + (slot % 2) * 0.28 - 0.14, ny + Math.floor(slot / 2) * 0.28 - 0.14];
  }
  if (rel >= 51) {
    const [c, r] = HOME_COLUMN[color][rel - 51];
    return [c + 0.5, r + 0.5];
  }
  if (rel >= 0) {
    const [c, r] = TRACK[absIndex(color, rel)];
    return [c + 0.5, r + 0.5];
  }
  // in the yard
  const [ox, oy] = YARD_ORIGIN[color];
  const dx = slot % 2 === 0 ? 1.75 : 4.25;
  const dy = slot < 2 ? 1.75 : 4.25;
  return [ox + dx, oy + dy];
}

export function isSafeRel(color, rel) {
  if (rel < 0 || rel > TRACK_END) return true;         // yard / home column
  return SAFE_INDICES.has(absIndex(color, rel));
}
