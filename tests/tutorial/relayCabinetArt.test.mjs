import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import RelayCabinetArt from '../../src/art/relayCabinetArt.js';

// Minimal Phaser-scene mock, same style as contactInterlockArt.test.mjs:
// GameObjects record property writes, tweens apply their final values
// synchronously (loops excluded) and fire onComplete, so chained one-shots
// resolve inside the test.
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

// §4.1 locked state fields.
const snap = (over = {}) => ({
  entered: true,
  coilLeadTerminal: null,
  outputLeadTerminal: null,
  coilEnergized: false,
  noContactClosed: false,
  ncContactClosed: true,
  testState: 'idle',
  solved: false,
  destroyed: false,
  ...over,
});

const passedSnap = () => snap({
  coilLeadTerminal: 'coil-a1',
  outputLeadTerminal: 'no-14',
  coilEnergized: true,
  noContactClosed: true,
  ncContactClosed: false,
  testState: 'passed',
  solved: true,
});

function makeArt(options) {
  const scene = createMockScene();
  const art = new RelayCabinetArt(scene, options);
  return { scene, art };
}

const tweensOn = (scene, target) => scene.tweenList.filter((t) => {
  const targets = Array.isArray(t.cfg.targets) ? t.cfg.targets : [t.cfg.targets];
  return targets.includes(target);
});

describe('relayCabinetArt construction', () => {
  it('creates all GameObjects once and reports locked geometry', () => {
    const { scene, art } = makeArt();
    assert.ok(scene.objects.length > 30);
    const state = art.getState();
    assert.equal(state.module, 'relay-cabinet-art');
    assert.deepEqual(state.geometry.frame, { x: 120, y: 120, w: 720, h: 430 });
    assert.equal(state.geometry.terminals['coil-a1'].x, 390);
    assert.equal(state.geometry.terminals['gnd-lug'].y, 498);
    // stud stack mirrors the contact stack: NC above NO (Wave 2 audit #5)
    assert.equal(state.geometry.terminals['nc-12'].y, 430);
    assert.equal(state.geometry.terminals['no-14'].y, 452);
    assert.ok(state.geometry.terminals['nc-12'].y < state.geometry.terminals['no-14'].y);
    // A2 is drawn but never snappable (Wave 2 audit #2)
    assert.ok(!state.geometry.snappable.includes('coil-a2'));
    assert.deepEqual(
      [...state.geometry.snappable].sort(),
      ['coil-a1', 'gnd-lug', 'nc-12', 'no-14'],
    );
    assert.equal(state.geometry.snapRadius, 22); // spec: at least 22px
    assert.equal(state.objectCount, scene.objects.length);
    assert.equal(state.doorState, 'closed');
  });

  it('translates the whole layout for a non-960x600 canvas', () => {
    const { art } = makeArt({ width: 1920, height: 1200 });
    const state = art.getState();
    assert.equal(state.geometry.frame.x, 120 + 480);
    assert.equal(state.geometry.frame.y, 120 + 300);
    assert.equal(state.geometry.terminals['coil-a1'].x, 390 + 480);
  });

  it('keeps the dim veil at 69 and the close-up cluster inside 70-79', () => {
    const { scene } = makeArt();
    for (const o of scene.objects) {
      assert.ok(o.depth >= 69 && o.depth <= 79, `depth ${o.depth} out of band`);
    }
    const dims = scene.objects.filter((o) => o.depth === 69);
    assert.ok(dims.length >= 4, 'carriage-edge dimming veil missing');
    assert.ok(scene.objects.some((o) => o.depth === 79), 'door must top the cluster');
  });

  it('dims with low-saturation translucent layers, never a pure black modal', () => {
    const { scene } = makeArt();
    const dims = scene.objects.filter((o) => o.depth === 69);
    assert.ok(dims.every((o) => o.alpha < 0.7), 'veil must stay translucent');
    assert.ok(dims.every((o) => o.fillColor !== 0x000000), 'no pure black mask');
  });

  it('keeps adjacent terminal studs spaced at least 2 snap radii apart', () => {
    const { art } = makeArt();
    const ts = Object.values(art.getState().geometry.terminals);
    for (let i = 0; i < ts.length; i += 1) {
      for (let j = i + 1; j < ts.length; j += 1) {
        const d = Math.hypot(ts[i].x - ts[j].x, ts[i].y - ts[j].y);
        assert.ok(d >= 44, `studs ${d}px apart overlap their 22px snap circles`);
      }
    }
  });

  it('downgrades A2 to a bused return screw: dark, linked, never a snap target', () => {
    const { scene, art } = makeArt();
    // internal A1->A2 bus bar drawn on the studs layer
    const studsGfx = scene.objects.find(
      (o) => o.kind === 'graphics'
        && o.ops.some((op) => op[0] === 'lineStyle' && op[1] === 4 && op[2] === 0x7f6540),
    );
    assert.ok(studsGfx, 'internal A1->A2 bus bar missing');
    // A2's nut is drawn dark (BRASS_DARK), never bright brass
    assert.ok(
      art._nuts['coil-a2'].ops.some((op) => op[0] === 'fillStyle' && op[1] === 0x7f6540),
      'A2 nut must read as a seated dark screw',
    );
    assert.ok(
      !art._nuts['coil-a2'].ops.some((op) => op[0] === 'fillStyle' && op[1] === 0xcaa66b),
      'A2 nut must not use live-terminal BRASS_MID',
    );
  });

  it('draws the armature as a guided slider with no fake hinge pin', () => {
    const { art } = makeArt();
    assert.ok(
      art.armature.ops.every((op) => op[0] !== 'fillCircle'),
      'plunger armature must not paint a pivot pin (Wave 2 audit #8)',
    );
    // guide shoes at both bar ends instead
    const shoes = art.armature.ops.filter(
      (op) => op[0] === 'fillRect' && op[3] === 6 && op[4] === 12,
    );
    assert.equal(shoes.length, 2);
  });

  it('draws the CYAN lead in faded steel-blue, never the LAMP_OK lit-segment token', () => {
    const { art } = makeArt();
    art.applySnapshot(snap());
    const styles = art._wireGfx.output.ops.filter((op) => op[0] === 'lineStyle');
    assert.ok(styles.length > 0);
    assert.ok(
      styles.every((op) => op[2] !== 0x75d4cd),
      'OUTPUT lead must not share the LAMP_OK energized-trace colour (Wave 2 audit #6)',
    );
    assert.ok(
      styles.some((op) => op[2] === 0x9fb7c0), // CAR.STEEL_HI cloth braid
      'OUTPUT lead should read as faded steel-blue cloth',
    );
  });

  it('does not import Phaser', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(join(here, '../../src/art/relayCabinetArt.js'), 'utf8');
    assert.ok(!/^import\s+Phaser/m.test(src), 'relayCabinetArt must not import Phaser');
    assert.ok(src.includes("'ADD'"), 'blend modes stay string literals');
  });
});

