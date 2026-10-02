/* ═══════════════════════════════════════════════════════════════
   catalog.js — what's on the shelf.

   `title` is the name everyone knows it by; `kicker`, above it, is the
   older Indian name it grew from. Same order for every game. A game
   with no older name simply has no kicker.
   `story` is what the "The story" link opens — written to be read
   aloud by whoever is holding the tablet. Keep it true; when a fact
   is only a tradition, say so ("is said to").

   `note` is deliberately absent from every game so far: a line that says
   the same thing on every card isn't telling anyone which game to pick.
   Give a game a note only when it differs from the house rule of two
   to four people round one device — a solo puzzle, say.

   Adding a game is: drop a folder in games/<id>/ that exports
   `mount(host)`, add a row here, and add its files to sw.js.
   Nothing else in the shell needs to change.
   ═══════════════════════════════════════════════════════════════ */

export const GAMES = [
  {
    id: 'ludo',
    kicker: 'Pachisi',
    title: 'Ludo',
    blurb: 'Race your four pieces home',
    accent: 'var(--madder)',
    art: ludoArt,
    story: {
      lines: [
        'Long before Ludo, India played <b>Pachisi</b> &mdash; on a cross-shaped cloth board, with cowrie shells instead of a dice. <i>Pachis</i> means twenty-five: the biggest throw the shells could give.',
        'Emperor Akbar is said to have played it on giant courtyard boards, with people dressed in the players&rsquo; colours as the pieces. Traces of those courts are still shown at Agra and Allahabad.',
        'In 1896 a simpler version, with a dice and a square board, was patented in England as <b>Ludo</b>. Now it has come home.',
      ],
      names: 'Pachisi &middot; its cousin Chaupar (Chausar) &middot; Parcheesi &middot; Parch&iacute;s',
      here: 'We kept Ludo&rsquo;s rules and gave the dice cowrie shells.',
      ask: 'Did anyone in the family play on a cloth board?',
    },
  },
  {
    id: 'snakes',
    kicker: 'Moksha Patam',
    title: 'Snakes & Ladders',
    blurb: 'Climb by kindness, slide by greed',
    accent: 'var(--leaf)',
    art: snakesArt,
    story: {
      lines: [
        'This is where Snakes &amp; Ladders began. In India it was <b>Moksha Patam</b>, a game about how we live: ladders were good deeds that lift you up, snakes the bad habits that pull you down.',
        'The old boards had more snakes than ladders &mdash; being good was meant to take some effort. When the game reached England in the 1890s, the board got friendlier.',
      ],
      names: 'Gyan Chaupar &middot; Parama Padam &middot; Vaikunthapali &middot; Saanp-Seedhi',
      here: 'Every ladder is a kindness and every snake a bad habit. Land on one and the game tells you which.',
      ask: 'Which good habit would you put at the bottom of a ladder?',
    },
  },
  {
    id: 'memory',
    title: 'Memory',
    blurb: 'Lattu, diya, jalebi &mdash; find the pair',
    accent: 'var(--indigo)',
    art: memoryArt,
    story: {
      lines: [
        'Memory isn&rsquo;t an old Indian game &mdash; card-matching is played all over the world.',
        'So we filled the deck with things from an Indian childhood: a lattu, a diya, a jalebi, a mango, a kite, a peacock and a lotus.',
      ],
      names: '',
      here: 'Turn two cards. If they match, they&rsquo;re yours.',
      ask: 'What did you play with, before there were screens?',
    },
  },
  {
    id: 'raja',
    title: 'Raja Mantri Chor Sipahi',
    blurb: 'Four secret chits — can the Mantri find the Chor?',
    accent: '#9A5B13',
    art: rajaArt,
    story: {
      lines: [
        'Four folded chits, four players, one secret each. Generations of Indians have played this on a floor, in a train, at a wedding &mdash; anywhere with a scrap of paper and a pencil.',
        'Nobody knows who first wrote <b>Raja</b>, <b>Mantri</b>, <b>Chor</b> and <b>Sipahi</b> on four chits. It was passed from hand to hand, not printed in a box, so every family plays it a little differently.',
      ],
      names: 'Chor Sipahi &middot; Raja Rani Chor Sipahi (with more chits)',
      here: 'The Mantri finds the Chor. Get it wrong and the Chor runs off with the Mantri&rsquo;s 800. Pass the tablet round to peek at your chit.',
      ask: 'Who caught the Chor most often when you were small?',
    },
  },
];

