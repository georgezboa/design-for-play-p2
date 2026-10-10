// Round 11 (Safari): sound that starts after the click that asked for it.
// WebKit unlocks sound per <audio> element and per AudioContext, so every
// key or click unlocks a small pool of elements (and resumes one shared
// context) that the music director and the cutscenes then use.
import assert from 'node:assert/strict';
import { it } from 'node:test';

it('a gesture unlocks the pool; tracks reuse unlocked elements; the shared context resumes unless a pause holds it', async () => {
  const saved = Object.fromEntries(['window', 'Audio', 'AudioContext'].map((key) => [key, globalThis[key]]));
  const listeners = new Map();
  const made = [];
  let contexts = 0;
  globalThis.window = { addEventListener(type, fn, opts) { (listeners.get(type) ?? listeners.set(type, []).get(type)).push({ fn, opts }); } };
  globalThis.Audio = class {
    constructor() { this.src = ''; this.paused = true; this.volume = 1; made.push(this); }
    play() { this.paused = false; return Promise.resolve(); }
    pause() { this.paused = true; }
    removeAttribute(name) { if (name === 'src') this.src = ''; }
    load() {}
  };
  globalThis.AudioContext = class {
    constructor() { contexts += 1; this.state = 'suspended'; }
    resume() { this.state = 'running'; return Promise.resolve(); }
    suspend() { this.state = 'suspended'; return Promise.resolve(); }
  };
  try {
    const m = await import('../src/shared/audioUnlock.js?unlock-test');
    for (const type of ['pointerdown', 'keydown', 'touchend']) {
      assert.ok(listeners.get(type)?.every((l) => l.opts?.capture === true), `${type}: captured before page handlers`);
    }
    assert.equal(m.audioPoolState().length, 0);
    let hooked = 0;
    m.onUserGesture(() => { hooked += 1; });
    listeners.get('keydown')[0].fn({ isTrusted: true });
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(m.audioPoolState().length, m.POOL_SIZE);
    assert.ok(m.audioPoolState().every((p) => p.unlocked && !p.busy), 'every idle element played its silent clip');
    assert.ok(made.every((a) => a.paused), 'and stopped again');
    assert.equal(hooked, 1);
    const ctx = m.sharedAudioContext();
    assert.equal(contexts, 1);
    assert.equal(ctx.state, 'running');
    // tracks take unlocked elements and give them back
    const a = m.acquireAudio();
    const b = m.acquireAudio();
    assert.notEqual(a, b);
    assert.ok(made.includes(a) && made.includes(b));
    m.releaseAudio(a);
    assert.equal(m.acquireAudio(), a, 'a released element is reused');
    // a paused cutscene holds the context: a click in the pause menu does not resume it
    m.holdSharedContext(true);
    assert.equal(ctx.state, 'suspended');
    listeners.get('pointerdown')[0].fn({ isTrusted: true });
    assert.equal(ctx.state, 'suspended');
    m.holdSharedContext(false);
    assert.equal(ctx.state, 'running');
    // synthetic events are not gestures
    listeners.get('keydown')[0].fn({ isTrusted: false });
    assert.equal(hooked, 2);
  } finally {
    Object.entries(saved).forEach(([key, value]) => { globalThis[key] = value; });
  }
});