describe('relayCabinetArt snapshot mapping', () => {
  it('idle entry: tips at rest hang, nuts straight, NC closed / NO open', () => {
    const { art } = makeArt();
    art.applySnapshot(snap());
    const state = art.getState();
    assert.equal(state.phase, 'idle');
    assert.deepEqual(state.leads.coil.tip, { x: 238, y: 326 });
    assert.deepEqual(state.leads.output.tip, { x: 722, y: 326 });
    assert.equal(art._nuts['coil-a1'].angle, 0);
    assert.equal(art.armature.y, 296); // released: NC closed, NO open
    assert.equal(art.testLever.angle, -16);
    assert.equal(art.witnessLamp.fillColor, 0x263238); // CAR.ENAMEL_DARK
    assert.equal(art.fuse.fillColor, 0x52636b); // CAR.ENAMEL_HI porcelain
  });

  it('coil lead on coil-a1 seats the tip, turns the nut 8 deg, armature down', () => {
    const { art } = makeArt();
    art.applySnapshot(snap({
      coilLeadTerminal: 'coil-a1',
      coilEnergized: true,
      noContactClosed: true,
      ncContactClosed: false,
    }));
    assert.deepEqual(art.getState().leads.coil.tip, { x: 390, y: 430 });
    assert.equal(art._nuts['coil-a1'].angle, 8);
    assert.equal(art._nuts['no-14'].angle, 0);
    assert.equal(art.armature.y, 312); // picked: NC open, NO closed
    assert.equal(art.coilGlow.alpha, 0.5);
  });

  it('illegal landing sites still position the tip (ground fault wiring)', () => {
    const { art } = makeArt();
    art.applySnapshot(snap({ outputLeadTerminal: 'gnd-lug', testState: 'ground-fault' }));
    assert.deepEqual(art.getState().leads.output.tip, { x: 660, y: 498 });
    assert.equal(art._nuts['gnd-lug'].angle, 8);
    assert.equal(art.fuse.fillColor, 0x263238); // porcelain darkened
  });

  it('unknown out-of-set terminal ids fall back to the rest hang, never throw', () => {
    const { art } = makeArt();
    art.applySnapshot(snap({ coilLeadTerminal: 'coil-a99' }));
    assert.deepEqual(art.getState().leads.coil.tip, { x: 238, y: 326 });
  });

  it('walks all five testState phases with distinct steady pictures', () => {
    const { art } = makeArt();
    const wired = {
      coilLeadTerminal: 'coil-a1',
      outputLeadTerminal: 'no-14',
      coilEnergized: true,
      noContactClosed: true,
      ncContactClosed: false,
    };

    art.applySnapshot(snap({ testState: 'idle' }));
    assert.equal(art.getState().phase, 'idle');
    assert.equal(art.testLever.angle, -16);
    assert.equal(art.fuse.fillColor, 0x52636b);

    art.applySnapshot(snap({ testState: 'incomplete' }));
    assert.equal(art.getState().phase, 'incomplete');
    assert.equal(art.testLever.angle, -16); // handle back at rest after bounce

    art.applySnapshot(snap({ ...wired, outputLeadTerminal: 'nc-12', testState: 'dropout' }));
    assert.equal(art.getState().phase, 'dropout');
    assert.equal(art.witnessLamp.fillColor, 0x263238); // dark outside the 180ms flash
    assert.deepEqual(art.getState().leads.output.tip, { x: 518, y: 430 }); // wiring kept

    art.applySnapshot(snap({ ...wired, outputLeadTerminal: 'gnd-lug', testState: 'ground-fault' }));
    assert.equal(art.getState().phase, 'ground-fault');
    assert.equal(art.fuse.fillColor, 0x263238); // fuse stays dark (sticky testState)

    art.applySnapshot(snap({ ...wired, testState: 'passed', solved: true }));
    assert.equal(art.getState().phase, 'passed');
    assert.equal(art.inputLamp.fillColor, 0x75d4cd); // CAR.LAMP_OK
    assert.equal(art.outputLamp.fillColor, 0x75d4cd);
    assert.equal(art.testLever.angle, 10); // handle bottomed out, stays
    const flagLine = art.flagGfx.ops.some(
      (op) => op[0] === 'fillRect' && op[3] === 20 && op[4] === 2,
    );
    assert.ok(flagLine, 'continuity flag shows one line when solved');
  });

  it('solved wires pull taut: sag drops far below the resting droop', () => {
    const { art } = makeArt();
    // Droop is measured as path-length / chord-length ratio of the sampled
    // bezier (two strands are drawn, hence /2) — a taut wire's path almost
    // equals its chord regardless of tip position or chord orientation.
    const pathRatio = (gfx, tip) => {
      const ax = 220; const ay = 258; // coil anchor (220,252) + cloth stub 6
      const chord = Math.hypot(tip.x - ax, tip.y - ay);
      let len = 0;
      for (const op of gfx.ops) {
        if (op[0] !== 'lineBetween') continue;
        len += Math.hypot(op[3] - op[1], op[4] - op[2]);
      }
      return len / 2 / chord;
    };
    art.applySnapshot(snap());
    const loose = pathRatio(art._wireGfx.coil, { x: 238, y: 326 });
    art.applySnapshot(passedSnap());
    const taut = pathRatio(art._wireGfx.coil, { x: 390, y: 430 });
    assert.ok(loose > 1.04, `resting droop should read as cloth (ratio ${loose})`);
    assert.ok(taut < 1.02, `passed wiring must pull taut (ratio ${taut})`);
  });

  it('is idempotent: repeated identical snapshots stack no tweens', () => {
    const { scene, art } = makeArt();
    const s = passedSnap();
    art.applySnapshot(s);
    const tweensAfterFirst = scene.tweenList.length;
    art.applySnapshot(s);
    art.applySnapshot(s);
    assert.equal(scene.tweenList.length, tweensAfterFirst);
    assert.equal(
      art._wireGfx.coil.ops.filter((op) => op[0] === 'clear').length,
      3,
      'each redraw clears before repainting',
    );
  });

  it('reset snapshot returns the full resting picture', () => {
    const { art } = makeArt();
    art.applySnapshot(passedSnap());
    art.applySnapshot(snap());
    assert.deepEqual(art.getState().leads.coil.tip, { x: 238, y: 326 });
    assert.equal(art._nuts['coil-a1'].angle, 0);
    assert.equal(art.armature.y, 296);
    assert.equal(art.testLever.angle, -16);
    assert.equal(art.inputLamp.fillColor, 0x263238);
    assert.equal(art.fuse.fillColor, 0x52636b);
  });
});

