// si-syn — audition timeline, v1 (diagnostic).
//
//   node ../paulgibeault.github.io/tools/soundpack/render.mjs \
//     --config soundpack.config.json --audition full
//
// The PROVING file — listen to audition-short.js first; come here when
// something in it needs isolating. Written after the first ear pass (v1
// approved with no retunes), so it proves the claims the design stands on
// rather than re-auditioning the material:
//
//   · `busy` moves the bed's COLOUR and never its level — the one parameter
//     in this pack that tracks game state, aimed straight at the fleet's
//     oldest failure mode, so it gets the adversarial treatment
//   · the bed has two ways to die (0.06 s under a pass, 0.22 s under a fail)
//     and both must be fades, never a click-off
//   · a pass has no static in it — provable only DRY, where the room can't
//     soften a stray band of noise
//   · the pass, the level-complete and a fast wire-drag all live on ratchet
//     detents and ringing metal, and they must stay three different sizes
//
// `bench` is SUSTAINED — it returns a teardown, not a duration, so it never
// appears as a plain { cue } item and the dry/wet section is written by hand
// rather than generated. If a future cue is added to this pack, add its
// dry/wet pair to section D yourself; nothing will do it for you here.
//
(function (global) {
  'use strict';
  const S = global.ArcadeAudioElements;
  const A = global.ArcadeAudition;
  const P = A.pack();

  const GAP = 1.0;
  const TAIL = 1.6;

  // Start the bed at `t`, hold it `dur`, then fade and tear it down — the
  // audition's stand-in for `Arcade.audio.start(...)` + `handle.stop(fade)`.
  // `send: 0` renders it dry.
  function bed(ctx, bus, t, dur, params, r, fade, send) {
    const o = S.out(bus, send === undefined ? P.SENDS['bench'] : send);
    const td = P.CUES['bench'](ctx, o, t, params || null, r);
    const f = fade == null ? 0.10 : fade;
    o.gain.setValueAtTime(1, t + dur);
    o.gain.exponentialRampToValueAtTime(0.0001, t + dur + f);
    if (typeof td === 'function') td(t + dur + f + 0.05);
  }

  const SECTIONS = [
    {
      title: 'A · The bed — colour is not level',
      note: 'The one parameter in this pack that tracks game state is `busy`, and the rule it lives under is the fleet\'s oldest: it may move the hum\'s drift and the hiss\'s band, and it may not touch a fader. Idle and flat-out slammed back to back, three times — the ear reads any level change as the bench getting louder while you work, which is precisely the failure sow-duku paid for. Then a long hold at working level: the bed is designed to be forgotten, and twelve unbroken seconds is where you find out whether it manages it or starts performing.',
      items: [
        A.custom('busy 0 · busy 1 — alternating ×3, listening for a fader', 16.6, (ctx, bus, t, r) => {
          for (let i = 0; i < 3; i++) {
            bed(ctx, bus, t + i * 5.4, 2.2, { busy: 0.0 }, r);
            bed(ctx, bus, t + i * 5.4 + 2.7, 2.2, { busy: 1.0 }, r);
          }
        }),
        A.custom('busy ½ — twelve seconds unbroken, the forgetting test', 13.6,
          (ctx, bus, t, r) => bed(ctx, bus, t, 12.0, { busy: 0.5 }, r)),
        A.custom('the bed DRY — the hum and the breath with no room at all', 5.4,
          (ctx, bus, t, r) => bed(ctx, bus, t, 4.0, { busy: 0.5 }, r, 0.10, 0)),
      ],
    },
    {
      title: 'B · The two deaths of the bed',
      note: 'A pass takes the bed down in 0.06 s — the rail locking is the bench finishing, and the cut has to be near-instant to fuse with the lock. A fail lets it sag out over 0.22 s under the brownout. Both endings here arrive with no verdict cue over them, which never happens in play: this is the only place the fade itself is audible, and what it must never be is a click. If either of these ends with a tick or a pop, the fault is in the fade envelope, and it would otherwise hide under the verdict forever.',
      items: [
        A.custom('the pass ending, naked — 0.06 s, out like a switch', 4.6,
          (ctx, bus, t, r) => bed(ctx, bus, t, 3.0, { busy: 0.7 }, r, 0.06)),
        A.custom('the fail ending, naked — 0.22 s, the sag alone', 4.8,
          (ctx, bus, t, r) => bed(ctx, bus, t, 3.0, { busy: 0.7 }, r, 0.22)),
        A.custom('two runs nose to tail — the bed dies and is up again at once', 8.6, (ctx, bus, t, r) => {
          bed(ctx, bus, t, 2.0, { busy: 0.7 }, r, 0.22);
          A.fire(ctx, bus, 'test-fail', t + 2.00, r);
          bed(ctx, bus, t + 3.1, 2.0, { busy: 0.85 }, r, 0.06);
          A.fire(ctx, bus, 'test-pass', t + 5.12, r);
        }),
      ],
    },
    {
      title: 'C · No static in a pass — proven dry',
      note: 'Interference is this game\'s word for wrong, so the success side is contacts and ringing metal only. The room is bright and could plausibly smear a faint band of noise into respectability, so the rule is proven with the room removed: a pass and a fail, each dry, alternated. Dry, the pass should be two clicks and a ring and NOTHING ELSE — any breath, any fizz, any grain riding the ring means static has leaked into the success side and the pack\'s one inherited law is broken.',
      items: [
        A.play('test-pass', { label: 'pass — DRY, listening for anything that hisses', send: 0 }),
        A.play('test-fail', { label: 'fail — DRY, where the static is supposed to be', send: 0 }),
        A.custom('pass · fail · pass · fail — dry, alternating', 7.2, (ctx, bus, t, r) => {
          const dry = (name, at) => P.CUES[name](ctx, S.out(bus, 0), t + at, null, r);
          dry('test-pass', 0); dry('test-fail', 1.8); dry('test-pass', 3.6); dry('test-fail', 5.4);
        }),
      ],
    },
    {
      title: 'D · Each cue — dry, then in the room',
      note: 'First without reverb, then with. The workshop is the tightest room in the fleet and its whole job is placement, not decoration — the wet copy should sit ON the bench in front of you, and the moment any of these grows a tail you could point to, the workshop has become a warehouse. Written by hand because the bed cannot be a plain item; its own dry pair is at the end of section A.',
      items: [
        A.play('ui-click', { label: 'ui-click — dry', send: 0, dur: 0.7 }),
        A.play('ui-click', { label: 'ui-click — in the room', dur: 0.8 }),
        A.play('test-pass', { label: 'test-pass — dry', send: 0 }),
        A.play('test-pass', { label: 'test-pass — in the room' }),
        A.play('test-fail', { label: 'test-fail — dry', send: 0 }),
        A.play('test-fail', { label: 'test-fail — in the room' }),
        A.play('level-complete', { label: 'level-complete — dry', send: 0 }),
        A.play('level-complete', { label: 'level-complete — in the room' }),
      ],
    },
    {
      title: 'E · Three sizes of mechanism',
      note: 'The click, the pass and the level-complete are all contacts and detents, deliberately one family — and they must stay three unmistakable sizes: one relay, two detents locking, seven detents sequencing a whole bank. The dangerous neighbour is the wire-drag: nine clicks in under a second is mechanically a ratchet, and if it ever reads as one, every drag across the board fires a tiny verdict. Drag, then pass, then drag; then the pass against the level-complete, where the question is whether seven-then-hum reads as a BIGGER event than two-then-ring, not merely a longer one.',
      items: [
        A.custom('drag · pass · drag — is a drag ever a verdict?', 7.4, (ctx, bus, t, r) => {
          for (let i = 0; i < 9; i++) A.fire(ctx, bus, 'ui-click', t + i * 0.085, r);
          A.fire(ctx, bus, 'test-pass', t + 2.2, r);
          for (let i = 0; i < 9; i++) A.fire(ctx, bus, 'ui-click', t + 4.6 + i * 0.085, r);
        }),
        A.custom('pass · level-complete — the lock, then the whole bank', 7.4, (ctx, bus, t, r) => {
          A.fire(ctx, bus, 'test-pass', t, r);
          A.fire(ctx, bus, 'level-complete', t + 2.6, r);
        }),
        A.repeat('ui-click', { n: 24, spacing: 0.30, label: 'ui-click ×24 — a building session, fatigue check' }),
      ],
    },
    {
      title: 'F · Verdicts over a dying bed',
      note: 'In play a verdict never lands on silence — it lands on its own bed\'s fade, and at busy 1.0 the hiss band sits at 3.5 kHz, right where the pass\'s contacts live. The worst case for each verdict: a pass over the loudest, hissiest bed the game can produce (the lock must still cut through cleanly), and a fail over the same (the flare\'s static must read as NEW noise breaking in over the bed\'s noise, not as the bed getting louder). If the fail\'s static and the bed\'s hiss ever merge into one sound, the verdict has lost its first act.',
      items: [
        A.custom('PASS over a flat-out bed — the lock through the hiss', 5.6, (ctx, bus, t, r) => {
          bed(ctx, bus, t, 2.4, { busy: 1.0 }, r, 0.06);
          A.fire(ctx, bus, 'test-pass', t + 2.42, r);
        }),
        A.custom('FAIL over a flat-out bed — new noise over old noise', 5.6, (ctx, bus, t, r) => {
          bed(ctx, bus, t, 2.4, { busy: 1.0 }, r, 0.22);
          A.fire(ctx, bus, 'test-fail', t + 2.40, r);
        }),
        A.custom('the full payoff — fail, fix, pass, LEVEL COMPLETE', 13.0, (ctx, bus, t, r) => {
          bed(ctx, bus, t, 1.6, { busy: 0.6 }, r, 0.22);
          A.fire(ctx, bus, 'test-fail', t + 1.60, r);
          [3.0, 3.3, 3.55].forEach((at) => A.fire(ctx, bus, 'ui-click', t + at, r));
          bed(ctx, bus, t + 4.3, 1.8, { busy: 0.85 }, r, 0.06);
          A.fire(ctx, bus, 'test-pass', t + 6.12, r);
          A.fire(ctx, bus, 'level-complete', t + 7.6, r);
        }),
      ],
    },
  ];

  A.publish({ gap: GAP, tail: TAIL, sections: SECTIONS });
})(typeof window !== 'undefined' ? window : globalThis);
