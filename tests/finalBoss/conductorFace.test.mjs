// Round 3 (H6): one Conductor face for Movements I and II (a shadowed cap
// brim and eyes, no profile dot, no smile-shaped pocket chain), and lamp
// heads that are lanterns, not empty dark squares.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CONDUCTOR_HEAD_PART, CONDUCTOR_TORSO_PART, HEAD_FACE, paintConductorHead } from '../../src/chapters/finalBoss/conductorFigure.js';

const read = (path) => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const finaleArt = read('src/chapters/finalBoss/finaleArt.js');
const battle = read('src/chapters/finalBoss/spectacleBattle.js');

function recordingContext() {
  const calls = [];
  const gradients = [];
  const state = {};
  const ctx = new Proxy(state, {
    get(target, key) {
      if (key in target) return target[key];
      if (key === 'createLinearGradient' || key === 'createRadialGradient') {
        return (...args) => { const g = { args, stops: [], addColorStop(o, c) { this.stops.push([o, c]); } }; gradients.push(g); return g; };
      }
      return (...args) => { calls.push({ fn: key, args, fill: target.fillStyle }); };
    },
    set(target, key, value) { target[key] = value; return true; },
  });
  return { ctx, calls, gradients };
}

test('the head faces front: two eyes inside the brim shadow, a cap with badge and band', () => {
  const { ctx, calls, gradients } = recordingContext();
  paintConductorHead(ctx);
  const eyeWhites = calls.filter((c) => c.fn === 'ellipse' && Math.abs(c.args[1] - 16.3) < 0.01);
  assert.equal(eyeWhites.length, 2, 'two eyes');
  const [left, right] = eyeWhites.map((c) => c.args[0]).sort((a, b) => a - b);
  assert.ok(left < HEAD_FACE.cx && right > HEAD_FACE.cx, 'one each side of the nose');
  assert.ok(Math.abs((HEAD_FACE.cx - left) - (right - HEAD_FACE.cx)) < 0.01, 'symmetric: a front view');
  // the brim's shadow: a dark vertical gradient over the eye band
  const brim = gradients.find((g) => g.args[1] === 11 && g.stops.some(([, color]) => /rgba\(8, 6, 10, 0\.8/.test(color)));
  assert.ok(brim, 'the brim throws a shadow over the eyes');
  assert.ok(brim.args[3] > 16.3, 'the shadow reaches past the eye line');
  // catchlights in the eyes, from his lantern
  assert.equal(calls.filter((c) => c.fn === 'arc' && c.fill === '#fff3d0').length, 2);
  assert.deepEqual(CONDUCTOR_HEAD_PART.pivot, [14, 32]);
});

test('the coat has a watch on a chain, not a smile-shaped curve between the buttons', () => {
  const { ctx, calls } = recordingContext();
  CONDUCTOR_TORSO_PART.paint(ctx);
  const curves = calls.filter((c) => c.fn === 'quadraticCurveTo');
  // the old chain: (12,38) → control (17,43) → (22,38), a U between the buttons
  assert.ok(!curves.some((c) => c.args.join() === '17,43,22,38'), 'no U-shaped chain');
  assert.ok(curves.some((c) => c.args.join() === '24.2,37.6,27.4,39.2'), 'the chain runs down to the pocket');
  assert.ok(calls.some((c) => c.fn === 'arc' && c.args[0] === 27.6 && c.args[1] === 40.6), 'a watch at its end');
});

test('Movements I and II both use the finale face', () => {
  assert.match(finaleArt, /FINALE_CONDUCTOR_PARTS = Object\.freeze\(\{ \.\.\.CONDUCTOR_PARTS, head: CONDUCTOR_HEAD_PART, torso: CONDUCTOR_TORSO_PART \}\)/);
  assert.match(finaleArt, /export function paintInkConductor[\s\S]*?const P = FINALE_CONDUCTOR_PARTS;/);
  assert.match(finaleArt, /export function paintRainConductor[\s\S]*?drawConductorHeadOver\(c, headX, headY/);
  assert.match(finaleArt, /const spec = \{ \.\.\.CONDUCTOR_RAIN_SPEC, cap: null \}/, 'no side-view cap under the front-view head');
  assert.match(battle, /const conductorRain = paintRainConductor\(\{ scale: 4 \}\);/);
  assert.match(battle, /const conductorRainLit = paintRainConductor\(\{ scale: 4, lit: true \}\);/);
});

test('lamp heads are lanterns: glass in its line colour in a brass cage, never an empty dark square', () => {
  const lamp = finaleArt.slice(finaleArt.indexOf('export function paintLampNode'));
  const body = lamp.slice(0, lamp.indexOf('\n}\n'));
  assert.doesNotMatch(body, /rgba\(40,44,46,1\)/, 'the old dark-square fill is gone');
  assert.match(body, /const glass = LAMP_NODE_GLASS\[line\]/);
  assert.match(body, /glass\[state === 'queued' \? 'queued' : 'idle'\]/);
  assert.match(body, /color: LAMP_NODE_TAG\[line\]/, 'the paper tag is tinted by its line (alpha round 4)');
  assert.match(body, /\[10, 15, 20, 25, 29\.5\]\.forEach\(\(x\) => c\.fillRect\(x, 11, 1, 16\)\)/, 'cage bars');
  assert.match(body, /c\.moveTo\(7, 11\); c\.lineTo\(14, 5\); c\.lineTo\(26, 5\); c\.lineTo\(33, 11\)/, 'a roof');
  assert.match(finaleArt, /amber: Object\.freeze\(\{ idle: \['#8a5a26', '#4a2e16'\]/, 'unlit amber glass is still amber');
  assert.match(finaleArt, /teal: Object\.freeze\(\{ idle: \['#2f6f68'/, 'teal glass is teal');
  assert.match(finaleArt, /rose: Object\.freeze\(\{ idle: \['#9a5462'/, 'rose glass is rose');
});
