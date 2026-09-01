/* ═══════════════════════════════════════════════════════════════
   catalog.js — what's on the shelf.

   Adding a game is: drop a folder in games/<id>/ that exports
   `mount(host)`, add a row here, and add its files to sw.js.
   Nothing else in the shell needs to change.
   ═══════════════════════════════════════════════════════════════ */

export const GAMES = [
  {
    id: 'ludo',
    title: 'Ludo',
    blurb: 'Race your four pieces home',
    players: '2–4 round one tablet · or one vs the computer',
    accent: 'var(--red)',
    art: ludoArt,
  },
  {
    id: 'snakes',
    title: 'Snakes & Ladders',
    blurb: 'Climb the ladders, dodge the snakes',
    players: '2–4 round one tablet · or one vs the computer',
    accent: 'var(--green)',
    art: snakesArt,
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
