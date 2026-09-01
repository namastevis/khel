/* Names are typed by whoever is holding the tablet and then dropped into
   HTML, so they go through here first. */
export const escapeHtml = (s) => String(s).replace(/[&<>"]/g, (c) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
