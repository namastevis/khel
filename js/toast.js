/* A single shared toast at the top of the screen. */

let timer = null;

export function toast(text, ms = 1500) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = text;
  el.classList.add('show');
  clearTimeout(timer);
  timer = setTimeout(() => el.classList.remove('show'), ms);
}

export function hideToast() {
  clearTimeout(timer);
  document.getElementById('toast')?.classList.remove('show');
}
