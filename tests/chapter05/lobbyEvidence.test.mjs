import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../../src/chapters/museum3d/scenes/ServiceLobby.js', import.meta.url), 'utf8');

test('the lobby uses the axe, central vitrine and a single broken front pane for the Black Knife stone', () => {
  assert.match(source, /FIRE AXE/);
  assert.match(source, /E — TAKE/);
  assert.match(source, /TAKE THE FIRE AXE/);
  assert.match(source, /this\.blackKnifeCase = this\.centralCase/);
  assert.match(source, /IcosahedronGeometry\(0\.13, 1\)/);
  assert.match(source, /BREAK THE LONG SIDE GLASS/);
  assert.match(source, /atBlackKnifeLongSide/);
  assert.match(source, /setFallback\(/);
  assert.match(source, /showWhenInactive: true/);
  assert.match(source, /tryBreakBlackKnifeGlass\(\)/);
  assert.match(source, /blackKnifeLongSideGlass\.visible = false/);
  assert.match(source, /CLICK — TAKE THE BLACK KNIFE STONE/);
  assert.match(source, /pointerOnly: true/);
  assert.match(source, /glassShardEvidence\.visible = true/);
  assert.match(source, /fireAxeProxy\.visible = false/);
  assert.doesNotMatch(source, /this\.fireAxeEvidence\.visible = false/);
  assert.match(source, /offerMagicStone\('black-knife'\)/);
  assert.match(source, /glass-shard-\$\{index \+ 1\}/);
  assert.doesNotMatch(source, /wall-case-b/);
});
