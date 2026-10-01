import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FIRST_OBJECTIVE, lobbyObjective } from '../../src/chapters/museum3d/systems/LobbyObjective.js';

// Alpha round 1: entering Room 101, nothing on screen said what to do once
// the Archivist's welcome had faded. A paper tag names the first job.

test('the lobby names its first job until the pending case is opened', () => {
  const lobby = { phase: 'lobby', exhibit: { solved: false } };
  assert.equal(lobbyObjective(lobby), FIRST_OBJECTIVE);
  assert.match(FIRST_OBJECTIVE, /PENDING CASE/);
  assert.match(FIRST_OBJECTIVE, /<kbd>E<\/kbd>/, 'E, the museum\'s one act key');
  assert.equal(lobbyObjective(lobby, { welcomeDone: false }), null, 'not over the welcome');
  assert.equal(lobbyObjective(lobby, { opened: true }), null);
  assert.equal(lobbyObjective({ phase: 'lobby', exhibit: { solved: true } }), null);
  assert.equal(lobbyObjective({ phase: 'corridor', exhibit: { solved: false } }), null);
  assert.equal(lobbyObjective(null), null);
});

test('the tag uses the shared paper-tag style and steps aside for frames, cards and the pause', () => {
  const app = readFileSync(new URL('../../src/chapters/museum3d/Museum3DApp.js', import.meta.url), 'utf8');
  const tag = readFileSync(new URL('../../src/chapters/museum3d/systems/LobbyObjective.js', import.meta.url), 'utf8');
  assert.match(tag, /nf-tag museum-objective/);
  assert.match(app, /this\.cards\.isOpen \|\| this\.directionExhibit\.opened/);
  assert.equal((app.match(/this\.objective\.update\(null\)/g) ?? []).length, 2, 'hidden under the frame and the pause');
});
