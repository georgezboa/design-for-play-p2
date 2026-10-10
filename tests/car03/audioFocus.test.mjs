import assert from 'node:assert/strict';
import { it } from 'node:test';

it('keeps playing when only unfocused (round 11), pauses when hidden, and focus or a gesture reclaims audio', async () => {
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  const windowListeners = new Map();
  const documentListeners = new Map();
  globalThis.document = {
    visibilityState: 'visible',
    hasFocus: () => true,
    addEventListener(type, listener) { documentListeners.set(type, listener); },
  };
  globalThis.window = {
    addEventListener(type, listener) { windowListeners.set(type, listener); },
  };
  try {
    const { audioFocus } = await import('../../src/shared/audioFocus.js?focus-test');
    const events = [];
    audioFocus.subscribe({ pause: () => events.push('pause'), resume: () => events.push('resume') });
    assert.equal(windowListeners.has('blur'), false, 'losing focus alone does not pause');
    assert.equal(audioFocus.isActive(), true);
    globalThis.document.visibilityState = 'hidden';
    documentListeners.get('visibilitychange')();
    assert.equal(audioFocus.isActive(), false);
    globalThis.document.visibilityState = 'visible';
    windowListeners.get('pointerdown')();
    assert.equal(audioFocus.isActive(), true);
    windowListeners.get('pagehide')();
    assert.equal(audioFocus.isActive(), false);
    windowListeners.get('focus')();
    assert.equal(audioFocus.isActive(), true);
    assert.deepEqual(events, ['pause', 'resume', 'pause', 'resume']);
  } finally {
    globalThis.window = originalWindow;
    globalThis.document = originalDocument;
  }
});
