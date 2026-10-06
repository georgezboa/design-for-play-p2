// Alpha round 4 fix round (P2, round-4 regression): with autoplay blocked,
// Chapter 1 stayed silent with no tag until the first click. It now shows the
// shared "♪ CLICK FOR SOUND" tag (musicDirector.setSoundTagVisible) like
// Chapter 2 and the true ending, and the first key or click starts the synth
// bus and the loop.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

import { createNightServiceAudio } from '../../src/chapters/nightService/audio.js';

const refusal = () => Object.assign(new Error('play() needs a gesture'), { name: 'NotAllowedError' });
const tick = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms));

// A Web Audio stand-in: every node connects, every param schedules.
function fakeNode() {
  const param = () => ({ value: 0, setValueAtTime() {}, setTargetAtTime() {}, exponentialRampToValueAtTime() {} });
  return {
    gain: param(), frequency: param(), Q: param(), threshold: param(), ratio: param(),
    connect() {}, start() {}, stop() {}, buffer: null, loop: false, type: '',
  };
}

function installFakeBrowser({ autoplay }) {
  const saved = Object.fromEntries(['document', 'AudioContext', 'Audio', 'addEventListener', 'removeEventListener', 'NIGHTFALL_SETTINGS']
    .map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  const listeners = new Map();
  const audios = [];
  globalThis.document = {};
  globalThis.addEventListener = (type, fn) => { (listeners.get(type) ?? listeners.set(type, new Set()).get(type)).add(fn); };
  globalThis.removeEventListener = (type, fn) => { listeners.get(type)?.delete(fn); };
  const gesture = { active: false };
  globalThis.AudioContext = class {
    constructor() { this.state = autoplay ? 'running' : 'suspended'; this.currentTime = 0; this.sampleRate = 8000; this.destination = {}; }
    // Chrome keeps resume() pending until the page has a user gesture.
    resume() { if (autoplay || gesture.active) { this.state = 'running'; return Promise.resolve(); } return new Promise(() => {}); }
    createGain() { return fakeNode(); }
    createDynamicsCompressor() { return fakeNode(); }
    createBufferSource() { return fakeNode(); }
    createBiquadFilter() { return fakeNode(); }
    createOscillator() { return fakeNode(); }
    createBuffer(_channels, length) { return { getChannelData: () => new Float32Array(length) }; }
  };
  globalThis.Audio = class {
    constructor(src) { this.src = src; this.paused = true; this.loop = false; this.volume = 0; this.dataset = {}; audios.push(this); }
    play() {
      if (!autoplay && !gesture.active) return Promise.reject(refusal());
      this.paused = false;
      return Promise.resolve();
    }
    pause() { this.paused = true; }
  };
  const fire = (type) => {
    gesture.active = true;
    for (const fn of [...(listeners.get(type) ?? [])]) fn({ type });
  };
  const restore = () => {
    for (const [key, descriptor] of Object.entries(saved)) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  };
  return { listeners, audios, fire, restore };
}

describe('Chapter 1 · click for sound', () => {
  it('shows the shared tag while autoplay is refused, and the first click starts the sound', async () => {
    const browser = installFakeBrowser({ autoplay: false });
    const tag = [];
    try {
      const audio = createNightServiceAudio({ soundTag: (visible) => tag.push(visible), settleMs: 20 });
      await tick(5);
      assert.equal(audio.autoplay, 'blocked', 'the loop\'s play() was refused');
      assert.deepEqual(tag, [true], 'the tag shows at once, before any click');
      assert.equal(audio.unlocked, false);
      assert.equal(browser.audios.length, 1, 'the loop was requested on load');
      assert.equal(browser.listeners.get('pointerdown')?.size, 1, 'any click anywhere (the tag too) unlocks');
      // The tag is a DOM button above the canvas, so the scene never sees
      // that click: the page-level listener must start the sound itself.
      browser.fire('pointerdown');
      await tick(5);
      assert.equal(audio.unlocked, true);
      assert.equal(audio.autoplay, 'allowed');
      assert.deepEqual(tag, [true, false], 'the tag goes on the first click');
      assert.equal(browser.audios[0].paused, false, 'the loop plays');
      assert.equal(browser.listeners.get('pointerdown')?.size ?? 0, 0, 'the gesture listener is removed');
      await tick(30);
      assert.deepEqual(tag, [true, false], 'the settle timer never brings it back');
      audio.destroy();
    } finally {
      browser.restore();
    }
  });

  it('with autoplay allowed, starts at once and never shows the tag', async () => {
    const browser = installFakeBrowser({ autoplay: true });
    const tag = [];
    try {
      const audio = createNightServiceAudio({ soundTag: (visible) => tag.push(visible), settleMs: 20 });
      await tick(30);
      assert.equal(audio.unlocked, true);
      assert.equal(audio.autoplay, 'allowed');
      assert.deepEqual(tag, []);
      assert.equal(browser.audios[0].paused, false);
      audio.destroy();
    } finally {
      browser.restore();
    }
  });

  it('with the music loop off, a context still suspended after the settle time counts as refused', async () => {
    const browser = installFakeBrowser({ autoplay: false });
    const tag = [];
    try {
      const audio = createNightServiceAudio({ music: false, soundTag: (visible) => tag.push(visible), settleMs: 15 });
      await tick(5);
      assert.deepEqual(tag, [], 'no verdict before the settle time');
      await tick(30);
      assert.equal(audio.autoplay, 'blocked');
      assert.deepEqual(tag, [true]);
      // The scene's own first input (PanelScene.userInput → unlock) also clears it.
      audio.unlock();
      assert.equal(audio.unlocked, true);
      assert.deepEqual(tag, [true, false]);
      audio.destroy();
    } finally {
      browser.restore();
    }
  });

  it('uses the shared tag, not a page-local copy', () => {
    const source = readFileSync(new URL('../../src/chapters/nightService/audio.js', import.meta.url), 'utf8');
    assert.match(source, /import \{ setSoundTagVisible \} from '\.\.\/\.\.\/shared\/musicDirector\.js';/);
    assert.match(source, /import \{ attemptPlay, createAutoplayGate \} from '\.\.\/\.\.\/shared\/autoplayGate\.js';/);
    assert.doesNotMatch(source, /CLICK FOR SOUND'/, 'the text lives in autoplayGate.js only');
  });
});
