/* The playing piece, shared by every game that has one:
   a shadow, a body, a head and a glint. */

export function drawPawn(ctx, x, y, r, c, { glow = 0, lifted = false } = {}) {
  if (glow > 0) {
    ctx.beginPath();
    ctx.arc(x, y - r * 0.1, r * (1.35 + glow * 0.22), 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 205, 60, ${0.20 + glow * 0.28})`;
    ctx.fill();
  }

  ctx.beginPath();
  ctx.ellipse(x, y + r * 0.72, r * (lifted ? 0.65 : 0.8), r * 0.26, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(67,51,31,.20)';
  ctx.fill();

  const lift = lifted ? -r * 0.28 : 0;

  ctx.beginPath();
  ctx.arc(x, y + r * 0.24 + lift, r * 0.66, 0, Math.PI * 2);
  ctx.fillStyle = c.main; ctx.fill();
  ctx.lineWidth = r * 0.16; ctx.strokeStyle = c.dark; ctx.stroke();

  ctx.beginPath();
  ctx.arc(x, y - r * 0.46 + lift, r * 0.44, 0, Math.PI * 2);
  ctx.fillStyle = c.main; ctx.fill();
  ctx.lineWidth = r * 0.16; ctx.strokeStyle = c.dark; ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(x - r * 0.16, y - r * 0.58 + lift, r * 0.15, r * 0.11, -0.5, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,.75)';
  ctx.fill();
}

/** The same piece as flat SVG, for menus and cards. */
export function pawnSVG(c) {
  return `<svg viewBox="0 0 100 100" aria-hidden="true">
    <ellipse cx="50" cy="86" rx="30" ry="9" fill="rgba(67,51,31,.18)"/>
    <circle cx="50" cy="62" r="26" fill="${c.main}" stroke="${c.dark}" stroke-width="6"/>
    <circle cx="50" cy="30" r="18" fill="${c.main}" stroke="${c.dark}" stroke-width="6"/>
    <ellipse cx="43" cy="24" rx="6" ry="4" fill="rgba(255,255,255,.8)" transform="rotate(-25 43 24)"/>
  </svg>`;
}