describe('relayCabinetArt events', () => {
  it('ignores unknown event types safely', () => {
    const { scene, art } = makeArt();
    const before = scene.tweenList.length;
    art.handleEvent({ type: 'not-a-real-event' });
    art.handleEvent(null);
    art.handleEvent({});
    art.handleEvent({ type: 'lead-connected', lead: 'coil', terminal: 'nowhere' });
    assert.equal(scene.tweenList.length, before);
    assert.equal(art.getState().lastEvent, null);
  });

  it('lead-connected snaps 90ms and turns the nut 8 deg', () => {
    const { scene, art } = makeArt();
    art.applySnapshot(snap());
    art.handleEvent({ type: 'lead-connected', lead: 'coil', terminal: 'coil-a1' });
    assert.deepEqual(art.getState().leads.coil.tip, { x: 390, y: 430 });
    const tipTweens = tweensOn(scene, art._tipGo.coil);
    assert.ok(tipTweens.some((t) => t.cfg.duration === 90), 'magnetic pull-in must be 90ms');
    assert.equal(art._nuts['coil-a1'].angle, 8);
    assert.equal(art._busy.coil, false);
    assert.equal(art.getState().lastEvent, 'lead-connected');
  });

  it('lead-disconnected springs the tip back to rest and relaxes the nut', () => {
    const { art } = makeArt();
    const wired = snap({ coilLeadTerminal: 'coil-a1', coilEnergized: true, noContactClosed: true, ncContactClosed: false });
    art.applySnapshot(wired);
    art.handleEvent({ type: 'lead-disconnected', lead: 'coil', terminal: 'coil-a1' });
    assert.deepEqual(art.getState().leads.coil.tip, { x: 238, y: 326 });
    assert.equal(art._busy.coil, false);
    art.applySnapshot(snap());
    assert.equal(art._nuts['coil-a1'].angle, 0);
  });

  it('coil-picked plays the 30/75/120 beat with glass flicker', () => {
    const { scene, art } = makeArt();
    art.applySnapshot(snap());
    art.handleEvent({ type: 'coil-picked' });
    assert.equal(art.armature.y, 312); // settled on the picked seat
    assert.equal(art._busy.armature, false);
    assert.equal(art._busy.glint, false);
    const durations = tweensOn(scene, art.armature).map((t) => t.cfg.duration);
    assert.deepEqual(durations, [30, 75, 120], 'pre-shiver -> pull-in -> rebound');
    // glass reflection followed the shake and settled on the energized base
    const glintTweens = tweensOn(scene, art.glassGlint);
    assert.ok(glintTweens.some((t) => t.cfg.duration === 225));
    assert.equal(art.glassGlint.alpha, 0.18); // last snap had the coil off
  });

  it('relay-dropped springs the armature back to the NC seat', () => {
    const { art } = makeArt();
    art.applySnapshot(snap({ coilLeadTerminal: 'coil-a1', coilEnergized: true, noContactClosed: true, ncContactClosed: false }));
    art.handleEvent({ type: 'relay-dropped' });
    assert.equal(art.armature.y, 296);
    assert.equal(art._busy.armature, false);
  });

  it('test-incomplete: handle stalls and returns, missing[] tips knock twice', () => {
    const { scene, art } = makeArt();
    art.applySnapshot(snap({ outputLeadTerminal: 'no-14' }));
    art.handleEvent({
      type: 'test-incomplete',
      missing: ['coil'],
      coilLeadTerminal: null,
      outputLeadTerminal: 'no-14',
    });
    assert.equal(art.testLever.angle, -16); // never bottomed, sprang back
    const handleDurations = tweensOn(scene, art.testLever).map((t) => t.cfg.duration);
    assert.deepEqual(handleDurations, [120, 220]);
    // four knock tweens on the dangling coil tip, ending exactly at rest;
    // the connected output tip is NOT knocked
    assert.equal(tweensOn(scene, art._tipGo.coil).length, 4);
    assert.equal(tweensOn(scene, art._tipGo.output).length, 0);
    assert.deepEqual(art.getState().leads.coil.tip, { x: 238, y: 326 });
    assert.equal(art._busy.handle, false);
    assert.equal(art._busy.coil, false);
  });

  it('test-incomplete without a missing payload knocks both tips', () => {
    const { scene, art } = makeArt();
    art.applySnapshot(snap());
    art.handleEvent({ type: 'test-incomplete' });
    assert.equal(tweensOn(scene, art._tipGo.coil).length, 4);
    assert.equal(tweensOn(scene, art._tipGo.output).length, 4);
    assert.deepEqual(art.getState().leads.output.tip, { x: 722, y: 326 });
    assert.equal(art._busy.output, false);
  });

  it('test-dropout: witness lamp flashes exactly 180ms, armature bounces once', () => {
    const { scene, art } = makeArt();
    art.applySnapshot(snap({
      coilLeadTerminal: 'coil-a1',
      outputLeadTerminal: 'nc-12',
      coilEnergized: true,
      noContactClosed: true,
      ncContactClosed: false,
    }));
    art.handleEvent({ type: 'test-dropout' });
    const flash = tweensOn(scene, art.witnessLamp);
    assert.deepEqual(flash.map((t) => t.cfg.duration), [180]);
    assert.equal(art.witnessLamp.fillColor, 0x263238); // dark again after the flash
    assert.equal(art.witnessLamp.alpha, 1);
    const bounce = tweensOn(scene, art.armature).map((t) => t.cfg.duration);
    assert.deepEqual(bounce, [80, 120], 'single bounce, no repeat');
    assert.equal(art.armature.y, 312); // still picked; wiring untouched
    assert.equal(art._busy.witness, false);
  });

  it('test-dropout leaves a readable persistent glint inside the NC gap', () => {
    const { scene, art } = makeArt();
    const wired = {
      coilLeadTerminal: 'coil-a1',
      outputLeadTerminal: 'nc-12',
      coilEnergized: true,
      noContactClosed: true,
      ncContactClosed: false,
      testState: 'dropout',
    };
    art.applySnapshot(snap(wired));
    assert.equal(art.ncGapHint.alpha, 0); // nothing before the event
    art.handleEvent({ type: 'test-dropout' });
    // strengthened after Wave 5: 6x8, alpha 0.48, 2px rim — but still no
    // flashing, no looping tween, no text
    assert.equal(art.ncGapHint.w, 6);
    assert.equal(art.ncGapHint.h, 8);
    assert.equal(art.ncGapHint.alpha, 0.48);
    assert.ok(art.ncGapHint.alpha <= 0.5);
    assert.equal(art.ncGapHint.stroke.w, 2);
    assert.equal(tweensOn(scene, art.ncGapHint).length, 0, 'residue must not tween/flash');
    // sticky across dropout-state snapshots
    art.applySnapshot(snap(wired));
    assert.equal(art.ncGapHint.alpha, 0.48);
    // cleared by the next wiring change...
    art.handleEvent({ type: 'lead-disconnected', lead: 'output', terminal: 'nc-12' });
    assert.equal(art.ncGapHint.alpha, 0);
    // ...and by any snapshot whose testState has moved on (reset / new TEST)
    art.handleEvent({ type: 'test-dropout' });
    assert.equal(art.ncGapHint.alpha, 0.48);
    art.applySnapshot(snap());
    assert.equal(art.ncGapHint.alpha, 0);
  });

  it('connect-rejected knocks the tip back and dim-flashes the refused stud', () => {
    const { scene, art } = makeArt();
    art.applySnapshot(snap());
    // realistic flow: drop on A2 never seats (not snappable), logic refuses,
    // then the rejection event animates the local knock
    art.pointerDown(238, 326);
    const up = art.pointerUp(452, 452);
    assert.equal(up.placed, null);
    art.handleEvent({ type: 'connect-rejected', lead: 'coil', terminal: 'coil-a2', reason: 'known-but-dead' });
    assert.equal(art.getState().lastEvent, 'connect-rejected');
    const tipTweens = tweensOn(scene, art._tipGo.coil)
      .filter((t) => t.cfg.duration !== 180) // ignore the earlier spring-back
      .map((t) => t.cfg.duration);
    assert.deepEqual(tipTweens, [60, 120], 'small knock-back and return');
    const nutTweens = tweensOn(scene, art._nuts['coil-a2']).map((t) => t.cfg.duration);
    assert.deepEqual(nutTweens, [70, 130], 'one short dim flash on the refused stud');
    assert.equal(art._nuts['coil-a2'].alpha, 1); // flash fully settled
    assert.equal(art._busy.coil, false);
    // steady writer owns the aftermath: the rejected lead returns to rest
    art.applySnapshot(snap());
    assert.deepEqual(art.getState().leads.coil.tip, { x: 238, y: 326 });
    // unknown lead ids are still safely ignored
    const before = scene.tweenList.length;
    art.handleEvent({ type: 'connect-rejected', lead: 'plaid', terminal: 'coil-a2' });
    assert.equal(scene.tweenList.length, before);
  });

  it('test-ground-fault: one local spark, fuse dark, no shake', () => {
    const { scene, art } = makeArt();
    art.applySnapshot(snap({ outputLeadTerminal: 'gnd-lug' }));
    art.handleEvent({ type: 'test-ground-fault' });
    const sparks = tweensOn(scene, art.spark);
    assert.deepEqual(sparks.map((t) => t.cfg.duration), [140, 260], 'flash + ember decay');
    assert.equal(art.spark.alpha, 0);
    assert.equal(art.spark.blendMode, 'ADD');
    assert.equal(art.spark.w, 4); // one small local spark, no full-screen effect
    assert.equal(art.fuse.fillColor, 0x263238);
    assert.equal(art._busy.fuse, false);
    // no tween ever targets the whole frame or the door: no screen shake
    assert.equal(tweensOn(scene, art.door).length, 0);
  });

  it('relay-bridged lights three stages left -> relay -> right in sequence', () => {
    const { scene, art } = makeArt();
    art.applySnapshot(snap({
      coilLeadTerminal: 'coil-a1',
      outputLeadTerminal: 'no-14',
      coilEnergized: true,
      noContactClosed: true,
      ncContactClosed: false,
    }));
    art.handleEvent({ type: 'relay-bridged' });
    assert.equal(art.inputLamp.fillColor, 0x75d4cd);
    assert.equal(art.outputLamp.fillColor, 0x75d4cd);
    assert.equal(art.coilGlow.alpha, 0.5);
    assert.equal(art.glassGlint.alpha, 0.42); // settled on energized steady value
    assert.equal(art.testLever.angle, 10); // bottomed out
    assert.equal(art._busy.lamps, false);
    assert.equal(art._busy.glint, false);
    assert.equal(art._busy.handle, false);
    // staged, not simultaneous: input(100) -> relay(120/160) -> output(140)
    assert.ok(tweensOn(scene, art.inputLamp).some((t) => t.cfg.duration === 100));
    assert.ok(tweensOn(scene, art.outputLamp).some((t) => t.cfg.duration === 140));
    assert.ok(tweensOn(scene, art.glassGlint).some((t) => t.cfg.duration === 120));
  });

  it('calls injected sfx hooks without requiring them', () => {
    const calls = [];
    const scene = createMockScene();
    const sfx = {
      lever: () => calls.push('lever'),
      press: () => calls.push('press'),
      spring: () => calls.push('spring'),
      blocked: () => calls.push('blocked'),
      checkpoint: () => calls.push('checkpoint'),
      slash: () => calls.push('slash'),
      bump: () => calls.push('bump'),
    };
    const art = new RelayCabinetArt(scene, { sfx });
    art.open();
    art.handleEvent({ type: 'lead-connected', lead: 'coil', terminal: 'coil-a1' });
    art.handleEvent({ type: 'coil-picked' });
    art.handleEvent({ type: 'lead-disconnected', lead: 'coil', terminal: 'coil-a1' });
    art.handleEvent({ type: 'relay-dropped' });
    art.handleEvent({ type: 'test-incomplete', coilLeadTerminal: null });
    art.handleEvent({ type: 'test-dropout' });
    art.handleEvent({ type: 'test-ground-fault' });
    art.handleEvent({ type: 'relay-bridged' });
    assert.deepEqual(
      calls,
      ['lever', 'press', 'slash', 'bump', 'spring', 'blocked', 'spring', 'bump', 'checkpoint'],
    );
    // no sfx configured: events still animate without throwing
    const { art: silent } = makeArt();
    silent.handleEvent({ type: 'coil-picked' });
    silent.handleEvent({ type: 'test-dropout' });
    silent.handleEvent({ type: 'test-ground-fault' });
  });
});

