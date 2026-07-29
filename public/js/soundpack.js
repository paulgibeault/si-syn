// si-syn sound pack — the game's own sound design.
//
// Lives in public/ rather than src/ because it is a plain script loaded after
// /sdk/v3/arcade-audio.js, not a module for vite to bundle — the launcher's
// tools/soundpack renderer loads this same file to produce audition WAVs, so
// what gets approved by ear is what plays, and that only holds if nothing
// transforms it on the way.
//
// ── v1 — the bench ────────────────────────────────────────────────────────
// You are not inside the signal. You are a person at a workbench with a scope
// and a rack of relays, and every sound in the game is HARDWARE.
//
// The chiptune profile this replaces (audio/chiptune-archive.mjs) used
// waveform type as semantics — square meant a valid logic level, sawtooth
// meant a malformed one, noise meant the analog layer. It was a clever rule
// and it only ever existed because a spec cue has nothing but waveform type
// to vary. Keeping it here would mean choosing to sound like an oscillator
// bank when the elements can sound like the bench itself.
//
// One rule survives the redesign intact, because it was never about
// waveforms: A PASS HAS NO STATIC IN IT. Interference is the game's word for
// wrong, so the success side stays clean — contacts and ringing metal only —
// and the failure side is literally noise stepping on the signal. That is
// what makes the two read apart instantly at low volume.
//
// THE STRUCTURAL CHANGE: THE RUN HAS A BED. Running a test is the central
// verb of this game and it used to be silent — the board sat there and only
// the verdict made a sound. `bench` is a sustained cue (SDK `Arcade.audio
// .start()`), the board energised: mains hum and a breath of hiss, up while
// the program runs. Pass and fail are then not two unrelated jingles but two
// ways the same bed can END, which is also how it works on a real bench.
//
// Five cues:
//
//   bench           SUSTAINED — the board energised, up for the whole run
//   ui-click        a relay contact closing — place, wire, navigate
//   test-pass       the rail locks
//   test-fail       the rail browns out
//   level-complete  the whole bank sequencing, then a machine that works
//
// Register plan, so simultaneous cues occupy different bands:
//   bed hum 60–300 · bed hiss 2200–5000 · contacts 2600–6000
//   pass ring 880–2400 · fail sag 110–420 · fail static 700–2900
//
// LEVEL NEVER VARIES PER PLAY. `bench` takes a `busy` parameter and it moves
// the bed's COLOUR — how much the hum drifts, how present the hiss is — and
// never its gain, for the reason the fleet learned the hard way in sow-duku
// v3/v4: a level that tracks game state lands on loud outliers in exactly the
// runs where the player is concentrating hardest.
//
// The pre-graph chiptune profile is kept verbatim in audio/chiptune-archive.mjs
// as provenance. Nothing loads it: fallbacks are retired fleet-wide.

