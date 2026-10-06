// Alpha round 1 (2026-09-30), engineer F2: Echo City regressions.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { describe, it } from 'node:test';

import { createQualityMonitor, cheapenMaterial, storedQualityPreference } from '../../src/cars/presentCity3d/chapter3Quality.js';
import { MAX_FRAME_SECONDS, MAX_STEP_SECONDS } from '../../src/cars/presentCity3d/EchoCity3DPreview.js';
import { SCANNER_WORDS } from '../../src/cars/presentCity3d/chapter3OpeningContent.js';

const read = (path) => fs.readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const runtime = read('src/cars/presentCity3d/Chapter3OpeningRuntime.js');
const preview = read('src/cars/presentCity3d/EchoCity3DPreview.js');
const caption = read('src/cars/presentCity3d/Chapter3Caption.js');
const clamp = read('src/cars/presentCity3d/Chapter3BellClamp.js');
const board = read('src/cars/presentCity3d/Chapter3TicketBoard.js');
const field = read('src/cars/presentCity3d/Chapter3ScannerField.js');
const viewer = read('src/cars/presentCity3d/Chapter3EvidenceViewer.js');
const page = read('car03-3d.html');

describe('Chapter 3 alpha fixes (F2)', () => {
  it('A2-1: game time follows the wall clock on a slow GPU; captions read on it too', () => {
    // Alpha round 4: down to 1 fps (was 0.25 s, a 4 fps floor).
    assert.ok(MAX_FRAME_SECONDS >= 1, 'a 1 fps frame is not slow motion');
    assert.ok(MAX_STEP_SECONDS <= 0.1, 'movement still advances in small steps');
    assert.match(preview, /for \(let step = 0; step < steps; step \+= 1\) this\.update\(frame \/ steps, \{ final: step === steps - 1 \}\);/);
    assert.doesNotMatch(preview, /Math\.min\(0\.05, Math\.max\(0\.001, \(now - this\.lastFrame\)/);
    assert.match(caption, /dt = this\.wallDelta\(dt\);/);
    assert.match(caption, /performance\.now\(\)/);
  });

  it('A2-1: a slow city drops to the LOW tier once, after warm-up', () => {
    const fast = createQualityMonitor();
    let decided = null;
    for (let i = 0; i < 400; i += 1) decided = fast.sample(1 / 60) ?? decided;
    assert.equal(decided, null);
    assert.equal(fast.tier, 'high');
    const slow = createQualityMonitor();
    const decisions = [];
    for (let i = 0; i < 60; i += 1) {
      const result = slow.sample(0.2);
      if (result) decisions.push(result);
    }
    // Round 2: LOW is measured again and, still slow, drops once to LOWEST.
    assert.deepEqual(decisions, ['low', 'lowest'], 'each exactly once');
    assert.equal(slow.tier, 'lowest');
    const recovers = createQualityMonitor();
    const steps = [];
    for (let i = 0; i < 30; i += 1) steps.push(recovers.sample(0.2));
    for (let i = 0; i < 400; i += 1) steps.push(recovers.sample(1 / 60));
    assert.deepEqual(steps.filter(Boolean), ['low'], 'LOW that runs fast stays LOW');
    assert.equal(recovers.tier, 'low');
    assert.equal(createQualityMonitor({ preference: 'low' }).tier, 'low');
    assert.equal(createQualityMonitor({ preference: 'high' }).sample(5), null, 'a pinned tier never changes');
    assert.equal(storedQualityPreference({ getItem: () => 'low' }), 'low');
    assert.equal(storedQualityPreference({ getItem: () => { throw new Error('blocked'); } }), 'auto');
    const material = { bumpMap: {}, roughnessMap: {}, transmission: 0.12, userData: {} };
    assert.equal(cheapenMaterial(material), true);
    assert.equal(material.bumpMap, null);
    assert.equal(material.transmission, 0);
    assert.equal(cheapenMaterial(material), false, 'only once');
    // LOW: pixel ratio, no shadow maps, a light fewer, closer framing.
    assert.match(preview, /this\.renderer\.shadowMap\.enabled = false;/);
    assert.match(preview, /fill\.visible = false/);
    assert.match(runtime, /if \(this\.preview\.qualityTier !== 'high'\) target \+= LOW_QUALITY_ZOOM_BOOST;/);
    // Rigs (~30k triangles each, never frustum-culled) are hidden off screen,
    // and far static models leave the shadow pass on every tier.
    assert.match(runtime, /this\.charactersDrawn = this\.characters\.cullOutside\(this\.preview\.camera\);/);
    assert.match(preview, /updateShadowLod\(dt\) \{/);
  });

  it('A2-2: the scanner walks in step on a held E, with an arrow along the lane', () => {
    assert.equal(SCANNER_WORDS.holdHint, 'HOLD <kbd>E</kbd> · WALK IN STEP');
    assert.doesNotMatch(runtime, /HOLD FORWARD · WASD/);
    assert.match(runtime, /this\.walkInStepHeld = true;/);
    assert.match(runtime, /logic\.update\(dt, \{ player: player\.position, input: intent, hold \}\)/);
    assert.match(field, /this\.laneArrow = new THREE\.Mesh/);
    assert.match(runtime, /field\.updateLaneArrow\(/);
  });

  it('A2-3: the clamp has one tag, a grab highlight and cursor, and says when a grab misses', () => {
    assert.match(runtime, /if \(interaction\.id === 'night-cut-feed' && this\.bellClamp\.active\) continue;/);
    assert.equal((runtime.match(/this\.bellClamp\.tagText\(\)/g) ?? []).length, 1);
    assert.doesNotMatch(runtime, /DRAG INTO THE CLAMP/);
    assert.match(clamp, /this\.grabHalo = new THREE\.Mesh/);
    assert.match(clamp, /this\.setCursor\(hovering \? 'grab' : ''\)/);
    // Round 2 (R2-5): misses go through noteMiss(), also for ground clicks.
    assert.match(clamp, /this\.noteMiss\('grab'\);/);
    assert.match(clamp, /this\.lastMiss = 'drop';/);
    assert.match(clamp, /const RING = 0x7fd6c8;/);
    // A drag never stops Butch's walk to the clamp.
    assert.doesNotMatch(runtime, /if \(this\.bellClamp\.handlePointerDown\(event\)\) \{\n\s+this\.preview\.stopWalking\(\);/);
  });

  it('A2-4: PUNCH BOTH is a real button', () => {
    assert.match(board, /this\.stackTag = el\('button', 'nf-tag c3-board__tag'/);
    assert.match(board, /this\.stackTag\.addEventListener\('click', \(event\) => \{\n\s+event\.stopPropagation\(\);\n\s+this\.tryPunch\(\);/);
  });

  it('A2-9 / A2-10: one prompt on the claim card; the gate label fits its panel', () => {
    assert.match(viewer, /'CONTINUE · E'/);
    assert.doesNotMatch(viewer, /CLOSE · E \/ ESC/);
    assert.match(page, /id="sunrise-tableau-continue" type="button" disabled hidden/);
    assert.match(field, /while \(size > 22 && context\.measureText\(word\)\.width > room\)/);
  });

  it('A2-12: Butch carries a soft marker', () => {
    assert.match(runtime, /makeButchMarker\(\) \{/);
    assert.match(runtime, /this\.updateButchMarker\(\);/);
  });

  it('F4 note: the Echo Stone is collected after its line, never under the first-stone card', () => {
    // Alpha round 4: both pickups go through awardEchoStone() (the shared
    // stone notice), still when the last line closes.
    assert.match(runtime, /this\.openAmbientDialogue\(CAMPFIRE_SELINE_STONE_DIALOGUE, \{ onComplete: \(\) => this\.awardEchoStone\(\) \}\);/);
    assert.match(runtime, /this\.openAmbientDialogue\(MORNING_STONE_PICKUP, \{ onComplete: \(\) => this\.awardEchoStone\(\) \}\);/);
    assert.match(runtime, /awardEchoStone\(\) \{\n[^]*?collectMagicStone\('chapter-3'\);/);
  });
});