describe('relayCabinetArt pointer interaction', () => {
  it('pointerDown grabs a resting tip and misses return null', () => {
    const { art } = makeArt();
    art.applySnapshot(snap());
    assert.deepEqual(art.pointerDown(238, 326), { grabbed: 'coil-lead', from: null });
    assert.equal(art.getState().drag, 'coil-lead');
    art.cancelDrag();
    assert.deepEqual(art.pointerDown(722, 326), { grabbed: 'output-lead', from: null });
    art.cancelDrag();
    assert.equal(art.pointerDown(480, 250), null); // glass cover: nothing to grab
    assert.equal(art.pointerDown(20, 20), null);
  });

  it('drag follows pointerMove clamped inside the cabinet', () => {
    const { art } = makeArt();
    art.applySnapshot(snap());
    art.pointerDown(238, 326);
    assert.deepEqual(art.pointerMove(500, 400), { dragging: 'coil-lead' });
    assert.deepEqual(art.getState().leads.coil.tip, { x: 500, y: 400 });
    art.pointerMove(2000, 2000); // clamped to the interior
    const tip = art.getState().leads.coil.tip;
    assert.ok(tip.x <= 826 - 8 && tip.y <= 536 - 8);
    art.pointerUp(2000, 2000);
  });

  it('drop inside the snap radius returns the placed terminal id', () => {
    const { art } = makeArt();
    art.applySnapshot(snap());
    art.pointerDown(238, 326);
    art.pointerMove(380, 420);
    const res = art.pointerUp(384, 424); // 9px from coil-a1 (390,430)
    assert.deepEqual(res, { lead: 'coil', placed: 'coil-a1', from: null });
    assert.deepEqual(art.getState().leads.coil.tip, { x: 390, y: 430 }); // magnetically seated
    assert.equal(art.getState().drag, null);
  });

  it('drop on the ground lug places there (fault stays possible)', () => {
    const { art } = makeArt();
    art.applySnapshot(snap());
    art.pointerDown(722, 326);
    const res = art.pointerUp(655, 492);
    assert.equal(res.placed, 'gnd-lug');
  });

  it('drop outside every snap radius springs back, never dangles locked', () => {
    const { art } = makeArt();
    art.applySnapshot(snap());
    art.pointerDown(238, 326);
    art.pointerMove(480, 460);
    const res = art.pointerUp(480, 460);
    assert.deepEqual(res, { lead: 'coil', placed: null, returned: true, from: null });
    assert.deepEqual(art.getState().leads.coil.tip, { x: 238, y: 326 }); // back at rest
    assert.equal(art.getState().drag, null);
    assert.equal(art._busy.coil, false);
  });

  it('dragging a connected lead reports its terminal as from', () => {
    const { art } = makeArt();
    art.applySnapshot(snap({ coilLeadTerminal: 'coil-a1', coilEnergized: true, noContactClosed: true, ncContactClosed: false }));
    const res = art.pointerDown(390, 430);
    assert.deepEqual(res, { grabbed: 'coil-lead', from: 'coil-a1' });
    // released in space while the logic still holds the lead: returns to it
    const up = art.pointerUp(480, 460);
    assert.deepEqual(up, { lead: 'coil', placed: null, returned: true, from: 'coil-a1' });
    assert.deepEqual(art.getState().leads.coil.tip, { x: 390, y: 430 });
  });

  it('pointerDown + pointerUp on TEST / RESET returns the press', () => {
    const { art } = makeArt();
    art.applySnapshot(snap());
    assert.equal(art.pointerDown(400, 490), null); // press arms, nothing to grab
    assert.deepEqual(art.pointerUp(400, 490), { pressed: 'test' });
    art.pointerDown(540, 490);
    assert.deepEqual(art.pointerUp(540, 490), { pressed: 'reset' });
    // releasing outside the armed region cancels the press
    art.pointerDown(400, 490);
    assert.equal(art.pointerUp(300, 300), null);
  });

  it('cancelDrag is the blur escape hatch: tip back, no dangling state', () => {
    const { art } = makeArt();
    art.applySnapshot(snap());
    art.pointerDown(238, 326);
    art.pointerMove(500, 400);
    assert.deepEqual(art.cancelDrag(), { cancelled: 'coil-lead' });
    assert.equal(art.getState().drag, null);
    assert.deepEqual(art.getState().leads.coil.tip, { x: 238, y: 326 });
    assert.equal(art.cancelDrag(), null); // repeat-safe
  });

  it('cancelDrag also clears an armed TEST/RESET press (no stale {pressed})', () => {
    const { art } = makeArt();
    art.applySnapshot(snap());
    art.pointerDown(400, 490); // arm TEST, no drag started
    assert.equal(art.cancelDrag(), null); // nothing to cancel, but press dropped
    assert.equal(art.pointerUp(400, 490), null, 'stale press must not fire');
    // and a fresh deliberate press still works afterwards
    art.pointerDown(540, 490);
    assert.deepEqual(art.pointerUp(540, 490), { pressed: 'reset' });
  });

  it('drop on A2 never seats: the bused return screw is outside the snap set', () => {
    const { art } = makeArt();
    art.applySnapshot(snap());
    art.pointerDown(238, 326);
    art.pointerMove(452, 452);
    const res = art.pointerUp(452, 452); // dead centre on A2
    assert.deepEqual(res, { lead: 'coil', placed: null, returned: true, from: null });
    assert.deepEqual(art.getState().leads.coil.tip, { x: 238, y: 326 }); // sprang back
    assert.equal(art._nuts['coil-a2'].angle, 0, 'A2 nut never turns');
  });

  it('getHitRegions covers terminals, both tips, TEST and RESET', () => {
    const { art } = makeArt();
    art.applySnapshot(snap());
    const regions = art.getHitRegions();
    const byId = Object.fromEntries(regions.map((r) => [r.id, r]));
    for (const id of ['coil-a1', 'nc-12', 'no-14', 'gnd-lug']) {
      assert.equal(byId[id].kind, 'terminal');
      assert.equal(byId[id].shape.type, 'circle');
      assert.ok(byId[id].shape.r >= 22, 'snap radius must be at least 22px');
    }
    // Micro polish: A2 is listed hover-only (dead: true) so its red break
    // mark can show; SNAP_IDS / _terminalAt still refuse it as a landing.
    assert.equal(byId['coil-a2'].dead, true, 'A2 hover-only, never a snap target');
    assert.equal(byId['coil-lead'].kind, 'lead-tip');
    assert.equal(byId['output-lead'].kind, 'lead-tip');
    assert.deepEqual(
      { x: byId['coil-lead'].shape.x, y: byId['coil-lead'].shape.y },
      { x: 238, y: 326 },
    );
    assert.equal(byId.test.kind, 'handle');
    assert.equal(byId.test.shape.type, 'rect');
    assert.equal(byId.reset.kind, 'key');
  });
});

