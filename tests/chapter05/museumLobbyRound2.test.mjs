import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { FIRST_OBJECTIVE, LobbyObjectiveTag } from '../../src/chapters/museum3d/systems/LobbyObjective.js';
import { ServiceLobby } from '../../src/chapters/museum3d/scenes/ServiceLobby.js';

const html = readFileSync(new URL('../../museum-3d.html', import.meta.url), 'utf8');
const app = readFileSync(new URL('../../src/chapters/museum3d/Museum3DApp.js', import.meta.url), 'utf8');

function fakeDocument() {
  const el = {
    style: {},
    hidden: false,
    innerHTML: '',
    className: '',
    setAttribute() {},
  };
  return { el, doc: { createElement: () => el, body: { append() {} } } };
}

test('N2: the objective tag really leaves the screen (inline display, not just [hidden])', () => {
  const { el, doc } = fakeDocument();
  const tag = new LobbyObjectiveTag(doc);
  assert.equal(el.style.display, 'none', 'starts off screen');
  tag.update(FIRST_OBJECTIVE);
  assert.equal(el.style.display, '');
  assert.equal(tag.visible, true);
  // The one-answer exhibit opens: the frame loop passes null.
  tag.update(null);
  assert.equal(el.hidden, true);
  assert.equal(el.style.display, 'none', '.nf-tag display:inline-flex would otherwise beat [hidden]');
  assert.equal(tag.visible, false);
  tag.update(FIRST_OBJECTIVE, { hidden: true });
  assert.equal(el.style.display, 'none');
  assert.match(html, /\.museum-objective\[hidden\] \{ display: none; \}/);
});

test('museum perf: the HUD drops filters and animations under LOW GRAPHICS and the museum low tier', () => {
  for (const hook of [":root[data-low-graphics='true']", ":root[data-museum-quality='low']"]) {
    assert.ok(html.includes(`${hook} .nf-tag { filter: none; transition: none; }`) || html.includes(`${hook} .nf-tag,`), hook);
    assert.ok(html.includes(`${hook} .nf-tag::after`), hook);
  }
  assert.match(html, /\.nf-tag::after \{ animation: none; box-shadow: none; \}/);
  assert.match(html, /\.nf-tag \{ filter: none; transition: none; \}/);
  assert.match(app, /document\.documentElement\.dataset\.museumQuality = tier/);
});

function lobbyAt(x, z) {
  const lobby = Object.create(ServiceLobby.prototype);
  lobby.fireAxeTaken = true;
  lobby.blackKnifeGlassBroken = false;
  lobby.ctx = {
    controller: { position: { x, z } },
    model: { getSnapshot: () => ({ phase: 'lobby' }) },
  };
  return lobby;
}

test('R3-4: the south pane offers E only within the axe\'s reach; farther away it says step closer', () => {
  const near = lobbyAt(1.5, 2.2);
  assert.equal(near.canBreakBlackKnifeGlass(), true);
  assert.equal(near.blackKnifeGlassPrompt(), 'E · BREAK THE SOUTH PANE');
  const far = lobbyAt(1.5, 4.6);
  assert.equal(far.canBreakBlackKnifeGlass(), false);
  assert.equal(far.blackKnifeGlassPrompt(), 'STEP CLOSER TO THE SOUTH PANE');
  assert.doesNotMatch(far.blackKnifeGlassPrompt(), /^E\s·/, 'no key offered where the key does nothing');
});
