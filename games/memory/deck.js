/* ═══════════════════════════════════════════════════════════════
   deck.js — the pictures.

   Twenty-four of them, in six colour families of four. That grouping
   is not decoration: it is the difficulty ladder. A round takes its
   pictures round-robin across the families, so a three-pair round is
   six cards in three different colours — matching colours, the
   easiest thing there is — while a twelve-pair round has two of every
   colour on the table, and colour stops telling you anything. The
   board doesn't just get bigger, it gets harder in kind.

   Two rules held the set together, and both matter more than they look:

   1. One nameable thing per card. The way a small player holds
      positions in their head is verbal — "elephant, top corner" — so a
      card has to be a noun they already own. A pattern has no name and
      nothing to rehearse.

   2. Nothing in a family is confusable with anything else in it. An
      apple and a tomato are both round and red; two of those in one
      round is a card you lose to a glance rather than to memory.
      That is why there is no tomato here, and no moon beside the
      banana.

   Adding a picture later is one entry. Keep four to a family, or
   `buildRound` stops spreading evenly.

   Everything is drawn, not loaded: no image files to fetch, and it
   stays crisp on any screen.
   ═══════════════════════════════════════════════════════════════ */

export const FAMILIES = ['red', 'orange', 'yellow', 'green', 'blue', 'pink'];

const INK = '#43331F';
const WOOD = '#8B5E2A';
const PAPER = '#FFFDF8';