(function (global) {
  'use strict';
  const S = global.ArcadeAudioElements;

  // Every cue here is built from the element library's gestures, so with the
  // library absent — a stale service-worker cache, or running standalone off
  // the launcher origin — there is nothing registrable and the game
  // plays silence — by design; fallbacks are retired fleet-wide. Bail before
  // dereferencing S: this file is a plain script, and a throw here would
  // surface as a page error even though the silence itself is intended. Also covers an OLDER library that predates
  // registerPack, which is the same stale-cache scenario one version on.
  if (!S || typeof S.registerPack !== 'function') return;

  // A small room with hard surfaces and a lot of stuff in it. Short, bright
  // and tight — a workshop, not a hall. The room's whole job is to put the
  // relays on a bench in front of you rather than in a void; a tail you could
  // point to would turn a workbench into a warehouse.
  const ROOM = {
    dur: 0.9,
    decay: 0.28,
    preDelay: 0.010,
    wet: 0.55,
    shelfHz: 4200,
    shelfDb: -5,
    seed: 8086,
  };

  // How much room each cue sits in. The bed is nearly dry — it is the sound
  // of the thing on the desk in front of you, and reverb on a continuous
  // layer is the fastest way to make a small room sound like a car park.
  const SENDS = {
    'bench': 0.05,
    'ui-click': 0.05,
    'test-pass': 0.14,
    'test-fail': 0.18,
    'level-complete': 0.20,
  };

  // Cues that must be started with `Arcade.audio.start()` rather than played,
  // and which return a teardown instead of a duration. The audition and the
  // game's audio module both read this; the renderer's `{ cue }` items cannot
  // handle one, so anything listed here is exercised through a build function.
  const SUSTAINED = { 'bench': true };

  // Levels, by layer. The bed sits underneath everything by a wide margin —
  // it is meant to be noticed when it STOPS, not while it runs. The click
  // fires on every interaction with the board and is the quietest event.
  const HUM = 0.022;       // the rail
  // The air around it — present only to stop the hum reading as a test tone,
  // which is a job it can only do if it is actually audible.
  //
  // Do not tune this against `analyze.mjs`'s centroid column. The bed reads
  // there at ~2.9 kHz, which looks like hiss-dominance and is not: that
  // centroid is a magnitude-weighted mean over every FFT bin, so a broadband
  // layer spread across thousands of bins outweighs a hum concentrated in
  // five of them no matter how much quieter it is. Measured as band energy,
  // this bed is 94% below 400 Hz — it is hum with a breath on top, as
  // intended. The centroid column is meaningful for the transient cues and
  // meaningless for this one.
  const HISS = 0.010;
  const CONTACT = 0.050;   // one relay closing
  const LOCK = 0.17;       // the pass
  const BROWNOUT = 0.20;   // the fail
  const BANK = 0.19;       // the level

  const clamp01 = (v) => (typeof v === 'number' && isFinite(v) ? Math.max(0, Math.min(1, v)) : 0);

  // A bed schedules its whole timeline up front (the SDK crossfades a second
  // instance to retune rather than adjusting one in place), so it is built
  // long and stopped by its teardown. Sixty seconds is well past the longest
  // plausible test run and costs four oscillators and one noise loop.
  const BED_DUR = 60;

  const CUES = {
    // THE BOARD ENERGISED — sustained, up for exactly as long as the program
    // runs. Mains hum with its harmonics under a lowpass, a sub for the floor,
    // and a breath of hiss on top: the two sounds every powered thing on a
    // bench makes and nobody consciously hears until they stop.
    //
    // `params.busy` (0..1) is how hard the program is working. It moves the
    // hum's drift and the hiss's band — the rail working harder, not a fader
    // going up — and touches neither layer's gain.
    //
    // Returns a teardown, per the sustained-cue contract.
    'bench': function (ctx, o, t, params, r) {
      const busy = clamp01(params && params.busy);
      const collect = [];
      S.drone(ctx, o, t, BED_DUR, {
        f: 60 * S.cents(r, 8), type: 'sawtooth', detune: 6,
        lp: 300 + busy * 120, sub: 0.35,
        drift: 0.055 + busy * 0.11, driftAmt: 90 + busy * 90,
        gain: HUM, fade: 0.30, collect,
      });
      S.stream(ctx, o, t, BED_DUR, {
        f: 2600 + busy * 900, Q: 0.7, lp: 5000,
        rate: 0.05 + busy * 0.05, sweep: 350 + busy * 350,
        gain: HISS, fade: 0.35, seed: (r() * 1e6) | 0, collect,
      });
      return S.teardown(collect);
    },

    // A RELAY CONTACT CLOSING — placing a component, dragging a wire, moving
    // around the board. The contact and the armature's ring land together as
    // one event, which is what separates a switch from a tick-then-beep. It
    // fires constantly, so it is the quietest thing in the pack and it is
    // over in about thirty milliseconds.
    'ui-click': function (ctx, o, t, params, r) {
      S.strike(ctx, o, t, {
        dur: S.between(r, 0.0025, 0.0038), hp: 3400 * S.cents(r, 110),
        gain: CONTACT, seed: (r() * 1e6) | 0,
      });
      S.body(ctx, o, t, {
        f0: S.between(r, 1420, 1580), gain: CONTACT * 0.85,
        partials: [
          { ratio: 1.00, gain: 1.00, decay: S.between(r, 0.010, 0.016), detune: 7 },
          { ratio: 2.83, gain: 0.30, decay: S.between(r, 0.006, 0.010), detune: 12 },
        ],
      });
      return 0.12;
    },

    // THE RAIL LOCKS — the test passed. Two contacts seating a beat apart (a
    // pawl dropping into place, decelerating), then the armature ringing on
    // and settling. Strictly no static: interference is this game's word for
    // wrong, so the success side is contacts and ringing metal only, and that
    // is what lets a pass and a fail be told apart at any volume.
    //
    // The bed's clean stop is the other half of this cue and belongs to the
    // caller — `bench` is faded out on the same beat. Heard together, a pass
    // is the machine finishing rather than a sound placed on top of it.
    'test-pass': function (ctx, o, t, params, r) {
      S.ratchet(ctx, o, t, {
        detents: 2, dur: S.between(r, 0.055, 0.070), end: 1.5, jitter: 0.04,
        f: S.between(r, 1180, 1320), hp: 3200, gain: LOCK * 0.55,
        seed: (r() * 1e6) | 0,
      });
      S.body(ctx, o, t + S.between(r, 0.055, 0.070), {
        f0: S.between(r, 880, 940), gain: LOCK,
        partials: [
          { ratio: 1.00, gain: 1.00, decay: S.between(r, 0.20, 0.26), detune: 5, attack: 0.003 },
          { ratio: 2.41, gain: 0.26, decay: S.between(r, 0.09, 0.12), detune: 9, attack: 0.002 },
          { ratio: 4.72, gain: 0.09, decay: S.between(r, 0.04, 0.06), detune: 14, attack: 0.002 },
        ],
      });
      return 0.7;
    },

    // THE RAIL BROWNS OUT — the test failed. Static breaks in over the line
    // first, the supply sags underneath it, and the whole thing collapses:
    // interference, then loss of level, in that order, because that is the
    // order the player's own mistake caused them in.
    //
    // The sag is a `creak` swept downward with its stick-slip rate slowing as
    // it goes — a supply losing regulation is not a smooth glide, it hunts on
    // the way down, and the hunting is what makes it read as a rail rather
    // than as a filter sweep.
    'test-fail': function (ctx, o, t, params, r) {
      S.flare(ctx, o, t, {
        dur: S.between(r, 0.11, 0.14), gain: BROWNOUT * 0.42, bright: 1.35,
        f0: 1500, f1: 780, Q: 0.85, lp: 2900, weight: 0,
        attack: 0.004, seed: (r() * 1e6) | 0,
      });
      S.creak(ctx, o, t + S.between(r, 0.030, 0.050), {
        f0: S.between(r, 380, 440), f1: S.between(r, 105, 125), Q: 5.5,
        lp: 1100, dur: S.between(r, 0.26, 0.32), rate: 2.2, rate1: 0.6,
        gain: BROWNOUT * 0.55, attack: 0.015, seed: (r() * 1e6) | 0,
      });
      S.thump(ctx, o, t + S.between(r, 0.24, 0.29), {
        f0: S.between(r, 88, 100), f1: S.between(r, 40, 47),
        dur: S.between(r, 0.22, 0.28), attack: 0.020,
        gain: BROWNOUT * 0.60, seed: (r() * 1e6) | 0,
      });
      return 0.9;
    },

    // LEVEL COMPLETE — the whole bank sequencing through, and then a machine
    // that works. Seven detents decelerating as the mechanism settles, the
    // final lock, and a clean steady hum that holds for a beat and releases.
    //
    // Not an arpeggio. The archived profile climbed a major triad and topped
    // it with a stacked fifth, which is a fanfare — a reward handed to the
    // player from outside the fiction. What a finished circuit sounds like is
    // a machine that has stopped needing attention, so the payoff here is the
    // steadiest sound in the game rather than the highest one.
    'level-complete': function (ctx, o, t, params, r) {
      S.ratchet(ctx, o, t, {
        detents: 7, dur: S.between(r, 0.52, 0.60), end: 1.7, jitter: 0.09,
        f: S.between(r, 660, 760), hp: 3000, gain: BANK * 0.50,
        seed: (r() * 1e6) | 0,
      });
      const lock = t + S.between(r, 0.60, 0.66);
      S.strike(ctx, o, lock, {
        dur: 0.004, hp: 3000, gain: BANK * 0.55, seed: (r() * 1e6) | 0,
      });
      S.body(ctx, o, lock, {
        f0: S.between(r, 600, 640), gain: BANK,
        partials: [
          { ratio: 1.00, gain: 1.00, decay: S.between(r, 0.30, 0.38), detune: 4, attack: 0.003 },
          { ratio: 2.41, gain: 0.22, decay: S.between(r, 0.12, 0.16), detune: 9, attack: 0.002 },
        ],
      });
      // the rail, steady at last — and note it is the SAME 60 Hz the bed runs
      // at, so a finished level sounds like the bench you were already
      // listening to, settled
      S.drone(ctx, o, lock + 0.05, 1.25, {
        f: 60, type: 'sawtooth', detune: 4, lp: 320, sub: 0.4,
        drift: 0.04, driftAmt: 50, gain: HUM * 1.5, fade: 0.30,
      });
      return 2.1;
    },
  };

  // Published under the framework's well-known handle (arcade-audio.js
  // registerPack) so the game's audio module and the launcher's soundpack
  // toolchain both reach it without either side knowing this game's name.
  S.registerPack({ name: 'si-syn', ROOM, SENDS, SUSTAINED, CUES });
})(typeof window !== 'undefined' ? window : globalThis);
