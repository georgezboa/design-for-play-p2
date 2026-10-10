// Alpha round 4 (P1): a page's music is tried at once; only a refused
// autoplay waits for the first gesture, with a "♪ CLICK FOR SOUND" tag.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { SOUND_TAG_TEXT, attemptPlay, createAutoplayGate, isAutoplayRefusal } from '../src/shared/autoplayGate.js';

const refusal = () => Object.assign(new Error('play() needs a gesture'), { name: 'NotAllowedError' });
const abort = () => Object.assign(new Error('interrupted'), { name: 'AbortError' });

describe('autoplay gate', () => {
  it('plays at once when the browser allows it', async () => {
    const gate = createAutoplayGate();
    assert.equal(await attemptPlay(gate, () => Promise.resolve()), 'playing');
    assert.equal(gate.state, 'allowed');
    assert.equal(gate.canAttempt(), true);
  });

  it('falls back to the first gesture only on a NotAllowedError', async () => {
    const events = [];
    const gate = createAutoplayGate({ onBlocked: () => events.push('blocked'), onUnlocked: () => events.push('unlocked') });
    assert.equal(await attemptPlay(gate, () => Promise.reject(abort())), 'failed');
    assert.equal(gate.state, 'unknown', 'an abort is not an autoplay refusal');
    assert.equal(await attemptPlay(gate, () => Promise.reject(refusal())), 'blocked');
    assert.equal(gate.state, 'blocked');
    assert.equal(gate.canAttempt(), false);
    assert.equal(await attemptPlay(gate, () => Promise.resolve()), 'waiting', 'nothing is tried again before a gesture');
    assert.equal(gate.gesture(), true);
    assert.equal(gate.state, 'allowed');
    assert.deepEqual(events, ['blocked', 'unlocked']);
  });

  it('a stale refusal (an attempt from before the gesture) never re-blocks; a fresh one does (Safari, round 11)', async () => {
    const gate = createAutoplayGate();
    gate.gesture(100);
    assert.equal(gate.rejected(refusal(), 50), false);
    assert.equal(gate.state, 'allowed');
    assert.equal(gate.rejected(refusal()), false, 'no attempt time: treated as stale');
    assert.equal(gate.rejected(abort(), 200), false);
    assert.equal(gate.rejected(refusal(), 200), true);
    assert.equal(gate.state, 'blocked');
    gate.gesture(300);
    assert.equal(gate.state, 'allowed');
    assert.equal(isAutoplayRefusal(refusal()), true);
    assert.equal(isAutoplayRefusal(abort()), false);
    assert.equal(SOUND_TAG_TEXT, '♪ CLICK FOR SOUND');
  });
});

// The director itself, in a fake DOM: music.play() makes an Audio element and
// calls play() straight away (no gesture), and a refusal shows the tag and
// replays the call on the first key.
describe('music director autoplay', () => {
  it('requests the track on load, and on refusal waits for a gesture with the tag shown', async () => {
    const saved = Object.fromEntries(['window', 'document', 'Audio', 'requestAnimationFrame'].map((key) => [key, globalThis[key]]));
    const listeners = new Map();
    const body = { children: [], append(node) { this.children.push(node); } };
    const created = [];
    let allow = false;
    globalThis.window = {
      addEventListener(type, fn) { (listeners.get(type) ?? listeners.set(type, []).get(type)).push(fn); },
      BroadcastChannel: null,
    };
    globalThis.document = {
      body,
      visibilityState: 'visible',
      hasFocus: () => true,
      addEventListener() {},
      createElement: () => ({ style: {}, dataset: {}, hidden: false, setAttribute() {} }),
    };
    globalThis.requestAnimationFrame = () => 0;
    globalThis.Audio = class {
      constructor(src) { this.src = src; this.paused = true; this.volume = 0; this.dataset = {}; created.push(this); }
      play() { if (!allow) return Promise.reject(refusal()); this.paused = false; return Promise.resolve(); }
      pause() { this.paused = true; }
      addEventListener() {}
    };
    try {
      const { music } = await import('../src/shared/musicDirector.js?autoplay-test');
      music.play('ending', { src: '/assets/music/credits.mp3' });
      assert.ok(created.some((a) => a.src === '/assets/music/credits.mp3'), 'the track is requested on page load, before any gesture');
      await new Promise((resolve) => setTimeout(resolve, 0));
      let qa = music.qa();
      assert.equal(qa.autoplay, 'blocked');
      assert.equal(qa.waitingForGesture, true);
      assert.equal(qa.soundTag, true);
      assert.equal(body.children[0]?.textContent, '♪ CLICK FOR SOUND');
      allow = true;
      listeners.get('keydown').forEach((fn) => fn({}));
      await new Promise((resolve) => setTimeout(resolve, 0));
      qa = music.qa();
      const playing = created.filter((a) => !a.paused && a.src === '/assets/music/credits.mp3');
      assert.equal(playing.length, 1, 'the gesture replays the pending call');
      assert.equal(qa.playing, true);
      assert.equal(qa.autoplay, 'allowed');
      assert.equal(qa.soundTag, false);
      // Allowed from now on: the next track plays without a gesture.
      music.play('next', { src: '/assets/music/next.mp3' });
      await new Promise((resolve) => setTimeout(resolve, 0));
      assert.equal(music.qa().id, 'next');
      assert.ok(created.some((a) => a.src === '/assets/music/next.mp3' && !a.paused));
      // Safari (round 11): the director reuses a small pool of elements the gestures unlocked
      assert.ok(created.length <= 4, `pooled elements, not one per track (${created.length})`);
    } finally {
      Object.entries(saved).forEach(([key, value]) => { globalThis[key] = value; });
    }
  });
});
