import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createFinaleCameraDirector } from '../../src/chapters/allWorlds/finaleCameraDirector.js';
import { FUSION_SPINE_GREYBOX, worldFusionOptionsFromSpine } from '../../src/chapters/allWorlds/fusionSpineLayout.js';
import { createWorldFusionModel } from '../../src/chapters/allWorlds/worldFusionModel.js';

const DT = 16;

function advance(model, totalMs, input = {}) {
  for (let left = totalMs; left > 0; left -= DT) model.update(Math.min(DT, left), input);
}

describe('Chapter 6 Fusion Spine greybox', () => {
  it('uses all eight locked reusable spine slots in one continuous route', () => {
    const modules = FUSION_SPINE_GREYBOX.modules;
    assert.equal(modules.length, 8);
    assert.equal(new Set(modules.map((module) => module.slot)).size, 8);
    for (let i = 1; i < modules.length; i++) {
      assert.equal(modules[i - 1].x + modules[i - 1].width, modules[i].x);
    }
    assert.equal(modules.at(-1).x + modules.at(-1).width, FUSION_SPINE_GREYBOX.worldBounds.maxX);
  });

  it('scales the existing pairwise rules onto the long route without bypassing its first gate', () => {
    const options = worldFusionOptionsFromSpine();
    const model = createWorldFusionModel(options);
    advance(model, 10000, { right: true });
    const snapshot = model.snapshot();
    assert.equal(snapshot.player.x, options.gateX);
    assert.equal(snapshot.spine.anchors.worldLoomX, FUSION_SPINE_GREYBOX.anchors.worldLoomX);
    assert.equal(snapshot.spine.worldWidth, FUSION_SPINE_GREYBOX.worldBounds.maxX);
  });
});

describe('Chapter 6 directed camera', () => {
  it('ignores movement inside the deadzone, then follows with look-ahead', () => {
    const camera = createFinaleCameraDirector();
    const initial = camera.snapshot();
    camera.update(16, { playerX: 500, direction: 1 });
    assert.equal(camera.snapshot().focusX, initial.focusX);
    for (let i = 0; i < 60; i++) camera.update(16, { playerX: 900, direction: 1 });
    assert.ok(camera.snapshot().scrollX > initial.scrollX);
  });

  it('never reveals beyond either world edge', () => {
    const camera = createFinaleCameraDirector();
    for (let i = 0; i < 300; i++) camera.update(16, { playerX: 99999, direction: 1 });
    let snapshot = camera.snapshot();
    assert.equal(snapshot.scrollX, snapshot.bounds.maxScrollX);
    for (let i = 0; i < 300; i++) camera.update(16, { playerX: -99999, direction: -1 });
    snapshot = camera.snapshot();
    assert.equal(snapshot.scrollX, 0);
  });

  it('changes to Butch/Mara two-target framing without snapping', () => {
    const camera = createFinaleCameraDirector();
    for (let i = 0; i < 90; i++) camera.update(16, { playerX: 2420, direction: 1 });
    const before = camera.snapshot();
    const firstReunionFrame = camera.update(16, { playerX: 2420, direction: 0, complete: true });
    assert.equal(firstReunionFrame.mode, 'butch-mara-two-target');
    assert.ok(firstReunionFrame.scrollX >= before.scrollX);
    assert.ok(firstReunionFrame.scrollX - before.scrollX < 30);
  });

  it('resets deterministically', () => {
    const camera = createFinaleCameraDirector();
    camera.update(100, { playerX: 1800, direction: 1 });
    const baseline = JSON.stringify(camera.reset());
    for (let i = 0; i < 5; i++) assert.equal(JSON.stringify(camera.reset()), baseline);
  });
});