describe('relayCabinetArt door / visibility / teardown', () => {
  it('open plays bolt (60ms) then door (240ms), repeat-safe', () => {
    const { scene, art } = makeArt();
    art.open();
    assert.equal(art.getState().doorState, 'open');
    assert.equal(art.door.scaleX, 0.04); // perspective collapse onto the hinge rail
    assert.equal(art.latchBolt.x, 816 + 4);
    const bolt = tweensOn(scene, art.latchBolt);
    assert.deepEqual(bolt.map((t) => t.cfg.duration), [60]);
    const doorTweens = tweensOn(scene, art.door);
    assert.ok(doorTweens.some((t) => t.cfg.duration === 240 && t.cfg.scaleX !== undefined));
    const count = scene.tweenList.length;
    art.open(); // already open: no re-animation
    assert.equal(scene.tweenList.length, count);
  });

  it('the open door stays inside the canvas and covers none of the anchors', () => {
    const { art } = makeArt();
    art.open();
    // Wave 5 finding #3: the page must not be thrown mostly off-canvas.
    // Collapsed door = strip [134, 134 + 692*scaleX] x [134, 536].
    assert.ok(art.door.scaleX < 0.1, 'open page must collapse to a thin strip');
    const stripRight = 134 + 692 * art.door.scaleX;
    assert.ok(stripRight >= 134 && stripRight <= 960, 'page body stays in-canvas');
    // every anchor region starts right of the strip
    const anchorLeftEdges = {
      'input block': 170,
      'input lamp': 214,
      relay: 400,
      'output block': 690,
      'TEST handle': 356,
      'RESET key': 512,
    };
    for (const [name, left] of Object.entries(anchorLeftEdges)) {
      assert.ok(stripRight <= left, `open door strip (${stripRight}) covers ${name}`);
    }
    // closed page still covers the whole interior opening
    const { art: closed } = makeArt();
    assert.equal(closed.door.scaleX, 1);
  });

  it('close settles the door half-closed, repeat-safe', () => {
    const { art } = makeArt();
    art.close(); // never opened: no-op
    assert.equal(art.getState().doorState, 'closed');
    art.open();
    art.close();
    assert.equal(art.getState().doorState, 'half');
    assert.equal(art.door.scaleX, 0.55);
    art.close(); // already half: no-op
    assert.equal(art.getState().doorState, 'half');
    // wiring progress survives close/open cycles (§4.2)
    art.applySnapshot(snap({ coilLeadTerminal: 'coil-a1' }));
    art.open();
    assert.deepEqual(art.getState().leads.coil.tip, { x: 390, y: 430 });
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
    art.open();
    art.applySnapshot(passedSnap());
    const opsBefore = art._wireGfx.coil.ops.length;
    art.destroy();
    assert.ok(scene.objects.every((o) => o.destroyed));
    assert.ok(scene.tweenList.every((t) => t.removed));
    assert.equal(art.getState().destroyed, true);
    art.destroy(); // repeated destroy is safe
    art.applySnapshot(snap()); // gated: no further redraw
    assert.equal(art._wireGfx.coil, undefined); // cleared with the module
    art.handleEvent({ type: 'coil-picked' });
    assert.equal(art.getState().lastEvent, null);
    assert.equal(art.pointerDown(238, 326), null);
    assert.equal(art.pointerUp(238, 326), null);
    assert.equal(art.cancelDrag(), null);
    assert.deepEqual(art.getHitRegions(), []);
    art.open(); // gated, no throw
    art.close();
    assert.equal(opsBefore > 0, true);
  });
});

