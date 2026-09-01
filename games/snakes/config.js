/* ═══════════════════════════════════════════════════════════════
   config.js — the board.

   Squares run 1…100 boustrophedon: 1 is bottom-left, 10 is
   bottom-right, 11 sits directly above 10, and so on up.

   Everyone starts on square 1. Reaching 100 — or rolling past it —
   wins, because needing the exact number to finish leaves a small
   player stranded on 97 for five turns, which is where a game like
   this loses them.
   ═══════════════════════════════════════════════════════════════ */

export const SIDE = 10;
export const FINAL = 100;
export const START = 1;

export const ORDER = ['red', 'green', 'yellow', 'blue'];

export const COLORS = {
  red:    { main: '#F0544F', dark: '#C43C38', light: '#FFD9D7', name: 'Red' },
  green:  { main: '#3FBF6F', dark: '#2C9954', light: '#CFEFDC', name: 'Green' },
  yellow: { main: '#FFC531', dark: '#D99E17', light: '#FFEEC2', name: 'Yellow' },
  blue:   { main: '#4A9BE8', dark: '#2E76B8', light: '#D3E8FB', name: 'Blue' },
};

/* The computer's players. An animal a four-year-old can name, in the
   colour of the piece it's playing — easier to root against than a robot. */
export const CPU_NAMES = {
  red: 'Red Panda', green: 'Green Frog', yellow: 'Yellow Duck', blue: 'Blue Whale',
};

export const CPU_FACES = { red: '🐼', green: '🐸', yellow: '🦆', blue: '🐳' };

/* The classic board, with two changes: the square-1 ladder starts at 2
   instead (everyone is standing on 1), and the vicious 98 → 78 snake is
   gone. Losing on square 98 is funny exactly once. */
export const LADDERS = {
  2: 38, 4: 14, 9: 31, 21: 42, 28: 84, 36: 44, 51: 67, 71: 91, 80: 100,
};

export const SNAKES = {
  16: 6, 47: 26, 49: 11, 56: 53, 62: 19, 64: 60, 87: 24, 90: 70, 93: 73, 95: 75,
};

/** square → where it takes you, or undefined */
export const JUMPS = { ...LADDERS, ...SNAKES };

export const isLadder = (n) => LADDERS[n] !== undefined;
export const isSnake = (n) => SNAKES[n] !== undefined;

/**
 * Grid position of a square, as [col, row] cell centres with [0,0]
 * at the top-left of the board.
 */
export function cellOf(n) {
  const clamped = Math.max(1, Math.min(FINAL, n));
  const bandFromBottom = Math.floor((clamped - 1) / SIDE);
  const alongBand = (clamped - 1) % SIDE;
  const col = bandFromBottom % 2 === 0 ? alongBand : SIDE - 1 - alongBand;
  const row = SIDE - 1 - bandFromBottom;
  return [col + 0.5, row + 0.5];
}
