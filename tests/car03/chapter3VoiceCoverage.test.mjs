// Chapter 3's voice coverage (2026-10-11). George heard some lines voiced
// and the next silent: the script changed after the August voice pass. Every
// spoken line now has a recording or is on the pass-2 sheet
// (scripts/voice/ch03-pass2.json, recorded by George on ElevenLabs and
// integrated by scripts/voice/integrate_ch03_pass2.py). A new or reworded
// line that is neither fails here, so the gap cannot reopen unseen.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { chapter03VoiceAssetFor } from '../../src/cars/presentCity3d/generated/chapter03VoiceAssets.js';

const MODULES = ['chapter3OpeningContent.js', 'chapter3LongWalks.js', 'chapter3EndingContent.js', 'chapter3Alighting.js', 'chapter3Guidance.js', 'Chapter3TicketBoard.js'];
const batch = JSON.parse(fs.readFileSync(new URL('../../scripts/voice/ch03-pass2.json', import.meta.url), 'utf8'));

async function spokenLines() {
  const seen = new Map();
  const visit = (v, depth = 0) => {
    if (!v || depth > 8) return;
    if (typeof v === 'function') { if (v.length === 0) { try { visit(v(), depth + 1); } catch { /* needs arguments */ } } return; }
    if (Array.isArray(v)) { v.forEach((x) => visit(x, depth + 1)); return; }
    if (typeof v !== 'object') return;
    if (typeof v.speaker === 'string' && typeof v.text === 'string' && v.speaker !== 'CHOOSE') seen.set(`${v.speaker}\0${v.text}`, { speaker: v.speaker, text: v.text });
    Object.values(v).forEach((x) => visit(x, depth + 1));
  };
  for (const name of MODULES) {
    const mod = await import(`../../src/cars/presentCity3d/${name}`);
    Object.values(mod).forEach((v) => visit(v));
  }
  return [...seen.values()];
}

test('every spoken Chapter 3 line has a recording or is on the pass-2 sheet', async () => {
  const lines = await spokenLines();
  assert.ok(lines.length > 90, `found ${lines.length} lines`);
  const silent = new Set(batch.silent);
  const sheet = new Set(batch.items.map((i) => `${i.speaker}\0${i.text}`));
  const unaccounted = lines.filter((l) => !silent.has(l.speaker) && !chapter03VoiceAssetFor(l.speaker, l.text) && !sheet.has(`${l.speaker}\0${l.text}`));
  assert.deepEqual(unaccounted.map((l) => `${l.speaker}: ${l.text}`), []);
});

test('the pass-2 sheet lists only lines still in the game, each with a new line id and a reference voice', async () => {
  const lines = new Set((await spokenLines()).map((l) => `${l.speaker}\0${l.text}`));
  const ids = new Set();
  for (const item of batch.items) {
    assert.ok(lines.has(`${item.speaker}\0${item.text}`), `${item.lineId} is no longer in the game: ${item.text}`);
    assert.match(item.lineId, new RegExp(`^CH03_${item.speaker.replace(/ /g, '_')}_\\d{4}$`));
    assert.ok(!ids.has(item.lineId), `${item.lineId} twice`);
    ids.add(item.lineId);
    assert.ok(batch.references[item.speaker], `${item.speaker} has a reference clip`);
    // once integrated, its recording is this very line (an id is never reused for another text)
    const recorded = chapter03VoiceAssetFor(item.speaker, item.text);
    if (recorded) assert.equal(recorded.lineId, item.lineId);
    assert.ok(!['NARRATION', 'GROUND LETTERS'].includes(item.speaker));
  }
  assert.deepEqual(batch.items.map((i) => i.n), batch.items.map((_, k) => k + 1));
});