/* Each picture is the real object, drawn rather than loaded — no image
   files to fetch. They sit on the card's own material (cloth, paper,
   mat), so their backgrounds are left transparent. */

const COWRIE = (x, y, r = 0) => `<g transform="translate(${x} ${y}) rotate(${r})">
    <ellipse rx="3.6" ry="4.8" fill="#FBEFD6" stroke="#9C7A4B" stroke-width="1"/>
    <path d="M0 -3.3C1 -1.4 1 1.4 0 3.3-1 1.4-1 -1.4 0 -3.3z" fill="#2B2118"/></g>`;

/* the wooden beehive pieces Pachisi is played with */
const PIECE = (x, y, fill) => `<path d="M${x - 4.2} ${y + 4}Q${x - 4.6} ${y - 4.5} ${x} ${y - 6}Q${x + 4.6} ${y - 4.5} ${x + 4.2} ${y + 4}Z"
    fill="${fill}" stroke="#2B2118" stroke-width=".9"/><circle cx="${x}" cy="${y - 6}" r="1.4" fill="${fill}" stroke="#2B2118" stroke-width=".7"/>`;

/* Pachisi: the cross-shaped cloth board, cowries and pieces. */
function ludoArt() {
  const marks = [[50, 26], [50, 74], [26, 50], [74, 50]]
    .map(([x, y]) => `<path d="M${x - 3} ${y - 3}l6 6M${x + 3} ${y - 3}l-6 6" stroke="#A8322A" stroke-width="1.6" stroke-linecap="round"/>`).join('');
  return `<svg viewBox="0 0 100 100" aria-hidden="true">
    <g fill="#F3E6C8" stroke="#26386A" stroke-width="1.6">
      <rect x="38" y="5" width="24" height="90" rx="1"/>
      <rect x="5" y="38" width="90" height="24" rx="1"/>
    </g>
    <g stroke="#26386A" stroke-width=".9" opacity=".8" fill="none">
      <path d="M46 5v33M54 5v33M46 62v33M54 62v33M5 46h33M5 54h33M62 46h33M62 54h33"/>
      <path d="M38 13h24M38 21.5h24M38 30h24M38 70h24M38 78.5h24M38 87h24M13 38v24M21.5 38v24M30 38v24M70 38v24M78.5 38v24M87 38v24"/>
    </g>
    ${marks}
    <rect x="38" y="38" width="24" height="24" fill="#26386A"/>
    <path d="M50 41.5l2.4 6.1 6.1 2.4-6.1 2.4L50 58.5l-2.4-6.1L41.5 50l6.1-2.4z" fill="#D9A21B"/>
    ${PIECE(50, 84, '#C8402F')}${PIECE(16, 51, '#3E7A3A')}${PIECE(85, 51, '#E0A21B')}${PIECE(50, 17, '#2B2118')}
    ${COWRIE(17, 17, -20)}${COWRIE(24, 22, 25)}${COWRIE(82, 80, 10)}
  </svg>`;
}

/* Moksha Patam: a painted board — ochre squares, a lotus at the top,
   one ladder up, one snake down. */
function snakesArt() {
  const n = 5, o = 12, c = 76 / n;
  let cells = '';
  for (let r = 0; r < n; r++) {
    for (let k = 0; k < n; k++) {
      const fill = (r + k) % 2 ? '#E2BE6E' : '#F2E2BC';
      cells += `<rect x="${o + k * c}" y="${o + r * c}" width="${c}" height="${c}" fill="${fill}"/>`;
    }
  }
  return `<svg viewBox="0 0 100 100" aria-hidden="true">
    ${cells}
    <rect x="${o}" y="${o}" width="76" height="76" fill="none" stroke="#2B2118" stroke-width="1.4"/>
    <g fill="#C94F7C" stroke="#7A2018" stroke-width=".6">
      <path d="M50 14.5c3 3 3 7.5 0 10.5-3-3-3-7.5 0-10.5z"/>
      <path d="M50 25c-3.6-.6-6.2-3.4-6.6-7 3.6.4 6.2 3.4 6.6 7zM50 25c3.6-.6 6.2-3.4 6.6-7-3.6.4-6.2 3.4-6.6 7z"/>
    </g>
    <g stroke="#7A4E1E" stroke-width="2.6" stroke-linecap="round">
      <path d="M22 82 35 38M31 84 44 40"/>
    </g>
    <g stroke="#7A4E1E" stroke-width="1.8" stroke-linecap="round">
      <path d="M24.5 74l9 2.6M27.5 64l9 2.6M30.5 54l9 2.6M33.5 44l9 2.6"/>
    </g>
    <path d="M70 30c-12 6 10 16-2 26-9 8 6 14 0 26" fill="none" stroke="#2F5A2A" stroke-width="7.5" stroke-linecap="round"/>
    <path d="M70 30c-12 6 10 16-2 26-9 8 6 14 0 26" fill="none" stroke="#5E8F45" stroke-width="5" stroke-linecap="round"/>
    <path d="M70 30c-12 6 10 16-2 26-9 8 6 14 0 26" fill="none" stroke="#D9A21B" stroke-width="1.2" stroke-dasharray="2 3" stroke-linecap="round"/>
    <ellipse cx="71" cy="27.5" rx="6" ry="4.6" fill="#5E8F45" stroke="#2F5A2A" stroke-width="1.2"/>
    <circle cx="73" cy="26.3" r="1.2" fill="#2B2118"/>
    <path d="M76.5 28.5l3.5 1.2" stroke="#A8322A" stroke-width="1.2" stroke-linecap="round"/>
  </svg>`;
}

