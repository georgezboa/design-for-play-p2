import assert from 'node:assert/strict';
import { it } from 'node:test';

it('pauses a game page on blur and lets the next focused gesture reclaim audio', async () => {
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
    windowListeners.get('blur')();
    assert.equal(audioFocus.isActive(), false);
    windowListeners.get('pointerdown')();
    assert.equal(audioFocus.isActive(), true);
    assert.deepEqual(events, ['pause', 'resume']);
  } finally {
    globalThis.window = originalWindow;
    globalThis.document = originalDocument;
  }
});
