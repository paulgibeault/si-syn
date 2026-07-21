/**
 * Sound effects — thin layer over the launcher-managed `Arcade.audio` SDK.
 *
 * The SDK owns all the WebAudio foot-guns (lazy AudioContext, first-gesture
 * unlock, master gain wired to the launcher `audioVolume` setting + global mute,
 * suspend-on-hide / resume-on-return). This module only registers named cues and
 * exposes one guarded play wrapper (`sfx`). There is deliberately NO in-game
 * volume/mute control — volume and muting are launcher-owned (see plan A3).
 *
 * Aesthetic: circuit-lab / arcade-y — short square & sawtooth blips (A5).
 * All cues are ≤0.25 s per voice and gain ≤0.35.
 */

// Register all cues once, right after the SDK is available. Safe to call more
// than once (cue() is an idempotent overwrite). Feature-detected so a stale /
// standalone launcher SDK without `Arcade.audio` is a no-op.
export function initAudio() {
  if (!(window.Arcade && Arcade.audio)) return;

  // Soft, dry click for board interactions (place / wire / navigate). Kept very
  // quiet since it can fire fairly often.
  Arcade.audio.cue('ui-click', { type: 'square', freq: 320, dur: 0.03, gain: 0.1 });

  // Test run passed (replay of an already-solved level) — a short rising
  // two-note confirm blip.
  Arcade.audio.cue('test-pass', [
    { type: 'square', freq: 660, dur: 0.07, gain: 0.28 },
    { type: 'square', freq: 990, dur: 0.09, gain: 0.28 },
  ]);

  // Test run failed (signal mismatch) — a low descending sawtooth buzz.
  Arcade.audio.cue('test-fail', {
    type: 'sawtooth', freq: 220, toFreq: 150, dur: 0.18, gain: 0.24,
  });

  // Level completed for the first time — a brief ascending square-wave jingle.
  Arcade.audio.cue('level-complete', [
    { type: 'square', freq: 523, dur: 0.09, gain: 0.26 },
    { type: 'square', freq: 659, dur: 0.09, gain: 0.26 },
    { type: 'square', freq: 784, dur: 0.09, gain: 0.26 },
    { type: 'square', freq: 1047, dur: 0.14, gain: 0.28 },
  ]);
}

// Standard play wrapper (plan A2). Feature-detects every call site through one
// guard. si-syn has no pre-existing in-game sound setting, so there is no
// `soundOn` gate here (A3) — the launcher's mute is the only toggle.
export function sfx(name, opts) {
  if (window.Arcade && Arcade.audio) Arcade.audio.play(name, opts);
}