/* Painted cards, fanned on the mat: two indigo backs and a diya. */
function memoryArt() {
  const back = (x, y, r) => `<g transform="rotate(${r} ${x + 17} ${y + 23})">
      <rect x="${x}" y="${y}" width="34" height="46" rx="3" fill="#26386A" stroke="#18244A" stroke-width="1"/>
      <rect x="${x + 3}" y="${y + 3}" width="28" height="40" rx="1.5" fill="none" stroke="#F3E2C0" stroke-width="1" opacity=".8"/>
      <g fill="#F3E2C0"><circle cx="${x + 17}" cy="${y + 19}" r="2.8"/><circle cx="${x + 17}" cy="${y + 27}" r="2.8"/>
      <circle cx="${x + 13}" cy="${y + 23}" r="2.8"/><circle cx="${x + 21}" cy="${y + 23}" r="2.8"/></g>
      <circle cx="${x + 17}" cy="${y + 23}" r="1.6" fill="#D9A21B"/></g>`;
  return `<svg viewBox="0 0 100 100" aria-hidden="true">
    ${back(8, 24, -12)}${back(56, 20, 10)}
    <g transform="rotate(-2 50 58)">
      <rect x="32" y="32" width="36" height="50" rx="3" fill="#F8F1E1" stroke="#2B2118" stroke-width=".8"/>
      <rect x="35" y="35" width="30" height="44" rx="1.5" fill="none" stroke="#A8322A" stroke-width="1.2"/>
      <path d="M50 62c-5-5-3-11 0-17 3 6 5 12 0 17z" fill="#E0A21B"/>
      <path d="M50 61c-2-2.6-1.4-5.6 0-8.4 1.4 2.8 2 5.8 0 8.4z" fill="#C8402F"/>
      <path d="M37 64Q50 78 63 64z" fill="#C46A2E"/>
      <path d="M37 64Q50 67.5 63 64Q56 61 50 61 44 61 37 64z" fill="#9A4A1C"/>
    </g>
  </svg>`;
}

/* Raja Mantri Chor Sipahi: four chits on a durrie, one opened — the crown. */
function rajaArt() {
  const fold = (x, y, r) => `<g transform="rotate(${r} ${x + 14} ${y + 14})">
      <path d="M${x} ${y}h28l-3 30h-22z" fill="#F8F1E1" stroke="#2B2118" stroke-width="1.6" stroke-linejoin="round"/>
      <path d="M${x} ${y}l14 11 14-11" fill="none" stroke="#2B2118" stroke-width="1.3"/></g>`;
  return `<svg viewBox="0 0 100 100" aria-hidden="true">
    ${fold(10, 14, -14)}${fold(62, 10, 12)}${fold(8, 58, 8)}
    <g transform="rotate(-4 64 66)">
      <rect x="46" y="46" width="40" height="42" rx="2" fill="#F8F1E1" stroke="#2B2118" stroke-width="1.6"/>
      <path d="M54 76 52 58l8 7 6-11 6 11 8-7-2 18z" fill="#D9A21B" stroke="#2B2118" stroke-width="1.5" stroke-linejoin="round"/>
      <rect x="53" y="75" width="26" height="5" rx="1" fill="#B8862A" stroke="#2B2118" stroke-width="1.3"/>
      <circle cx="66" cy="53" r="2.2" fill="#A8322A"/>
    </g>
  </svg>`;
}
