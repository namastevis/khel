/* ═══════════════════════════════════════════════════════════════
   voice.js — saying the name of a pair out loud.

   Every browser has a speech synthesiser built in and the voices are
   already on the device, so this needs no audio files and works with
   the tablet in aeroplane mode — the same promise as everything else
   here.

   It is deliberately fragile-tolerant: if there is no voice, or the
   browser refuses, nothing happens and the game carries on. The word
   is on screen either way, so the sound is a bonus and never the
   only way to know what was found.
   ═══════════════════════════════════════════════════════════════ */

const synth = typeof speechSynthesis !== 'undefined' ? speechSynthesis : null;

/* Pick an English voice once, and prefer one of the friendlier ones —
   the default on some devices is the robot. */
let chosen = null;
let looked = false;

function voice() {
  if (looked) return chosen;
  try {
    const all = synth.getVoices();
    if (!all.length) return null;               // not loaded yet; try again next time
    looked = true;
    const english = all.filter((v) => /^en(-|_|$)/i.test(v.lang));
    const nice = english.find((v) => /samantha|karen|moira|tessa|google uk|google us/i.test(v.name));
    chosen = nice || english[0] || all[0];
  } catch { looked = true; }
  return chosen;
}

export function say(text) {
  if (!synth) return;
  try {
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const v = voice();
    if (v) { u.voice = v; u.lang = v.lang; }
    u.rate = 0.9;                                // a shade slower than talking
    u.pitch = 1.1;
    u.volume = 1;
    synth.speak(u);
  } catch { /* no voice on this device */ }
}

export function stopSaying() {
  try { synth?.cancel(); } catch { /* ignore */ }
}
