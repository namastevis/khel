/* ═══════════════════════════════════════════════════════════════
   store.js — this device's memory.

   Everything Khel keeps is kept here and nowhere else: no accounts, no
   server, nothing leaves the tablet. Every call is wrapped, because
   localStorage throws rather than returns null in a private window, and
   a game that can't save a score should still be playable.
   ═══════════════════════════════════════════════════════════════ */

export function readJSON(key, fallback = null) {
  try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback; }
  catch { return fallback; }
}

export function writeJSON(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode */ }
}

export function readText(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}

export function writeText(key, value) {
  try { localStorage.setItem(key, value); } catch { /* private mode */ }
}

export function drop(key) {
  try { localStorage.removeItem(key); } catch { /* private mode */ }
}
