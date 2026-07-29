import { describe, it, expect, vi, afterEach } from 'vitest';

// ---------------------------------------------------------------------------
// src/audio.js — graph pack or silence.
//
// The module keeps graphMode in module scope, so each test re-imports a fresh
// copy via vi.resetModules() and builds its own fake `window`. The SDK here is
// a spy-bag, not a simulation: these tests pin the REGISTRATION contract
// (what gets registered when, and that a failed gate registers nothing), not
// how anything sounds.
// ---------------------------------------------------------------------------

const ELEMENTS = [
  'strike', 'body', 'ratchet', 'creak', 'flare', 'thump', 'drone', 'stream',
  'teardown', 'cents', 'between',
];

function makePack() {
  return {
    ROOM: { size: 'small' },
    CUES: { 'ui-click': () => {}, 'test-pass': () => {} },
    SENDS: { 'ui-click': 0.1, 'test-pass': 0.2 },
    SUSTAINED: { bench: true },
  };
}

function makeSdk({ graphable = true } = {}) {
  const el = {};
  if (graphable) ELEMENTS.forEach((name) => { el[name] = () => {}; });
  return {
    graph: vi.fn(),
    room: vi.fn(),
    start: vi.fn(() => ({ stop: vi.fn() })),
    play: vi.fn(),
    cue: vi.fn(),
    el: () => el,
  };
}

async function freshAudio(win) {
  vi.resetModules();
  if (win === undefined) {
    delete globalThis.window;
  } else {
    globalThis.window = win;
  }
  return import('../src/audio.js');
}

afterEach(() => {
  delete globalThis.window;
});

describe('initAudio — graph path', () => {
  it('registers every pack cue through Arcade.audio.graph, in the pack room', async () => {
    const a = makeSdk();
    const pack = makePack();
    const mod = await freshAudio({ Arcade: { audio: a }, ArcadeSoundPack: pack });

    mod.initAudio();

    expect(mod.isGraphMode()).toBe(true);
    expect(a.room).toHaveBeenCalledWith(pack.ROOM);
    expect(a.graph).toHaveBeenCalledTimes(2);
    expect(a.graph).toHaveBeenCalledWith('ui-click', pack.CUES['ui-click'], {
      send: pack.SENDS['ui-click'],
      sustained: false,
    });
    expect(a.cue).not.toHaveBeenCalled();
  });

  it('sfx plays through the SDK once the pack registered', async () => {
    const a = makeSdk();
    const mod = await freshAudio({ Arcade: { audio: a }, ArcadeSoundPack: makePack() });

    mod.initAudio();
    mod.sfx('ui-click');

    expect(a.play).toHaveBeenCalledWith('ui-click', undefined);
  });
});

describe('initAudio — failed gate is silence, not a fallback', () => {
  it('registers NOTHING when the SDK cannot host the pack', async () => {
    // An older cached SDK: cue()/play() exist but graph() does not.
    const a = makeSdk();
    delete a.graph;
    const mod = await freshAudio({ Arcade: { audio: a }, ArcadeSoundPack: makePack() });

    mod.initAudio();

    expect(mod.isGraphMode()).toBe(false);
    expect(a.cue).not.toHaveBeenCalled();
    expect(a.room).not.toHaveBeenCalled();
  });

  it('registers NOTHING when the element library is missing pack dependencies', async () => {
    const a = makeSdk({ graphable: false });
    const mod = await freshAudio({ Arcade: { audio: a }, ArcadeSoundPack: makePack() });

    mod.initAudio();

    expect(mod.isGraphMode()).toBe(false);
    expect(a.graph).not.toHaveBeenCalled();
    expect(a.cue).not.toHaveBeenCalled();
  });

  it('registers NOTHING when the pack script never loaded', async () => {
    const a = makeSdk();
    const mod = await freshAudio({ Arcade: { audio: a } });

    mod.initAudio();

    expect(mod.isGraphMode()).toBe(false);
    expect(a.graph).not.toHaveBeenCalled();
    expect(a.cue).not.toHaveBeenCalled();
  });

  it('every wrapper is a safe no-op with nothing registered', async () => {
    const a = makeSdk({ graphable: false });
    const mod = await freshAudio({ Arcade: { audio: a }, ArcadeSoundPack: makePack() });

    mod.initAudio();

    expect(() => mod.sfx('ui-click')).not.toThrow();
    expect(() => mod.startBench(0.5)).not.toThrow();
    expect(() => mod.stopBench()).not.toThrow();
    expect(a.play).not.toHaveBeenCalled();
    expect(a.start).not.toHaveBeenCalled();
  });

  it('every wrapper is a safe no-op with no SDK at all', async () => {
    const mod = await freshAudio(undefined);

    expect(() => mod.initAudio()).not.toThrow();
    expect(() => mod.sfx('ui-click')).not.toThrow();
    expect(() => mod.startBench()).not.toThrow();
    expect(() => mod.stopBench()).not.toThrow();
  });
});
