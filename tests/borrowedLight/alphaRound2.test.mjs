import assert from 'node:assert/strict';
import fs from 'node:fs';
import { describe, it } from 'node:test';

import { CONTROLLER, createControllerState, stepController, tapHoldMs } from '../../src/chapters/borrowedLight/controller.js';
import { PLATFORMS, SIGNS } from '../../src/chapters/borrowedLight/level.js';
import { placeTeachTag, signRects, tagRect } from '../../src/chapters/borrowedLight/teachTag.js';

const scene = fs.readFileSync(new URL('../../src/chapters/borrowedLight/BorrowedLightScene.js', import.meta.url), 'utf8');

// Alpha round 2 (2026-09-30), engineer G2: Chapter 2 fixes.
describe('Chapter 2 alpha round 2', () => {
  const rects = signRects(SIGNS);
  const laundry = rects.find((rect) => rect.text === 'LAUNDRY');
  const tag = { tagW: 236, tagH: 34, bodyH: 112 };
  const overlaps = (a, b) => a.x1 > b.x0 && a.x0 < b.x1 && a.y1 > b.y0 && a.y0 < b.y1;

  it('R2-1: HOLD Q · LISTEN sits beside Butch, clear of the LAUNDRY sign', () => {
    const roof = PLATFORMS.find((platform) => platform.id === 'a-roof3');
    const feetY = roof.y;
    // Every spot on that roof under or beside the sign.
    for (let feetX = laundry.x0 - 200; feetX <= laundry.x1 + 200; feetX += 10) {
      const at = placeTeachTag({ feetX, feetY, ...tag, rects });
      const box = tagRect(at, tag.tagW, tag.tagH);
      assert.ok(!overlaps(box, laundry), `tag over LAUNDRY at x=${feetX} (${at.at})`);
      // Near Butch: never more than ~a tag width from him.
      assert.ok(Math.abs(at.x - feetX) <= tag.tagW / 2 + 40 + 1, `tag too far from Butch at x=${feetX}`);
      assert.ok(at.y <= feetY + 14 + tag.tagH && at.y >= feetY - tag.bodyH - 16, `tag not near Butch at x=${feetX}`);
    }
    const under = placeTeachTag({ feetX: 4000, feetY, ...tag, rects });
    assert.notEqual(under.at, 'head');
  });

  it('R2-1: with no sign near, the tag sits just above his head', () => {
    const at = placeTeachTag({ feetX: 2400, feetY: 760, ...tag, rects });
    assert.equal(at.at, 'head');
    assert.equal(at.y, 760 - tag.bodyH - 16);
    assert.match(scene, /return \{ follow: true, text: HINTS\.listen \};/);
    assert.doesNotMatch(scene, /this\.feetY - 150, text: HINTS\.listen/);
  });

  it('R2-2: a tap released inside one slow frame still holds the jump for as long as it was down', () => {
    assert.equal(tapHoldMs({ downAt: 1000, upAt: 1060 }), 60);
    assert.equal(tapHoldMs({ downAt: 1000, upAt: 1060, timescale: 0.5 }), 30);
    assert.equal(tapHoldMs({ downAt: 1000, upAt: 3000 }), 400, 'capped');
    assert.equal(tapHoldMs({ downAt: 1000, upAt: null }), 0, 'still held: isDown covers it');
    assert.equal(tapHoldMs({ downAt: 2000, upAt: 1000 }), 0, 'stale release');

    // Drive the real controller the way the scene does: one jump queued
    // with the key already up (both events landed in the same frame).
    const apex = (holdMs) => {
      const state = createControllerState();
      let vy = 40;
      let y = 0;
      let peak = 0;
      let hold = holdMs;
      for (let step = 0; step < 90; step += 1) {
        const pressed = step === 0;
        const jumpHeld = hold > 0;
        hold -= 1000 / 60;
        const out = stepController(state, { left: false, right: false, jumpPressed: pressed, jumpHeld }, { grounded: step === 0 || y >= 0, vx: 0, vy, inUpdraft: false }, 1000 / 60);
        vy = out.vy;
        y = Math.min(0, y + vy / 60);
        peak = Math.min(peak, y);
        if (step > 0 && y >= 0) break;
      }
      return -peak;
    };
    const instantCut = apex(0);
    const tap = apex(tapHoldMs({ downAt: 0, upAt: 60 }));
    const full = apex(400);
    assert.ok(instantCut < 45, `cut hop ${instantCut}`);
    assert.ok(tap > instantCut * 1.8, `a 60 ms tap should clear more than the cut hop (${tap} vs ${instantCut})`);
    assert.ok(Math.abs(full - CONTROLLER.jumpVelocity ** 2 / (2 * CONTROLLER.gravity)) < 20, `full jump ${full}`);
    assert.match(scene, /this\.jumpHoldMs = input\.jumpHeld \? 0 : tapHoldMs\(\{ downAt: this\.jumpDownAt, upAt: this\.jumpUpAt, timescale: this\.timescale \}\);/);
    assert.match(scene, /key\.on\('up', \(_key, event\) => \{ this\.jumpUpAt = stamp\(event\); \}\)/);
    assert.match(scene, /lastJump: this\.lastJump \?\? null,/);
  });
});
