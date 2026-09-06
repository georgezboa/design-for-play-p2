import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import ContactInterlockArt from '../../src/art/contactInterlockArt.js';

// Minimal Phaser-scene mock: GameObjects record property writes, tweens apply
// their final values synchronously (loops excluded) and fire onComplete, so
// chained one-shots resolve inside the test.
function createMockScene() {
  const objects = [];
  const tweenList = [];

  function base(kind) {
    const go = {
      kind,
      depth: 0,
      scrollFactor: 1,
      visible: true,
      alpha: 1,
      x: 0,
      y: 0,
      angle: 0,
      scale: 1,
      fillColor: null,
      fillAlpha: null,
      text: '',
      destroyed: false,
      setDepth(n) { this.depth = n; return this; },
      setScrollFactor(n) { this.scrollFactor = n; return this; },
      setVisible(v) { this.visible = v; return this; },
      setAlpha(a) { this.alpha = a; return this; },
      setPosition(x, y) { this.x = x; this.y = y; return this; },
      setX(x) { this.x = x; return this; },
      setY(y) { this.y = y; return this; },
      setAngle(a) { this.angle = a; return this; },
      setScale(s) { this.scale = s; return this; },
      setBlendMode(m) { this.blendMode = m; return this; },
      setOrigin() { return this; },
      setFillStyle(c, a) { this.fillColor = c; this.fillAlpha = a; return this; },
      setStrokeStyle(w, c, a) { this.stroke = { w, c, a }; return this; },
      setText(t) { this.text = t; return this; },
      destroy() { this.destroyed = true; return this; },
    };
    objects.push(go);
    return go;
  }

  function graphics() {
    const g = base('graphics');
    g.ops = [];
    const methods = [
      'clear', 'beginPath', 'strokePath', 'moveTo', 'lineTo',
      'fillStyle', 'lineStyle', 'fillRect', 'fillRoundedRect',
      'strokeRoundedRect', 'strokeRect', 'fillTriangle', 'fillCircle',
      'strokeCircle', 'lineBetween',
    ];
    methods.forEach((name) => {
      g[name] = (...args) => { g.ops.push([name, ...args]); return g; };
    });
    return g;
  }

  return {
    objects,
    tweenList,
    add: {
      graphics,
      rectangle(x, y, w, h, c, a) {
        const o = base('rect');
        // Phaser shapes apply the constructor fill alpha to the object alpha.
        Object.assign(o, { x, y, w, h, fillColor: c, fillAlpha: a, alpha: a ?? 1 });
        return o;
      },
      circle(x, y, r, c, a) {
        const o = base('circle');
        Object.assign(o, { x, y, r, fillColor: c, fillAlpha: a ?? 1, alpha: a ?? 1 });
        return o;
      },
      ellipse(x, y, w, h, c, a) {
        const o = base('ellipse');
        Object.assign(o, { x, y, w, h, fillColor: c, fillAlpha: a, alpha: a ?? 1 });
        return o;
      },
      text(x, y, t, style) {
        const o = base('text');
        Object.assign(o, { x, y, text: t, style });
        return o;
      },
    },
    tweens: {
      add(cfg) {
        const tween = {
          cfg,
          removed: false,
          remove() { this.removed = true; },
          stop() { this.removed = true; },
        };
        tweenList.push(tween);
        const targets = Array.isArray(cfg.targets) ? cfg.targets : [cfg.targets];
        for (const target of targets) {
          for (const key of ['x', 'y', 'alpha', 'angle', 'scale', 'scaleX', 'scaleY']) {
            const v = cfg[key];
            if (v === undefined) continue;
            const final = v && typeof v === 'object' ? v.to : v;
            if (typeof final === 'number') target[key] = final;
          }
        }
        if (cfg.repeat !== -1 && typeof cfg.onComplete === 'function') cfg.onComplete();
        return tween;
      },
      killTweensOf(targets) {
        const list = Array.isArray(targets) ? targets : [targets];
        let killed = 0;
        for (const tween of tweenList) {
          if (tween.removed) continue;
          const tt = Array.isArray(tween.cfg.targets) ? tween.cfg.targets : [tween.cfg.targets];
          if (tt.some((t) => list.includes(t))) {
            tween.removed = true;
            killed += 1;
          }
        }
        return killed;
      },
    },
  };
}