describe('relayCabinetArt TEST standby hint (Wave 5 finding #2)', () => {
  const wiredIdle = () => snap({
    coilLeadTerminal: 'coil-a1',
    outputLeadTerminal: 'no-14',
    coilEnergized: true,
    noContactClosed: true,
    ncContactClosed: false,
    testState: 'idle',
  });

  it('stays dark until BOTH leads are connected and untested', () => {
    const { art } = makeArt();
    art.applySnapshot(snap());
    assert.equal(art.getState().testPending, false);
    assert.equal(art.testHint.alpha, 0);
    assert.equal(art._loops.testHint, null);
    art.applySnapshot(snap({ coilLeadTerminal: 'coil-a1', coilEnergized: true }));
    assert.equal(art.getState().testPending, false, 'one lead is not pending');
    assert.equal(art._loops.testHint, null);
  });

  it('both leads connected + idle starts ONE slow Sine breathing rim', () => {
    const { scene, art } = makeArt();
    art.applySnapshot(wiredIdle());
    assert.equal(art.getState().testPending, true);
    const loop = art._loops.testHint;
    assert.ok(loop, 'breathing loop must start on the pending transition');
    assert.equal(loop.cfg.repeat, -1);
    assert.equal(loop.cfg.yoyo, true);
    assert.equal(loop.cfg.ease, 'Sine.easeInOut');
    assert.ok(loop.cfg.duration >= 800, 'full cycle must be >= 1600ms');
    assert.equal(loop.cfg.alpha.to, 0.5, 'restrained peak');
    assert.equal(loop.cfg.alpha.from, 0.15);
    // 2px tungsten rim around the handle body
    assert.ok(art.testHint.ops.some(
      (op) => op[0] === 'lineStyle' && op[1] === 2 && op[2] === 0xe4b45a, // TUNGSTEN_REFLECT
    ));
    // steady redraws must not stack loops
    const count = scene.tweenList.length;
    art.applySnapshot(wiredIdle());
    art.applySnapshot(wiredIdle());
    assert.equal(scene.tweenList.length, count);
  });

  it('any TEST outcome stops the hint immediately', () => {
    const { art } = makeArt();
    art.applySnapshot(wiredIdle());
    assert.ok(art._loops.testHint);
    art.handleEvent({ type: 'relay-bridged' });
    assert.equal(art._loops.testHint, null);
    assert.equal(art.testHint.alpha, 0);
    assert.equal(art.getState().testPending, false);
    // and the passed snapshot keeps it off
    art.applySnapshot(passedSnap());
    assert.equal(art._loops.testHint, null);
  });

  it('dropout then rewire back to both-connected re-arms the hint', () => {
    const { art } = makeArt();
    const wired = {
      coilLeadTerminal: 'coil-a1',
      coilEnergized: true,
      noContactClosed: true,
      ncContactClosed: false,
    };
    art.applySnapshot(wiredIdle());
    assert.ok(art._loops.testHint);
    // TEST -> dropout: hint stops (result produced)
    art.handleEvent({ type: 'test-dropout' });
    assert.equal(art._loops.testHint, null);
    art.applySnapshot(snap({ ...wired, outputLeadTerminal: 'nc-12', testState: 'dropout' }));
    assert.equal(art._loops.testHint, null, 'latched dropout is not pending');
    // player rewires the output lead: events re-arm the derivation...
    art.handleEvent({ type: 'lead-disconnected', lead: 'output', terminal: 'nc-12' });
    art.applySnapshot(snap({ ...wired, outputLeadTerminal: null, testState: 'dropout' }));
    assert.equal(art._loops.testHint, null, 'still not both-connected');
    art.handleEvent({ type: 'lead-connected', lead: 'output', terminal: 'no-14' });
    art.applySnapshot(snap({ ...wired, outputLeadTerminal: 'no-14', testState: 'dropout' }));
    assert.ok(art._loops.testHint, 'rewired-but-untested wiring is pending again');
    // ...and the next TEST outcome stops it again
    art.handleEvent({ type: 'relay-bridged' });
    assert.equal(art._loops.testHint, null);
  });

  it('destroy kills the breathing loop', () => {
    const { art } = makeArt();
    art.applySnapshot(wiredIdle());
    const loop = art._loops.testHint;
    assert.ok(loop);
    art.destroy();
    assert.equal(loop.removed, true);
    assert.equal(art._loops.testHint, null);
  });
});

