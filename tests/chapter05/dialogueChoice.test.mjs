import assert from 'node:assert/strict';
import test from 'node:test';
import { DialogueSystem } from '../../src/chapters/museum3d/systems/DialogueSystem.js';

function createDialogue() {
  return new DialogueSystem({ style: {}, innerHTML: '' });
}

test('radio choices accept a numbered reply and continue with its exchange', () => {
  const dialogue = createDialogue();
  dialogue.offerChoice({
    prompt: 'Reply?',
    options: [
      { label: 'One', lines: [{ speaker: 'BUTCH', text: 'One.' }] },
      { label: 'Two', lines: [{ speaker: 'BUTCH', text: 'Two.' }] },
    ],
  });
  assert.equal(dialogue.isChoosing, true);
  assert.deepEqual(dialogue.choiceState.options, ['One', 'Two']);
  assert.equal(dialogue.choose(1), true);
  assert.equal(dialogue.isChoosing, false);
  assert.equal(dialogue.isPlaying, true);
  assert.match(dialogue.el.innerHTML, /Two\./);
});

test('walking silently is valid and closes the choice after its timer', () => {
  const dialogue = createDialogue();
  dialogue.offerChoice({
    prompt: 'Reply?',
    timeout: 2,
    options: [{ label: 'Answer', lines: [] }],
    silenceLines: [{ speaker: 'ARCHIVIST', text: 'No need to answer.' }],
  });
  dialogue.update(2.1);
  assert.equal(dialogue.isChoosing, false);
  assert.match(dialogue.el.innerHTML, /No need to answer/);
});

test('E-style advance cannot accidentally choose a radio reply', () => {
  const dialogue = createDialogue();
  dialogue.offerChoice({ prompt: 'Reply?', options: [{ label: 'Answer', lines: [] }] });
  dialogue.advance();
  assert.equal(dialogue.isChoosing, true);
});