const snap = (over = {}) => ({
  entered: true,
  destroyed: false,
  latchClosed: false,
  signalProgress: 0,
  circuitEnergized: false,
  contactorClosed: false,
  powerDelivered: false,
  complete: false,
  lastFault: null,
  ...over,
});

function makeArt(sceneOptions) {
  const scene = createMockScene();
  const art = new ContactInterlockArt(scene, sceneOptions ?? { startX: 850, endX: 1440, wallY: 556 });
  return { scene, art };
}

describe('contactInterlockArt construction', () => {
  it('creates all GameObjects once and reports locked geometry', () => {
    const { scene, art } = makeArt();
    assert.ok(scene.objects.length > 10);
    const state = art.getState();
    assert.equal(state.geometry.relayX, 1195);
    assert.equal(state.geometry.latch.x, 850);
    assert.equal(state.geometry.latch.y, 430);
    assert.equal(state.geometry.relay.x, 1195);
    assert.equal(state.geometry.contactor.x, 1440);
    assert.equal(state.objectCount, scene.objects.length);
  });

  it('allows relayX override through constructor options', () => {
    const { art } = makeArt({ startX: 850, endX: 1440, wallY: 300, relayX: 1100 });
    assert.equal(art.getState().geometry.relayX, 1100);
  });

  it('keeps every object inside the 53-58 mechanical depth band', () => {
    const { scene } = makeArt();
    for (const o of scene.objects) {
      assert.ok(o.depth >= 53 && o.depth <= 58, `depth ${o.depth} out of band`);
    }
  });

  it('latch bracket sits fully on the door post (right edge <= 842)', () => {
    const { scene } = makeArt();
    const bracket = scene.objects.find(
      (o) => o.kind === 'graphics'
        && o.ops.some((op) => op[0] === 'fillRect' && op[3] === 14 && op[4] === 66),
    );
    assert.ok(bracket, 'bracket plate not found');
    for (const op of bracket.ops) {
      if (op[0] === 'fillRect') {
        assert.ok(op[1] + op[3] <= 842, `bracket pixel spills past the post: ${op}`);
      }
      if (op[0] === 'lineBetween') {
        assert.ok(op[1] <= 842 && op[3] <= 842, `bracket line spills past the post: ${op}`);
      }
    }
  });

  it('skips insulators under the relay cabinet, which covers the span', () => {
    const { art } = makeArt();
    const insulators = art.baseGfx.ops.filter(
      (op) => op[0] === 'fillRect' && op[3] === 6 && op[4] === 8,
    );
    const xs = insulators.map((op) => op[1] + 3); // ceramic centre x
    // x1210 now sits under the cabinet body (1195 +/- 50); the cabinet
    // covers the 1120..1300 span, so nothing reads as unsupported.
    assert.deepEqual(xs, [940, 1030, 1120, 1300, 1390]);
  });

  it('draws the world relay cabinet with its number plate at the seam', () => {
    const { scene, art } = makeArt();
    const plateLine1 = scene.objects.some(
      (o) => o.kind === 'text' && o.text === 'DOOR TRACTION',
    );
    const plateLine2 = scene.objects.some(
      (o) => o.kind === 'text' && o.text === 'INTERLOCK No. 2',
    );
    assert.ok(plateLine1, 'cabinet number plate line 1 missing');
    assert.ok(plateLine2, 'cabinet number plate line 2 missing');
    assert.equal(art.relayBolt.x, 1195 + 50 - 10);
    assert.equal(art.relaySlit.alpha, 0); // hidden until the signal arrives
    assert.equal(art.relayLamp.alpha, 0.25); // dim resting inspection lamp
  });

  it('houses the live conductor in a visible underfloor cable trough', () => {
    const { art } = makeArt();
    const trough = art.baseGfx.ops.find(
      (op) => op[0] === 'fillRoundedRect' && op[2] === 546 && op[3] === 626 && op[4] === 20,
    );
    assert.ok(trough, 'underfloor trough housing not drawn around the conductor');
    assert.equal(art.getState().geometry.wallY, 556);
  });

  it('prompts sit above the player head and below the copper run', () => {
    const { art } = makeArt();
    assert.equal(art._prompts.latch.y, 356); // deviceY - 74
    assert.equal(art._prompts.power.y, 352); // deviceY - 78
    assert.equal(art._prompts.relay.y, 482); // directly above the relay cabinet
    assert.equal(art._prompts.relay.x, 1195);
    assert.ok(art._prompts.latch.y < 368, 'must clear the player head (~373)');
    assert.ok(art._prompts.power.y < 556, 'must stay above the underfloor cable trough');
  });
});

