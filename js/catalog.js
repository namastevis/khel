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
