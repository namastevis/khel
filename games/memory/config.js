/* ═══════════════════════════════════════════════════════════════
   config.js — the table and the sizes.

   The pictures themselves live in deck.js.
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

/* ── how big a round is ────────────────────────────────────
   The pair count is only half the ladder. Because a round takes its
   pictures round-robin across the six colour families (see rules.js),
   three pairs means three different colours on the table and two of
   nothing — so colour alone finds every match. Twelve pairs has to
   come back round for a second picture from each family, so there are
   two of every colour and colour tells you nothing. Same game, and a
   different skill.

   `spread` is what that works out to per colour, and it's what the
   setup screen says out loud. */
export const SIZES = [
  { pairs: 3,  label: 'Tiny',  cards: 6,  grid: [3, 2], spread: 'every card a different colour' },
  { pairs: 6,  label: 'Small', cards: 12, grid: [4, 3], spread: 'one of each colour' },
  { pairs: 8,  label: 'Big',   cards: 16, grid: [4, 4], spread: 'a couple of colours doubled up' },
  { pairs: 12, label: 'Huge',  cards: 24, grid: [6, 4], spread: 'two of every colour' },
];

export const DEFAULT_SIZE = 1;          // Small — twelve cards

/** Portrait wants the tall version of the same grid. */
export function gridFor(size, landscape) {
  const [a, b] = SIZES[size].grid;
  return landscape ? { cols: a, rows: b } : { cols: b, rows: a };
}

/* How much the computer remembers: the last N distinct cards it has
   seen turned over. Three is about where a five-year-old is, which is
   the point — it should be a real opponent for her and an easy one for
   an adult, not the other way round. MERCY is the rest of it: two goes
   in five it knows exactly where a pair is and goes poking about
   somewhere else instead.

   Measured, not guessed. Against a player who remembers nothing at all
   these settings win 70% of the time; test/simulate-memory.mjs re-checks
   that every run and fails if the computer ever becomes unbeatable. */
export const CPU_SPAN = 3;
export const MERCY = 0.4;