describe('contactInterlockArt snapshot mapping', () => {
  it('dormant: dim 15%, front hidden, lamp dark, latch ajar -8 deg', () => {
    const { art } = makeArt();
    art.applySnapshot(snap());
    assert.equal(art.getState().phase, 'dormant');
    assert.equal(art.dim.alpha, 0.15);
    assert.equal(art.frontDot.alpha, 0);
    assert.equal(art.lamp.fillColor, 0x263238); // CAR.ENAMEL_DARK
    assert.equal(art.latchLever.angle, -8);
    assert.equal(art.armature.y, 424); // released: 6px above the seat
    assert.equal(art.shellGlow.alpha, 0);
  });

  it('signaling mid-trace: front dot rides the pre-relay segment', () => {
    const { scene, art } = makeArt();
    art.applySnapshot(snap({ latchClosed: true, signalProgress: 0.5 }));
    assert.equal(art.getState().phase, 'signaling');
    assert.equal(art.frontDot.alpha, 1);
    // Legacy weighted progress 0.5 un-weights to pre = 0.5 / (345/590); the
    // front rides latch -> cabinet mouth (1195 - 50), never past the case.
    const split = 345 / 590;
    const cabL = 1195 - 50;
    assert.equal(art.frontDot.x, 850 + (0.5 / split) * (cabL - 850));
    assert.ok(art.frontDot.x < cabL, 'front must not cross into the cabinet');
    assert.equal(art.frontDot.y, 556);
    assert.equal(art.dim.alpha, 0);
    assert.equal(art.latchLever.angle, 0);
    // The cabinet replaced the break: the dormant run carries no caps and no
    // copper tongue any more.
    const capsOrTongue = art.traceGfx.ops.some((op) => op[0] === 'fillRect');
    assert.equal(capsOrTongue, false, 'break caps / bridge tongue must be gone');
  });

  it('relay-waiting: front parks at the cabinet mouth, slit holds open', () => {
    const { art } = makeArt();
    art.applySnapshot(snap({
      latchClosed: true,
      preRelayProgress: 1,
      relayWaiting: true,
      postRelayProgress: 0,
    }));
    assert.equal(art.frontDot.alpha, 0.9);
    assert.equal(art.frontDot.x, 1195 - 50 - 4); // parked at the mouth
    assert.equal(art.relaySlit.alpha, 0.85);
    assert.equal(art.relaySlitGlow.alpha, 0.16);
    assert.equal(art.relayLamp.alpha, 0.55); // brightened while waiting
  });

  it('post-relay: front rides cabinet -> contactor once bridged', () => {
    const { art } = makeArt();
    art.applySnapshot(snap({
      latchClosed: true,
      preRelayProgress: 1,
      relayBridged: true,
      postRelayProgress: 0.5,
    }));
    const cabR = 1195 + 50;
    assert.equal(art.frontDot.alpha, 1);
    assert.equal(art.frontDot.x, cabR + 0.5 * (1440 - cabR));
    // Slit stays open after the case is bridged (signal reached, case live).
    assert.equal(art.relaySlit.alpha, 0.85);
  });

  it('energized: breath loop + armature micro-pull start exactly once', () => {
    const { scene, art } = makeArt();
    const before = scene.tweenList.length;
    art.applySnapshot(snap({ latchClosed: true, signalProgress: 1, circuitEnergized: true }));
    const afterFirst = scene.tweenList.length;
    assert.ok(afterFirst > before);
    assert.equal(art.getState().phase, 'energized');
    assert.equal(art.lamp.fillColor, 0x75d4cd); // CAR.LAMP_OK
    assert.equal(art.frontDot.alpha, 0); // front gone once energized
    assert.equal(art.shellGlow.alpha, 0.12);
    art.applySnapshot(snap({ latchClosed: true, signalProgress: 1, circuitEnergized: true }));
    art.applySnapshot(snap({ latchClosed: true, signalProgress: 1, circuitEnergized: true }));
    assert.equal(scene.tweenList.length, afterFirst, 'steady redraw must not stack loops');
  });

  it('complete: loops killed, lamp steady LAMP_OK, armature engaged', () => {
    const { art } = makeArt();
    art.applySnapshot(snap({ latchClosed: true, signalProgress: 1, circuitEnergized: true }));
    art.applySnapshot(
      snap({ latchClosed: true, signalProgress: 1, circuitEnergized: true, contactorClosed: true, powerDelivered: true, complete: true }),
    );
    assert.equal(art.getState().phase, 'complete');
    assert.equal(art.lamp.fillColor, 0x75d4cd);
    assert.equal(art.armature.y, 430);
    assert.equal(art._loops.lamp, null);
    assert.equal(art._loops.armature, null);
  });

  it('is idempotent: repeated identical snapshots change nothing', () => {
    const { scene, art } = makeArt();
    const s = snap({ latchClosed: true, signalProgress: 0.3 });
    art.applySnapshot(s);
    const tweensAfterFirst = scene.tweenList.length;
    const opsAfterFirst = art.traceGfx.ops.length;
    art.applySnapshot(s);
    art.applySnapshot(s);
    assert.equal(scene.tweenList.length, tweensAfterFirst);
    const split = 345 / 590;
    const cabL = 1195 - 50;
    assert.equal(art.frontDot.x, 850 + (0.3 / split) * (cabL - 850));
    assert.ok(art.traceGfx.ops.length > opsAfterFirst, 'redraw appends ops after clear');
    assert.equal(art.traceGfx.ops.filter((op) => op[0] === 'clear').length, 3);
  });

  it('reset snapshot returns to dormant picture', () => {
    const { art } = makeArt();
    art.applySnapshot(snap({ latchClosed: true, signalProgress: 1, circuitEnergized: true }));
    art.applySnapshot(snap());
    assert.equal(art.getState().phase, 'dormant');
    assert.equal(art.dim.alpha, 0.15);
    assert.equal(art.latchLever.angle, -8);
    assert.equal(art.armature.y, 424);
    assert.equal(art.frontDot.alpha, 0);
    assert.equal(art.shellGlow.alpha, 0);
  });
});

