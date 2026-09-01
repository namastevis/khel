/* ═══════════════════════════════════════════════════════════════
   catalog.js — what's on the shelf.

   `note` is deliberately absent from both games: a line that says the
   same thing on every card isn't telling anyone which game to pick.
   Give a game a note only when it differs from the house rule of two
   to four people round one device — a solo puzzle, say.

   Adding a game is: drop a folder in games/<id>/ that exports
   `mount(host)`, add a row here, and add its files to sw.js.
   Nothing else in the shell needs to change.
   ═══════════════════════════════════════════════════════════════ */

export const GAMES = [
  {
    id: 'ludo',
    title: 'Ludo',
    blurb: 'Race your four pieces home',
    accent: 'var(--red)',
    art: ludoArt,
  },
  {
    id: 'snakes',
    title: 'Snakes & Ladders',
    blurb: 'Climb the ladders, dodge the snakes',
    accent: 'var(--green)',
    art: snakesArt,
  },
  {
    id: 'memory',
    title: 'Memory',
    blurb: 'Turn two cards, find the pair',
    accent: '#9B6BD6',
    art: memoryArt,
  },
];

/* Little board, drawn rather than loaded — no image files to fetch. */
function ludoArt() {
  return `<svg viewBox="0 0 100 100" aria-hidden="true">
    <rect x="2" y="2" width="96" height="96" rx="18" fill="#FFFDF6" stroke="#E3D8C4" stroke-width="3"/>
    <rect x="9"  y="9"  width="33" height="33" rx="9" fill="var(--red)"/>
    <rect x="58" y="9"  width="33" height="33" rx="9" fill="var(--green)"/>
    <rect x="9"  y="58" width="33" height="33" rx="9" fill="var(--blue)"/>
    <rect x="58" y="58" width="33" height="33" rx="9" fill="var(--yellow)"/>
    <rect x="16" y="16" width="19" height="19" rx="5" fill="#FFFDF6"/>
    <rect x="65" y="16" width="19" height="19" rx="5" fill="#FFFDF6"/>
    <rect x="16" y="65" width="19" height="19" rx="5" fill="#FFFDF6"/>
    <rect x="65" y="65" width="19" height="19" rx="5" fill="#FFFDF6"/>
    <rect x="46" y="9"  width="8" height="33" rx="3" fill="var(--green)"/>
    <rect x="46" y="58" width="8" height="33" rx="3" fill="var(--blue)"/>
    <rect x="9"  y="46" width="33" height="8" rx="3" fill="var(--red)"/>
    <rect x="58" y="46" width="33" height="8" rx="3" fill="var(--yellow)"/>
    <circle cx="50" cy="50" r="9" fill="#FFFDF6" stroke="#E3D8C4" stroke-width="2"/>
  </svg>`;
}

function snakesArt() {
  return `<svg viewBox="0 0 100 100" aria-hidden="true">
    <rect x="2" y="2" width="96" height="96" rx="18" fill="#FFFDF6" stroke="#E3D8C4" stroke-width="3"/>
    <g stroke="#F1E6D2" stroke-width="2">
      <path d="M2 26h96M2 50h96M2 74h96M26 2v96M50 2v96M74 2v96"/>
    </g>
    <g stroke="#C98B45" stroke-width="4" stroke-linecap="round">
      <path d="M22 82 L38 20"/><path d="M34 86 L50 24"/>
    </g>
    <g stroke="#C98B45" stroke-width="3" stroke-linecap="round">
      <path d="M26 74 L42 78"/><path d="M30 58 L46 62"/><path d="M34 42 L50 46"/><path d="M38 26 L54 30"/>
    </g>
    <path d="M74 18 C58 34 90 46 72 62 C58 74 76 80 74 88"
          fill="none" stroke="#4FAE7C" stroke-width="9" stroke-linecap="round"/>
    <circle cx="74" cy="18" r="8" fill="#4FAE7C"/>
    <circle cx="71" cy="16" r="2.2" fill="#FFFDF6"/>
    <circle cx="77" cy="16" r="2.2" fill="#FFFDF6"/>
  </svg>`;
}

/* Three cards, one turned over — the game in one picture. */
function memoryArt() {
  return `<svg viewBox="0 0 100 100" aria-hidden="true">
    <g transform="rotate(-8 30 56)">
      <rect x="8" y="30" width="34" height="46" rx="8" fill="#9B6BD6"/>
      <circle cx="25" cy="53" r="8" fill="none" stroke="#FFFDF6" stroke-width="3" stroke-dasharray="4 4"/>
    </g>
    <g transform="rotate(7 70 54)">
      <rect x="53" y="26" width="34" height="46" rx="8" fill="#9B6BD6"/>
      <circle cx="70" cy="49" r="8" fill="none" stroke="#FFFDF6" stroke-width="3" stroke-dasharray="4 4"/>
    </g>
    <g transform="rotate(-2 50 62)">
      <rect x="33" y="40" width="36" height="48" rx="8" fill="#FFFDF6" stroke="#E3D8C4" stroke-width="3"/>
      <circle cx="47" cy="66" r="10" fill="#F0544F"/>
      <circle cx="57" cy="66" r="10" fill="#F0544F"/>
      <rect x="49" y="48" width="4" height="10" rx="2" fill="#8B5E2A"/>
      <path d="M53 52c5-6 12-6 12-6s0 7-6 8c-4 1-6-1-6-2z" fill="#3FBF6F"/>
    </g>
  </svg>`;
}
