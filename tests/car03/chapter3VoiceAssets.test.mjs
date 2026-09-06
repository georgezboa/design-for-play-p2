import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  CHAPTER03_VOICE_ASSET_COUNT,
  chapter03VoiceAssetFor,
} from '../../src/cars/presentCity3d/generated/chapter03VoiceAssets.js';
import {
  CHAPTER3_AMBIENT_VOICE_LINES,
  CHAPTER3_DYNAMIC_VOICE_LINES,
} from '../../src/cars/presentCity3d/Chapter3OpeningRuntime.js';

describe('Chapter 3 generated voice assets', () => {
  it('ships the complete locked Chapter 3 voice pass', () => {
    assert.equal(CHAPTER03_VOICE_ASSET_COUNT, 669);
  });

  it('voices every ambient and environment interaction line', () => {
    for (const line of CHAPTER3_AMBIENT_VOICE_LINES) {
      assert.ok(
        chapter03VoiceAssetFor(line.speaker, line.text),
        `missing ambient voice: ${line.speaker}: ${line.text}`,
      );
    }
  });

  it('voices every runtime-generated arrival and navigation line', () => {
    for (const line of CHAPTER3_DYNAMIC_VOICE_LINES) {
      assert.ok(
        chapter03VoiceAssetFor(line.speaker, line.text),
        `missing dynamic voice: ${line.speaker}: ${line.text}`,
      );
    }
  });

  it('maps an exact speaker and subtitle to its runtime file', () => {
    assert.deepEqual(
      chapter03VoiceAssetFor('BUTCH', 'The legend uses three different marks for oil. What is the difference?'),
      {
        lineId: 'CH03_BUTCH_0001',
        url: './assets/chapter03-3d/voice/ch03/butch/CH03_BUTCH_0001.ogg',
      },
    );
  });

  it('leaves unvoiced interface text silent', () => {
    assert.equal(chapter03VoiceAssetFor('CHOOSE', 'Why continue?'), null);
  });

  it('maps revised arrival dialogue to newly generated audio', () => {
    assert.deepEqual(
      chapter03VoiceAssetFor('CONDUCTOR', 'Official inquiry? Then make it brief. This service is leaving.'),
      {
        lineId: 'CH03_CONDUCTOR_0008',
        url: './assets/chapter03-3d/voice/ch03/conductor/CH03_CONDUCTOR_0008.ogg',
      },
    );
  });

  it('keys provider-normalized speech by the exact displayed subtitle', () => {
    assert.deepEqual(
      chapter03VoiceAssetFor('BUTCH', 'Central Square maintenance request C-441. We also need the original plan for the announcement grooves.'),
      {
        lineId: 'CH03_BUTCH_0003',
        url: './assets/chapter03-3d/voice/ch03/butch/CH03_BUTCH_0003.ogg',
      },
    );
  });

  it('maps representative environment speakers and observations', () => {
    assert.deepEqual(
      chapter03VoiceAssetFor('BUTCH', 'A repair date is scratched into the base. Three winters ago.'),
      {
        lineId: 'CH03_BUTCH_0282',
        url: './assets/chapter03-3d/voice/ch03/butch/CH03_BUTCH_0282.ogg',
      },
    );
    assert.equal(chapter03VoiceAssetFor('VENDOR', 'Buying something, or only asking after the woman in the photograph?')?.lineId, 'CH03_VENDOR_0001');
    assert.equal(chapter03VoiceAssetFor('VOICE BEHIND DOOR', 'Wrong room.')?.lineId, 'CH03_VOICE_BEHIND_DOOR_0001');
    assert.equal(
      chapter03VoiceAssetFor('LEV', 'We have walked past it twice. The Transport Ministry is northeast of here — the tall stone front with the recessed doors.')?.lineId,
      'CH03_LEV_0171',
    );
  });

  it('retries an autoplay-blocked current subtitle on the next user gesture', async () => {
    const originalAudio = globalThis.Audio;
    const originalWindow = globalThis.window;
    const listeners = new Map();
    class FakeAudio {
      constructor() {
        this.duration = Number.NaN;
        this.playCalls = 0;
        this.listeners = new Map();
      }
      addEventListener(type, listener) { this.listeners.set(type, listener); }
      pause() {}
      play() {
        this.playCalls += 1;
        return this.playCalls === 1 ? Promise.reject(new Error('autoplay blocked')) : Promise.resolve();
      }
    }
    globalThis.Audio = FakeAudio;
    globalThis.window = {
      addEventListener(type, listener) { listeners.set(type, listener); },
    };
    try {
      const { Chapter3VoicePlayback } = await import('../../src/cars/presentCity3d/Chapter3VoicePlayback.js?retry-test');
      const voice = new Chapter3VoicePlayback();
      assert.equal(voice.play({
        speaker: 'BUTCH',
        text: 'The legend uses three different marks for oil. What is the difference?',
      }), true);
      await new Promise((resolve) => setImmediate(resolve));
      assert.ok(voice.pendingRetry, 'the current subtitle should stay armed after autoplay rejection');
      listeners.get('pointerdown')();
      await new Promise((resolve) => setImmediate(resolve));
      assert.equal(voice.audio.playCalls, 2);
      assert.equal(voice.pendingRetry, null);
    } finally {
      globalThis.Audio = originalAudio;
      globalThis.window = originalWindow;
    }
  });
});