describe('contactInterlockArt events', () => {
  it('ignores unknown event types safely', () => {
    const { scene, art } = makeArt();
    const before = scene.tweenList.length;
    art.handleEvent({ type: 'not-a-real-event' });
    art.handleEvent(null);
    art.handleEvent({});
    assert.equal(scene.tweenList.length, before);
    assert.equal(art.getState().lastEvent, null);
  });

  it('latch-reset presses the lever into the detent', () => {
    const { art } = makeArt();
    art.applySnapshot(snap());
    art.handleEvent({ type: 'latch-reset' });
    assert.equal(art.latchLever.angle, 0);
    assert.equal(art._busy.latch, false);
    assert.equal(art.getState().lastEvent, 'latch-reset');
  });

  it('open-circuit bounce returns the armature and ends all flashes', () => {
    const { scene, art } = makeArt();
    art.applySnapshot(snap());
    art.handleEvent({ type: 'contactor-bounce', lastFault: 'open-circuit' });
    assert.equal(art.armature.y, 424); // back at released after press+return
    assert.equal(art.alertL.alpha, 0);
    assert.equal(art.alertR.alpha, 0);
    assert.equal(art.lamp.fillColor, 0x263238); // dark again after WARN flash
    assert.equal(art._busy.armature, false);
    assert.equal(art._busy.lamp, false);
    // strengthened guidance flash: 4x5 ADD pair at the latch foot (the
    // current never entered the trough), 240ms flash + 400ms afterglow
    assert.equal(art.alertL.x, 850 - 4.5);
    assert.equal(art.alertR.x, 850 + 4.5);
    assert.equal(art.alertL.w, 4);
    assert.equal(art.alertL.h, 5);
    assert.equal(art.alertL.blendMode, 'ADD');
    assert.equal(art.alertR.blendMode, 'ADD');
    const flashTweens = scene.tweenList.filter((t) => {
      const targets = Array.isArray(t.cfg.targets) ? t.cfg.targets : [t.cfg.targets];
      return targets.includes(art.alertL) || targets.includes(art.alertR);
    });
    assert.deepEqual(flashTweens.map((t) => t.cfg.duration).sort((a, b) => a - b), [240, 240, 400, 400]);
    assert.ok(flashTweens.every((t) => t.cfg.repeat === undefined), 'flashes must stay one-shot');
  });

  it('relay-open bounce flashes at the cabinet mouth instead of the latch', () => {
    const { scene, art } = makeArt();
    art.applySnapshot(snap({
      latchClosed: true,
      preRelayProgress: 1,
      relayWaiting: true,
    }));
    art.handleEvent({ type: 'contactor-bounce', lastFault: 'relay-open' });
    // The flash pair snapped to the cabinet's left wall (1195 - 50 - 6).
    assert.equal(art.alertL.x, 1195 - 50 - 6 - 4.5);
    assert.equal(art.alertR.x, 1195 - 50 - 6 + 4.5);
    assert.equal(art.armature.y, 424); // bounce + return still happened
    assert.equal(art.alertL.alpha, 0); // flash decayed to nothing
    const flashTweens = scene.tweenList.filter((t) => {
      const targets = Array.isArray(t.cfg.targets) ? t.cfg.targets : [t.cfg.targets];
      return targets.includes(art.alertL) || targets.includes(art.alertR);
    });
    assert.deepEqual(flashTweens.map((t) => t.cfg.duration).sort((a, b) => a - b), [240, 240, 400, 400]);
  });

  it('signal-in-transit bounce pulses the front dot, never a stop point', () => {
    const { scene, art } = makeArt();
    art.applySnapshot(snap({ latchClosed: true, signalProgress: 0.5 }));
    art.handleEvent({ type: 'contactor-bounce', lastFault: 'signal-in-transit' });
    // armature still bounced and returned, lamp still flashed WARN
    assert.equal(art.armature.y, 424);
    assert.equal(art.lamp.fillColor, 0x263238);
    // no tween ever targets the alert pair
    const flashTweens = scene.tweenList.filter((t) => {
      const targets = Array.isArray(t.cfg.targets) ? t.cfg.targets : [t.cfg.targets];
      return targets.includes(art.alertL) || targets.includes(art.alertR);
    });
    assert.equal(flashTweens.length, 0);
    assert.equal(art.alertL.alpha, 0);
    // the propagation front carried the guidance instead
    const frontTweens = scene.tweenList.filter((t) => {
      const targets = Array.isArray(t.cfg.targets) ? t.cfg.targets : [t.cfg.targets];
      return targets.includes(art.frontDot);
    });
    assert.ok(frontTweens.some((t) => t.cfg.scale && t.cfg.scale.from === 1.8));
  });

  it('trace-reached-relay plays the locked cabinet attention beat', () => {
    const { scene, art } = makeArt();
    const calls = [];
    const sfxArt = new ContactInterlockArt(scene, {
      startX: 850,
      endX: 1440,
      wallY: 556,
      sfx: { bump: () => calls.push('bump'), blocked: () => calls.push('blocked') },
    });
    sfxArt.applySnapshot(snap({ latchClosed: true, preRelayProgress: 1, relayWaiting: true }));
    sfxArt.handleEvent({ type: 'trace-reached-relay' });
    // Inspection lamp flashed twice and settled on the waiting brightness.
    assert.equal(sfxArt.relayLamp.alpha, 0.55);
    assert.equal(sfxArt._busy.relayLamp, false);
    // Bolt jumped 4px; slit revealed with its glow.
    assert.equal(sfxArt.relayBolt.x, 1195 + 50 - 10 + 4);
    assert.equal(sfxArt.relaySlit.alpha, 0.85);
    assert.equal(sfxArt.relaySlitGlow.alpha, 0.16);
    // Three stepped chatter hits: bump, bump, blocked (sfx.js is frozen, so
    // the pitch steps are approximated by alternating hooks).
    assert.deepEqual(calls, ['bump', 'bump', 'blocked']);
    assert.equal(sfxArt.getState().lastEvent, 'trace-reached-relay');
  });

  it('contactor-closed slams the armature and settles the glow at 0.12', () => {
    const { art } = makeArt();
    art.applySnapshot(snap({ latchClosed: true, signalProgress: 1, circuitEnergized: true }));
    art.handleEvent({ type: 'contactor-closed' });
    assert.equal(art.armature.y, 430);
    assert.equal(art.shellGlow.alpha, 0.12);
    assert.equal(art._busy.glow, false);
  });

  it('traction-enabled locks the lamp to steady LAMP_OK', () => {
    const { art } = makeArt();
    art.applySnapshot(snap({ latchClosed: true, signalProgress: 1, circuitEnergized: true }));
    art.handleEvent({ type: 'traction-enabled' });
    assert.equal(art.lamp.fillColor, 0x75d4cd);
    assert.equal(art.lamp.alpha, 0.92);
    assert.equal(art._loops.lamp, null);
  });

  it('trace-energized plays a one-shot surge and leaves it faded', () => {
    const { art } = makeArt();
    art.applySnapshot(snap({ latchClosed: true, signalProgress: 0.8 }));
    art.handleEvent({ type: 'trace-energized' });
    assert.equal(art.surge.alpha, 0);
    assert.equal(art.getState().lastEvent, 'trace-energized');
  });

  it('calls injected sfx hooks without requiring them', () => {
    const calls = [];
    const scene = createMockScene();
    const sfx = {
      lever: () => calls.push('lever'),
      blocked: () => calls.push('blocked'),
      press: () => calls.push('press'),
      goal: () => calls.push('goal'),
    };
    const art = new ContactInterlockArt(scene, { startX: 850, endX: 1440, wallY: 300, sfx });
    art.handleEvent({ type: 'latch-reset' });
    art.handleEvent({ type: 'contactor-bounce' });
    art.handleEvent({ type: 'contactor-closed' });
    art.handleEvent({ type: 'traction-enabled' });
    assert.deepEqual(calls, ['lever', 'blocked', 'press', 'goal']);
    // and no sfx configured: events still animate without throwing
    const { art: silent } = makeArt();
    silent.handleEvent({ type: 'latch-reset' });
    silent.handleEvent({ type: 'contactor-bounce' });
  });
});

