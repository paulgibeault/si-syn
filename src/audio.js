/**
 * Sound effects — thin layer over the launcher-managed `Arcade.audio` SDK.
 *
 * The SDK owns all the WebAudio foot-guns (lazy AudioContext, first-gesture
 * unlock, master gain wired to the launcher `audioVolume` setting + global mute,
 * suspend-on-hide / resume-on-return). This module only registers named cues and
 * exposes guarded wrappers. There is deliberately NO in-game volume/mute control
 * — volume and muting are launcher-owned.
 *
 * THE PACK IS THE SOUND. One registration path lives here:
 *
 *   GRAPH PATH (the SDK's /arcade-audio.js companion loaded) — the real sound
 *     design. public/js/soundpack.js holds the pack: a workbench with a scope
 *     and a rack of relays, where every sound is HARDWARE. It lives in public/
 *     rather than here because it is a plain script the offline renderer loads
 *     verbatim, not a module for vite to bundle. That pack is rendered to an
 *     audition WAV and approved by ear before it ships; do not retune it from
 *     this file.
 *
 *     NO SYNTHESIS LIVES IN THIS GAME. Every gesture the pack is built from is
 *     an element in the launcher's shared library.
 *
 * There is NO FALLBACK. Chiptune is an aesthetic a game ADOPTS as its
 * identity, not a mode a game degrades into — the archived profile in
 * audio/chiptune-archive.mjs is provenance, nothing here plays it. When the
 * capability gate below fails (a stale service-worker cache of the SDK, or a
 * standalone origin without /arcade-audio.js) this game registers nothing and
 * plays SILENCE. That is expected and deliberate, not an error, so it is not
 * logged — and every wrapper below stays a safe no-op with nothing registered.
 *
 * ── why the bed makes the pack worth gating on ────────────────────────────
 * THE RUN HAS A BED. Running a test is the central verb of this game and it
 * used to be silent — the board sat there and only the verdict made a sound.
 * `bench` is a SUSTAINED cue: the board energised, up for exactly as long as
 * the program runs, so a pass and a fail are two ways the same bed ENDS
 * rather than two unrelated jingles.
 */

// The pack, published by public/js/soundpack.js under the framework's
// well-known handle. Read lazily: this module is imported before the inline
// <script> tags in index.html have necessarily finished on every browser.
function pack() {
  return (typeof window !== 'undefined' && window.ArcadeSoundPack) || null;
}
function audio() {
  return (typeof window !== 'undefined' && window.Arcade && window.Arcade.audio) ? window.Arcade.audio : null;
}

// The gestures and APIs the pack is built out of. A cached older SDK or
// element library has `graph()` but not necessarily these, and a missing
// element would throw inside a cue at play time — a cue that half-plays is
// worse than silence, so the graph path is gated on the pack's actual
// dependencies rather than on a version number. When the gate fails, nothing
// is registered at all. `drone` and `stream` are what the bed is made of;
// without them there is no bench.
const NEEDED_ELEMENTS = [
  'strike', 'body', 'ratchet', 'creak', 'flare', 'thump', 'drone', 'stream',
  'teardown', 'cents', 'between',
];

let graphMode = false;

/**
 * Register all cues once, right after the SDK is available. Safe to call more
 * than once (registration is an idempotent overwrite). Feature-detected so a
 * stale / standalone launcher SDK without `Arcade.audio` is a no-op.
 */
export function initAudio() {
  const a = audio();
  if (!a) return;

  const p = pack();
  const el = (typeof a.el === 'function') ? a.el() : null;
  const graphable =
    !!p &&
    typeof a.graph === 'function' &&
    typeof a.room === 'function' &&
    typeof a.start === 'function' &&
    el !== null &&
    NEEDED_ELEMENTS.every((name) => typeof el[name] === 'function');

  if (graphable) {
    // One room for the whole game: the small hard-surfaced workshop the pack
    // is set in.
    a.room(p.ROOM);
    const sustained = p.SUSTAINED || {};
    Object.keys(p.CUES).forEach((name) => {
      a.graph(name, p.CUES[name], { send: p.SENDS[name], sustained: !!sustained[name] });
    });
    graphMode = true;
  }
  // No else. A failed gate registers nothing — the game is silent by design.
}

/** True when the graph pack registered — for diagnostics and tests. */
export function isGraphMode() { return graphMode; }

/**
 * Standard play wrapper. Feature-detects every call site through one guard.
 * Gated on graphMode as well as the SDK: with nothing registered there is
 * nothing to play, and an SDK asked for a cue name it has never seen is not
 * a contract this module leans on.
 */
export function sfx(name, opts) {
  const a = audio();
  if (a && graphMode) a.play(name, opts);
}

// ─── the bed ────────────────────────────────────────────────────────────────
// One handle at a time: a second `Run` while one is going would otherwise
// strand the first bed with nobody holding its stop().

let benchHandle = null;

/**
 * The board comes up. `busy` (0..1) is how much is on this board — it moves
 * the bed's COLOUR, never its level. Silent no-op when the pack did not
 * register, like everything else here.
 */
export function startBench(busy) {
  const a = audio();
  if (!a || !graphMode || typeof a.start !== 'function') return;
  stopBench(0.05);
  benchHandle = a.start('bench', { busy: typeof busy === 'number' ? busy : 0.4 });
}

/**
 * The board goes down, and HOW it goes down is half of the verdict: a pass
 * cuts the rail cleanly on the beat, a fail lets it sag out. Idempotent — the
 * SDK's handle guards repeat stops — so every exit path from a run can call
 * it without coordinating with the others.
 */
export function stopBench(fade) {
  if (benchHandle) {
    benchHandle.stop(typeof fade === 'number' ? fade : 0.25);
    benchHandle = null;
  }
}