describe('relayCabinetArt setHoverTarget (work package §3.1)', () => {
  // The mock records clear() as an op without dropping earlier ops, so rim
  // assertions always look at the ops AFTER the most recent clear.
  const liveOps = (g) => {
    const at = g.ops.map((op) => op[0]).lastIndexOf('clear');
    return g.ops.slice(at + 1);
  };

  it('draws snap rings on legal terminals, plain rims on tips, TEST and RESET', () => {
    const { art } = makeArt();
    art.applySnapshot(snap());
    art.setHoverTarget('coil-a1');
    assert.equal(art.getState().hover, 'coil-a1');
    // Micro polish: a legal terminal gets the bronze snap ring (r + 3) plus
    // a thin live-trace inner ring (r - 2) — both centered on the stud.
    const circles = liveOps(art.hoverEdge).filter((op) => op[0] === 'strokeCircle');
    assert.ok(
      circles.some((op) => op[1] === 390 && op[2] === 430 && op[3] === 25),
      'legal terminal rims the widened snap circle',
    );
    assert.ok(
      circles.some((op) => op[1] === 390 && op[2] === 430 && op[3] === 20),
      'legal terminal adds the live-trace inner ring',
    );
    const style = liveOps(art.hoverEdge).find((op) => op[0] === 'lineStyle');
    assert.deepEqual(style.slice(1, 3), [2, 0xe8d5a7]); // 2px BRASS_HI, licensed here

    art.setHoverTarget('output-lead');
    const tip = liveOps(art.hoverEdge).find((op) => op[0] === 'strokeCircle');
    assert.deepEqual(tip.slice(1), [722, 326, 18]); // tip r16 + 2px

    art.setHoverTarget('test');
    const rect = liveOps(art.hoverEdge).find((op) => op[0] === 'strokeRect');
    assert.deepEqual(rect.slice(1), [354, 460, 96, 60]); // hit rect + 2px each side

    art.setHoverTarget('reset');
    assert.ok(liveOps(art.hoverEdge).some((op) => op[0] === 'strokeRect'));
  });

  it('is idempotent and never allocates extra GameObjects', () => {
    const { scene, art } = makeArt();
    art.applySnapshot(snap());
    const objectCount = scene.objects.length;
    art.setHoverTarget('nc-12');
    const opsAfterFirst = art.hoverEdge.ops.length;
    art.setHoverTarget('nc-12'); // same id: no redraw, no allocation
    assert.equal(art.hoverEdge.ops.length, opsAfterFirst);
    art.setHoverTarget('no-14');
    art.setHoverTarget('gnd-lug');
    art.setHoverTarget(null);
    art.setHoverTarget('coil-lead');
    assert.equal(scene.objects.length, objectCount, 'hover must reuse one graphics');
  });

  it('null, unknown ids and setVisible(false) clear the rim; dead A2 shows a red break mark', () => {
    const { art } = makeArt();
    art.applySnapshot(snap());
    art.setHoverTarget('coil-a1');
    art.setHoverTarget(null);
    assert.equal(art.getState().hover, null);
    assert.equal(liveOps(art.hoverEdge).length, 0);
    // unknown id is safely ignored and clears any stale rim
    art.setHoverTarget('coil-a1');
    art.setHoverTarget('gnd-x'); // not in getHitRegions -> not hoverable
    assert.equal(art.getState().hover, null);
    assert.equal(liveOps(art.hoverEdge).length, 0);
    art.setHoverTarget('plaid');
    assert.equal(art.getState().hover, null);
    // Micro polish: the dead return screw IS hoverable — restrained red
    // break mark (ring + slash), no pulse, no text.
    art.setHoverTarget('coil-a2');
    assert.equal(art.getState().hover, 'coil-a2');
    const ops = liveOps(art.hoverEdge);
    const redStyle = ops.find((op) => op[0] === 'lineStyle');
    assert.deepEqual(redStyle.slice(1, 3), [2, 0xe45a5f]); // LAMP_ALERT
    assert.ok(ops.some((op) => op[0] === 'strokeCircle'), 'dead screw gets a thin ring');
    assert.ok(ops.some((op) => op[0] === 'lineBetween'), 'dead screw gets the slash');
    // hide clears too
    art.setHoverTarget('test');
    art.setVisible(false);
    assert.equal(art.getState().hover, null);
    assert.equal(liveOps(art.hoverEdge).length, 0);
  });

  it('drag shows origin glow + magnetic snap preview, hover rim re-arms on settle', () => {
    const { art } = makeArt();
    art.applySnapshot(snap());
    art.setHoverTarget('coil-lead');
    art.pointerDown(238, 326);
    // Far from every terminal: only the drag origin glows (a free lead
    // glows at its rest anchor).
    art.pointerMove(500, 400);
    let rim = art.hoverEdge.ops.filter((op) => op[0] === 'strokeCircle').pop();
    assert.deepEqual(rim.slice(1), [238, 326, 24]); // rest anchor, SNAP_R + 2
    // Inside the widened radius the tip eases 45% toward the terminal and
    // the snap preview rings it.
    art.pointerMove(410, 430);
    const tip = art._tipGo.coil;
    assert.deepEqual([Math.round(tip.x), Math.round(tip.y)], [401, 430]);
    rim = art.hoverEdge.ops.filter((op) => op[0] === 'strokeCircle').pop();
    assert.deepEqual(rim.slice(1), [390, 430, 20]); // inner live-trace ring on coil-a1
    art.pointerUp(410, 430); // widened radius seats on coil-a1
    art.applySnapshot(snap({ coilLeadTerminal: 'coil-a1', coilEnergized: true, noContactClosed: true, ncContactClosed: false }));
    rim = art.hoverEdge.ops.filter((op) => op[0] === 'strokeCircle').pop();
    assert.deepEqual(rim.slice(1), [390, 430, 18]); // hover rim re-arms on the settled tip
  });

  it('is gated after destroy', () => {
    const { art } = makeArt();
    art.setHoverTarget('coil-a1');
    art.destroy();
    art.setHoverTarget('no-14'); // no throw, no state
    assert.equal(art.getState().hover, null);
  });
});

