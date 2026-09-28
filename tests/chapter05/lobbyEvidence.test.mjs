import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { BLACK_TICKET_STONE, HOUSE_RULES_CARD, LOBBY_GUIDE_LINES, REGISTER_CARD } from '../../src/chapters/museum3d/scenes/ServiceLobby.js';
import { MAGIC_STONES } from '../../src/shell/magicStones.js';

const source = await readFile(new URL('../../src/chapters/museum3d/scenes/ServiceLobby.js', import.meta.url), 'utf8');

test('the Black Ticket stone is small, quiet and tucked behind the pigment vials', () => {
  assert.ok(BLACK_TICKET_STONE.radius <= 0.05, 'smaller than every vial');
  assert.match(source, /IcosahedronGeometry\(BLACK_TICKET_STONE\.radius, 1\)/);
  assert.match(source, /PIGMENT_VIALS = Object\.freeze\(\{ x: 2\.28, z: 0\.9 \}\)/);
  assert.ok(BLACK_TICKET_STONE.z < 0.9, 'behind the vials, seen from the south pane');
  assert.doesNotMatch(source, /blackKnifeStoneLight/, 'no glow: it never announces itself');
  assert.match(source, /offerMagicStone\('black-knife'\)/, 'the code id is unchanged');
  assert.equal(MAGIC_STONES.find(({ id }) => id === 'black-knife').name, 'BLACK TICKET STONE');
  assert.doesNotMatch(source, /BLACK KNIFE STONE|Black Knife stone/);
});

test('the axe opens one pane, then leaves Butch\'s hand', () => {
  assert.match(source, /TAKE THE FIRE AXE/);
  assert.match(source, /BREAK THE SOUTH PANE/);
  assert.match(source, /tryBreakBlackKnifeGlass\(\) \{[\s\S]*?this\.putAxeAway\(\);/);
  assert.match(source, /exit\(\) \{[\s\S]*?this\.fireAxeTaken = false;[\s\S]*?this\.putAxeAway\(\);/, 'an unused axe goes back in its cabinet');
  assert.match(source, /blackKnifeLongSideGlass\.visible = false/);
  assert.match(source, /glassShardEvidence\.visible = true/);
  assert.match(source, /pointerOnly: true/);
});

test('the central case is the pending exhibit; the lost desk replaces it', () => {
  assert.match(source, /OBJECT PENDING CLASSIFICATION/);
  assert.match(source, /openDirection\(CHAPTER05_DIRECTIONS\.ONE_ANSWER\)/);
  assert.match(source, /this\.pendingExhibit\.visible = variant === 'normal'/);
  assert.equal(REGISTER_CARD.title, 'LAST ENTRY — BUTCH');
  assert.match(source, /The telephone keeps ringing\. No one is coming to answer it\./);
  assert.doesNotMatch(source, /TWO WORLDS|INSPECT THE TWO-WORLD DISPLAY|CentralJourneyDisplay|FinalBossPaperAssetLoader/);
});

test('one useful guide line, the house rules, and no dev strings', () => {
  assert.match(LOBBY_GUIDE_LINES.welcome.join(' '), /One door remains open\./);
  assert.match(LOBBY_GUIDE_LINES.exhibitDone.join(' '), /One door remains open/);
  assert.deepEqual(HOUSE_RULES_CARD.lines, ['Every object has one answer.', 'Contradictions are filed as errors.', 'The archive does not issue duplicates.']);
  for (const dev of ['SEQUENCE NOT YET INSTALLED', 'Gate 6', 'CHAPTER 01 · THE LAST TRAIN', 'four independent directions']) {
    assert.ok(!source.includes(dev), dev);
  }
});