export const DECK = [
  /* ── red ────────────────────────────────────────────────── */
  {
    id: 'apple', name: 'Apple', family: 'red',
    art: `<circle cx="37" cy="60" r="25" fill="#F0544F"/>
      <circle cx="63" cy="60" r="25" fill="#F0544F"/>
      <rect x="47" y="20" width="6" height="20" rx="3" fill="${WOOD}"/>
      <path d="M54 28c8-12 22-12 22-12s1 13-10 16c-7 2-12-1-12-4z" fill="#3FBF6F"/>`,
  },
  {
    id: 'ladybird', name: 'Ladybird', family: 'red',
    art: `<path d="M42 18l-5-9M58 18l5-9" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>
      <ellipse cx="50" cy="60" rx="33" ry="27" fill="#F0544F"/>
      <path d="M50 34v53" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>
      <circle cx="50" cy="30" r="14" fill="${INK}"/>
      <circle cx="34" cy="52" r="6.5" fill="${INK}"/><circle cx="66" cy="52" r="6.5" fill="${INK}"/>
      <circle cx="37" cy="71" r="5" fill="${INK}"/><circle cx="63" cy="71" r="5" fill="${INK}"/>`,
  },
  {
    id: 'kite', name: 'Kite', family: 'red',
    art: `<path d="M50 6 78 40 50 76 22 40z" fill="#F0544F"/>
      <path d="M50 6v70M22 40h56" stroke="${PAPER}" stroke-width="3"/>
      <path d="M50 76q10 6 0 11t0 11" stroke="#C43C38" stroke-width="3" fill="none" stroke-linecap="round"/>`,
  },
  {
    id: 'bus', name: 'Bus', family: 'red',
    art: `<rect x="10" y="26" width="80" height="46" rx="11" fill="#F0544F"/>
      <rect x="18" y="34" width="22" height="16" rx="4" fill="#CDE9FF"/>
      <rect x="46" y="34" width="22" height="16" rx="4" fill="#CDE9FF"/>
      <rect x="74" y="34" width="9" height="16" rx="4" fill="#CDE9FF"/>
      <rect x="10" y="57" width="80" height="6" fill="#C43C38"/>
      <circle cx="30" cy="76" r="9" fill="${INK}"/><circle cx="70" cy="76" r="9" fill="${INK}"/>`,
  },

  /* ── orange ─────────────────────────────────────────────── */
  {
    id: 'mango', name: 'Mango', family: 'orange',
    // The green shoulder is what stops this reading as a peach — it is how
    // you actually tell a mango at a glance.
    art: `<ellipse cx="46" cy="50" rx="26" ry="31" fill="#3FBF6F" transform="rotate(-16 46 50)"/>
      <ellipse cx="53" cy="62" rx="26" ry="31" fill="#F5893C" transform="rotate(-16 53 62)"/>
      <rect x="49" y="12" width="5" height="14" rx="2.5" fill="${WOOD}" transform="rotate(14 51 19)"/>
      <path d="M54 18c9-8 19-6 19-6s-3 12-12 12c-4 0-7-3-7-6z" fill="#2C9954"/>`,
  },
  {
    id: 'carrot', name: 'Carrot', family: 'orange',
    art: `<path d="M50 92 31 40h38z" fill="#F5893C"/>
      <path d="M38 54h24M35 66h20" stroke="#D46A1E" stroke-width="3" stroke-linecap="round"/>
      <path d="M50 42V20M50 30c-7-9-18-10-18-10s3 13 13 15M50 30c7-9 18-10 18-10s-3 13-13 15"
        stroke="#3FBF6F" stroke-width="5" fill="none" stroke-linecap="round"/>`,
  },
  {
    id: 'cat', name: 'Cat', family: 'orange',
    art: `<path d="M24 42 27 15l21 13zM76 42 73 15 52 28z" fill="#F5893C"/>
      <circle cx="50" cy="56" r="31" fill="#F5893C"/>
      <circle cx="38" cy="50" r="5" fill="${INK}"/><circle cx="62" cy="50" r="5" fill="${INK}"/>
      <path d="M50 61l-6 5 6 5 6-5z" fill="#C24C82"/>
      <path d="M15 58h17M15 68h17M85 58H68M85 68H68" stroke="${INK}" stroke-width="2.5" stroke-linecap="round"/>`,
  },
  {
    id: 'sun', name: 'Sun', family: 'orange',
    art: `<g stroke="#F5893C" stroke-width="7" stroke-linecap="round">
        <path d="M50 6v13M50 81v13M6 50h13M81 50h13M19 19l9 9M72 72l9 9M81 19l-9 9M28 72l-9 9"/>
      </g>
      <circle cx="50" cy="50" r="25" fill="#F5893C"/>`,
  },

  /* ── yellow ─────────────────────────────────────────────── */
  {
    id: 'banana', name: 'Banana', family: 'yellow',
    art: `<path d="M26 22c-5 35 19 57 53 55" stroke="#FFC531" stroke-width="19" fill="none" stroke-linecap="round"/>
      <path d="M31 26c-4 31 17 50 47 48" stroke="#FFDA7A" stroke-width="4" fill="none" stroke-linecap="round"/>
      <circle cx="26" cy="22" r="5" fill="${WOOD}"/><circle cx="79" cy="77" r="5" fill="${WOOD}"/>`,
  },
  {
    id: 'duck', name: 'Duck', family: 'yellow',
    art: `<ellipse cx="55" cy="64" rx="30" ry="20" fill="#FFC531"/>
      <path d="M58 58c11-6 21-1 23 8-9 8-19 5-23-8z" fill="#D99E17"/>
      <circle cx="32" cy="40" r="16" fill="#FFC531"/>
      <path d="M17 38 3 43l14 6z" fill="#F5893C"/>
      <circle cx="30" cy="36" r="3.5" fill="${INK}"/>`,
  },
  {
    id: 'star', name: 'Star', family: 'yellow',
    art: `<path d="M50 8l12 26 28 3-21 19 6 28-25-14-25 14 6-28-21-19 28-3z" fill="#FFC531"/>`,
  },
  {
    id: 'bee', name: 'Bee', family: 'yellow',
    art: `<ellipse cx="46" cy="30" rx="14" ry="9" fill="${PAPER}" transform="rotate(-18 46 30)"/>
      <ellipse cx="66" cy="33" rx="12" ry="8" fill="${PAPER}" transform="rotate(12 66 33)"/>
      <ellipse cx="52" cy="58" rx="26" ry="21" fill="#FFC531"/>
      <path d="M44 41v34M56 40v36M68 47v22" stroke="${INK}" stroke-width="6" stroke-linecap="round"/>
      <circle cx="24" cy="52" r="13" fill="${INK}"/>
      <path d="M18 41l-5-9M29 39l2-10" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`,
  },

  /* ── green ──────────────────────────────────────────────── */
  {
    id: 'parrot', name: 'Parrot', family: 'green',
    art: `<path d="M60 74q16 10 22 24-16-3-26-14z" fill="#2C9954"/>
      <ellipse cx="52" cy="56" rx="22" ry="27" fill="#3FBF6F"/>
      <circle cx="52" cy="30" r="17" fill="#3FBF6F"/>
      <path d="M39 20 19 30c-3 1-3 5 0 6l13 8 6-10z" fill="#F0544F"/>
      <circle cx="51" cy="26" r="3.5" fill="${INK}"/>`,
  },
  {
    id: 'frog', name: 'Frog', family: 'green',
    art: `<path d="M18 76c-7 6-7 11-3 14M82 76c7 6 7 11 3 14" stroke="#2C9954" stroke-width="5" fill="none" stroke-linecap="round"/>
      <ellipse cx="50" cy="62" rx="32" ry="24" fill="#3FBF6F"/>
      <circle cx="33" cy="34" r="13" fill="#3FBF6F"/><circle cx="67" cy="34" r="13" fill="#3FBF6F"/>
      <circle cx="33" cy="34" r="7" fill="${PAPER}"/><circle cx="67" cy="34" r="7" fill="${PAPER}"/>
      <circle cx="33" cy="35" r="4" fill="${INK}"/><circle cx="67" cy="35" r="4" fill="${INK}"/>
      <path d="M36 66q14 12 28 0" stroke="#2C9954" stroke-width="4" fill="none" stroke-linecap="round"/>`,
  },
  {
    id: 'tree', name: 'Tree', family: 'green',
    art: `<rect x="44" y="56" width="12" height="36" rx="4" fill="${WOOD}"/>
      <circle cx="50" cy="38" r="24" fill="#3FBF6F"/>
      <circle cx="30" cy="52" r="16" fill="#3FBF6F"/>
      <circle cx="70" cy="52" r="16" fill="#3FBF6F"/>`,
  },
  {
    id: 'watermelon', name: 'Watermelon', family: 'green',
    art: `<path d="M10 30A40 40 0 0 0 90 30Z" fill="#3FBF6F"/>
      <path d="M17 33A33 33 0 0 0 83 33Z" fill="${PAPER}"/>
      <path d="M22 37A28 28 0 0 0 78 37Z" fill="#F0544F"/>
      <g fill="${INK}"><circle cx="39" cy="49" r="3.2"/><circle cx="60" cy="47" r="3.2"/><circle cx="50" cy="60" r="3.2"/></g>`,
  },

  /* ── blue ───────────────────────────────────────────────── */
  {
    // Drawn as a whale first, and it kept reading as a fish — so it is a
    // fish. The spoken name has to match what she actually sees.
    id: 'fish', name: 'Fish', family: 'blue',
    art: `<path d="M74 56q11-13 21-15-6 16 0 32-10-3-21-16z" fill="#2E76B8"/>
      <ellipse cx="46" cy="56" rx="34" ry="22" fill="#4A9BE8"/>
      <path d="M40 34q8-14 18-12-3 8-2 16z" fill="#2E76B8"/>
      <path d="M42 78q8 12 18 10-4-8-3-16z" fill="#2E76B8"/>
      <path d="M20 62q15 9 30 1" stroke="${PAPER}" stroke-width="4" fill="none" stroke-linecap="round"/>
      <circle cx="24" cy="49" r="4" fill="${INK}"/>`,
  },
  {
    id: 'boat', name: 'Boat', family: 'blue',
    art: `<rect x="47" y="14" width="5" height="48" rx="2.5" fill="${WOOD}"/>
      <path d="M53 19l23 34H53z" fill="#8FC7F5"/>
      <path d="M46 23 25 53h21z" fill="${PAPER}"/>
      <path d="M12 60h76l-11 24H23z" fill="#4A9BE8"/>`,
  },
  {
    id: 'peacock', name: 'Peacock', family: 'blue',
    art: `<g fill="#2E76B8">
        <ellipse cx="50" cy="24" rx="9" ry="16"/>
        <ellipse cx="26" cy="34" rx="9" ry="16" transform="rotate(-35 26 34)"/>
        <ellipse cx="74" cy="34" rx="9" ry="16" transform="rotate(35 74 34)"/>
        <ellipse cx="13" cy="55" rx="8" ry="14" transform="rotate(-68 13 55)"/>
        <ellipse cx="87" cy="55" rx="8" ry="14" transform="rotate(68 87 55)"/>
      </g>
      <g fill="#3FBF6F">
        <circle cx="50" cy="21" r="4"/><circle cx="26" cy="30" r="4"/><circle cx="74" cy="30" r="4"/>
        <circle cx="15" cy="51" r="3.5"/><circle cx="85" cy="51" r="3.5"/>
      </g>
      <ellipse cx="50" cy="72" rx="15" ry="19" fill="#4A9BE8"/>
      <path d="M50 42v10" stroke="#4A9BE8" stroke-width="3"/>
      <circle cx="50" cy="56" r="10" fill="#4A9BE8"/>
      <circle cx="46" cy="54" r="2.6" fill="${INK}"/>
      <path d="M40 58 31 61l9 3z" fill="#F5893C"/>`,
  },
  {
    id: 'umbrella', name: 'Umbrella', family: 'blue',
    art: `<path d="M50 58V84q0 9-11 9t-11-9" stroke="${WOOD}" stroke-width="5" fill="none" stroke-linecap="round"/>
      <path d="M10 58A40 40 0 0 1 90 58Z" fill="#4A9BE8"/>
      <path d="M10 58q10 9 20 0 10 9 20 0 10 9 20 0 10 9 20 0" fill="#4A9BE8"/>
      <path d="M50 58V17" stroke="${PAPER}" stroke-width="3"/>
      <path d="M30 58q9-27 20-41M70 58q-9-27-20-41" stroke="${PAPER}" stroke-width="2.5" fill="none"/>`,
  },

  /* ── pink ───────────────────────────────────────────────── */
  {
    id: 'grapes', name: 'Grapes', family: 'pink',
    art: `<rect x="47" y="14" width="5" height="19" rx="2.5" fill="${WOOD}"/>
      <path d="M52 23c9-8 20-6 20-6s-2 12-12 12c-5 0-8-3-8-6z" fill="#3FBF6F"/>
      <g fill="#9B6BD6">
        <circle cx="50" cy="42" r="11"/><circle cx="33" cy="52" r="11"/><circle cx="67" cy="52" r="11"/>
        <circle cx="50" cy="57" r="11"/>
        <circle cx="38" cy="69" r="11"/><circle cx="62" cy="69" r="11"/><circle cx="50" cy="72" r="11"/>
        <circle cx="50" cy="83" r="10"/>
      </g>`,
  },
  {
    id: 'butterfly', name: 'Butterfly', family: 'pink',
    art: `<ellipse cx="33" cy="38" rx="18" ry="16" fill="#E86FA6" transform="rotate(-20 33 38)"/>
      <ellipse cx="67" cy="38" rx="18" ry="16" fill="#E86FA6" transform="rotate(20 67 38)"/>
      <ellipse cx="36" cy="67" rx="14" ry="13" fill="#F5A8C8" transform="rotate(20 36 67)"/>
      <ellipse cx="64" cy="67" rx="14" ry="13" fill="#F5A8C8" transform="rotate(-20 64 67)"/>
      <rect x="47.5" y="31" width="5" height="44" rx="2.5" fill="${INK}"/>
      <path d="M48 32 41 20M52 32l7-12" stroke="${INK}" stroke-width="2.5" stroke-linecap="round"/>`,
  },
  {
    id: 'flower', name: 'Flower', family: 'pink',
    art: `<g fill="#E86FA6">
        <ellipse cx="50" cy="24" rx="10" ry="16"/><ellipse cx="50" cy="70" rx="10" ry="16"/>
        <ellipse cx="27" cy="47" rx="16" ry="10"/><ellipse cx="73" cy="47" rx="16" ry="10"/>
        <ellipse cx="33" cy="30" rx="10" ry="15" transform="rotate(-45 33 30)"/>
        <ellipse cx="67" cy="30" rx="10" ry="15" transform="rotate(45 67 30)"/>
        <ellipse cx="33" cy="64" rx="10" ry="15" transform="rotate(45 33 64)"/>
        <ellipse cx="67" cy="64" rx="10" ry="15" transform="rotate(-45 67 64)"/>
      </g>
      <circle cx="50" cy="47" r="12" fill="#FFC531"/>`,
  },
  {
    id: 'pig', name: 'Pig', family: 'pink',
    art: `<path d="M25 32 27 13l18 9zM75 32 73 13 55 22z" fill="#E86FA6"/>
      <circle cx="50" cy="55" r="30" fill="#E86FA6"/>
      <ellipse cx="50" cy="64" rx="15" ry="12" fill="#F5A8C8"/>
      <circle cx="45" cy="64" r="3.5" fill="#C24C82"/><circle cx="55" cy="64" r="3.5" fill="#C24C82"/>
      <circle cx="38" cy="45" r="4" fill="${INK}"/><circle cx="62" cy="45" r="4" fill="${INK}"/>`,
  },
];

export const byId = (id) => DECK.find((p) => p.id === id) || null;

/** The picture, as an <svg> that fills whatever box it's put in. */
export const pictureSVG = (id) => {
  const p = byId(id);
  return p ? `<svg viewBox="0 0 100 100" aria-hidden="true">${p.art}</svg>` : '';
};