describe('relayCabinetArt dropout feedback hooks (failure-feedback wave)', () => {
  const dropoutWiring = () => snap({
    coilLeadTerminal: 'coil-a1',
    outputLeadTerminal: 'nc-12',
    coilEnergized: true,
    noContactClosed: true,
    ncContactClosed: false,
    testState: 'dropout',
  });

  it('hook A: test-dropout bottoms the TEST lever (140ms) and springs it back (220ms)', () => {
    const { scene, art } = makeArt();
    art.applySnapshot(dropoutWiring());
    art.handleEvent({ type: 'test-dropout' });
    const leverTweens = tweensOn(scene, art.testLever).map((t) => t.cfg.duration);
    assert.deepEqual(leverTweens, [140, 220], 'press to seat, then spring back to rest');
    assert.equal(art.testLever.angle, -16, 'lever settles at restAngle (not a passed state)');
    assert.equal(art._busy.handle, false);
  });

  it('hook B: dropoutHint snapshot shows the one line verbatim, null hides it', () => {
    const { scene, art } = makeArt();
    // hidden from birth: no copy, no alpha
    assert.equal(art.dropoutHintText.text, '');
    assert.equal(art.dropoutHintText.alpha, 0);

    const hint = 'CONTACT DROPPED — TRACE THE LIVE ARM';
    art.applySnapshot(dropoutWiring());
    assert.equal(art.dropoutHintText.alpha, 0, 'no hint before the field arrives');
    art.applySnapshot(snap({ ...dropoutWiring(), dropoutHint: hint }));
    assert.equal(art.dropoutHintText.text, hint, 'rendered verbatim, never rewritten');
    assert.equal(art.dropoutHintText.alpha, 1);
    // small red monospace device line, on-palette
    assert.equal(art.dropoutHintText.style.fontSize, '9px');
    assert.equal(art.dropoutHintText.style.color, '#e45a5f'); // CAR.LAMP_ALERT
    // sticky across repeated dropout snapshots; show/hide never tweens
    art.applySnapshot(snap({ ...dropoutWiring(), dropoutHint: hint }));
    assert.equal(art.dropoutHintText.alpha, 1);
    assert.equal(tweensOn(scene, art.dropoutHintText).length, 0, 'hint must not tween');
    // cleared the moment the snapshot stops carrying the field
    art.applySnapshot(dropoutWiring());
    assert.equal(art.dropoutHintText.alpha, 0);
    art.applySnapshot(snap());
    assert.equal(art.dropoutHintText.alpha, 0);
  });

  it('hook B: a module-wide setVisible(true) cannot force the hint on without a dropout', () => {
    const { art } = makeArt();
    art.setVisible(false);
    art.setVisible(true);
    assert.equal(art.dropoutHintText.alpha, 0, 'visibility is alpha-owned, not visible-owned');
  });
});