describe('contactInterlockArt prompts / visibility / teardown', () => {
  it('setPrompt sets only latch/power/relay targets and clears on null', () => {
    const { art } = makeArt();
    art.setPrompt('latch', '[E] RESET LATCH');
    art.setPrompt('power', '[E] CLOSE CONTACTOR');
    art.setPrompt('relay', '[E] OPEN RELAY CASE');
    assert.equal(art.getState().prompts.latch, '[E] RESET LATCH');
    assert.equal(art.getState().prompts.power, '[E] CLOSE CONTACTOR');
    assert.equal(art.getState().prompts.relay, '[E] OPEN RELAY CASE');
    art.setPrompt('latch', null);
    assert.equal(art.getState().prompts.latch, '');
    art.setPrompt('relay', null);
    assert.equal(art.getState().prompts.relay, '');
    art.setPrompt('nope', '[E] HACK');
    assert.equal(art.getState().prompts.power, '[E] CLOSE CONTACTOR');
  });

  it('setVisible toggles every object and restores', () => {
    const { scene, art } = makeArt();
    art.setVisible(false);
    assert.ok(scene.objects.every((o) => o.visible === false));
    art.setVisible(true);
    assert.ok(scene.objects.every((o) => o.visible === true));
  });

  it('destroy clears objects and tweens, is repeatable, and gates all APIs', () => {
    const { scene, art } = makeArt();
    art.applySnapshot(snap({ latchClosed: true, signalProgress: 1, circuitEnergized: true }));
    const opsBefore = art.traceGfx.ops.length;
    art.destroy();
    assert.ok(scene.objects.every((o) => o.destroyed));
    assert.ok(scene.tweenList.every((t) => t.removed));
    assert.equal(art.getState().destroyed, true);
    art.destroy(); // repeated destroy is safe
    art.applySnapshot(snap()); // gated: no further redraw
    assert.equal(art.traceGfx.ops.length, opsBefore);
    art.handleEvent({ type: 'latch-reset' });
    assert.equal(art.getState().lastEvent, null);
    art.setPrompt('latch', '[E] RESET LATCH'); // gated, no throw
  });
});
