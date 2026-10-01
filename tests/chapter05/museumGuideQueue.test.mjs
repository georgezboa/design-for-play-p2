import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { DialogueSystem } from '../../src/chapters/museum3d/systems/DialogueSystem.js';
import { AudioGuide } from '../../src/chapters/museum3d/systems/AudioGuide.js';
import { LOBBY_GUIDE_LINES, ServiceLobby } from '../../src/chapters/museum3d/scenes/ServiceLobby.js';

const lobbySource = await readFile(new URL('../../src/chapters/museum3d/scenes/ServiceLobby.js', import.meta.url), 'utf8');

function rig() {
  const dialogue = new DialogueSystem({ style: {}, innerHTML: '' });
  const audioGuide = new AudioGuide(dialogue);
  audioGuide.receiverClick = () => {};
  const lobby = Object.create(ServiceLobby.prototype);
  lobby.ctx = { dialogue, audioGuide, model: { getSnapshot: () => ({ labyrinth: {}, exhibit: {} }) } };
  return { dialogue, audioGuide, lobby };
}

function pendingTexts(dialogue) {
  return [dialogue.currentLine?.text, ...dialogue._queue.map((line) => line.text)].filter(Boolean);
}

test('R3-3: pressing E at the guide pedestal advances its caption instead of queueing the welcome again', () => {
  const { dialogue, lobby } = rig();
  const [first, second] = LOBBY_GUIDE_LINES.welcome;
  lobby.playWelcome();
  assert.deepEqual(pendingTexts(dialogue), [first, second]);
  assert.equal(lobby.listenToGuide(), 'advanced');
  assert.deepEqual(pendingTexts(dialogue), [second]);
  for (let i = 0; i < 10; i += 1) lobby.listenToGuide();
  assert.equal(dialogue.isPlaying, false, 'mashing E never piles up guide lines');
  // Once quiet, the pedestal plays the welcome once more, not twice.
  assert.equal(lobby.listenToGuide(), 'spoke');
  assert.deepEqual(pendingTexts(dialogue), [first, second]);
});

test('R3-3: the axe line is heard at once, not behind the Archivist', () => {
  const { dialogue, lobby } = rig();
  lobby.playWelcome();
  const axe = 'The axe is still sharp. The long south pane of the central case would give.';
  dialogue.play([{ speaker: null, text: axe }], { replace: true });
  assert.equal(dialogue.currentLine.text, axe);
  assert.equal(dialogue._queue.length, 0);
  assert.match(lobbySource, /text: 'The axe is still sharp\.[^']*' \}\], \{ replace: true \}\)/);
  assert.match(lobbySource, /action: \(\) => this\.listenToGuide\(\)/);
});

test('R3-3: replace keeps a pending onComplete and never interrupts a radio choice', () => {
  const dialogue = new DialogueSystem({ style: {}, innerHTML: '' });
  const calls = [];
  dialogue.play([{ speaker: 'A', text: 'one' }, { speaker: 'A', text: 'two' }], { onComplete: () => calls.push('first') });
  dialogue.play([{ speaker: 'B', text: 'three' }], { replace: true, onComplete: () => calls.push('second') });
  assert.deepEqual(pendingTexts(dialogue), ['three']);
  dialogue.advance();
  assert.deepEqual(calls, ['first', 'second']);

  dialogue.offerChoice({ prompt: 'Reply?', options: [{ label: 'Yes', lines: [] }] });
  dialogue.play([{ speaker: 'B', text: 'four' }], { replace: true });
  assert.equal(dialogue.isChoosing, true);
});
