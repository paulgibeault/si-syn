/**
 * Sound effects — thin layer over the launcher-managed `Arcade.audio` SDK.
 *
 * The SDK owns all the WebAudio foot-guns (lazy AudioContext, first-gesture
 * unlock, master gain wired to the launcher `audioVolume` setting + global mute,
 * suspend-on-hide / resume-on-return). This module only registers named cues and
 * exposes guarded wrappers. There is deliberately NO in-game volume/mute control
 * — volume and muting are launcher-owned.
 *
 * Two registration paths live here:
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
 *   FALLBACK PATH (older cached SDK/companion, or standalone without
 *     /arcade-audio.js) — the archived chiptune profile, copied verbatim from
 *     audio/chiptune-archive.mjs. A player on a stale service-worker cache
 *     gets the old sound rather than silence; that is an expected state, not
 *     an error, so it is not logged. Its BODIES are frozen.
 *
 * ── what the graph path adds that the chiptune one could not ──────────────
 * THE RUN HAS A BED. Running a test is the central verb of this game and it
 * used to be silent — the board sat there and only the verdict made a sound.
 * `bench` is a SUSTAINED cue: the board energised, up for exactly as long as
 * the program runs, so a pass and a fail are two ways the same bed ENDS
 * rather than two unrelated jingles.
 *
 * A spec cue cannot express that at all — every one of them is a one-shot —
 * so on the fallback path startBench()/stopBench() are silent no-ops and the
 * verdicts play alone, exactly as they did before. Both paths register the
 * same four one-shot cue names, so every ordinary call site works unchanged.
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
// worse than the fallback profile, so the graph path is gated on the pack's
// actual dependencies rather than on a version number. `drone` and `stream`
// are what the bed is made of; without them there is no bench.
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
  } else {
    registerSpecCues(a);
  }
}

// ─── fallback: the archived chiptune profile ────────────────────────────────
// Frozen. Keep these bodies in sync with audio/chiptune-archive.mjs rather than
// editing them here — the profile was tuned as a whole, and the comments below
// describe those chiptune voices, not the bench the graph path now plays.

function registerSpecCues(a) {
  // Board interactions — a relay contact closing: a sliver of noise for the
  // mechanical snap, with the square tone struck at the same instant (both
  // delay 0) so it lands as one percussive event rather than a tick-then-beep.
  a.cue('ui-click', [
    { type: 'noise', dur: 0.012, gain: 0.06, attack: 0.001, release: 0.01, delay: 0 },
    { type: 'square', freq: 320, dur: 0.03, gain: 0.1, attack: 0.001, release: 0.025, delay: 0 },
  ]);
  // Test run passed — two clean square steps, a rising fifth. Kept strictly
  // noiseless: an uncorrupted signal is the whole point of the cue.
  a.cue('test-pass', [
    { type: 'square', freq: 660, dur: 0.07, gain: 0.24, attack: 0.002, release: 0.05 },
    { type: 'square', freq: 990, dur: 0.09, gain: 0.24, attack: 0.002, release: 0.07 },
  ]);
  // Test run failed — static breaking in over the line, then the signal
  // sagging out from under it.
  a.cue('test-fail', [
    { type: 'noise', dur: 0.05, gain: 0.11, attack: 0.001, release: 0.04 },
    {
      type: 'sawtooth', freq: 220, toFreq: 150, dur: 0.18, gain: 0.22,
      attack: 0.002, release: 0.16, delay: 0.01,
    },
  ]);
  // Level completed for the first time — the circuit sequencing up: three
  // quick square steps, then the final note held with a fifth stacked on top.
  a.cue('level-complete', [
    { type: 'square', freq: 523, dur: 0.08, gain: 0.22, attack: 0.002, release: 0.06 },
    { type: 'square', freq: 659, dur: 0.08, gain: 0.22, attack: 0.002, release: 0.06 },
    { type: 'square', freq: 784, dur: 0.08, gain: 0.22, attack: 0.002, release: 0.06 },
    { type: 'square', freq: 1047, dur: 0.16, gain: 0.24, attack: 0.002, release: 0.13 },
    { type: 'square', freq: 1568, dur: 0.16, gain: 0.12, attack: 0.004, release: 0.13, delay: 0 },
  ]);
}

/** True when the graph pack registered — for diagnostics and tests. */
export function isGraphMode() { return graphMode; }

/** Standard play wrapper. Feature-detects every call site through one guard. */
export function sfx(name, opts) {
  const a = audio();
  if (a) a.play(name, opts);
}

// ─── the bed ────────────────────────────────────────────────────────────────
// One handle at a time: a second `Run` while one is going would otherwise
// strand the first bed with nobody holding its stop().

let benchHandle = null;

/**
 * The board comes up. `busy` (0..1) is how much is on this board — it moves
 * the bed's COLOUR, never its level. Silent no-op on the fallback path, where
 * there is no such thing as a sustained cue.
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
