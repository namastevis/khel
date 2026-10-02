/* ═══════════════════════════════════════════════════════════════
   chits.js — what is drawn on each chit.

   One picture per role, because the youngest player can't read the
   word: a crown, a turban and scroll, a lathi and cap, a masked face
   with a bundle. Ink and dye colours, to sit on the paper chit.
   ═══════════════════════════════════════════════════════════════ */

const INK = '#2B2118';

export const CHIT_ART = {
  raja: `
    <path d="M18 70 14 30l20 18 16-26 16 26 20-18-4 40z" fill="#D9A21B" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    <rect x="17" y="68" width="66" height="12" rx="2" fill="#B8862A" stroke="${INK}" stroke-width="3"/>
    <circle cx="50" cy="22" r="5" fill="#A8322A" stroke="${INK}" stroke-width="2.5"/>
    <circle cx="14" cy="28" r="4" fill="#A8322A" stroke="${INK}" stroke-width="2"/>
    <circle cx="86" cy="28" r="4" fill="#A8322A" stroke="${INK}" stroke-width="2"/>
    <circle cx="50" cy="74" r="4" fill="#26386A"/><circle cx="32" cy="74" r="3" fill="#4D7A38"/><circle cx="68" cy="74" r="3" fill="#4D7A38"/>`,

  mantri: `
    <path d="M22 44c0-16 12-26 28-26s28 10 28 26c-6-4-14-6-28-6s-22 2-28 6z" fill="#F3E2C0" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M26 40c8-6 40-6 48 0M30 31c8-5 32-5 40 0" fill="none" stroke="#A8322A" stroke-width="2.5"/>
    <circle cx="72" cy="30" r="4" fill="#D9A21B" stroke="${INK}" stroke-width="2"/>
    <rect x="30" y="52" width="40" height="30" rx="3" fill="#F8F1E1" stroke="${INK}" stroke-width="3"/>
    <rect x="25" y="49" width="8" height="36" rx="4" fill="#C9A35E" stroke="${INK}" stroke-width="2.5"/>
    <rect x="67" y="49" width="8" height="36" rx="4" fill="#C9A35E" stroke="${INK}" stroke-width="2.5"/>
    <path d="M38 60h24M38 67h24M38 74h16" stroke="#26386A" stroke-width="2.5" stroke-linecap="round"/>`,

  sipahi: `
    <path d="M26 46c0-14 11-24 24-24s24 10 24 24z" fill="#26386A" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    <rect x="22" y="44" width="56" height="9" rx="3" fill="#18244A" stroke="${INK}" stroke-width="2.5"/>
    <path d="M50 22v-8" stroke="#A8322A" stroke-width="5" stroke-linecap="round"/>
    <circle cx="50" cy="34" r="5" fill="#D9A21B" stroke="${INK}" stroke-width="2"/>
    <path d="M16 90 84 58" stroke="#8A5A2B" stroke-width="7" stroke-linecap="round"/>
    <path d="M16 90 84 58" stroke="${INK}" stroke-width="1.5" stroke-dasharray="1 9" stroke-linecap="round"/>
    <path d="M74 62l10-4" stroke="#D9A21B" stroke-width="8" stroke-linecap="round"/>`,

  chor: `
    <path d="M58 52c10-6 26-2 28 12 2 12-8 22-20 22H56z" fill="#C9A35E" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M64 50l4-8 6 8" fill="#C9A35E" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    <circle cx="40" cy="50" r="24" fill="#E8C9A0" stroke="${INK}" stroke-width="3"/>
    <path d="M14 44c10-6 42-6 52 0v10c-10-4-42-4-52 0z" fill="${INK}"/>
    <circle cx="30" cy="48" r="3.5" fill="#F8F1E1"/><circle cx="50" cy="48" r="3.5" fill="#F8F1E1"/>
    <path d="M32 62q8 5 16 0" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>
    <path d="M16 30c8-10 40-12 48 0" fill="none" stroke="#A8322A" stroke-width="6" stroke-linecap="round"/>`,
};

export const chitSVG = (role) =>
  `<svg viewBox="0 0 100 100" aria-hidden="true">${CHIT_ART[role] || ''}</svg>`;

/* A folded chit, unopened — the same for everyone, which is the point. */
export const FOLDED = `<svg viewBox="0 0 100 100" aria-hidden="true">
  <path d="M22 18h56l-6 64H28z" fill="#F8F1E1" stroke="#2B2118" stroke-width="3" stroke-linejoin="round"/>
  <path d="M22 18l28 22 28-22" fill="none" stroke="#2B2118" stroke-width="2.5" stroke-linejoin="round"/>
  <path d="M34 60h32M36 68h24" stroke="#C9B48E" stroke-width="3" stroke-linecap="round"/>
</svg>`;
