// si-syn — the short audition. THE one to listen to first.
//
//   node ../paulgibeault.github.io/tools/soundpack/render.mjs \
//     --config soundpack.config.json --audition short
//
// A listening file, not a diagnostic one: every sound once, in the order you
// meet it at the bench, then a real level played through.
//
// `bench` is a SUSTAINED cue — it returns a teardown rather than a duration,
// so it cannot be fired as a plain `{ cue }` item and never appears as one
// here. Everything that involves the bed goes through `bed()` below, which
// does by hand what the SDK's `start()` handle does at runtime: fade the
// output, then stop the sources. If the bed is ever heard clicking off rather
// than fading, that is this helper and not the pack.
//
// v1 is a redesign, not a retune — there is no prior graph version to A/B
// against. The long diagnostic timeline gets written after this file has had
// its first ear pass, so that it proves whatever actually needed proving.
//
(function (global) {
  'use strict';
  const A = global.ArcadeAudition;
  const P = A.pack();

  const GAP = 1.15;
  const TAIL = 1.8;

  // Start the bed at `t`, hold it `dur`, then fade and tear it down — the
  // audition's stand-in for `Arcade.audio.start(...)` + `handle.stop(fade)`.
  function bed(ctx, bus, t, dur, params, r, fade) {
    const o = A.out(bus, 'bench');
    const td = P.CUES['bench'](ctx, o, t, params || null, r);
    const f = fade == null ? 0.10 : fade;
    o.gain.setValueAtTime(1, t + dur);
    o.gain.exponentialRampToValueAtTime(0.0001, t + dur + f);
    if (typeof td === 'function') td(t + dur + f + 0.05);
  }

  const SECTIONS = [
    {
      title: 'A · The bench',
      note: 'The board energised — mains hum, a sub under it, a breath of hiss. It is meant to sit far enough under everything that you only really notice it when it STOPS, so listen to it alone once and then stop thinking about it. If it is loud enough to be interesting, it is wrong.',
      items: [
        A.custom('the bed alone — the board powered up, four seconds, then off', 5.6,
          (ctx, bus, t, r) => bed(ctx, bus, t, 4.0, { busy: 0.2 }, r)),
        A.custom('the bed idle, then working — same level, different colour', 6.6,
          (ctx, bus, t, r) => { bed(ctx, bus, t, 2.4, { busy: 0.0 }, r); bed(ctx, bus, t + 2.9, 2.4, { busy: 1.0 }, r); }),
      ],
    },
    {
      title: 'B · The two ways a run ends',
      note: 'A test run, whole: the board comes up, the program runs for a beat, and then the bed ENDS one of two ways. A pass is contacts and ringing metal and the rail locking — no static anywhere in it. A fail is static breaking in over the line first, then the supply sagging out from under it, and the bed dying with it. That "a pass has no noise in it" rule is the one thing carried over from the chiptune profile, and it is what should let you call these apart with your eyes shut and the volume low.',
      items: [
        A.custom('RUN → PASS — the rail locks and the bench goes quiet', 5.2, (ctx, bus, t, r) => {
          bed(ctx, bus, t, 2.0, { busy: 0.7 }, r, 0.06);
          A.fire(ctx, bus, 'test-pass', t + 2.02, r);
        }),
        A.custom('RUN → FAIL — static, then the rail browns out', 5.2, (ctx, bus, t, r) => {
          bed(ctx, bus, t, 2.0, { busy: 0.7 }, r, 0.22);
          A.fire(ctx, bus, 'test-fail', t + 2.00, r);
        }),
        A.custom('pass · fail · pass · fail — alternating, at volume', 9.0, (ctx, bus, t, r) => {
          for (let i = 0; i < 2; i++) {
            bed(ctx, bus, t + i * 4.4, 1.2, { busy: 0.7 }, r, 0.06);
            A.fire(ctx, bus, 'test-pass', t + i * 4.4 + 1.22, r);
            bed(ctx, bus, t + i * 4.4 + 2.2, 1.2, { busy: 0.7 }, r, 0.22);
            A.fire(ctx, bus, 'test-fail', t + i * 4.4 + 3.40, r);
          }
        }),
      ],
    },
    {
      title: 'C · The board under your hands',
      note: 'The relay contact: one click, then at the pace you actually work — tapping a component, then dragging a wire across the board, which fires a run of them in under a second. It has to stay a texture and never become a drum roll, and it has to stay quiet enough that a whole session of building never wears you out. This is by far the most-fired cue in the game.',
      items: [
        A.play('ui-click', { label: 'one contact', dur: 0.7 }),
        A.repeat('ui-click', { n: 5, spacing: 0.55, label: 'placing components — tap pace' }),
        A.repeat('ui-click', { n: 9, spacing: 0.085, label: 'dragging a wire — nine in under a second' }),
      ],
    },
    {
      title: 'D · One level',
      note: 'Wiring a board up, running it, getting it wrong, fixing it, and finishing. The bed is up only while the program is actually running, which is what should make the level completion land: by then you have heard the rail come up and die twice, so a rail that comes up and STAYS up is the payoff. Listen for whether the click layer stays underneath the verdicts, and whether the completion reads as a machine that works rather than as a fanfare.',
      items: [
        A.custom('build, run, fail — the first attempt', 8.2, (ctx, bus, t, r) => {
          [0.0, 0.42, 0.70, 1.35, 1.62, 1.88, 2.55].forEach((at) => A.fire(ctx, bus, 'ui-click', t + at, r));
          for (let i = 0; i < 7; i++) A.fire(ctx, bus, 'ui-click', t + 3.15 + i * 0.09, r);
          bed(ctx, bus, t + 3.9, 1.5, { busy: 0.55 }, r, 0.22);
          A.fire(ctx, bus, 'test-fail', t + 5.40, r);
        }),
        A.custom('edit, run, pass — the fix', 7.0, (ctx, bus, t, r) => {
          [0.0, 0.30, 0.52, 1.10, 1.34].forEach((at) => A.fire(ctx, bus, 'ui-click', t + at, r));
          bed(ctx, bus, t + 2.1, 1.7, { busy: 0.85 }, r, 0.06);
          A.fire(ctx, bus, 'test-pass', t + 3.82, r);
        }),
        A.custom('LEVEL COMPLETE — the bank sequences, and the rail stays up', 4.6,
          (ctx, bus, t, r) => A.fire(ctx, bus, 'level-complete', t + 0.15, r)),
      ],
    },
  ];

  A.publish({ gap: GAP, tail: TAIL, sections: SECTIONS });
})(typeof window !== 'undefined' ? window : globalThis);
